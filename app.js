let map, markersArray = [], museumsData = [], currentFilteredData = [];
let profileModal, editModal, isGestor = false, editingMuseumId = null;

// Memória Local (Salva as edições do gestor mesmo se recarregar a página)
let localEditsMemory = JSON.parse(localStorage.getItem('simrj_edits')) || {};

// TODOS os campos que compõem a planilha/ficha completa
const ALL_FIELDS = [
    { id: 'nome', label: 'Nome da Instituição' }, { id: 'sigla', label: 'Sigla' }, { id: 'cnpj', label: 'CNPJ' }, { id: 'documento_criacao', label: 'Doc. Criação' },
    { id: 'cep', label: 'CEP' }, { id: 'logradouro', label: 'Logradouro' }, { id: 'numero', label: 'Número' }, { id: 'complemento', label: 'Complemento' },
    { id: 'municipio', label: 'Município' }, { id: 'regiao', label: 'Região' }, { id: 'zona', label: 'Zona (RJ)' },
    { id: 'telefone', label: 'Telefone' }, { id: 'email_institucional', label: 'E-mail Inst.' }, { id: 'site', label: 'Site' },
    { id: 'facebook', label: 'Facebook' }, { id: 'instagram', label: 'Instagram' }, { id: 'twitter', label: 'Twitter/X' },
    { id: 'natureza', label: 'Natureza Adm.' }, { id: 'situacao', label: 'Situação Atual' }, { id: 'funcionamento', label: 'Dias e Turnos' },
    { id: 'ingresso', label: 'Valor Ingresso' }, { id: 'gratuidades', label: 'Gratuidades' }, { id: 'educativo', label: 'Setor Educativo?' },
    { id: 'museologo', label: 'Museólogo?' }, { id: 'acervo', label: 'Acervo Predominante' }, { id: 'acessibilidade', label: 'Acessibilidade' },
    { id: 'historico', label: 'Histórico do Museu', isTextarea: true },
    { id: 'responsavel_cadastro', label: 'Responsável (Cadastro)' }, { id: 'email_responsavel', label: 'E-mail do Responsável' },
    { id: 'lat', label: 'Latitude' }, { id: 'lng', label: 'Longitude' }
];

document.addEventListener('DOMContentLoaded', async function() {
    initMapSystem();
    await loadInitialCSVData();
});

function initMapSystem() {
    document.getElementById('map').innerHTML = ""; 
    map = L.map('map').setView([-22.9068, -43.1729], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    editModal = new bootstrap.Modal(document.getElementById('gestorEditModal'));
}

const normalizeString = (str) => { if(!str) return ""; return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); };

// --- BLINDAGEM CIRÚRGICA DE COORDENADAS ---
// Força a transformação de qualquer texto "-22,9" em número puro -22.9
function parseCoordinate(val) {
    if (!val) return null;
    let str = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
    let num = parseFloat(str);
    return isNaN(num) ? null : num;
}
function isWithinRJ(lat, lng) {
    // Retângulo super generoso que cobre todo o estado do RJ para evitar bloqueios falsos, mas que bloqueia a África e a Antártida.
    return (lat >= -24.5 && lat <= -20.0) && (lng >= -45.5 && lng <= -39.0);
}

// --- CARREGAMENTO DE DADOS DA PLANILHA ---
async function loadInitialCSVData() {
    try {
        const response = await fetch('dados.csv');
        if (!response.ok) throw new Error();
        Papa.parse(await response.text(), { header: true, skipEmptyLines: true, complete: async function(results) { await processParsedData(results.data); } });
    } catch(e) { console.warn("Planilha 'dados.csv' ausente."); }
}

