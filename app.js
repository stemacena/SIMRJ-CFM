// --- 1. CONFIGURAÇÃO DO MAPA PÚBLICO ---
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

// Utilitário para pausa (Evita bloqueio da API Nominatim)
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function geocodeAddress(endereco, municipio) {
    let query = `${endereco}, ${municipio}, Rio de Janeiro, Brasil`;
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    try {
        let response = await fetch(url);
        let data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) { console.error("Erro na geolocalização", e); }
    return null; // Retorna null se falhar! O gestor mapeará depois.
}

// --- 2. NAVEGAÇÃO DE TELAS ---
function switchView(view) {
    document.getElementById('view-home').style.display = view === 'home' ? 'block' : 'none';
    document.getElementById('view-cfm').style.display = view === 'cfm' ? 'block' : 'none';
    if(view === 'cfm') setTimeout(() => { map.invalidateSize(); }, 200);
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
            id: 0, nome: "Museu de Exemplo", municipio: "Rio de Janeiro",
            regiao: "Metropolitana I", natureza: "Estadual", situacao: "Aberto",
            endereco: "Faça upload do CSV no Painel do Gestor para ver os dados reais.", funcionamento: "Terça a Domingo",
            ingresso: "Gratuito", gratuidades: "Todas", educativo: "Sim",
            acervo: "Histórico", museologo: "Sim", acessibilidade: "Rampas", historico: "",
            lat: -22.9, lng: -43.2
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

// --- 4. RENDERIZAÇÃO E MAPA PÚBLICO ---
function renderMuseums(data) {
    const listContainer = document.getElementById('museum-list');
    listContainer.innerHTML = '';
    markersLayer.clearLayers();
    document.getElementById('resultCount').innerText = data.length;
    document.getElementById('count-total').innerText = museumsData.length;

    data.forEach(museum => {
        const hasMus = museum.museologo === "Sim";
        const hasPin = museum.lat && museum.lng; // Checa se a API conseguiu o Pin

        const card = document.createElement('div');
        card.className = 'col-md-6 mb-3';
        
        card.innerHTML = `
            <div class="card h-100 museum-card bg-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-secondary">${museum.regiao}</span>
                        ${hasMus ? '<span class="badge bg-info text-dark" title="Possui Museólogo"><i class="bi bi-person-badge"></i></span>' : ''}
                    </div>
                    <h5 class="card-title text-dark fw-bold mb-1" style="font-size: 1.1rem;">${museum.nome}</h5>
                    <p class="card-text small text-muted mb-1"><i class="bi bi-geo-alt-fill text-danger"></i> ${museum.municipio}</p>
                    ${!hasPin ? '<span class="badge bg-warning text-dark mb-2"><i class="bi bi-exclamation-triangle-fill"></i> Sem Pin no Mapa</span>' : ''}
                    <div class="d-flex justify-content-between align-items-end mt-2">
                        <small class="text-success fw-bold">${museum.situacao}</small>
                        <button class="btn btn-sm btn-outline-primary" onclick="openProfile(${museum.id})">Detalhes</button>
                    </div>
                </div>
            </div>`;
        listContainer.appendChild(card);

        // Só põe no mapa se tiver coordenada exata
        if (hasPin) {
            L.marker([museum.lat, museum.lng], {icon: museumIcon})
                .bindPopup(`<b>${museum.nome}</b><br><small>${museum.endereco}</small><br><a href="#" onclick="openProfile(${museum.id})">Abrir Ficha</a>`)
                .addTo(markersLayer);
        }
    });

    // Atualiza aba do gestor sempre que renderiza
    updatePendingList();
}

// --- 5. FILTROS (MANTIDOS E ACRESCENTADO STATUS NO MAPA) ---
function getCheckedValues(className) {
    return Array.from(document.querySelectorAll('.' + className + ':checked')).map(cb => cb.value);
}

function applyFilters() {
    const term = document.getElementById('searchName').value.toLowerCase();
    const filterHasMap = document.getElementById('filterHasMap').value; // Novo Filtro
    const selectedMuni = document.getElementById('filterMunicipio').value;
    const regions = getCheckedValues('filter-region');
    const natures = getCheckedValues('filter-nature');
    const acervos = getCheckedValues('filter-acervo');
    const statusList = getCheckedValues('filter-status');
    const turnos = getCheckedValues('filter-func');
    const costs = getCheckedValues('filter-cost');
    
    const reqMuseologo = document.getElementById('checkMuseologo').checked;
    const reqEdu = document.getElementById('checkEdu').checked;
    const textGratuidade = document.getElementById('searchGratuidade').value.toLowerCase();
    const textAccess = document.getElementById('searchAccess').value.toLowerCase();

    const filtered = museumsData.filter(m => {
        if (!m.nome.toLowerCase().includes(term)) return false;
        
        // NOVO FILTRO DE MAPA
        if (filterHasMap === 'sim' && (!m.lat || !m.lng)) return false;
        if (filterHasMap === 'nao' && (m.lat && m.lng)) return false;

        if (selectedMuni && m.municipio !== selectedMuni) return false;
        if (regions.length > 0 && !regions.includes(m.regiao)) return false;
        if (natures.length > 0 && !natures.includes(m.natureza)) return false;
        if (acervos.length > 0 && !acervos.includes(m.acervo)) return false;
        if (statusList.length > 0 && !statusList.includes(m.situacao)) return false;
        if (costs.length > 0 && !costs.includes(m.ingresso)) return false;

        if (turnos.length > 0) {
            const funcText = (m.funcionamento || "").toLowerCase();
            const hasTurno = turnos.some(t => funcText.includes(t.toLowerCase()));
            if (!hasTurno) return false;
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
    document.getElementById('filterHasMap').value = '';
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
    
    // SELOS
    const badge = document.getElementById('modalBadgeMuseologo');
    if (m.museologo === "Sim") { badge.classList.remove('d-none'); } else { badge.classList.add('d-none'); }

    const alertPin = document.getElementById('modalAlertPin');
    if (!m.lat || !m.lng) { alertPin.classList.remove('d-none'); } else { alertPin.classList.add('d-none'); }

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
function closeAdmin() { document.getElementById('admin-panel').style.display = 'none'; }

// PROCESSAMENTO DA PLANILHA (COM PROTEÇÃO DE API)
document.getElementById('csvFile').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const statusBox = document.getElementById('upload-status');
    const pContainer = document.getElementById('upload-progress-container');
    const pBar = document.getElementById('upload-progress-bar');
    
    statusBox.className = 'alert alert-info small p-2 d-block mt-2';
    statusBox.innerText = 'Lendo arquivo...';
    pContainer.classList.remove('d-none');
    pBar.style.width = '0%';

    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) { 
            let rawData = results.data;
            let cleanData = [];
            let total = rawData.length;
            
            for (let i = 0; i < total; i++) {
                let row = rawData[i];
                const nome = row["Nome da Instituição"] || row["Nome"];
                if (!nome) continue;

                let endereco = row["Endereço"] || "";
                let municipio = row["Município"] || "Rio de Janeiro";
                
                // Feedback visual de progresso para o usuário não achar que travou
                statusBox.innerText = `Buscando coordenadas (API): Processando ${i+1} de ${total}...`;
                pBar.style.width = `${((i+1)/total)*100}%`;

                // Busca a coordenada e dá uma pausa de 600ms para a API gratuita não bloquear!
                let coords = await geocodeAddress(endereco, municipio);
                await sleep(600); 

                cleanData.push({
                    id: i + 2000,
                    nome: nome,
                    municipio: municipio,
                    regiao: row["Região"] || "Outra",
                    natureza: row["Natureza Administrativa"] || "Privada",
                    situacao: row["Situação"] || "Aberto",
                    endereco: endereco,
                    funcionamento: row["Funcionamento"] || "",
                    ingresso: row["Valor do Ingresso"] || "Não informado",
                    gratuidades: row["Gratuidades"] || "",
                    educativo: row["Setor Educativo"] || "Não",
                    acervo: row["Acervo Predominante"] || "Outros",
                    museologo: row["Museólogo"] || "Não",
                    acessibilidade: row["Acessibilidade"] || "",
                    historico: row["Histórico"] || "",
                    lat: coords ? coords.lat : null, 
                    lng: coords ? coords.lng : null
                });
            }

            museumsData = cleanData;
            renderMuseums(museumsData);
            
            statusBox.className = 'alert alert-success small p-2 d-block mt-2';
            statusBox.innerText = `Concluído! ${cleanData.length} lidos. Vá na aba "Museus sem Pin" para ajustar os que a API não encontrou.`;
            pContainer.classList.add('d-none');
        }
    });
});

