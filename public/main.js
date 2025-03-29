document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.querySelector('.mobile-menu');
    const closeButton = document.querySelector('.close-menu');
    const mainNav = document.querySelector('.main-nav');

    function toggleMenu() {
        mainNav.classList.toggle('show');
        const isExpanded = mainNav.classList.contains('show');
        menuButton.setAttribute('aria-expanded', isExpanded);
    }

    menuButton.addEventListener('click', toggleMenu);
    closeButton.addEventListener('click', toggleMenu);

    document.querySelectorAll('.transition-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.add('fade-out');
            setTimeout(() => window.location.href = link.getAttribute('data-href'), 500);
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (window.innerWidth <= 768) toggleMenu();
            }
        });
    });

    const backToTop = document.querySelector('.back-to-top');
    window.addEventListener('scroll', () => backToTop.classList.toggle('show', window.scrollY > 500));
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    document.querySelectorAll('.faq-item').forEach(item => {
        item.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            item.classList.toggle('active', !isActive);
            item.setAttribute('aria-expanded', !isActive);
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('animate-fade-in');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-fade-in').forEach(element => observer.observe(element));

    setInterval(updateSeason, 1000);
    updateSeason();
    updateStats();

    document.getElementById('chatForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        const message = input.value.trim();
        if (message) {
            const messages = document.getElementById('chatMessages');
            const newMessage = document.createElement('div');
            const timestamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            newMessage.className = 'chat-message';
            newMessage.innerHTML = `<span>${localStorage.getItem('clubName') || 'Anónimo'} [${timestamp}]:</span> ${message}`;
            messages.appendChild(newMessage);
            messages.scrollTop = messages.scrollHeight;
            input.value = '';
            saveMessage(newMessage.innerHTML);
        }
    });

    loadMessages();
});

const season = {
    start: new Date("2025-03-01T00:00:00").getTime(),
    end: new Date("2025-04-01T00:00:00").getTime()
};

function updateSeason() {
    const now = new Date().getTime();
    const lmSeasonStatus = document.getElementById('lmSeasonStatus');

    if (now < season.start) {
        const timeUntil = season.start - now;
        const days = Math.floor(timeUntil / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeUntil % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        lmSeasonStatus.textContent = `Comienza en ${days}d ${hours}h`;
    } else if (now <= season.end) {
        const timeLeft = season.end - now;
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        lmSeasonStatus.textContent = `Finaliza en ${days}d ${hours}h`;
    } else {
        lmSeasonStatus.textContent = 'Temporada Finalizada';
    }
}

function updateStats() {
    document.getElementById('playersCount').textContent = '2,000';
    document.getElementById('clubsCount').textContent = '0';
}

function saveMessage(message) {
    let messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    messages.push(message);
    if (messages.length > 50) messages.shift();
    localStorage.setItem('chatMessages', JSON.stringify(messages));
}

function loadMessages() {
    const messages = JSON.parse(localStorage.getItem('chatMessages')) || [];
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'chat-message';
        div.innerHTML = msg;
        chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Inicializar particles.js
particlesJS('particles-js', {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#00ffff' },
        shape: { type: 'circle' },
        opacity: { value: 0.5, random: true },
        size: { value: 3, random: true },
        line_linked: { enable: true, distance: 150, color: '#00ffff', opacity: 0.4, width: 1 },
        move: { enable: true, speed: 2, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false }
    },
    interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' }, resize: true },
        modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } }
    },
    retina_detect: true
});

const BASE_URL = window.location.origin;
let club = {
    name: localStorage.getItem('clubName') || '[Sin registrar]',
    budget: parseInt(localStorage.getItem('clubBudget')) || 100000000,
    players: JSON.parse(localStorage.getItem('clubPlayers')) || [],
    color: localStorage.getItem('clubColor') || '#00ffff',
    wins: parseInt(localStorage.getItem('clubWins')) || 0
};
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let seasonLocal = {
    start: new Date().getTime() - 24 * 60 * 60 * 1000,
    end: new Date().getTime() + 30 * 24 * 60 * 60 * 1000,
    wins: parseInt(localStorage.getItem('seasonWins')) || 0
};

