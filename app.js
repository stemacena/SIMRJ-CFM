/**
 * SISTEMA ESTADUAL DE MUSEUS DO RIO DE JANEIRO (SIM-RJ)
 * CADASTRO FLUMINENSE DE MUSEUS (CFM)
 * Script Principal de Controle, Geoprocessamento e Governança de Dados
 */

let map;
let markersArray = [];
let museumsData = [];
let currentFilteredData = [];
let profileModal;
let editModal;
let isGestor = false;
let editingMuseumId = null;
let currentOperatorName = "Gestor SUPMU";

// Persistência local de edições, visibilidade em bloco, manifestações e credencial administrativa
let localEditsMemory = JSON.parse(localStorage.getItem('simrj_edits')) || {};
let globalHiddenFields = JSON.parse(localStorage.getItem('simrj_bulk_hidden_fields')) || {};
let publicFeedbacks = JSON.parse(localStorage.getItem('simrj_feedbacks')) || [];
let adminSavedPassword = localStorage.getItem('simrj_admin_pass') || 'simrj';

// Paleta oficial de cores dos pinos por Região do Estado do Rio de Janeiro
const CORES_REGIOES_RJ = {
    "centro sul": "#ef8739",
    "serrana": "#0d92df",
    "medio paraiba": "#58cfa5",
    "costa verde": "#0d6b2a",
    "metropolitana i": "#af8447",
    "metropolitana ii": "#af8447",
    "metropolitana iii": "#af8447",
    "metropolitana": "#af8447",
    "baixadas litoraneas": "#aabddb",
    "norte fluminense": "#d69f9d",
    "noroeste fluminense": "#edeb40"
};

// Catálogo de atributos institucionais gerenciáveis (Individual e em Bloco)
const CATALOGO_CAMPOS_CFM = [
    { id: 'sigla', label: 'Sigla Institucional' },
    { id: 'cnpj', label: 'CNPJ' },
    { id: 'documento_criacao', label: 'Documento de Criação' },
    { id: 'endereco', label: 'Endereço Completo' },
    { id: 'municipio', label: 'Município' },
    { id: 'regiao', label: 'Região do Estado' },
    { id: 'zona', label: 'Zona (Capital)' },
    { id: 'telefone', label: 'Telefone Institucional' },
    { id: 'email', label: 'E-mail Institucional' },
    { id: 'site', label: 'Site Oficial' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'twitter', label: 'Twitter / X' },
    { id: 'natureza', label: 'Natureza Administrativa' },
    { id: 'situacao', label: 'Situação de Funcionamento' },
    { id: 'funcionamento', label: 'Dias e Turnos de Funcionamento' },
    { id: 'ingresso', label: 'Valor do Ingresso' },
    { id: 'gratuidades', label: 'Política de Gratuidades' },
    { id: 'educativo', label: 'Possui Setor Educativo' },
    { id: 'museologo', label: 'Possui Museólogo' },
    { id: 'acervo', label: 'Tipologia de Acervo Predominante' },
    { id: 'acessibilidade', label: 'Acessibilidade Universal' },
    { id: 'historico_museu', label: 'Histórico da Instituição' },
    { id: 'resp_nome', label: 'Responsável pelo Cadastro' },
    { id: 'resp_email', label: 'E-mail do Responsável' }
];

// Lista oficial dos 92 municípios fluminenses para higienização e unificação nominal
const MUNICIPIOS_OFICIAIS_RJ = [
    "Angra dos Reis", "Aperibé", "Araruama", "Areal", "Armação dos Búzios", "Arraial do Cabo",
    "Barra do Piraí", "Barra Mansa", "Belford Roxo", "Bom Jardim", "Bom Jesus do Itabapoana",
    "Cabo Frio", "Cachoeiras de Macacu", "Cambuci", "Campos dos Goytacazes", "Cantagalo",
    "Carapebus", "Cardoso Moreira", "Carmo", "Casimiro de Abreu", "Comendador Levy Gasparian",
    "Conceição de Macabu", "Cordeiro", "Duas Barras", "Duque de Caxias", "Engenheiro Paulo de Frontin",
    "Guapimirim", "Iguaba Grande", "Itaboraí", "Itaguaí", "Italva", "Itaocara", "Itaperuna",
    "Itatiaia", "Japeri", "Laje do Muriaé", "Macaé", "Macuco", "Magé", "Mangaratiba", "Maricá",
    "Mendes", "Mesquita", "Miguel Pereira", "Miracema", "Natividade", "Nilópolis", "Niterói",
    "Nova Friburgo", "Nova Iguaçu", "Paracambi", "Paraíba do Sul", "Paraty", "Paty do Alferes",
    "Petrópolis", "Pinheiral", "Piraí", "Porciúncula", "Porto Real", "Quatis", "Queimados",
    "Quissamã", "Resende", "Rio Bonito", "Rio Claro", "Rio das Flores", "Rio das Ostras",
    "Rio de Janeiro", "Santa Maria Madalena", "Santo Antônio de Pádua", "São Fidélis",
    "São Francisco de Itabapoana", "São Gonçalo", "São João da Barra", "São João de Meriti",
    "São José de Ubá", "São José do Vale do Rio Preto", "São Pedro da Aldeia", "São Sebastião do Alto",
    "Sapucaia", "Saquarema", "Seropédica", "Silva Jardim", "Sumidouro", "Tanguá", "Teresópolis",
    "Trajano de Moraes", "Três Rios", "Valença", "Varre-Sai", "Vassouras", "Volta Redonda"
];

// Mapeamento oficial de Municípios por Região (Decreto Estadual nº 45.419/2015)
const REGIOES_POR_MUNICIPIO = {
    "Metropolitana I": ["rio de janeiro"],
    "Metropolitana II": ["belford roxo", "duque de caxias", "japeri", "mage", "mesquita", "nilopolis", "nova iguacu", "paracambi", "queimados", "sao joao de meriti", "seropedica"],
    "Metropolitana III": ["itaborai", "marica", "niteroi", "rio bonito", "sao goncalo", "tangua"],
    "Noroeste Fluminense": ["aperibe", "bom jesus do itabapoana", "cambuci", "italva", "itaocara", "itaperuna", "laje do muriae", "miracema", "natividade", "porciuncula", "santo antonio de padua", "sao jose de uba", "varre sai"],
    "Norte Fluminense": ["campos dos goytacazes", "carapebus", "cardoso moreira", "conceicao de macabu", "macae", "quissama", "sao fidelis", "sao francisco de itabapoana", "sao francisco do itabapoana", "sao joao da barra"],
    "Serrana": ["bom jardim", "cachoeiras de macacu", "cantagalo", "carmo", "cordeiro", "duas barras", "guapimirim", "macuco", "nova friburgo", "petropolis", "santa maria madalena", "sao jose do vale do rio preto", "sao sebastiao do alto", "sumidouro", "teresopolis", "trajano de moraes"],
    "Baixadas Litorâneas": ["araruama", "armacao dos buzios", "arraial do cabo", "cabo frio", "casimiro de abreu", "iguaba grande", "rio das ostras", "sao pedro da aldeia", "saquarema", "silva jardim"],
    "Médio Paraíba": ["barra do pirai", "barra mansa", "itatiaia", "pinheiral", "pirai", "porto real", "quatis", "resende", "rio claro", "rio das flores", "valenca", "volta redonda"],
    "Centro-Sul": ["areal", "comendador levy gasparian", "engenheiro paulo de frontin", "mendes", "miguel pereira", "paraiba do sul", "paty do alferes", "sapucaia", "tres rios", "vassouras"],
    "Costa Verde": ["angra dos reis", "itaguai", "mangaratiba", "paraty"]
};

