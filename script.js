// ===== SCROLL TRACKING & ANIMATIONS =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            if (entry.target.classList.contains('feature-card')) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
            }
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all Feature Cards and Command Cards
document.querySelectorAll('.feature-card, .command-card, .stat').forEach((card, index) => {
    card.style.animationDelay = `${index * 0.05}s`;
    observer.observe(card);
});

// ===== SMOOTH SCROLL HANDLING =====
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    });
});

document.getElementById('data-year').textContent = new Date().getFullYear();

// Stats Cache und Retry-Logik
let statsCache = {};
let lastUpdateTime = null;
const CACHE_DURATION = 25000; // 25 Sekunden
const MAX_RETRIES = 3;
let retryCount = 0;

// Formatiere große Zahlen (K, M, B)
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return Math.floor(num).toString();
}

// Aktualisiere UI mit animierten Zahlen
async function animateNumber(element, startNum, endNum, duration = 600) {
    const startTime = Date.now();
    const startValue = parseInt(element.textContent) || 0;
    const targetValue = typeof endNum === 'number' ? endNum : startNum;
    
    return new Promise(resolve => {
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = startValue + (targetValue - startValue) * progress;
            element.textContent = formatNumber(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = formatNumber(targetValue);
                resolve();
            }
        };
        animate();
    });
}

// Aktualisiere Last-Update Zeit
function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    const lastUpdateEl = document.getElementById('last-update');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = `Last update: ${timeStr}`;
    }
}

// Stats von API fetchen mit Fehlerbehandlung
async function loadStats(isRetry = false) {
    try {
        const res = await fetch('https://api.notlucas.tech/stats', { 
            timeout: 8000,
            signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined 
        });
        
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();

        // Debug: Log the raw data
        console.log('Stats API Response:', data);

        // Cache die Daten
        statsCache = data;
        lastUpdateTime = Date.now();
        retryCount = 0;

        // Handle both 'online' and 'status' fields from API
        let onlineValue = data.online !== undefined ? data.online : data.status;
        
        // Handle both boolean and string online status
        let isOnline = false;
        if (typeof onlineValue === 'boolean') {
            isOnline = onlineValue;
        } else if (typeof onlineValue === 'string') {
            isOnline = onlineValue.toLowerCase() === 'online' || onlineValue === '1' || onlineValue === 'true';
        } else if (typeof onlineValue === 'number') {
            isOnline = onlineValue === 1 || onlineValue > 0;
        }
        
        const onlineStatus = isOnline ? 'online' : 'offline';
        const onlineElement = document.getElementById('stat-online');
        const onlineIcon = document.getElementById('stat-online-icon');
        
        console.log('API Field Value:', onlineValue, '| Determined online status:', onlineStatus);
        
        onlineElement.textContent = onlineStatus;
        onlineElement.className = `stat-number stat-${onlineStatus}`;
        
        if (onlineIcon) {
            onlineIcon.className = `stat-icon ${onlineStatus}`;
        }

        // Animate number updates
        await Promise.all([
            animateNumber(document.getElementById('stat-servers'), data.activeServers),
            animateNumber(document.getElementById('stat-guilds'), data.guilds),
            animateNumber(document.getElementById('stat-users'), data.users),
            animateNumber(document.getElementById('stat-messages'), data.messages),
            animateNumber(document.getElementById('stat-commands'), data.commands)
        ]);

        document.getElementById('stat-uptime').textContent = data.uptime;
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Stats Load Error:', error.message);
        
        // Retry Logic
        if (retryCount < MAX_RETRIES && !isRetry) {
            retryCount++;
            console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(() => loadStats(true), 3000);
        } else {
            // Show error state
            const errorMsg = 'connection error';
            document.getElementById('stat-online').textContent = errorMsg;
            document.getElementById('stat-online').className = 'stat-number stat-error';
            const onlineIcon = document.getElementById('stat-online-icon');
            if (onlineIcon) {
                onlineIcon.className = 'stat-icon offline';
            }
            
            // Use cached data if available
            if (Object.keys(statsCache).length > 0) {
                console.log('Using cached stats');
                
                // Also show cached online status if available
                if (statsCache.online !== undefined || statsCache.status !== undefined) {
                    let cachedOnlineValue = statsCache.online !== undefined ? statsCache.online : statsCache.status;
                    let isCachedOnline = false;
                    if (typeof cachedOnlineValue === 'boolean') {
                        isCachedOnline = cachedOnlineValue;
                    } else if (typeof cachedOnlineValue === 'string') {
                        isCachedOnline = cachedOnlineValue.toLowerCase() === 'online' || cachedOnlineValue === '1' || cachedOnlineValue === 'true';
                    } else if (typeof cachedOnlineValue === 'number') {
                        isCachedOnline = cachedOnlineValue === 1 || cachedOnlineValue > 0;
                    }
                    
                    const cachedStatus = isCachedOnline ? 'online' : 'offline';
                    document.getElementById('stat-online').textContent = cachedStatus + ' (cached)';
                    document.getElementById('stat-online').className = `stat-number stat-${cachedStatus}`;
                    if (onlineIcon) {
                        onlineIcon.className = `stat-icon ${cachedStatus}`;
                    }
                }
                
                document.getElementById('stat-servers').textContent = formatNumber(statsCache.activeServers || 0);
                document.getElementById('stat-guilds').textContent = formatNumber(statsCache.guilds || 0);
                document.getElementById('stat-users').textContent = formatNumber(statsCache.users || 0);
                document.getElementById('stat-messages').textContent = formatNumber(statsCache.messages || 0);
                document.getElementById('stat-commands').textContent = formatNumber(statsCache.commands || 0);
                if (statsCache.uptime) {
                    document.getElementById('stat-uptime').textContent = statsCache.uptime;
                }
            }
        }
    }
}

// Initial load
loadStats();

// Auto-refresh alle 30 Sekunden
setInterval(loadStats, 30000);

// Resume updates when tab becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('Page visible - resuming updates');
        loadStats();
    }
});