async function processParsedData(rawData) {
    let cleanData = [];
    for (let i = 0; i < rawData.length; i++) {
        let row = rawData[i];
        let nome = row["Nome da Instituição"] || row["Nome"];
        if (!nome) continue;

        let lat = parseCoordinate(row["Lat"] || row["Latitude"]);
        let lng = parseCoordinate(row["Lng"] || row["Longitude"]);
        
        // Ativa a Blindagem: Se cair fora do RJ, anula o pino para ele ir para a aba "Sem Geolocalização"
        if (lat && lng && !isWithinRJ(lat, lng)) { lat = null; lng = null; }

        let museumObj = {
            id: i + 1000, 
            nome: nome, sigla: row["Sigla"], cnpj: row["CNPJ"], documento_criacao: row["Documento de Criação"],
            cep: row["CEP"], logradouro: row["Endereço"] || row["Logradouro"], numero: row["Número"], complemento: row["Complemento"],
            municipio: row["Município"] || row["Municipio"], regiao: row["Região"] || row["Regiao"], zona: row["Zona"],
            telefone: row["Telefone Institucional"] || row["Telefone"], email_institucional: row["E-mail Institucional"], site: row["Site"] || row["Site Oficial"],
            facebook: row["Facebook"], instagram: row["Instagram"], twitter: row["Twitter"],
            natureza: row["Natureza Administrativa do Museu"] || row["Natureza Administrativa"], situacao: row["Situação"] || row["Status"],
            funcionamento: row["Funcionamento"] || row["Horário"], ingresso: row["Valor ingresso"] || row["Ingresso"],
            gratuidades: row["Gratuidades"] || row["Gratuidade"], educativo: row["Setor Educativo"] || row["Educativo"],
            museologo: row["Museólogo"] || row["Museologo"], acervo: row["Acervo Predominante"] || row["Acervo"],
            acessibilidade: row["Acessibilidade"], historico: row["Histórico"] || row["Historico"],
            responsavel_cadastro: row["Responsável pelo Cadastro"], email_responsavel: row["E-mail do Responsável"],
            lat: lat, lng: lng, visivel: true, hidden_fields: {}, history: []
        };

        // Sobrepõe com as edições feitas pelo gestor na memória
        if (localEditsMemory[museumObj.nome]) museumObj = { ...museumObj, ...localEditsMemory[museumObj.nome] };
        cleanData.push(museumObj);
    }
    museumsData = cleanData; populateCityFilter(); applyFilters();
}

function populateCityFilter() {
    const select = document.getElementById('filterMunicipio'); if(!select) return;
    select.innerHTML = '<option value="">Todos os Municípios</option>';
    [...new Set(museumsData.map(m => m.municipio).filter(Boolean))].sort().forEach(city => { select.innerHTML += `<option value="${city}">${city}</option>`; });
}

// --- FILTROS COMPLETOS (MÚLTIPLOS CHECKBOXES E TEXTO) ---
function getCheckedValues(containerId) { return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map(el => normalizeString(el.value)); }

window.applyFilters = function() {
    const termo = normalizeString(document.getElementById('filterNome')?.value || '');
    const mapStat = document.getElementById('filterStatusMapa')?.value;
    const muni = normalizeString(document.getElementById('filterMunicipio')?.value || '');
    
    // Checkboxes
    const regioes = getCheckedValues('boxRegiao');
    const naturezas = getCheckedValues('boxNatureza');
    const acervos = getCheckedValues('boxAcervo');
    const situacoes = getCheckedValues('boxSituacao');
    const turnos = getCheckedValues('boxTurno');
    const ingressos = getCheckedValues('boxIngresso');

    // Textos Específicos
    const textGrat = normalizeString(document.getElementById('filterGrat')?.value || '');
    const textAces = normalizeString(document.getElementById('filterAces')?.value || '');

    currentFilteredData = museumsData.filter(m => {
        if (!m.visivel && !isGestor) return false; 
        
        let mNome = normalizeString(m.nome); let mMuni = normalizeString(m.municipio); let mReg = normalizeString(m.regiao);
        let mNat = normalizeString(m.natureza); let mAcer = normalizeString(m.acervo); let mSit = normalizeString(m.situacao);
        let mFunc = normalizeString(m.funcionamento); let mIng = normalizeString(m.ingresso);
        let mGrat = normalizeString(m.gratuidades); let mAces = normalizeString(m.acessibilidade);

        if (termo && !mNome.includes(termo)) return false;
        if (muni && mMuni !== muni) return false;
        if (textGrat && !mGrat.includes(textGrat)) return false;
        if (textAces && !mAces.includes(textAces)) return false;
        
        // Regra de OU para checkboxes (Se marcou "Manhã" ou "Tarde", tem que ter algum deles no texto)
        if (regioes.length > 0 && !regioes.some(r => mReg.includes(r))) return false;
        if (naturezas.length > 0 && !naturezas.some(n => mNat.includes(n))) return false;
        if (acervos.length > 0 && !acervos.some(a => mAcer.includes(a))) return false;
        if (situacoes.length > 0 && !situacoes.some(s => mSit.includes(s))) return false;
        if (turnos.length > 0 && !turnos.some(t => mFunc.includes(t))) return false;
        
        // Ingresso (Gratuito vs Pago)
        if (ingressos.length > 0) {
            let matches = false;
            if (ingressos.includes("gratuit") && (mIng.includes("gratuit") || mIng.includes("isento") || mIng === "")) matches = true;
            if (ingressos.includes("pago") && (!mIng.includes("gratuit") && mIng.length > 2)) matches = true;
            if (!matches) return false;
        }

        if (mapStat === 'sim' && (!m.lat || !m.lng)) return false;
        if (mapStat === 'nao' && (m.lat && m.lng)) return false;

        return true;
    });

    renderMuseums(currentFilteredData);
    if(isGestor) { renderVisibilityList(); updatePendingList(); }
}

