let map;
let markersArray = [];
let infoWindow;
let geocoder;
let museumsData = [];
let pendingApprovals = []; // BANCO DE DADOS DE REQUISIÇÕES (Fila de Aprovação)
let profileModal;

// Restrição exata do Google Maps para o estado do Rio de Janeiro
const RJ_BOUNDS = { north: -20.76, south: -23.39, west: -44.89, east: -40.96 };

const allMunicipalitiesRJ = ["Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios", "Arraial do Cabo", "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim", "Bom Jesus do Itabapoana", "Cabo Frio", "Cachoeiras de Macacu", "Cambuci", "Campos dos Goytacazes", "Cantagalo", "Carapebus", "Cardoso Moreira", "Carmo", "Casimiro de Abreu", "Comendador Levy Gasparian", "Conceição de Macabu", "Cordeiro", "Duas Barras", "Duque de Caxias", "Engenheiro Paulo de Frontin", "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara", "Itaperuna", "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco", "Magé", "Mangaratiba", "Maricá", "Mendes", "Mesquita", "Miguel Pereira", "Miracema", "Natividade", "Nilópolis", "Niterói", "Nova Friburgo", "Nova Iguaçu", "Paracambi", "Paraíba do Sul", "Paraty", "Paty do Alferes", "Petrópolis", "Pinheiral", "Piraí", "Porciúncula", "Porto Real", "Quatis", "Queimados", "Quissamã", "Resende", "Rio Bonito", "Rio das Flores", "Rio das Ostras", "Rio de Janeiro", "Rio Claro", "Santa Maria Madalena", "Santo Antônio de Pádua", "São Fidélis", "São Francisco de Itabapoana", "São Gonçalo", "São João da Barra", "São João de Meriti", "São José de Ubá", "São José do Vale do Rio Preto", "São Pedro da Aldeia", "São Sebastião do Alto", "Sapucaia", "Saquarema", "Seropédica", "Silva Jardim", "Sumidouro", "Tanguá", "Teresópolis", "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai", "Vassouras", "Volta Redonda"];
const cityCoordsRJ = {"angra dos reis":[-23.0067,-44.3181],"aperibe":[-21.6225,-42.0722],"araruama":[-22.8728,-42.3397],"areal":[-22.2289,-43.1069],"armacao dos buzios":[-22.7525,-41.8906],"arraial do cabo":[-22.9644,-42.0278],"barra do pirai":[-22.4678,-43.8267],"barra mansa":[-22.5442,-44.1714],"belford roxo":[-22.7642,-43.3994],"bom jardim":[-22.155,-42.4239],"bom jesus do itabapoana":[-21.1333,-41.6792],"cabo frio":[-22.8869,-42.0266],"cachoeiras de macacu":[-22.4642,-42.6536],"cambuci":[-21.5756,-41.9161],"campos dos goytacazes":[-21.7618,-41.3239],"cantagalo":[-21.9806,-42.3683],"carapebus":[-22.1856,-41.6622],"cardoso moreira":[-21.4828,-41.6164],"carmo":[-21.9328,-42.6086],"casimiro de abreu":[-22.4808,-42.2047],"comendador levy gasparian":[-22.0286,-43.2086],"conceicao de macabu":[-22.0833,-41.8683],"cordeiro":[-22.0289,-42.3606],"duas barras":[-22.0506,-42.5256],"duque de caxias":[-22.7915,-43.3005],"engenheiro paulo de frontin":[-22.5519,-43.6828],"guapimirim":[-22.5361,-42.9819],"iguaba grande":[-22.8369,-42.2269],"itaborai":[-22.7483,-42.8586],"itaguai":[-22.8522,-43.7753],"italva":[-21.425,-41.6842],"itaocara":[-21.6744,-42.0761],"itaperuna":[-21.2057,-41.8888],"itatiaia":[-22.4961,-44.5606],"japeri":[-22.645,-43.6517],"laje do muriae":[-21.2036,-42.1286],"macae":[-22.3708,-41.7869],"macuco":[-21.9842,-42.2514],"mage":[-22.6528,-43.0422],"mangaratiba":[-22.9597,-44.0406],"marica":[-22.9194,-42.8186],"mendes":[-22.5264,-43.7331],"mesquita":[-22.7831,-43.4286],"miguel pereira":[-22.4572,-43.4803],"miracema":[-21.4131,-42.1961],"natividade":[-21.0425,-41.9867],"nilopolis":[-22.8089,-43.4147],"niteroi":[-22.8859,-43.1152],"nova friburgo":[-22.2887,-42.5341],"nova iguacu":[-22.7561,-43.4608],"paracambi":[-22.6033,-43.7083],"paraiba do sul":[-22.1625,-43.2889],"paraty":[-23.2198,-44.7175],"paty do alferes":[-22.4281,-43.4175],"petropolis":[-22.5050,-43.1788],"pinheiral":[-22.5133,-44.0011],"pirai":[-22.6289,-43.8986],"porciuncula":[-20.9631,-42.0408],"porto real":[-22.4133,-44.2886],"quatis":[-22.4086,-44.2586],"queimados":[-22.7161,-43.5558],"quissama":[-22.1022,-41.4725],"resende":[-22.4689,-44.4486],"rio bonito":[-22.7031,-42.6253],"rio das flores":[-22.1644,-43.585],"rio das ostras":[-22.5269,-41.945],"rio de janeiro":[-22.9068,-43.1729],"rio claro":[-22.7214,-44.0253],"santa maria madalena":[-21.9542,-42.0083],"santo antonio de padua":[-21.5383,-42.1814],"sao fidelis":[-21.6461,-41.7469],"sao francisco de itabapoana":[-21.2981,-41.1408],"sao goncalo":[-22.8269,-43.0539],"sao joao da barra":[-21.6381,-41.0506],"sao joao de meriti":[-22.8017,-43.3736],"sao jose de uba":[-21.3586,-41.9431],"sao jose do vale do rio preto":[-22.1522,-42.9231],"sao pedro da aldeia":[-22.8392,-42.1028],"sao sebastiao do alto":[-21.9567,-42.1342],"sapucaia":[-21.9933,-42.915],"saquarema":[-22.9272,-42.5103],"seropedica":[-22.7483,-43.7036],"silva jardim":[-22.6517,-42.3931],"sumidouro":[-22.0511,-42.6739],"tangua":[-22.7303,-42.7144],"teresopolis":[-22.4123,-42.9664],"trajano de moraes":[-22.0628,-42.0658],"tres rios":[-22.1167,-43.2083],"valenca":[-22.2458,-43.7031],"varre-sai":[-20.9292,-41.8672],"vassouras":[-22.4042,-43.6631],"volta redonda":[-22.5202,-44.1033]};
const defaultRjCenter = [-22.9, -43.2]; 