let isMarketOpen = false;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Debes iniciar sesión para acceder al mercado.', 'error');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
    }
    try {
        await syncClubData();
        await loadMarketData();
        requestAnimationFrame(() => {
            renderMarket();
            renderLoans();
            renderWatchlist();
            renderRecommendations();
            renderFeaturedPlayers();
            renderHistory();
            bindMarketEvents();
        });
        setInterval(updateTimer, 1000);
        updateTimer();
        renderChat();
        updatePoints();
        renderClubDetails();
    } catch (err) {
        showNotification('Error de conexión: ' + err.message, 'error');
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('animate-fade-in');
        });
    }, { threshold: 0.1, rootMargin: '0px' });
    document.querySelectorAll('.animate-fade-in').forEach(element => observer.observe(element));

    document.querySelectorAll('.transition-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.add('fade-out');
            setTimeout(() => window.location.href = link.getAttribute('data-href'), 500);
        });
    });

    document.getElementById('logoutLink').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('clubName');
        localStorage.removeItem('clubBudget');
        localStorage.removeItem('clubPlayers');
        localStorage.removeItem('clubColor');
        localStorage.removeItem('clubWins');
        localStorage.removeItem('marketPoints');
        localStorage.removeItem('watchlist');
        localStorage.removeItem('transactions');
        localStorage.removeItem('loanedPlayers');
        window.location.href = 'login.html';
    });
});

async function syncClubData() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/api/club/me`, {
            method: 'GET',
            headers: { 'x-auth-token': token }
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                localStorage.removeItem('token');
                showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            throw new Error(errorData.message || 'Error al sincronizar con el backend');
        }
        club = await response.json();
        localStorage.setItem('clubName', club.name);
        localStorage.setItem('clubBudget', club.budget);
        localStorage.setItem('clubPlayers', JSON.stringify(club.players));
        localStorage.setItem('clubColor', club.color);
        localStorage.setItem('clubWins', club.wins);
        updateClubPreview();
        updateWatchlist();
        updateStats();
    } catch (err) {
        console.error('Sync Error:', err);
        throw err;
    }
}

async function syncTransactions() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/api/transactions`, {
            method: 'GET',
            headers: { 'x-auth-token': token }
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                localStorage.removeItem('token');
                showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            throw new Error(errorData.message || 'Error al sincronizar transacciones');
        }
        transactions = await response.json();
        updateTransactions();
    } catch (err) {
        console.error('Error al sincronizar transacciones:', err);
        transactions = [];
        updateTransactions();
    }
}

function updateTimer() {
    const now = new Date().getTime();
    const timer = document.getElementById('season-timer');
    if (!timer) return;
    const distance = seasonLocal.end - now;
    if (distance < 0) {
        isMarketOpen = false;
        timer.textContent = "CERRADO";
        return;
    }
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((distance / 1000 / 60) % 60);
    const seconds = Math.floor((distance / 1000) % 60);
    timer.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    isMarketOpen = now >= seasonLocal.start && now <= seasonLocal.end;
}

function updateMarketStatus() {
    const statusText = document.getElementById('marketStatus');
    if (!statusText) return;
    isMarketOpen = new Date().getTime() <= seasonLocal.end;
    statusText.textContent = isMarketOpen ? 'Abierto' : 'Cerrado';
}

function updatePoints() {
    const pointsElem = document.getElementById('marketPoints');
    if (pointsElem) pointsElem.textContent = club.points || 0;
}

