// --- VARIÁVEIS GLOBAIS ---
let map;
let markersArray = [];
let museumsData = [];
let currentFilteredData = [];
let pendingApprovals = [];
let profileModal;
let approvalModal;
let isGestor = false; // NOVA VARIÁVEL

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
                if(document.getElementById('perfil-email')) document.getElementById('perfil-email').innerText = user.email;
            } else {
                document.getElementById('nav-meu-perfil').classList.add('d-none');
                document.getElementById('btn-nav-entrar').classList.remove('d-none');
            }
        });
    }
} catch (error) { console.error("Erro Firebase:", error); }

// =====================================================================
// 2. LEAFLET E NOMINATIM/VIACEP
// =====================================================================
const normalizeString = (str) => { if(!str) return ""; return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); };

const allMunicipalitiesRJ = ["Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios", "Arraial do Cabo", "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim", "Bom Jesus do Itabapoana", "Cabo Frio", "Cachoeiras de Macacu", "Cambuci", "Campos dos Goytacazes", "Cantagalo", "Carapebus", "Cardoso Moreira", "Carmo", "Casimiro de Abreu", "Comendador Levy Gasparian", "Conceição de Macabu", "Cordeiro", "Duas Barras", "Duque de Caxias", "Engenheiro Paulo de Frontin", "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara", "Itaperuna", "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco", "Magé", "Mangaratiba", "Maricá", "Mendes", "Mesquita", "Miguel Pereira", "Miracema", "Natividade", "Nilópolis", "Niterói", "Nova Friburgo", "Nova Iguaçu", "Paracambi", "Paraíba do Sul", "Paraty", "Paty do Alferes", "Petrópolis", "Pinheiral", "Piraí", "Porciúncula", "Porto Real", "Quatis", "Queimados", "Quissamã", "Resende", "Rio Bonito", "Rio das Flores", "Rio das Ostras", "Rio de Janeiro", "Rio Claro", "Santa Maria Madalena", "Santo Antônio de Pádua", "São Fidélis", "São Francisco de Itabapoana", "São Gonçalo", "São João da Barra", "São João de Meriti", "São José de Ubá", "São José do Vale do Rio Preto", "São Pedro da Aldeia", "São Sebastião do Alto", "Sapucaia", "Saquarema", "Seropédica", "Silva Jardim", "Sumidouro", "Tanguá", "Teresópolis", "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai", "Vassouras", "Volta Redonda"];

function initMapSystem() {
    map = L.map('map').setView([-22.9068, -43.1729], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    
    const filterSelect = document.getElementById('filterMunicipio');
    if(filterSelect) {
        filterSelect.innerHTML = '<option value="">Todos os 92 Municípios</option>';
        allMunicipalitiesRJ.sort().forEach(city => filterSelect.appendChild(new Option(city, city)));
    }
    
    if(museumsData.length === 0) renderMuseums([]); 
}

window.verificarRegiaoMetropolitana = function(valor, idZonaDestino) {
    const divZonas = document.getElementById(idZonaDestino);
    if(divZonas) {
        if (valor === 'Metropolitana I') divZonas.classList.remove('d-none');
        else divZonas.classList.add('d-none');
    }
}

window.buscarCep = async function(prefixo, cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        if (!data.erro) {
            if(document.getElementById(`${prefixo}Logradouro`)) document.getElementById(`${prefixo}Logradouro`).value = data.logradouro;
            if(document.getElementById(`${prefixo}Muni`)) document.getElementById(`${prefixo}Muni`).value = data.localidade;
            if(document.getElementById(`${prefixo}Municipio`)) document.getElementById(`${prefixo}Municipio`).value = data.localidade;
        } else alert("CEP não encontrado. Por favor, digite o logradouro manualmente.");
    } catch (error) { console.error("Erro no CEP:", error); }
}

window.geocodeAddressNominatim = async function(logradouro, numero, municipio, cep) {
    // Tenta 3 níveis de precisão para garantir que o pin vá para o mapa
    const tentativas = [
        `${logradouro}, ${numero || ''}, ${municipio}, RJ, Brasil`, // 1. Endereço Completo
        `${logradouro}, ${municipio}, RJ, Brasil`,                  // 2. Só a Rua e Cidade
        `${municipio}, RJ, Brasil`                                  // 3. Apenas a Cidade (Fallback)
    ];

    for (let query of tentativas) {
        if (!query || query.trim().length < 5) continue;
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
        } catch (error) {
            console.error("Erro na busca:", error);
        }
        // Espera meia fração de segundo entre tentativas para não bloquear a API
        await new Promise(r => setTimeout(r, 600)); 
    }
    return null; // Só retorna nulo se realmente a cidade for inválida
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

