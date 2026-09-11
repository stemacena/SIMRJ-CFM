let map, markersArray = [], museumsData = [], currentFilteredData = [];
let profileModal, editModal, isGestor = false, editingMuseumId = null;
let localEditsMemory = JSON.parse(localStorage.getItem('simrj_edits')) || {};

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

// CORREÇÃO CENTRO-SUL: Ignora hífens ao normalizar a string
const normalizeString = (str) => { if(!str) return ""; return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").toLowerCase().trim(); };

function parseCoordinate(val) {
    if (!val) return null;
    let f = parseFloat(String(val).replace(',', '.').replace(/[^0-9.-]/g, ''));
    return isNaN(f) ? null : f;
}
function isWithinRJ(lat, lng) { return (lat >= -23.4 && lat <= -20.7) && (lng >= -44.9 && lng <= -40.9); }

async function loadInitialCSVData() {
    try {
        const response = await fetch('dados.csv');
        if (!response.ok) throw new Error();
        Papa.parse(await response.text(), {
            header: true, skipEmptyLines: true,
            complete: async function(results) { await processParsedData(results.data); }
        });
    } catch(e) { console.warn("Planilha dados.csv não encontrada na raiz."); }
}

async function processParsedData(rawData, isUpdate = false) {
    let cleanData = [];
    for (let i = 0; i < rawData.length; i++) {
        let row = rawData[i];
        let nome = row["Nome da Instituição"] || row["Nome"];
        if (!nome) continue;

        let lat = parseCoordinate(row["Lat"] || row["Latitude"]);
        let lng = parseCoordinate(row["Lng"] || row["Longitude"]);
        if (lat && lng && !isWithinRJ(lat, lng)) { lat = null; lng = null; }

        let mObj = {
            id: i + 1000, 
            nome: nome, 
            sigla: row["Sigla"] || "",
            cnpj: row["CNPJ"] || "",
            documento_criacao: row["Documento de Criação"] || "",
            municipio: row["Município"] || row["Municipio"] || "Não informado", 
            regiao: row["Região"] || row["Regiao"] || "Não informada", 
            zona: row["Zona do Rio"] || row["Zona"] || "",
            endereco: row["Endereço"] || row["Endereco"] || row["Logradouro"] || "",
            telefone: row["Telefone Institucional"] || row["Telefone"] || "",
            email: row["E-mail Institucional"] || row["Email"] || "",
            site: row["Site"] || row["Site Oficial"] || "",
            facebook: row["Facebook"] || "",
            instagram: row["Instagram"] || "",
            twitter: row["Twitter"] || row["Twitter/X"] || "",
            natureza: row["Natureza Administrativa do Museu"] || row["Natureza Administrativa"] || "Privada", 
            situacao: row["Situação"] || row["Situacao"] || row["Status"] || "Desconhecido", 
            funcionamento: row["Funcionamento"] || row["Horário"] || row["Turnos"] || "",
            ingresso: row["Valor ingresso"] || row["Ingresso"] || "",
            gratuidades: row["Gratuidades"] || row["Gratuidade"] || "",
            acervo: row["Acervo Predominante"] || row["Acervo"] || "",
            educativo: row["Setor Educativo"] || row["Educativo"] || "",
            museologo: row["Museólogo"] || row["Museologo"] || "",
            acessibilidade: row["Acessibilidade"] || row["Acessibilidade Universal"] || "",
            historico_museu: row["Histórico"] || row["Histórico do Museu"] || "", 
            resp_nome: row["Responsável pelo Cadastro"] || "",
            resp_email: row["E-mail do Responsável"] || "",
            lat: lat, lng: lng,
            visivel: true, hidden_fields: {}, history: []
        };
        if (localEditsMemory[mObj.nome]) mObj = { ...mObj, ...localEditsMemory[mObj.nome] };
        cleanData.push(mObj);
    }
    museumsData = cleanData;
    populateCityFilter(); applyFilters();
}

function populateCityFilter() {
    const select = document.getElementById('filterMunicipio'); if(!select) return;
    select.innerHTML = '<option value="">Todos os Municípios</option>';
    [...new Set(museumsData.map(m => m.municipio).filter(Boolean))].sort().forEach(c => select.innerHTML += `<option value="${c}">${c}</option>`);
}

function getCheckedValues(containerId) { return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map(el => normalizeString(el.value)); }

window.applyFilters = function() {
    const termo = normalizeString(document.getElementById('filterNome')?.value || '');
    const mapStat = document.getElementById('filterStatusMapa')?.value;
    const muni = normalizeString(document.getElementById('filterMunicipio')?.value || '');
    const gratuidade = normalizeString(document.getElementById('filterGratuidade')?.value || '');
    const acesso = normalizeString(document.getElementById('filterAcesso')?.value || '');
    
    const regioes = getCheckedValues('boxRegiao');
    const naturezas = getCheckedValues('boxNatureza');
    const acervos = getCheckedValues('boxAcervo');
    const situacoes = getCheckedValues('boxSituacao');
    const turnos = getCheckedValues('boxTurno');
    const ingressos = getCheckedValues('boxIngresso');

    currentFilteredData = museumsData.filter(m => {
        if (!m.visivel && !isGestor) return false;
        
        let mNome = normalizeString(m.nome), mMuni = normalizeString(m.municipio), mReg = normalizeString(m.regiao), mNat = normalizeString(m.natureza), mAcer = normalizeString(m.acervo), mSit = normalizeString(m.situacao), mFunc = normalizeString(m.funcionamento), mIng = normalizeString(m.ingresso), mGrat = normalizeString(m.gratuidades), mAcc = normalizeString(m.acessibilidade);

        if (termo && !mNome.includes(termo)) return false;
        if (muni && mMuni !== muni) return false;
        if (gratuidade && !mGrat.includes(gratuidade)) return false;
        if (acesso && !mAcc.includes(acesso)) return false;
        
        if (regioes.length > 0 && !regioes.some(r => mReg.includes(r))) return false;
        if (naturezas.length > 0 && !naturezas.some(n => mNat.includes(n))) return false;
        if (acervos.length > 0 && !acervos.some(a => mAcer.includes(a))) return false;
        if (situacoes.length > 0 && !situacoes.some(s => mSit.includes(s))) return false;
        if (turnos.length > 0 && !turnos.some(t => mFunc.includes(t))) return false;
        if (ingressos.length > 0 && !ingressos.some(i => mIng.includes(i))) return false;

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
    let pData = data.filter(m => m.visivel);

    document.getElementById('count-total').innerText = pData.length;
    document.getElementById('resultCount').innerText = pData.length;
    
    let htmlTable = '<div class="table-responsive"><table class="table table-hover border small"><thead class="table-dark"><tr><th>Nome</th><th>Município</th><th>Ação</th></tr></thead><tbody>';
    let htmlList = '';

    pData.forEach(m => {
        let btn = `<button class="btn btn-sm btn-outline-primary fw-bold" onclick="openProfile(${m.id})">Ver Ficha</button>`;
        htmlTable += `<tr><td class="fw-bold">${m.nome}</td><td>${m.municipio}</td><td>${btn}</td></tr>`;
        htmlList += `<div class="p-3 mb-2 bg-white border rounded shadow-sm d-flex justify-content-between align-items-center"><div><h6 class="fw-bold text-primary mb-1">${m.nome}</h6><small class="text-muted">${m.municipio} | ${m.natureza}</small></div>${btn}</div>`;

        if (m.lat && m.lng) {
            const marker = L.marker([m.lat, m.lng]).addTo(map);
            marker.bindPopup(`<div class="text-center p-1"><h6 class="fw-bold text-primary mb-1">${m.nome}</h6><small class="d-block mb-2">${m.municipio}</small><button class="btn btn-sm btn-warning w-100 fw-bold" onclick="openProfile(${m.id})">Ver Ficha</button></div>`);
            markersArray.push(marker);
        }
    });

    htmlTable += '</tbody></table></div>';
    if(document.getElementById('container-lista-geral')) document.getElementById('container-lista-geral').innerHTML = htmlTable;
    if(document.getElementById('museum-list-container')) document.getElementById('museum-list-container').innerHTML = htmlList;
}

window.filterListaTexto = function() { let input = normalizeString(document.getElementById('searchLista').value); document.querySelectorAll('#container-lista-geral tbody tr').forEach(row => { row.style.display = normalizeString(row.innerText).includes(input) ? '' : 'none'; }); }

window.openProfile = function(id) {
    const m = museumsData.find(x => x.id === id); if(!m) return;
    const val = (vStr, idC) => { if(m.hidden_fields && m.hidden_fields[idC]) return '<span class="badge bg-danger">Oculto</span>'; return (vStr && vStr.trim() !== '') ? vStr : '<span class="text-muted fst-italic">Não inf.</span>'; };
    document.getElementById('modalTitle').innerText = m.nome;
    
    let html = `
        <div class="row mb-3 border-bottom pb-3">
            <div class="col-md-8">
                <p class="mb-1 text-primary fw-bold"><i class="bi bi-geo-alt-fill"></i> ${val(m.endereco, 'endereco')}</p>
                <p class="mb-1 text-muted small">Município: ${val(m.municipio, 'municipio')} | Região: ${val(m.regiao, 'regiao')}</p>
                <p class="mt-2 mb-0 small"><strong>Tel:</strong> ${val(m.telefone, 'telefone')} | <strong>Site:</strong> ${val(m.site, 'site')} | <strong>E-mail:</strong> ${val(m.email, 'email')}</p>
            </div>
            <div class="col-md-4 text-md-end"><span class="badge bg-secondary mb-1">${val(m.natureza, 'natureza')}</span><br><span class="badge bg-info text-dark">${val(m.situacao, 'situacao')}</span></div>
        </div>
        <h6 class="text-primary fw-bold border-bottom pb-1">Técnico, Acesso e Acervo</h6>
        <div class="row small mb-3">
            <div class="col-12 mb-2"><strong>Acervo:</strong> ${val(m.acervo, 'acervo')}</div>
            <div class="col-sm-6 mb-2"><strong>Horário:</strong> ${val(m.funcionamento, 'funcionamento')}</div>
            <div class="col-sm-6 mb-2"><strong>Ingresso:</strong> ${val(m.ingresso, 'ingresso')}</div>
            <div class="col-12 mb-2"><strong>Gratuidades:</strong> ${val(m.gratuidades, 'gratuidades')}</div>
            <div class="col-sm-6 mb-2"><strong>Setor Educativo:</strong> ${val(m.educativo, 'educativo')}</div>
            <div class="col-sm-6 mb-2"><strong>Museólogo:</strong> ${val(m.museologo, 'museologo')}</div>
            <div class="col-12 mb-2"><strong>Acessibilidade:</strong> ${val(m.acessibilidade, 'acessibilidade')}</div>
        </div>
        <h6 class="text-primary fw-bold border-bottom pb-1">Histórico da Instituição</h6>
        <p class="small text-muted" style="text-align: justify;">${val(m.historico_museu, 'historico_museu')}</p>
    `;
    document.getElementById('modalPublicBody').innerHTML = html;
    profileModal.show();
}

window.switchView = function(viewId) {
    if(event) event.preventDefault();
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';
    if(viewId === 'home' && map) { setTimeout(() => { map.invalidateSize(); }, 200); }
}

window.showPlaceholder = function(titleText) {
    if(event) event.preventDefault();
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById('view-em-construcao').style.display = 'block';
    document.getElementById('construcao-title').innerText = titleText;
}

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
        list.innerHTML += `<div class="d-flex justify-content-between align-items-center mb-2 p-3 rounded ${bgClass}"><div><h6 class="fw-bold mb-0 text-primary">${m.nome}</h6><small class="text-dark">${m.municipio} | <b>Edições: ${m.history ? m.history.length : 0}</b></small></div><button class="btn btn-sm btn-primary fw-bold px-3" onclick="openGestorEdit(${m.id})"><i class="bi bi-pencil-square"></i> Editar Ficha</button></div>`;
    });
}