// Coordenadas de referência municipal do Estado do RJ
const COORDENADAS_MUNICIPIOS_RJ = {
    "angra dos reis": { lat: -23.0067, lng: -44.3181 },
    "aperibe": { lat: -21.6214, lng: -42.1039 },
    "araruama": { lat: -22.8728, lng: -42.3431 },
    "areal": { lat: -22.2306, lng: -43.1056 },
    "armacao dos buzios": { lat: -22.7469, lng: -41.8817 },
    "arraial do cabo": { lat: -22.9661, lng: -42.0278 },
    "barra do pirai": { lat: -22.4700, lng: -43.8256 },
    "barra mansa": { lat: -22.5442, lng: -44.1714 },
    "belford roxo": { lat: -22.7642, lng: -43.3992 },
    "bom jardim": { lat: -22.1519, lng: -42.4194 },
    "bom jesus do itabapoana": { lat: -21.1339, lng: -41.6797 },
    "cabo frio": { lat: -22.8794, lng: -42.0186 },
    "cachoeiras de macacu": { lat: -22.4625, lng: -42.6531 },
    "cambuci": { lat: -21.5753, lng: -41.9111 },
    "campos dos goytacazes": { lat: -21.7522, lng: -41.3303 },
    "cantagalo": { lat: -21.9811, lng: -42.3681 },
    "carapebus": { lat: -22.1869, lng: -41.6611 },
    "cardoso moreira": { lat: -21.4875, lng: -41.6164 },
    "carmo": { lat: -21.9336, lng: -42.6086 },
    "casimiro de abreu": { lat: -22.4806, lng: -42.2042 },
    "comendador levy gasparian": { lat: -22.0289, lng: -43.2047 },
    "conceicao de macabu": { lat: -22.0853, lng: -41.8683 },
    "cordeiro": { lat: -22.0286, lng: -42.3608 },
    "duas barras": { lat: -22.0511, lng: -42.5219 },
    "duque de caxias": { lat: -22.7856, lng: -43.3117 },
    "engenheiro paulo de frontin": { lat: -22.5497, lng: -43.6783 },
    "guapimirim": { lat: -22.5372, lng: -42.9819 },
    "iguaba grande": { lat: -22.8392, lng: -42.2289 },
    "itaborai": { lat: -22.7444, lng: -42.8594 },
    "itaguai": { lat: -22.8522, lng: -43.7753 },
    "italva": { lat: -21.4214, lng: -41.6906 },
    "itaocara": { lat: -21.6692, lng: -42.0761 },
    "itaperuna": { lat: -21.2050, lng: -41.8878 },
    "itatiaia": { lat: -22.4961, lng: -44.5633 },
    "japeri": { lat: -22.6431, lng: -43.6533 },
    "laje do muriae": { lat: -21.2106, lng: -42.1272 },
    "macae": { lat: -22.3708, lng: -41.7869 },
    "macuco": { lat: -21.9839, lng: -42.2528 },
    "mage": { lat: -22.6528, lng: -43.0406 },
    "mangaratiba": { lat: -22.9597, lng: -44.0406 },
    "marica": { lat: -22.9194, lng: -42.8186 },
    "mendes": { lat: -22.5267, lng: -43.7328 },
    "mesquita": { lat: -22.7825, lng: -43.4317 },
    "miguel pereira": { lat: -22.4539, lng: -43.4689 },
    "miracema": { lat: -21.4122, lng: -42.1967 },
    "natividade": { lat: -21.0422, lng: -41.9733 },
    "nilopolis": { lat: -22.8083, lng: -43.4147 },
    "niteroi": { lat: -22.8833, lng: -43.1036 },
    "nova friburgo": { lat: -22.2819, lng: -42.5311 },
    "nova iguacu": { lat: -22.7592, lng: -43.4511 },
    "paracambi": { lat: -22.6083, lng: -43.7089 },
    "paraiba do sul": { lat: -22.1619, lng: -43.2925 },
    "paraty": { lat: -23.2178, lng: -44.7131 },
    "paty do alferes": { lat: -22.4286, lng: -43.4186 },
    "petropolis": { lat: -22.5050, lng: -43.1786 },
    "pinheiral": { lat: -22.5128, lng: -44.0008 },
    "pirai": { lat: -22.6292, lng: -43.8981 },
    "porciuncula": { lat: -20.9628, lng: -42.0408 },
    "porto real": { lat: -22.4197, lng: -44.2903 },
    "quatis": { lat: -22.4072, lng: -44.2581 },
    "queimados": { lat: -22.7161, lng: -43.5553 },
    "quissama": { lat: -22.1067, lng: -41.4722 },
    "resende": { lat: -22.4689, lng: -44.4467 },
    "rio bonito": { lat: -22.7086, lng: -42.6272 },
    "rio claro": { lat: -22.7231, lng: -44.1356 },
    "rio das flores": { lat: -22.1681, lng: -43.5858 },
    "rio das ostras": { lat: -22.5269, lng: -41.9450 },
    "rio de janeiro": { lat: -22.9068, lng: -43.1729 },
    "santa maria madalena": { lat: -21.9547, lng: -42.0081 },
    "santo antonio de padua": { lat: -21.5394, lng: -42.1803 },
    "sao fidelis": { lat: -21.6461, lng: -41.7469 },
    "sao francisco de itabapoana": { lat: -21.4703, lng: -41.1092 },
    "sao francisco do itabapoana": { lat: -21.4703, lng: -41.1092 },
    "sao goncalo": { lat: -22.8269, lng: -43.0539 },
    "sao joao da barra": { lat: -21.6403, lng: -41.0511 },
    "sao joao de meriti": { lat: -22.8036, lng: -43.3722 },
    "sao jose de uba": { lat: -21.3578, lng: -41.9428 },
    "sao jose do vale do rio preto": { lat: -22.1514, lng: -42.9244 },
    "sao pedro da aldeia": { lat: -22.8406, lng: -42.1028 },
    "sao sebastiao do alto": { lat: -21.9572, lng: -42.1347 },
    "sapucaia": { lat: -21.9950, lng: -42.9144 },
    "saquarema": { lat: -22.9200, lng: -42.5103 },
    "seropedica": { lat: -22.7439, lng: -43.7075 },
    "silva jardim": { lat: -22.6508, lng: -42.3917 },
    "sumidouro": { lat: -22.0497, lng: -42.6753 },
    "tangua": { lat: -22.7303, lng: -42.7142 },
    "teresopolis": { lat: -22.4122, lng: -42.9656 },
    "trajano de moraes": { lat: -22.0631, lng: -42.0653 },
    "tres rios": { lat: -22.1167, lng: -43.2092 },
    "valenca": { lat: -22.2456, lng: -43.7003 },
    "varre sai": { lat: -20.9311, lng: -41.8686 },
    "vassouras": { lat: -22.4039, lng: -43.6625 },
    "volta redonda": { lat: -22.5231, lng: -44.1042 }
};

// Coordenadas de precisão por bairro e logradouro cultural do Rio de Janeiro
// Corrige pinos que haviam recebido o centroide genérico da capital (-22.9110, -43.2094)
const COORDENADAS_BAIRROS_RIO = {
    "vidigal": { lat: -22.9935, lng: -43.2335 },
    "rocinha": { lat: -22.9882, lng: -43.2484 },
    "sao conrado": { lat: -22.9930, lng: -43.2650 },
    "gavea": { lat: -22.9756, lng: -43.2285 },
    "jardim botanico": { lat: -22.9675, lng: -43.2248 },
    "humaita": { lat: -22.9560, lng: -43.1990 },
    "lagoa": { lat: -22.9710, lng: -43.2080 },
    "leblon": { lat: -22.9840, lng: -43.2230 },
    "ipanema": { lat: -22.9838, lng: -43.2045 },
    "copacabana": { lat: -22.9698, lng: -43.1869 },
    "leme": { lat: -22.9632, lng: -43.1668 },
    "botafogo": { lat: -22.9512, lng: -43.1852 },
    "urca": { lat: -22.9544, lng: -43.1665 },
    "flamengo": { lat: -22.9325, lng: -43.1755 },
    "laranjeiras": { lat: -22.9360, lng: -43.1885 },
    "cosme velho": { lat: -22.9415, lng: -43.1985 },
    "catete": { lat: -22.9258, lng: -43.1768 },
    "gloria": { lat: -22.9205, lng: -43.1750 },
    "santa teresa": { lat: -22.9218, lng: -43.1856 },
    "lapa": { lat: -22.9135, lng: -43.1810 },
    "cinelandia": { lat: -22.9108, lng: -43.1755 },
    "praca xv": { lat: -22.9028, lng: -43.1705 },
    "praca maua": { lat: -22.8962, lng: -43.1802 },
    "primeiro de marco": { lat: -22.9015, lng: -43.1745 },
    "rio branco": { lat: -22.9045, lng: -43.1768 },
    "gamboa": { lat: -22.8968, lng: -43.1920 },
    "saude": { lat: -22.8965, lng: -43.1845 },
    "santo cristo": { lat: -22.8995, lng: -43.2015 },
    "caju": { lat: -22.8825, lng: -43.2185 },
    "sao cristovao": { lat: -22.9056, lng: -43.2217 },
    "quinta da boa vista": { lat: -22.9055, lng: -43.2248 },
    "benfica": { lat: -22.8915, lng: -43.2385 },
    "mangueira": { lat: -22.9035, lng: -43.2375 },
    "maracana": { lat: -22.9122, lng: -43.2302 },
    "tijuca": { lat: -22.9245, lng: -43.2325 },
    "alto da boa vista": { lat: -22.9615, lng: -43.2755 },
    "praca da bandeira": { lat: -22.9120, lng: -43.2150 },
    "rio comprido": { lat: -22.9235, lng: -43.2085 },
    "catumbi": { lat: -22.9185, lng: -43.1965 },
    "vila isabel": { lat: -22.9165, lng: -43.2465 },
    "grajau": { lat: -22.9235, lng: -43.2625 },
    "andarai": { lat: -22.9265, lng: -43.2515 },
    "engenho novo": { lat: -22.9035, lng: -43.2685 },
    "meier": { lat: -22.9025, lng: -43.2805 },
    "engenho de dentro": { lat: -22.8965, lng: -43.2965 },
    "piedade": { lat: -22.8925, lng: -43.3065 },
    "cascadura": { lat: -22.8825, lng: -43.3265 },
    "madureira": { lat: -22.8745, lng: -43.3385 },
    "oswaldo cruz": { lat: -22.8695, lng: -43.3505 },
    "marechal hermes": { lat: -22.8615, lng: -43.3705 },
    "campo dos afonsos": { lat: -22.8755, lng: -43.3855 },
    "vila militar": { lat: -22.8635, lng: -43.4025 },
    "deodoro": { lat: -22.8585, lng: -43.3855 },
    "bangu": { lat: -22.8755, lng: -43.4655 },
    "realengo": { lat: -22.8785, lng: -43.4325 },
    "padre miguel": { lat: -22.8745, lng: -43.4485 },
    "campo grande": { lat: -22.9025, lng: -43.5595 },
    "santa cruz": { lat: -22.9195, lng: -43.6845 },
    "guaratiba": { lat: -23.0055, lng: -43.5755 },
    "barra de guaratiba": { lat: -23.0655, lng: -43.5655 },
    "sepetiba": { lat: -22.9715, lng: -43.7025 },
    "barra da tijuca": { lat: -23.0005, lng: -43.3655 },
    "recreio": { lat: -23.0185, lng: -43.4625 },
    "vargem grande": { lat: -22.9815, lng: -43.4925 },
    "jacarepagua": { lat: -22.9385, lng: -43.3685 },
    "taquara": { lat: -22.9225, lng: -43.3725 },
    "freguesia": { lat: -22.9395, lng: -43.3425 },
    "cidade de deus": { lat: -22.9485, lng: -43.3625 },
    "bonsucesso": { lat: -22.8625, lng: -43.2535 },
    "mare": { lat: -22.8575, lng: -43.2430 },
    "manguinhos": { lat: -22.8775, lng: -43.2445 },
    "ramos": { lat: -22.8525, lng: -43.2585 },
    "olaria": { lat: -22.8445, lng: -43.2685 },
    "penha": { lat: -22.8395, lng: -43.2785 },
    "iraja": { lat: -22.8315, lng: -43.3265 },
    "pavuna": { lat: -22.8065, lng: -43.3645 },
    "ilha do governador": { lat: -22.8125, lng: -43.2005 },
    "galeao": { lat: -22.8155, lng: -43.2385 },
    "paqueta": { lat: -22.7605, lng: -43.1085 }
};