// --- WIZARD DO FORMULÁRIO DE SOLICITAÇÃO ---
window.nextSolStep = function(step) {
    document.getElementById('sol-wizard-steps').style.visibility = 'visible';
    document.querySelectorAll('#sol-step1, #sol-step2, #sol-step3').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#sol-dot1, #sol-dot2, #sol-dot3').forEach((el, index) => { 
        if(index < step) el.classList.add('active'); 
        else el.classList.remove('active'); 
    });
    document.getElementById('sol-step' + step).classList.add('active');
}

window.prevSolStep = function(step) { 
    if(step === 1) document.getElementById('sol-wizard-steps').style.visibility = 'hidden';
    nextSolStep(step); 
}

window.enviarSolicitacaoAcesso = function() {
    const nome = document.getElementById('solNome').value; // Certifique-se que na etapa 1 o ID é solNome
    const cep = document.getElementById('solCep').value;
    const logradouro = document.getElementById('solLogradouro').value;
    const numero = document.getElementById('solNumero').value;
    const municipio = document.getElementById('solMuni').value;
    const natureza = document.getElementById('solNat').value;

    if(!nome || !cep || !logradouro || !numero || !municipio || !natureza) {
        return alert("Preencha todos os campos obrigatórios (*) com atenção.");
    }

    const req = {
        id: Date.now(),
        nome: nome,
        municipio: municipio,
        endereco: `${logradouro}, ${numero} - CEP: ${cep}`,
        natureza: natureza,
        situacao: document.getElementById('solStatus').value,
        acervo: document.getElementById('solAcervo').value,
        museologo: document.getElementById('solMus').value,
        acessibilidade: document.getElementById('solAccess').value,
        ingresso: document.getElementById('solIngresso').value,
        funcionamento: document.getElementById('solFunc').value,
        nome_responsavel: "Pendente", // Se houver campo de responsável na etapa 1, puxe aqui
        lat: null, // Será preenchido na aprovação
        lng: null
    };

    pendingApprovals.push(req);
    renderApprovalsList(); // Atualiza a aba de requisições do painel do gestor

    alert("Sua ficha foi enviada com sucesso! Ela já aparece no painel do Gestor para aprovação.");
    
    // Limpa os campos e volta pro início
    document.querySelectorAll('.wizard-step input, .wizard-step select').forEach(el => el.value = '');
    prevSolStep(1);
    switchView('home');
}

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
        id_cfm: document.getElementById('admCfm').value,
        nome: nome,
        sigla: document.getElementById('admSigla').value,
        cnpj: document.getElementById('admCnpj').value,
        documento_criacao: document.getElementById('admDoc').value,
        municipio: municipio,
        endereco: `${logradouro}, ${numero} - ${document.getElementById('admComplemento').value}. CEP: ${cep}`,
        regiao: document.getElementById('admRegiao').value,
        zona: document.getElementById('admZonaRio').value,
        natureza: document.getElementById('admNat').value,
        situacao: document.getElementById('admStatus').value,
        telefone_institucional: document.getElementById('admTel').value,
        email_institucional: document.getElementById('admEmailInst').value,
        site: document.getElementById('admSite').value,
        facebook: document.getElementById('admFace').value,
        instagram: document.getElementById('admInsta').value,
        twitter: document.getElementById('admTwitter').value,
        funcionamento: document.getElementById('admFunc').value,
        ingresso: document.getElementById('admIngresso').value,
        gratuidades: document.getElementById('admGrat').value,
        educativo: document.getElementById('admEdu').value,
        museologo: document.getElementById('admMus').value,
        acervo: document.getElementById('admAcervo').value,
        acessibilidade: document.getElementById('admAccess').value,
        historico: document.getElementById('admHist').value,
        responsavel_cadastro: document.getElementById('admResp').value,
        email_responsavel: document.getElementById('admEmailResp').value,
        data_cadastro: document.getElementById('admData').value,
        lat: coords ? coords.lat : null, 
        lng: coords ? coords.lng : null
    };

    museumsData.push(manualMuseum);
    renderMuseums(museumsData);
    alert("Instituição salva diretamente no banco público!");
    document.querySelectorAll('.admin-form-container input, .admin-form-container textarea').forEach(el => el.value = '');
    document.querySelectorAll('.admin-form-container select').forEach(el => el.selectedIndex = 0);
}

