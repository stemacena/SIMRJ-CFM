// --- 1. CONFIGURAÇÃO DO MAPA ---
const map = L.map('map').setView([-22.9068, -43.1729], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

const museumIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30]
});

let markersLayer = L.layerGroup().addTo(map);
let museumsData = [];
let profileModal;

// LISTA DOS 92 MUNICÍPIOS
const allMunicipalitiesRJ = [
    "Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios", "Arraial do Cabo", "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim", "Bom Jesus do Itabapoana", "Cabo Frio", "Cachoeiras de Macacu", "Cambuci", "Campos dos Goytacazes", "Cantagalo", "Carapebus", "Cardoso Moreira", "Carmo", "Casimiro de Abreu", "Comendador Levy Gasparian", "Conceição de Macabu", "Cordeiro", "Duas Barras", "Duque de Caxias", "Engenheiro Paulo de Frontin", "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara", "Itaperuna", "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco", "Magé", "Mangaratiba", "Maricá", "Mendes", "Mesquita", "Miguel Pereira", "Miracema", "Natividade", "Nilópolis", "Niterói", "Nova Friburgo", "Nova Iguaçu", "Paracambi", "Paraíba do Sul", "Paraty", "Paty do Alferes", "Petrópolis", "Pinheiral", "Piraí", "Porciúncula", "Porto Real", "Quatis", "Queimados", "Quissamã", "Resende", "Rio Bonito", "Rio das Flores", "Rio das Ostras", "Rio de Janeiro", "Rio Claro", "Santa Maria Madalena", "Santo Antônio de Pádua", "São Fidélis", "São Francisco de Itabapoana", "São Gonçalo", "São João da Barra", "São João de Meriti", "São José de Ubá", "São José do Vale do Rio Preto", "São Pedro da Aldeia", "São Sebastião do Alto", "Sapucaia", "Saquarema", "Seropédica", "Silva Jardim", "Sumidouro", "Tanguá", "Teresópolis", "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai", "Vassouras", "Volta Redonda"
];

// COORDENADAS BASE (Nomes normalizados sem acento para não dar erro)
const cityCoordsNorm = {
    "rio de janeiro": [-22.9068, -43.1729], "petropolis": [-22.5050, -43.1788],
    "niteroi": [-22.8859, -43.1152], "cabo frio": [-22.8869, -42.0266],
    "campos dos goytacazes": [-21.7618, -41.3239], "duque de caxias": [-22.7915, -43.3005],
    "nova friburgo": [-22.2887, -42.5341], "paraty": [-23.2198, -44.7175],
    "vassouras": [-22.4042, -43.6631], "volta redonda": [-22.5202, -44.1033],
    "angra dos reis": [-23.0067, -44.3181], "teresopolis": [-22.4123, -42.9664],
    "macae": [-22.3708, -41.7869], "itaperuna": [-21.2057, -41.8888]
};
const defaultRjCenter = [-22.9, -43.2]; // Se a cidade não estiver no dicionário acima, joga no meio do estado

// Função para remover acentos e normalizar (Resolve o bug da planilha)
const normalizeString = (str) => {
    if(!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

// --- 2. NAVEGAÇÃO DE TELAS (HOME VS CFM) ---
function switchView(view) {
    document.getElementById('view-home').style.display = view === 'home' ? 'block' : 'none';
    document.getElementById('view-cfm').style.display = view === 'cfm' ? 'block' : 'none';
    
    // Atualiza links do menu visualmente
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    if(view === 'cfm') {
        // Renderiza o mapa corretamente quando sai do display:none
        setTimeout(() => { map.invalidateSize(); }, 200);
    }
}

// --- 3. INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', function() {
    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    populateCitySelects();
    init();
});

function init() {
    if(museumsData.length === 0) {
        museumsData = [{
            id: 0, nome: "Instituição de Exemplo", municipio: "Rio de Janeiro",
            regiao: "Metropolitana I", natureza: "Estadual", situacao: "Aberto",
            endereco: "Faça upload do CSV no Painel do Gestor para ver os dados reais.", funcionamento: "Terça a Domingo",
            ingresso: "Gratuito", gratuidades: "Todas", educativo: "Sim",
            acervo: "Histórico", museologo: "Sim", acessibilidade: "Rampas", historico: ""
        }];
    }
    renderMuseums(museumsData);
}

function populateCitySelects() {
    const filterSelect = document.getElementById('filterMunicipio');
    const manualSelect = document.getElementById('mMunicipio');
    filterSelect.innerHTML = '<option value="">Todos os 92 Municípios</option>';
    manualSelect.innerHTML = '<option value="">Selecione...</option>';
    
    allMunicipalitiesRJ.sort().forEach(city => {
        filterSelect.appendChild(new Option(city, city));
        manualSelect.appendChild(new Option(city, city));
    });
}

