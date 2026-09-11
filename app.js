// --- VARIÁVEIS GLOBAIS ---
let map;
let markersArray = [];
let museumsData = []; // Banco de dados carregado na memória
let currentFilteredData = [];
let profileModal;
let isGestor = false;

// =====================================================================
// 1. INICIALIZAÇÃO DA APLICAÇÃO (Pré-carregamento)
// =====================================================================
document.addEventListener('DOMContentLoaded', async function() {
    initMapSystem();
    await loadInitialCSVData(); // Carrega os dados silenciosamente ao entrar no site
});

function initMapSystem() {
    // Inicializa o mapa vazio na Div
    document.getElementById('map').innerHTML = ""; 
    map = L.map('map').setView([-22.9068, -43.1729], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
}

const normalizeString = (str) => { if(!str) return ""; return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// =====================================================================
// 2. PRÉ-CARREGAMENTO VIA ARQUIVO LOCAL (dados.csv)
// =====================================================================
// COMO FUNCIONA: O sistema tenta ler um arquivo "dados.csv" na pasta raiz do site.
// Isso elimina a necessidade de banco de dados neste momento do MVP.
async function loadInitialCSVData() {
    try {
        const response = await fetch('dados.csv');
        if (!response.ok) throw new Error("Arquivo não encontrado");
        
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: async function(results) {
                // Processa false (não é uma importação de atualização manual do gestor)
                await processParsedData(results.data, false);
            }
        });
    } catch(e) {
        console.warn("Aviso: 'dados.csv' não foi encontrado na raiz do site. O mapa iniciará vazio. Use o Painel do Gestor para importar dados manualmente.");
    }
}

// Lógica inteligente de processamento da Planilha (Cria ou Atualiza)
async function processParsedData(rawData, isUpdateFromManager) {
    let statEl = document.getElementById('upload-status');
    if (isUpdateFromManager && statEl) {
        statEl.classList.remove('d-none');
        statEl.innerText = "Processando atualização da base de dados...";
    }

    for (let i = 0; i < rawData.length; i++) {
        let row = rawData[i];
        let nome = row["Nome da Instituição"] || row["Nome"];
        if (!nome) continue;

        // Verifica se o museu já existe na base pela similaridade do nome
        let existingIndex = museumsData.findIndex(m => normalizeString(m.nome) === normalizeString(nome));

        // Tenta capturar a Latitude e Longitude se já vierem escritas na planilha
        let lat = parseFloat(row["Lat"] || row["Latitude"] || row["lat"]);
        let lng = parseFloat(row["Lng"] || row["Longitude"] || row["lon"] || row["lng"]);
        
        // Blindagem: se as coordenadas não vierem na planilha e for uma importação do gestor, tenta geolocalizar (Atenção: muito lento para planilhas grandes)
        if ((isNaN(lat) || isNaN(lng)) && isUpdateFromManager) {
            let coords = await geocodeAddressNominatim(row["Endereço"], "", row["Município"], row["CEP"]);
            if (coords) { lat = coords.lat; lng = coords.lng; }
            await sleep(1100); // Pausa obrigatória para não bloquear a API Nominatim
        }

        // Constrói o objeto do museu
        let museumObj = {
            id: existingIndex !== -1 ? museumsData[existingIndex].id : Date.now() + i, // Mantém ID original se for atualização
            id_cfm: row["Nº CFM"] || row["ID"], 
            nome: nome, 
            municipio: row["Município"] || row["Municipio"] || "Não informado", 
            regiao: row["Região"] || row["Regiao"] || "Não informada", 
            natureza: row["Natureza Administrativa do Museu"] || row["Natureza Administrativa"] || "Privada", 
            situacao: row["Situação"] || row["Situacao"] || row["Status"] || "Desconhecido", 
            endereco: row["Endereço"] || row["Endereco"],
            acervo: row["Acervo Predominante"] || row["Acervo"],
            ingresso: row["Valor ingresso"] || row["Ingresso"],
            funcionamento: row["Funcionamento"] || row["Horário"],
            museologo: row["Museólogo"] || row["Museologo"],
            educativo: row["Setor Educativo"] || row["Educativo"],
            lat: isNaN(lat) ? null : lat, 
            lng: isNaN(lng) ? null : lng,
            visivel: existingIndex !== -1 ? museumsData[existingIndex].visivel : true // Por padrão, tudo que entra é visível ao público
        };

        if (existingIndex !== -1 && isUpdateFromManager) {
            museumsData[existingIndex] = museumObj; // ATUALIZA O REGISTRO
        } else if (existingIndex === -1) {
            museumsData.push(museumObj); // CRIA NOVO REGISTRO
        }
    }

    populateCityFilter(); // Alimenta o filtro de município do front-end com os dados reais lidos
    applyFilters(); // Renderiza o mapa respeitando a visibilidade
    
    if (isUpdateFromManager && statEl) {
        statEl.className = 'alert alert-success small p-2 d-block w-50 mt-2';
        statEl.innerText = "Base atualizada com sucesso!";
    }
}

