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
let profileModal;

// LISTA COMPLETA 92 MUNICÍPIOS RJ (Para o filtro sempre ter todos)
const allMunicipalitiesRJ = [
    "Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios", "Arraial do Cabo", 
    "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim", "Bom Jesus do Itabapoana", 
    "Cabo Frio", "Cachoeiras de Macacu", "Cambuci", "Campos dos Goytacazes", "Cantagalo", 
    "Carapebus", "Cardoso Moreira", "Carmo", "Casimiro de Abreu", "Comendador Levy Gasparian", 
    "Conceição de Macabu", "Cordeiro", "Duas Barras", "Duque de Caxias", "Engenheiro Paulo de Frontin", 
    "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara", "Itaperuna", 
    "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco", "Magé", "Mangaratiba", "Maricá", 
    "Mendes", "Mesquita", "Miguel Pereira", "Miracema", "Natividade", "Nilópolis", "Niterói", 
    "Nova Friburgo", "Nova Iguaçu", "Paracambi", "Paraíba do Sul", "Paraty", "Paty do Alferes", 
    "Petrópolis", "Pinheiral", "Piraí", "Porciúncula", "Porto Real", "Quatis", "Queimados", 
    "Quissamã", "Resende", "Rio Bonito", "Rio das Flores", "Rio das Ostras", "Rio de Janeiro", 
    "Rio Claro", "Santa Maria Madalena", "Santo Antônio de Pádua", "São Fidélis", "São Francisco de Itabapoana", 
    "São Gonçalo", "São João da Barra", "São João de Meriti", "São José de Ubá", "São José do Vale do Rio Preto", 
    "São Pedro da Aldeia", "São Sebastião do Alto", "Sapucaia", "Saquarema", "Seropédica", "Silva Jardim", 
    "Sumidouro", "Tanguá", "Teresópolis", "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai", 
    "Vassouras", "Volta Redonda"
];

// COORDENADAS (Fallback para mapear cidades sem Lat/Long exata)
const cityCoords = {
    "Rio de Janeiro": [-22.9068, -43.1729], "Petrópolis": [-22.5050, -43.1788],
    "Niterói": [-22.8859, -43.1152], "Cabo Frio": [-22.8869, -42.0266],
    "Campos dos Goytacazes": [-21.7618, -41.3239], "Duque de Caxias": [-22.7915, -43.3005],
    "Nova Friburgo": [-22.2887, -42.5341], "Paraty": [-23.2198, -44.7175],
    "Vassouras": [-22.4042, -43.6631], "Volta Redonda": [-22.5202, -44.1033],
    "Angra dos Reis": [-23.0067, -44.3181], "Teresópolis": [-22.4123, -42.9664],
    "Macaé": [-22.3708, -41.7869], "Itaperuna": [-21.2057, -41.8888]
    // O sistema funciona sem todas aqui, mas para o protótipo adicionei as principais.
};

// --- 3. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', function() {
    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    populateCitySelects(); // Preenche filtros e form manual com 92 cidades
    init();
});