// Dicionário de bairros da Capital para classificação automática de Zona
const ZONAS_CAPITAL_RJ = {
    "Centro": ["centro", "lapa", "cidade nova", "gamboa", "saude", "santo cristo", "rio comprido", "catumbi", "estacio", "santa teresa", "sao cristovao", "benfica", "mangueira", "vasco da gama", "caju", "paqueta", "praca maua", "cinelandia", "praca xv"],
    "Sul": ["botafogo", "copacabana", "ipanema", "leblon", "leme", "urca", "flamengo", "gloria", "laranjeiras", "catete", "cosme velho", "humaita", "jardim botanico", "lagoa", "gavea", "sao conrado", "rocinha", "vidigal"],
    "Norte": ["tijuca", "vila isabel", "maracana", "grajau", "andarai", "engenho novo", "meier", "cachambi", "lins", "engenho de dentro", "piedade", "madureira", "cascadura", "oswaldo cruz", "campinho", "marechal hermes", "bonsucesso", "ramos", "olaria", "penha", "iraja", "pavuna", "ilha do governador", "galeao", "alto da boa vista", "jacarezinho", "mare", "manguinhos"],
    "Oeste": ["barra da tijuca", "recreio", "vargem grande", "vargem pequena", "jacarepagua", "cidade de deus", "freguesia", "taquara", "vila valqueire", "bangu", "padre miguel", "realengo", "deodoro", "vila militar", "campo dos afonsos", "campo grande", "santa cruz", "guaratiba", "sepetiba"]
};

// ============================================================================
// 1. INICIALIZAÇÃO, AJUSTES DOM E NORMALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', async function() {
    applyStructuralDOMUpdates();
    initHeroCarousel();
    initMapSystem();
    renderBulkFieldsPanel();
    await loadInitialCSVData();
});

/**
 * Inicializa o carrossel da página inicial e trata eventuais falhas de imagem
 * para garantir a transição automática contínua em desktop e dispositivos móveis.
 */
function initHeroCarousel() {
    const carouselEl = document.getElementById('heroCarouselBg');
    if (!carouselEl || typeof bootstrap === 'undefined' || !bootstrap.Carousel) return;

    carouselEl.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', () => {
            const item = img.closest('.carousel-item');
            if (item && carouselEl.querySelectorAll('.carousel-item').length > 1) {
                const wasActive = item.classList.contains('active');
                item.remove();
                if (wasActive) {
                    const firstRemaining = carouselEl.querySelector('.carousel-item');
                    if (firstRemaining) firstRemaining.classList.add('active');
                }
            }
        });
    });

    const instance = bootstrap.Carousel.getOrCreateInstance(carouselEl, {
        interval: 4000,
        ride: 'carousel',
        pause: false,
        wrap: true
    });
    instance.cycle();
}

/**
 * Garante as atualizações de camadas de modais (z-index)
 */
function applyStructuralDOMUpdates() {
    // 1. Eleva o z-index dos modais do Bootstrap acima do painel administrativo (#admin-panel)
    const styleFix = document.createElement('style');
    styleFix.innerHTML = `
        #gestorEditModal, #adminMapModal, #adminAccountModal, #museumModal { z-index: 2200 !important; }
        .modal-backdrop { z-index: 2150 !important; }
        .regional-pin-icon { background: transparent !important; border: none !important; }
        .map-legend-box { background: rgba(255,255,255,0.95); padding: 10px 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.18); font-size: 0.74rem; line-height: 1.4; border: 1px solid #cbd5e1; }
        .map-legend-swatch { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; vertical-align: middle; border: 1px solid rgba(0,0,0,0.2); }
    `;
    document.head.appendChild(styleFix);

    
    document.querySelectorAll('.navbar .dropdown-item').forEach(item => {
        if (item.textContent && item.textContent.toLowerCase().includes('marco legal')) {
            const li = item.closest('li');
            if (li) li.remove();
        }
    });

    
    const legSection = document.getElementById('view-legislacao');
    if (legSection) {
        legSection.querySelectorAll('a').forEach(link => {
            if (link.getAttribute('href')?.includes('COMISS') || link.textContent.toLowerCase().includes('comissão consultiva')) {
                link.remove();
            }
        });
    }

    
    const equipeSection = document.getElementById('view-equipe');
    if (equipeSection) {
        equipeSection.querySelectorAll('.team-member').forEach(member => {
            if (member.textContent.toLowerCase().includes('alice ara')) {
                member.remove();
            }
        });

        equipeSection.querySelectorAll('h5').forEach(h5 => {
            const titleText = h5.textContent.toLowerCase();
            if (titleText.includes('coordenação do sistema')) {
                const row = h5.parentElement.querySelector('.row');
                if (row && !row.innerHTML.toLowerCase().includes('catharyna')) {
                    row.querySelectorAll('.team-member').forEach(col => {
                        col.className = 'col-md-3 col-sm-6 team-member';
                    });
                    const catharynaCol = document.createElement('div');
                    catharynaCol.className = 'col-md-3 col-sm-6 team-member';
                    catharynaCol.innerHTML = `
                        <img src="catharyna.jpeg" class="rounded-circle" alt="Catharyna Reimol" onerror="this.src='https://via.placeholder.com/150'">
                        <h6>Catharyna Reimol</h6>
                        <p class="team-intern">Estagiária</p>
                    `;
                    row.appendChild(catharynaCol);
                }
            }
            if (titleText.includes('coordenação de museologia')) {
                const row = h5.parentElement.querySelector('.row');
                if (row) {
                    row.querySelectorAll('.team-member').forEach(col => {
                        col.className = 'col-md-4 col-sm-6 team-member';
                    });
                }
            }
        });
    }
}

function initMapSystem() {
    document.getElementById('map').innerHTML = "";
    map = L.map('map').setView([-22.45, -42.85], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    addRegionalLegendToMap();

    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    editModal = new bootstrap.Modal(document.getElementById('gestorEditModal'));
}

function addRegionalLegendToMap() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-legend-box');
        div.innerHTML = `
            <div class="fw-bold text-dark mb-1 border-bottom pb-1">Regiões do Estado</div>
            <div><span class="map-legend-swatch" style="background:#af8447;"></span>Metropolitanas (I, II e III)</div>
            <div><span class="map-legend-swatch" style="background:#ef8739;"></span>Centro-Sul</div>
            <div><span class="map-legend-swatch" style="background:#0d92df;"></span>Serrana</div>
            <div><span class="map-legend-swatch" style="background:#58cfa5;"></span>Médio Paraíba</div>
            <div><span class="map-legend-swatch" style="background:#0d6b2a;"></span>Costa Verde</div>
            <div><span class="map-legend-swatch" style="background:#aabddb;"></span>Baixadas Litorâneas</div>
            <div><span class="map-legend-swatch" style="background:#d69f9d;"></span>Norte Fluminense</div>
            <div><span class="map-legend-swatch" style="background:#edeb40;"></span>Noroeste Fluminense</div>
        `;
        return div;
    };
    legend.addTo(map);
}

const normalizeString = (str) => {
    if (!str) return "";
    return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase()
        .trim();
};

