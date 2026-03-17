// --- VARIÁVEIS GLOBAIS ---
let map;
let markersArray = [];
let infoWindow;
let geocoder;
let museumsData = [];
let currentFilteredData = []; // Armazena os dados filtrados para gerar relatório XLS
let pendingApprovals = [];
let profileModal;
let approvalModal;

// =====================================================================
// 1. CONFIGURAÇÃO FIREBASE
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

        // AUTH LISTENER
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                document.getElementById('nav-meu-perfil').classList.remove('d-none');
                document.getElementById('btn-nav-entrar').classList.add('d-none');
                document.getElementById('btn-nav-sair').classList.remove('d-none');
                
                let displayName = user.displayName || "Usuário (Atualize sua ficha)";
                if(document.getElementById('userEmailDisplay')) document.getElementById('userEmailDisplay').innerText = user.email;
                if(document.getElementById('perfil-nome')) document.getElementById('perfil-nome').innerText = displayName;
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
// 2. CONFIGURAÇÃO GOOGLE MAPS E DICIONÁRIO DE ZONAS
// =====================================================================
const RJ_BOUNDS = { north: -20.76, south: -23.39, west: -44.89, east: -40.96 };

const allMunicipalitiesRJ = ["Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios", "Arraial do Cabo", "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim", "Bom Jesus do Itabapoana", "Cabo Frio", "Cachoeiras de Macacu", "Cambuci", "Campos dos Goytacazes", "Cantagalo", "Carapebus", "Cardoso Moreira", "Carmo", "Casimiro de Abreu", "Comendador Levy Gasparian", "Conceição de Macabu", "Cordeiro", "Duas Barras", "Duque de Caxias", "Engenheiro Paulo de Frontin", "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara", "Itaperuna", "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco", "Magé", "Mangaratiba", "Maricá", "Mendes", "Mesquita", "Miguel Pereira", "Miracema", "Natividade", "Nilópolis", "Niterói", "Nova Friburgo", "Nova Iguaçu", "Paracambi", "Paraíba do Sul", "Paraty", "Paty do Alferes", "Petrópolis", "Pinheiral", "Piraí", "Porciúncula", "Porto Real", "Quatis", "Queimados", "Quissamã", "Resende", "Rio Bonito", "Rio das Flores", "Rio das Ostras", "Rio de Janeiro", "Rio Claro", "Santa Maria Madalena", "Santo Antônio de Pádua", "São Fidélis", "São Francisco de Itabapoana", "São Gonçalo", "São João da Barra", "São João de Meriti", "São José de Ubá", "São José do Vale do Rio Preto", "São Pedro da Aldeia", "São Sebastião do Alto", "Sapucaia", "Saquarema", "Seropédica", "Silva Jardim", "Sumidouro", "Tanguá", "Teresópolis", "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai", "Vassouras", "Volta Redonda"];

// Dicionário Estrito de Bairros para Cruzamento Lógico
const zonasRJ = {
    "centro": ["centro", "lapa", "cidade nova", "gamboa", "saude", "santo cristo", "rio comprido", "catumbi", "estacio", "santa teresa", "sao cristovao", "imperial de sao cristovao", "benfica", "mangueira", "vasco da gama", "caju", "paqueta", "praca maua"],
    "sul": ["botafogo", "copacabana", "ipanema", "leblon", "leme", "urca", "flamengo", "gloria", "laranjeiras", "catete", "cosme velho", "humaita", "jardim botanico", "lagoa", "gavea", "sao conrado", "rocinha", "vidigal"],
    "norte": ["tijuca", "vila isabel", "maracana", "grajau", "andarai", "engenho novo", "meier", "cachambi", "lins", "todos os santos", "engenho de dentro", "agua santa", "encantado", "piedade", "abolicao", "pilares", "madureira", "cascadura", "quintino", "cavalcanti", "engenheiro leal", "oswaldo cruz", "campinho", "vaz lobo", "turiacu", "rocha miranda", "honorio gurgel", "bento ribeiro", "marechal hermes", "guadalupe", "bonsucesso", "ramos", "olaria", "penha", "bras de pina", "cordovil", "parada de lucas", "vigario geral", "jardim america", "iraja", "vicente de carvalho", "vila kosmos", "colegio", "vista alegre", "pavuna", "rocha", "riachuelo", "sampaio", "sao francisco xavier", "jacare", "del castilho", "inhauma", "higienopolis", "maria da graca", "tomas coelho", "engenho da rainha", "ilha do governador", "galeao", "bancarios", "cacuia", "cocota", "pitangueiras", "praia da bandeira", "ribeira", "taua", "zumbi", "tubiacanga", "acari", "barros filho", "costa barros", "parque columbia", "parque anchieta", "anchieta", "ricardo de albuquerque", "alto da boa vista", "praca da bandeira", "jacarezinho"],
    "oeste": ["barra da tijuca", "recreio", "vargem grande", "vargem pequena", "jacarepagua", "anil", "cidade de deus", "curicica", "freguesia", "gardenia", "pechincha", "praca seca", "tanque", "taquara", "vila valqueire", "bangu", "padre miguel", "realengo", "magalhaes bastos", "sulacap", "deodoro", "campo grande", "senador camara", "senador vasconcelos", "santissimo", "cosmos", "paciencia", "santa cruz", "inhoaiba", "guaratiba", "sepetiba", "camorim", "joa", "itangaa", "vila militar", "gericino", "bairro das gracas", "barra de guaratiba", "pedra de guaratiba", "ilha de guaratiba"]
};