async function addManualMuseum(e) {
    e.preventDefault();
    const endereco = document.getElementById('mEndereco').value;
    const municipio = document.getElementById('mMunicipio').value;
    
    let coords = await geocodeAddress(endereco, municipio);

    const novo = {
        id: Date.now(),
        nome: document.getElementById('mNome').value,
        endereco: endereco,
        municipio: municipio,
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
        lat: coords ? coords.lat : null, 
        lng: coords ? coords.lng : null
    };
    
    museumsData.push(novo);
    renderMuseums(museumsData);
    alert(coords ? 'Cadastrado com sucesso no mapa!' : 'Cadastrado! Mas a rua não foi achada. Use a aba "Museus sem Pin" para fixar no mapa.');
    document.getElementById('manualForm').reset();
}

// --- 8. SISTEMA DE MAPEAMENTO MANUAL DO GESTOR ---
let adminMapInstance = null;
let adminTempMarker = null;
let currentMappingId = null;

function updatePendingList() {
    const list = document.getElementById('pending-list');
    list.innerHTML = '';
    const pendings = museumsData.filter(m => !m.lat || !m.lng);
    document.getElementById('pendingCount').innerText = pendings.length;

    if(pendings.length === 0) {
        list.innerHTML = '<div class="alert alert-success small">Nenhuma pendência! Todos os museus possuem localização exata no mapa.</div>';
        return;
    }

    pendings.forEach(m => {
        const item = document.createElement('div');
        item.className = 'pending-item d-flex justify-content-between align-items-center';
        item.innerHTML = `
            <div>
                <strong>${m.nome}</strong><br>
                <small class="text-muted"><i class="bi bi-geo-alt"></i> ${m.endereco}, ${m.municipio}</small>
            </div>
            <button class="btn btn-sm btn-warning fw-bold" onclick="openAdminMapPicker(${m.id})"><i class="bi bi-pin-map-fill"></i> Mapear</button>
        `;
        list.appendChild(item);
    });
}