window.resetFilters = function() {
    document.querySelectorAll('.sidebar-filters input[type="text"], .sidebar-filters select').forEach(el => el.value = '');
    document.querySelectorAll('.sidebar-filters input[type="checkbox"]').forEach(el => el.checked = false);
    applyFilters();
}

function renderMuseums(data) {
    markersArray.forEach(m => map.removeLayer(m)); markersArray = [];
    let publicData = data.filter(m => m.visivel);

    document.getElementById('count-total').innerText = publicData.length;
    document.getElementById('resultCount').innerText = publicData.length;
    
    let htmlTable = '<div class="table-responsive"><table class="table table-hover border small"><thead class="table-dark"><tr><th>Nome</th><th>Município</th><th>Ação</th></tr></thead><tbody>';
    let htmlList = '';

    publicData.forEach(m => {
        let btn = `<button class="btn btn-sm btn-outline-primary fw-bold" onclick="openProfile(${m.id})">Ver Ficha</button>`;
        htmlTable += `<tr><td class="fw-bold">${m.nome}</td><td>${m.municipio}</td><td>${btn}</td></tr>`;
        
        htmlList += `
        <div class="p-3 mb-2 bg-white border rounded shadow-sm d-flex justify-content-between align-items-center">
            <div><h6 class="fw-bold text-primary mb-1">${m.nome}</h6><small class="text-muted">${m.municipio} | ${m.natureza || 'Sem natureza'}</small></div>
            ${btn}
        </div>`;

        if (m.lat && m.lng) {
            const marker = L.marker([m.lat, m.lng]).addTo(map);
            marker.bindPopup(`<div class="text-center p-1"><h6 class="fw-bold text-primary mb-1">${m.nome}</h6><small class="d-block mb-2">${m.municipio}</small><button class="btn btn-sm btn-warning w-100 fw-bold" onclick="openProfile(${m.id})">Ver Ficha Completa</button></div>`);
            markersArray.push(marker);
        }
    });

    htmlTable += '</tbody></table></div>';
    if(document.getElementById('container-lista-geral')) document.getElementById('container-lista-geral').innerHTML = htmlTable;
    if(document.getElementById('museum-list-container')) document.getElementById('museum-list-container').innerHTML = htmlList;
}

window.filterListaTexto = function() {
    let input = normalizeString(document.getElementById('searchLista').value);
    document.querySelectorAll('#container-lista-geral tbody tr').forEach(row => { row.style.display = normalizeString(row.innerText).includes(input) ? '' : 'none'; });
}