const normalizeString = (str) => { if(!str) return ""; return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); };

// Nova Lógica Mestra de Detecção de Zona
function detectarZonaRJ(endereco, municipio, zonaPlanilha, bairroGoogle = "") {
    if (!municipio || !normalizeString(municipio).includes("rio de janeiro")) return "";

    let zNorm = normalizeString(zonaPlanilha);
    if (zNorm.includes("sul")) return "Sul";
    if (zNorm.includes("norte")) return "Norte";
    if (zNorm.includes("oeste")) return "Oeste";
    if (zNorm.includes("centro")) return "Centro";

    let endNorm = normalizeString(endereco);
    let bGoogleNorm = normalizeString(bairroGoogle);

    for (let zona in zonasRJ) {
        let bairros = zonasRJ[zona];
        for (let bairro of bairros) {
            let regex = new RegExp("\\b" + bairro + "\\b", "i");
            // Cruza o endereço bruto OU o bairro exato extraído pela inteligência do Google Maps
            if (regex.test(endNorm) || (bGoogleNorm && regex.test(bGoogleNorm))) {
                return zona.charAt(0).toUpperCase() + zona.slice(1);
            }
        }
    }
    return ""; // Sem zona
}

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
        filterSelect.appendChild(new Option(city, city)); formSelect.appendChild(new Option(city, city)); 
    });

    if(museumsData.length === 0) renderMuseums([]); 
}

function geocodeAddressGoogle(endereco, municipio) {
    return new Promise((resolve) => {
        if (!municipio) return resolve(null);
        if (normalizeString(endereco).includes("virtual") || normalizeString(municipio).includes("virtual")) return resolve(null);

        let queryMunicipio = `${endereco}, ${municipio}, RJ, Brasil`;
        geocoder.geocode({ 
            address: queryMunicipio, 
            componentRestrictions: { country: 'BR', administrativeArea: 'RJ' } 
        }, (res, status) => {
            if (status === 'OK' && res[0]) {
                let cityMatch = false;
                let targetMunNorm = normalizeString(municipio);
                let bairroEncontrado = "";
                
                res[0].address_components.forEach(comp => {
                    if(comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")) {
                        let googleCityNorm = normalizeString(comp.long_name);
                        if(googleCityNorm === targetMunNorm || googleCityNorm.includes(targetMunNorm) || targetMunNorm.includes(googleCityNorm)) {
                            cityMatch = true;
                        }
                    }
                    // O Google Maps nos diz qual é o bairro real da rua
                    if(comp.types.includes("sublocality") || comp.types.includes("sublocality_level_1") || comp.types.includes("neighborhood")) {
                        bairroEncontrado = normalizeString(comp.long_name);
                    }
                });
                
                if(cityMatch) {
                    return resolve({ lat: res[0].geometry.location.lat(), lng: res[0].geometry.location.lng(), bairro: bairroEncontrado });
                }
            }
            resolve(null);
        });
    });
}

// --- SPA NAVEGAÇÃO E PLACEHOLDERS ---
window.switchView = function(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';
    
    if(viewId === 'home' && map) {
        setTimeout(() => { google.maps.event.trigger(map, 'resize'); map.setCenter({ lat: -22.9068, lng: -43.1729 }); }, 200);
    }
}

window.showPlaceholder = function(titleText) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById('view-em-construcao').style.display = 'block';
    document.getElementById('construcao-title').innerText = titleText;
}