window.openGestorEdit = function(id) {
    editingMuseumId = id; const m = museumsData.find(x => x.id === id); if(!m) return;
    document.getElementById('gestorEditTitle').innerText = m.nome;
    document.getElementById('gestorMuseumVisible').checked = !m.visivel;
    document.getElementById('gestorAuthor').value = "";

    const fields = [
        { id: 'nome', label: 'Nome' }, { id: 'sigla', label: 'Sigla' }, { id: 'cnpj', label: 'CNPJ' }, { id: 'documento_criacao', label: 'Doc de Criação' },
        { id: 'municipio', label: 'Município' }, { id: 'regiao', label: 'Região' }, { id: 'zona', label: 'Zona' }, { id: 'endereco', label: 'Endereço' },
        { id: 'telefone', label: 'Telefone' }, { id: 'email', label: 'E-mail' }, { id: 'site', label: 'Site' }, { id: 'facebook', label: 'Facebook' }, { id: 'instagram', label: 'Instagram' }, { id: 'twitter', label: 'Twitter' },
        { id: 'natureza', label: 'Natureza' }, { id: 'situacao', label: 'Situação' }, { id: 'funcionamento', label: 'Turnos/Dias' }, { id: 'ingresso', label: 'Valor Ingresso' }, { id: 'gratuidades', label: 'Gratuidades' },
        { id: 'educativo', label: 'Educativo?' }, { id: 'museologo', label: 'Museólogo?' }, { id: 'acervo', label: 'Acervo Predom.' }, { id: 'acessibilidade', label: 'Acessibilidade Universal' }, { id: 'historico_museu', label: 'Histórico do Museu' },
        { id: 'resp_nome', label: 'Resp. Cadastro' }, { id: 'resp_email', label: 'E-mail Resp.' },
        { id: 'lat', label: 'Latitude' }, { id: 'lng', label: 'Longitude' }
    ];

    let html = '';
    fields.forEach(f => {
        let isHidden = m.hidden_fields && m.hidden_fields[f.id];
        html += `<div class="col-md-6 border-bottom pb-2"><div class="d-flex justify-content-between"><label class="fw-bold text-primary small">${f.label}</label><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="vis_${f.id}" ${!isHidden ? 'checked' : ''}> <small class="text-muted" style="font-size:0.7rem;">Visível</small></div></div><input type="text" class="form-control form-control-sm" id="edit_${f.id}" value="${m[f.id] || ''}"></div>`;
    });
    document.getElementById('gestorEditFields').innerHTML = html;
    
    let hLog = document.getElementById('gestorHistoryLog');
    hLog.innerHTML = m.history && m.history.length > 0 ? m.history.map(h => `> [${h.date}] Atualizado por: <b>${h.user}</b>`).join('<br>') : '> Sem histórico.';
    editModal.show();
}

