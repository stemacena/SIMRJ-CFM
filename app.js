// --- VARIÁVEIS GLOBAIS ---
let map;
let markersArray = [];
let infoWindow;
let geocoder;
let museumsData = [];
let pendingApprovals = [];
let profileModal;
let approvalModal;

// =====================================================================
// 1. CONFIGURAÇÃO FIREBASE
// Substitua APENAS os valores entre as aspas pelas suas chaves.
// Não cole linhas com "import" ou "initializeApp" aqui.
// =====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyA29Y-lCBjTLe_vhB9B6U-VJZn1ajOXSxw",
    authDomain: "bd-ecoa.firebaseapp.com",
    projectId: "bd-ecoa",
    storageBucket: "bd-ecoa.firebasestorage.app",
    messagingSenderId: "65380488244",
    appId: "1:65380488244:web:647f588e1f2059727c6661"
};

// Inicialização segura do Firebase
let db;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
    }
} catch (error) {
    console.error("Erro ao conectar com Firebase:", error);
}
// =====================================================================
// 2. CONFIGURAÇÃO GOOGLE MAPS E LIMITES
// =====================================================================
const RJ_BOUNDS = { north: -20.76, south: -23.39, west: -44.89, east: -40.96 };
const defaultRjCenter = [-22.9, -43.2]; 

const allMunicipalitiesRJ = ["Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios", "Arraial do Cabo", "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim", "Bom Jesus do Itabapoana", "Cabo Frio", "Cachoeiras de Macacu", "Cambuci", "Campos dos Goytacazes", "Cantagalo", "Carapebus", "Cardoso Moreira", "Carmo", "Casimiro de Abreu", "Comendador Levy Gasparian", "Conceição de Macabu", "Cordeiro", "Duas Barras", "Duque de Caxias", "Engenheiro Paulo de Frontin", "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara", "Itaperuna", "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco", "Magé", "Mangaratiba", "Maricá", "Mendes", "Mesquita", "Miguel Pereira", "Miracema", "Natividade", "Nilópolis", "Niterói", "Nova Friburgo", "Nova Iguaçu", "Paracambi", "Paraíba do Sul", "Paraty", "Paty do Alferes", "Petrópolis", "Pinheiral", "Piraí", "Porciúncula", "Porto Real", "Quatis", "Queimados", "Quissamã", "Resende", "Rio Bonito", "Rio das Flores", "Rio das Ostras", "Rio de Janeiro", "Rio Claro", "Santa Maria Madalena", "Santo Antônio de Pádua", "São Fidélis", "São Francisco de Itabapoana", "São Gonçalo", "São João da Barra", "São João de Meriti", "São José de Ubá", "São José do Vale do Rio Preto", "São Pedro da Aldeia", "São Sebastião do Alto", "Sapucaia", "Saquarema", "Seropédica", "Silva Jardim", "Sumidouro", "Tanguá", "Teresópolis", "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai", "Vassouras", "Volta Redonda"];

const normalizeString = (str) => {
    if(!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

function initMapSystem() {
    geocoder = new google.maps.Geocoder();
    infoWindow = new google.maps.InfoWindow();

    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -22.9068, lng: -43.1729 }, zoom: 8, mapTypeControl: false, streetViewControl: false,
        restriction: { latLngBounds: RJ_BOUNDS, strictBounds: false }
    });

    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));
    
    const filterSelect = document.getElementById('filterMunicipio');
    const formSelect = document.getElementById('regMuni');
    filterSelect.innerHTML = '<option value="">Todos os 92 Municípios</option>';
    formSelect.innerHTML = '<option value="">Selecione...</option>';
    allMunicipalitiesRJ.sort().forEach(city => { 
        filterSelect.appendChild(new Option(city, city)); 
        formSelect.appendChild(new Option(city, city)); 
    });

    if(museumsData.length === 0) renderMuseums([]); 
}