// --- FIREBASE AUTHENTICATION E REGISTRO ---
window.signInWithGoogle = function() {
    if(typeof firebase === 'undefined' || !db) return alert("Banco de dados indisponível.");
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(error => { document.getElementById('loginErrorMsg').innerText = `Falha no login: ${error.message}`; });
}

window.registerWithEmail = function() {
    const nome = document.getElementById('regUserName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    
    if(!nome) return alert("Por favor, preencha o seu Nome Completo.");
    if(!email || pass.length < 6) return alert("Insira um email válido e uma senha de no mínimo 6 caracteres.");
    
    firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then((userCredential) => userCredential.user.updateProfile({ displayName: nome }))
        .then(() => alert("Conta criada com sucesso! Você já está conectado."))
        .catch(err => document.getElementById('loginErrorMsg').innerText = `Erro: ${err.message}`);
}

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
    document.querySelectorAll('.step-dot').forEach((el, index) => {
        if(index < step) el.classList.add('active'); else el.classList.remove('active');
    });
    document.getElementById('step' + step).classList.add('active');
}
window.prevStep = function(step) { nextStep(step); }

// --- ENVIAR FICHA DE CADASTRO (PÚBLICO) ---
window.submitMuseumRegistration = function() {
    const nome = document.getElementById('regNome').value;
    const endereco = document.getElementById('regEndereco').value;
    const municipio = document.getElementById('regMuni').value;
    if(!nome || !endereco || !municipio) return alert("Preencha Nome, Município e Endereço na Etapa 2.");

    const email = document.getElementById('perfil-email').innerText;
    const responsavelNome = document.getElementById('perfil-nome').innerText;
    let dias = Array.from(document.querySelectorAll('.chk-dia:checked')).map(e => e.value).join(', ');
    let turnos = Array.from(document.querySelectorAll('.chk-turno:checked')).map(e => e.value).join(', ');
    let stringFuncionamento = (dias && turnos) ? `${dias} - ${turnos}` : (dias || turnos || "Não informado");
    
    let zonaCalculada = detectarZonaRJ(endereco, municipio, "");

    const req = {
        id: Date.now(), id_cfm: document.getElementById('regIdCfm').value || "", nome: nome, sigla: document.getElementById('regSigla').value,
        cnpj: document.getElementById('regCnpj').value, documento_criacao: document.getElementById('regDoc').value,
        municipio: municipio, endereco: endereco, regiao: document.getElementById('regRegiao').value,
        natureza: document.getElementById('regNatureza').value, telefone_institucional: document.getElementById('regTel').value,
        email_institucional: document.getElementById('regEmailInst').value, site: document.getElementById('regSite').value,
        facebook: document.getElementById('regFace').value, instagram: document.getElementById('regInsta').value, twitter: document.getElementById('regTwitter').value,
        situacao: document.getElementById('regStatus').value, funcionamento: stringFuncionamento, 
        ingresso: document.getElementById('regIngresso').value, acervo: document.getElementById('regAcervo').value,
        museologo: document.getElementById('regMus').value, educativo: document.getElementById('regEdu').value,
        acessibilidade: document.getElementById('regAccess').value, gratuidades: document.getElementById('regGrat').value,
        historico: document.getElementById('regHist').value, responsavel_cadastro: responsavelNome, email_responsavel: email,
        data_cadastro: new Date().toLocaleDateString('pt-BR'), certificado_enviado: "Não",
        zona: zonaCalculada, lat: null, lng: null
    };

    pendingApprovals.push(req);
    if(db) db.collection("requisicoes").add(req).catch(e => console.error("Erro DB", e));

    alert("Ficha registrada com sucesso!\nSua requisição foi enviada para a equipe do SIM-RJ.");
    document.querySelectorAll('.wizard-container input, .wizard-container textarea').forEach(el => el.value = '');
    document.querySelectorAll('.wizard-container select').forEach(el => el.selectedIndex = 0);
    document.querySelectorAll('.wizard-container input[type="checkbox"]').forEach(el => el.checked = false);
    switchView('meu-perfil'); renderApprovalsList(); 
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

    let tableHTML = `<div class="table-responsive"><table class="table table-hover table-bordered align-middle"><thead class="table-dark"><tr><th>Instituição</th><th>Município</th><th>Tipologia do Acervo</th><th>Situação</th><th></th></tr></thead><tbody id="table-body-lista">`;

    data.forEach(museum => {
        const hasPin = museum.lat && museum.lng; 
        if(listContainer) {
            const card = document.createElement('div');
            card.className = 'col-md-6 mb-3';
            card.innerHTML = `<div class="card h-100 museum-card bg-white"><div class="card-body"><div class="d-flex justify-content-between align-items-start mb-2"><span class="badge bg-secondary">${museum.regiao || 'Sem Região'}</span></div><h5 class="card-title text-dark fw-bold mb-1">${museum.nome}</h5><p class="card-text small text-muted mb-1"><i class="bi bi-geo-alt-fill text-danger"></i> ${museum.municipio}</p>${!hasPin ? '<span class="badge bg-warning text-dark mb-2"><i class="bi bi-exclamation-triangle-fill"></i> Sem Geolocalização</span>' : ''}<div class="mt-2"><button class="btn btn-sm btn-outline-primary" onclick="openProfile(${museum.id})">Detalhes</button></div></div></div>`;
            listContainer.appendChild(card);
        }

        tableHTML += `<tr class="tr-lista-item"><td class="fw-bold td-nome">${museum.nome}</td><td>${museum.municipio || '-'}</td><td>${museum.acervo || '-'}</td><td><span class="badge ${museum.situacao && museum.situacao.includes('Aberto') ? 'bg-success' : 'bg-secondary'}">${museum.situacao || 'Desconhecido'}</span></td><td><button class="btn btn-sm btn-primary" onclick="openProfile(${museum.id})">Abrir Ficha</button></td></tr>`;

        if (hasPin) {
            const marker = new google.maps.Marker({ position: { lat: museum.lat, lng: museum.lng }, map: map, title: museum.nome });
            marker.addListener("click", () => {
                infoWindow.setContent(`<div style="padding: 5px;"><h6 class="fw-bold">${museum.nome}</h6><button class="btn btn-sm btn-warning w-100 mt-2" onclick="openProfile(${museum.id})">Ver Ficha</button></div>`);
                infoWindow.open(map, marker);
            });
            markersArray.push(marker);
        }
    });

    tableHTML += `</tbody></table></div>`;
    if(tableContainer && data.length > 0) tableContainer.innerHTML = tableHTML;
    else if(tableContainer) tableContainer.innerHTML = "<div class='alert alert-secondary'>Nenhuma instituição mapeada ainda.</div>";

    updatePendingList();
}