const normalizeString = (str) => {
    if(!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

function initMapSystem() {
    geocoder = new google.maps.Geocoder();
    infoWindow = new google.maps.InfoWindow();

    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -22.9068, lng: -43.1729 },
        zoom: 8, mapTypeControl: false, streetViewControl: false,
        restriction: { latLngBounds: RJ_BOUNDS, strictBounds: false }
    });

    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    populateCitySelects();
    if(museumsData.length === 0) renderMuseums([]); 
}

function geocodeAddressGoogle(endereco, municipio) {
    return new Promise((resolve) => {
        let addressStr = `${endereco}, ${municipio}`;
        geocoder.geocode({ 
            address: addressStr,
            componentRestrictions: { country: 'BR', administrativeArea: 'RJ', locality: municipio }
        }, (results, status) => {
            if (status === 'OK' && results[0]) {
                resolve({ lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() });
            } else {
                geocoder.geocode({ 
                    address: addressStr, componentRestrictions: { country: 'BR', administrativeArea: 'RJ' }
                }, (results2, status2) => {
                    if (status2 === 'OK' && results2[0]) resolve({ lat: results2[0].geometry.location.lat(), lng: results2[0].geometry.location.lng() });
                    else resolve(null);
                });
            }
        });
    });
}

function populateCitySelects() {
    const filterSelect = document.getElementById('filterMunicipio');
    filterSelect.innerHTML = '<option value="">Todos os 92 Municípios</option>';
    allMunicipalitiesRJ.sort().forEach(city => { filterSelect.appendChild(new Option(city, city)); });
}

// --- SPA NAVEGAÇÃO ---
window.switchView = function(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    // Corrigido ID de cfm-map para cfm-mapa
    if(viewId === 'cfm-mapa' && map) {
        setTimeout(() => { google.maps.event.trigger(map, 'resize'); map.setCenter({ lat: -22.9068, lng: -43.1729 }); }, 200);
    }
}

// --- WIZARD FORM LOGIC ---
window.simulateGoogleLogin = function() {
    document.getElementById('google-login-area').classList.add('d-none');
    document.getElementById('logged-in-area').classList.remove('d-none');
}

window.nextStep = function(step) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-dot').forEach((el, index) => {
        if(index < step) el.classList.add('active'); else el.classList.remove('active');
    });
    document.getElementById('step' + step).classList.add('active');
}
window.prevStep = function(step) { nextStep(step); }