function init() {
    // Dados de exemplo caso não tenha CSV
    if(museumsData.length === 0) {
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
    renderMuseums(museumsData);
}

// Preenche Selects com os 92 Municípios
function populateCitySelects() {
    const filterSelect = document.getElementById('filterMunicipio');
    const manualSelect = document.getElementById('mMunicipio');
    
    // Limpa e Adiciona default
    filterSelect.innerHTML = '<option value="">Todos os 92 Municípios</option>';
    manualSelect.innerHTML = '<option value="">Selecione...</option>';
    
    allMunicipalitiesRJ.sort().forEach(city => {
        // No filtro
        const opt1 = document.createElement('option');
        opt1.value = city; opt1.innerText = city;
        filterSelect.appendChild(opt1);

        // No form manual
        const opt2 = document.createElement('option');
        opt2.value = city; opt2.innerText = city;
        manualSelect.appendChild(opt2);
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
        const card = document.createElement('div');
        card.className = 'col-md-6 mb-3';
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

        // Mapa
        let lat = museum.lat;
        let lng = museum.lng;

        if (!lat && cityCoords[museum.municipio]) {
            lat = cityCoords[museum.municipio][0] + (Math.random() - 0.5) * 0.015;
            lng = cityCoords[museum.municipio][1] + (Math.random() - 0.5) * 0.015;
        }

        if (lat && lng) {
            L.marker([lat, lng], {icon: museumIcon})
                .bindPopup(`<b>${museum.nome}</b><br>${museum.endereco}<br><a href="#" onclick="openProfile(${museum.id})">Ver detalhes</a>`)
                .addTo(markersLayer);
        }
    });
}

// --- 5. FILTROS ---
function getCheckedValues(className) {
    return Array.from(document.querySelectorAll('.' + className + ':checked')).map(cb => cb.value);
}

function applyFilters() {
    const term = document.getElementById('searchName').value.toLowerCase();
    const selectedMuni = document.getElementById('filterMunicipio').value;
    const regions = getCheckedValues('filter-region');
    const acervos = getCheckedValues('filter-acervo');
    const statusList = getCheckedValues('filter-status');
    const funcTerms = getCheckedValues('filter-func'); // Dias/Turnos
    const costs = getCheckedValues('filter-cost');
    
    const reqMuseologo = document.getElementById('checkMuseologo').checked;
    const reqEdu = document.getElementById('checkEdu').checked;
    const textGratuidade = document.getElementById('searchGratuidade').value.toLowerCase();
    const textAccess = document.getElementById('searchAccess').value.toLowerCase();

    const filtered = museumsData.filter(m => {
        if (!m.nome.toLowerCase().includes(term)) return false;
        if (selectedMuni && m.municipio !== selectedMuni) return false;
        if (regions.length > 0 && !regions.includes(m.regiao)) return false;
        if (acervos.length > 0 && !acervos.includes(m.acervo)) return false;
        if (statusList.length > 0 && !statusList.includes(m.situacao)) return false;
        if (costs.length > 0 && !costs.includes(m.ingresso)) return false;

        // Funcionamento Inteligente (Procura palavras chave)
        if (funcTerms.length > 0) {
            const funcText = (m.funcionamento || "").toLowerCase();
            const match = funcTerms.some(t => funcText.includes(t.toLowerCase()));
            if (!match) return false;
        }

        if (reqMuseologo && m.museologo !== "Sim") return false;
        if (reqEdu && m.educativo !== "Sim") return false;
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

// --- 6. PERFIL COMPLETO ---
function openProfile(id) {
    const m = museumsData.find(x => x.id === id);
    if(!m) return;
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

// --- 7. ADMINISTRAÇÃO ---
function openLogin() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
}
function closeLogin() { document.getElementById('login-overlay').style.display = 'none'; }
function checkAdminPassword() {
    if(document.getElementById('adminPassword').value === 'simrj') {
        isAdmin = true;
        document.getElementById('admin-panel').style.display = 'block';
        closeLogin();
        document.getElementById('admin-panel').scrollIntoView({behavior: 'smooth'});
    } else { alert('Senha incorreta.'); }
}
function closeAdmin() {
    isAdmin = false;
    document.getElementById('admin-panel').style.display = 'none';
}

// --- 8. PROCESSAMENTO DE DADOS ---
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: function(results) { processCSVData(results.data); }
    });
});

function processCSVData(rawData) {
    let cleanData = [];
    rawData.forEach((row, index) => {
        const nome = row["Nome da Instituição"];
        if (!nome) return;

        cleanData.push({
            id: index + 2000,
            nome: nome,
            municipio: row["Município"] || "Não informado",
            regiao: row["Região"] || "Outra",
            natureza: row["Natureza Administrativa"] || "Privada",
            situacao: row["Situação"] || "Aberto",
            endereco: row["Endereço"] || "Endereço não informado",
            funcionamento: row["Funcionamento"] || "",
            ingresso: row["Valor do Ingresso"] || "Não informado",
            gratuidades: row["Gratuidades"] || "",
            educativo: row["Setor Educativo"] || "Não",
            acervo: row["Acervo Predominante"] || "Outros",
            museologo: row["Museólogo"] || "Não",
            acessibilidade: row["Acessibilidade"] || "",
            historico: row["Histórico"] || "",
            lat: null, lng: null
        });
    });
    museumsData = cleanData;
    renderMuseums(museumsData);
    
    const statusBox = document.getElementById('upload-status');
    statusBox.className = 'alert alert-success small p-2 d-block';
    statusBox.innerText = `${cleanData.length} carregados com sucesso.`;
}

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
        acervo: document.getElementById('mAcervo').value,
        museologo: document.getElementById('mMuseologo').value,
        ingresso: document.getElementById('mIngresso').value || "Não informado",
        funcionamento: "Inserido manualmente", gratuidades: "", educativo: "Não", acessibilidade: "", historico: "", lat: null, lng: null
    };
    museumsData.push(novo);
    renderMuseums(museumsData);
    alert('Cadastrado com sucesso!');
    document.getElementById('manualForm').reset();
}