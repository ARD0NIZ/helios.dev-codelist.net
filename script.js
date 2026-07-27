// ===== MOBILE NAV =====
const hamburger = document.getElementById('hamburger');
const mainNav = document.getElementById('main-nav');
if (hamburger && mainNav) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        mainNav.classList.toggle('open');
    });
    mainNav.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            hamburger.classList.remove('active');
            mainNav.classList.remove('open');
        });
    });
}

// ===== SCROLL TRACKING & ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            const headerH = document.querySelector('header').offsetHeight;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerH - 16, behavior: 'smooth' });
        }
    });
});

document.getElementById('data-year').textContent = new Date().getFullYear();

// ===== STATS =====
let statsCache = {};
let retryCount = 0;
const MAX_RETRIES = 3;

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
}

function animateNumber(el, target, duration = 600) {
    const start = parseInt(el.textContent) || 0;
    const t = typeof target === 'number' ? target : start;
    const t0 = Date.now();
    return new Promise(resolve => {
        const tick = () => {
            const p = Math.min((Date.now() - t0) / duration, 1);
            el.textContent = formatNumber(start + (t - start) * p);
            p < 1 ? requestAnimationFrame(tick) : (el.textContent = formatNumber(t), resolve());
        };
        tick();
    });
}

function parseOnline(val) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'online' || val === '1' || val === 'true';
    if (typeof val === 'number') return val === 1 || val > 0;
    return false;
}

