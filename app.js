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

const allMunicipalitiesRJ = [
    "Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios", "Arraial do Cabo", "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim", "Bom Jesus do Itabapoana", "Cabo Frio", "Cachoeiras de Macacu", "Cambuci", "Campos dos Goytacazes", "Cantagalo", "Carapebus", "Cardoso Moreira", "Carmo", "Casimiro de Abreu", "Comendador Levy Gasparian", "Conceição de Macabu", "Cordeiro", "Duas Barras", "Duque de Caxias", "Engenheiro Paulo de Frontin", "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara", "Itaperuna", "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco", "Magé", "Mangaratiba", "Maricá", "Mendes", "Mesquita", "Miguel Pereira", "Miracema", "Natividade", "Nilópolis", "Niterói", "Nova Friburgo", "Nova Iguaçu", "Paracambi", "Paraíba do Sul", "Paraty", "Paty do Alferes", "Petrópolis", "Pinheiral", "Piraí", "Porciúncula", "Porto Real", "Quatis", "Queimados", "Quissamã", "Resende", "Rio Bonito", "Rio das Flores", "Rio das Ostras", "Rio de Janeiro", "Rio Claro", "Santa Maria Madalena", "Santo Antônio de Pádua", "São Fidélis", "São Francisco de Itabapoana", "São Gonçalo", "São João da Barra", "São João de Meriti", "São José de Ubá", "São José do Vale do Rio Preto", "São Pedro da Aldeia", "São Sebastião do Alto", "Sapucaia", "Saquarema", "Seropédica", "Silva Jardim", "Sumidouro", "Tanguá", "Teresópolis", "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai", "Vassouras", "Volta Redonda"
];

const cityCoordsRJ = {
    "angra dos reis":[-23.0067,-44.3181],"aperibe":[-21.6225,-42.0722],"araruama":[-22.8728,-42.3397],"areal":[-22.2289,-43.1069],"armacao dos buzios":[-22.7525,-41.8906],"arraial do cabo":[-22.9644,-42.0278],"barra do pirai":[-22.4678,-43.8267],"barra mansa":[-22.5442,-44.1714],"belford roxo":[-22.7642,-43.3994],"bom jardim":[-22.155,-42.4239],"bom jesus do itabapoana":[-21.1333,-41.6792],"cabo frio":[-22.8869,-42.0266],"cachoeiras de macacu":[-22.4642,-42.6536],"cambuci":[-21.5756,-41.9161],"campos dos goytacazes":[-21.7618,-41.3239],"cantagalo":[-21.9806,-42.3683],"carapebus":[-22.1856,-41.6622],"cardoso moreira":[-21.4828,-41.6164],"carmo":[-21.9328,-42.6086],"casimiro de abreu":[-22.4808,-42.2047],"comendador levy gasparian":[-22.0286,-43.2086],"conceicao de macabu":[-22.0833,-41.8683],"cordeiro":[-22.0289,-42.3606],"duas barras":[-22.0506,-42.5256],"duque de caxias":[-22.7915,-43.3005],"engenheiro paulo de frontin":[-22.5519,-43.6828],"guapimirim":[-22.5361,-42.9819],"iguaba grande":[-22.8369,-42.2269],"itaborai":[-22.7483,-42.8586],"itaguai":[-22.8522,-43.7753],"italva":[-21.425,-41.6842],"itaocara":[-21.6744,-42.0761],"itaperuna":[-21.2057,-41.8888],"itatiaia":[-22.4961,-44.5606],"japeri":[-22.645,-43.6517],"laje do muriae":[-21.2036,-42.1286],"macae":[-22.3708,-41.7869],"macuco":[-21.9842,-42.2514],"mage":[-22.6528,-43.0422],"mangaratiba":[-22.9597,-44.0406],"marica":[-22.9194,-42.8186],"mendes":[-22.5264,-43.7331],"mesquita":[-22.7831,-43.4286],"miguel pereira":[-22.4572,-43.4803],"miracema":[-21.4131,-42.1961],"natividade":[-21.0425,-41.9867],"nilopolis":[-22.8089,-43.4147],"niteroi":[-22.8859,-43.1152],"nova friburgo":[-22.2887,-42.5341],"nova iguacu":[-22.7561,-43.4608],"paracambi":[-22.6033,-43.7083],"paraiba do sul":[-22.1625,-43.2889],"paraty":[-23.2198,-44.7175],"paty do alferes":[-22.4281,-43.4175],"petropolis":[-22.5050,-43.1788],"pinheiral":[-22.5133,-44.0011],"pirai":[-22.6289,-43.8986],"porciuncula":[-20.9631,-42.0408],"porto real":[-22.4133,-44.2886],"quatis":[-22.4086,-44.2586],"queimados":[-22.7161,-43.5558],"quissama":[-22.1022,-41.4725],"resende":[-22.4689,-44.4486],"rio bonito":[-22.7031,-42.6253],"rio das flores":[-22.1644,-43.585],"rio das ostras":[-22.5269,-41.945],"rio de janeiro":[-22.9068,-43.1729],"rio claro":[-22.7214,-44.0253],"santa maria madalena":[-21.9542,-42.0083],"santo antonio de padua":[-21.5383,-42.1814],"sao fidelis":[-21.6461,-41.7469],"sao francisco de itabapoana":[-21.2981,-41.1408],"sao goncalo":[-22.8269,-43.0539],"sao joao da barra":[-21.6381,-41.0506],"sao joao de meriti":[-22.8017,-43.3736],"sao jose de uba":[-21.3586,-41.9431],"sao jose do vale do rio preto":[-22.1522,-42.9231],"sao pedro da aldeia":[-22.8392,-42.1028],"sao sebastiao do alto":[-21.9567,-42.1342],"sapucaia":[-21.9933,-42.915],"saquarema":[-22.9272,-42.5103],"seropedica":[-22.7483,-43.7036],"silva jardim":[-22.6517,-42.3931],"sumidouro":[-22.0511,-42.6739],"tangua":[-22.7303,-42.7144],"teresopolis":[-22.4123,-42.9664],"trajano de moraes":[-22.0628,-42.0658],"tres rios":[-22.1167,-43.2083],"valenca":[-22.2458,-43.7031],"varre-sai":[-20.9292,-41.8672],"vassouras":[-22.4042,-43.6631],"volta redonda":[-22.5202,-44.1033]
};
const defaultRjCenter = [-22.9, -43.2]; 

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
    } catch (e) { console.error(e); }
    return null;
}

