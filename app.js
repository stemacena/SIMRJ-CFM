/**
 * SISTEMA ESTADUAL DE MUSEUS DO RIO DE JANEIRO (SIM-RJ)
 * CADASTRO FLUMINENSE DE MUSEUS (CFM)
 * Script Principal de Controle, Geoprocessamento por Bairro/Município e Governança de Dados
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

// Paleta Oficial de Cores dos Pinos por Região do Estado do Rio de Janeiro
const CORES_REGIOES_RJ = {
    "centro sul": "#ef8739",
    "serrana": "#0d92df",
    "medio paraiba": "#58cfa5",
    "costa verde": "#0d6b2a",
    "metropolitana i": "#af8447",
    "metropolitana ii": "#af8447",
    "metropolitana iii": "#af8447",
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

// Lista oficial dos 92 municípios fluminenses
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

// Mapeamento oficial de Municípios -> Regiões do SIM-RJ (Decreto nº 45.419/2015)
const MAPA_REGIAO_POR_MUNICIPIO = {
    "rio de janeiro": "Metropolitana I",
    "belford roxo": "Metropolitana II", "duque de caxias": "Metropolitana II", "japeri": "Metropolitana II",
    "mage": "Metropolitana II", "mesquita": "Metropolitana II", "nilopolis": "Metropolitana II",
    "nova iguacu": "Metropolitana II", "paracambi": "Metropolitana II", "queimados": "Metropolitana II",
    "sao joao de meriti": "Metropolitana II", "seropedica": "Metropolitana II",
    "itaborai": "Metropolitana III", "marica": "Metropolitana III", "niteroi": "Metropolitana III",
    "rio bonito": "Metropolitana III", "sao goncalo": "Metropolitana III", "tangua": "Metropolitana III",
    "aperibe": "Noroeste Fluminense", "bom jesus do itabapoana": "Noroeste Fluminense", "cambuci": "Noroeste Fluminense",
    "italva": "Noroeste Fluminense", "itaocara": "Noroeste Fluminense", "itaperuna": "Noroeste Fluminense",
    "laje do muriae": "Noroeste Fluminense", "miracema": "Noroeste Fluminense", "natividade": "Noroeste Fluminense",
    "porciuncula": "Noroeste Fluminense", "santo antonio de padua": "Noroeste Fluminense",
    "sao jose de uba": "Noroeste Fluminense", "varre sai": "Noroeste Fluminense",
    "campos dos goytacazes": "Norte Fluminense", "carapebus": "Norte Fluminense", "cardoso moreira": "Norte Fluminense",
    "conceicao de macabu": "Norte Fluminense", "macae": "Norte Fluminense", "quissama": "Norte Fluminense",
    "sao fidelis": "Norte Fluminense", "sao francisco de itabapoana": "Norte Fluminense",
    "sao francisco do itabapoana": "Norte Fluminense", "sao joao da barra": "Norte Fluminense",
    "bom jardim": "Serrana", "cachoeiras de macacu": "Serrana", "cantagalo": "Serrana", "carmo": "Serrana",
    "cordeiro": "Serrana", "duas barras": "Serrana", "guapimirim": "Serrana", "macuco": "Serrana",
    "nova friburgo": "Serrana", "petropolis": "Serrana", "santa maria madalena": "Serrana",
    "sao jose do vale do rio preto": "Serrana", "sao sebastiao do alto": "Serrana", "sumidouro": "Serrana",
    "teresopolis": "Serrana", "trajano de moraes": "Serrana",
    "araruama": "Baixadas Litorâneas", "armacao dos buzios": "Baixadas Litorâneas", "arraial do cabo": "Baixadas Litorâneas",
    "cabo frio": "Baixadas Litorâneas", "casimiro de abreu": "Baixadas Litorâneas", "iguaba grande": "Baixadas Litorâneas",
    "rio das ostras": "Baixadas Litorâneas", "sao pedro da aldeia": "Baixadas Litorâneas",
    "saquarema": "Baixadas Litorâneas", "silva jardim": "Baixadas Litorâneas",
    "barra do pirai": "Médio Paraíba", "barra mansa": "Médio Paraíba", "itatiaia": "Médio Paraíba",
    "pinheiral": "Médio Paraíba", "pirai": "Médio Paraíba", "porto real": "Médio Paraíba",
    "quatis": "Médio Paraíba", "resende": "Médio Paraíba", "rio claro": "Médio Paraíba",
    "rio das flores": "Médio Paraíba", "valenca": "Médio Paraíba", "volta redonda": "Médio Paraíba",
    "areal": "Centro-Sul", "comendador levy gasparian": "Centro-Sul", "engenheiro paulo de frontin": "Centro-Sul",
    "mendes": "Centro-Sul", "miguel pereira": "Centro-Sul", "paraiba do sul": "Centro-Sul",
    "paty do alferes": "Centro-Sul", "sapucaia": "Centro-Sul", "tres rios": "Centro-Sul", "vassouras": "Centro-Sul",
    "angra dos reis": "Costa Verde", "itaguai": "Costa Verde", "mangaratiba": "Costa Verde", "paraty": "Costa Verde"
};

// Dicionário geográfico de bairros e subcentros históricos da Capital (Rio de Janeiro)
// Evita que instituições da Metropolitana I caiam em uma coordenada genérica única no Centro
const COORDENADAS_BAIRROS_RIO = [
    { termos: ["vidigal", "av niemeyer", "avenida niemeyer"], lat: -22.9936, lng: -43.2339, zona: "Sul" },
    { termos: ["rocinha"], lat: -22.9888, lng: -43.2482, zona: "Sul" },
    { termos: ["sao conrado"], lat: -22.9931, lng: -43.2667, zona: "Sul" },
    { termos: ["leblon"], lat: -22.9844, lng: -43.2231, zona: "Sul" },
    { termos: ["ipanema"], lat: -22.9838, lng: -43.2045, zona: "Sul" },
    { termos: ["copacabana", "forte de copacabana", "atlantica"], lat: -22.9711, lng: -43.1852, zona: "Sul" },
    { termos: ["leme"], lat: -22.9632, lng: -43.1668, zona: "Sul" },
    { termos: ["gavea", "planetario", "marques de sao vicente"], lat: -22.9785, lng: -43.2292, zona: "Sul" },
    { termos: ["jardim botanico", "jache", "pacheco leao"], lat: -22.9669, lng: -43.2248, zona: "Sul" },
    { termos: ["lagoa", "epitacio pessoa"], lat: -22.9723, lng: -43.2095, zona: "Sul" },
    { termos: ["humaita"], lat: -22.9554, lng: -43.1989, zona: "Sul" },
    { termos: ["botafogo", "sao clemente", "rui barbosa", "voluntarios da patria"], lat: -22.9511, lng: -43.1865, zona: "Sul" },
    { termos: ["urca", "pasteur", "ciencias da terra", "pao de acucar"], lat: -22.9544, lng: -43.1675, zona: "Sul" },
    { termos: ["flamengo", "infante dom henrique", "aterro", "dois de dezembro", "catete", "palacio do catete"], lat: -22.9259, lng: -43.1764, zona: "Sul" },
    { termos: ["laranjeiras", "cosme velho", "corcovado"], lat: -22.9367, lng: -43.1925, zona: "Sul" },
    { termos: ["gloria", "outeiro da gloria", "russell"], lat: -22.9208, lng: -43.1752, zona: "Sul" },
    { termos: ["santa teresa", "chacara do ceu", "parque das ruinas", "almirante alexandrino", "bondinho"], lat: -22.9216, lng: -43.1878, zona: "Centro" },
    { termos: ["lapa", "arcos da lapa", "mem de sa", "riachuelo", "lavradio"], lat: -22.9134, lng: -43.1818, zona: "Centro" },
    { termos: ["cinelandia", "floriano", "teatro municipal", "biblioteca nacional", "belas artes"], lat: -22.9106, lng: -43.1757, zona: "Centro" },
    { termos: ["praca xv", "praca quinze", "paco imperial", "primeiro de marco", "ouvidor", "alfandega", "sete de setembro"], lat: -22.9035, lng: -43.1744, zona: "Centro" },
    { termos: ["praca maua", "museu do amanha", "museu de arte do rio", "boulevard olimpico"], lat: -22.8961, lng: -43.1819, zona: "Centro" },
    { termos: ["gamboa", "pretos novos", "pedra do sal", "saude", "santo cristo", "porto maravilha", "cais do valongo"], lat: -22.8969, lng: -43.1925, zona: "Centro" },
    { termos: ["praca tiradentes", "carioca", "republica", "campo de santana", "moncorvo filho"], lat: -22.9069, lng: -43.1842, zona: "Centro" },
    { termos: ["castelo", "marechal ancora", "historico nacional", "presidente vargas"], lat: -22.9056, lng: -43.1695, zona: "Centro" },
    { termos: ["paqueta", "ilha de paqueta"], lat: -22.7618, lng: -43.1075, zona: "Centro" },
    { termos: ["sao cristovao", "quinta da boa vista", "museu nacional", "astronomia", "imperial de sao cristovao", "caju", "benfica", "mangueira"], lat: -22.9055, lng: -43.2248, zona: "Centro" },
    { termos: ["estacio", "rio comprido", "catumbi", "cidade nova"], lat: -22.9168, lng: -43.2045, zona: "Centro" },
    { termos: ["maracana", "radial oeste", "uerj"], lat: -22.9121, lng: -43.2302, zona: "Norte" },
    { termos: ["tijuca", "praca saens pena", "conde de bonfim", "alto da boa vista", "floresta da tijuca", "acude"], lat: -22.9329, lng: -43.2435, zona: "Norte" },
    { termos: ["vila isabel", "boulevard 28 de setembro", "andarai", "grajau"], lat: -22.9165, lng: -43.2512, zona: "Norte" },
    { termos: ["engenho de dentro", "nilton santos", "museu imagens do inconsciente", "ramiro magalhaes"], lat: -22.8975, lng: -43.2965, zona: "Norte" },
    { termos: ["meier", "dias da cruz", "imperator", "cachambi", "engenho novo", "lins de vasconcelos"], lat: -22.9022, lng: -43.2815, zona: "Norte" },
    { termos: ["piedade", "quintino", "cascadura", "abolicao", "pilares"], lat: -22.8895, lng: -43.3145, zona: "Norte" },
    { termos: ["madureira", "parque de madureira", "portela", "império serrano", "oswaldo cruz", "campinho", "bento ribeiro"], lat: -22.8725, lng: -43.3408, zona: "Norte" },
    { termos: ["marechal hermes", "guadalupe", "honorio gurgel", "rocha miranda"], lat: -22.8595, lng: -43.3702, zona: "Norte" },
    { termos: ["mare", "complexo da mare", "bonsucesso", "manguinhos", "fiocruz", "brasil 4365"], lat: -22.8758, lng: -43.2435, zona: "Norte" },
    { termos: ["ilha do governador", "galeao", "freguesia ilha", "jardim guanabara", "cocota", "ribeira", "fundao", "cidade universitaria", "ufrj"], lat: -22.8185, lng: -43.2085, zona: "Norte" },
    { termos: ["penha", "igreja da penha", "olaria", "ramos", "bras de pina", "cordovil"], lat: -22.8428, lng: -43.2785, zona: "Norte" },
    { termos: ["iraja", "vicente de carvalho", "vila da penha", "vista alegre", "pavuna", "anchieta", "acari"], lat: -22.8315, lng: -43.3268, zona: "Norte" },
    { termos: ["campo dos afonsos", "aeroespacial", "musal", "marechal fontenelle", "sulacap", "vila militar", "deodoro", "realengo", "magalhaes bastos"], lat: -22.8825, lng: -43.3895, zona: "Oeste" },
    { termos: ["bangu", "fabrica bangu", "padre miguel", "senador camara", "santissimo"], lat: -22.8758, lng: -43.4655, zona: "Oeste" },
    { termos: ["campo grande", "west shopping", "mendanha"], lat: -22.9028, lng: -43.5592, zona: "Oeste" },
    { termos: ["santa cruz", "fazenda imperial", "ecopolo", "sepetiba", "paciencia", "cosmos"], lat: -22.9185, lng: -43.6845, zona: "Oeste" },
    { termos: ["guaratiba", "barra de guaratiba", "burle marx", "pedra de guaratiba"], lat: -23.0185, lng: -43.5515, zona: "Oeste" },
    { termos: ["barra da tijuca", "cidade das artes", "alvorada", "recreio", "pontal", "prainha", "grumari"], lat: -23.0005, lng: -43.3658, zona: "Oeste" },
    { termos: ["jacarepagua", "taquara", "colonia juliano moreira", "bispo do rosario", "curicica", "freguesia", "pechincha", "tanque", "praca seca", "vila valqueire", "cidade de deus", "vargem grande", "vargem pequena"], lat: -22.9315, lng: -43.3855, zona: "Oeste" }
];

// Coordenadas de referência para os demais 91 municípios fluminenses
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

// ============================================================================
// 1. INICIALIZAÇÃO E PADRONIZAÇÃO DE DADOS
// ============================================================================
document.addEventListener('DOMContentLoaded', async function() {
    initMapSystem();
    renderBulkFieldsPanel();
    await loadInitialCSVData();
});

function initMapSystem() {
    document.getElementById('map').innerHTML = "";
    map = L.map('map').setView([-22.55, -42.95], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    profileModal = new bootstrap.Modal(document.getElementById('museumModal'));
    editModal = new bootstrap.Modal(document.getElementById('gestorEditModal'));
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
 * Padroniza a Região do Estado garantindo que "Metropolitana I" funcione
 * com 100% de precisão mesmo quando a planilha trouxer grafias alternativas.
 */
