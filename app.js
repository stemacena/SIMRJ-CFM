// --- 1. CONFIGURAÇÃO DO MAPA ---
const map = L.map('map').setView([-22.9068, -43.1729], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

const museumIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30]
});

let markersLayer = L.layerGroup().addTo(map);
let museumsData = [];
// Variável de controle do Admin
let isAdmin = false;

// Modal Bootstrap
let profileModal;

// --- 2. BASE DE COORDENADAS (Fallback) ---
// Como não temos Lat/Long, usamos o centro do município.
// Adicionei mais municípios para cobrir as regiões.
const cityCoords = {
    "Rio de Janeiro": [-22.9068, -43.1729], "Petrópolis": [-22.5050, -43.1788],
    "Niterói": [-22.8859, -43.1152], "Cabo Frio": [-22.8869, -42.0266],
    "Campos dos Goytacazes": [-21.7618, -41.3239], "Duque de Caxias": [-22.7915, -43.3005],
    "Nova Friburgo": [-22.2887, -42.5341], "Paraty": [-23.2198, -44.7175],
    "Vassouras": [-22.4042, -43.6631], "Volta Redonda": [-22.5202, -44.1033],
    "Angra dos Reis": [-23.0067, -44.3181], "Teresópolis": [-22.4123, -42.9664],
    "Macaé": [-22.3708, -41.7869], "Itaperuna": [-21.2057, -41.8888]
};

// --- 3. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', function() {
    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    init();
});

function init() {
    if(museumsData.length === 0) {
        // Exemplo fictício para o site não abrir vazio
        museumsData = [{
            id: 0, nome: "Exemplo: Faça Upload da Planilha", municipio: "Rio de Janeiro",
            regiao: "Metropolitana I", natureza: "Estadual", situacao: "Aberto",
            endereco: "Rua do Catete, 153", funcionamento: "Terça a Domingo",
            ingresso: "Gratuito", gratuidades: "Todas", educativo: "Sim",
            acervo: "Histórico", museologo: "Sim", acessibilidade: "Rampas e elevadores",
            historico: "Use o painel de gestor para carregar os dados reais.",
            lat: -22.9258, lng: -43.1763
        }];
    }
    populateCitySelect();
    renderMuseums(museumsData);
}

// Preenche o filtro de municípios dinamicamente com base nos dados
function populateCitySelect() {
    const select = document.getElementById('filterMunicipio');
    // Pega cidades únicas e ordena
    const cities = [...new Set(museumsData.map(m => m.municipio))].sort();
    
    // Mantém a primeira opção "Todos"
    select.innerHTML = '<option value="">Todos os Municípios</option>';
    
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.innerText = city;
        select.appendChild(option);
    });
}

// --- 4. RENDERIZAÇÃO ---
function renderMuseums(data) {
    const listContainer = document.getElementById('museum-list');
    listContainer.innerHTML = '';
    markersLayer.clearLayers();
    document.getElementById('resultCount').innerText = data.length;
    document.getElementById('count-total').innerText = museumsData.length;

    data.forEach(museum => {
        // 1. Cria Card HTML
        const card = document.createElement('div');
        card.className = 'col-md-6 mb-3';
        
        // Verifica se tem museólogo e educativo para badges
        const hasMus = museum.museologo === "Sim";
        
        card.innerHTML = `
            <div class="card h-100 museum-card bg-white shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-secondary">${museum.regiao}</span>
                        ${hasMus ? '<span class="badge bg-info text-dark" title="Possui Museólogo"><i class="bi bi-person-badge"></i></span>' : ''}
                    </div>
                    <h5 class="card-title text-dark fw-bold">${museum.nome}</h5>
                    <p class="card-text small text-muted mb-1"><i class="bi bi-geo-alt-fill"></i> ${museum.municipio}</p>
                    <p class="card-text small mb-1"><strong>Endereço:</strong> ${museum.endereco}</p>
                    <div class="d-flex justify-content-between mt-3">
                        <small class="text-success fw-bold">${museum.situacao}</small>
                        <button class="btn btn-sm btn-outline-primary" onclick="openProfile(${museum.id})">Ver Ficha Completa</button>
                    </div>
                </div>
            </div>`;
        listContainer.appendChild(card);

        // 2. Cria Pino no Mapa
        let lat = museum.lat;
        let lng = museum.lng;

        // Fallback para cidade se não tiver lat/lng
        if (!lat && cityCoords[museum.municipio]) {
            lat = cityCoords[museum.municipio][0];
            lng = cityCoords[museum.municipio][1];
            // Dispersão aleatória pequena para não sobrepor
            lat += (Math.random() - 0.5) * 0.015;
            lng += (Math.random() - 0.5) * 0.015;
        }

        if (lat && lng) {
            L.marker([lat, lng], {icon: museumIcon})
                .bindPopup(`<b>${museum.nome}</b><br>${museum.endereco}<br><a href="#" onclick="openProfile(${museum.id})">Ver detalhes</a>`)
                .addTo(markersLayer);
        }
    });
}