// Popular o Select de Municípios dinamicamente para não ter opções vazias
function populateCityFilter() {
    const select = document.getElementById('filterMunicipio');
    if(!select) return;
    select.innerHTML = '<option value="">Todos os Municípios</option>';
    const cities = [...new Set(museumsData.map(m => m.municipio).filter(Boolean))].sort();
    cities.forEach(city => {
        select.innerHTML += `<option value="${city}">${city}</option>`;
    });
}

// =====================================================================
// 3. RENDERIZAÇÃO, BLINDAGEM DE FILTROS E LISTA DE VISIBILIDADE
// =====================================================================
function applyFilters() {
    // Coleta todos os parâmetros dos selects e inputs
    const termo = normalizeString(document.getElementById('searchName')?.value || '');
    const filterMuni = normalizeString(document.getElementById('filterMunicipio')?.value || '');
    const filterRegiao = normalizeString(document.getElementById('filterRegiao')?.value || '');
    const filterNat = normalizeString(document.getElementById('filterNatureza')?.value || '');

    // Filtra a matriz mestra para criar a currentFilteredData
    currentFilteredData = museumsData.filter(m => {
        // REGRA DE OURO DA VISIBILIDADE: Se estiver oculto e o usuário não for o gestor na aba admin, não mostra!
        if (!m.visivel && !isGestor) return false;

        let match = true;
        if (termo && !normalizeString(m.nome).includes(termo)) match = false;
        if (filterMuni && normalizeString(m.municipio) !== filterMuni) match = false;
        if (filterRegiao && !normalizeString(m.regiao).includes(filterRegiao)) match = false;
        if (filterNat && !normalizeString(m.natureza).includes(filterNat)) match = false;
        
        return match;
    });

    renderMuseums(currentFilteredData);
    if(isGestor) {
        renderVisibilityList();
        updatePendingList();
    }
}

function resetFilters() {
    document.querySelectorAll('.sidebar-filters input, .sidebar-filters select').forEach(el => el.value = '');
    applyFilters();
}

// Renderiza Mapa e Tabela Pública
function renderMuseums(data) {
    markersArray.forEach(m => map.removeLayer(m)); markersArray = [];
    
    // Filtra novamente só por segurança para garantir que itens ocultos não gerem pino
    let dataParaPinos = data.filter(m => m.visivel);

    document.getElementById('count-total').innerText = dataParaPinos.length;

    let tableHTML = `<div class="table-responsive"><table class="table table-hover table-bordered align-middle"><thead class="table-dark"><tr><th>Instituição</th><th>Município</th><th>Situação</th><th></th></tr></thead><tbody>`;

    dataParaPinos.forEach(museum => {
        // Estilo do Badge
        let badgeClass = 'bg-secondary';
        let situacaoLower = normalizeString(museum.situacao);
        if(situacaoLower.includes('aberto')) badgeClass = 'bg-success';
        else if(situacaoLower.includes('desativado') || situacaoLower.includes('fechado')) badgeClass = 'bg-danger';

        tableHTML += `<tr class="tr-lista-item">
            <td class="fw-bold">${museum.nome}</td>
            <td>${museum.municipio}</td>
            <td><span class="badge ${badgeClass}">${museum.situacao}</span></td>
            <td><button class="btn btn-sm btn-outline-primary" onclick="openProfile(${museum.id})">Ficha</button></td>
        </tr>`;

        if (museum.lat && museum.lng) {
            const marker = L.marker([museum.lat, museum.lng]).addTo(map);
            marker.bindPopup(`
                <div style="padding: 5px; text-align:center;">
                    <h6 class="fw-bold text-primary mb-1">${museum.nome}</h6>
                    <small class="d-block mb-2 text-muted">${museum.municipio}</small>
                    <button class="btn btn-sm btn-warning w-100 fw-bold" onclick="openProfile(${museum.id})">Acessar Ficha</button>
                </div>
            `);
            markersArray.push(marker);
        }
    });

    tableHTML += `</tbody></table></div>`;
    const tableContainer = document.getElementById('container-lista-museus');
    if(tableContainer) tableContainer.innerHTML = tableHTML;
}