function renderMarket(filterName = '', filterPosition = '') {
    const grid = document.getElementById('playersGrid');
    if (!grid) return;
    const filtered = playersMarket.filter(player => {
        return (!filterName || player.name.toLowerCase().includes(filterName.toLowerCase())) &&
               (!filterPosition || player.position === filterPosition);
    });
    grid.innerHTML = filtered.length ? filtered.map(player => `
                <div class="player-card animate-fade-in">
                    <h3>${player.name}</h3>
                    <p>Posición: ${player.position}</p>
                    <p>Rating: ${player.rating}</p>
                    <p>Valor: $${player.value.toLocaleString()}</p>
                    <button class="buy-button" onclick="buyPlayer('${player.name}', ${player.value})" ${isMarketOpen ? '' : 'disabled'}>Comprar</button>
                    <button class="watch-button" onclick="addToWatchlist('${player.name}', ${player.value})">Vigilar</button>
                </div>
            `).join('') : '<p role="listitem">No hay jugadores disponibles.</p>';
}

function renderWatchlist() {
    const list = document.getElementById('watchlist');
    if (!list) return;
    list.innerHTML = club.watchlist.length ? club.watchlist.map(p => `
                <li>
                    <span>${p.name} - $${p.value.toLocaleString()}</span>
                    <button class="sell-button" onclick="removeFromWatchlist('${p.name}')">Quitar</button>
                </li>
            `).join('') : '<li>No hay jugadores en la lista de seguimiento.</li>';
}

function renderLoans() {
    const list = document.getElementById('loanedPlayersList');
    if (!list) return;
    list.innerHTML = loanedPlayers.length ? loanedPlayers.map(name => `
                <li>${name}</li>
            `).join('') : '<li>No hay préstamos activos.</li>';
}

function renderHistory() {
    const list = document.getElementById('transactionList');
    if (!list) return;
    list.innerHTML = transactions.length ? transactions.map(t => `
                <li>${new Date(t.date).toLocaleDateString()} – ${t.typeName || t.type} – ${t.playerName} – $${t.value.toLocaleString()}</li>
            `).join('') : '<li>No hay transacciones registradas.</li>';
}

function renderFeaturedPlayers() {
    const list = document.getElementById('featuredPlayers');
    if (!list) return;
    // (Contenido de jugadores destacados omitido por brevedad, permanece igual)
}

function renderRecommendations() {
    const list = document.getElementById('recommendations');
    if (!list) return;
    // (Contenido de recomendaciones omitido por brevedad, permanece igual)
}

function renderChat() {
    // (Funcionalidad de chat omitida por brevedad)
}

function renderClubDetails() {
    const clubNameElem = document.getElementById('clubName');
    const clubBudgetElem = document.getElementById('clubBudget');
    const playerCountElem = document.getElementById('playerCount');
    const teamValueElem = document.getElementById('teamValue');
    const avgRatingElem = document.getElementById('avgRating');
    if (!clubNameElem || !clubBudgetElem || !playerCountElem || !teamValueElem || !avgRatingElem) return;
    clubNameElem.textContent = club.name;
    clubBudgetElem.textContent = `$${club.budget.toLocaleString()}`;
    playerCountElem.textContent = club.players.length;
    const totalValue = club.players.reduce((sum, p) => sum + (p.value || 0), 0);
    teamValueElem.textContent = `$${totalValue.toLocaleString()}`;
    const avgRating = club.players.length ? Math.floor(club.players.reduce((sum, p) => sum + (p.rating || 0), 0) / club.players.length) : 0;
    avgRatingElem.textContent = avgRating;
}