async function loadStats(isRetry = false) {
    try {
        const res = await fetch('https://api.notlucas.tech/stats', {
            signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        statsCache = data;
        retryCount = 0;

        const isOnline = parseOnline(data.online !== undefined ? data.online : data.status);
        const status = isOnline ? 'online' : 'offline';
        const el = document.getElementById('stat-online');
        el.textContent = status;
        el.className = `stat-number stat-${status}`;
        const icon = document.getElementById('stat-online-icon');
        if (icon) icon.className = `stat-icon ${status}`;

        await Promise.all([
            animateNumber(document.getElementById('stat-servers'), data.activeServers),
            animateNumber(document.getElementById('stat-guilds'), data.guilds),
            animateNumber(document.getElementById('stat-users'), data.users),
            animateNumber(document.getElementById('stat-messages'), data.messages),
            animateNumber(document.getElementById('stat-commands'), data.commands)
        ]);
        document.getElementById('stat-uptime').textContent = data.uptime;

        const upd = document.getElementById('last-update');
        upd.textContent = `Last update: ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        upd.classList.remove('updated');
        void upd.offsetWidth;
        upd.classList.add('updated');
    } catch (err) {
        if (retryCount < MAX_RETRIES && !isRetry) { retryCount++; setTimeout(() => loadStats(true), 3000); return; }
        const el = document.getElementById('stat-online');
        el.textContent = 'connection error';
        el.className = 'stat-number stat-error';
        const icon = document.getElementById('stat-online-icon');
        if (icon) icon.className = 'stat-icon offline';
        if (Object.keys(statsCache).length) {
            const cached = parseOnline(statsCache.online !== undefined ? statsCache.online : statsCache.status);
            if (cached) { el.textContent = 'online (cached)'; el.className = 'stat-number stat-online'; }
        }
    }
}

loadStats();
setInterval(loadStats, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadStats(); });

// ===== COMMANDS =====
const COMMANDS_API = 'https://api.notlucas.tech/commands';

const CATEGORIES = {
    moderation:   { label: 'Moderation',      icon: '\u{1F6E1}\uFE0F' },
    leveling:     { label: 'Leveling',         icon: '\u{1F3AF}' },
    globalchat:   { label: 'Global Chat',      icon: '\u{1F30D}' },
    botsystem:    { label: 'Bot System',       icon: '\u{1F4BB}' },
    prvtchannel:  { label: 'Private Channels', icon: '\u{1F512}' },
    general:      { label: 'General',           icon: '\u{2139}\uFE0F' },
};

function buildCommandCard(cmd) {
    const card = document.createElement('div');
    card.className = 'command-card';
    card.dataset.category = cmd.category || 'general';

    // Entire command is owner-only → gray out
    if (cmd.bot_owner_only) {
        card.classList.add('owner-only');
    }

    const cat = CATEGORIES[cmd.category] || CATEGORIES.general;

    // Subcommands (type 1)
    const subs = (cmd.options || []).filter(o => o.type === 1);
    // Arguments (not subcommands)
    const args = (cmd.options || []).filter(o => o.type !== 1);
    // Required permission from command or first subcommand
    const perms = cmd.default_member_permissions || [];

    let tagsHtml = '';

    // Subcommand tags — gray out owner-only ones
    if (subs.length) {
        tagsHtml += subs.map(s => {
            const cls = s.bot_owner_only ? 'tag tag-sub tag-owner' : 'tag tag-sub';
            const title = s.description ? ` title="${s.description}"` : '';
            const badge = s.bot_owner_only ? ' <span class="owner-dot" title="Bot Owner Only"></span>' : '';
            return `<span class="${cls}"${title}>${s.name}${badge}</span>`;
        }).join('');
    }

    // Argument tags
    if (args.length) {
        tagsHtml += args.map(a => {
            const req = a.required ? '<span class="tag-required">*</span>' : '';
            const ch = a.choices && a.choices.length ? `<span class="tag-choices">${a.choices.map(c => c.name).join(', ')}</span>` : '';
            return `<span class="tag tag-arg">${a.name}${req}</span>${ch}`;
        }).join('');
    }

    // Permission tags
    if (perms.length) {
        tagsHtml += perms.slice(0, 3).map(p => `<span class="tag tag-perm">${p}</span>`).join('');
    }

    // Owner-only badge
    const ownerBadge = cmd.bot_owner_only ? '<span class="owner-badge">Bot Owner Only</span>' : '';
    // Has extra owner features badge
    const ownerFeatureBadge = cmd.has_owner_content ? '<span class="owner-feature-badge" title="This command shows extra features for the Bot Owner">Owner: extra features</span>' : '';

    const cmdPath = cmd.name === 'gc' || cmd.name === 'botsystem' || cmd.name === 'prvtchannel' || cmd.name === 'owner'
        ? `/${cmd.name} `
        : `/${cmd.name}`;

    card.innerHTML = `
        <div class="command-head">
            <span class="command-name">${cmdPath}</span>
            <div class="command-badges">${ownerBadge}${ownerFeatureBadge}</div>
            <button class="command-copy" data-cmd="${cmd.name}" title="Copy command">Copy</button>
        </div>
        <div class="command-desc">${cmd.description || 'No description'}</div>
        ${tagsHtml ? `<div class="command-tags">${tagsHtml}</div>` : ''}
    `;
    return card;
}

let activeFilter = 'all';

function applyFilter(filter) {
    activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    document.querySelectorAll('.command-card').forEach(c => {
        c.style.display = (filter === 'all' || c.dataset.category === filter) ? '' : 'none';
    });
}

async function loadCommands() {
    const container = document.getElementById('commands-list');
    const filtersEl = document.getElementById('command-filters');
    const status = document.getElementById('commands-status');
    if (!container) return;

    try {
        const res = await fetch(COMMANDS_API, { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();

        // Show ALL commands — owner-only ones get visually grayed out
        const visible = data.commands.filter(cmd => cmd.type !== 3);
        visible.sort((a, b) => {
            const catOrder = ['general', 'moderation', 'globalchat', 'leveling', 'botsystem', 'prvtchannel'];
            const ci = catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
            return ci !== 0 ? ci : a.name.localeCompare(b.name);
        });

        // Count per category
        const cats = {};
        visible.forEach(cmd => { const c = cmd.category || 'general'; cats[c] = (cats[c] || 0) + 1; });

        // Build filter buttons in bot's help order
        const catOrder = ['all', 'general', 'moderation', 'leveling', 'globalchat', 'botsystem', 'prvtchannel'];
        filtersEl.innerHTML = catOrder
            .filter(c => c === 'all' || cats[c])
            .map(c => {
                if (c === 'all') return `<button class="filter-btn active" data-filter="all">All (${visible.length})</button>`;
                const cat = CATEGORIES[c];
                return `<button class="filter-btn" data-filter="${c}">${cat.icon} ${cat.label} (${cats[c]})</button>`;
            }).join('');

        filtersEl.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
        });

        // Build command grid
        const grid = document.createElement('div');
        grid.className = 'command-grid';
        visible.forEach(cmd => {
            const card = buildCommandCard(cmd);
            grid.appendChild(card);
            observer.observe(card);
        });
        container.innerHTML = '';
        container.appendChild(grid);

        status.textContent = `${visible.length} commands available`;
        status.style.color = '#26f4df';
    } catch (err) {
        status.textContent = 'Could not load commands';
        status.style.color = '#ff8844';
    }
}

loadCommands();

// Copy to clipboard (delegated)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.command-copy');
    if (!btn) return;
    const text = `/${btn.dataset.cmd}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
        }).catch(() => fallbackCopy(text, btn));
    } else {
        fallbackCopy(text, btn);
    }
});

function fallbackCopy(text, btn) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
    } catch (_) {
        btn.textContent = 'Failed';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    }
    document.body.removeChild(ta);
}
