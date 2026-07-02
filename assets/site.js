/* =========================================================
   Thendrask Launcher — shared site behaviour (all pages)
   Feature blocks are gated on element presence, so this one
   file safely serves every page.
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- mobile nav ---------- */
  var toggle = $('#navtoggle');
  var links = $('#navlinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () { links.classList.toggle('open'); });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) links.classList.remove('open');
    });
  }

  /* ---------- scroll progress bar + back-to-top ---------- */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);

  var backtop = document.createElement('button');
  backtop.className = 'backtop';
  backtop.type = 'button';
  backtop.setAttribute('aria-label', 'Back to top');
  backtop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5m0 0-6 6m6-6 6 6"/></svg>';
  backtop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  document.body.appendChild(backtop);

  var scrollQueued = false;
  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
      backtop.classList.toggle('show', window.scrollY > 600);
      scrollQueued = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- animated counters ---------- */
  function formatCount(n) { return n.toLocaleString('en-US'); }
  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (!isFinite(target) || el.dataset.done) return;
    el.dataset.done = '1';
    if (reduce) { el.textContent = formatCount(target); return; }
    var dur = 1400;
    var t0 = performance.now();
    (function step(t) {
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatCount(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- scroll reveal (with stagger) ---------- */
  $$('[data-stagger]').forEach(function (group) {
    $$('.reveal', group).forEach(function (el, i) {
      el.style.setProperty('--rd', (i * 90) + 'ms');
    });
  });
  var revealEls = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
    $$('.count[data-count]').forEach(runCounter);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        $$('.count[data-count]', e.target).forEach(runCounter);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- particle field (mouse-aware) ---------- */
  (function particles() {
    var c = $('#particles');
    if (!c || reduce) return;
    var ctx = c.getContext('2d');
    var w, h, parts;
    var mouse = { x: -9999, y: -9999 };

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(80, Math.floor(w / 20));
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.6 + 0.4,
          vy: -(Math.random() * 0.35 + 0.08), vx: (Math.random() - 0.5) * 0.18,
          a: Math.random() * 0.5 + 0.15, tw: Math.random() * Math.PI * 2,
          teal: Math.random() < 0.14
        });
      }
    }
    size();
    window.addEventListener('resize', size);
    window.addEventListener('pointermove', function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
    }, { passive: true });
    document.addEventListener('pointerleave', function () {
      mouse.x = -9999; mouse.y = -9999;
    });

    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        // gentle repulsion from the cursor
        var dx = p.x - mouse.x, dy = p.y - mouse.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 16900 && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var f = ((130 - d) / 130) * 0.65;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
        p.y += p.vy; p.x += p.vx; p.tw += 0.02;
        if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
        if (p.x < -5) p.x = w + 5;
        else if (p.x > w + 5) p.x = -5;
        var flick = 0.6 + Math.sin(p.tw) * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.teal
          ? 'rgba(52,229,200,' + (p.a * flick) + ')'
          : 'rgba(180,130,255,' + (p.a * flick) + ')';
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    tick();
  })();

  /* ---------- 3D tilt ---------- */
  if (!reduce) {
    $$('[data-tilt]').forEach(function (el) {
      var max = 5;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'rotateX(' + (-py * max).toFixed(2) + 'deg) rotateY(' + (px * max).toFixed(2) + 'deg) scale(1.012)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- cursor-following glow on .glow cards ---------- */
  $$('.glow').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- screenshot lightbox ---------- */
  (function lightbox() {
    var triggers = $$('[data-lightbox]');
    if (!triggers.length) return;
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Screenshot viewer');
    box.innerHTML = '<img alt="" /><span class="lb-cap"></span>';
    document.body.appendChild(box);
    var img = $('img', box);
    var cap = $('.lb-cap', box);
    function close() {
      box.classList.remove('open');
      document.body.style.overflow = '';
    }
    box.addEventListener('click', close);
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
    triggers.forEach(function (t) {
      t.addEventListener('click', function () {
        img.src = t.getAttribute('data-full') || t.currentSrc || t.src;
        img.alt = t.alt || '';
        cap.textContent = t.getAttribute('data-caption') || '';
        box.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });
  })();

  /* ---------- copy buttons on code blocks ---------- */
  $$('.code-block').forEach(function (block) {
    var clone = block.cloneNode(true);
    $$('.cm', clone).forEach(function (n) { n.remove(); });
    var text = clone.textContent.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).join('\n');
    if (!text) return;
    var btn = document.createElement('button');
    btn.className = 'code-copy';
    btn.type = 'button';
    btn.textContent = 'COPY';
    btn.setAttribute('aria-label', 'Copy command');
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'COPIED ✓';
        btn.classList.add('done');
        setTimeout(function () {
          btn.textContent = 'COPY';
          btn.classList.remove('done');
        }, 1600);
      });
    });
    block.appendChild(btn);
  });

  /* ---------- FAQ live search ---------- */
  (function faqSearch() {
    var input = $('#faq-search');
    if (!input) return;
    var groups = $$('.faq-group');
    var empty = $('#faq-empty');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var any = false;
      groups.forEach(function (g) {
        var visible = 0;
        $$('details', g).forEach(function (d) {
          var hit = !q || d.textContent.toLowerCase().indexOf(q) !== -1;
          d.style.display = hit ? '' : 'none';
          if (hit) visible++;
        });
        g.style.display = visible ? '' : 'none';
        if (visible) any = true;
      });
      if (empty) empty.style.display = any ? 'none' : '';
    });
  })();

  /* ---------- latest release (version pill + download links) ---------- */
  (function release() {
    fetch('https://ender-supporter.eosfang0.workers.dev/release')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return;
        if (data.tag) {
          var v = /^v/i.test(data.tag) ? data.tag : 'v' + data.tag;
          $$('#ver, [data-release-ver]').forEach(function (el) { el.textContent = v; });
          $$('[data-release-raw]').forEach(function (el) { el.textContent = v.replace(/^v/i, ''); });
        }
        if (data.exe) {
          $$('[data-release-exe]').forEach(function (a) { a.href = data.exe; });
        }
      })
      .catch(function () {});
  })();

  /* ---------- GitHub stats strip (homepage) ---------- */
  (function ghStats() {
    if (!$('#gh-stats')) return;
    var API = 'https://api.github.com/repos/Sxarlos/ThendraskLauncher';
    function setStat(sel, value) {
      var el = $(sel);
      if (!el || !isFinite(value)) return;
      el.setAttribute('data-count', value);
      var r = el.closest('.reveal');
      if (reduce || !r || r.classList.contains('in')) runCounter(el);
    }
    fetch(API)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (repo) {
        if (repo) setStat('#stat-stars', repo.stargazers_count);
      })
      .catch(function () {});
    fetch(API + '/releases?per_page=100')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (rels) {
        if (!Array.isArray(rels)) return;
        var dls = rels.reduce(function (sum, r) {
          return sum + (r.assets || []).reduce(function (s, a) { return s + (a.download_count || 0); }, 0);
        }, 0);
        setStat('#stat-downloads', dls);
      })
      .catch(function () {});
  })();

  /* ---------- supporters (homepage) ---------- */
  (function supporters() {
    var grid = $('#supporters-grid');
    if (!grid) return;
    var TIER_CLASSES = { 'end crystal': 's-av-end-crystal', 'elytra': 's-av-elytra' };
    function esc(str) {
      return String(str).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    fetch('https://ender-supporter.eosfang0.workers.dev/supporters', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then(function (list) {
        if (!Array.isArray(list) || list.length === 0) {
          grid.innerHTML = '<span class="s-empty">Be the first supporter!</span>';
          return;
        }
        grid.innerHTML = list.map(function (s) {
          var name = s.name || 'Anonymous';
          var tier = s.tier || 'Supporter';
          var avClass = TIER_CLASSES[tier.toLowerCase()] || 's-av-default';
          var initial = (name.trim()[0] || '?').toUpperCase();
          return '<div class="s-chip">' +
            '<span class="s-av ' + avClass + '">' + esc(initial) + '</span>' +
            '<span><div class="s-name">' + esc(name) + '</div>' +
            '<div class="s-tier">' + esc(tier) + '</div></span>' +
            '</div>';
        }).join('');
      })
      .catch(function () { grid.innerHTML = ''; });
  })();
})();