window.saveGestorEdits = function() {
    const author = document.getElementById('gestorAuthor').value.trim();
    if(!author || author.length < 3) return alert("O nome do Responsável é obrigatório para o histórico.");
    let m = museumsData.find(x => x.id === editingMuseumId); if(!m) return;

    m.hidden_fields = {};
    const fields = ['nome', 'sigla', 'cnpj', 'documento_criacao', 'municipio', 'regiao', 'zona', 'endereco', 'telefone', 'email', 'site', 'facebook', 'instagram', 'twitter', 'natureza', 'situacao', 'funcionamento', 'ingresso', 'gratuidades', 'educativo', 'museologo', 'acervo', 'acessibilidade', 'historico_museu', 'resp_nome', 'resp_email', 'lat', 'lng'];
    
    fields.forEach(f => {
        m[f] = document.getElementById(`edit_${f}`).value;
        if(!document.getElementById(`vis_${f}`).checked) m.hidden_fields[f] = true;
    });

    m.lat = parseCoordinate(m.lat); m.lng = parseCoordinate(m.lng); 
    m.visivel = !document.getElementById('gestorMuseumVisible').checked;
    
    m.history.push({ date: new Date().toLocaleString('pt-BR'), user: author });
    localEditsMemory[m.nome] = m; localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory));
    applyFilters(); editModal.hide(); alert("Ficha atualizada com sucesso!");
}

