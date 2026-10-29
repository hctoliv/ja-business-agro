(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* lavoura em perspectiva: fileiras de plantio que o "satélite" varre */
  function field(canvas, opts = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let w, h, mx = 0, my = 0, tx = 0, ty = 0, visible = true;
    const rows = opts.rows || 34, cols = opts.cols || 46;
    const seed = Array.from({ length: rows * cols }, () => Math.random());

    const size = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size(); addEventListener('resize', size);
    addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

    const ramp = v => v < .3 ? [217, 72, 15] : v < .45 ? [250, 176, 5] : v < .6 ? [163, 230, 53] : [16, 185, 129];

    const draw = t => {
      if (visible) {
        mx += (tx - mx) * .04; my += (ty - my) * .04;
        ctx.clearRect(0, 0, w, h);
        const horizon = h * (opts.horizon || (w < 700 ? .7 : .58)) + my * 30;
        const vx = w / 2 + mx * 120;
        const sweep = ((t / 9000) % 1.4) - .2;          // linha do satélite indo de trás pra frente
        for (let r = 0; r < rows; r++) {
          const z = r / rows;                            // 0 longe, 1 perto
          const p = Math.pow(z, 2.2);
          const y = horizon + p * (h - horizon) * 1.15;
          const spread = .15 + p * 2.6;
          const near = Math.abs(z - sweep) < .06;
          for (let c = 0; c < cols; c++) {
            const u = c / (cols - 1) - .5;
            const s = seed[r * cols + c];
            const sway = Math.sin(t / 1400 + c * .5 + r * .3) * 1.5 * p;
            const x = vx + u * w * spread + sway;
            if (x < -10 || x > w + 10) continue;
            const v = .35 + .65 * (Math.sin(c * .35 + r * .22) * .5 + .5) * (s * .5 + .5);
            const [cr, cg, cb] = near ? ramp(v) : [16, 185, 129];
            const a = (near ? .95 : .12 + p * .45) * (opts.alpha || 1);
            const rad = .5 + p * 2.4 + (near ? 1 : 0);
            ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
            ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fill();
          }
        }
        // brilho no horizonte
        const g = ctx.createLinearGradient(0, horizon - 80, 0, horizon + 40);
        g.addColorStop(0, 'rgba(16,185,129,0)'); g.addColorStop(.7, 'rgba(16,185,129,.10)'); g.addColorStop(1, 'rgba(16,185,129,0)');
        ctx.fillStyle = g; ctx.fillRect(0, horizon - 80, w, 120);
      }
      if (!reduce) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
  field($('#field'));
  field($('#field2'), { rows: 26, cols: 40, horizon: .55, alpha: .7 });

  /* título do hero */
  const title = $('.hero-title');
  $$('.line > span', title).forEach((s, i) => { s.style.transitionDelay = (.15 + i * .07) + 's'; });
  requestAnimationFrame(() => setTimeout(() => title.classList.add('go'), 80));

  /* NDVI ao vivo no HUD */
  const ndvi = $('#ndvi');
  if (ndvi && !reduce) setInterval(() => { ndvi.textContent = (.8 + Math.random() * .09).toFixed(2); }, 1600);

  /* entradas */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
    const typer = $('.type', e.target);
    if (typer) type(typer);
  }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el, i) => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.transitionDelay = (sibs.indexOf(el) * .08) + 's';
    io.observe(el);
  });

  function type(el) {
    const txt = el.dataset.text; let i = 0;
    const step = () => { el.textContent = txt.slice(0, ++i); if (i < txt.length) setTimeout(step, 55); };
    setTimeout(step, 600);
  }

  /* grade NDVI do talhão */
  const grid = $('#ndviGrid');
  if (grid) {
    const cells = Array.from({ length: 14 * 6 }, () => grid.appendChild(document.createElement('i')));
    const colors = ['#d9480f', '#fab005', '#a3e635', '#10B981', '#0b6e47', '#10B981', '#0b6e47', '#a3e635'];
    const paint = () => cells.forEach((c, k) => {
      const x = k % 14, y = (k / 14) | 0;
      const hot = Math.hypot(x - 10, y - 2) < 2.2 + Math.random() * .8;
      c.style.setProperty('--c', hot ? colors[(Math.random() * 2) | 0] : colors[2 + ((Math.random() * 6) | 0)]);
    });
    paint(); if (!reduce) setInterval(paint, 2600);
  }

  /* scroll: progresso, nav, fundadora, holofote, jornada */
  const bar = $('.progress span'), nav = $('#nav');
  const frame = $('#founderFrame'), fimg = frame && $('img', frame);
  const spot = $('.spot-bg'), spotSec = $('.spotlight');
  const journey = $('#jornada'), track = $('#track');
  const links = $$('.nav-links a');
  const secs = links.map(a => $(a.getAttribute('href')));
  const mobile = () => innerWidth <= 640;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const onScroll = () => {
    const y = scrollY, vh = innerHeight;
    bar.style.transform = `scaleX(${y / (document.documentElement.scrollHeight - vh)})`;
    nav.classList.toggle('solid', y > 40);

    if (frame && !reduce) {
      const r = frame.getBoundingClientRect();
      const p = clamp(1 - (r.top - vh * .15) / (vh * .7));
      const k = 12 * (1 - p);
      frame.style.clipPath = `inset(${k}% ${k}% ${k}% ${k}% round 28px)`;
      fimg.style.transform = `scale(${1.15 - .15 * p})`;
    }

    if (spot && !reduce) {
      const r = spotSec.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) spot.style.transform = `translateY(${(r.top / vh) * -12}%)`;
    }

    if (journey && !mobile() && !reduce) {
      const r = journey.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - vh));
      const max = track.scrollWidth - innerWidth;
      track.style.transform = `translate3d(${-p * max}px,0,0)`;
    }

    let cur = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * .4) cur = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === cur));
  };

  /* altura da jornada acompanha a largura real do trilho */
  const sizeJourney = () => {
    if (!journey) return;
    journey.style.height = mobile() || reduce ? '' : (track.scrollWidth - innerWidth + innerHeight) + 'px';
  };

  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  addEventListener('resize', () => { sizeJourney(); onScroll(); });
  addEventListener('load', () => { sizeJourney(); onScroll(); });
  sizeJourney(); onScroll();
})();