// --- FICHA PÚBLICA (COM HISTÓRICO RESTAURADO) ---
window.openProfile = function(id) {
    const m = museumsData.find(x => x.id === id); if(!m) return;
    
    const val = (campoStr, idCampo) => {
        if(m.hidden_fields && m.hidden_fields[idCampo]) return '<span class="badge bg-danger">Restrito</span>';
        return (campoStr && campoStr.trim() !== '') ? campoStr : '<span class="text-muted fst-italic">Não informado</span>';
    };

    document.getElementById('modalTitle').innerText = m.nome;
    
    let html = `
        <div class="row mb-3 border-bottom pb-3">
            <div class="col-md-8">
                <p class="mb-1 text-primary fw-bold"><i class="bi bi-geo-alt-fill"></i> ${val(m.logradouro, 'logradouro')}, ${val(m.numero, 'numero')} - ${val(m.cep, 'cep')}</p>
                <p class="mb-1 text-muted small">Município: ${val(m.municipio, 'municipio')} | Região: ${val(m.regiao, 'regiao')}</p>
                <p class="mt-2 mb-0 small"><strong>Tel:</strong> ${val(m.telefone, 'telefone')} | <strong>Email:</strong> ${val(m.email_institucional, 'email_institucional')}</p>
                <p class="mt-1 mb-0 small"><strong>Site/Redes:</strong> ${val(m.site, 'site')} | ${val(m.instagram, 'instagram')}</p>
            </div>
            <div class="col-md-4 text-md-end">
                <span class="badge bg-secondary mb-1">${val(m.natureza, 'natureza')}</span><br>
                <span class="badge bg-info text-dark">${val(m.situacao, 'situacao')}</span>
            </div>
        </div>
        <h6 class="text-primary fw-bold border-bottom pb-1">Técnico e Acervo</h6>
        <div class="row small mb-3">
            <div class="col-12 mb-2"><strong>Acervo:</strong> ${val(m.acervo, 'acervo')}</div>
            <div class="col-sm-6 mb-2"><strong>Horário:</strong> ${val(m.funcionamento, 'funcionamento')}</div>
            <div class="col-sm-6 mb-2"><strong>Ingresso:</strong> ${val(m.ingresso, 'ingresso')}</div>
            <div class="col-sm-6 mb-2"><strong>Gratuidades:</strong> ${val(m.gratuidades, 'gratuidades')}</div>
            <div class="col-sm-6 mb-2"><strong>Museólogo:</strong> ${val(m.museologo, 'museologo')}</div>
            <div class="col-12 mt-2"><strong>Acessibilidade:</strong> ${val(m.acessibilidade, 'acessibilidade')}</div>
        </div>
        <h6 class="text-primary fw-bold border-bottom pb-1">Histórico da Instituição</h6>
        <p class="small text-muted" style="text-align:justify;">${val(m.historico, 'historico')}</p>
    `;
    document.getElementById('modalPublicBody').innerHTML = html;
    profileModal.show();
}

// --- CONTROLE DE PÁGINAS (ABAS) ---
window.switchView = function(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';
    if(viewId === 'home' && map) { setTimeout(() => { map.invalidateSize(); }, 200); }
    window.scrollTo(0,0);
}
window.showPlaceholder = function(titleText) { switchView('em-construcao'); document.getElementById('construcao-title').innerText = titleText; }

// =====================================================================
// MÓDULO GESTOR (CADASTRO MANUAL, EDIÇÃO DINÂMICA E ROBÔ)
// =====================================================================
window.openAdminOrLogin = function() { if(isGestor) { document.getElementById('admin-panel').style.display = 'block'; applyFilters(); } else document.getElementById('login-overlay').style.display = 'flex'; }
window.closeLogin = function() { document.getElementById('login-overlay').style.display = 'none'; }
window.minimizarPainelGestor = function() { document.getElementById('admin-panel').style.display = 'none'; }
window.checkAdminPassword = function() { if(document.getElementById('adminPassword').value === 'simrj') { isGestor = true; openAdminOrLogin(); closeLogin(); } else alert('Senha Incorreta'); }
window.logoutGestor = function() { isGestor = false; minimizarPainelGestor(); applyFilters(); alert('Sessão encerrada.'); }

window.renderVisibilityList = function() {
    const term = normalizeString(document.getElementById('searchVisibility')?.value || '');
    const list = document.getElementById('visibility-list'); if(!list) return; list.innerHTML = '';
    document.getElementById('gestaoCount').innerText = museumsData.length;

    museumsData.forEach(m => {
        if(term && !normalizeString(m.nome).includes(term)) return;
        let bgClass = m.visivel ? "bg-white border shadow-sm" : "item-hidden";
        list.innerHTML += `<div class="d-flex justify-content-between align-items-center mb-2 p-3 rounded ${bgClass}"><div><h6 class="fw-bold mb-0 text-primary">${m.nome}</h6><small class="text-dark">${m.municipio || '-'} | Edições no Histórico: <b>${m.history ? m.history.length : 0}</b></small></div><button class="btn btn-sm btn-primary fw-bold px-3" onclick="openGestorEdit(${m.id})">Editar Ficha Completa</button></div>`;
    });
}

