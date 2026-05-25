// --- VARIÁVEIS GLOBAIS ---
let map;
let markersArray = [];
let museumsData = [];
let currentFilteredData = [];
let pendingApprovals = [];
let profileModal;
let approvalModal;

// =====================================================================
// 1. CONFIGURAÇÃO FIREBASE (Apenas Login)
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
                document.getElementById('btn-nav-sair').classList.remove('d-none');
                
                if(document.getElementById('userEmailDisplay')) document.getElementById('userEmailDisplay').innerText = user.email;
                if(document.getElementById('perfil-email')) document.getElementById('perfil-email').innerText = user.email;
                
                if(document.getElementById('google-login-area')) document.getElementById('google-login-area').classList.add('d-none');
                if(document.getElementById('logged-in-area')) document.getElementById('logged-in-area').classList.remove('d-none');
            } else {
                document.getElementById('nav-meu-perfil').classList.add('d-none');
                document.getElementById('btn-nav-entrar').classList.remove('d-none');
                document.getElementById('btn-nav-sair').classList.add('d-none');
                
                if(document.getElementById('google-login-area')) document.getElementById('google-login-area').classList.remove('d-none');
                if(document.getElementById('logged-in-area')) document.getElementById('logged-in-area').classList.add('d-none');
            }
        });
    }
} catch (error) { console.error("Erro Firebase:", error); }

// =====================================================================
// 2. CONFIGURAÇÃO LEAFLET E ENDEREÇOS
// =====================================================================
const allMunicipalitiesRJ = ["Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios", "Arraial do Cabo", "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim", "Bom Jesus do Itabapoana", "Cabo Frio", "Cachoeiras de Macacu", "Cambuci", "Campos dos Goytacazes", "Cantagalo", "Carapebus", "Cardoso Moreira", "Carmo", "Casimiro de Abreu", "Comendador Levy Gasparian", "Conceição de Macabu", "Cordeiro", "Duas Barras", "Duque de Caxias", "Engenheiro Paulo de Frontin", "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara", "Itaperuna", "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco", "Magé", "Mangaratiba", "Maricá", "Mendes", "Mesquita", "Miguel Pereira", "Miracema", "Natividade", "Nilópolis", "Niterói", "Nova Friburgo", "Nova Iguaçu", "Paracambi", "Paraíba do Sul", "Paraty", "Paty do Alferes", "Petrópolis", "Pinheiral", "Piraí", "Porciúncula", "Porto Real", "Quatis", "Queimados", "Quissamã", "Resende", "Rio Bonito", "Rio das Flores", "Rio das Ostras", "Rio de Janeiro", "Rio Claro", "Santa Maria Madalena", "Santo Antônio de Pádua", "São Fidélis", "São Francisco de Itabapoana", "São Gonçalo", "São João da Barra", "São João de Meriti", "São José de Ubá", "São José do Vale do Rio Preto", "São Pedro da Aldeia", "São Sebastião do Alto", "Sapucaia", "Saquarema", "Seropédica", "Silva Jardim", "Sumidouro", "Tanguá", "Teresópolis", "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai", "Vassouras", "Volta Redonda"];

const normalizeString = (str) => { if(!str) return ""; return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); };

function initMapSystem() {
    map = L.map('map').setView([-22.9068, -43.1729], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    
    const filterSelect = document.getElementById('filterMunicipio');
    const formSelect = document.getElementById('regMuni');
    filterSelect.innerHTML = '<option value="">Todos os 92 Municípios</option>';
    formSelect.innerHTML = '<option value="">Selecione...</option>';
    allMunicipalitiesRJ.sort().forEach(city => { 
        filterSelect.appendChild(new Option(city, city)); formSelect.appendChild(new Option(city, city)); 
    });

    if(museumsData.length === 0) renderMuseums([]); 
}

// Mostrar/Ocultar Zonas
window.verificarRegiaoMetropolitana = function(valor) {
    const divZonas = document.getElementById('divZonasRio');
    if (valor === 'Metropolitana I') {
        divZonas.classList.remove('d-none');
    } else {
        divZonas.classList.add('d-none');
        document.getElementById('regZonaRio').value = "";
    }
}

// Busca CEP Automática
window.buscarCep = async function(cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        if (!data.erro) {
            document.getElementById('regLogradouro').value = data.logradouro;
            document.getElementById('regMuni').value = data.localidade;
        } else {
            alert("CEP não encontrado. Por favor, digite manualmente.");
        }
    } catch (error) { console.error("Erro no CEP:", error); }
}

// Nominatim OpenStreetMap (Substitui Google)
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
    
    if(viewId === 'home' && map) {
        setTimeout(() => { map.invalidateSize(); map.setView([-22.9068, -43.1729], 8); }, 200);
    }
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

