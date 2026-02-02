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
let museumsData = []; // Começa vazio, espera upload

// --- 2. BASE DE COORDENADAS (SOLUÇÃO PARA FALTA DE LAT/LONG) ---
// Como a planilha só tem endereço, mapeamos o centro dos principais municípios.
// Adicione mais cidades aqui conforme necessário para o protótipo.
const cityCoords = {
    "Rio de Janeiro": [-22.9068, -43.1729],
    "Petrópolis": [-22.5050, -43.1788],
    "Niterói": [-22.8859, -43.1152],
    "Cabo Frio": [-22.8869, -42.0266],
    "Campos dos Goytacazes": [-21.7618, -41.3239],
    "Duque de Caxias": [-22.7915, -43.3005],
    "Nova Friburgo": [-22.2887, -42.5341],
    "Paraty": [-23.2198, -44.7175],
    "Vassouras": [-22.4042, -43.6631],
    "Volta Redonda": [-22.5202, -44.1033]
};

// --- 3. FUNÇÕES PRINCIPAIS ---

function init() {
    // Carrega dados de exemplo se não houver upload
    if(museumsData.length === 0) {
        // Exemplo fictício só pra não ficar vazio ao abrir
        museumsData = [{
            id: 0, nome: "Exemplo: Faça Upload da Planilha", municipio: "Rio de Janeiro",
            regiao: "Metropolitana I", natureza: "Estadual", situacao: "Aberto",
            lat: -22.9, lng: -43.1, ingresso: "Gratuito", museologo: true,
            descricao: "Use o painel de gestor para carregar os dados reais."
        }];
    }
    renderMuseums(museumsData);
    updateStats(museumsData);
}

function renderMuseums(data) {
    const listContainer = document.getElementById('museum-list');
    listContainer.innerHTML = '';
    markersLayer.clearLayers();
    document.getElementById('resultCount').innerText = data.length;

    data.forEach(museum => {
        // Renderiza Card
        const card = document.createElement('div');
        card.className = 'col-md-6 mb-3';
        card.innerHTML = `
            <div class="card h-100 museum-card bg-white shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <span class="badge bg-secondary mb-2">${museum.regiao}</span>
                        ${museum.museologo ? '<span class="badge bg-info text-dark mb-2"><i class="bi bi-person-badge"></i> Museólogo</span>' : ''}
                    </div>
                    <h5 class="card-title text-dark fw-bold">${museum.nome}</h5>
                    <p class="card-text small text-muted mb-1"><i class="bi bi-geo-alt"></i> ${museum.municipio}</p>
                    <p class="card-text small mb-1"><strong>Endereço:</strong> ${museum.endereco}</p>
                    <p class="card-text small"><strong>Situação:</strong> ${museum.situacao}</p>
                    <button class="btn btn-sm btn-outline-secondary w-100 mt-2" onclick="showDetails(${museum.id})">Ver Detalhes</button>
                </div>
            </div>`;
        listContainer.appendChild(card);

        // Renderiza Pin no Mapa
        // Se tiver Lat/Long, usa. Se não, tenta achar pelo município.
        let lat = museum.lat;
        let lng = museum.lng;

        if (!lat && cityCoords[museum.municipio]) {
            lat = cityCoords[museum.municipio][0];
            lng = cityCoords[museum.municipio][1];
            // Pequena variação aleatória para pinos da mesma cidade não ficarem 100% sobrepostos
            lat += (Math.random() - 0.5) * 0.01;
            lng += (Math.random() - 0.5) * 0.01;
        }

        if (lat && lng) {
            L.marker([lat, lng], {icon: museumIcon})
                .bindPopup(`<b>${museum.nome}</b><br>${museum.municipio}`)
                .addTo(markersLayer);
        }
    });
}

function updateStats(data) {
    document.getElementById('count-total').innerText = data.length;
    // Lógica frouxa para identificar gratuidade no texto
    const free = data.filter(m => m.ingresso && m.ingresso.toLowerCase().includes('gratuito')).length;
    document.getElementById('count-free').innerText = free;
}

// --- 4. FILTROS ---

function getCheckedValues(className) {
    return Array.from(document.querySelectorAll('.' + className + ':checked')).map(cb => cb.value);
}

