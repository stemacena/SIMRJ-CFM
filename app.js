let map, markersArray = [], museumsData = [], currentFilteredData = [];
let profileModal, editModal, isGestor = false;
let editingMuseumId = null;

// Lógica de Memória Local (Substitui o Django temporariamente)
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

const normalizeString = (str) => { if(!str) return ""; return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); };

// --- BLINDAGEM DE COORDENADAS (Corrige Pinos na África/Antártida) ---
function parseCoordinate(val) {
    if (!val) return null;
    let s = String(val).replace(',', '.').replace(/[^0-9.-]/g, ''); // Força ponto ao invés de vírgula
    let f = parseFloat(s);
    return isNaN(f) ? null : f;
}
function isWithinRJ(lat, lng) {
    // Retângulo aproximado do Estado do RJ. Evita bugs mundiais.
    return (lat >= -23.5 && lat <= -20.5) && (lng >= -45.0 && lng <= -40.5);
}

// --- CARREGAMENTO DE DADOS ---
async function loadInitialCSVData() {
    try {
        const response = await fetch('dados.csv');
        if (!response.ok) throw new Error();
        Papa.parse(await response.text(), {
            header: true, skipEmptyLines: true,
            complete: async function(results) { await processParsedData(results.data); }
        });
    } catch(e) { console.warn("Planilha 'dados.csv' não encontrada na raiz. Aguardando importação."); }
}

async function processParsedData(rawData) {
    let cleanData = [];
    for (let i = 0; i < rawData.length; i++) {
        let row = rawData[i];
        let nome = row["Nome da Instituição"] || row["Nome"];
        if (!nome) continue;

        let idNum = i + 1000;
        let lat = parseCoordinate(row["Lat"] || row["Latitude"]);
        let lng = parseCoordinate(row["Lng"] || row["Longitude"]);
        
        // Aplica a Blindagem do RJ
        if (lat && lng && !isWithinRJ(lat, lng)) { lat = null; lng = null; }

        let museumObj = {
            id: idNum, 
            nome: nome, 
            municipio: row["Município"] || row["Municipio"] || "Não informado", 
            regiao: row["Região"] || row["Regiao"] || "Não informada", 
            natureza: row["Natureza Administrativa do Museu"] || row["Natureza Administrativa"] || "Privada", 
            situacao: row["Situação"] || row["Situacao"] || row["Status"] || "Desconhecido", 
            endereco: row["Endereço"] || row["Endereco"],
            telefone: row["Telefone Institucional"] || row["Telefone"],
            site: row["Site"] || row["Site Oficial"],
            acervo: row["Acervo Predominante"] || row["Acervo"],
            ingresso: row["Valor ingresso"] || row["Ingresso"],
            funcionamento: row["Funcionamento"] || row["Horário"],
            museologo: row["Museólogo"] || row["Museologo"],
            educativo: row["Setor Educativo"] || row["Educativo"],
            lat: lat, lng: lng,
            visivel: true, // Visibilidade da Ficha
            hidden_fields: {}, // Controle de campos específicos (ex: {telefone: true})
            history: [] // Histórico de Edições
        };

        // Mescla edições salvas na memória local (Storage)
        if (localEditsMemory[museumObj.nome]) {
            museumObj = { ...museumObj, ...localEditsMemory[museumObj.nome] };
        }
        cleanData.push(museumObj);
    }
    museumsData = cleanData;
    populateCityFilter(); applyFilters();
}

function populateCityFilter() {
    const select = document.getElementById('filterMunicipio');
    if(!select) return;
    select.innerHTML = '<option value="">Todos os Municípios</option>';
    [...new Set(museumsData.map(m => m.municipio).filter(Boolean))].sort().forEach(city => {
        select.innerHTML += `<option value="${city}">${city}</option>`;
    });
}

// --- LÓGICA COMPLEXA DE FILTROS ---
function getCheckedValues(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map(el => normalizeString(el.value));
}