async function buyPlayer(name, value) {
    if (!isMarketOpen) return showNotification('El mercado está cerrado.', 'error');
    if (isBuying) return;
    isBuying = true;
    const token = localStorage.getItem('token');
    const buyButtons = document.querySelectorAll('.buy-button');
    buyButtons.forEach(button => button.disabled = true);
    showNotification('Procesando compra...', 'info');
    try {
        const player = playersMarket.find(p => p.name === name);
        const response = await fetch(`${BASE_URL}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ type: 'compra', playerId: player._id, playerName: name, value })
        });
        const data = await response.json();
        if (response.ok) {
            club.budget -= value;
            club.points += 10;
            const player = playersMarket.find(p => p.name === name);
            club.players.push(player);
            localStorage.setItem('clubBudget', club.budget);
            localStorage.setItem('clubPlayers', JSON.stringify(club.players));
            localStorage.setItem('marketPoints', club.points);
            transactions.unshift(data.transaction);
            showNotification(`¡Has comprado a ${name} por $${value.toLocaleString()}! (+10 puntos)`, 'success');
            await loadMarketData();
            renderMarket(document.getElementById('searchInput').value, document.getElementById('positionFilter').value);
            renderWatchlist();
            renderLoans();
            renderFeaturedPlayers();
            bindMarketEvents();
            updatePoints();
            renderRecommendations();
            updateStats();
            renderHistory();
        } else {
            showNotification(data.message || 'Error al comprar', 'error');
        }
    } catch (err) {
        showNotification('Error de conexión: ' + err.message, 'error');
    } finally {
        buyButtons.forEach(button => button.disabled = !isMarketOpen);
        isBuying = false;
    }
}

async function sellPlayer(name, value) {
    if (!isMarketOpen) return showNotification('El mercado está cerrado.', 'error');
    const token = localStorage.getItem('token');
    const sellValue = Math.floor(value * 0.8);
    const player = club.players.find(p => p.name === name) || {};
    showNotification('Procesando venta...', 'info');
    try {
        const response = await fetch(`${BASE_URL}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ type: 'venta', playerId: player._id, playerName: name, value: sellValue })
        });
        const data = await response.json();
        if (response.ok) {
            club.budget += sellValue;
            club.points += 5;
            club.players = club.players.filter(p => p.name !== name);
            localStorage.setItem('clubBudget', club.budget);
            localStorage.setItem('clubPlayers', JSON.stringify(club.players));
            localStorage.setItem('clubPoints', club.points);
            transactions.unshift(data.transaction);
            showNotification(`¡Has vendido a ${name} por $${sellValue.toLocaleString()}! (+5 puntos)`, 'success');
            await loadMarketData();
            renderMarket(document.getElementById('searchInput').value, document.getElementById('positionFilter').value);
            renderWatchlist();
            renderFeaturedPlayers();
            bindMarketEvents();
            updatePoints();
            renderRecommendations();
            updateStats();
            renderHistory();
        } else {
            showNotification(data.message || 'Error al vender', 'error');
        }
    } catch (err) {
        showNotification('Error de conexión: ' + err.message, 'error');
    }
}

async function negotiatePlayer(name, value) {
    const offer = prompt(`Ingresa tu oferta para ${name} (Valor actual: $${value.toLocaleString()})`, value * 0.9);
    if (offer && !isNaN(offer) && parseInt(offer) > 0) {
        const negotiatedValue = parseInt(offer);
        if (negotiatedValue >= value * 0.8) {
            await buyPlayer(name, negotiatedValue);
        } else {
            showNotification(`Oferta rechazada para ${name}. Intenta con un valor mayor.`, 'error');
        }
    }
}