function canonicalizeMunicipality(rawCity) {
    if (!rawCity) return "Não informado";
    const normInput = normalizeString(rawCity);
    if (!normInput) return "Não informado";

    for (const officialCity of MUNICIPIOS_OFICIAIS_RJ) {
        if (normalizeString(officialCity) === normInput) {
            return officialCity;
        }
    }
    if (normInput === "sao francisco do itabapoana") return "São Francisco de Itabapoana";

    return String(rawCity).trim().replace(/\s+/g, ' ').split(' ').map((word, idx) => {
        const lower = word.toLowerCase();
        if (idx > 0 && ['de', 'da', 'do', 'das', 'dos', 'e'].includes(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join(' ');
}

/**
 * Padroniza a Região do Estado (garantindo distinção exata entre Metropolitana I, II e III)
 * com base na coluna Região e na validação cruzada pelo Município.
 */
function canonicalizeRegion(rawRegion, canonicalMuni) {
    const normMuni = normalizeString(canonicalMuni);
    for (const [regiaoOficial, listaMunis] of Object.entries(REGIOES_POR_MUNICIPIO)) {
        if (listaMunis.includes(normMuni)) {
            return regiaoOficial;
        }
    }

    const normReg = normalizeString(rawRegion);
    if (!normReg) return "Não informada";
    if (normReg === "metropolitana i" || normReg === "metropolitana 1" || (normReg === "metropolitana" && normMuni === "rio de janeiro")) return "Metropolitana I";
    if (normReg === "metropolitana ii" || normReg === "metropolitana 2") return "Metropolitana II";
    if (normReg === "metropolitana iii" || normReg === "metropolitana 3") return "Metropolitana III";
    if (normReg.includes("centro sul")) return "Centro-Sul";
    if (normReg.includes("medio paraiba")) return "Médio Paraíba";
    if (normReg.includes("costa verde")) return "Costa Verde";
    if (normReg.includes("baixadas litoraneas")) return "Baixadas Litorâneas";
    if (normReg.includes("norte fluminense")) return "Norte Fluminense";
    if (normReg.includes("noroeste fluminense")) return "Noroeste Fluminense";
    if (normReg.includes("serrana")) return "Serrana";

    return rawRegion.trim();
}

function getRegionPinColor(regiao) {
    const norm = normalizeString(regiao);
    return CORES_REGIOES_RJ[norm] || "#006666";
}

function createRegionalPinIcon(regiao) {
    const fillColor = getRegionPinColor(regiao);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 40" width="28" height="40" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
            <path d="M14 1C6.82 1 1 6.82 1 14c0 9.75 13 24.5 13 24.5S27 23.75 27 14C27 6.82 21.18 1 14 1z"
                  fill="${fillColor}" stroke="#ffffff" stroke-width="2"/>
            <circle cx="14" cy="14" r="5" fill="#ffffff"/>
        </svg>
    `;
    return L.divIcon({
        className: 'regional-pin-icon',
        html: svg,
        iconSize: [28, 40],
        iconAnchor: [14, 39],
        popupAnchor: [0, -36]
    });
}

function parseCoordinate(val) {
    if (val === null || val === undefined || val === "") return null;
    const f = parseFloat(String(val).replace(',', '.').replace(/[^0-9.-]/g, ''));
    return isNaN(f) ? null : f;
}

function isWithinRJ(lat, lng) {
    return (lat >= -23.5 && lat <= -20.6) && (lng >= -45.0 && lng <= -40.8);
}

/**
 * Identifica se o acervo ou endereço da instituição é predominantemente digital/virtual.
 * Instituições digitais/virtuais não devem possuir pino no mapa.
 */
function isPredominantlyDigital(acervo, endereco, natureza) {
    const combined = normalizeString(`${acervo || ''} ${endereco || ''} ${natureza || ''}`);
    return /\b(digital|virtual|on line|online|cibermuseu|web)\b/.test(combined);
}

/**
 * Verifica se uma coordenada no município do Rio de Janeiro corresponde ao ponto genérico
 * de centroide municipal (-22.9110, -43.2094 ou -22.9068, -43.1729) que gerava o agrupamento em cruz.
 */
function isGenericRioCentroid(lat, lng) {
    if (lat === null || lng === null) return false;
    const isNominatimRioCenter = Math.abs(lat - (-22.9110137)) < 0.0012 && Math.abs(lng - (-43.2093727)) < 0.0012;
    const isDefaultRioCenter = Math.abs(lat - (-22.9068)) < 0.0010 && Math.abs(lng - (-43.1729)) < 0.0010;
    return isNominatimRioCenter || isDefaultRioCenter;
}

/**
 * Resolve a localização real por bairro ou logradouro de instituições da Capital que
 * caíram no centroide genérico do município. Caso não haja endereço físico válido, retorna null
 * para que a instituição vá para a fila "Sem Geolocalização".
 */
function resolveRioNeighborhoodCoordinate(nome, endereco, indexSeed) {
    const endNorm = normalizeString(endereco);
    if (!endNorm || endNorm === "nao informado" || endNorm === "s/n" || endNorm.length < 4) {
        return null;
    }

    const searchTarget = normalizeString(`${endereco} ${nome}`);
    for (const [bairroKey, coords] of Object.entries(COORDENADAS_BAIRROS_RIO)) {
        if (searchTarget.includes(bairroKey)) {
            const goldenAngle = indexSeed * 2.399963229728653;
            const microRadius = 0.00045 * Math.sqrt((indexSeed % 9) + 1);
            return {
                lat: coords.lat + microRadius * Math.cos(goldenAngle),
                lng: coords.lng + microRadius * Math.sin(goldenAngle)
            };
        }
    }

    if (searchTarget.includes("centro") || searchTarget.includes("rua ") || searchTarget.includes("av ") || searchTarget.includes("avenida ") || searchTarget.includes("praca ")) {
        const goldenAngle = indexSeed * 2.399963229728653;
        const microRadius = 0.0008 * Math.sqrt((indexSeed % 12) + 1);
        return {
            lat: -22.9058 + microRadius * Math.cos(goldenAngle),
            lng: -43.1782 + microRadius * Math.sin(goldenAngle)
        };
    }

    return null;
}

function inferirZonaRJ(endereco, municipio, zonaAtual) {
    if (!normalizeString(municipio).includes("rio de janeiro")) return "";
    if (zonaAtual && zonaAtual.trim() !== "") return zonaAtual.trim();
    const endNorm = normalizeString(endereco);
    for (const [zona, bairros] of Object.entries(ZONAS_CAPITAL_RJ)) {
        if (bairros.some(b => endNorm.includes(b))) return zona;
    }
    return "";
}

// ============================================================================
// 2. LEITURA E PROCESSAMENTO DA BASE DE DADOS (dados.csv)
// ============================================================================
async function loadInitialCSVData() {
    try {
        const response = await fetch('dados.csv');
        if (!response.ok) throw new Error("Arquivo dados.csv não localizado.");
        const csvText = await response.text();
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: async function(results) {
                await processParsedData(results.data);
            }
        });
    } catch (e) {
        console.warn("Base inicial dados.csv aguardando carregamento.");
    }
}

const getColValue = (row, names) => {
    for (const name of names) {
        const target = normalizeString(name);
        for (const key in row) {
            if (normalizeString(key) === target) {
                return row[key] ? String(row[key]).trim() : "";
            }
        }
    }
    return "";
};

async function processParsedData(rawData) {
    let cleanData = [];

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        const nome = getColValue(row, ["Nome da Instituição", "Nome"]);
        if (!nome) continue;

        const municipioPadronizado = canonicalizeMunicipality(getColValue(row, ["Município", "Municipio"]));
        const regiaoPadronizada = canonicalizeRegion(getColValue(row, ["Região", "Regiao"]), municipioPadronizado);
        const endereco = getColValue(row, ["Endereço", "Endereco", "Logradouro"]);
        const acervo = getColValue(row, ["Acervo Predominante", "Acervo"]);
        const natureza = getColValue(row, ["Natureza Administrativa do Museu", "Natureza Administrativa", "Natureza"]) || "Privada";

        let lat = parseCoordinate(getColValue(row, ["Lat", "Latitude"]));
        let lng = parseCoordinate(getColValue(row, ["Lng", "Longitude", "Lon"]));

        if (lat !== null && lng !== null && !isWithinRJ(lat, lng)) {
            lat = null;
            lng = null;
        }

        const isDigital = isPredominantlyDigital(acervo, endereco, natureza);
        let coordAproximada = false;

        if (isDigital) {
            lat = null;
            lng = null;
        } else if (normalizeString(municipioPadronizado) === "rio de janeiro" && isGenericRioCentroid(lat, lng)) {
            const resolvedRio = resolveRioNeighborhoodCoordinate(nome, endereco, i);
            if (resolvedRio) {
                lat = resolvedRio.lat;
                lng = resolvedRio.lng;
                coordAproximada = true;
            } else {
                lat = null;
                lng = null;
            }
        } else if (lat === null || lng === null) {
            const endNorm = normalizeString(endereco);
            const hasPhysicalAddress = endNorm && endNorm !== "nao informado" && endNorm !== "sem endereco" && endNorm.length >= 4;
            const normCity = normalizeString(municipioPadronizado);

            if (hasPhysicalAddress && normCity !== "rio de janeiro" && COORDENADAS_MUNICIPIOS_RJ[normCity]) {
                lat = COORDENADAS_MUNICIPIOS_RJ[normCity].lat;
                lng = COORDENADAS_MUNICIPIOS_RJ[normCity].lng;
                coordAproximada = true;
            } else {
                lat = null;
                lng = null;
            }
        }

        let mObj = {
            id: i + 1000,
            id_cfm: getColValue(row, ["Nº CFM", "ID", "CFM"]),
            nome: nome,
            sigla: getColValue(row, ["Sigla"]),
            cnpj: getColValue(row, ["CNPJ"]),
            documento_criacao: getColValue(row, ["Documento de Criação", "Documento"]),
            municipio: municipioPadronizado,
            regiao: regiaoPadronizada,
            zona: inferirZonaRJ(endereco, municipioPadronizado, getColValue(row, ["Zona do Rio", "Zona"])),
            endereco: endereco,
            telefone: getColValue(row, ["Telefone Institucional", "Telefone", "Contato"]),
            email: getColValue(row, ["E-mail Institucional", "Email Institucional", "Email"]),
            site: getColValue(row, ["Site", "Site Oficial", "Website"]),
            facebook: getColValue(row, ["Facebook"]),
            instagram: getColValue(row, ["Instagram"]),
            twitter: getColValue(row, ["Twitter", "Twitter/X", "X"]),
            natureza: natureza,
            situacao: getColValue(row, ["Situação", "Situacao", "Status"]) || "Aberto",
            funcionamento: getColValue(row, ["Funcionamento", "Horário", "Turnos"]),
            ingresso: getColValue(row, ["Valor ingresso", "Valor do Ingresso", "Ingresso"]),
            gratuidades: getColValue(row, ["Gratuidades", "Gratuidade"]),
            acervo: acervo,
            educativo: getColValue(row, ["Setor Educativo", "Educativo"]),
            museologo: getColValue(row, ["Museólogo", "Museologo"]),
            acessibilidade: getColValue(row, ["Acessibilidade", "Acessibilidade Universal"]),
            historico_museu: getColValue(row, ["Histórico", "Historico", "Histórico do Museu"]),
            resp_nome: getColValue(row, ["Responsável pelo Cadastro", "Responsável", "Responsavel"]),
            resp_email: getColValue(row, ["E-mail do Responsável", "Email Responsavel"]),
            lat: lat,
            lng: lng,
            is_digital: isDigital,
            coord_aproximada: coordAproximada,
            visivel: true,
            hidden_fields: {},
            history: []
        };

        if (localEditsMemory[mObj.nome]) {
            mObj = { ...mObj, ...localEditsMemory[mObj.nome] };
            mObj.municipio = canonicalizeMunicipality(mObj.municipio);
            mObj.regiao = canonicalizeRegion(mObj.regiao, mObj.municipio);
            if (isPredominantlyDigital(mObj.acervo, mObj.endereco, mObj.natureza)) {
                mObj.lat = null;
                mObj.lng = null;
                mObj.is_digital = true;
            }
        }

        cleanData.push(mObj);
    }

    museumsData = cleanData;
    populateCityFilter();
    applyFilters();
}

function populateCityFilter() {
    const select = document.getElementById('filterMunicipio');
    if (!select) return;
    const currentSelection = select.value;
    select.innerHTML = '<option value="">Todos os Municípios</option>';

    const uniqueCities = [...new Set(museumsData.map(m => canonicalizeMunicipality(m.municipio)).filter(c => c && c !== "Não informado"))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    uniqueCities.forEach(city => {
        select.appendChild(new Option(city, city));
    });
    if (uniqueCities.includes(currentSelection)) {
        select.value = currentSelection;
    }
}

// ============================================================================
// 3. SISTEMA DE FILTRAGEM E PLOTAGEM DE PINOS COLORIDOS POR REGIÃO
// ============================================================================
function getCheckedValues(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map(el => normalizeString(el.value));
}

window.applyFilters = function() {
    const termo = normalizeString(document.getElementById('filterNome')?.value || '');
    const mapStat = document.getElementById('filterStatusMapa')?.value;
    const muniRaw = document.getElementById('filterMunicipio')?.value || '';
    const muni = normalizeString(muniRaw);
    const gratuidade = normalizeString(document.getElementById('filterGratuidade')?.value || '');
    const acesso = normalizeString(document.getElementById('filterAcesso')?.value || '');

    const regioes = getCheckedValues('boxRegiao');
    const naturezas = getCheckedValues('boxNatureza');
    const acervos = getCheckedValues('boxAcervo');
    const situacoes = getCheckedValues('boxSituacao');
    const turnos = getCheckedValues('boxTurno');
    const ingressos = getCheckedValues('boxIngresso');
    const zonas = getCheckedValues('boxZona');

    const reqMuseologo = document.getElementById('checkMuseologo')?.checked || false;
    const reqEdu = document.getElementById('checkEdu')?.checked || false;

    const badgeMuni = document.getElementById('activeMuniBadge');
    if (badgeMuni) badgeMuni.innerText = muniRaw ? muniRaw : "Estado do RJ";

    currentFilteredData = museumsData.filter(m => {
        if (!m.visivel && !isGestor) return false;

        const mNome = normalizeString(m.nome);
        const mMuni = normalizeString(m.municipio);
        const mReg = normalizeString(m.regiao);
        const mNat = normalizeString(m.natureza);
        const mAcer = normalizeString(m.acervo);
        const mSit = normalizeString(m.situacao);
        const mFunc = normalizeString(m.funcionamento);
        const mIng = normalizeString(m.ingresso);
        const mGrat = normalizeString(m.gratuidades);
        const mAcc = normalizeString(m.acessibilidade);
        const mZona = normalizeString(m.zona);

        if (termo && !mNome.includes(termo)) return false;
        if (muni && mMuni !== muni) return false;
        if (gratuidade && !mGrat.includes(gratuidade)) return false;
        if (acesso && !mAcc.includes(acesso)) return false;

        if (regioes.length > 0 && !regioes.includes(mReg)) return false;
        if (naturezas.length > 0 && !naturezas.some(n => mNat.includes(n))) return false;
        if (acervos.length > 0 && !acervos.some(a => mAcer.includes(a))) return false;
        if (situacoes.length > 0 && !situacoes.some(s => mSit.includes(s))) return false;
        if (turnos.length > 0 && !turnos.some(t => mFunc.includes(t))) return false;
        if (ingressos.length > 0 && !ingressos.some(i => mIng.includes(i))) return false;

        if (reqMuseologo && normalizeString(m.museologo) !== "sim") return false;
        if (reqEdu && normalizeString(m.educativo) !== "sim") return false;

        if (zonas.length > 0) {
            if (!mMuni.includes("rio de janeiro")) return false;
            if (!zonas.some(z => mZona.includes(z))) return false;
        }

        const hasValidPin = m.lat !== null && m.lng !== null && !m.is_digital;
        if (mapStat === 'sim' && !hasValidPin) return false;
        if (mapStat === 'nao' && hasValidPin) return false;

        return true;
    });

    renderMuseums(currentFilteredData, Boolean(muni || regioes.length > 0));
    updateAdminDashboardMetrics();
    if (isGestor) {
        renderVisibilityList();
        updatePendingList();
    }
};

window.resetFilters = function() {
    document.querySelectorAll('.sidebar-filters input[type="text"], .sidebar-filters select').forEach(el => el.value = '');
    document.querySelectorAll('.sidebar-filters input[type="checkbox"]').forEach(el => el.checked = false);
    applyFilters();
    if (map) map.setView([-22.45, -42.85], 8);
};

function renderMuseums(data, focusOnPins = false) {
    markersArray.forEach(m => map.removeLayer(m));
    markersArray = [];

    const publicData = data.filter(m => m.visivel).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    document.getElementById('count-total').innerText = museumsData.filter(m => m.visivel).length;
    document.getElementById('resultCount').innerText = publicData.length;

    let htmlTable = `
        <div class="table-responsive surface-card p-3">
            <table class="table table-hover align-middle small mb-0">
                <thead class="table-light text-uppercase" style="font-size: 0.75rem;">
                    <tr>
                        <th>Instituição</th>
                        <th>Município</th>
                        <th>Região</th>
                        <th>Natureza</th>
                        <th>Situação</th>
                        <th class="text-end">Ação</th>
                    </tr>
                </thead>
                <tbody>`;
    let htmlList = '';

    const coordUsageCount = {};
    const boundsPoints = [];

    publicData.forEach(m => {
        const sitNorm = normalizeString(m.situacao);
        let sitBadge = 'badge-secec-slate';
        if (sitNorm.includes('aberto') && !sitNorm.includes('parcial')) sitBadge = 'badge-secec-green';
        else if (sitNorm.includes('parcial') || sitNorm.includes('implantacao')) sitBadge = 'badge-secec-amber';
        else if (sitNorm.includes('desativado') || sitNorm.includes('fechado')) sitBadge = 'badge-secec-red';

        const regColor = getRegionPinColor(m.regiao);
        const hasPin = m.lat !== null && m.lng !== null && !m.is_digital;
        const digitalTag = !hasPin ? `<span class="badge-secec badge-secec-purple ms-1"><i class="fa-solid fa-laptop"></i> Sem Pino / Digital</span>` : '';

        const btnFicha = `<button class="btn btn-sm btn-outline-primary fw-bold" onclick="openProfile(${m.id})"><i class="fa-regular fa-folder-open me-1"></i>Ver Ficha</button>`;

        htmlTable += `
            <tr class="tr-lista-item">
                <td class="fw-bold text-dark">${m.nome} ${digitalTag}</td>
                <td>${m.municipio}</td>
                <td><span class="map-legend-swatch" style="background:${regColor};"></span>${m.regiao}</td>
                <td>${ isFieldHidden(m, 'natureza') ? '<span class="text-muted">-</span>' : m.natureza }</td>
                <td><span class="badge-secec ${sitBadge}">${ isFieldHidden(m, 'situacao') ? 'Oculto' : m.situacao }</span></td>
                <td class="text-end">${btnFicha}</td>
            </tr>`;

        htmlList += `
            <div class="museum-result-card p-3 mb-2 d-flex justify-content-between align-items-center gap-2" style="border-left-color: ${regColor};">
                <div>
                    <h6 class="fw-bold text-primary mb-1" style="font-size: 0.92rem;">${m.nome}</h6>
                    <div class="small text-secondary">
                        <span class="map-legend-swatch" style="background:${regColor};"></span>${m.municipio} (${m.regiao}) • ${ isFieldHidden(m, 'natureza') ? '' : m.natureza }
                    </div>
                    <div class="mt-1">
                        <span class="badge-secec ${sitBadge}">${ isFieldHidden(m, 'situacao') ? 'Restrito' : m.situacao }</span>
                        ${digitalTag}
                    </div>
                </div>
                <div class="flex-shrink-0">${btnFicha}</div>
            </div>`;

        if (hasPin) {
            const coordKey = `${m.lat.toFixed(4)}_${m.lng.toFixed(4)}`;
            const count = coordUsageCount[coordKey] || 0;
            coordUsageCount[coordKey] = count + 1;

            let plotLat = m.lat;
            let plotLng = m.lng;

            if (count > 0) {
                const goldenAngle = count * 2.399963229728653;
                const radius = 0.00055 * Math.sqrt(count);
                plotLat += radius * Math.cos(goldenAngle);
                plotLng += radius * Math.sin(goldenAngle);
            }

            const marker = L.marker([plotLat, plotLng], {
                icon: createRegionalPinIcon(m.regiao)
            }).addTo(map);

            marker.bindPopup(`
                <div class="text-center p-1" style="min-width: 190px;">
                    <h6 class="fw-bold text-primary mb-1">${m.nome}</h6>
                    <small class="d-block text-secondary mb-2">
                        <span class="map-legend-swatch" style="background:${regColor};"></span>${m.municipio} • ${m.regiao}
                    </small>
                    <button class="btn btn-sm btn-warning w-100 fw-bold" onclick="openProfile(${m.id})">Ver Ficha Completa</button>
                </div>
            `);
            markersArray.push(marker);
            boundsPoints.push([plotLat, plotLng]);
        }
    });

    htmlTable += '</tbody></table></div>';
    if (document.getElementById('container-lista-geral')) {
        document.getElementById('container-lista-geral').innerHTML = htmlTable;
    }
    if (document.getElementById('museum-list-container')) {
        document.getElementById('museum-list-container').innerHTML = htmlList || '<div class="alert alert-light border text-center small text-muted">Nenhuma instituição encontrada para os filtros selecionados.</div>';
    }

    if (focusOnPins && boundsPoints.length > 0 && map) {
        map.fitBounds(boundsPoints, { padding: [45, 45], maxZoom: 14 });
    }
}

window.filterListaTexto = function() {
    const input = normalizeString(document.getElementById('searchLista').value);
    document.querySelectorAll('#container-lista-geral tbody tr').forEach(row => {
        row.style.display = normalizeString(row.innerText).includes(input) ? '' : 'none';
    });
};

// ============================================================================
// 4. CONTROLE DE VISIBILIDADE (INDIVIDUAL + EDIÇÃO EM BLOCO) E FICHA PÚBLICA
// ============================================================================
function isFieldHidden(museum, fieldId) {
    if (globalHiddenFields && globalHiddenFields[fieldId]) return true;
    if (museum.hidden_fields && museum.hidden_fields[fieldId]) return true;
    return false;
}

window.openProfile = function(id) {
    const m = museumsData.find(x => String(x.id) === String(id));
    if (!m) return;

    const val = (vStr, idCampo) => {
        if (isFieldHidden(m, idCampo)) {
            return '<span class="badge-secec badge-secec-slate"><i class="fa-solid fa-eye-slash"></i> Informação Oculta pela Gestão</span>';
        }
        return (vStr && String(vStr).trim() !== '') ? vStr : '<span class="text-muted fst-italic">Não informado</span>';
    };

    document.getElementById('modalTitle').innerText = m.nome;

    const siteHtml = (!isFieldHidden(m, 'site') && m.site)
        ? `<a href="${m.site.startsWith('http') ? m.site : 'https://' + m.site}" target="_blank" rel="noopener">${m.site}</a>`
        : val(m.site, 'site');

    const alertSemPino = (m.lat === null || m.lng === null || m.is_digital)
        ? `<div class="alert alert-info small py-2 mb-3"><i class="fa-solid fa-circle-info me-1"></i> ${m.is_digital ? 'Instituição de natureza virtual / acervo predominantemente digital (sem pino físico no mapa).' : 'Instituição sem geolocalização física ativa no mapa.'}</div>`
        : '';

    const html = `
        ${alertSemPino}
        <div class="row mb-3 border-bottom pb-3">
            <div class="col-md-8">
                <p class="mb-1 text-primary fw-bold"><i class="fa-solid fa-location-dot me-1"></i> ${val(m.endereco, 'endereco')}</p>
                <p class="mb-1 text-secondary small">
                    <strong>Município:</strong> ${val(m.municipio, 'municipio')} |
                    <strong>Região:</strong> ${val(m.regiao, 'regiao')}
                    ${m.zona ? ` | <strong>Zona:</strong> ${val(m.zona, 'zona')}` : ''}
                </p>
                <p class="mt-2 mb-1 small">
                    <strong>Telefone:</strong> ${val(m.telefone, 'telefone')} |
                    <strong>E-mail:</strong> ${val(m.email, 'email')}
                </p>
                <p class="mb-0 small">
                    <strong>Site:</strong> ${siteHtml}
                    ${m.instagram ? ` | <strong>Instagram:</strong> ${val(m.instagram, 'instagram')}` : ''}
                </p>
            </div>
            <div class="col-md-4 text-md-end mt-2 mt-md-0">
                <div class="mb-1"><span class="badge-secec badge-secec-blue">${val(m.natureza, 'natureza')}</span></div>
                <div><span class="badge-secec badge-secec-green">${val(m.situacao, 'situacao')}</span></div>
                ${m.sigla ? `<div class="small text-muted mt-1">Sigla: ${val(m.sigla, 'sigla')}</div>` : ''}
            </div>
        </div>

        <h6 class="modal-subtitle">Funcionamento, Acesso e Acervo</h6>
        <div class="row small mb-3 g-2">
            <div class="col-12"><strong>Acervo Predominante:</strong> ${val(m.acervo, 'acervo')}</div>
            <div class="col-sm-6"><strong>Dias e Turnos:</strong> ${val(m.funcionamento, 'funcionamento')}</div>
            <div class="col-sm-6"><strong>Valor do Ingresso:</strong> ${val(m.ingresso, 'ingresso')}</div>
            <div class="col-12"><strong>Política de Gratuidades:</strong> ${val(m.gratuidades, 'gratuidades')}</div>
            <div class="col-sm-6"><strong>Setor Educativo:</strong> ${val(m.educativo, 'educativo')}</div>
            <div class="col-sm-6"><strong>Possui Museólogo:</strong> ${val(m.museologo, 'museologo')}</div>
            <div class="col-12"><strong>Acessibilidade Universal:</strong> ${val(m.acessibilidade, 'acessibilidade')}</div>
        </div>

        <h6 class="modal-subtitle">Histórico da Instituição</h6>
        <p class="small text-secondary mb-0" style="text-align: justify;">${val(m.historico_museu, 'historico_museu')}</p>
    `;

    document.getElementById('modalPublicBody').innerHTML = html;
    if (!profileModal) profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    profileModal.show();
};

// ============================================================================
// 5. NAVEGAÇÃO PÚBLICA SPA E OUVIDORIA / FAQ
// ============================================================================
window.switchView = function(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if (target) target.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewId === 'home' && map) {
        setTimeout(() => { map.invalidateSize(); }, 200);
    }
};

window.showPlaceholder = function(titleText) {
    document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
    document.getElementById('view-em-construcao').style.display = 'block';
    document.getElementById('construcao-title').innerText = titleText;
};

window.submitPublicFeedback = function(e) {
    e.preventDefault();
    const registro = {
        id: Date.now(),
        data: new Date().toLocaleString('pt-BR'),
        nome: document.getElementById('fbNome').value.trim(),
        email: document.getElementById('fbEmail').value.trim(),
        tipo: document.getElementById('fbTipo').value,
        mensagem: document.getElementById('fbMensagem').value.trim()
    };
    publicFeedbacks.unshift(registro);
    localStorage.setItem('simrj_feedbacks', JSON.stringify(publicFeedbacks));
    document.getElementById('faqForm').reset();
    updateAdminDashboardMetrics();
    alert("Sua manifestação foi registrada com sucesso e encaminhada à equipe técnica da Superintendência de Museus (SUPMU).");
};

// ============================================================================
// 6. BACK-OFFICE SECEC (PAINEL DO GESTOR, EDIÇÃO EM BLOCO E LOGOUT LIMPO)
// ============================================================================
window.openAdminOrLogin = function() {
    if (isGestor) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'flex';
        updateAdminDashboardMetrics();
        renderVisibilityList();
        renderBulkFieldsPanel();
        updatePendingList();
        renderAdminFeedbacks();
    } else {
        document.getElementById('adminPassword').value = '';
        document.getElementById('login-overlay').style.display = 'flex';
    }
};

window.closeLogin = function() {
    document.getElementById('login-overlay').style.display = 'none';
};

window.minimizarPainelGestor = function() {
    document.getElementById('admin-panel').style.display = 'none';
    if (map) setTimeout(() => map.invalidateSize(), 200);
};

window.checkAdminPassword = function() {
    const passInput = document.getElementById('adminPassword').value;
    const nameInput = document.getElementById('adminUserNameInput').value.trim();

    if (passInput === adminSavedPassword) {
        isGestor = true;
        if (nameInput) {
            currentOperatorName = nameInput;
            document.getElementById('adminUserDisplayName').innerText = nameInput;
            document.getElementById('adminDropdownName').innerText = nameInput;
            const initials = nameInput.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            document.getElementById('adminUserInitials').innerText = initials || 'GS';
        }
        document.querySelectorAll('.gestor-only').forEach(el => el.classList.remove('d-none'));
        closeLogin();
        openAdminOrLogin();
    } else {
        alert('Credencial administrativa incorreta.');
    }
};

window.logoutGestor = function(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    isGestor = false;

    ['gestorEditModal', 'adminMapModal', 'adminAccountModal'].forEach(modalId => {
        const el = document.getElementById(modalId);
        if (el) {
            const inst = bootstrap.Modal.getInstance(el);
            if (inst) inst.hide();
        }
    });
    document.querySelectorAll('.dropdown-menu.show').forEach(dm => dm.classList.remove('show'));
    document.querySelectorAll('.modal-backdrop').forEach(mb => mb.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';

    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('login-overlay').style.display = 'none';
    const passField = document.getElementById('adminPassword');
    if (passField) passField.value = '';

    document.querySelectorAll('.gestor-only').forEach(el => el.classList.add('d-none'));
    applyFilters();
    if (map) setTimeout(() => map.invalidateSize(), 200);
};

window.toggleAdminSidebar = function() {
    const sidebar = document.getElementById('adminSidebar');
    if (window.innerWidth <= 991) {
        toggleAdminSidebarMobile();
    } else {
        sidebar.classList.toggle('collapsed');
    }
};

window.toggleAdminSidebarMobile = function() {
    const sidebar = document.getElementById('adminSidebar');
    const backdrop = document.getElementById('adminSidebarBackdrop');
    sidebar.classList.toggle('mobile-open');
    backdrop.classList.toggle('show');
};

window.switchAdminTab = function(tabKey, title, subtitle) {
    document.querySelectorAll('.admin-tab-pane').forEach(el => el.style.display = 'none');
    const target = document.getElementById('admin-tab-' + tabKey);
    if (target) target.style.display = 'block';

    document.querySelectorAll('.admin-nav-link').forEach(btn => btn.classList.remove('active'));
    if (typeof event !== 'undefined' && event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    document.getElementById('adminTopbarTitle').innerText = title;
    document.getElementById('adminTopbarSubtitle').innerText = subtitle;

    if (window.innerWidth <= 991) {
        document.getElementById('adminSidebar').classList.remove('mobile-open');
        document.getElementById('adminSidebarBackdrop').classList.remove('show');
    }
    if (tabKey === 'pending') updatePendingList();
    if (tabKey === 'feedbacks') renderAdminFeedbacks();
};

function updateAdminDashboardMetrics() {
    const total = museumsData.length;
    const semPino = museumsData.filter(m => m.lat === null || m.lng === null || m.is_digital).length;
    const comPino = total - semPino;
    const ocultosBloco = Object.values(globalHiddenFields).filter(Boolean).length;

    if (document.getElementById('kpiTotalMuseus')) document.getElementById('kpiTotalMuseus').innerText = total;
    if (document.getElementById('kpiComPino')) document.getElementById('kpiComPino').innerText = comPino;
    if (document.getElementById('kpiSemPino')) document.getElementById('kpiSemPino').innerText = semPino;
    if (document.getElementById('kpiCamposOcultos')) document.getElementById('kpiCamposOcultos').innerText = ocultosBloco;
    if (document.getElementById('gestaoCount')) document.getElementById('gestaoCount').innerText = total;
    if (document.getElementById('pendingCount')) document.getElementById('pendingCount').innerText = semPino;
    if (document.getElementById('feedbackCount')) document.getElementById('feedbackCount').innerText = publicFeedbacks.length;
}

// Painel de Edição em Bloco
function renderBulkFieldsPanel() {
    const container = document.getElementById('bulkFieldsContainer');
    if (!container) return;

    let html = '';
    CATALOGO_CAMPOS_CFM.forEach(campo => {
        const isCurrentlyVisible = !globalHiddenFields[campo.id];
        html += `
            <div class="col-md-6 col-lg-4">
                <div class="p-3 border rounded d-flex justify-content-between align-items-center bg-light">
                    <div>
                        <div class="fw-bold small text-dark">${campo.label}</div>
                        <small class="${isCurrentlyVisible ? 'text-success' : 'text-danger'} fw-semibold" id="status_label_bulk_${campo.id}">
                            ${isCurrentlyVisible ? 'Visível em todas as fichas' : 'Oculto em bloco'}
                        </small>
                    </div>
                    <div class="form-check form-switch m-0">
                        <input class="form-check-input bulk-field-switch" type="checkbox" role="switch"
                            id="bulk_switch_${campo.id}" data-field="${campo.id}"
                            ${isCurrentlyVisible ? 'checked' : ''}
                            onchange="updateBulkSwitchLabel('${campo.id}', this.checked)">
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

window.updateBulkSwitchLabel = function(fieldId, isChecked) {
    const lbl = document.getElementById(`status_label_bulk_${fieldId}`);
    if (!lbl) return;
    lbl.innerText = isChecked ? 'Visível em todas as fichas' : 'Oculto em bloco';
    lbl.className = isChecked ? 'text-success fw-semibold' : 'text-danger fw-semibold';
};

window.setAllBulkFields = function(visibleState) {
    document.querySelectorAll('.bulk-field-switch').forEach(sw => {
        sw.checked = visibleState;
        updateBulkSwitchLabel(sw.dataset.field, visibleState);
    });
};

window.saveBulkFieldVisibility = function() {
    const updatedBulk = {};
    document.querySelectorAll('.bulk-field-switch').forEach(sw => {
        const fieldId = sw.dataset.field;
        if (!sw.checked) {
            updatedBulk[fieldId] = true;
        }
    });

    globalHiddenFields = updatedBulk;
    localStorage.setItem('simrj_bulk_hidden_fields', JSON.stringify(globalHiddenFields));
    applyFilters();
    alert("Configuração de visibilidade em bloco aplicada com sucesso a todas as fichas.");
};

// Lista de Gestão Individual
window.renderVisibilityList = function() {
    const term = normalizeString(document.getElementById('searchVisibility')?.value || '');
    const list = document.getElementById('visibility-list');
    if (!list) return;
    list.innerHTML = '';

    museumsData.forEach(m => {
        if (term && !normalizeString(m.nome).includes(term) && !normalizeString(m.municipio).includes(term)) return;
        const rowClass = m.visivel ? "bg-white border" : "item-hidden border";
        const badgeStatus = m.visivel
            ? '<span class="badge-secec badge-secec-green">Pública</span>'
            : '<span class="badge-secec badge-secec-red">Oculta</span>';
        const badgeGeo = (m.lat === null || m.lng === null || m.is_digital)
            ? '<span class="badge-secec badge-secec-amber">Sem Pino</span>'
            : '';

        list.innerHTML += `
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-2 p-3 rounded ${rowClass}">
                <div>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <h6 class="fw-bold mb-0 text-dark">${m.nome}</h6>
                        ${badgeStatus}
                        ${badgeGeo}
                    </div>
                    <small class="text-secondary">${m.municipio} (${m.regiao}) • Edições auditadas: <strong>${m.history ? m.history.length : 0}</strong></small>
                </div>
                <button type="button" class="btn-admin-primary btn-sm mt-2 mt-sm-0" onclick="openGestorEdit(${m.id})">
                    <i class="fa-solid fa-pen-to-square me-1"></i> Editar Ficha e Visibilidade
                </button>
            </div>
        `;
    });
};

window.openGestorEdit = function(id) {
    editingMuseumId = id;
    const m = museumsData.find(x => String(x.id) === String(id));
    if (!m) return;

    document.getElementById('gestorEditTitle').innerText = m.nome;
    document.getElementById('gestorMuseumVisible').checked = !m.visivel;
    document.getElementById('gestorAuthor').value = currentOperatorName !== "Gestor SUPMU" ? currentOperatorName : "";

    const fields = [
        { id: 'nome', label: 'Nome da Instituição' },
        ...CATALOGO_CAMPOS_CFM,
        { id: 'lat', label: 'Latitude (Deixe vazio para Sem Geolocalização)' },
        { id: 'lng', label: 'Longitude (Deixe vazio para Sem Geolocalização)' }
    ];

    let html = '';
    fields.forEach(f => {
        const isHiddenIndividually = m.hidden_fields && m.hidden_fields[f.id];
        const isHiddenGlobally = globalHiddenFields && globalHiddenFields[f.id];
        html += `
            <div class="col-md-6 border-bottom pb-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <label class="fw-bold text-primary small" for="edit_${f.id}">${f.label}</label>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="vis_${f.id}" ${(!isHiddenIndividually && !isHiddenGlobally) ? 'checked' : ''}>
                        <small class="text-muted" style="font-size:0.7rem;">${isHiddenGlobally ? 'Oculto em Bloco' : 'Visível'}</small>
                    </div>
                </div>
                <input type="text" class="form-control form-control-sm" id="edit_${f.id}" value="${m[f.id] !== null && m[f.id] !== undefined ? m[f.id] : ''}">
            </div>
        `;
    });
    document.getElementById('gestorEditFields').innerHTML = html;

    const hLog = document.getElementById('gestorHistoryLog');
    hLog.innerHTML = m.history && m.history.length > 0
        ? m.history.map(h => `> [${h.date}] Atualizado por: <b>${h.user}</b>`).join('<br>')
        : '> Nenhum histórico de edição registrado para esta instituição.';

    const modalEl = document.getElementById('gestorEditModal');
    editModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    editModal.show();
};

window.saveGestorEdits = function() {
    const author = document.getElementById('gestorAuthor').value.trim();
    if (!author || author.length < 3) {
        return alert("Informe o nome completo do responsável técnico para registro no histórico da ficha.");
    }

    const m = museumsData.find(x => String(x.id) === String(editingMuseumId));
    if (!m) return;

    m.hidden_fields = {};
    const allEditableKeys = ['nome', ...CATALOGO_CAMPOS_CFM.map(c => c.id), 'lat', 'lng'];

    allEditableKeys.forEach(f => {
        const inputEl = document.getElementById(`edit_${f}`);
        const visEl = document.getElementById(`vis_${f}`);
        if (inputEl) m[f] = inputEl.value;
        if (visEl && !visEl.checked) m.hidden_fields[f] = true;
    });

    m.municipio = canonicalizeMunicipality(m.municipio);
    m.regiao = canonicalizeRegion(m.regiao, m.municipio);
    m.is_digital = isPredominantlyDigital(m.acervo, m.endereco, m.natureza);

    if (m.is_digital) {
        m.lat = null;
        m.lng = null;
    } else {
        m.lat = parseCoordinate(m.lat);
        m.lng = parseCoordinate(m.lng);
    }
    m.coord_aproximada = false;
    m.visivel = !document.getElementById('gestorMuseumVisible').checked;

    if (!m.history) m.history = [];
    m.history.push({ date: new Date().toLocaleString('pt-BR'), user: author });

    localEditsMemory[m.nome] = m;
    localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory));

    populateCityFilter();
    applyFilters();
    if (editModal) editModal.hide();
};

window.openAdminProfileModal = function() {
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('adminAccountModal'));
    document.getElementById('adminAccountModalTitle').innerText = "Meu Perfil de Operador";
    document.getElementById('adminAccountModalBody').innerHTML = `
        <div class="mb-3">
            <label class="form-label small fw-bold">Nome do Operador Ativo</label>
            <input type="text" id="profOperatorName" class="form-control form-control-sm" value="${currentOperatorName}">
        </div>
        <div class="mb-3">
            <label class="form-label small fw-bold">Unidade Administrativa</label>
            <input type="text" class="form-control form-control-sm" value="SECEC-RJ / Superintendência de Museus (SUPMU)" disabled>
        </div>
        <button class="btn-admin-primary w-100" onclick="saveOperatorProfile()">Atualizar Identificação</button>
    `;
    modal.show();
};

window.saveOperatorProfile = function() {
    const val = document.getElementById('profOperatorName').value.trim();
    if (val) {
        currentOperatorName = val;
        document.getElementById('adminUserDisplayName').innerText = val;
        document.getElementById('adminDropdownName').innerText = val;
    }
    bootstrap.Modal.getInstance(document.getElementById('adminAccountModal')).hide();
};

window.openAdminPasswordModal = function() {
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('adminAccountModal'));
    document.getElementById('adminAccountModalTitle').innerText = "Alterar Senha Administrativa";
    document.getElementById('adminAccountModalBody').innerHTML = `
        <div class="mb-3">
            <label class="form-label small fw-bold">Nova Senha do Painel</label>
            <input type="password" id="newAdminPass" class="form-control form-control-sm" placeholder="Mínimo 4 caracteres">
        </div>
        <button class="btn-admin-primary w-100" onclick="saveNewAdminPassword()">Salvar Nova Senha</button>
    `;
    modal.show();
};

window.saveNewAdminPassword = function() {
    const newPass = document.getElementById('newAdminPass').value.trim();
    if (newPass.length < 4) return alert("A senha deve possuir ao menos 4 caracteres.");
    adminSavedPassword = newPass;
    localStorage.setItem('simrj_admin_pass', newPass);
    bootstrap.Modal.getInstance(document.getElementById('adminAccountModal')).hide();
    alert("Senha administrativa atualizada com sucesso.");
};

function renderAdminFeedbacks() {
    const container = document.getElementById('adminFeedbackList');
    if (!container) return;
    if (publicFeedbacks.length === 0) {
        container.innerHTML = '<div class="alert alert-light border small text-muted mb-0">Nenhuma manifestação registrada até o momento.</div>';
        return;
    }
    container.innerHTML = publicFeedbacks.map(f => `
        <div class="p-3 mb-2 border rounded bg-white">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge-secec badge-secec-blue">${f.tipo}</span>
                <small class="text-muted">${f.data}</small>
            </div>
            <div class="fw-bold small text-dark">${f.nome} (${f.email})</div>
            <p class="small text-secondary mb-0 mt-1">${f.mensagem}</p>
        </div>
    `).join('');
}

// ============================================================================
// 7. CADASTRO MANUAL, ABA "SEM GEOLOCALIZAÇÃO" E ROBÔ GEOCODIFICADOR
// ============================================================================
window.buscarCepManual = async function(cep) {
    const limpo = String(cep).replace(/\D/g, '');
    if (limpo.length !== 8) return;
    try {
        const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
        const d = await res.json();
        if (!d.erro) {
            document.getElementById('man_endereco').value = d.logradouro || '';
            const muni = canonicalizeMunicipality(d.localidade || '');
            document.getElementById('man_municipio').value = muni;
            document.getElementById('man_regiao').value = canonicalizeRegion('', muni);
        }
    } catch (e) {}
};

window.saveManualGestor = function() {
    const nome = document.getElementById('man_nome').value.trim();
    if (!nome) return alert("O Nome da Instituição é obrigatório.");

    const muni = canonicalizeMunicipality(document.getElementById('man_municipio').value);
    const regiao = canonicalizeRegion(document.getElementById('man_regiao').value, muni);
    const acervo = document.getElementById('man_acervo').value;
    const endereco = `${document.getElementById('man_endereco').value} ${document.getElementById('man_numero').value} ${document.getElementById('man_complemento').value}`.trim();
    const natureza = document.getElementById('man_natureza').value;

    const isDigital = isPredominantlyDigital(acervo, endereco, natureza);
    let lat = isDigital ? null : parseCoordinate(document.getElementById('man_lat').value);
    let lng = isDigital ? null : parseCoordinate(document.getElementById('man_lng').value);

    const newM = {
        id: Date.now(),
        id_cfm: document.getElementById('man_id_cfm').value,
        nome: nome,
        sigla: document.getElementById('man_sigla').value,
        cnpj: document.getElementById('man_cnpj').value,
        documento_criacao: document.getElementById('man_documento_criacao').value,
        municipio: muni,
        regiao: regiao,
        zona: document.getElementById('man_zona').value,
        endereco: endereco,
        telefone: document.getElementById('man_telefone').value,
        email: document.getElementById('man_email').value,
        site: document.getElementById('man_site').value,
        facebook: document.getElementById('man_facebook').value,
        instagram: document.getElementById('man_instagram').value,
        twitter: document.getElementById('man_twitter').value,
        natureza: natureza,
        situacao: document.getElementById('man_situacao').value,
        funcionamento: document.getElementById('man_funcionamento').value,
        ingresso: document.getElementById('man_ingresso').value,
        gratuidades: document.getElementById('man_gratuidades').value,
        educativo: document.getElementById('man_educativo').value,
        museologo: document.getElementById('man_museologo').value,
        acervo: acervo,
        acessibilidade: document.getElementById('man_acessibilidade').value,
        historico_museu: document.getElementById('man_historico').value,
        resp_nome: document.getElementById('man_resp_nome').value,
        resp_email: document.getElementById('man_resp_email').value,
        lat: lat,
        lng: lng,
        is_digital: isDigital,
        coord_aproximada: false,
        visivel: true,
        hidden_fields: {},
        history: [{ date: new Date().toLocaleString('pt-BR'), user: `${currentOperatorName} (Cadastro Manual)` }]
    };

    museumsData.push(newM);
    localEditsMemory[nome] = newM;
    localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory));
    populateCityFilter();
    applyFilters();
    alert("Instituição cadastrada e publicada com sucesso.");
    document.querySelectorAll('#formManualGestor input, #formManualGestor textarea').forEach(el => el.value = '');
};