function openAdminMapPicker(id) {
    const m = museumsData.find(x => x.id === id);
    if(!m) return;
    currentMappingId = id;
    document.getElementById('adminMapTitle').innerText = m.nome;
    
    const adminMapModal = new bootstrap.Modal(document.getElementById('adminMapModal'));
    adminMapModal.show();

    // Leaflet precisa desse delay para renderizar dentro do modal
    setTimeout(() => {
        if (!adminMapInstance) {
            adminMapInstance = L.map('adminLeafletMap').setView([-22.9068, -43.1729], 8);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(adminMapInstance);
            
            adminMapInstance.on('click', function(e) {
                if (adminTempMarker) { adminMapInstance.removeLayer(adminTempMarker); }
                adminTempMarker = L.marker(e.latlng).addTo(adminMapInstance);
            });
        }
        adminMapInstance.invalidateSize();
        // Se houver pin antigo, remove
        if (adminTempMarker) { adminMapInstance.removeLayer(adminTempMarker); adminTempMarker = null; }
        
        // Joga a câmera pro município dele para ajudar
        let startCoords = [-22.9, -43.2];
        adminMapInstance.setView(startCoords, 12);
        
    }, 300);
}

function saveAdminPin() {
    if (!adminTempMarker) {
        alert("Por favor, clique no mapa para colocar o pin antes de salvar.");
        return;
    }
    const coords = adminTempMarker.getLatLng();
    const m = museumsData.find(x => x.id === currentMappingId);
    if(m) {
        m.lat = coords.lat;
        m.lng = coords.lng;
        renderMuseums(museumsData); // Isso já atualiza o mapa público e a lista de pendências
        
        const myModalEl = document.getElementById('adminMapModal');
        const modal = bootstrap.Modal.getInstance(myModalEl);
        modal.hide();
        alert('Localização salva com sucesso!');
    }
}