async function loanPlayer(name, value) {
    if (!isMarketOpen) return showNotification('El mercado está cerrado.', 'error');
    const token = localStorage.getItem('token');
    if (club.budget < value) return showNotification('No tienes suficiente presupuesto para el préstamo.', 'error');
    const player = playersMarket.find(p => p.name === name);
    if (loanedPlayers.includes(name)) return showNotification(`${name} ya está prestado.`, 'error');
    if (club.players.some(p => p.name === name)) return showNotification('No puedes prestar a un jugador de tu club.', 'error');
    const loanButtons = document.querySelectorAll('.loan-button');
    loanButtons.forEach(button => button.disabled = true);
    showNotification('Procesando préstamo...', 'info');
    try {
        const response = await fetch(`${BASE_URL}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ type: 'prestamo', playerId: player._id, playerName: name, value })
        });
        const data = await response.json();
        if (response.ok) {
            club.budget -= value;
            club.points += 5;
            loanedPlayers.push(name);
            localStorage.setItem('clubBudget', club.budget);
            localStorage.setItem('marketPoints', club.points);
            localStorage.setItem('loanedPlayers', JSON.stringify(loanedPlayers));
            transactions.unshift(data.transaction);
            showNotification(`¡Has prestado a ${name} por $${value.toLocaleString()}! (+5 puntos)`, 'success');
            await loadMarketData();
            renderMarket(document.getElementById('searchInput').value, document.getElementById('positionFilter').value);
            renderLoans();
            renderWatchlist();
            bindMarketEvents();
            updatePoints();
            renderRecommendations();
            updateStats();
            renderHistory();
        } else {
            showNotification(data.message || 'Error al prestar', 'error');
        }
    } catch (err) {
        showNotification('Error de conexión: ' + err.message, 'error');
    } finally {
        loanButtons.forEach(button => button.disabled = !isMarketOpen);
    }
}

// ... (Funciones updateStats, bindMarketEvents, addToWatchlist, removeFromWatchlist, etc., sin cambios sustanciales excepto manejo de mensajes de error)

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.setAttribute('aria-live', 'polite');
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () => notification.remove());
        }, 4000);
    }, 100);
}

const BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!(await validateToken())) return;

    const menuButton = document.querySelector('.mobile-menu');
    const closeButton = document.querySelector('.close-menu');
    const mainNav = document.querySelector('.main-nav');
    function toggleMenu() {
        mainNav.classList.toggle('show');
        const isExpanded = mainNav.classList.contains('show');
        menuButton.setAttribute('aria-expanded', isExpanded);
    }
    menuButton.addEventListener('click', toggleMenu);
    closeButton.addEventListener('click', toggleMenu);

    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.add('active');
    try {
        await initializePage();
    } catch (err) {
        showNotification('Error al cargar datos: ' + err.message, 'error');
        updateClubPreview();
        updateWatchlist();
        updateTransactions();
        updateStats();
    } finally {
        if (spinner) spinner.classList.remove('active');
        isProcessing = false;
    }
});

async function validateToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Debes iniciar sesión para acceder a esta página.', 'error');
        window.location.href = 'login.html';
        return false;
    }
    try {
        const response = await fetch(`${BASE_URL}/api/auth/me`, {
            method: 'GET',
            headers: { 'x-auth-token': token }
        });
        if (response.ok) {
            const data = await response.json();
            return true;
        } else {
            localStorage.removeItem('token');
            showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
            setTimeout(() => window.location.href = 'login.html', 2000);
            return false;
        }
    } catch (err) {
        console.error('Error al validar token:', err);
        localStorage.removeItem('token');
        showNotification('Error de conexión. Por favor inicia sesión de nuevo.', 'error');
        window.location.href = 'login.html';
        return false;
    }
}

async function initializePage() {
    console.log('Script cargado');
    console.log('Página cargada, inicializando...');
    if (!(await validateToken())) return;
    await syncClubData();
    await syncTransactions();
    updateClubPreview();
    updateWatchlist();
    updateTransactions();
    updateStats();
}

async function syncClubData() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/api/club/me`, {
            method: 'GET',
            headers: { 'x-auth-token': token }
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                localStorage.removeItem('token');
                showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            throw new Error(errorData.message || 'Error al sincronizar con el backend');
        }
        club = await response.json();
        season.wins = club.wins || 0;
        updateClubPreview();
        updateWatchlist();
        updateStats();
    } catch (err) {
        console.error('Sync Error:', err);
        throw err;
    }
}

async function syncTransactions() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/api/transactions`, {
            method: 'GET',
            headers: { 'x-auth-token': token }
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                localStorage.removeItem('token');
                showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            throw new Error(errorData.message || 'Error al sincronizar transacciones');
        }
        transactions = await response.json();
        updateTransactions();
    } catch (err) {
        console.error('Error al sincronizar transacciones:', err);
        transactions = [];
        updateTransactions();
    }
}

function isMarketOpen() {
    const now = new Date().getTime();
    return now >= season.start && now <= season.end;
}

function updateClubPreview() {
    const clubNameInput = document.getElementById('clubNameInput');
    const clubColor = document.getElementById('clubColor');
    if (!clubNameInput || !clubColor) return;
    clubNameInput.value = club.name;
    clubColor.value = club.color;
    const clubName = document.getElementById('clubName');
    const clubBudget = document.getElementById('clubBudget');
    const playerCount = document.getElementById('playerCount');
    const teamValue = document.getElementById('teamValue');
    const avgRating = document.getElementById('avgRating');
    const clubEmblem = document.getElementById('clubEmblem');
    const playerList = document.getElementById('playerList');
    if (!clubName || !clubBudget || !playerCount || !teamValue || !avgRating || !clubEmblem || !playerList) {
        console.error('Elementos del DOM no encontrados en updateClubPreview');
        return;
    }
    clubName.textContent = club.name;
    clubBudget.textContent = `$${(club.budget || 0).toLocaleString()}`;
    playerCount.textContent = club.players.length;
    const totalValue = club.players.reduce((sum, p) => sum + (p.value || 0), 0);
    teamValue.textContent = `$${totalValue.toLocaleString()}`;
    const avg = club.players.length ? Math.floor(club.players.reduce((sum, p) => sum + (p.rating || 0), 0) / club.players.length) : 0;
    avgRating.textContent = avg;
    playerList.innerHTML = club.players.length ? club.players.map(p => `
                <li>${p.name} (${p.position}) - Rating: ${p.rating}, Valor: $${p.value.toLocaleString()}
                    <button onclick="trainPlayer('${p._id}', '${p.name}', ${p.value})">Entrenar (+$${Math.floor((p.value || 0) * 0.1).toLocaleString()})</button>
                </li>
            `).join('') : '<li>No hay jugadores.</li>';
}

function updateWatchlist() {
    const watchlist = document.getElementById('watchlist');
    if (!watchlist) return;
    watchlist.innerHTML = club.watchlist.length ? club.watchlist.map(p => `
                <li>${p.name} - $${p.value.toLocaleString()}
                    <button onclick="removeFromWatchlist('${p.name}')">Quitar</button>
                </li>
            `).join('') : '<li>No hay jugadores en la lista de seguimiento.</li>';
}

function updateTransactions() {
    const list = document.getElementById('transactionList');
    if (!list) return;
    list.innerHTML = transactions.length ? transactions.map(t => `
                <li>${new Date(t.date).toLocaleDateString()} – ${t.typeName || t.type} – ${t.playerName} – $${t.value.toLocaleString()}</li>
            `).join('') : '<li>No hay transacciones registradas.</li>';
}

function updateStats() {
    const winsCount = document.getElementById('winsCount');
    const gamesPlayed = document.getElementById('gamesPlayed');
    const clubPoints = document.getElementById('clubPoints');
    if (!winsCount || !gamesPlayed || !clubPoints) {
        console.error('Elementos de estadísticas no encontrados');
        return;
    }
    winsCount.textContent = club.wins;
    gamesPlayed.textContent = club.gamesPlayed;
    clubPoints.textContent = club.points || 0;
}

document.getElementById('saveClub').addEventListener('click', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Debes iniciar sesión para crear un club.', 'error');
        setTimeout(() => window.location.href = 'login.html', 2000);
        return;
    }
    const clubNameInput = document.getElementById('clubNameInput');
    const clubColor = document.getElementById('clubColor');
    if (!clubNameInput || !clubColor) return;
    club.name = clubNameInput.value || '[Sin registrar]';
    club.color = clubColor.value;
    try {
        const response = await fetch(`${BASE_URL}/api/club/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ name: club.name, color: club.color, budget: club.budget, players: club.players, wins: club.wins })
        });
        if (!response.ok) {
            const errorData = await response.json();
            showNotification(errorData.message || 'Error al actualizar el club', 'error');
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
            return;
        }
        const data = await response.json();
        club = data;
        localStorage.setItem('clubName', club.name);
        localStorage.setItem('clubBudget', club.budget);
        localStorage.setItem('clubPlayers', JSON.stringify(club.players));
        localStorage.setItem('clubColor', club.color);
        localStorage.setItem('clubWins', club.wins);
        showNotification(`¡Club ${club.name} actualizado con éxito!`, 'success');
        updateClubPreview();
    } catch (err) {
        showNotification('Error de conexión: ' + err.message, 'error');
        console.error('Error al guardar club:', err);
    }
});