/**
 * Atualiza a aba "Sem Geolocalização" do Painel do Gestor listando todas as instituições
 * com acervo digital/virtual ou sem coordenadas definidas, permitindo testar e mapear manualmente.
 */
function updatePendingList() {
    const list = document.getElementById('pending-list');
    if (!list) return;
    list.innerHTML = '';

    const pendings = museumsData.filter(m => m.lat === null || m.lng === null || m.is_digital);
    if (document.getElementById('pendingCount')) {
        document.getElementById('pendingCount').innerText = pendings.length;
    }

    if (pendings.length === 0) {
        list.innerHTML = `
            <div class="alert alert-light border small text-secondary mb-0">
                Nenhuma instituição encontra-se sem geolocalização no momento. Para testar ou remover o pino de uma instituição, abra a ficha na aba <strong>Gestão de Fichas</strong> e limpe os campos Latitude/Longitude ou defina o acervo como Virtual/Digital.
            </div>`;
        return;
    }

    pendings.forEach(m => {
        const tipoTag = m.is_digital
            ? '<span class="badge-secec badge-secec-purple"><i class="fa-solid fa-globe me-1"></i>Acervo Digital / Virtual</span>'
            : '<span class="badge-secec badge-secec-red"><i class="fa-solid fa-location-pin-lock me-1"></i>Sem Coordenada no Mapa</span>';

        list.innerHTML += `
            <div class="p-3 mb-2 bg-white border rounded d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <strong class="text-dark">${m.nome}</strong>
                        ${tipoTag}
                    </div>
                    <small class="text-secondary">${m.municipio} (${m.regiao}) • Acervo: ${m.acervo || 'Não informado'} • Endereço: ${m.endereco || 'Sem endereço físico'}</small>
                </div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn-admin-secondary btn-sm" onclick="openGestorEdit(${m.id})">
                        <i class="fa-solid fa-pen me-1"></i> Editar Ficha
                    </button>
                    <button type="button" class="btn btn-sm btn-warning fw-bold" onclick="openAdminMapPicker(${m.id})">
                        <i class="fa-solid fa-location-crosshairs me-1"></i> Marcar no Mapa
                    </button>
                </div>
            </div>
        `;
    });
}