// =====================================================================
// FLUXO 3: RESTAURAÇÃO DA LEITURA DE CSV COM GEOLOCALIZAÇÃO
// =====================================================================
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
    document.getElementById('upload-status').innerText = 'Lendo arquivo e buscando geolocalizações no mapa (isso pode levar 1 minuto a cada 60 registros devido aos limites da rede)...';
    
    const pContainer = document.getElementById('upload-progress-container');
    const pBar = document.getElementById('upload-progress-bar');
    if(pContainer) pContainer.classList.remove('d-none');
    if(pBar) pBar.style.width = '0%';

    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function(results) { 
            let rawData = results.data; let cleanData = []; let total = rawData.length;
            
            // Loop assíncrono para buscar coordenadas pausadamente
            for (let i = 0; i < total; i++) {
                let row = rawData[i];
                let nome = getCol(row, ["Nome da Instituição", "Nome"]);
                if (!nome) continue;

                let endereco = getCol(row, ["Endereço", "Endereco"]);
                let municipio = getCol(row, ["Município", "Municipio"]);
                let cep = getCol(row, ["CEP"]);
                let acervo = getCol(row, ["Acervo Predominante", "Acervo"]);

                if(pBar) pBar.style.width = `${((i+1)/total)*100}%`;
                
                // Busca o pin no mapa igual fazia no Google Maps, mas usando delay para não bloquear
                let coords = await geocodeAddressNominatim(endereco, "", municipio, cep);
                await sleep(1100); // Respeita a API gratuita (1 por seg)

                cleanData.push({
                    id: i + 2000, 
                    id_cfm: getCol(row, ["Nº CFM", "ID"]), 
                    nome: nome, 
                    sigla: getCol(row, ["Sigla"]), 
                    cnpj: getCol(row, ["CNPJ"]), 
                    endereco: endereco, 
                    municipio: municipio, 
                    regiao: getCol(row, ["Região", "Regiao"]), 
                    telefone_institucional: getCol(row, ["Telefone Institucional", "Telefone"]), 
                    email_institucional: getCol(row, ["E-mail Institucional", "Email"]), 
                    site: getCol(row, ["Site", "Website"]), 
                    facebook: getCol(row, ["Facebook"]), 
                    instagram: getCol(row, ["Instagram"]), 
                    twitter: getCol(row, ["Twitter", "X"]), 
                    natureza: getCol(row, ["Natureza Administrativa do Museu", "Natureza Administrativa", "Natureza"]), 
                    documento_criacao: getCol(row, ["Documento de Criação"]), 
                    situacao: getCol(row, ["Situação", "Situacao", "Status"]), 
                    funcionamento: getCol(row, ["Funcionamento", "Turno", "Horário"]), 
                    ingresso: getCol(row, ["Valor ingresso", "Ingresso"]), 
                    gratuidades: getCol(row, ["Gratuidades", "Gratuidade"]), 
                    educativo: getCol(row, ["Setor Educativo", "Educativo"]), 
                    acervo: acervo, 
                    museologo: getCol(row, ["Museólogo", "Museologo"]), 
                    acessibilidade: getCol(row, ["Acessibilidade"]), 
                    historico: getCol(row, ["Histórico", "Historico"]), 
                    responsavel_cadastro: getCol(row, ["Responsável pelo Cadastro", "Responsavel"]), 
                    data_cadastro: getCol(row, ["Data Cadastro", "Data"]), 
                    lat: coords ? coords.lat : null, 
                    lng: coords ? coords.lng : null
                });
            }
            museumsData = cleanData; currentFilteredData = cleanData; 
            renderMuseums(museumsData);
            document.getElementById('upload-status').className = 'alert alert-success small p-2 d-block w-50 mt-2';
            document.getElementById('upload-status').innerText = `Concluído! ${cleanData.length} lidos.`;
        }
    });
});