function geocodeAddressGoogle(endereco, municipio) {
    return new Promise((resolve) => {
        let addressStr = `${endereco}, ${municipio}`;
        geocoder.geocode({ 
            address: addressStr, componentRestrictions: { country: 'BR', administrativeArea: 'RJ', locality: municipio }
        }, (results, status) => {
            if (status === 'OK' && results[0]) resolve({ lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() });
            else {
                geocoder.geocode({ address: addressStr, componentRestrictions: { country: 'BR', administrativeArea: 'RJ' } }, (results2, status2) => {
                    if (status2 === 'OK' && results2[0]) resolve({ lat: results2[0].geometry.location.lat(), lng: results2[0].geometry.location.lng() });
                    else resolve(null);
                });
            }
        });
    });
}

// --- SPA NAVEGAÇÃO ---
window.switchView = function(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';

    if(viewId === 'cfm-mapa' && map) {
        setTimeout(() => { google.maps.event.trigger(map, 'resize'); map.setCenter({ lat: -22.9068, lng: -43.1729 }); }, 200);
    }
}

// --- FIREBASE AUTH & LOGIN ---
window.signInWithGoogle = function() {
    if (!db) {
        alert("A chave do Firebase não foi configurada ou houve erro na conexão. Simulando login para teste visual.");
        document.getElementById('google-login-area').classList.add('d-none');
        document.getElementById('logged-in-area').classList.remove('d-none');
        document.getElementById('userEmailDisplay').innerText = "teste.google@museus.rj.gov.br";
        return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            document.getElementById('google-login-area').classList.add('d-none');
            document.getElementById('logged-in-area').classList.remove('d-none');
            document.getElementById('userEmailDisplay').innerText = result.user.email;
        }).catch((error) => {
            console.error("Erro no login:", error);
            document.getElementById('loginErrorMsg').innerText = `Falha no login: ${error.message}`;
        });
}

window.simulateEmailLogin = function() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    if(!email || !pass) {
        document.getElementById('loginErrorMsg').innerText = "Preencha e-mail e senha institucionais.";
        return;
    }
    
    document.getElementById('google-login-area').classList.add('d-none');
    document.getElementById('logged-in-area').classList.remove('d-none');
    document.getElementById('userEmailDisplay').innerText = email;
}

window.nextStep = function(step) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-dot').forEach((el, index) => {
        if(index < step) el.classList.add('active'); else el.classList.remove('active');
    });
    document.getElementById('step' + step).classList.add('active');
}
window.prevStep = function(step) { nextStep(step); }

// --- FLUXO DE REQUISIÇÃO DE CADASTRO ---
window.submitMuseumRegistration = function() {
    const nome = document.getElementById('regNome').value;
    const endereco = document.getElementById('regEndereco').value;
    const municipio = document.getElementById('regMuni').value;
    
    if(!nome || !endereco || !municipio) return alert("Preencha Nome, Município e Endereço obrigatórios na Etapa 2.");

    const email = document.getElementById('userEmailDisplay').innerText;

    const req = {
        id: Date.now(),
        email_responsavel: email,
        nome: nome,
        sigla: document.getElementById('regSigla').value,
        cnpj: document.getElementById('regCnpj').value,
        documento_criacao: document.getElementById('regDoc').value,
        municipio: municipio,
        endereco: endereco,
        regiao: document.getElementById('regRegiao').value,
        natureza: document.getElementById('regNatureza').value,
        telefone: document.getElementById('regTel').value,
        site: document.getElementById('regSite').value,
        instagram: document.getElementById('regInsta').value,
        facebook: document.getElementById('regFace').value,
        situacao: document.getElementById('regStatus').value,
        funcionamento: document.getElementById('regFunc').value,
        ingresso: document.getElementById('regIngresso').value,
        acervo: document.getElementById('regAcervo').value,
        museologo: document.getElementById('regMus').value,
        educativo: document.getElementById('regEdu').value,
        acessibilidade: document.getElementById('regAccess').value,
        gratuidades: document.getElementById('regGrat').value,
        historico: document.getElementById('regHist').value,
        lat: null, lng: null
    };

    pendingApprovals.push(req);
    
    if(db) {
        db.collection("requisicoes").add(req).catch((e) => console.error("Erro no DB", e));
    }

    alert("Dados registrados com sucesso!\nSua requisição foi enviada para a análise da equipe do SIM-RJ.");
    
    document.querySelectorAll('.wizard-container input, .wizard-container textarea').forEach(el => el.value = '');
    document.querySelectorAll('.wizard-container select').forEach(el => el.selectedIndex = 0);
    nextStep(1);
    switchView('home');
    renderApprovalsList(); 
}