// Gera a tela de edição iterando sobre a ALL_FIELDS global
window.openGestorEdit = function(id) {
    editingMuseumId = id; const m = museumsData.find(x => x.id === id); if(!m) return;
    document.getElementById('gestorEditTitle').innerText = m.nome;
    document.getElementById('gestorMuseumVisible').checked = !m.visivel; 
    document.getElementById('gestorAuthor').value = ""; 

    let html = '';
    ALL_FIELDS.forEach(f => {
        let isHidden = m.hidden_fields && m.hidden_fields[f.id];
        let val = m[f.id] || '';
        let inputHtml = f.isTextarea ? `<textarea class="form-control form-control-sm" id="edit_${f.id}" rows="3">${val}</textarea>` : `<input type="text" class="form-control form-control-sm" id="edit_${f.id}" value="${val}">`;
        
        html += `
            <div class="${f.isTextarea ? 'col-12' : 'col-md-6'} border-bottom pb-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="fw-bold text-primary small m-0">${f.label}</label>
                    <div class="form-check form-switch m-0"><input class="form-check-input check-vis" type="checkbox" id="vis_${f.id}" ${!isHidden ? 'checked' : ''}> <small class="text-muted" style="font-size:0.7rem;">Visível</small></div>
                </div>
                ${inputHtml}
            </div>
        `;
    });
    document.getElementById('gestorEditFields').innerHTML = html;

    // Carrega o Histórico
    let hLog = document.getElementById('gestorHistoryLog');
    hLog.innerHTML = m.history && m.history.length > 0 ? m.history.map(h => `> [${h.date}] Atualizado por: <b>${h.user}</b>`).join('<br>') : '> Nenhum histórico de edição registrado.';
    
    editModal.show();
}

window.saveGestorEdits = function() {
    const author = document.getElementById('gestorAuthor').value.trim();
    if(!author || author.length < 3) return alert("Erro: O nome do Responsável pela atualização é obrigatório para manter o histórico.");

    let m = museumsData.find(x => x.id === editingMuseumId); if(!m) return;
    m.hidden_fields = {};
    
    ALL_FIELDS.forEach(f => {
        m[f.id] = document.getElementById(`edit_${f.id}`).value;
        if(!document.getElementById(`vis_${f.id}`).checked) m.hidden_fields[f.id] = true;
    });

    m.lat = parseCoordinate(m.lat); m.lng = parseCoordinate(m.lng); // Blindagem na hora de salvar
    m.visivel = !document.getElementById('gestorMuseumVisible').checked;

    if(!m.history) m.history = [];
    m.history.push({ date: new Date().toLocaleString('pt-BR'), user: author });

    localEditsMemory[m.nome] = m; localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory));
    applyFilters(); editModal.hide(); alert("Ficha atualizada e histórico registrado!");
}

window.saveManualGestor = function() {
    const nome = document.getElementById('manNome').value; if(!nome) return alert("O Nome é obrigatório.");
    let newM = { id: Date.now(), visivel: true, hidden_fields: {}, history: [{ date: new Date().toLocaleString('pt-BR'), user: "Cadastro Manual (Gestor)" }] };
    
    ALL_FIELDS.forEach(f => { 
        let el = document.getElementById('man' + f.id.substring(0,4).charAt(0).toUpperCase() + f.id.substring(1,4)); // Mapeamento rápido de IDs do HTML
        if(el) newM[f.id] = el.value; 
    });
    // Pega manualmente os que os IDs ficaram diferentes
    newM.nome = nome; newM.municipio = document.getElementById('manMuni').value; newM.logradouro = document.getElementById('manLogradouro').value;
    newM.cep = document.getElementById('manCEP').value; newM.documento_criacao = document.getElementById('manDoc').value;
    newM.lat = parseCoordinate(document.getElementById('manLat').value); newM.lng = parseCoordinate(document.getElementById('manLng').value);

    museumsData.push(newM); localEditsMemory[nome] = newM; localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory));
    applyFilters(); alert("Museu cadastrado com sucesso!"); document.querySelectorAll('#formManualGestor input, #formManualGestor textarea').forEach(el => el.value = '');
}