let adminMapInstance;
let adminTempMarker;

window.openAdminMapPicker = function(id) {
    editingMuseumId = id;
    const m = museumsData.find(x => String(x.id) === String(id));
    if (!m) return;

    document.getElementById('adminMapTitle').innerText = m.nome;
    document.getElementById('adminMapSearchInput').value = `${m.endereco || ''}, ${m.municipio || ''}, RJ`;

    const modalEl = document.getElementById('adminMapModal');
    const mapModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    mapModal.show();

    setTimeout(() => {
        if (!adminMapInstance) {
            adminMapInstance = L.map('adminLeafletMap').setView([-22.75, -43.10], 8);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(adminMapInstance);
            adminMapInstance.on('click', e => {
                if (adminTempMarker) adminMapInstance.removeLayer(adminTempMarker);
                adminTempMarker = L.marker(e.latlng).addTo(adminMapInstance);
            });
        }
        adminMapInstance.invalidateSize();
        const cityNorm = normalizeString(m.municipio);
        if (m.lat && m.lng) {
            adminMapInstance.setView([m.lat, m.lng], 15);
        } else if (COORDENADAS_MUNICIPIOS_RJ[cityNorm]) {
            adminMapInstance.setView([COORDENADAS_MUNICIPIOS_RJ[cityNorm].lat, COORDENADAS_MUNICIPIOS_RJ[cityNorm].lng], 13);
        }
    }, 350);
};