// --- RENDERIZAR MAPA E LISTA ---
function renderMuseums(data) {
    const listContainer = document.getElementById('museum-list');
    const tableContainer = document.getElementById('container-lista-museus');
    
    if(listContainer) listContainer.innerHTML = '';
    if(tableContainer) tableContainer.innerHTML = '';
    
    markersArray.forEach(m => m.setMap(null)); markersArray = [];
    
    if(document.getElementById('resultCount')) document.getElementById('resultCount').innerText = data.length;
    if(document.getElementById('count-total')) document.getElementById('count-total').innerText = museumsData.length;

    let tableHTML = `<div class="table-responsive"><table class="table table-hover table-bordered align-middle">
        <thead class="table-dark"><tr><th>Instituição</th><th>Município</th><th>Natureza</th><th>Situação</th><th>Ação</th></tr></thead><tbody>`;

    data.forEach(museum => {
        const hasPin = museum.lat && museum.lng; 
        
        if(listContainer) {
            const card = document.createElement('div');
            card.className = 'col-md-6 mb-3';
            card.innerHTML = `
                <div class="card h-100 museum-card bg-white">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-secondary">${museum.regiao || 'Sem Região'}</span>
                        </div>
                        <h5 class="card-title text-dark fw-bold mb-1">${museum.nome}</h5>
                        <p class="card-text small text-muted mb-1"><i class="bi bi-geo-alt-fill text-danger"></i> ${museum.municipio}</p>
                        ${!hasPin ? '<span class="badge bg-warning text-dark mb-2"><i class="bi bi-exclamation-triangle-fill"></i> Sem Pin no Mapa</span>' : ''}
                        <div class="mt-2"><button class="btn btn-sm btn-outline-primary" onclick="openProfile(${museum.id})">Detalhes</button></div>
                    </div>
                </div>`;
            listContainer.appendChild(card);
        }

        tableHTML += `<tr>
            <td class="fw-bold">${museum.nome}</td>
            <td>${museum.municipio}</td>
            <td>${museum.natureza || '-'}</td>
            <td><span class="badge ${museum.situacao && museum.situacao.includes('Aberto') ? 'bg-success' : 'bg-secondary'}">${museum.situacao || 'Desconhecido'}</span></td>
            <td><button class="btn btn-sm btn-primary" onclick="openProfile(${museum.id})">Abrir Ficha</button></td>
        </tr>`;

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

    tableHTML += `</tbody></table></div>`;
    if(tableContainer && data.length > 0) tableContainer.innerHTML = tableHTML;
    else if(tableContainer) tableContainer.innerHTML = "<div class='alert alert-secondary'>Nenhuma instituição mapeada ainda.</div>";

    updatePendingList();
}

// --- FILTROS ---
function getCheckedValues(className) {
    return Array.from(document.querySelectorAll('.' + className + ':checked')).map(cb => normalizeString(cb.value));
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
    const textGratuidade = normalizeString(document.getElementById('searchGratuidade').value);
    const textAccess = normalizeString(document.getElementById('searchAccess').value);

    const filtered = museumsData.filter(m => {
        const mNome = normalizeString(m.nome);
        const mMuni = normalizeString(m.municipio);
        const mRegiao = normalizeString(m.regiao);
        const mNat = normalizeString(m.natureza);
        const mAcervo = normalizeString(m.acervo);
        const mStatus = normalizeString(m.situacao);
        const mCost = normalizeString(m.ingresso);
        const mGrat = normalizeString(m.gratuidades);
        const mAcc = normalizeString(m.acessibilidade);

        if (term && !mNome.includes(term)) return false;
        if (filterHasMap === 'sim' && (!m.lat || !m.lng)) return false;
        if (filterHasMap === 'nao' && (m.lat && m.lng)) return false;
        if (selectedMuni && mMuni !== selectedMuni) return false;
        
        if (regions.length > 0 && !regions.some(v => mRegiao === v || mRegiao.includes(v))) return false;
        if (natures.length > 0 && !natures.some(v => mNat === v || mNat.includes(v))) return false;
        if (acervos.length > 0 && !acervos.some(v => mAcervo === v || mAcervo.includes(v))) return false;
        if (statusList.length > 0 && !statusList.some(v => mStatus === v || mStatus.includes(v))) return false;
        if (costs.length > 0 && !costs.some(v => mCost === v || mCost.includes(v))) return false;

        if (turnos.length > 0) {
            const funcText = normalizeString(m.funcionamento);
            if (!turnos.some(t => funcText.includes(t))) return false;
        }

        if (reqMuseologo && normalizeString(m.museologo) !== "sim") return false;
        if (reqEdu && normalizeString(m.educativo) !== "sim") return false;
        
        if (textGratuidade && !mGrat.includes(textGratuidade)) return false;
        if (textAccess && !mAcc.includes(textAccess)) return false;

        return true;
    });

    renderMuseums(filtered);
}

window.resetFilters = function() {
    document.querySelectorAll('.sidebar-filters input[type="text"], .sidebar-filters select').forEach(el => el.value = '');
    document.querySelectorAll('.sidebar-filters input[type="checkbox"]').forEach(cb => cb.checked = false);
    renderMuseums(museumsData);
}

// --- FICHA DO MUSEU ---
window.openProfile = function(id) {
    if(!profileModal) profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    
    const m = museumsData.find(x => x.id === id);
    if(!m) return;
    const val = (v) => v ? v : '<span class="text-muted fst-italic">Não informado</span>';

    document.getElementById('modalTitle').innerText = m.nome;
    
    const badge = document.getElementById('modalBadgeMuseologo');
    if (normalizeString(m.museologo) === "sim") badge.classList.remove('d-none'); else badge.classList.add('d-none');

    const alertPin = document.getElementById('modalAlertPin');
    if (!m.lat || !m.lng) alertPin.classList.remove('d-none'); else alertPin.classList.add('d-none');

    document.getElementById('modalEndereco').innerText = val(m.endereco);
    document.getElementById('modalMunicipio').innerText = val(m.municipio);
    document.getElementById('modalRegiao').innerText = val(m.regiao);
    document.getElementById('modalNatureza').innerText = val(m.natureza);
    document.getElementById('modalStatus').innerText = val(m.situacao);
    document.getElementById('modalTel').innerText = val(m.telefone);
    
    if(m.site) { document.getElementById('modalSite').href = m.site.startsWith('http') ? m.site : 'http://'+m.site; document.getElementById('modalSite').style.display = 'inline'; }
    else { document.getElementById('modalSite').style.display = 'none'; }

    document.getElementById('modalFunc').innerText = val(m.funcionamento);
    document.getElementById('modalIngresso').innerText = val(m.ingresso);
    document.getElementById('modalGratuidade').innerText = val(m.gratuidades);
    document.getElementById('modalEducativo').innerText = val(m.educativo);
    document.getElementById('modalAcervo').innerText = val(m.acervo);
    document.getElementById('modalAcessibilidade').innerHTML = val(m.acessibilidade);
    document.getElementById('modalHistorico').innerText = val(m.historico);
    
    profileModal.show();
}

// --- ADMIN E GESTÃO DE APROVAÇÕES ---
window.openLogin = function() { document.getElementById('login-overlay').style.display = 'flex'; }
window.closeLogin = function() { document.getElementById('login-overlay').style.display = 'none'; }
window.checkAdminPassword = function() {
    if(document.getElementById('adminPassword').value === 'simrj') {
        document.getElementById('admin-panel').style.display = 'block'; closeLogin();
        renderApprovalsList();
    } else alert('Senha incorreta.');
}
window.closeAdmin = function() { document.getElementById('admin-panel').style.display = 'none'; }

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
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="fw-bold mb-1">${req.nome}</h6>
                        <small class="text-muted d-block"><i class="bi bi-geo-alt"></i> ${req.municipio} | <i class="bi bi-person"></i> ${req.email_responsavel}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewApprovalDetails(${req.id})"><i class="bi bi-file-text"></i> Analisar Ficha</button>
                    </div>
                </div>
            </div>`;
    });
}

window.viewApprovalDetails = function(id) {
    const req = pendingApprovals.find(r => r.id === id);
    if(!req) return;

    if(!approvalModal) approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));

    const body = document.getElementById('approvalModalBody');
    body.innerHTML = `
        <h4 class="text-primary fw-bold">${req.nome}</h4>
        <p class="small text-muted mb-3">Solicitante: <strong>${req.email_responsavel}</strong></p>
        <div class="row small">
            <div class="col-md-6 mb-2"><strong>Município:</strong> ${req.municipio}</div>
            <div class="col-md-6 mb-2"><strong>Endereço:</strong> ${req.endereco}</div>
            <div class="col-md-6 mb-2"><strong>Natureza:</strong> ${req.natureza}</div>
            <div class="col-md-6 mb-2"><strong>Situação:</strong> ${req.situacao}</div>
            <div class="col-md-6 mb-2"><strong>Acervo:</strong> ${req.acervo}</div>
            <div class="col-md-6 mb-2"><strong>Ingresso:</strong> ${req.ingresso}</div>
        </div>
        <hr>
        <p class="small mb-1"><strong>Acessibilidade:</strong> ${req.acessibilidade || 'Nenhuma informada'}</p>
        <p class="small"><strong>Histórico:</strong> ${req.historico || 'Nenhum'}</p>
    `;

    document.getElementById('btnConfirmApprove').onclick = () => approveRequest(req.id);
    document.getElementById('btnRejectApprove').onclick = () => rejectRequest(req.id);

    approvalModal.show();
}

window.approveRequest = async function(id) {
    const reqIndex = pendingApprovals.findIndex(r => r.id === id);
    if(reqIndex === -1) return;
    
    const approvedMuseum = pendingApprovals[reqIndex];
    let coords = await geocodeAddressGoogle(approvedMuseum.endereco, approvedMuseum.municipio);
    approvedMuseum.lat = coords ? coords.lat : null;
    approvedMuseum.lng = coords ? coords.lng : null;

    pendingApprovals.splice(reqIndex, 1);
    museumsData.push(approvedMuseum);
    
    if(approvalModal) approvalModal.hide();
    renderApprovalsList();
    renderMuseums(museumsData);
    alert(`${approvedMuseum.nome} foi aprovado e integrado ao sistema público!`);
}

window.rejectRequest = function(id) {
    if(confirm("Deseja realmente rejeitar e apagar esta requisição?")) {
        pendingApprovals = pendingApprovals.filter(r => r.id !== id);
        if(approvalModal) approvalModal.hide();
        renderApprovalsList();
    }
}

// --- UPLOAD CSV ---
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
                    id: i + 2000, nome: row["Nome da Instituição"] || row["Nome"], municipio: row["Município"] || "", regiao: row["Região"] || "", natureza: row["Natureza Administrativa"] || "", situacao: row["Situação"] || "", endereco: row["Endereço"] || "", funcionamento: row["Funcionamento"] || "", ingresso: row["Valor do Ingresso"] || "", gratuidades: row["Gratuidades"] || "", educativo: row["Setor Educativo"] || "", acervo: row["Acervo Predominante"] || "", museologo: row["Museólogo"] || "", acessibilidade: row["Acessibilidade"] || "", historico: row["Histórico"] || "", telefone: row["Telefone"] || "", site: row["Site"] || "",
                    lat: coords ? coords.lat : null, lng: coords ? coords.lng : null
                });
            }
            museumsData = cleanData; renderMuseums(museumsData);
            document.getElementById('upload-status').className = 'alert alert-success small p-2 d-block w-50 mt-2';
            document.getElementById('upload-status').innerText = `Concluído! ${cleanData.length} lidos.`;
        }
    });
});

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

// --- MAPA DO GESTOR MANUAL ---
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