function canonicalizeRegion(rawRegion, municipioPadronizado) {
    const normMuni = normalizeString(municipioPadronizado);
    if (MAPA_REGIAO_POR_MUNICIPIO[normMuni]) {
        return MAPA_REGIAO_POR_MUNICIPIO[normMuni];
    }

    const r = normalizeString(rawRegion);
    if (!r) return "Não informada";
    if (r === "metropolitana i" || r === "metropolitana 1" || r.includes("capital") || (r === "metropolitana" && normMuni === "rio de janeiro")) return "Metropolitana I";
    if (r === "metropolitana ii" || r === "metropolitana 2" || r.includes("baixada fluminense")) return "Metropolitana II";
    if (r === "metropolitana iii" || r === "metropolitana 3" || r.includes("leste fluminense")) return "Metropolitana III";
    if (r.includes("baixadas litoraneas") || r.includes("baixada litoranea")) return "Baixadas Litorâneas";
    if (r.includes("centro sul")) return "Centro-Sul";
    if (r.includes("costa verde")) return "Costa Verde";
    if (r.includes("medio paraiba")) return "Médio Paraíba";
    if (r.includes("noroeste")) return "Noroeste Fluminense";
    if (r.includes("norte fluminense")) return "Norte Fluminense";
    if (r.includes("serrana")) return "Serrana";

    return rawRegion;
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
 * Identifica se a instituição possui acervo ou endereço predominantemente Digital / Virtual.
 * Regra de negócio: Instituições digitais/virtuais nunca recebem pino no mapa.
 */
function isDigitalOrVirtualInstitution(acervo, endereco, natureza, nome) {
    const aNorm = normalizeString(acervo);
    const eNorm = normalizeString(endereco);
    const nNorm = normalizeString(natureza);
    const nomeNorm = normalizeString(nome);

    return (
        aNorm.includes("virtual") ||
        aNorm.includes("digital") ||
        eNorm === "virtual" ||
        eNorm === "digital" ||
        eNorm.includes("museu virtual") ||
        eNorm.includes("acervo digital") ||
        nNorm.includes("virtual") ||
        nomeNorm.includes("museu virtual")
    );
}

/**
 * Detecta se a coordenada da planilha no município do Rio de Janeiro é o ponto genérico
 * central retornado pelo Nominatim quando o logradouro falhou (-22.9068,-43.1729 ou -22.9110,-43.2094).
 */
function isGenericRioCityCentroid(lat, lng) {
    if (lat === null || lng === null) return true;
    const isCentroid1 = Math.abs(lat - (-22.9110)) < 0.0020 && Math.abs(lng - (-43.2094)) < 0.0020;
    const isCentroid2 = Math.abs(lat - (-22.9068)) < 0.0012 && Math.abs(lng - (-43.1729)) < 0.0012;
    const isCentroid3 = Math.abs(lat - (-22.9083)) < 0.0015 && Math.abs(lng - (-43.1964)) < 0.0015;
    return isCentroid1 || isCentroid2 || isCentroid3;
}

/**
 * Resolve a localização por bairro/setor dentro do Município do Rio de Janeiro
 * quando a coordenada da planilha caiu no ponto genérico da cidade.
 */
function resolverCoordenadaBairroRio(endereco, nome, historico, zonaPlanilha) {
    const textoBusca = normalizeString(`${endereco} ${nome} ${historico}`);
    for (const item of COORDENADAS_BAIRROS_RIO) {
        if (item.termos.some(t => textoBusca.includes(t))) {
            return { lat: item.lat, lng: item.lng, zona: item.zona };
        }
    }
    if (textoBusca.includes("centro") && endereco && endereco.trim().length > 4) {
        return { lat: -22.9052, lng: -43.1780, zona: "Centro" };
    }
    return null;
}

/**
 * Gera o ícone SVG colorido do pino de acordo com a região da instituição.
 */
function createRegionPinIcon(regiao) {
    const normReg = normalizeString(regiao);
    const fillColor = CORES_REGIOES_RJ[normReg] || "#006666";

    const svgHtml = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 40" width="28" height="40" style="filter: drop-shadow(0px 2px 3px rgba(0,0,0,0.35));">
            <path d="M14 1C6.82 1 1 6.82 1 14c0 9.75 13 24.5 13 24.5S27 23.75 27 14C27 6.82 21.18 1 14 1z"
                  fill="${fillColor}" stroke="#1e293b" stroke-width="1.6"/>
            <circle cx="14" cy="14" r="5" fill="#ffffff" stroke="#1e293b" stroke-width="1"/>
        </svg>
    `;

    return L.divIcon({
        className: 'custom-region-pin',
        html: svgHtml,
        iconSize: [28, 40],
        iconAnchor: [14, 39],
        popupAnchor: [0, -36]
    });
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
        const historico = getColValue(row, ["Histórico", "Historico", "Histórico do Museu"]);
        let zona = getColValue(row, ["Zona do Rio", "Zona"]);

        let lat = parseCoordinate(getColValue(row, ["Lat", "Latitude"]));
        let lng = parseCoordinate(getColValue(row, ["Lng", "Longitude", "Lon"]));

        if (lat !== null && lng !== null && !isWithinRJ(lat, lng)) {
            lat = null;
            lng = null;
        }

        const isDigital = isDigitalOrVirtualInstitution(acervo, endereco, natureza, nome);
        let motivoSemGeo = "";

        if (isDigital) {
            // Regra: Acervo predominantemente digital/virtual nunca recebe pino no mapa
            lat = null;
            lng = null;
            motivoSemGeo = "Acervo Digital / Virtual";
        } else {
            const normCity = normalizeString(municipioPadronizado);

            if (normCity === "rio de janeiro") {
                // Corrige coordenadas que caíram no centroide genérico da cidade do Rio
                if (isGenericRioCityCentroid(lat, lng)) {
                    const resolvidoBairro = resolverCoordenadaBairroRio(endereco, nome, historico, zona);
                    if (resolvidoBairro) {
                        lat = resolvidoBairro.lat;
                        lng = resolvidoBairro.lng;
                        if (!zona) zona = resolvidoBairro.zona;
                    } else {
                        lat = null;
                        lng = null;
                        motivoSemGeo = "Endereço Pendente de Coordenada";
                    }
                } else if (!zona) {
                    const resolvidoBairro = resolverCoordenadaBairroRio(endereco, nome, historico, "");
                    if (resolvidoBairro) zona = resolvidoBairro.zona;
                }
            } else if ((lat === null || lng === null) && COORDENADAS_MUNICIPIOS_RJ[normCity]) {
                // Para os demais municípios fluminenses (ex: Macaé, Itaboraí), garante o pino municipal caso o endereço específico tenha falhado
                if (endereco && endereco.trim().length > 2) {
                    lat = COORDENADAS_MUNICIPIOS_RJ[normCity].lat;
                    lng = COORDENADAS_MUNICIPIOS_RJ[normCity].lng;
                } else {
                    motivoSemGeo = "Sem Endereço Físico Cadastrado";
                }
            } else if (lat === null || lng === null) {
                motivoSemGeo = "Endereço Pendente de Coordenada";
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
            zona: zona,
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
            historico_museu: historico,
            resp_nome: getColValue(row, ["Responsável pelo Cadastro", "Responsável", "Responsavel"]),
            resp_email: getColValue(row, ["E-mail do Responsável", "Email Responsavel"]),
            lat: lat,
            lng: lng,
            is_digital: isDigital,
            motivo_sem_geo: motivoSemGeo,
            visivel: true,
            hidden_fields: {},
            history: []
        };

        if (localEditsMemory[mObj.nome]) {
            mObj = { ...mObj, ...localEditsMemory[mObj.nome] };
            mObj.municipio = canonicalizeMunicipality(mObj.municipio);
            mObj.regiao = canonicalizeRegion(mObj.regiao, mObj.municipio);
            if (isDigitalOrVirtualInstitution(mObj.acervo, mObj.endereco, mObj.natureza, mObj.nome)) {
                mObj.lat = null;
                mObj.lng = null;
                mObj.is_digital = true;
                mObj.motivo_sem_geo = "Acervo Digital / Virtual";
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
// 3. SISTEMA DE FILTRAGEM E RENDERIZAÇÃO DE PINOS COLORIDOS POR REGIÃO
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

        // Comparação exata da região canônica para que "Metropolitana I" nunca falhe nem colida com II e III
        if (regioes.length > 0 && !regioes.includes(mReg)) return false;
        if (naturezas.length > 0 && !naturezas.some(n => mNat.includes(n))) return false;
        if (acervos.length > 0 && !acervos.some(a => mAcer.includes(a) || (a === "virtual" && m.is_digital))) return false;
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
    if (map) map.setView([-22.55, -42.95], 8);
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

        const regColor = CORES_REGIOES_RJ[normalizeString(m.regiao)] || "#006666";
        const btnFicha = `<button class="btn btn-sm btn-outline-primary fw-bold" onclick="openProfile(${m.id})"><i class="fa-regular fa-folder-open me-1"></i>Ver Ficha</button>`;
        const tagSemGeo = (m.lat === null || m.lng === null || m.is_digital)
            ? `<span class="badge-secec badge-secec-purple ms-1"><i class="fa-solid fa-laptop-file"></i> ${m.is_digital ? 'Acervo Digital' : 'Sem Pino'}</span>`
            : '';

        htmlTable += `
            <tr class="tr-lista-item">
                <td class="fw-bold text-dark">${m.nome} ${tagSemGeo}</td>
                <td>${m.municipio}</td>
                <td><span class="region-color-dot" style="background:${regColor};"></span>${m.regiao}</td>
                <td>${ isFieldHidden(m, 'natureza') ? '<span class="text-muted">-</span>' : m.natureza }</td>
                <td><span class="badge-secec ${sitBadge}">${ isFieldHidden(m, 'situacao') ? 'Oculto' : m.situacao }</span></td>
                <td class="text-end">${btnFicha}</td>
            </tr>`;

        htmlList += `
            <div class="museum-result-card p-3 mb-2 d-flex justify-content-between align-items-center gap-2" style="border-left-color: ${regColor};">
                <div>
                    <h6 class="fw-bold text-primary mb-1" style="font-size: 0.92rem;">${m.nome}</h6>
                    <div class="small text-secondary">
                        <span class="region-color-dot" style="background:${regColor};"></span>${m.municipio} (${m.regiao})
                    </div>
                    <div class="mt-1">
                        <span class="badge-secec ${sitBadge}">${ isFieldHidden(m, 'situacao') ? 'Restrito' : m.situacao }</span>
                        ${tagSemGeo}
                    </div>
                </div>
                <div class="flex-shrink-0">${btnFicha}</div>
            </div>`;

        if (m.lat !== null && m.lng !== null && !m.is_digital) {
            const coordKey = `${m.lat.toFixed(4)}_${m.lng.toFixed(4)}`;
            const count = coordUsageCount[coordKey] || 0;
            coordUsageCount[coordKey] = count + 1;

            let plotLat = m.lat;
            let plotLng = m.lng;

            // Microdeslocamento espiral de ângulo áureo (Fibonacci) para instituições que dividem o mesmo ponto
            if (count > 0) {
                const goldenAngle = count * 2.3999632;
                const radius = 0.0014 * Math.sqrt(count);
                plotLat += radius * Math.cos(goldenAngle);
                plotLng += radius * Math.sin(goldenAngle);
            }

            const marker = L.marker([plotLat, plotLng], {
                icon: createRegionPinIcon(m.regiao)
            }).addTo(map);

            marker.bindPopup(`
                <div class="text-center p-1" style="min-width: 190px;">
                    <span class="badge-secec badge-secec-slate mb-1">${m.regiao}</span>
                    <h6 class="fw-bold text-primary mb-1">${m.nome}</h6>
                    <small class="d-block text-secondary mb-2"><i class="fa-solid fa-location-dot me-1"></i>${m.municipio}</small>
                    <button class="btn btn-sm btn-warning w-100 fw-bold" onclick="openProfile(${m.id})">Ver Ficha Completa</button>
                </div>
            `);
            markersArray.push(marker);
            boundsPoints.push([plotLat, plotLng]);
        }
    });

    htmlTable += '</tbody></table></div>';
    if (document.getElementById('container-lista-geral')) {
        document.getElementById('container-lista-geral').innerHTML = html