window.filterList = function() {
    let input = normalizeString(document.getElementById('searchLista').value);
    let rows = document.querySelectorAll('.tr-lista-item');
    rows.forEach(row => { row.style.display = normalizeString(row.querySelector('.td-nome').innerText).includes(input) ? '' : 'none'; });
}

// --- FILTROS ---
function getCheckedValues(className) { return Array.from(document.querySelectorAll('.' + className + ':checked')).map(cb => normalizeString(cb.value)); }

window.applyFilters = function() {
    const term = normalizeString(document.getElementById('searchName').value);
    const filterHasMap = document.getElementById('filterHasMap').value;
    const selectedMuni = normalizeString(document.getElementById('filterMunicipio').value);
    const regions = getCheckedValues('filter-region'); const natures = getCheckedValues('filter-nature'); 
    const acervos = getCheckedValues('filter-acervo'); const statusList = getCheckedValues('filter-status'); 
    const turnos = getCheckedValues('filter-func'); const costs = getCheckedValues('filter-cost'); 
    const zonas = getCheckedValues('filter-zona'); 
    const reqMuseologo = document.getElementById('checkMuseologo').checked; const reqEdu = document.getElementById('checkEdu').checked;

    const matchExactPart = (fieldString, filterArray) => {
        if (filterArray.length === 0) return true;
        if (!fieldString) return false;
        let parts = fieldString.split(/[,;/e]/).map(s => s.trim());
        return filterArray.some(f => parts.includes(f) || fieldString === f);
    };

    const filtered = museumsData.filter(m => {
        const mNome = normalizeString(m.nome); const mMuni = normalizeString(m.municipio); const mRegiao = normalizeString(m.regiao); 
        const mNat = normalizeString(m.natureza); const mAcervo = normalizeString(m.acervo); const mStatus = normalizeString(m.situacao); 
        const mCost = normalizeString(m.ingresso); const mZona = normalizeString(m.zona);

        if (term && !mNome.includes(term)) return false;
        if (filterHasMap === 'sim' && (!m.lat || !m.lng)) return false;
        if (filterHasMap === 'nao' && (m.lat && m.lng)) return false;
        if (selectedMuni && mMuni !== selectedMuni) return false;
        
        if (regions.length > 0 && !regions.some(v => mRegiao === v)) return false;
        if (natures.length > 0 && !matchExactPart(mNat, natures)) return false;
        if (acervos.length > 0 && !matchExactPart(mAcervo, acervos)) return false;
        if (statusList.length > 0 && !matchExactPart(mStatus, statusList)) return false;
        if (costs.length > 0 && !matchExactPart(mCost, costs)) return false;
        if (turnos.length > 0 && !turnos.some(t => normalizeString(m.funcionamento).includes(t))) return false;
        if (reqMuseologo && normalizeString(m.museologo) !== "sim") return false;
        if (reqEdu && normalizeString(m.educativo) !== "sim") return false;

        // Se marcou algum filtro de Zona
        if (zonas.length > 0) {
            if (!mMuni.includes("rio de janeiro")) return false; // Bloqueia museus fora da capital
            if (!zonas.some(z => mZona === z)) return false; // Match exato com a zona calculada inteligentemente
        }
        return true;
    });

    currentFilteredData = filtered; 
    renderMuseums(filtered);
}