const normalizeString = (str) => {
    if(!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

// --- 2. NAVEGAÇÃO DE TELAS ---
function switchView(view) {
    document.getElementById('view-home').style.display = view === 'home' ? 'block' : 'none';
    document.getElementById('view-cfm').style.display = view === 'cfm' ? 'block' : 'none';
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
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

// --- 4. RENDERIZAÇÃO E MAPA ---
function renderMuseums(data) {
    const listContainer = document.getElementById('museum-list');
    listContainer.innerHTML = '';
    markersLayer.clearLayers();
    document.getElementById('resultCount').innerText = data.length;
    document.getElementById('count-total').innerText = museumsData.length;

    data.forEach(museum => {
        const hasMus = museum.museologo === "Sim";
        const hasPin = museum.lat && museum.lng; 

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

        if (hasPin) {
            L.marker([museum.lat, museum.lng], {icon: museumIcon})
                .bindPopup(`<b>${museum.nome}</b><br><small>${museum.endereco}</small><br><a href="#" onclick="openProfile(${museum.id})">Abrir Ficha</a>`)
                .addTo(markersLayer);
        }
    });

    updatePendingList();
}

// --- 5. FILTROS ---
function getCheckedValues(className) {
    return Array.from(document.querySelectorAll('.' + className + ':checked')).map(cb => cb.value);
}

function applyFilters() {
    const term = document.getElementById('searchName').value.toLowerCase();
    const filterHasMap = document.getElementById('filterHasMap').value;
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
                
                statusBox.innerText = `Buscando coordenadas (API): Processando ${i+1} de ${total}...`;
                pBar.style.width = `${((i+1)/total)*100}%`;

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
            statusBox.innerText = `Concluído! ${cleanData.length} lidos. Verifique a aba "Museus sem Pin".`;
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
    alert(coords ? 'Cadastrado com sucesso no mapa!' : 'Cadastrado! Mas a rua não foi achada. Use a aba "Museus sem Pin".');
    document.getElementById('manualForm').reset();
}

// --- 8. SISTEMA DE MAPEAMENTO MANUAL COM FEEDBACK DE BUSCA ---
let adminMapInstance = null;
let adminTempMarker = null;
let currentMappingId = null;

function updatePendingList() {
    const list = document.getElementById('pending-list');
    list.innerHTML = '';
    const pendings = museumsData.filter(m => !m.lat || !m.lng);
    document.getElementById('pendingCount').innerText = pendings.length;

    if(pendings.length === 0) {
        list.innerHTML = '<div class="alert alert-success small">Todos os museus possuem localização exata no mapa.</div>';
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
    
    // Auto-preenche a busca
    document.getElementById('adminMapSearchInput').value = `${m.endereco}, ${m.municipio}, RJ`;

    const adminMapModal = new bootstrap.Modal(document.getElementById('adminMapModal'));
    adminMapModal.show();

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
        if (adminTempMarker) { adminMapInstance.removeLayer(adminTempMarker); adminTempMarker = null; }
        
        let normCity = normalizeString(m.municipio);
        let startCoords = cityCoordsRJ[normCity] || defaultRjCenter;
        adminMapInstance.setView(startCoords, 13);
        
    }, 300);
}

// BUSCA NO MAPA DO GESTOR (COM FEEDBACK E ALERTA)
async function searchAddressOnAdminMap() {
    const query = document.getElementById('adminMapSearchInput').value;
    if(!query) return;
    
    const btn = document.getElementById('btnSearchAdminMap');
    const originalText = btn.innerHTML;
    
    // Mostra o spinner de carregando para não parecer que está travado
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Buscando...';
    btn.disabled = true;

    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    try {
        let res = await fetch(url);
        let data = await res.json();
        if(data && data.length > 0) {
            let lat = parseFloat(data[0].lat);
            let lon = parseFloat(data[0].lon);
            
            adminMapInstance.setView([lat, lon], 17); // Zoom exato!
            
            if (adminTempMarker) adminMapInstance.removeLayer(adminTempMarker);
            adminTempMarker = L.marker([lat, lon]).addTo(adminMapInstance);
        } else {
            // Alerta amigável se a API do mapa não achar aquela rua específica
            alert("A busca automática não encontrou esse endereço exato.\n\nDica: Tente remover números, CEP ou o bairro, e pesquise apenas o nome da rua e a cidade.\nEx: 'Avenida Marechal Ancora, Rio de Janeiro'.\n\nOu navegue no mapa com o mouse e clique no local correto.");
        }
    } catch(e) { 
        console.error(e); 
        alert("Erro de conexão ao buscar o endereço.");
    } finally {
        // Devolve o botão ao normal
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
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
        renderMuseums(museumsData); 
        
        const myModalEl = document.getElementById('adminMapModal');
        const modal = bootstrap.Modal.getInstance(myModalEl);
        modal.hide();
        alert('Localização salva com sucesso!');
    }
}