window.searchAddressOnAdminMap = async function() {
    const query = document.getElementById('adminMapSearchInput').value;
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const d = await res.json();
        if (d && d.length > 0) {
            const lat = parseFloat(d[0].lat);
            const lng = parseFloat(d[0].lon);
            adminMapInstance.setView([lat, lng], 16);
            if (adminTempMarker) adminMapInstance.removeLayer(adminTempMarker);
            adminTempMarker = L.marker([lat, lng]).addTo(adminMapInstance);
        } else {
            alert("Logradouro não localizado automaticamente. Clique diretamente sobre o ponto desejado no mapa.");
        }
    } catch (e) {}
};

window.saveAdminPin = function() {
    if (!adminTempMarker) return alert("Clique sobre o mapa para posicionar o pino antes de salvar.");
    const m = museumsData.find(x => String(x.id) === String(editingMuseumId));
    if (m) {
        m.lat = adminTempMarker.getLatLng().lat;
        m.lng = adminTempMarker.getLatLng().lng;
        m.is_digital = false;
        m.coord_aproximada = false;
        localEditsMemory[m.nome] = m;
        localStorage.setItem('simrj_edits', JSON.stringify(localEditsMemory));
        applyFilters();
        bootstrap.Modal.getInstance(document.getElementById('adminMapModal')).hide();
    }
};

