// Configuração Inicial do Mapa (Centrado no RJ)
const map = L.map('map').setView([-22.9068, -43.1729], 8);

// Adicionar camada do OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Ícone personalizado (Simples)
const museumIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Ícone genérico de localização
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

// --- DADOS INICIAIS (SIMULAÇÃO) ---
// No sistema final, isso viria do arquivo carregado ou banco de dados.
let museumsData = [
    {
        id: 1,
        nome: "Museu Imperial",
        municipio: "Petrópolis",
        regiao: "Serrana",
        natureza: "Federal",
        situacao: "Aberto",
        ingresso: "R$10 a R$20",
        gratuidades: "Sim, idosos e estudantes",
        educativo: true,
        acessibilidade: true,
        acervo: "Histórico",
        lat: -22.5046,
        lng: -43.1752,
        descricao: "Palácio de verão de D. Pedro II."
    },
    {
        id: 2,
        nome: "Museu de Arte do Rio (MAR)",
        municipio: "Rio de Janeiro",
        regiao: "Metropolitana I",
        natureza: "Municipal",
        situacao: "Aberto",
        ingresso: "R$20 a R$30",
        gratuidades: "Terças-feiras",
        educativo: true,
        acessibilidade: true,
        acervo: "Artes Visuais",
        lat: -22.8965,
        lng: -43.1819,
        descricao: "Museu dedicado à arte e cultura carioca."
    },
    {
        id: 3,
        nome: "Museu Casa de Casimiro de Abreu",
        municipio: "Casimiro de Abreu",
        regiao: "Baixadas Litorâneas",
        natureza: "Municipal",
        situacao: "Aberto",
        ingresso: "Gratuito",
        gratuidades: "Sempre gratuito",
        educativo: false,
        acessibilidade: false,
        acervo: "Histórico",
        lat: -22.4811,
        lng: -42.2033,
        descricao: "Casa onde nasceu o poeta."
    }
    // Adicione mais dados aqui para teste se quiser
];

let markersLayer = L.layerGroup().addTo(map);

// --- FUNÇÕES ---

// 1. Inicializar
function init() {
    renderMuseums(museumsData);
    updateStats(museumsData);
}

// 2. Renderizar Museus (Mapa e Lista)
function renderMuseums(data) {
    // Limpar lista e mapa
    const listContainer = document.getElementById('museum-list');
    listContainer.innerHTML = '';
    markersLayer.clearLayers();
    
    document.getElementById('resultCount').innerText = data.length;

    data.forEach(museum => {
        // Criar Card na Lista
        const cardCol = document.createElement('div');
        cardCol.className = 'col-md-6 mb-3';
        cardCol.innerHTML = `
            <div class="card h-100 museum-card bg-white shadow-sm">
                <div class="card-body">
                    <span class="badge bg-primary mb-2">${museum.regiao}</span>
                    <span class="badge ${museum.situacao === 'Aberto' ? 'bg-success' : 'bg-warning text-dark'} mb-2">${museum.situacao}</span>
                    <h5 class="card-title text-dark fw-bold">${museum.nome}</h5>
                    <p class="card-text small text-muted"><i class="bi bi-geo-alt"></i> ${museum.municipio}</p>
                    <p class="card-text small"><strong>Acervo:</strong> ${museum.acervo}</p>
                    <button class="btn btn-sm btn-outline-secondary w-100 mt-2" onclick="showDetails(${museum.id})">Ver Perfil Completo</button>
                </div>
            </div>
        `;
        listContainer.appendChild(cardCol);

        // Adicionar Pin no Mapa (Se tiver coordenadas)
        if(museum.lat && museum.lng) {
            const marker = L.marker([museum.lat, museum.lng], {icon: museumIcon})
                .bindPopup(`<b>${museum.nome}</b><br>${museum.municipio}<br><small>${museum.situacao}</small>`);
            markersLayer.addLayer(marker);
        }
    });
}

// 3. Atualizar Estatísticas
function updateStats(data) {
    document.getElementById('count-total').innerText = data.length;
    const free = data.filter(m => m.ingresso === 'Gratuito').length;
    document.getElementById('count-free').innerText = free;
}

// 4. Filtragem
function applyFilters() {
    const nameInput = document.getElementById('searchName').value.toLowerCase();
    const region = document.getElementById('filterRegion').value;
    const nature = document.getElementById('filterNature').value;
    const status = document.getElementById('filterStatus').value;
    const cost = document.getElementById('filterCost').value;
    const hasEdu = document.getElementById('checkEdu').checked;

    const filtered = museumsData.filter(m => {
        const matchName = m.nome.toLowerCase().includes(nameInput);
        const matchRegion = region ? m.regiao === region : true;
        const matchNature = nature ? m.natureza === nature : true;
        const matchStatus = status ? m.situacao === status : true;
        const matchEdu = hasEdu ? m.educativo === true : true;
        
        let matchCost = true;
        if(cost === 'Gratuito') matchCost = m.ingresso === 'Gratuito';
        
        return matchName && matchRegion && matchNature && matchStatus && matchCost && matchEdu;
    });

    renderMuseums(filtered);
}

// 5. Resetar Filtros
function resetFilters() {
    document.getElementById('searchName').value = '';
    document.getElementById('filterRegion').value = '';
    document.getElementById('filterNature').value = '';
    // ... resetar outros inputs
    renderMuseums(museumsData);
}

// 6. Área Admin: Toggle
function toggleAdmin() {
    const panel = document.getElementById('admin-panel');
    if(panel.style.display === 'none') {
        const pass = prompt("Senha de Administrador (Protótipo: digite 'simrj')");
        if(pass === 'simrj') {
            panel.style.display = 'block';
        } else {
            alert('Senha incorreta');
        }
    } else {
        panel.style.display = 'none';
    }
}

// 7. Área Admin: Upload de CSV (Usando PapaParse)
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            console.log("Dados carregados:", results.data);
            alert(`Sucesso! ${results.data.length} museus carregados.`);
            
            // Atualizar os dados do site com o CSV
            // ATENÇÃO: Os cabeçalhos do CSV devem bater com as chaves do objeto (nome, municipio, etc)
            museumsData = results.data.map((row, index) => ({
                id: index + 100,
                nome: row.Nome || row.nome,
                municipio: row.Municipio || "Não informado",
                regiao: row.Regiao || "Não informada",
                natureza: row.Natureza || "Privada",
                situacao: row.Situacao || "Aberto",
                lat: parseFloat(row.Latitude) || -22.9, // Fallback RJ
                lng: parseFloat(row.Longitude) || -43.2,
                ingresso: row.Ingresso || "Não informado",
                acervo: row.Acervo || "Outros",
                educativo: row.Educativo === 'Sim',
                descricao: row.Descricao || ""
            }));

            renderMuseums(museumsData);
            updateStats(museumsData);
        }
    });
});

// Detalhes (Simples Alert por enquanto, poderia ser um Modal)
function showDetails(id) {
    const m = museumsData.find(x => x.id === id);
    alert(`Nome: ${m.nome}\nDescrição: ${m.descricao}\nIngresso: ${m.ingresso}\nAcessibilidade: ${m.acessibilidade ? 'Sim' : 'Não'}`);
}

// Rodar ao iniciar
init();