// Solicitação de Acesso (Mock para o Gestor)
window.enviarSolicitacaoAcesso = function() {
    const nome = document.getElementById('solicitacaoNome').value;
    const email = document.getElementById('solicitacaoEmail').value;
    const resp = document.getElementById('solicitacaoResponsavel').value;
    
    if(!nome || !email || !resp) return alert("Preencha todos os campos.");
    
    alert("Solicitação enviada com sucesso! A equipe do SIM-RJ analisará o pedido e enviará as credenciais para o e-mail oficial.");
    document.getElementById('solicitacaoNome').value = '';
    document.getElementById('solicitacaoEmail').value = '';
    document.getElementById('solicitacaoResponsavel').value = '';
}

// --- WIZARD FORM ---
window.nextStep = function(step) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-dot').forEach((el, index) => {
        if(index < step) el.classList.add('active'); else el.classList.remove('active');
    });
    document.getElementById('step' + step).classList.add('active');
}
window.prevStep = function(step) { nextStep(step); }

// --- ENVIAR FICHA DE CADASTRO (DJANGO) ---
window.submitMuseumRegistration = function() {
    const nome = document.getElementById('regNome').value;
    const municipio = document.getElementById('regMuni').value;
    
    const cep = document.getElementById('regCep').value;
    const logradouro = document.getElementById('regLogradouro').value;
    const numero = document.getElementById('regNumero').value;
    const complemento = document.getElementById('regComplemento').value;
    
    if(!nome || !municipio || !logradouro || !numero) return alert("Preencha Nome, Município, Logradouro e Número.");

    // Montando o Endereço completo para o Django (Enquanto o backend não cria os campos separados)
    const enderecoCompleto = `${logradouro}, ${numero} - ${complemento}. CEP: ${cep}`;
    const email = document.getElementById('perfil-email').innerText || "teste@teste.com";
    
    // Pega a zona do dropdown manual
    const zonaManual = document.getElementById('regZonaRio').value;

    const dadosMuseu = {
        nome_instituicao: nome,
        sigla: document.getElementById('regSigla').value,
        cnpj: document.getElementById('regCnpj').value,
        documento_criacao: document.getElementById('regDoc').value,
        endereco: enderecoCompleto,
        municipio: municipio,
        regiao: document.getElementById('regRegiao').value,
        zona: zonaManual,
        telefone_institucional: document.getElementById('regTel').value,
        email_institucional: document.getElementById('regEmailInst').value,
        natureza: document.getElementById('regNatureza').value,
        situacao: document.getElementById('regStatus').value,
        ingresso: document.getElementById('regIngresso').value,
        acervo: document.getElementById('regAcervo').value,
        email_responsavel: email
    };

    fetch('http://localhost:8000/api/museus/cadastrar/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosMuseu)
    }).then(resposta => {
        if (resposta.ok) {
            alert("Ficha registrada com sucesso!\nEnviada para análise da equipe do SIM-RJ.");
            document.querySelectorAll('.wizard-container input, .wizard-container textarea').forEach(el => el.value = '');
            switchView('home'); 
        } else {
            alert("Ocorreu um erro ao salvar no banco.");
        }
    }).catch(erro => { console.error("Erro API:", erro); alert("Erro ao conectar ao servidor Django."); });
}

// --- RENDERIZAR MAPA E LISTA (LEAFLET + ORDEM ALFABÉTICA) ---
function renderMuseums(data) {
    // Ordenar Alfabeticamente
    data.sort((a, b) => a.nome.localeCompare(b.nome));

    const tableContainer = document.getElementById('container-lista-museus');
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

// --- FILTROS SIMPLES ---
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
    document.getElementById('modalMunicipio').innerHTML = m.municipio || 'Sem município';
    profileModal.show();
}

// --- ADMIN E GESTÃO ---
window.openLogin = function() { document.getElementById('login-overlay').style.display = 'flex'; }
window.closeLogin = function() { document.getElementById('login-overlay').style.display = 'none'; }

window.checkAdminPassword = function() {
    if(document.getElementById('adminPassword').value === 'simrj') { 
        document.getElementById('admin-panel').style.display = 'block'; 
        closeLogin(); 
    } else alert('Senha incorreta.');
}
window.closeAdmin = function() { document.getElementById('admin-panel').style.display = 'none'; }

// MAPA DO GESTOR MANUAL (Leaflet)
let adminMapInstance, adminTempMarker, currentMappingId;
window.openAdminMapPicker = function(id) {
    const m = museumsData.find(x => x.id === id); if(!m) return;
    currentMappingId = id;
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
    }, 300);
}
window.saveAdminPin = function() {
    if (!adminTempMarker) return alert("Clique no mapa.");
    const m = museumsData.find(x => x.id === currentMappingId);
    if(m) { 
        m.lat = adminTempMarker.getLatLng().lat; 
        m.lng = adminTempMarker.getLatLng().lng; 
        renderMuseums(museumsData); 
        bootstrap.Modal.getInstance(document.getElementById('adminMapModal')).hide(); 
    }
}