document.getElementById('resetClub').addEventListener('click', async () => {
    if (!confirm('¿Estás seguro de reiniciar tu club? Esto eliminará todos tus datos.')) return;
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Debes iniciar sesión.', 'error');
        window.location.href = 'login.html';
        return;
    }
    try {
        const response = await fetch(`${BASE_URL}/api/club/me/reset`, {
            method: 'POST',
            headers: { 'x-auth-token': token }
        });
        if (!response.ok) {
            const errorData = await response.json();
            showNotification(errorData.message || 'Error al reiniciar el club', 'error');
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
            return;
        }
        const data = await response.json();
        club = data.club;
        localStorage.setItem('clubName', club.name);
        localStorage.setItem('clubBudget', club.budget);
        localStorage.setItem('clubPlayers', JSON.stringify(club.players));
        localStorage.setItem('clubColor', club.color);
        localStorage.setItem('clubWins', club.wins);
        localStorage.setItem('transactions', JSON.stringify([]));
        localStorage.setItem('loanedPlayers', JSON.stringify([]));
        localStorage.setItem('watchlist', JSON.stringify([]));
        showNotification('¡Club reiniciado exitosamente!', 'success');
        location.reload();
    } catch (err) {
        showNotification('Error de conexión: ' + err.message, 'error');
    }
});

