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

async function loadStats() {
    try {
        const res = await fetch('http://api.helios.dev-codelist.net:27765/stats');
        alert('Status: ' + res.status);
        const data = await res.json();
        alert('Data: ' + JSON.stringify(data));

        document.getElementById('stat-servers').textContent = data.guilds + '+';
        document.getElementById('stat-users').textContent = (data.users / 1000).toFixed(1) + 'K+';
    } catch (error) {
        alert('Error: ' + error.message);
        document.getElementById('stat-servers').textContent = 'error';
        document.getElementById('stat-users').textContent = 'error';
    }
}

loadStats();