window.saveManualGestor = function() {
    const nome = document.getElementById('man_nome').value; if(!nome) return alert("O Nome é obrigatório.");
    let newM = {
        id: Date.now(), nome: nome, sigla: document.getElementById('man_sigla').value, cnpj: document.getElementById('man_cnpj').value, documento_criacao: document.getElementById('man_documento_criacao').value,
        municipio: document.getElementById('man_municipio').value, regiao: document.getElementById('man_regiao').value, zona: document.getElementById('man_zona').value, endereco: document.getElementById('man_endereco').value + " " + document.getElementById('man_numero').value,
        telefone: document.getElementById('man_telefone').value, email: document.getElementById('man_email').value, site: document.getElementById('man_site').value, facebook: document.getElementById('man_facebook').value, instagram: document.getElementById('man_instagram').value, twitter: document.getElementById('man_twitter').value,
        natureza: document.getElementById('man_natureza').value, situacao: document.getElementById('man_situacao').value, funcionamento: document.getElementById('man_funcionamento').value, ingresso: document.getElementById('man_ingresso').value, gratuidades: document.getElementById('man_gratuidades').value,
        educativo: document.getElementById('man_educativo').value, museologo: document.getElementById('man_museologo').value, acervo: document.getElementById('man_acervo').value, acessibilidade: document.getElementById('man_acessibilidade').value, historico_museu: document.getElementById('man_historico').value,
        resp_nome: document.getElementById('man_resp_nome').value, resp_email: document.getElementById('man_resp_email').value,
        lat: parseCoordinate(document.getElementById('man_lat').value), lng: parseCoordinate(document.getElementById('man_lng').value),
        visivel: true, hidden_fields: {}, history: [{ date: new Date().toLocaleString('pt-BR'), user: "Cadastro Manual (Gestor)" }]
    };
    museumsData.push(newM); localEditsMemory[nome] = newM; localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory));
    applyFilters(); alert("Museu cadastrado com sucesso!"); document.querySelectorAll('#formManualGestor input, #formManualGestor textarea').forEach(el => el.value = '');
}