async function trainPlayer(id, name, value) {
    if (isProcessing || !isMarketOpen()) {
        if (!isMarketOpen()) showNotification('El mercado está cerrado.', 'error');
        return;
    }
    isProcessing = true;
    const cost = Math.floor(value * 0.1);
    if (club.budget < cost) {
        showNotification('No tienes suficiente presupuesto para entrenar a este jugador.', 'error');
        isProcessing = false;
        return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Debes iniciar sesión.', 'error');
        window.location.href = 'login.html';
        return;
    }
    const playerIndex = club.players.findIndex(p => p._id === id || p.id === id);
    if (playerIndex === -1) {
        showNotification('Jugador no encontrado.', 'error');
        isProcessing = false;
        return;
    }
    club.budget -= cost;
    club.players[playerIndex].rating = Math.min((club.players[playerIndex].rating || 0) + 1, 99);
    club.players[playerIndex].value = (value || 0) + cost;
    try {
        const response = await fetch(`${BASE_URL}/api/club/me/train`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            body: JSON.stringify({ playerId: id, cost })
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
            throw new Error(errorData.message || 'Error al entrenar');
        }
        const data = await response.json();
        club = data.club;
        localStorage.setItem('clubBudget', club.budget);
        localStorage.setItem('clubPlayers', JSON.stringify(club.players));
        showNotification(`¡${name} ha sido entrenado! Rating aumentado a ${club.players[playerIndex].rating} (+$${cost.toLocaleString()})`, 'success');
        updateClubPreview();
        updateAchievements();
    } catch (err) {
        showNotification('Error: ' + err.message, 'error');
        club.budget += cost;
        club.players[playerIndex].rating = (club.players[playerIndex].rating || 0) - 1;
        club.players[playerIndex].value = value;
        localStorage.setItem('clubBudget', club.budget);
        localStorage.setItem('clubPlayers', JSON.stringify(club.players));
    } finally {
        isProcessing = false;
    }
}