window.resetFilters = function() {
    document.querySelectorAll('.sidebar-filters input[type="text"], .sidebar-filters select').forEach(el => el.value = '');
    document.querySelectorAll('.sidebar-filters input[type="checkbox"]').forEach(cb => cb.checked = false);
    currentFilteredData = museumsData;
    renderMuseums(museumsData);
}

// --- FICHA DO MUSEU ---
window.openProfile = function(id) {
    if(!profileModal) profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    const m = museumsData.find(x => x.id === id); if(!m) return;
    const val = (v) => (v && v.trim() !== '') ? v : '<span class="text-muted fst-italic">Não informado</span>';

    document.getElementById('modalTitle').innerText = m.nome;
    if (normalizeString(m.museologo) === "sim") document.getElementById('modalBadgeMuseologo').classList.remove('d-none'); else document.getElementById('modalBadgeMuseologo').classList.add('d-none');
    if (!m.lat || !m.lng) document.getElementById('modalAlertPin').classList.remove('d-none'); else document.getElementById('modalAlertPin').classList.add('d-none');

    document.getElementById('modalEndereco').innerHTML = val(m.endereco);
    document.getElementById('modalMunicipio').innerHTML = val(m.municipio);
    document.getElementById('modalRegiao').innerHTML = val(m.regiao);
    document.getElementById('modalNatureza').innerHTML = val(m.natureza);
    document.getElementById('modalStatus').innerHTML = val(m.situacao);
    document.getElementById('modalTel').innerHTML = val(m.telefone_institucional);
    
    if(m.site) { document.getElementById('modalSite').href = m.site.startsWith('http') ? m.site : 'http://'+m.site; document.getElementById('modalSite').style.display = 'inline'; } else { document.getElementById('modalSite').style.display = 'none'; }
    
    document.getElementById('modalFunc').innerHTML = val(m.funcionamento);
    document.getElementById('modalIngresso').innerHTML = val(m.ingresso);
    document.getElementById('modalGratuidade').innerHTML = val(m.gratuidades);
    document.getElementById('modalAcervo').innerHTML = val(m.acervo);
    document.getElementById('modalMuseologoStatus').innerHTML = val(m.museologo);
    document.getElementById('modalEducativo').innerHTML = val(m.educativo);
    document.getElementById('modalAcessibilidade').innerHTML = val(m.acessibilidade);
    document.getElementById('modalHistorico').innerHTML = val(m.historico);
    profileModal.show();
}

// --- ADMIN E GESTÃO ---
window.openLogin = function() { document.getElementById('login-overlay').style.display = 'flex'; }
window.closeLogin = function() { document.getElementById('login-overlay').style.display = 'none'; }

window.checkAdminPassword = function() {
    if(document.getElementById('adminPassword').value === 'simrj') { 
        document.getElementById('admin-panel').style.display = 'block'; 
        closeLogin(); renderApprovalsList(); 
        document.querySelectorAll('.gestor-only').forEach(el => el.classList.remove('d-none'));
    } else alert('Senha incorreta.');
}
window.closeAdmin = function() { 
    document.getElementById('admin-panel').style.display = 'none'; 
    document.querySelectorAll('.gestor-only').forEach(el => el.classList.add('d-none'));
}

