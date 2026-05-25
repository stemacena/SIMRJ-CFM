// --- VARIÁVEIS GLOBAIS ---
let map;
let markersArray = [];
let museumsData = [];
let currentFilteredData = [];
let pendingApprovals = [];
let profileModal;
let approvalModal;

// =====================================================================
// 1. CONFIGURAÇÃO FIREBASE (Somente Login)
// =====================================================================
const firebaseConfig = {
     apiKey: "AIzaSyBm0bjZc1OzDI6kBOEiJJNRaayxPCt-j1E",
    authDomain: "bd-ecoa.firebaseapp.com",
    databaseURL: "https://bd-ecoa-default-rtdb.firebaseio.com",
    projectId: "bd-ecoa",
    storageBucket: "bd-ecoa.firebasestorage.app",
    messagingSenderId: "65380488244",
    appId: "1:65380488244:web:647f588e1f2059727c6661",
    measurementId: "G-GHK5XDX2E3"
};

let db;
try {
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "COLE_SUA_API_KEY_AQUI") {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();

        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                document.getElementById('nav-meu-perfil').classList.remove('d-none');
                document.getElementById('btn-nav-entrar').classList.add('d-none');
                if(document.getElementById('userEmailDisplay')) document.getElementById('userEmailDisplay').innerText = user.email;
                if(document.getElementById('perfil-email')) document.getElementById('perfil-email').innerText = user.email;
                if(document.getElementById('logged-in-area')) document.getElementById('logged-in-area').classList.remove('d-none');
            } else {
                document.getElementById('nav-meu-perfil').classList.add('d-none');
                document.getElementById('btn-nav-entrar').classList.remove('d-none');
                if(document.getElementById('logged-in-area')) document.getElementById('logged-in-area').classList.add('d-none');
            }
        });
    }
} catch (error) { console.error("Erro Firebase:", error); }

// =====================================================================
// 2. LEAFLET E NOMINATIM/VIACEP
// =====================================================================
const normalizeString = (str) => { if(!str) return ""; return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); };

function initMapSystem() {
    map = L.map('map').setView([-22.9068, -43.1729], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    if(museumsData.length === 0) renderMuseums([]); 
}

window.verificarRegiaoMetropolitana = function(valor) {
    const divZonas = document.getElementById('divZonasRio');
    if (valor === 'Metropolitana I') divZonas.classList.remove('d-none');
    else { divZonas.classList.add('d-none'); document.getElementById('regZonaRio').value = ""; }
}

// BUSCA DE CEP AUTOMÁTICA (Para Gestor e Solicitação)
window.buscarCep = async function(prefixo, cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        if (!data.erro) {
            document.getElementById(`${prefixo}Logradouro`).value = data.logradouro;
            if(document.getElementById(`${prefixo}Muni`)) document.getElementById(`${prefixo}Muni`).value = data.localidade;
            if(document.getElementById(`${prefixo}Municipio`)) document.getElementById(`${prefixo}Municipio`).value = data.localidade;
        } else alert("CEP não encontrado. Por favor, digite manualmente.");
    } catch (error) { console.error("Erro no CEP:", error); }
}