function updateAchievements() {
    const firstBuy = document.getElementById('first-buy');
    const top10 = document.getElementById('top-10');
    const millionSpent = document.getElementById('million-spent');
    if (!firstBuy || !top10 || !millionSpent) {
        console.error('Elementos de logros no encontrados');
        return;
    }
    firstBuy.innerHTML = `<i class="fas fa-shopping-bag" ${club.players.length > 0 ? '' : 'style="color: gray;"'}></i><h3>Primera Compra</h3><p>${club.players.length > 0 ? 'Completado' : 'Compra tu primer jugador'}</p>`;
    if (club.players.length > 0) firstBuy.classList.add('completed');
    top10.innerHTML = `<i class="fas fa-star"></i><h3>Top 10 Mundial</h3><p>${club.wins >= 10 ? 'Completado' : 'Alcanza 10 victorias para desbloquear'}</p>`;
    if (club.wins >= 10) top10.classList.add('completed');
    millionSpent.innerHTML = `<i class="fas fa-coins"></i><h3>Millonario</h3><p>${club.points >= 100 ? 'Completado' : 'Obtén 100 puntos en el mercado'}</p>`;
    if (club.points >= 100) millionSpent.classList.add('completed');
}

// ... (Otras funciones de la página "Mi Club" permanecen sin cambios mayores)

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.setAttribute('aria-live', 'polite');
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () => notification.remove());
        }, 4000);
    }, 100);
}

const BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!(await validateToken())) return;

    const menuButton = document.querySelector('.mobile-menu');
    const closeButton = document.querySelector('.close-menu');
    const mainNav = document.querySelector('.main-nav');
    function toggleMenu() {
        mainNav.classList.toggle('show');
        const isExpanded = mainNav.classList.contains('show');
        menuButton.setAttribute('aria-expanded', isExpanded);
    }
    menuButton.addEventListener('click', toggleMenu);
    closeButton.addEventListener('click', toggleMenu);

    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.add('active');
    try {
        await initializePage();
    } catch (err) {
        showNotification('Error al cargar datos: ' + err.message, 'error');
        updateClubPreview();
        updateWatchlist();
        updateTransactions();
        updateStats();
    } finally {
        if (spinner) spinner.classList.remove('active');
        isProcessing = false;
    }
});

async function validateToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Debes iniciar sesión para acceder a esta página.', 'error');
        window.location.href = 'login.html';
        return false;
    }
    try {
        const response = await fetch(`${BASE_URL}/api/auth/me`, {
            method: 'GET',
            headers: { 'x-auth-token': token }
        });
        if (response.ok) {
            const data = await response.json();
            return true;
        } else {
            localStorage.removeItem('token');
            showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
            setTimeout(() => window.location.href = 'login.html', 2000);
            return false;
        }
    } catch (err) {
        console.error('Error al validar token:', err);
        localStorage.removeItem('token');
        showNotification('Error de conexión. Por favor inicia sesión de nuevo.', 'error');
        window.location.href = 'login.html';
        return false;
    }
}

async function initializePage() {
    console.log('Script cargado');
    console.log('Página cargada, inicializando...');
    if (!(await validateToken())) return;
    await syncClubData();
    await syncTransactions();
    updateClubPreview();
    updateWatchlist();
    updateTransactions();
    updateStats();
}

async function syncClubData() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/api/club/me`, {
            method: 'GET',
            headers: { 'x-auth-token': token }
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                localStorage.removeItem('token');
                showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            throw new Error(errorData.message || 'Error al sincronizar con el backend');
        }
        club = await response.json();
        season.wins = club.wins || 0;
        updateClubPreview();
        updateWatchlist();
        updateStats();
    } catch (err) {
        console.error('Sync Error:', err);
        throw err;
    }
}

async function syncTransactions() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${BASE_URL}/api/transactions`, {
            method: 'GET',
            headers: { 'x-auth-token': token }
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                localStorage.removeItem('token');
                showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            throw new Error(errorData.message || 'Error al sincronizar transacciones');
        }
        transactions = await response.json();
        updateTransactions();
    } catch (err) {
        console.error('Error al sincronizar transacciones:', err);
        transactions = [];
        updateTransactions();
    }
}

function updateTransactions() {
    const list = document.getElementById('transactionList');
    if (!list) return;
    list.innerHTML = transactions.length ? transactions.map(t => `
                <li>${new Date(t.date).toLocaleDateString()} – ${t.typeName || t.type} – ${t.playerName} – $${t.value.toLocaleString()}</li>
            `).join('') : '<li>No hay transacciones registradas.</li>';
}