window.applyFilters = function() {
    const termo = normalizeString(document.getElementById('filterNome')?.value || '');
    const mapStat = document.getElementById('filterStatusMapa')?.value;
    const muni = normalizeString(document.getElementById('filterMunicipio')?.value || '');
    
    // Arrays das caixas de rolagem
    const regioes = getCheckedValues('boxRegiao');
    const naturezas = getCheckedValues('boxNatureza');
    const acervos = getCheckedValues('boxAcervo');
    const situacoes = getCheckedValues('boxSituacao');

    currentFilteredData = museumsData.filter(m => {
        if (!m.visivel && !isGestor) return false; // Ficha Oculta
        
        let mNome = normalizeString(m.nome);
        let mMuni = normalizeString(m.municipio);
        let mReg = normalizeString(m.regiao);
        let mNat = normalizeString(m.natureza);
        let mAcer = normalizeString(m.acervo);
        let mSit = normalizeString(m.situacao);

        if (termo && !mNome.includes(termo)) return false;
        if (muni && mMuni !== muni) return false;
        
        // Lógica: Se marcou algum checkbox, TEM que bater com a lista. Se não marcou nenhum, passa tudo.
        if (regioes.length > 0 && !regioes.some(r => mReg.includes(r))) return false;
        if (naturezas.length > 0 && !naturezas.some(n => mNat.includes(n))) return false;
        if (acervos.length > 0 && !acervos.some(a => mAcer.includes(a))) return false;
        if (situacoes.length > 0 && !situacoes.some(s => mSit.includes(s))) return false;

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
    
    // Tabela Geral
    let htmlTable = '<div class="table-responsive"><table class="table table-hover border small"><thead class="table-dark"><tr><th>Nome</th><th>Município</th><th>Ação</th></tr></thead><tbody>';
    
    // Lista abaixo do Mapa
    let htmlList = '';

    publicData.forEach(m => {
        let btn = `<button class="btn btn-sm btn-outline-primary fw-bold" onclick="openProfile(${m.id})">Ver Ficha</button>`;
        htmlTable += `<tr><td class="fw-bold">${m.nome}</td><td>${m.municipio}</td><td>${btn}</td></tr>`;
        
        htmlList += `
        <div class="p-3 mb-2 bg-white border rounded shadow-sm d-flex justify-content-between align-items-center">
            <div><h6 class="fw-bold text-primary mb-1">${m.nome}</h6><small class="text-muted">${m.municipio} | ${m.natureza}</small></div>
            ${btn}
        </div>`;

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

window.filterListaTexto = function() {
    let input = normalizeString(document.getElementById('searchLista').value);
    document.querySelectorAll('#container-lista-geral tbody tr').forEach(row => { row.style.display = normalizeString(row.innerText).includes(input) ? '' : 'none'; });
}

// --- FICHA PÚBLICA (Com restrição de campos ocultos) ---
window.openProfile = function(id) {
    const m = museumsData.find(x => x.id === id); if(!m) return;
    
    // Função que checa se o campo foi ocultado pelo gestor
    const val = (campoStr, idCampo) => {
        if(m.hidden_fields && m.hidden_fields[idCampo]) return '<span class="badge bg-danger">Informação Restrita</span>';
        return (campoStr && campoStr.trim() !== '') ? campoStr : '<span class="text-muted fst-italic">Não informado</span>';
    };

    document.getElementById('modalTitle').innerText = m.nome;
    
    let html = `
        <div class="row mb-3 border-bottom pb-3">
            <div class="col-md-8">
                <p class="mb-1 text-primary fw-bold"><i class="bi bi-geo-alt-fill"></i> ${val(m.endereco, 'endereco')}</p>
                <p class="mb-1 text-muted small">Município: ${val(m.municipio, 'municipio')} | Região: ${val(m.regiao, 'regiao')}</p>
                <p class="mt-2 mb-0 small"><strong>Tel:</strong> ${val(m.telefone, 'telefone')} | <strong>Site:</strong> ${val(m.site, 'site')}</p>
            </div>
            <div class="col-md-4 text-md-end">
                <span class="badge bg-secondary mb-1">${val(m.natureza, 'natureza')}</span><br>
                <span class="badge bg-info text-dark">${val(m.situacao, 'situacao')}</span>
            </div>
        </div>
        <h6 class="text-primary fw-bold border-bottom pb-1">Técnico e Acervo</h6>
        <div class="row small mb-3">
            <div class="col-12 mb-2"><strong>Acervo:</strong> ${val(m.acervo, 'acervo')}</div>
            <div class="col-sm-6"><strong>Horário:</strong> ${val(m.funcionamento, 'funcionamento')}</div>
            <div class="col-sm-6"><strong>Ingresso:</strong> ${val(m.ingresso, 'ingresso')}</div>
        </div>
    `;
    document.getElementById('modalPublicBody').innerHTML = html;
    profileModal.show();
}


// =====================================================================
// MÓDULO GESTOR (EDIÇÃO COM HISTÓRICO)
// =====================================================================
window.openAdminOrLogin = function() {
    if(isGestor) { document.getElementById('admin-panel').style.display = 'block'; applyFilters(); } 
    else document.getElementById('login-overlay').style.display = 'flex';
}
window.closeLogin = function() { document.getElementById('login-overlay').style.display = 'none'; }
window.minimizarPainelGestor = function() { document.getElementById('admin-panel').style.display = 'none'; }
window.checkAdminPassword = function() { if(document.getElementById('adminPassword').value === 'simrj') { isGestor = true; openAdminOrLogin(); closeLogin(); } else alert('Senha Incorreta'); }
window.logoutGestor = function() { isGestor = false; minimizarPainelGestor(); applyFilters(); alert('Sessão encerrada.'); }

window.renderVisibilityList = function() {
    const term = normalizeString(document.getElementById('searchVisibility')?.value || '');
    const list = document.getElementById('visibility-list'); if(!list) return;
    list.innerHTML = '';
    
    document.getElementById('gestaoCount').innerText = museumsData.length;

    museumsData.forEach(m => {
        if(term && !normalizeString(m.nome).includes(term)) return;
        let bgClass = m.visivel ? "bg-white border shadow-sm" : "item-hidden";
        list.innerHTML += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-3 rounded ${bgClass}">
                <div><h6 class="fw-bold mb-0 text-primary">${m.nome}</h6><small class="text-dark">${m.municipio} | <b>Edições no Histórico: ${m.history ? m.history.length : 0}</b></small></div>
                <button class="btn btn-sm btn-primary fw-bold px-3" onclick="openGestorEdit(${m.id})"><i class="bi bi-pencil-square"></i> Editar Ficha</button>
            </div>
        `;
    });
}

// Gera os campos editáveis dinamicamente
window.openGestorEdit = function(id) {
    editingMuseumId = id;
    const m = museumsData.find(x => x.id === id); if(!m) return;
    document.getElementById('gestorEditTitle').innerText = m.nome;
    document.getElementById('gestorMuseumVisible').checked = !m.visivel; // Se visivel=true, checkbox "Invisível" = false
    document.getElementById('gestorAuthor').value = ""; // Reseta o nome do autor

    const fields = [
        { id: 'nome', label: 'Nome da Instituição' }, { id: 'municipio', label: 'Município' },
        { id: 'regiao', label: 'Região' }, { id: 'endereco', label: 'Endereço Completo' },
        { id: 'natureza', label: 'Natureza Administrativa' }, { id: 'situacao', label: 'Situação' },
        { id: 'telefone', label: 'Telefone' }, { id: 'site', label: 'Site / Redes' },
        { id: 'acervo', label: 'Acervo Predominante' }, { id: 'ingresso', label: 'Ingresso' }
    ];

    let html = '';
    fields.forEach(f => {
        let isHidden = m.hidden_fields && m.hidden_fields[f.id];
        html += `
            <div class="col-md-6 border-bottom pb-2">
                <div class="d-flex justify-content-between">
                    <label class="fw-bold text-primary small">${f.label}</label>
                    <div class="form-check form-switch"><input class="form-check-input check-vis" type="checkbox" id="vis_${f.id}" ${!isHidden ? 'checked' : ''}> <small class="text-muted" style="font-size:0.7rem;">Visível</small></div>
                </div>
                <input type="text" class="form-control form-control-sm edit-val" id="edit_${f.id}" value="${m[f.id] || ''}">
            </div>
        `;
    });
    document.getElementById('gestorEditFields').innerHTML = html;

    // Histórico
    let hLog = document.getElementById('gestorHistoryLog');
    hLog.innerHTML = m.history && m.history.length > 0 ? m.history.map(h => `> [${h.date}] Atualizado por: <b>${h.user}</b>`).join('<br>') : '> Nenhum histórico de edição registrado.';
    
    editModal.show();
}

window.saveGestorEdits = function() {
    const author = document.getElementById('gestorAuthor').value.trim();
    if(!author || author.length < 3) return alert("Erro: O nome do Responsável pela atualização é obrigatório para manter o histórico.");

    const mIndex = museumsData.findIndex(x => x.id === editingMuseumId); if(mIndex === -1) return;
    let m = museumsData[mIndex];

    // Salva os valores digitados e a visibilidade dos campos
    m.hidden_fields = {};
    const fields = ['nome', 'municipio', 'regiao', 'endereco', 'natureza', 'situacao', 'telefone', 'site', 'acervo', 'ingresso'];
    fields.forEach(f => {
        m[f] = document.getElementById(`edit_${f}`).value;
        if(!document.getElementById(`vis_${f}`).checked) m.hidden_fields[f] = true;
    });

    // Salva a visibilidade geral do museu
    m.visivel = !document.getElementById('gestorMuseumVisible').checked;

    // Registra no histórico
    if(!m.history) m.history = [];
    let dateStr = new Date().toLocaleString('pt-BR');
    m.history.push({ date: dateStr, user: author });

    // Salva na memória do navegador para não perder quando der F5
    localEditsMemory[m.nome] = m;
    localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory));

    applyFilters();
    editModal.hide();
    alert("Ficha atualizada e histórico registrado com sucesso!");
}

// =====================================================================
// SEM GEOLOCALIZAÇÃO E MAPA ADMIN
// =====================================================================
function updatePendingList() {
    const list = document.getElementById('pending-list'); if(!list) return; list.innerHTML = '';
    const pendings = museumsData.filter(m => !m.lat || !m.lng); 
    document.getElementById('pendingCount').innerText = pendings.length;
    pendings.forEach(m => { 
        list.innerHTML += `<div class="p-3 mb-2 bg-white border shadow-sm d-flex justify-content-between align-items-center"><div><strong class="text-danger">${m.nome}</strong><br><small>${m.municipio}</small></div><button class="btn btn-sm btn-warning fw-bold" onclick="openAdminMapPicker(${m.id})">Marcar no Mapa</button></div>`; 
    });
}

let adminMapInstance, adminTempMarker;
window.openAdminMapPicker = function(id) {
    editingMuseumId = id;
    new bootstrap.Modal(document.getElementById('adminMapModal')).show();
    setTimeout(() => {
        if (!adminMapInstance) { 
            adminMapInstance = L.map('adminLeafletMap').setView([-22.9068, -43.1729], 8);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(adminMapInstance);
            adminMapInstance.on('click', e => { 
                if (adminTempMarker) adminMapInstance.removeLayer(adminTempMarker); 
                adminTempMarker = L.marker(e.latlng).addTo(adminMapInstance); 
            }); 
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

// =====================================================================
// CADASTRO MANUAL E INTEGRAÇÃO DO ROBÔ
// =====================================================================
window.saveManualGestor = function() {
    const nome = document.getElementById('manNome').value;
    if(!nome) return alert("O Nome é obrigatório.");
    let newM = {
        id: Date.now(), nome: nome, municipio: document.getElementById('manMuni').value,
        endereco: document.getElementById('manEnd').value, natureza: document.getElementById('manNat').value,
        situacao: document.getElementById('manSit').value, 
        lat: parseCoordinate(document.getElementById('manLat').value), 
        lng: parseCoordinate(document.getElementById('manLng').value),
        visivel: true, hidden_fields: {}, history: [{ date: new Date().toLocaleString('pt-BR'), user: "Cadastro Manual (Gestor)" }]
    };
    museumsData.push(newM);
    localEditsMemory[nome] = newM; localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory));
    applyFilters();
    alert("Museu cadastrado com sucesso!");
    document.querySelectorAll('#formManualGestor input').forEach(el => el.value = '');
}

// O ROBÔ
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
                            row["Lat"] = d[0].lat; row["Lng"] = d[0].lon; log(`   -> OK!`);
                        } else log(`   -> Falhou.`);
                    } catch(e) { log(`   -> Erro API.`); }
                    await sleep(1100);
                }
                document.getElementById('robotProgressBar').style.width = `${Math.round(((i+1)/data.length)*100)}%`;
            }
            log(`Concluído! Baixando CSV...`);
            let csv = Papa.unparse(data);
            let blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' });
            let link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "dados_geocodificados.csv"; link.click();
            document.getElementById('btnRobot').disabled = false;
        }
    });
}