// Permite buscar apenas texto na aba Lista, sem alterar o mapa
window.filterListaTexto = function() {
    let input = normalizeString(document.getElementById('searchLista').value);
    let rows = document.querySelectorAll('.tr-lista-item');
    rows.forEach(row => { row.style.display = normalizeString(row.innerText).includes(input) ? '' : 'none'; });
}

// =====================================================================
// 4. PAINEL GESTOR (LOGIN E VISIBILIDADE)
// =====================================================================
window.openAdminOrLogin = function() {
    if(isGestor) {
        document.getElementById('admin-panel').style.display = 'block';
        applyFilters(); // Garante atualização das listas internas
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
    }
}
window.closeLogin = function() { document.getElementById('login-overlay').style.display = 'none'; }
window.minimizarPainelGestor = function() { document.getElementById('admin-panel').style.display = 'none'; }

window.checkAdminPassword = function() {
    if(document.getElementById('adminPassword').value === 'simrj') { 
        isGestor = true;
        document.getElementById('admin-panel').style.display = 'block'; 
        closeLogin(); 
        applyFilters(); // Força as listas internas a carregar
        document.querySelectorAll('.gestor-only').forEach(el => el.classList.remove('d-none'));
        document.querySelectorAll('.gestor-visible').forEach(el => el.classList.add('d-block'));
    } else alert('Senha incorreta. (Dica: tente "simrj")');
}

window.logoutGestor = function() {
    isGestor = false;
    minimizarPainelGestor();
    document.querySelectorAll('.gestor-only').forEach(el => el.classList.add('d-none'));
    document.querySelectorAll('.gestor-visible').forEach(el => el.classList.remove('d-block'));
    applyFilters(); // Remove os itens ocultos da visualização pública imediatamente
    alert('Sessão administrativa encerrada.');
}

// Importação CSV via Gestor (Chama o ProcessParsedData forçando UPDATE)
document.getElementById('csvFile').addEventListener('change', async function(e) {
    const file = e.target.files[0]; if (!file) return;
    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) { await processParsedData(results.data, true); }
    });
});

// Renderização da lista de controle de visibilidade (Aba do Gestor)
window.renderVisibilityList = function() {
    const term = normalizeString(document.getElementById('searchVisibility')?.value || '');
    const list = document.getElementById('visibility-list');
    if(!list) return;
    
    list.innerHTML = '';
    museumsData.forEach(m => {
        if(term && !normalizeString(m.nome).includes(term)) return; // Filtro de texto da própria aba
        
        let bgClass = m.visivel ? "" : "item-hidden";
        let btnText = m.visivel ? '<i class="bi bi-eye-slash"></i> Ocultar' : '<i class="bi bi-eye"></i> Exibir';
        let btnClass = m.visivel ? 'btn-danger' : 'btn-success';

        list.innerHTML += `
            <div class="pending-item d-flex justify-content-between align-items-center ${bgClass} border shadow-sm mb-2 p-2">
                <div>
                    <h6 class="fw-bold mb-0">${m.nome}</h6>
                    <small class="text-muted">${m.municipio}</small>
                </div>
                <button class="btn btn-sm ${btnClass} fw-bold" onclick="toggleVisibility(${m.id})">${btnText}</button>
            </div>
        `;
    });
}

// Altera o estado (visivel true/false) e re-renderiza tudo
window.toggleVisibility = function(id) {
    const m = museumsData.find(x => x.id === id);
    if(m) {
        m.visivel = !m.visivel;
        applyFilters(); // Atualiza mapa e lista pública
    }
}