// --- 4. RENDERIZAÇÃO E MAPA ---
function renderMuseums(data) {
    const listContainer = document.getElementById('museum-list');
    listContainer.innerHTML = '';
    markersLayer.clearLayers();
    document.getElementById('resultCount').innerText = data.length;
    document.getElementById('count-total').innerText = museumsData.length; // Usa o total real para o banner

    data.forEach(museum => {
        const card = document.createElement('div');
        card.className = 'col-md-6 mb-3';
        const hasMus = museum.museologo === "Sim";
        
        card.innerHTML = `
            <div class="card h-100 museum-card bg-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-secondary">${museum.regiao}</span>
                        ${hasMus ? '<span class="badge bg-info text-dark" title="Possui Museólogo"><i class="bi bi-person-badge"></i></span>' : ''}
                    </div>
                    <h5 class="card-title text-dark fw-bold mb-1" style="font-size: 1.1rem;">${museum.nome}</h5>
                    <p class="card-text small text-muted mb-1"><i class="bi bi-geo-alt-fill text-danger"></i> ${museum.municipio}</p>
                    <div class="d-flex justify-content-between align-items-end mt-3">
                        <small class="text-success fw-bold">${museum.situacao}</small>
                        <button class="btn btn-sm btn-outline-primary" onclick="openProfile(${museum.id})">Detalhes</button>
                    </div>
                </div>
            </div>`;
        listContainer.appendChild(card);

        // LÓGICA DE COORDENADAS (RESOLUÇÃO DO BUG DO PIN)
        let lat = museum.lat;
        let lng = museum.lng;

        if (!lat) {
            let normCity = normalizeString(museum.municipio);
            let coords = cityCoordsNorm[normCity] || defaultRjCenter;
            
            // Dispersão para pinos não ficarem ocultos um sob o outro
            lat = coords[0] + (Math.random() - 0.5) * 0.02;
            lng = coords[1] + (Math.random() - 0.5) * 0.02;
        }

        L.marker([lat, lng], {icon: museumIcon})
            .bindPopup(`<b>${museum.nome}</b><br><small>${museum.endereco}</small><br><a href="#" onclick="openProfile(${museum.id})">Abrir Ficha</a>`)
            .addTo(markersLayer);
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
    const costs = getCheckedValues('filter-cost');
    
    const reqMuseologo = document.getElementById('checkMuseologo').checked;
    const reqEdu = document.getElementById('checkEdu').checked;

    const filtered = museumsData.filter(m => {
        if (!m.nome.toLowerCase().includes(term)) return false;
        if (selectedMuni && m.municipio !== selectedMuni) return false;
        if (regions.length > 0 && !regions.includes(m.regiao)) return false;
        if (acervos.length > 0 && !acervos.includes(m.acervo)) return false;
        if (statusList.length > 0 && !statusList.includes(m.situacao)) return false;
        if (costs.length > 0 && !costs.includes(m.ingresso)) return false;
        if (reqMuseologo && m.museologo !== "Sim") return false;
        if (reqEdu && m.educativo !== "Sim") return false;

        return true;
    });

    renderMuseums(filtered);
}

function resetFilters() {
    document.getElementById('searchName').value = '';
    document.getElementById('filterMunicipio').value = '';
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

// --- 7. ADMINISTRAÇÃO E UPLOAD ---
function openLogin() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
}
function closeLogin() { document.getElementById('login-overlay').style.display = 'none'; }

function checkAdminPassword() {
    if(document.getElementById('adminPassword').value === 'simrj') {
        document.getElementById('admin-panel').style.display = 'block';
        closeLogin();
        document.getElementById('admin-panel').scrollIntoView({behavior: 'smooth'});
    } else { alert('Senha incorreta.'); }
}
function closeAdmin() {
    document.getElementById('admin-panel').style.display = 'none';
}

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
        const nome = row["Nome da Instituição"] || row["Nome"];
        if (!nome) return;

        cleanData.push({
            id: index + 2000,
            nome: nome,
            municipio: row["Município"] || "Não informado",
            regiao: row["Região"] || "Outra",
            natureza: row["Natureza Administrativa"] || "Privada",
            situacao: row["Situação"] || "Aberto",
            endereco: row["Endereço"] || "Não informado",
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
    statusBox.className = 'alert alert-success small p-2 d-block mt-2';
    statusBox.innerText = `${cleanData.length} registros lidos. Pins gerados no mapa!`;
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
        educativo: document.getElementById('mEducativo').value,
        ingresso: document.getElementById('mIngresso').value || "Não informado",
        funcionamento: document.getElementById('mFunc').value,
        gratuidades: document.getElementById('mGratuidade').value,
        acessibilidade: document.getElementById('mAcessibilidade').value,
        historico: document.getElementById('mHistorico').value,
        lat: null, lng: null
    };
    museumsData.push(novo);
    renderMuseums(museumsData);
    alert('Cadastrado com sucesso!');
    document.getElementById('manualForm').reset();
}