// =====================================================================
// RENDERIZAÇÃO MAPA E LISTA (Cores da Situação)
// =====================================================================
function renderMuseums(data) {
    data.sort((a, b) => a.nome.localeCompare(b.nome));

    const tableContainer = document.getElementById('container-lista-museus');
    if(tableContainer) tableContainer.innerHTML = '';
    
    markersArray.forEach(m => map.removeLayer(m)); markersArray = [];
    if(document.getElementById('resultCount')) document.getElementById('resultCount').innerText = data.length;
    if(document.getElementById('count-total')) document.getElementById('count-total').innerText = museumsData.length;

    let tableHTML = `<div class="table-responsive"><table class="table table-hover table-bordered align-middle"><thead class="table-dark"><tr><th>Instituição</th><th>Município</th><th>Tipologia do Acervo</th><th>Situação</th><th></th></tr></thead><tbody id="table-body-lista">`;

    data.forEach(museum => {
        const hasPin = museum.lat && museum.lng; 
        
        // CORRIGIDO: Atribuindo cores dinâmicas para a Situação da lista
        let badgeClass = 'bg-secondary';
        let situacaoLower = normalizeString(museum.situacao);
        if(situacaoLower === 'aberto') badgeClass = 'bg-success';
        else if(situacaoLower.includes('parcialmente') || situacaoLower.includes('implantacao')) badgeClass = 'bg-warning text-dark';
        else if(situacaoLower.includes('desativado')) badgeClass = 'bg-danger';
        
        tableHTML += `<tr class="tr-lista-item"><td class="fw-bold td-nome">${museum.nome}</td><td>${museum.municipio || '-'}</td><td>${museum.acervo || '-'}</td><td><span class="badge ${badgeClass}">${museum.situacao || 'Desconhecido'}</span></td><td><button class="btn btn-sm btn-primary" onclick="openProfile(${museum.id})">Abrir Ficha</button></td></tr>`;

        if (hasPin) {
            const marker = L.marker([museum.lat, museum.lng]).addTo(map);
            marker.bindPopup(`<div style="padding: 5px;"><h6 class="fw-bold">${museum.nome}</h6><button class="btn btn-sm btn-warning w-100 mt-2" onclick="openProfile(${museum.id})">Ver Ficha</button></div>`);
            markersArray.push(marker);
        }
    });

    tableHTML += `</tbody></table></div>`;
    if(tableContainer && data.length > 0) tableContainer.innerHTML = tableHTML;
    
    updatePendingList();
}

window.applyFilters = function() {
    const termoNome = normalizeString(document.getElementById('searchName') ? document.getElementById('searchName').value : '');
    const filterMuni = normalizeString(document.getElementById('filterMunicipio') ? document.getElementById('filterMunicipio').value : '');
    const filterTipo = normalizeString(document.getElementById('filterTipo') ? document.getElementById('filterTipo').value : '');

    currentFilteredData = museumsData.filter(m => {
        let match = true;
        if (termoNome && !normalizeString(m.nome).includes(termoNome)) match = false;
        if (filterMuni && normalizeString(m.municipio) !== filterMuni) match = false;
        if (filterTipo && !normalizeString(m.natureza).includes(filterTipo)) match = false; // Ajuste para o seu filtro real
        return match;
    });

    renderMuseums(currentFilteredData);
}

// Remova a função antiga `window.filterList` se existir e use apenas o applyFilters nos botões e inputs de busca.
window.resetFilters = function() { 
    document.querySelectorAll('.sidebar-filters input[type="text"], .sidebar-filters select').forEach(el => el.value = '');
    renderMuseums(museumsData); 
}

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

// --- GESTÃO E FILAS ---
// --- GESTÃO E FILAS ---
window.openLogin = function() { document.getElementById('login-overlay').style.display = 'flex'; }
window.closeLogin = function() { document.getElementById('login-overlay').style.display = 'none'; }

window.openAdminOrLogin = function() {
    if(isGestor) {
        document.getElementById('admin-panel').style.display = 'block';
    } else {
        openLogin();
    }
}

window.checkAdminPassword = function() {
    if(document.getElementById('adminPassword').value === 'simrj') { 
        isGestor = true;
        document.getElementById('admin-panel').style.display = 'block'; 
        closeLogin(); renderApprovalsList(); 
        document.querySelectorAll('.gestor-only').forEach(el => el.classList.remove('d-none'));
        document.querySelectorAll('.gestor-visible').forEach(el => el.classList.add('d-block'));
    } else alert('Senha incorreta.');
}