window.exportRelatorio = function() {
    const dataToExport = currentFilteredData.length > 0 ? currentFilteredData : museumsData;
    const csv = Papa.unparse(dataToExport.map(({ history, hidden_fields, ...rest }) => rest));
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "relatorio_cfm_simrj.csv";
    link.click();
};

window.startUpdateImport = function() {
    const file = document.getElementById('csvFileUpdate').files[0];
    if (!file) return alert("Selecione um arquivo CSV para importação.");
    const statEl = document.getElementById('upload-status');
    statEl.classList.remove('d-none');
    statEl.className = 'alert alert-info small p-2 mt-3 mb-0';
    statEl.innerText = "Processando planilha e sincronizando coordenadas...";

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            await processParsedData(results.data);
            statEl.className = 'alert alert-success small p-2 mt-3 mb-0';
            statEl.innerText = `Sincronização concluída! ${museumsData.length} instituições carregadas.`;
        }
    });
};

window.startRobotProcessing = function() {
    const file = document.getElementById('csvFileRobot').files[0];
    if (!file) return alert("Selecione uma planilha CSV primeiro.");
    document.getElementById('btnRobot').disabled = true;
    document.getElementById('robotProgressContainer').classList.remove('d-none');
    document.getElementById('robotLog').classList.remove('d-none');

    const log = msg => {
        const el = document.getElementById('robotLog');
        el.innerHTML += `<br>> ${msg}`;
        el.scrollTop = el.scrollHeight;
    };
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
            const data = results.data;
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const nome = getColValue(row, ["Nome da Instituição", "Nome"]);
                const muni = canonicalizeMunicipality(getColValue(row, ["Município", "Municipio"]));
                const end = getColValue(row, ["Endereço", "Endereco", "Logradouro"]);
                const acervo = getColValue(row, ["Acervo Predominante", "Acervo"]);
                const natureza = getColValue(row, ["Natureza Administrativa do Museu", "Natureza Administrativa", "Natureza"]);

                row["Município"] = muni;
                row["Região"] = canonicalizeRegion(getColValue(row, ["Região", "Regiao"]), muni);

                if (isPredominantlyDigital(acervo, end, natureza)) {
                    row["Lat"] = "";
                    row["Lng"] = "";
                    log(`[DIGITAL/VIRTUAL] ${nome} -> Mantido sem pino.`);
                } else if (!row["Lat"] && !row["Lng"] && nome) {
                    log(`Geocodificando: ${nome} (${muni})...`);
                    const endLimpo = end.replace(/cep[:\s]*[\d.-]+/gi, '').replace(/\([^)]*\)/g, '').split(' - ')[0].trim();
                    const query = `${endLimpo}, ${muni}, RJ, Brasil`.replace(/,\s*,/g, ',').trim();
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                        const d = await res.json();
                        if (d && d.length > 0 && isWithinRJ(parseFloat(d[0].lat), parseFloat(d[0].lon))) {
                            row["Lat"] = String(d[0].lat).replace(',', '.');
                            row["Lng"] = String(d[0].lon).replace(',', '.');
                            log(`   -> Coordenada exata obtida.`);
                        } else if (normalizeString(muni) === "rio de janeiro") {
                            const rioCoord = resolveRioNeighborhoodCoordinate(nome, end, i);
                            if (rioCoord) {
                                row["Lat"] = String(rioCoord.lat);
                                row["Lng"] = String(rioCoord.lng);
                                log(`   -> Coordenada de bairro do RJ aplicada.`);
                            } else {
                                row["Lat"] = "";
                                row["Lng"] = "";
                                log(`   -> Sem endereço físico válido (enviado para Sem Geolocalização).`);
                            }
                        } else {
                            row["Lat"] = "";
                            row["Lng"] = "";
                            log(`   -> Endereço não localizado (enviado para Sem Geolocalização).`);
                        }
                    } catch (e) {
                        log(`   -> Falha de rede na requisição.`);
                    }
                    await sleep(1100);
                }
                const pct = Math.round(((i + 1) / data.length) * 100);
                const pBar = document.getElementById('robotProgressBar');
                pBar.style.width = `${pct}%`;
                pBar.innerText = `${pct}%`;
            }
            log(`Processamento finalizado. Iniciando download de dados.csv...`);
            const csv = Papa.unparse(data);
            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "dados.csv";
            link.click();
            document.getElementById('btnRobot').disabled = false;
        }
    });
};