// --- FLUXO DE APROVAÇÃO (CRIANDO REQUISIÇÃO) ---
window.submitMuseumRegistration = function() {
    const nome = document.getElementById('regNome').value;
    if(!nome) return alert("Preencha ao menos o nome.");

    const req = {
        id: Date.now(),
        nome: nome,
        endereco: document.getElementById('regEndereco').value || "",
        municipio: document.getElementById('regMuni').value || "",
        regiao: document.getElementById('regRegiao').value || "",
        natureza: document.getElementById('regNatureza').value || "",
        acervo: document.getElementById('regAcervo').value || "",
        museologo: document.getElementById('regMus').value || "",
        acessibilidade: document.getElementById('regAccess').value || "",
        situacao: "Aberto", funcionamento: "Não informado", ingresso: "Não informado", gratuidades: "", educativo: "Não",
        lat: null, lng: null
    };

    pendingApprovals.push(req);
    alert("Dados registrados com sucesso!\nSua requisição foi enviada para a análise da equipe do SIM-RJ e, se aprovada, entrará no mapa público em breve.");
    
    // Reseta form e volta pra home
    document.getElementById('regNome').value = '';
    document.getElementById('regEndereco').value = '';
    document.getElementById('regMuni').value = '';
    nextStep(1);
    switchView('home');
    renderApprovalsList(); // Atualiza painel do gestor
}

// --- RENDERIZAR MAPA ---
function renderMuseums(data) {
    const listContainer = document.getElementById('museum-list');
    if(!listContainer) return;
    listContainer.innerHTML = '';
    markersArray.forEach(m => m.setMap(null)); markersArray = [];
    document.getElementById('resultCount').innerText = data.length;

    let totalElement = document.getElementById('count-total');
    if(totalElement) totalElement.innerText = museumsData.length;

    data.forEach(museum => {
        const hasPin = museum.lat && museum.lng; 
        const card = document.createElement('div');
        card.className = 'col-md-6 mb-3';
        card.innerHTML = `
            <div class="card h-100 museum-card bg-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge bg-secondary">${museum.regiao}</span>
                    </div>
                    <h5 class="card-title text-dark fw-bold mb-1">${museum.nome}</h5>
                    <p class="card-text small text-muted mb-1"><i class="bi bi-geo-alt-fill text-danger"></i> ${museum.municipio}</p>
                    <div class="mt-2"><button class="btn btn-sm btn-outline-primary" onclick="openProfile(${museum.id})">Detalhes</button></div>
                </div>
            </div>`;
        listContainer.appendChild(card);

        let lat = museum.lat; let lng = museum.lng;
        if (!lat) {
            let normCity = normalizeString(museum.municipio);
            let coords = cityCoordsRJ[normCity] || defaultRjCenter;
            lat = coords[0] + (Math.random() - 0.5) * 0.015;
            lng = coords[1] + (Math.random() - 0.5) * 0.015;
        }

        const marker = new google.maps.Marker({ position: { lat, lng }, map: map, title: museum.nome });
        marker.addListener("click", () => {
            infoWindow.setContent(`<div style="padding: 5px;"><h6 class="fw-bold">${museum.nome}</h6><button class="btn btn-sm btn-warning w-100 mt-2" onclick="openProfile(${museum.id})">Ver Ficha</button></div>`);
            infoWindow.open(map, marker);
        });
        markersArray.push(marker);
    });
    updatePendingList();
}

// --- FILTROS ---
function getCheckedValues(className) {
    return Array.from(document.querySelectorAll('.' + className + ':checked')).map(cb => cb.value.toLowerCase().trim());
}

