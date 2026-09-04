(() => {
  'use strict';

  const GH_USER = 'virtuaall1';
  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', HTML: '#e34c26',
    CSS: '#563d7c', Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
    PHP: '#4F5D95', Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', Swift: '#F05138',
    Kotlin: '#A97BFF', Dart: '#00B4AB', Shell: '#89e051', Vue: '#41b883', Svelte: '#ff3e00',
    Lua: '#000080', Dockerfile: '#384d54', SCSS: '#c6538c', Jupyter: '#DA5B0B'
  };
  const FALLBACK_COLORS = ['#7c5cff', '#22d3c9', '#ff5c9d', '#ffb454', '#5cd6ff', '#a3e635'];
  const colorFor = (name, i) => LANG_COLORS[name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = (() => { try { return localStorage.getItem('theme'); } catch (e) { return null; } })();
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  let theme = savedTheme || (prefersLight ? 'light' : 'dark');
  const applyTheme = t => { root.setAttribute('data-theme', t); theme = t; try { localStorage.setItem('theme', t); } catch (e) {} };
  applyTheme(theme);
  themeToggle.addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark'));

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Custom cursor ---------- */
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
  });
  (function loopRing() {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(loopRing);
  })();
  document.querySelectorAll('a, button, .project-card, .tag-pill, .stat-card').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });

  /* ---------- Scroll progress ---------- */
  const progressBar = document.getElementById('progressBar');
  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    progressBar.style.width = scrolled + '%';
  };
  document.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal-up');
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); } });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));

  /* ---------- Particle background ---------- */
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], glyphs = [];
  const DENSITY = 14000;
  const GLYPH_CHARS = '01{}<>/;=#$()[]+-*&|'.split('');
  let mouseInWindow = false;
  window.addEventListener('mouseenter', () => { mouseInWindow = true; });
  window.addEventListener('mouseleave', () => { mouseInWindow = false; });

  function resize() {
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
    const count = Math.min(110, Math.floor((W * H) / DENSITY));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 0.6
    }));
    const gCount = Math.min(70, Math.floor((W * H) / 26000));
    glyphs = Array.from({ length: gCount }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vy: Math.random() * 0.4 + 0.15,
      char: GLYPH_CHARS[Math.floor(Math.random() * GLYPH_CHARS.length)],
      size: Math.random() * 8 + 10,
      alpha: Math.random() * 0.25 + 0.06,
      depth: Math.random() * 0.6 + 0.2,
      flip: Math.random() * 400
    }));
  }

  function tick(t) {
    ctx.clearRect(0, 0, W, H);
    const isLight = root.getAttribute('data-theme') === 'light';
    const dotColor = isLight ? '20,20,30' : '230,232,240';
    const lineColor = isLight ? '20,20,40' : '124,92,255';
    const glyphColor = isLight ? '20,20,40' : '124,244,232';

    // falling code glyphs, drifting with parallax toward the mouse
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const g of glyphs) {
      g.y += g.vy;
      if (g.y > H + 20) { g.y = -20; g.x = Math.random() * W; }
      if (Math.round((t + g.flip) / 2200) % 40 === 0) {
        g.char = GLYPH_CHARS[Math.floor(Math.random() * GLYPH_CHARS.length)];
      }
      const parX = mouseInWindow ? (mx - W / 2) * 0.02 * g.depth : 0;
      ctx.font = `${g.size}px "JetBrains Mono", monospace`;
      ctx.fillStyle = `rgba(${glyphColor},${g.alpha})`;
      ctx.fillText(g.char, g.x + parX, g.y);
    }

    // dot particles, gently repelled by the cursor
    for (const p of particles) {
      if (mouseInWindow) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        const radius = 130;
        if (d2 < radius * radius) {
          const d = Math.sqrt(d2) || 1;
          const force = (1 - d / radius) * 0.9;
          p.vx += (dx / d) * force * 0.06;
          p.vy += (dy / d) * force * 0.06;
        }
      }
      p.vx *= 0.98; p.vy *= 0.98;
      const speed = Math.hypot(p.vx, p.vy);
      const minSpeed = 0.06;
      if (speed < minSpeed) { p.vx += (Math.random() - 0.5) * 0.02; p.vy += (Math.random() - 0.5) * 0.02; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${dotColor},.55)`;
      ctx.fill();
    }
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${lineColor},${0.14 * (1 - dist / 120)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    // web connecting nearby particles to the cursor itself
    if (mouseInWindow) {
      for (const p of particles) {
        const dx = p.x - mx, dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my);
          ctx.strokeStyle = `rgba(${lineColor},${0.22 * (1 - dist / 160)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${lineColor},.8)`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(tick);

  /* ---------- Project card tilt ---------- */
  function attachTilt(card) {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const rotX = ((py / r.height) - 0.5) * -8;
      const rotY = ((px / r.width) - 0.5) * 8;
      card.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
      card.style.setProperty('--mx', px + 'px');
      card.style.setProperty('--my', py + 'px');
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  }

  /* ---------- Count-up ---------- */
  function countUp(el, target, suffix = '') {
    const dur = 1200;
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Typing effect ---------- */
  function typeLoop(el, words) {
    let wi = 0, ci = 0, deleting = false;
    function step() {
      const word = words[wi];
      if (!deleting) {
        ci++;
        if (ci > word.length) { deleting = true; setTimeout(step, 1400); return; }
      } else {
        ci--;
        if (ci < 0) { deleting = false; wi = (wi + 1) % words.length; ci = 0; }
      }
      el.textContent = word.slice(0, ci);
      setTimeout(step, deleting ? 45 : 90);
    }
    step();
  }

  /* ---------- Terminal typing ---------- */
  const termBody = document.getElementById('terminalBody');
  const termQueue = [];
  let termRunning = false;

  function termLine(promptHTML, typedText, outLines) {
    termQueue.push({ promptHTML, typedText, outLines });
    runTermQueue();
  }

  async function runTermQueue() {
    if (termRunning) return;
    termRunning = true;
    while (termQueue.length) {
      const { promptHTML, typedText, outLines } = termQueue.shift();
      const lineEl = document.createElement('div');
      const promptSpan = document.createElement('span');
      promptSpan.innerHTML = promptHTML;
      const typedSpan = document.createElement('span');
      const cursor = document.createElement('span');
      cursor.className = 'terminal-cursor';
      lineEl.appendChild(promptSpan);
      lineEl.appendChild(typedSpan);
      lineEl.appendChild(cursor);
      termBody.appendChild(lineEl);
      for (let i = 0; i <= typedText.length; i++) {
        typedSpan.textContent = typedText.slice(0, i);
        await sleep(18 + Math.random() * 20);
      }
      cursor.remove();
      await sleep(280);
      if (outLines && outLines.length) {
        for (const out of outLines) {
          const o = document.createElement('span');
          o.className = 't-out';
          o.textContent = out;
          o.style.display = 'block';
          termBody.appendChild(o);
          await sleep(110);
        }
      }
      await sleep(260);
    }
    termRunning = false;
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- GitHub data ---------- */
  const $ = id => document.getElementById(id);

  function timeSince(dateStr) {
    const years = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(1, Math.round(years * 10) / 10);
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error('GitHub API ' + res.status);
    return res.json();
  }

  async function loadProfile() {
    try {
      const user = await fetchJSON(`https://api.github.com/users/${GH_USER}`);
      $('avatar').src = user.avatar_url;
      $('heroName').textContent = user.name || user.login;
      $('aboutName').textContent = user.name || user.login;
      $('aboutLogin').textContent = '@' + user.login;
      $('aboutBio').textContent = user.bio || 'Разработчик, увлечён кодом и системами.';
      const meta = [];
      if (user.location) meta.push(user.location);
      if (user.company) meta.push(user.company);
      if (user.blog) meta.push(user.blog);
      $('aboutMeta').innerHTML = meta.map(m => `<span>${m}</span>`).join('');
      $('heroBio').textContent = user.bio
        ? user.bio
        : 'Пишу код, ломаю баги, собираю пайплайны. Ниже — живые данные прямо из моего GitHub.';

      countUp($('statRepos'), user.public_repos || 0);
      countUp($('statFollowers'), user.followers || 0);
      countUp($('statYears'), timeSince(user.created_at));

      const graph = $('contribGraph');
      graph.src = `https://ghchart.rshah.org/7c5cff/${GH_USER}`;
      graph.onerror = () => { graph.style.display = 'none'; $('contribFallback').textContent = 'Не удалось загрузить граф активности — посмотрите профиль напрямую на GitHub.'; };

      termLine('<span class="t-prompt">➜</span> <span class="t-path">~</span> ', 'whoami');
      termLine('', '', [user.login]);
      termLine('<span class="t-prompt">➜</span> <span class="t-path">~</span> ', `gh api users/${GH_USER} | jq '.public_repos, .followers'`);
      termLine('', '', [String(user.public_repos ?? 0), String(user.followers ?? 0)]);
    } catch (e) {
      $('aboutBio').textContent = 'Не удалось загрузить профиль GitHub прямо сейчас. Попробуйте обновить страницу.';
      $('heroBio').textContent = 'Пишу код, ломаю баги, собираю пайплайны.';
      typeLoop($('typedRole'), ['Software Developer']);
      termLine('<span class="t-prompt">➜</span> <span class="t-path">~</span> ', 'curl api.github.com', ['connection failed — showing cached view']);
      console.error(e);
    }
  }

  async function loadRepos() {
    const grid = $('projectsGrid');
    try {
      const repos = await fetchJSON(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`);
      const real = repos.filter(r => !r.fork);
      const totalStars = real.reduce((s, r) => s + r.stargazers_count, 0);
      countUp($('statStars'), totalStars);

      // language aggregation
      const langCount = {};
      real.forEach(r => { if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1; });
      const langEntries = Object.entries(langCount).sort((a, b) => b[1] - a[1]);
      const totalLang = langEntries.reduce((s, [, c]) => s + c, 0) || 1;
      const topLangs = langEntries.slice(0, 6);

      const barsHTML = topLangs.length
        ? topLangs.map(([name, count], i) => {
            const pct = Math.round((count / totalLang) * 100);
            return `<div class="lang-row">
              <div class="lang-row-top">
                <span class="lang-row-name"><span class="lang-dot" style="background:${colorFor(name, i)}"></span>${name}</span>
                <span>${pct}%</span>
              </div>
              <div class="lang-track"><div class="lang-fill" style="width:0%;background:${colorFor(name, i)}" data-target="${pct}"></div></div>
            </div>`;
          }).join('')
        : '<p style="color:var(--text-dim);font-size:.9rem">Пока недостаточно данных о языках.</p>';
      $('langBars').innerHTML = barsHTML;
      requestAnimationFrame(() => {
        document.querySelectorAll('.lang-fill').forEach(el => { el.style.width = el.dataset.target + '%'; });
      });

      $('tagCloud').innerHTML = langEntries.slice(0, 14)
        .map(([name]) => `<span class="tag-pill">${name}</span>`).join('')
        || '<span class="tag-pill">—</span>';

      const top = [...real].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 6);
      if (top.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-dim)">Публичные репозитории не найдены.</p>';
        return;
      }
      grid.innerHTML = top.map(r => `
        <a class="project-card glass" href="${r.html_url}" target="_blank" rel="noopener">
          <div class="project-top">
            <span class="project-name">
              <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/></svg>
              ${r.name}
            </span>
            <span class="project-star">★ ${r.stargazers_count}</span>
          </div>
          <p class="project-desc">${r.description ? escapeHTML(r.description) : 'Без описания.'}</p>
          <div class="project-foot">
            ${r.language ? `<span><span class="project-lang-dot" style="background:${colorFor(r.language, 0)}"></span>${r.language}</span>` : ''}
            <span>обновлён ${new Date(r.pushed_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </a>
      `).join('');
      grid.querySelectorAll('.project-card').forEach(attachTilt);
      grid.querySelectorAll('.reveal-up, .project-card').forEach(el => { el.classList.add('reveal-up', 'in-view'); });

      if (topLangs.length) {
        typeLoop($('typedRole'), [...topLangs.map(([n]) => n + ' Developer'), 'Software Developer']);
      } else {
        typeLoop($('typedRole'), ['Software Developer']);
      }

      termLine('<span class="t-prompt">➜</span> <span class="t-path">~</span> ', 'gh repo list --limit 3 --json name,stargazerCount');
      termLine('', '', top.slice(0, 3).map(r => `${r.name}  ★${r.stargazers_count}`));
      if (topLangs.length) {
        termLine('<span class="t-prompt">➜</span> <span class="t-path">~</span> ', 'gh api users/' + GH_USER + '/repos | jq -r \'.[].language\' | sort | uniq -c | sort -rn | head -3');
        termLine('', '', topLangs.slice(0, 3).map(([n, c]) => `${String(c).padStart(4)} ${n}`));
      }
    } catch (e) {
      grid.innerHTML = '<p style="color:var(--text-dim)">Не удалось загрузить репозитории. Попробуйте обновить страницу позже.</p>';
      $('langBars').innerHTML = '<p style="color:var(--text-dim);font-size:.9rem">Нет данных.</p>';
      typeLoop($('typedRole'), ['Software Developer']);
      console.error(e);
    }
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  loadProfile();
  loadRepos();
})();