function renderApprovalsList() {
    const list = document.getElementById('requests-list');
    document.getElementById('reqCount').innerText = pendingApprovals.length;
    list.innerHTML = '';
    if(pendingApprovals.length === 0) return list.innerHTML = '<div class="alert alert-success small">Nenhuma requisição pendente no momento.</div>';
    pendingApprovals.forEach(req => { list.innerHTML += `<div class="req-item shadow-sm"><div class="d-flex justify-content-between align-items-center"><div><h6 class="fw-bold mb-1">${req.nome}</h6><small class="text-muted d-block"><i class="bi bi-geo-alt"></i> ${req.municipio} | <i class="bi bi-person"></i> ${req.nome_responsavel} (${req.email_institucional})</small></div><div><button class="btn btn-sm btn-outline-primary" onclick="viewApprovalDetails(${req.id})"><i class="bi bi-file-text"></i> Analisar Ficha</button></div></div></div>`; });
}

window.viewApprovalDetails = function(id) {
    const req = pendingApprovals.find(r => r.id === id); if(!req) return;
    if(!approvalModal) approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));
    document.getElementById('approvalModalBody').innerHTML = `<h4 class="text-primary fw-bold">${req.nome}</h4><p class="small text-muted mb-3">Solicitante: <strong>${req.nome_responsavel}</strong> (${req.email_responsavel})</p><div class="row small"><div class="col-md-6 mb-2"><strong>Município:</strong> ${req.municipio}</div><div class="col-md-6 mb-2"><strong>Endereço:</strong> ${req.endereco}</div><div class="col-md-6 mb-2"><strong>Natureza:</strong> ${req.natureza}</div><div class="col-md-6 mb-2"><strong>Situação:</strong> ${req.situacao}</div><div class="col-md-6 mb-2"><strong>Funcionamento:</strong> ${req.funcionamento}</div><div class="col-md-6 mb-2"><strong>Ingresso:</strong> ${req.ingresso}</div></div><hr><p class="small mb-1"><strong>Acessibilidade:</strong> ${req.acessibilidade || 'Nenhuma'}</p><p class="small"><strong>Histórico:</strong> ${req.historico || 'Nenhum'}</p>`;
    document.getElementById('btnConfirmApprove').onclick = () => approveRequest(req.id);
    document.getElementById('btnRejectApprove').onclick = () => rejectRequest(req.id);
    approvalModal.show();
}

window.approveRequest = async function(id) {
    const reqIndex = pendingApprovals.findIndex(r => r.id === id); if(reqIndex === -1) return;
    const approvedMuseum = pendingApprovals[reqIndex];
    let isVirtual = normalizeString(approvedMuseum.acervo).includes("virtual") || normalizeString(approvedMuseum.endereco).includes("virtual") || normalizeString(approvedMuseum.natureza).includes("virtual");
    let coords = null;
    if(!isVirtual) coords = await geocodeAddressGoogle(approvedMuseum.endereco, approvedMuseum.municipio);
    
    // Atualiza a zona ao aprovar com a inteligência do Google Maps
    approvedMuseum.zona = detectarZonaRJ(approvedMuseum.endereco, approvedMuseum.municipio, approvedMuseum.zona, coords ? coords.bairro : "");
    approvedMuseum.lat = coords ? coords.lat : null; 
    approvedMuseum.lng = coords ? coords.lng : null;
    
    pendingApprovals.splice(reqIndex, 1); museumsData.push(approvedMuseum);
    if(approvalModal) approvalModal.hide(); renderApprovalsList(); renderMuseums(museumsData); alert(`${approvedMuseum.nome} aprovado com sucesso!`);
}
window.rejectRequest = function(id) { if(confirm("Deseja rejeitar e apagar esta requisição?")) { pendingApprovals = pendingApprovals.filter(r => r.id !== id); if(approvalModal) approvalModal.hide(); renderApprovalsList(); } }