window.applyFilters = function() {
    const term = normalizeString(document.getElementById('searchName').value);
    const filterHasMap = document.getElementById('filterHasMap').value;
    const selectedMuni = normalizeString(document.getElementById('filterMunicipio').value);
    
    const regions = getCheckedValues('filter-region');
    const natures = getCheckedValues('filter-nature');
    const acervos = getCheckedValues('filter-acervo');
    const statusList = getCheckedValues('filter-status');
    const turnos = getCheckedValues('filter-func');
    const costs = getCheckedValues('filter-cost');
    
    const reqMuseologo = document.getElementById('checkMuseologo').checked;
    const reqEdu = document.getElementById('checkEdu').checked;
    const textAccess = normalizeString(document.getElementById('searchAccess').value);

    const filtered = museumsData.filter(m => {
        const mNome = normalizeString(m.nome);
        const mMuni = normalizeString(m.municipio);
        const mRegiao = normalizeString(m.regiao);
        const mNat = normalizeString(m.natureza);
        const mAcervo = normalizeString(m.acervo);
        const mStatus = normalizeString(m.situacao);
        const mCost = normalizeString(m.ingresso);
        const mAccess = normalizeString(m.acessibilidade) + " " + normalizeString(m.gratuidades);

        if (term && !mNome.includes(term)) return false;
        if (filterHasMap === 'sim' && (!m.lat || !m.lng)) return false;
        if (filterHasMap === 'nao' && (m.lat && m.lng)) return false;
        if (selectedMuni && mMuni !== selectedMuni) return false;
        
        if (regions.length > 0 && !regions.some(v => mRegiao.includes(v))) return false;
        if (natures.length > 0 && !natures.some(v => mNat.includes(v))) return false;
        if (acervos.length > 0 && !acervos.some(v => mAcervo.includes(v))) return false;
        if (statusList.length > 0 && !statusList.some(v => mStatus === v)) return false;
        if (costs.length > 0 && !costs.some(v => mCost.includes(v))) return false;

        if (turnos.length > 0) {
            const funcText = normalizeString(m.funcionamento);
            if (!turnos.some(t => funcText.includes(t))) return false;
        }

        if (reqMuseologo && normalizeString(m.museologo) !== "sim") return false;
        if (reqEdu && normalizeString(m.educativo) !== "sim") return false;
        if (textAccess && !mAccess.includes(textAccess)) return false;

        return true;
    });

    renderMuseums(filtered);
}

window.resetFilters = function() {
    document.querySelectorAll('input[type="text"], select').forEach(el => el.value = '');
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    renderMuseums(museumsData);
}

// --- GESTÃO DE APROVAÇÕES E ADMIN ---
window.openLogin = function() { document.getElementById('login-overlay').style.display = 'flex'; }
window.closeLogin = function() { document.getElementById('login-overlay').style.display = 'none'; }
window.checkAdminPassword = function() {
    if(document.getElementById('adminPassword').value === 'simrj') {
        document.getElementById('admin-panel').style.display = 'block'; closeLogin();
        renderApprovalsList();
    } else alert('Senha incorreta.');
}
window.closeAdmin = function() { document.getElementById('admin-panel').style.display = 'none'; }

// RENDERIZA A LISTA DE APROVAÇÕES PENDENTES NO GESTOR
function renderApprovalsList() {
    const list = document.getElementById('requests-list');
    document.getElementById('reqCount').innerText = pendingApprovals.length;
    list.innerHTML = '';
    
    if(pendingApprovals.length === 0) {
        list.innerHTML = '<div class="alert alert-success small">Nenhuma requisição pendente no momento.</div>';
        return;
    }

    pendingApprovals.forEach(req => {
        list.innerHTML += `
            <div class="req-item shadow-sm">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="fw-bold mb-1">${req.nome}</h6>
                        <small class="text-muted"><i class="bi bi-geo-alt"></i> ${req.endereco}, ${req.municipio}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-success" onclick="approveRequest(${req.id})"><i class="bi bi-check-lg"></i> Aprovar</button>
                        <button class="btn btn-sm btn-danger ms-1" onclick="rejectRequest(${req.id})"><i class="bi bi-x-lg"></i> Rejeitar</button>
                    </div>
                </div>
            </div>`;
    });
}

// APROVAR UM MUSEU
window.approveRequest = async function(id) {
    const reqIndex = pendingApprovals.findIndex(r => r.id === id);
    if(reqIndex === -1) return;
    
    const approvedMuseum = pendingApprovals[reqIndex];
    // Ao aprovar, tenta buscar as coordenadas
    let coords = await geocodeAddressGoogle(approvedMuseum.endereco, approvedMuseum.municipio);
    approvedMuseum.lat = coords ? coords.lat : null;
    approvedMuseum.lng = coords ? coords.lng : null;

    // Remove da fila e bota no mapa
    pendingApprovals.splice(reqIndex, 1);
    museumsData.push(approvedMuseum);
    
    renderApprovalsList();
    renderMuseums(museumsData);
    alert(`${approvedMuseum.nome} foi aprovado e integrado ao sistema público!`);
}

// REJEITAR UM MUSEU
window.rejectRequest = function(id) {
    if(confirm("Deseja realmente rejeitar e apagar esta requisição?")) {
        pendingApprovals = pendingApprovals.filter(r => r.id !== id);
        renderApprovalsList();
    }
}