// --- 5. FILTROS PODEROSOS ---
function getCheckedValues(className) {
    return Array.from(document.querySelectorAll('.' + className + ':checked')).map(cb => cb.value);
}

function applyFilters() {
    // 1. Busca Textual
    const term = document.getElementById('searchName').value.toLowerCase();
    
    // 2. Município (Select)
    const selectedMuni = document.getElementById('filterMunicipio').value;

    // 3. Checkboxes (Multi-select)
    const regions = getCheckedValues('filter-region');
    const natures = getCheckedValues('filter-nature');
    const statusList = getCheckedValues('filter-status');
    const acervos = getCheckedValues('filter-acervo');
    const costs = getCheckedValues('filter-cost');
    const turnos = getCheckedValues('filter-func');

    // 4. Campos Específicos e Descritivos
    const reqMuseologo = document.getElementById('checkMuseologo').checked;
    const reqEdu = document.getElementById('checkEdu').checked;
    
    const textGratuidade = document.getElementById('searchGratuidade').value.toLowerCase();
    const textAccess = document.getElementById('searchAccess').value.toLowerCase();

    // FILTRAGEM
    const filtered = museumsData.filter(m => {
        // Texto Nome
        if (!m.nome.toLowerCase().includes(term)) return false;

        // Município
        if (selectedMuni && m.municipio !== selectedMuni) return false;

        // Listas (Se houver algo marcado, o item DEVE estar na lista)
        if (regions.length > 0 && !regions.includes(m.regiao)) return false;
        if (natures.length > 0 && !natures.includes(m.natureza)) return false;
        if (statusList.length > 0 && !statusList.includes(m.situacao)) return false;
        if (acervos.length > 0 && !acervos.includes(m.acervo)) return false;
        if (costs.length > 0 && !costs.includes(m.ingresso)) return false;

        // Funcionamento (Busca se a string contém "Manhã", "Tarde" etc)
        if (turnos.length > 0) {
            // Verifica se ALGUM dos turnos marcados aparece no texto de funcionamento
            const funcText = (m.funcionamento || "").toLowerCase();
            const hasTurno = turnos.some(t => funcText.includes(t.toLowerCase()));
            if (!hasTurno) return false;
        }

        // Sim/Não
        if (reqMuseologo && m.museologo !== "Sim") return false;
        if (reqEdu && m.educativo !== "Sim") return false;

        // Busca Descritiva (Gratuidade e Acessibilidade)
        if (textGratuidade && !(m.gratuidades || "").toLowerCase().includes(textGratuidade)) return false;
        if (textAccess && !(m.acessibilidade || "").toLowerCase().includes(textAccess)) return false;

        return true;
    });

    renderMuseums(filtered);
}

function resetFilters() {
    document.getElementById('searchName').value = '';
    document.getElementById('filterMunicipio').value = '';
    document.getElementById('searchGratuidade').value = '';
    document.getElementById('searchAccess').value = '';
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    renderMuseums(museumsData);
}

// --- 6. PERFIL COMPLETO (MODAL) ---
function openProfile(id) {
    const m = museumsData.find(x => x.id === id);
    if(!m) return;

    // Função auxiliar para "Não informado"
    const val = (v) => v ? v : '<span class="text-muted fst-italic">Não informado</span>';

    document.getElementById('modalTitle').innerText = m.nome;
    document.getElementById('modalEndereco').innerText = val(m.endereco);
    document.getElementById('modalMunicipio').innerText = val(m.municipio);
    document.getElementById('modalRegiao').innerText = val(m.regiao);
    document.getElementById('modalNatureza').innerText = val(m.natureza);
    document.getElementById('modalStatus').innerText = val(m.situacao);
    
    document.getElementById('modalFunc').innerText = val(m.funcionamento);
    document.getElementById('modalIngresso').innerText = val(m.ingresso);
    document.getElementById('modalGratuidade').innerText = val(m.gratuidades);
    
    document.getElementById('modalMuseologo').innerText = val(m.museologo);
    document.getElementById('modalEducativo').innerText = val(m.educativo);
    document.getElementById('modalAcervo').innerText = val(m.acervo);
    
    document.getElementById('modalAcessibilidade').innerHTML = val(m.acessibilidade);
    document.getElementById('modalHistorico').innerText = val(m.historico);

    profileModal.show();
}