window.geocodeAddressNominatim = async function(logradouro, numero, municipio, cep) {
    const query = `${logradouro}, ${numero}, ${municipio}, RJ, Brasil, ${cep}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        return null;
    } catch (error) { return null; }
}

// --- SPA NAVEGAÇÃO E PLACEHOLDERS ---
window.switchView = function(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';
    if(viewId === 'home' && map) { setTimeout(() => { map.invalidateSize(); map.setView([-22.9068, -43.1729], 8); }, 200); }
}
window.showPlaceholder = function(titleText) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById('view-em-construcao').style.display = 'block';
    document.getElementById('construcao-title').innerText = titleText;
}

// --- FIREBASE LOGIN ---
window.loginWithEmail = function() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    if(!email || !pass) return document.getElementById('loginErrorMsg').innerText = "Preencha e-mail e senha.";
    firebase.auth().signInWithEmailAndPassword(email, pass)
        .catch(err => document.getElementById('loginErrorMsg').innerText = "Usuário ou senha incorretos.");
}
window.logoutUser = function() { firebase.auth().signOut().then(() => { switchView('home'); alert("Desconectado com sucesso."); }); }

// --- WIZARD FORM ---
window.nextStep = function(step) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-dot').forEach((el, index) => { if(index < step) el.classList.add('active'); else el.classList.remove('active'); });
    document.getElementById('step' + step).classList.add('active');
}
window.prevStep = function(step) { nextStep(step); }

// =====================================================================
// FLUXO 1: SOLICITAÇÃO DE ACESSO COMPLETA (PÚBLICO -> GESTOR)
// =====================================================================
window.enviarSolicitacaoAcesso = function() {
    const logradouro = document.getElementById('solLogradouro').value;
    const numero = document.getElementById('solNumero').value;
    const complemento = document.getElementById('solComplemento').value;
    const cep = document.getElementById('solCep').value;
    const municipio = document.getElementById('solMuni').value;
    const nome = document.getElementById('solNome').value;

    if(!nome || !logradouro || !numero || !cep || !municipio) return alert("Preencha todos os campos obrigatórios (*).");

    const req = {
        id: Date.now(),
        nome: nome,
        email_institucional: document.getElementById('solEmail').value,
        nome_responsavel: document.getElementById('solResp').value,
        municipio: municipio,
        regiao: document.getElementById('solRegiao').value,
        natureza: document.getElementById('solNat').value,
        situacao: document.getElementById('solStatus').value,
        acervo: document.getElementById('solAcervo').value,
        telefone_institucional: document.getElementById('solTel').value,
        // Concatena para o painel antigo não quebrar
        endereco: `${logradouro}, ${numero} - ${complemento}. CEP: ${cep}`
    };

    pendingApprovals.push(req);
    renderApprovalsList(); // Atualiza painel do Gestor na hora!

    alert("Sua ficha foi enviada para a Secretaria de Museus com sucesso!\nNossa equipe analisará os dados e você receberá as credenciais de login no seu e-mail.");
    
    // Limpa form
    document.getElementById('solNome').value = '';
    document.getElementById('solCep').value = '';
    document.getElementById('solLogradouro').value = '';
    document.getElementById('solNumero').value = '';
    switchView('home');
}

// =====================================================================
// FLUXO 2: CADASTRO MANUAL (GESTOR)
// =====================================================================
window.submitAdminManual = async function() {
    const nome = document.getElementById('admNome').value;
    const logradouro = document.getElementById('admLogradouro').value;
    const numero = document.getElementById('admNumero').value;
    const cep = document.getElementById('admCep').value;
    const municipio = document.getElementById('admMunicipio').value;

    if(!nome || !logradouro) return alert("O Nome e o Logradouro são obrigatórios.");

    let coords = await geocodeAddressNominatim(logradouro, numero, municipio, cep);

    const manualMuseum = {
        id: Date.now(),
        nome: nome,
        sigla: document.getElementById('admSigla').value,
        cnpj: document.getElementById('admCnpj').value,
        municipio: municipio,
        endereco: `${logradouro}, ${numero} - ${document.getElementById('admComplemento').value}. CEP: ${cep}`,
        regiao: document.getElementById('admRegiao').value,
        zona: document.getElementById('admZonaRio').value,
        natureza: document.getElementById('admNat').value,
        situacao: document.getElementById('admStatus').value,
        lat: coords ? coords.lat : null, 
        lng: coords ? coords.lng : null
    };

    museumsData.push(manualMuseum);
    renderMuseums(museumsData);
    alert("Instituição salva diretamente no banco público!");
    document.getElementById('admNome').value = '';
    document.getElementById('admLogradouro').value = '';
}

// =====================================================================
// RENDERIZAÇÃO MAPA E LISTA
// =====================================================================
function renderMuseums(data) {
    // Ordem Alfabética!
    data.sort((a, b) => a.nome.localeCompare(b.nome));

    const listContainer = document.getElementById('museum-list');
    const tableContainer = document.getElementById('container-lista-museus');
    if(listContainer) listContainer.innerHTML = '';
    if(tableContainer) tableContainer.innerHTML = '';
    
    markersArray.forEach(m => map.removeLayer(m)); markersArray = [];
    if(document.getElementById('resultCount')) document.getElementById('resultCount').innerText = data.length;
    if(document.getElementById('count-total')) document.getElementById('count-total').innerText = museumsData.length;

    let tableHTML = `<div class="table-responsive"><table class="table table-hover table-bordered align-middle"><thead class="table-dark"><tr><th>Instituição</th><th>Município</th><th>Tipologia do Acervo</th><th>Situação</th><th></th></tr></thead><tbody id="table-body-lista">`;

    data.forEach(museum => {
        const hasPin = museum.lat && museum.lng; 
        
        tableHTML += `<tr class="tr-lista-item"><td class="fw-bold td-nome">${museum.nome}</td><td>${museum.municipio || '-'}</td><td>${museum.acervo || '-'}</td><td><span class="badge bg-secondary">${museum.situacao || 'Desconhecido'}</span></td><td><button class="btn btn-sm btn-primary" onclick="openProfile(${museum.id})">Abrir Ficha</button></td></tr>`;

        if (hasPin) {
            const marker = L.marker([museum.lat, museum.lng]).addTo(map);
            marker.bindPopup(`<div style="padding: 5px;"><h6 class="fw-bold">${museum.nome}</h6><button class="btn btn-sm btn-warning w-100 mt-2" onclick="openProfile(${museum.id})">Ver Ficha</button></div>`);
            markersArray.push(marker);
        }
    });

    tableHTML += `</tbody></table></div>`;
    if(tableContainer && data.length > 0) tableContainer.innerHTML = tableHTML;
}

window.filterList = function() {
    let input = normalizeString(document.getElementById('searchLista').value);
    let rows = document.querySelectorAll('.tr-lista-item');
    rows.forEach(row => { row.style.display = normalizeString(row.querySelector('.td-nome').innerText).includes(input) ? '' : 'none'; });
}

window.applyFilters = function() {
    const term = normalizeString(document.getElementById('searchName').value);
    const filtered = museumsData.filter(m => {
        if (term && !normalizeString(m.nome).includes(term)) return false;
        return true;
    });
    renderMuseums(filtered);
}
window.resetFilters = function() { renderMuseums(museumsData); }

window.openProfile = function(id) {
    if(!profileModal) profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    const m = museumsData.find(x => x.id === id); if(!m) return;
    document.getElementById('modalTitle').innerText = m.nome;
    document.getElementById('modalEndereco').innerHTML = m.endereco || 'Sem endereço';
    profileModal.show();
}

// --- ADMIN E GESTÃO ---
window.openLogin = function() { document.getElementById('login-overlay').style.display = 'flex'; }
window.closeLogin = function() { document.getElementById('login-overlay').style.display = 'none'; }

window.checkAdminPassword = function() {
    if(document.getElementById('adminPassword').value === 'simrj') { 
        document.getElementById('admin-panel').style.display = 'block'; 
        closeLogin(); renderApprovalsList(); 
    } else alert('Senha incorreta.');
}
window.closeAdmin = function() { document.getElementById('admin-panel').style.display = 'none'; }

function renderApprovalsList() {
    const list = document.getElementById('requests-list');
    document.getElementById('reqCount').innerText = pendingApprovals.length;
    list.innerHTML = '';
    if(pendingApprovals.length === 0) return list.innerHTML = '<div class="alert alert-success small">Nenhuma ficha recebida até o momento.</div>';
    pendingApprovals.forEach(req => { list.innerHTML += `<div class="req-item shadow-sm"><div class="d-flex justify-content-between align-items-center"><div><h6 class="fw-bold mb-1">${req.nome}</h6><small class="text-muted d-block"><i class="bi bi-geo-alt"></i> ${req.municipio} | <i class="bi bi-person"></i> ${req.nome_responsavel}</small></div><div><button class="btn btn-sm btn-success" onclick="approveRequest(${req.id})"><i class="bi bi-check"></i> Aprovar</button></div></div></div>`; });
}
window.approveRequest = async function(id) {
    const reqIndex = pendingApprovals.findIndex(r => r.id === id); if(reqIndex === -1) return;
    const m = pendingApprovals[reqIndex];
    pendingApprovals.splice(reqIndex, 1); museumsData.push(m); renderApprovalsList(); renderMuseums(museumsData); alert(`${m.nome} aprovado e adicionado à base!`);
}