// IMPORTAÇÃO CSV
const sleep = ms => new Promise(r => setTimeout(r, ms));
document.getElementById('csvFile').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    document.getElementById('upload-status').className = 'alert alert-info small p-2 d-block w-50 mt-2';
    document.getElementById('upload-status').innerText = 'Lendo arquivo...';
    document.getElementById('upload-progress-container').classList.remove('d-none');

    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) { 
            let rawData = results.data; let cleanData = []; let total = rawData.length;
            for (let i = 0; i < total; i++) {
                let row = rawData[i];
                if (!row["Nome da Instituição"] && !row["Nome"]) continue;
                
                document.getElementById('upload-progress-bar').style.width = `${((i+1)/total)*100}%`;
                let coords = await geocodeAddressGoogle(row["Endereço"] || "", row["Município"] || "Rio de Janeiro");
                await sleep(50); 

                cleanData.push({
                    id: i + 2000, nome: row["Nome da Instituição"] || row["Nome"], municipio: row["Município"] || "", regiao: row["Região"] || "", natureza: row["Natureza Administrativa"] || "", situacao: row["Situação"] || "", endereco: row["Endereço"] || "", funcionamento: row["Funcionamento"] || "", ingresso: row["Valor do Ingresso"] || "", gratuidades: row["Gratuidades"] || "", educativo: row["Setor Educativo"] || "", acervo: row["Acervo Predominante"] || "", museologo: row["Museólogo"] || "", acessibilidade: row["Acessibilidade"] || "", historico: row["Histórico"] || "",
                    lat: coords ? coords.lat : null, lng: coords ? coords.lng : null
                });
            }
            museumsData = cleanData; renderMuseums(museumsData);
            document.getElementById('upload-status').className = 'alert alert-success small p-2 d-block w-50 mt-2';
            document.getElementById('upload-status').innerText = `Concluído! ${cleanData.length} lidos.`;
        }
    });
});

// LISTA DE MUSEUS SEM PIN
function updatePendingList() {
    const list = document.getElementById('pending-list'); 
    if(!list) return;
    list.innerHTML = '';
    const pendings = museumsData.filter(m => !m.lat || !m.lng);
    document.getElementById('pendingCount').innerText = pendings.length;
    pendings.forEach(m => {
        list.innerHTML += `<div class="pending-item d-flex justify-content-between"><div><strong>${m.nome}</strong><br><small>${m.municipio}</small></div><button class="btn btn-sm btn-warning" onclick="openAdminMapPicker(${m.id})">Mapear</button></div>`;
    });
}

// MAPA DO GESTOR MANUAL
let adminMapInstance, adminTempMarker, currentMappingId;
window.openAdminMapPicker = function(id) {
    const m = museumsData.find(x => x.id === id); if(!m) return;
    currentMappingId = id; document.getElementById('adminMapTitle').innerText = m.nome;
    document.getElementById('adminMapSearchInput').value = `${m.endereco}, ${m.municipio}, RJ`;
    new bootstrap.Modal(document.getElementById('adminMapModal')).show();

    document.getElementById('adminMapModal').addEventListener('shown.bs.modal', function () {
        if (!adminMapInstance) {
            adminMapInstance = new google.maps.Map(document.getElementById('adminLeafletMap'), {
                center: { lat: -22.9068, lng: -43.1729 }, zoom: 8, restriction: { latLngBounds: RJ_BOUNDS, strictBounds: false }
            });
            adminMapInstance.addListener('click', e => {
                if (adminTempMarker) adminTempMarker.setMap(null);
                adminTempMarker = new google.maps.Marker({ position: e.latLng, map: adminMapInstance });
            });
        }
        google.maps.event.trigger(adminMapInstance, 'resize');
    }, { once: true });
}

window.searchAddressOnAdminMap = function() {
    const query = document.getElementById('adminMapSearchInput').value;
    geocoder.geocode({ address: query, componentRestrictions: { country: 'BR', administrativeArea: 'RJ' } }, (results, status) => {
        if (status === 'OK' && results[0]) {
            adminMapInstance.setCenter(results[0].geometry.location); adminMapInstance.setZoom(17);
            if (adminTempMarker) adminTempMarker.setMap(null);
            adminTempMarker = new google.maps.Marker({ position: results[0].geometry.location, map: adminMapInstance });
        } else alert("Endereço não encontrado.");
    });
}

window.saveAdminPin = function() {
    if (!adminTempMarker) return alert("Clique no mapa.");
    const m = museumsData.find(x => x.id === currentMappingId);
    if(m) { m.lat = adminTempMarker.getPosition().lat(); m.lng = adminTempMarker.getPosition().lng(); renderMuseums(museumsData); bootstrap.Modal.getInstance(document.getElementById('adminMapModal')).hide(); }
}