// --- 7. SEGURANÇA E ADMINISTRAÇÃO ---

function openLogin() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
}

function closeLogin() {
    document.getElementById('login-overlay').style.display = 'none';
}

function checkAdminPassword() {
    const pass = document.getElementById('adminPassword').value;
    if(pass === 'simrj') { // Senha protótipo
        isAdmin = true;
        document.getElementById('admin-panel').style.display = 'block';
        closeLogin();
        // Rola até o painel
        document.getElementById('admin-panel').scrollIntoView({behavior: 'smooth'});
    } else {
        alert('Senha incorreta.');
    }
}

function closeAdmin() {
    isAdmin = false; // Logout
    document.getElementById('admin-panel').style.display = 'none';
}

// --- 8. PROCESSAMENTO DE DADOS (CSV e MANUAL) ---

// Upload CSV (Mapeamento EXATO das colunas do usuário)
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            processCSVData(results.data);
        }
    });
});

function processCSVData(rawData) {
    let cleanData = [];
    let errors = 0;

    rawData.forEach((row, index) => {
        // Mapeamento das colunas da planilha para o objeto interno
        const nome = row["Nome da Instituição"];
        
        if (!nome) { errors++; return; } // Pula se não tiver nome

        cleanData.push({
            id: index + 2000,
            nome: nome,
            // Campos Importantes para Filtro
            municipio: row["Município"] || "Não informado",
            regiao: row["Região"] || "Outra",
            natureza: row["Natureza Administrativa"] || "Privada",
            situacao: row["Situação"] || "Aberto",
            endereco: row["Endereço"] || "Endereço não informado", // Fundamental para mapa
            funcionamento: row["Funcionamento"] || "",
            
            // Filtros Específicos
            ingresso: row["Valor do Ingresso"] || "Não informado",
            gratuidades: row["Gratuidades"] || "", // Campo descritivo
            educativo: row["Setor Educativo"] || "Não", // Sim/Não
            acervo: row["Acervo Predominante"] || "Outros",
            museologo: row["Museólogo"] || "Não", // Sim/Não
            acessibilidade: row["Acessibilidade"] || "", // Campo descritivo
            historico: row["Histórico"] || "",
            
            lat: null, lng: null // Será calculado via cityCoords
        });
    });

    museumsData = cleanData;
    populateCitySelect(); // Atualiza o filtro de cidades com as novas do CSV
    renderMuseums(museumsData);

    const statusBox = document.getElementById('upload-status');
    statusBox.className = 'alert alert-success small p-2 d-block';
    statusBox.innerText = `${cleanData.length} instituições carregadas com sucesso.`;
}

// Cadastro Manual (Campos Completos)
function addManualMuseum(e) {
    e.preventDefault();
    
    const novo = {
        id: Date.now(),
        nome: document.getElementById('mNome').value,
        endereco: document.getElementById('mEndereco').value,
        municipio: document.getElementById('mMunicipio').value,
        regiao: document.getElementById('mRegiao').value,
        natureza: document.getElementById('mNatureza').value,
        situacao: document.getElementById('mStatus').value,
        museologo: document.getElementById('mMuseologo').value,
        acervo: document.getElementById('mAcervo').value,
        ingresso: document.getElementById('mIngresso').value || "Não informado",
        educativo: "Não informado", // Simplificado no manual, poderia ter campo
        gratuidades: "Inserido manualmente",
        acessibilidade: "Inserido manualmente",
        historico: "Inserido manualmente",
        funcionamento: "Não informado",
        lat: null, lng: null
    };

    museumsData.push(novo);
    populateCitySelect();
    renderMuseums(museumsData);
    
    alert(`${novo.nome} adicionado com sucesso!`);
    document.getElementById('manualForm').reset();
}