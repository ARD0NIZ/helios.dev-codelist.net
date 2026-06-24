// Intersection Observer für Scroll-Animationen
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Beobachte alle Feature Cards
document.querySelectorAll('.feature-card').forEach((card, index) => {
    card.style.animationDelay = `${index * 0.1}s`;
    observer.observe(card);
});

// Smooth scroll für Links
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
});

document.getElementById('data-year').textContent = new Date().getFullYear();

// Stats von API fetchen
async function loadStats() {
    try {
        const res = await fetch('https://api.notlucas.tech/stats');
        const data = await res.json();

        document.getElementById('stat-online').textContent = data.online ? 'online' : 'offline';
        document.getElementById('stat-servers').textContent = data.activeServers;
        document.getElementById('stat-guilds').textContent = data.guilds;
        document.getElementById('stat-users').textContent = (data.users / 1000).toFixed(1);
        document.getElementById('stat-messages').textContent = (data.messages / 1000).toFixed(1);
        document.getElementById('stat-uptime').textContent = data.uptime;
        document.getElementById('stat-commands').textContent = data.commands;
    } catch (error) {
        document.getElementById('stat-online').textContent = 'error';
        document.getElementById('stat-servers').textContent = 'error';
        document.getElementById('stat-guilds').textContent = 'error';
        document.getElementById('stat-users').textContent = 'error';
        document.getElementById('stat-messages').textContent = 'error';
        document.getElementById('stat-uptime').textContent = 'error';
        document.getElementById('stat-commands').textContent = 'error';
        console.error('Stats konnten nicht geladen werden:', error);
    }
}

loadStats();