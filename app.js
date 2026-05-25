let map, markersArray = [], museumsData = [];

function initMapSystem() {
    map = L.map('map').setView([-22.9068, -43.1729], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

// RESTAURAÇÃO: Motor de busca e geolocalização para Importação
window.geocodeAddressNominatim = async function(logradouro, numero, municipio, cep) {
    const query = `${logradouro}, ${numero}, ${municipio}, RJ, Brasil, ${cep}`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return (data && data.length > 0) ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
    } catch (e) { return null; }
}

// MOTOR DE IMPORTAÇÃO (RESTAURADO)
document.getElementById('csvFile').addEventListener('change', async function(e) {
    Papa.parse(e.target.files[0], { header: true, complete: async function(results) {
        for (let row of results.data) {
            let nome = row["Nome"] || row["Nome da Instituição"];
            if (!nome) continue;
            let coords = await geocodeAddressNominatim(row["Endereço"], "", row["Município"], "");
            museumsData.push({...row, nome, lat: coords?.lat, lng: coords?.lng, id: Date.now() + Math.random()});
        }
        renderMuseums(museumsData);
    }});
});

// NAVEGAÇÃO DO WIZARD
window.nextSolStep = function(step) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.getElementById('sol-step' + step).classList.add('active');
}

// PAINEL GESTOR
window.checkAdminPassword = function() {
    if(document.getElementById('adminPassword').value === 'simrj') {
        const panel = document.getElementById('admin-panel');
        panel.classList.add('admin-panel-fullscreen');
        panel.style.display = 'block';
        document.getElementById('login-overlay').style.display = 'none';
    }
}
window.closeAdmin = function() { document.getElementById('admin-panel').style.display = 'none'; }

// RENDERIZAR MAPA COM ORDEM ALFABÉTICA
function renderMuseums(data) {
    data.sort((a, b) => a.nome.localeCompare(b.nome));
    // ... restante da lógica de pinar e listar ...
}

window.onload = initMapSystem;s