// =====================================================================
// 5. NAVEGAÇÃO DE ABAS E MODAIS
// =====================================================================
window.switchView = function(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';
    if(viewId === 'home' && map) { setTimeout(() => { map.invalidateSize(); }, 200); }
}
window.showPlaceholder = function(titleText) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById('view-em-construcao').style.display = 'block';
    document.getElementById('construcao-title').innerText = titleText;
}

window.openProfile = function(id) {
    const m = museumsData.find(x => x.id === id); if(!m) return;
    const val = (v) => (v && v.trim() !== '') ? v : '<span class="text-muted fst-italic">Não informado</span>';

    document.getElementById('modalTitle').innerText = m.nome;
    document.getElementById('modalEndereco').innerHTML = val(m.endereco);
    document.getElementById('modalMunicipio').innerHTML = val(m.municipio);
    document.getElementById('modalRegiao').innerHTML = val(m.regiao);
    document.getElementById('modalNatureza').innerHTML = val(m.natureza);
    
    // Cor do Status Modal
    let badgeClass = 'bg-secondary';
    let situacaoLower = normalizeString(m.situacao);
    if(situacaoLower.includes('aberto')) badgeClass = 'bg-success';
    else if(situacaoLower.includes('fechado') || situacaoLower.includes('desativado')) badgeClass = 'bg-danger';
    
    const elStatus = document.getElementById('modalStatus');
    elStatus.innerHTML = val(m.situacao);
    elStatus.className = `badge ${badgeClass}`;

    document.getElementById('modalFunc').innerHTML = val(m.funcionamento);
    document.getElementById('modalIngresso').innerHTML = val(m.ingresso);
    document.getElementById('modalAcervo').innerHTML = val(m.acervo);
    
    // Alerta de Pino
    if (!m.lat || !m.lng) document.getElementById('modalAlertPin').classList.remove('d-none'); 
    else document.getElementById('modalAlertPin').classList.add('d-none');

    profileModal.show();
}

// =====================================================================
// 6. MAPEAR MANUALMENTE (MÓDULO GESTOR) E UTILITÁRIOS
// =====================================================================
window.geocodeAddressNominatim = async function(logradouro, numero, municipio, cep) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(logradouro + ", " + municipio + ", RJ")}&limit=1`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return (data && data.length > 0) ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
    } catch (e) { return null; }
}

function updatePendingList() {
    const list = document.getElementById('pending-list'); if(!list) return; list.innerHTML = '';
    const pendings = museumsData.filter(m => !m.lat || !m.lng); // Acha quem não tem pino
    document.getElementById('pendingCount').innerText = pendings.length;
    pendings.forEach(m => { 
        list.innerHTML += `<div class="pending-item d-flex justify-content-between align-items-center border shadow-sm mb-2 p-2 bg-white"><div><strong>${m.nome}</strong><br><small>${m.municipio}</small></div><button class="btn btn-sm btn-warning fw-bold" onclick="openAdminMapPicker(${m.id})">Forçar Pino</button></div>`; 
    });
}

let adminMapInstance, adminTempMarker;
window.openAdminMapPicker = function(id) {
    const m = museumsData.find(x => x.id === id); if(!m) return;
    currentMappingId = id; 
    document.getElementById('adminMapTitle').innerText = m.nome;
    document.getElementById('adminMapSearchInput').value = `${m.endereco || ''} ${m.municipio || ''}, RJ`;
    
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

window.searchAddressOnAdminMap = async function() {
    const query = document.getElementById('adminMapSearchInput').value;
    let coords = await geocodeAddressNominatim(query, "", "", "");
    if (coords) {
        const latlng = [coords.lat, coords.lon];
        adminMapInstance.setView(latlng, 17);
        if (adminTempMarker) adminMapInstance.removeLayer(adminTempMarker); 
        adminTempMarker = L.marker(latlng).addTo(adminMapInstance);
    } else alert("O Nominatim não achou. Navegue no mapa e clique manualmente no local exato da rua.");
}

window.saveAdminPin = function() {
    if (!adminTempMarker) return alert("Clique no mapa antes de salvar.");
    const m = museumsData.find(x => x.id === currentMappingId);
    if(m) { 
        m.lat = adminTempMarker.getLatLng().lat; 
        m.lng = adminTempMarker.getLatLng().lng; 
        applyFilters(); // Atualiza tudo imediatamente
        bootstrap.Modal.getInstance(document.getElementById('adminMapModal')).hide(); 
    }
}