// --- ENVIAR CADASTRO MANUAL (GESTOR) ---
window.submitAdminManual = async function() {
    const nome = document.getElementById('admNome').value;
    const endereco = document.getElementById('admEndereco').value;
    const municipio = document.getElementById('admMunicipio').value;
    if(!nome) return alert("O Nome da Instituição é obrigatório.");

    let coords = await geocodeAddressGoogle(endereco, municipio);
    let zonaCalculada = detectarZonaRJ(endereco, municipio, "", coords ? coords.bairro : "");

    const manualMuseum = {
        id: Date.now(), id_cfm: document.getElementById('admCfm').value, nome: nome, sigla: document.getElementById('admSigla').value,
        cnpj: document.getElementById('admCnpj').value, documento_criacao: document.getElementById('admDoc').value,
        municipio: municipio, endereco: endereco, regiao: document.getElementById('admRegiao').value,
        natureza: document.getElementById('admNat').value, telefone_institucional: document.getElementById('admTel').value,
        email_institucional: document.getElementById('admEmailInst').value, site: document.getElementById('admSite').value,
        facebook: document.getElementById('admFace').value, instagram: document.getElementById('admInsta').value, twitter: document.getElementById('admTwitter').value,
        situacao: document.getElementById('admStatus').value, funcionamento: document.getElementById('admFunc').value, 
        ingresso: document.getElementById('admIngresso').value, acervo: document.getElementById('admAcervo').value,
        museologo: document.getElementById('admMus').value, educativo: document.getElementById('admEdu').value,
        acessibilidade: document.getElementById('admAccess').value, gratuidades: document.getElementById('admGrat').value,
        historico: document.getElementById('admHist').value, responsavel_cadastro: document.getElementById('admResp').value,
        data_cadastro: document.getElementById('admData').value, certificado_enviado: document.getElementById('admCert').value,
        zona: zonaCalculada, lat: coords ? coords.lat : null, lng: coords ? coords.lng : null
    };

    museumsData.push(manualMuseum);
    renderMuseums(museumsData);
    alert("Museu inserido diretamente no banco público!");
    document.querySelectorAll('.admin-form-container input, .admin-form-container textarea').forEach(el => el.value = '');
    document.querySelectorAll('.admin-form-container select').forEach(el => el.selectedIndex = 0);
}

// --- UPLOAD CSV E EXCEL ---
const getCol = (row, possibleNames) => {
    for (let name of possibleNames) {
        for (let key in row) {
            let keyClean = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
            let nameClean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
            if (keyClean === nameClean) return row[key] ? row[key].trim() : "";
        }
    }
    return "";
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
document.getElementById('csvFile').addEventListener('change', async function(e) {
    const file = e.target.files[0]; if (!file) return;
    
    document.getElementById('upload-status').className = 'alert alert-info small p-2 d-block w-50 mt-2';
    document.getElementById('upload-status').innerText = 'Lendo arquivo...';
    
    const pContainer = document.getElementById('upload-progress-container');
    const pBar = document.getElementById('upload-progress-bar');
    if(pContainer) pContainer.classList.remove('d-none');
    if(pBar) pBar.style.width = '0%';

    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) { 
            let rawData = results.data; let cleanData = []; let total = rawData.length;
            for (let i = 0; i < total; i++) {
                let row = rawData[i];
                let nome = getCol(row, ["Nome da Instituição", "Nome"]);
                if (!nome) continue;

                let id_cfm = getCol(row, ["Nº CFM", "ID", "Nº", "CFM"]);
                let sigla = getCol(row, ["Sigla"]);
                let cnpj = getCol(row, ["CNPJ"]);
                let municipio = getCol(row, ["Município", "Municipio"]);
                let regiao = getCol(row, ["Região", "Regiao"]);
                let natureza = getCol(row, ["Natureza Administrativa do Museu", "Natureza Administrativa", "Natureza"]);
                let doc = getCol(row, ["Documento de Criação", "Documento"]);
                let situacao = getCol(row, ["Situação", "Situacao", "Status"]);
                let endereco = getCol(row, ["Endereço", "Endereco"]);
                let funcionamento = getCol(row, ["Funcionamento", "Turno", "Horário"]);
                let ingresso = getCol(row, ["Valor ingresso", "Valor do Ingresso", "Ingresso"]);
                let gratuidades = getCol(row, ["Gratuidades", "Gratuidade"]);
                let educativo = getCol(row, ["Setor Educativo", "Educativo"]);
                let acervo = getCol(row, ["Acervo Predominante", "Acervo"]);
                let museologo = getCol(row, ["Museólogo", "Museologo"]);
                let acessibilidade = getCol(row, ["Acessibilidade"]);
                let historico = getCol(row, ["Histórico", "Historico"]);
                let telefone = getCol(row, ["Telefone Institucional", "Telefone", "Contato"]);
                let emailInst = getCol(row, ["E-mail Institucional", "Email Institucional", "Email"]);
                let site = getCol(row, ["Site", "Website"]);
                let facebook = getCol(row, ["Facebook"]);
                let instagram = getCol(row, ["Instagram"]);
                let twitter = getCol(row, ["Twitter", "X"]);
                let resp = getCol(row, ["Responsável pelo Cadastro", "Responsável pelo Casdastro", "Responsavel"]);
                let dataCad = getCol(row, ["Data Cadastro", "Data", "Carimbo de data/hora"]);
                let cert = getCol(row, ["Certificado enviado", "Certificado"]);
                let zonaBruta = getCol(row, ["Zona", "Zonas", "Zona do Rio", "Zona da Cidade"]);

                if(pBar) pBar.style.width = `${((i+1)/total)*100}%`;
                
                let isVirtual = normalizeString(acervo).includes("virtual") || normalizeString(endereco).includes("virtual") || normalizeString(natureza).includes("virtual");
                let coords = null;

                if (!isVirtual && endereco && municipio) {
                    coords = await geocodeAddressGoogle(endereco, municipio);
                    await sleep(50); 
                }

                // O Dicionário trabalha em conjunto com a API do Google para definir a Zona
                let zonaCalculada = detectarZonaRJ(endereco, municipio, zonaBruta, coords ? coords.bairro : "");

                cleanData.push({
                    id: i + 2000, id_cfm: id_cfm, nome: nome, sigla: sigla, cnpj: cnpj, endereco: endereco, municipio: municipio, 
                    regiao: regiao, telefone_institucional: telefone, email_institucional: emailInst, site: site, facebook: facebook, 
                    instagram: instagram, twitter: twitter, natureza: natureza, documento_criacao: doc, situacao: situacao, 
                    funcionamento: funcionamento, ingresso: ingresso, gratuidades: gratuidades, educativo: educativo, 
                    acervo: acervo, museologo: museologo, acessibilidade: acessibilidade, historico: historico, 
                    responsavel_cadastro: resp, data_cadastro: dataCad, certificado_enviado: cert, zona: zonaCalculada,
                    lat: coords ? coords.lat : null, lng: coords ? coords.lng : null
                });
            }
            museumsData = cleanData; currentFilteredData = cleanData; 
            renderMuseums(museumsData);
            document.getElementById('upload-status').className = 'alert alert-success small p-2 d-block w-50 mt-2';
            document.getElementById('upload-status').innerText = `Concluído! ${cleanData.length} lidos.`;
        }
    });
});