// ---> AS NOVAS FUNÇÕES ENTRAM AQUI <---
window.minimizarPainelGestor = function() {
    // Apenas esconde o painel preto, mas mantém você logado como gestor (isGestor = true)
    document.getElementById('admin-panel').style.display = 'none';
}

window.logoutGestor = function() {
    // Remove o status de gestor por segurança
    isGestor = false;
    document.getElementById('admin-panel').style.display = 'none';
    
    // Esconde os elementos sensíveis (abas e botões) do site novamente
    document.querySelectorAll('.gestor-only').forEach(el => el.classList.add('d-none'));
    document.querySelectorAll('.gestor-visible').forEach(el => el.classList.remove('d-block'));
    
    alert('Sessão de gestor encerrada com segurança.');
}

// (Logo abaixo disso deve continuar a função updatePendingList() que já está no seu código...)

function updatePendingList() {
    const list = document.getElementById('pending-list'); if(!list) return; list.innerHTML = '';
    const pendings = museumsData.filter(m => !m.lat || !m.lng);
    document.getElementById('pendingCount').innerText = pendings.length;
    pendings.forEach(m => { list.innerHTML += `<div class="pending-item d-flex justify-content-between"><div><strong>${m.nome}</strong><br><small>${m.municipio || 'Município não extraído'}</small></div><button class="btn btn-sm btn-warning" onclick="openAdminMapPicker(${m.id})">Mapear</button></div>`; });
}

function renderApprovalsList() {
    const list = document.getElementById('requests-list');
    document.getElementById('reqCount').innerText = pendingApprovals.length;
    list.innerHTML = '';
    if(pendingApprovals.length === 0) return list.innerHTML = '<div class="alert alert-success small">Nenhuma ficha recebida até o momento.</div>';
    pendingApprovals.forEach(req => { 
        list.innerHTML += `<div class="req-item shadow-sm"><div class="d-flex justify-content-between align-items-center"><div><h6 class="fw-bold mb-1">${req.nome}</h6><small class="text-muted d-block"><i class="bi bi-geo-alt"></i> ${req.municipio} | <i class="bi bi-person"></i> ${req.nome_responsavel}</small></div><div><button class="btn btn-sm btn-success" onclick="approveRequest(${req.id})"><i class="bi bi-check"></i> Aprovar</button></div></div></div>`; 
    });
}

window.approveRequest = async function(id) {
    const reqIndex = pendingApprovals.findIndex(r => r.id === id); if(reqIndex === -1) return;
    const m = pendingApprovals[reqIndex];
    pendingApprovals.splice(reqIndex, 1); 
    
    let coords = await geocodeAddressNominatim(m.endereco, "", m.municipio, "");
    if(coords) { m.lat = coords.lat; m.lng = coords.lng; }
    
    museumsData.push(m); renderApprovalsList(); renderMuseums(museumsData); alert(`${m.nome} aprovado e adicionado à base!`);
}

// --- MAPEAMENTO MANUAL LEAFLET ---
let adminMapInstance, adminTempMarker, currentMappingId;
window.openAdminMapPicker = function(id) {
    const m = museumsData.find(x => x.id === id); if(!m) return;
    currentMappingId = id; document.getElementById('adminMapTitle').innerText = m.nome;
    document.getElementById('adminMapSearchInput').value = `${m.endereco}, ${m.municipio}, RJ`;
    
    // Mostra o Modal de Geolocalização Manual (agora ele aparecerá na frente do Painel de Admin graças ao z-index alterado no css)
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

window.searchAddressOnAdminMap = async function() {
    const query = document.getElementById('adminMapSearchInput').value;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.length > 0) {
            const latlng = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
            adminMapInstance.setView(latlng, 17);
            if (adminTempMarker) adminMapInstance.removeLayer(adminTempMarker); 
            adminTempMarker = L.marker(latlng).addTo(adminMapInstance);
        } else alert("Endereço não encontrado pela inteligência.");
    } catch (error) { console.error(error); }
}

window.saveAdminPin = function() {
    if (!adminTempMarker) return alert("Clique no mapa para marcar a localização.");
    const m = museumsData.find(x => x.id === currentMappingId);
    if(m) { 
        m.lat = adminTempMarker.getLatLng().lat; 
        m.lng = adminTempMarker.getLatLng().lng; 
        renderMuseums(museumsData); 
        bootstrap.Modal.getInstance(document.getElementById('adminMapModal')).hide(); 
    }
}