function updatePendingList() {
    const list = document.getElementById('pending-list'); if(!list) return; list.innerHTML = '';
    const pendings = museumsData.filter(m => !m.lat || !m.lng); 
    document.getElementById('pendingCount').innerText = pendings.length;
    pendings.forEach(m => { list.innerHTML += `<div class="p-3 mb-2 bg-white border shadow-sm d-flex justify-content-between align-items-center"><div><strong class="text-danger">${m.nome}</strong><br><small>${m.municipio}</small></div><button class="btn btn-sm btn-warning fw-bold" onclick="openAdminMapPicker(${m.id})">Marcar no Mapa</button></div>`; });
}

let adminMapInstance, adminTempMarker;
window.openAdminMapPicker = function(id) {
    editingMuseumId = id; new bootstrap.Modal(document.getElementById('adminMapModal')).show();
    setTimeout(() => {
        if (!adminMapInstance) { 
            adminMapInstance = L.map('adminLeafletMap').setView([-22.9068, -43.1729], 8);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(adminMapInstance);
            adminMapInstance.on('click', e => { if (adminTempMarker) adminMapInstance.removeLayer(adminTempMarker); adminTempMarker = L.marker(e.latlng).addTo(adminMapInstance); }); 
        }
        adminMapInstance.invalidateSize();
    }, 400);
}
window.saveAdminPin = function() {
    if (!adminTempMarker) return alert("Clique no mapa.");
    let m = museumsData.find(x => x.id === editingMuseumId);
    if(m) { 
        m.lat = adminTempMarker.getLatLng().lat; m.lng = adminTempMarker.getLatLng().lng; 
        localEditsMemory[m.nome] = m; localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory));
        applyFilters(); bootstrap.Modal.getInstance(document.getElementById('adminMapModal')).hide(); 
    }
}

// IMPORTAÇÃO NOVA E ROBÔ OTIMIZADOS
window.startUpdateImport = function() {
    const file = document.getElementById('csvFileUpdate').files[0];
    if(!file) return alert("Selecione a planilha primeiro.");
    let statEl = document.getElementById('upload-status');
    statEl.classList.remove('d-none'); statEl.className = 'alert alert-info small p-2 mt-2'; statEl.innerText = "Lendo planilha e atualizando base...";
    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) {
            await processParsedData(results.data, true);
            statEl.className = 'alert alert-success small p-2 mt-2'; statEl.innerText = "Mapa e Base atualizados com sucesso!";
        }
    });
}

window.startRobotProcessing = function() {
    const file = document.getElementById('csvFileRobot').files[0];
    if(!file) return alert("Selecione uma planilha primeiro!");
    document.getElementById('btnRobot').disabled = true;
    document.getElementById('robotProgressContainer').classList.remove('d-none');
    document.getElementById('robotLog').classList.remove('d-none');

    const log = msg => { let el = document.getElementById('robotLog'); el.innerHTML += `<br>> ${msg}`; el.scrollTop = el.scrollHeight; };
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) {
            let data = results.data;
            for (let i = 0; i < data.length; i++) {
                let row = data[i];
                let nome = row["Nome da Instituição"] || row["Nome"];
                if(!row["Lat"] && !row["Lng"] && nome) {
                    log(`Buscando: ${nome}...`);
                    let query = `${row["Endereço"]||''}, ${row["Município"]||''}, RJ, Brasil`.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
                    try {
                        let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                        let d = await res.json();
                        if(d && d.length > 0 && isWithinRJ(parseFloat(d[0].lat), parseFloat(d[0].lon))) {
                            row["Lat"] = String(d[0].lat).replace(',','.'); row["Lng"] = String(d[0].lon).replace(',','.'); log(`   -> OK!`);
                        } else log(`   -> Falhou.`);
                    } catch(e) { log(`   -> Erro API.`); }
                    await sleep(1100);
                }
                // BARRA DE PROGRESSO CORRIGIDA
                let pct = Math.round(((i + 1) / data.length) * 100);
                let pBar = document.getElementById('robotProgressBar');
                pBar.style.width = `${pct}%`;
                pBar.innerText = `${pct}%`;
            }
            log(`Concluído! Baixando CSV...`);
            let csv = Papa.unparse(data);
            let blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' });
            let link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "dados_geocodificados.csv"; link.click();
            document.getElementById('btnRobot').disabled = false;
        }
    });
}