function applyFilters() {
    const term = document.getElementById('searchName').value.toLowerCase();
    const regions = getCheckedValues('filter-region');
    const natures = getCheckedValues('filter-nature');
    const costs = getCheckedValues('filter-cost'); // Ex: ['Gratuito']
    
    const requireMuseologo = document.getElementById('checkMuseologo').checked;
    const requireEdu = document.getElementById('checkEdu').checked;
    const requireAccess = document.getElementById('checkAccess').checked;

    const filtered = museumsData.filter(m => {
        // Busca textual
        const matchName = m.nome.toLowerCase().includes(term);
        
        // Filtros de múltipla escolha
        const matchRegion = regions.length === 0 || regions.includes(m.regiao);
        const matchNature = natures.length === 0 || natures.includes(m.natureza);
        
        // Filtro de Custo (Simplificado)
        let matchCost = true;
        if (costs.includes('Gratuito')) {
            matchCost = m.ingresso && m.ingresso.toLowerCase().includes('gratuito');
        }

        // Filtros Booleanos (Sim/Não)
        const matchMuseologo = !requireMuseologo || m.museologo;
        const matchEdu = !requireEdu || (m.educativo && m.educativo.toLowerCase() === 'sim');
        const matchAccess = !requireAccess || (m.acessibilidade && m.acessibilidade.toLowerCase().includes('sim')); // Verifica se tem "Sim" no texto

        return matchName && matchRegion && matchNature && matchCost && matchMuseologo && matchEdu && matchAccess;
    });

    renderMuseums(filtered);
}

function resetFilters() {
    document.getElementById('searchName').value = '';
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    renderMuseums(museumsData);
}

// --- 5. GESTÃO DE DADOS (UPLOAD E MANUAL) ---

function toggleAdmin() {
    const p = document.getElementById('admin-panel');
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

// Upload CSV
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
    let successCount = 0;
    let errors = [];
    let cleanData = [];

    rawData.forEach((row, index) => {
        // Validação: Campos obrigatórios
        // Verifica se existe a coluna "Nome da Instituição". Se não, tenta "Nome".
        const nome = row["Nome da Instituição"];
        const municipio = row["Município"];

        if (!nome || !municipio) {
            errors.push(`Linha ${index + 2}: Falta Nome ou Município.`);
            return; // Pula este registro
        }

        // Verifica campos indefinidos importantes
        if (!row["Região"]) errors.push(`Aviso Linha ${index+2}: Região indefinida.`);

        cleanData.push({
            id: index + 1000,
            nome: nome,
            endereco: row["Endereço"] || "Não informado",
            municipio: municipio,
            regiao: row["Região"] || "Outra",
            natureza: row["Natureza Administrativa"] || "Privada",
            situacao: row["Situação"] || "Desconhecida",
            ingresso: row["Valor do Ingresso"] || "Não informado",
            educativo: row["Setor Educativo"] || "Não",
            acervo: row["Acervo Predominante"] || "Diversos",
            // Verifica se tem museólogo (Procura "Sim" na resposta)
            museologo: row["Museólogo"] && row["Museólogo"].includes("Sim"),
            acessibilidade: row["Acessibilidade"] || "Não informado",
            historico: row["Histórico"] || "",
            // Deixa lat/lng nulos para usar o fallback de cidade
            lat: null, 
            lng: null
        });
        successCount++;
    });

    museumsData = cleanData;
    renderMuseums(museumsData);
    updateStats(museumsData);

    // Feedback visual
    const statusBox = document.getElementById('upload-status');
    statusBox.className = 'alert alert-info small mt-2 d-block';
    statusBox.innerHTML = `<strong>Sucesso:</strong> ${successCount} carregados.<br>`;
    
    if (errors.length > 0) {
        statusBox.className = 'alert alert-warning small mt-2 d-block';
        statusBox.innerHTML += `<strong>Erros/Avisos:</strong><br>${errors.slice(0, 5).join('<br>')}`;
        if(errors.length > 5) statusBox.innerHTML += `<br>...e mais ${errors.length - 5} avisos.`;
    }
}

// Adicionar Manualmente
function addManualMuseum(e) {
    e.preventDefault();
    const nome = document.getElementById('newNome').value;
    const muni = document.getElementById('newMunicipio').value;
    
    const novo = {
        id: Date.now(),
        nome: nome,
        municipio: muni,
        regiao: document.getElementById('newRegiao').value,
        situacao: document.getElementById('newSituacao').value,
        endereco: "Inserido Manualmente",
        natureza: "Privada", // Default
        ingresso: "Não informado",
        museologo: false,
        lat: null, lng: null
    };

    museumsData.push(novo);
    renderMuseums(museumsData);
    updateStats(museumsData);
    alert(`${nome} adicionado com sucesso!`);
    document.getElementById('manualForm').reset();
}

function showDetails(id) {
    const m = museumsData.find(x => x.id === id);
    alert(`Instituição: ${m.nome}\nHistórico: ${m.historico.substring(0, 150)}...\nEndereço: ${m.endereco}`);
}

init();