function updatePendingList() {
    const list = document.getElementById('pending-list'); if(!list) return; list.innerHTML = '';
    const pendings = museumsData.filter(m => !m.lat || !m.lng);
    document.getElementById('pendingCount').innerText = pendings.length;
    pendings.forEach(m => { list.innerHTML += `<div class="pending-item d-flex justify-content-between"><div><strong>${m.nome}</strong><br><small>${m.municipio || 'Município não extraído'}</small></div><button class="btn btn-sm btn-warning" onclick="openAdminMapPicker(${m.id})">Mapear</button></div>`; });
}

// --- MAPA DO GESTOR MANUAL ---
let adminMapInstance, adminTempMarker, currentMappingId;
window.openAdminMapPicker = function(id) {
    const m = museumsData.find(x => x.id === id); if(!m) return;
    currentMappingId = id; document.getElementById('adminMapTitle').innerText = m.nome;
    document.getElementById('adminMapSearchInput').value = `${m.endereco}, ${m.municipio}, RJ`;
    new bootstrap.Modal(document.getElementById('adminMapModal')).show();
    document.getElementById('adminMapModal').addEventListener('shown.bs.modal', function () {
        if (!adminMapInstance) { adminMapInstance = new google.maps.Map(document.getElementById('adminLeafletMap'), { center: { lat: -22.9068, lng: -43.1729 }, zoom: 8, restriction: { latLngBounds: RJ_BOUNDS, strictBounds: false } }); adminMapInstance.addListener('click', e => { if (adminTempMarker) adminTempMarker.setMap(null); adminTempMarker = new google.maps.Marker({ position: e.latLng, map: adminMapInstance }); }); }
        google.maps.event.trigger(adminMapInstance, 'resize');
    }, { once: true });
}
window.searchAddressOnAdminMap = function() {
    const query = document.getElementById('adminMapSearchInput').value;
    geocoder.geocode({ address: query, componentRestrictions: { country: 'BR', administrativeArea: 'RJ' } }, (results, status) => { if (status === 'OK' && results[0]) { adminMapInstance.setCenter(results[0].geometry.location); adminMapInstance.setZoom(17); if (adminTempMarker) adminTempMarker.setMap(null); adminTempMarker = new google.maps.Marker({ position: results[0].geometry.location, map: adminMapInstance }); } else alert("Endereço não encontrado."); });
}
window.saveAdminPin = function() {
    if (!adminTempMarker) return alert("Clique no mapa.");
    const m = museumsData.find(x => x.id === currentMappingId);
    if(m) { 
        m.lat = adminTempMarker.getPosition().lat(); 
        m.lng = adminTempMarker.getPosition().lng(); 
        renderMuseums(museumsData); 
        bootstrap.Modal.getInstance(document.getElementById('adminMapModal')).hide(); 
    }
}