function updatePendingList() {
    const list = document.getElementById('pending-list'); if(!list) return; list.innerHTML = '';
    const pendings = museumsData.filter(m => !m.lat || !m.lng); 
    document.getElementById('pendingCount').innerText = pendings.length;
    pendings.forEach(m => { list.innerHTML += `<div class="p-3 mb-2 bg-white border shadow-sm d-flex justify-content-between align-items-center"><div><strong class="text-danger">${m.nome}</strong><br><small>${m.municipio || 'Sem município'}</small></div><button class="btn btn-sm btn-warning fw-bold" onclick="openAdminMapPicker(${m.id})">Marcar no Mapa</button></div>`; });
}

let adminMapInstance, adminTempMarker;
window.openAdminMapPicker = function(id) {
    editingMuseumId = id; new bootstrap.Modal(document.getElementById('adminMapModal')).show();
    setTimeout(() => {
        if (!adminMapInstance) { 
            adminMapInstance = L.map('adminLeafletMap').setView([-22.9068, -43.1729], 8); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(adminMapInstance);
            adminMapInstance.on('click', e => { if (adminTempMarker) adminMapInstance.removeLayer(adminTempMarker); adminTempMarker = L.marker(e.latlng).addTo(adminMapInstance); }); 
        } adminMapInstance.invalidateSize();
    }, 400);
}
window.saveAdminPin = function() {
    if (!adminTempMarker) return alert("Clique no mapa.");
    let m = museumsData.find(x => x.id === editingMuseumId);
    if(m) { m.lat = adminTempMarker.getLatLng().lat; m.lng = adminTempMarker.getLatLng().lng; localEditsMemory[m.nome] = m; localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory)); applyFilters(); bootstrap.Modal.getInstance(document.getElementById('adminMapModal')).hide(); }
}

// --- ROBÔ GEOCODIFICADOR (BLINDADO) ---
window.startRobotProcessing = function() {
    const file = document.getElementById('csvFileRobot').files[0]; if(!file) return alert("Selecione uma planilha primeiro!");
    document.getElementById('btnRobot').disabled = true; document.getElementById('robotProgressContainer').classList.remove('d-none'); document.getElementById('robotLog').classList.remove('d-none');
    const log = msg => { let el = document.getElementById('robotLog'); el.innerHTML += `<br>> ${msg}`; el.scrollTop = el.scrollHeight; };
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) {
            let data = results.data;
            for (let i = 0; i < data.length; i++) {
                let row = data[i]; let nome = row["Nome da Instituição"] || row["Nome"];
                if(!row["Lat"] && !row["Lng"] && nome) {
                    log(`Buscando: ${nome}...`);
                    let query = `${row["Endereço"]||row["Logradouro"]||''}, ${row["Município"]||''}, RJ, Brasil`.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
                    try {
                        let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                        let d = await res.json();
                        if(d && d.length > 0 && isWithinRJ(parseFloat(d[0].lat), parseFloat(d[0].lon))) {
                            // AQUI GARANTE QUE O ROBÔ GRAVA COM PONTO E NÃO VÍRGULA!
                            row["Lat"] = parseFloat(d[0].lat).toFixed(6); row["Lng"] = parseFloat(d[0].lon).toFixed(6); log(`   -> OK!`);
                        } else log(`   -> Falhou (Fora do RJ ou Não Achou)`);
                    } catch(e) { log(`   -> Erro API.`); }
                    await sleep(1100);
                }
                document.getElementById('robotProgressBar').style.width = `${Math.round(((i+1)/data.length)*100)}%`;
            }
            log(`Concluído! Baixando CSV...`);
            let csv = Papa.unparse(data); let blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' });
            let link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "dados_geocodificados.csv"; link.click();
            document.getElementById('btnRobot').disabled = false;
        }
    });
}