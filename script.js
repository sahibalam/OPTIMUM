const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

const API_BASE = 'https://3fhqqpu0di.execute-api.ap-south-1.amazonaws.com';

function youtubeEmbedUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '').trim();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : '';
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : '';
    }
    return '';
  } catch {
    const m = u.match(/(?:youtu\.be\/|v=)([\w-]{6,})/i);
    return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : '';
  }
}

function youtubeVideoId(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '').trim();
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v') || '';
    }
    return '';
  } catch {
    const m = u.match(/(?:youtu\.be\/|v=)([\w-]{6,})/i);
    return m ? m[1] : '';
  }
}

function youtubeThumbnailUrl(url) {
  const id = youtubeVideoId(url);
  if (!id) return '';
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function setupLecturePlayer() {
  if (qs('#lecturePlayer')) return;

  const dlg = document.createElement('dialog');
  dlg.id = 'lecturePlayer';
  dlg.setAttribute('aria-label', 'Lecture player');
  dlg.innerHTML = `
    <form method="dialog" class="form" style="margin:0; max-width:900px">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px">
        <h3 id="lecturePlayerTitle" style="margin:0">Lecture</h3>
        <button class="btn btn-ghost" value="close" type="submit">Close</button>
      </div>
      <div style="margin-top:12px; aspect-ratio:16/9; width:min(860px, 84vw)">
        <iframe
          id="lecturePlayerFrame"
          title="Lecture video"
          width="100%"
          height="100%"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    </form>
  `;

  dlg.addEventListener('close', () => {
    const frame = qs('#lecturePlayerFrame', dlg);
    if (frame) frame.removeAttribute('src');
  });

  document.body.appendChild(dlg);
}

function openLecturePlayer({ title, youtubeUrl } = {}) {
  setupLecturePlayer();
  const dlg = qs('#lecturePlayer');
  if (!dlg) return;

  const src = youtubeEmbedUrl(youtubeUrl);
  if (!src) return;

  const h = qs('#lecturePlayerTitle', dlg);
  const frame = qs('#lecturePlayerFrame', dlg);
  if (h) h.textContent = title || 'Lecture';
  if (frame) frame.setAttribute('src', src + '?autoplay=1');

  if (typeof dlg.showModal === 'function') dlg.showModal();
}

function setYear() {
  const y = qs('#year');
  if (y) y.textContent = String(new Date().getFullYear());
}

function setupMobileNav() {
  const toggle = qs('#navToggle');
  const nav = qs('#primaryNav');
  if (!toggle || !nav) return;

  const close = () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  qsa('a', nav).forEach((a) => a.addEventListener('click', close));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function setupDashboardGate() {
  const btn = qs('#dashboardLink');
  const dlg = qs('#adminDialog');
  const form = qs('#adminDialogForm');
  const note = qs('#adminDialogNote');
  if (!btn || !dlg || !form) return;

  const storageKey = 'optimum_admin_cfg_v1';
  const getCfg = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  };

  btn.addEventListener('click', () => {
    const cfg = getCfg();
    if (form.user) form.user.value = cfg.user || '';
    if (form.pass) form.pass.value = cfg.pass || '';
    if (note) note.textContent = '';
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else window.location.href = 'admin.html';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = (form.user?.value || '').trim();
    const pass = form.pass?.value || '';
    if (!user || !pass) {
      if (note) note.textContent = 'Enter username and password.';
      return;
    }

    const cfg = getCfg();
    const apiBase = cfg.apiBase || API_BASE;
    localStorage.setItem(storageKey, JSON.stringify({ apiBase, user, pass }));
    window.location.href = 'admin.html';
  });
}

function setupCounters() {
  const els = qsa('[data-counter]');
  if (!els.length) return;

  const run = (el) => {
    const target = Number(el.getAttribute('data-counter') || '0');
    const duration = 900;
    const start = performance.now();

    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const v = Math.floor(target * (0.18 + 0.82 * p));
      el.textContent = String(v);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = String(target);
    };

    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          run(e.target);
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  els.forEach((el) => io.observe(el));
}

function setupForms() {
  const lead = qs('#leadForm');
  const leadNote = qs('#formNote');
  const contact = qs('#contactForm');
  const contactNote = qs('#contactNote');

  const handle = (form, noteEl) => {
    if (!form || !noteEl) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      noteEl.textContent = 'Thanks! We received your message. (Demo frontend — no backend connected)';
      form.reset();
    });
  };

  handle(lead, leadNote);
  handle(contact, contactNote);
}

function setupProgramsCarousel() {
  const root = qs('#programsCarousel');
  if (!root) return;

  const bg = qs('.programs-banner-bg', root);
  const dots = qs('.programs-dots', root);
  if (!bg || !dots) return;

  const images = ['assets/carousel/c1.png', 'assets/carousel/c2.png'];
  let i = 0;
  let timer = null;

  const setSlide = (idx) => {
    i = (idx + images.length) % images.length;
    bg.style.backgroundImage = `url('${images[i]}')`;
    qsa('button', dots).forEach((b, bi) => b.setAttribute('aria-selected', String(bi === i)));
  };

  const start = () => {
    stop();
    timer = window.setInterval(() => setSlide(i + 1), 4500);
  };

  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  dots.innerHTML = '';
  images.forEach((_, idx) => {
    const b = document.createElement('button');
    b.className = 'dot';
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', `Slide ${idx + 1}`);
    b.setAttribute('aria-selected', 'false');
    b.addEventListener('click', () => {
      setSlide(idx);
      start();
    });
    dots.appendChild(b);
  });

  setSlide(0);
  start();

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
}

function setupNotesCarousel() {
  const root = qs('#notesCarousel');
  if (!root) return;

  const viewport = qs('.notes-viewport', root);
  const prev = qs('.notes-nav.prev', root);
  const next = qs('.notes-nav.next', root);
  if (!viewport || !prev || !next) return;

  const getStep = () => {
    const card = qs('.note-card', root);
    if (!card) return Math.max(220, Math.floor(viewport.clientWidth * 0.8));
    const styles = getComputedStyle(qs('.notes-track', root));
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
    return card.getBoundingClientRect().width + gap;
  };

  const clampButtons = () => {
    const max = viewport.scrollWidth - viewport.clientWidth;
    prev.disabled = viewport.scrollLeft <= 2;
    next.disabled = viewport.scrollLeft >= max - 2;
  };

  const scrollByStep = (dir) => {
    viewport.scrollBy({ left: dir * getStep(), behavior: 'smooth' });
  };

  prev.addEventListener('click', () => scrollByStep(-1));
  next.addEventListener('click', () => scrollByStep(1));
  viewport.addEventListener('scroll', clampButtons, { passive: true });

  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollByStep(-1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollByStep(1);
    }
  });

  let isDown = false;
  let startX = 0;
  let startLeft = 0;

  const onDown = (e) => {
    isDown = true;
    viewport.classList.add('dragging');
    startX = e.clientX;
    startLeft = viewport.scrollLeft;
  };

  const onMove = (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    viewport.scrollLeft = startLeft - dx;
  };

  const onUp = () => {
    isDown = false;
    viewport.classList.remove('dragging');
  };

  viewport.addEventListener('pointerdown', (e) => {
    viewport.setPointerCapture(e.pointerId);
    onDown(e);
  });
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);

  clampButtons();
}

function setupHorizontalCarousel(rootSelector, viewportSelector, prevSelector, nextSelector, cardSelector, trackSelector) {
  const root = qs(rootSelector);
  if (!root) return;

  const viewport = qs(viewportSelector, root);
  const prev = qs(prevSelector, root);
  const next = qs(nextSelector, root);
  if (!viewport || !prev || !next) return;

  const getStep = () => {
    const card = qs(cardSelector, root);
    if (!card) return Math.max(220, Math.floor(viewport.clientWidth * 0.8));
    const track = qs(trackSelector, root);
    if (!track) return card.getBoundingClientRect().width;
    const styles = getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
    return card.getBoundingClientRect().width + gap;
  };

  const clampButtons = () => {
    const max = viewport.scrollWidth - viewport.clientWidth;
    prev.disabled = viewport.scrollLeft <= 2;
    next.disabled = viewport.scrollLeft >= max - 2;
  };

  const scrollByStep = (dir) => {
    viewport.scrollBy({ left: dir * getStep(), behavior: 'smooth' });
  };

  prev.addEventListener('click', () => scrollByStep(-1));
  next.addEventListener('click', () => scrollByStep(1));
  viewport.addEventListener('scroll', clampButtons, { passive: true });

  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollByStep(-1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollByStep(1);
    }
  });

  let isDown = false;
  let startX = 0;
  let startLeft = 0;

  const onDown = (e) => {
    isDown = true;
    viewport.classList.add('dragging');
    startX = e.clientX;
    startLeft = viewport.scrollLeft;
  };

  const onMove = (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    viewport.scrollLeft = startLeft - dx;
  };

  const onUp = () => {
    isDown = false;
    viewport.classList.remove('dragging');
  };

  viewport.addEventListener('pointerdown', (e) => {
    viewport.setPointerCapture(e.pointerId);
    onDown(e);
  });
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);

  clampButtons();
}

function setupStudentsCarousel() {
  setupHorizontalCarousel(
    '#studentsCarousel',
    '.hscroll-viewport',
    '.hscroll-nav.prev',
    '.hscroll-nav.next',
    '.scard',
    '.hscroll-track'
  );

  const root = qs('#studentsCarousel');
  if (!root) return;
  const viewport = qs('.hscroll-viewport', root);
  const track = qs('.hscroll-track', root);
  if (!viewport) return;

  if (track && !track.dataset.cloned) {
    const items = Array.from(track.children);
    items.forEach((el) => {
      const clone = el.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
    track.dataset.cloned = 'true';
  }
}

function setupOfferingsTabs() {
  const roots = qsa('.offerings-tabs');
  if (!roots.length) return;

  roots.forEach((root) => {
    const tabs = qsa('.tab', root);
    if (!tabs.length) return;

    const isLecturesTabs = !!qs('#lecturesCarousel') && root.closest('section')?.getAttribute('aria-label') === 'Recorded lectures offerings';

    const labelToClass = (label) => {
      const s = String(label || '').toLowerCase();
      if (s.includes('12 pass')) return '12pass';
      const m = s.match(/class\s*(\d+)/);
      return m ? m[1] : '';
    };

    tabs.forEach((t) => {
      t.addEventListener('click', () => {
        tabs.forEach((x) => {
          x.classList.remove('active');
          x.setAttribute('aria-selected', 'false');
        });
        t.classList.add('active');
        t.setAttribute('aria-selected', 'true');

        if (isLecturesTabs) {
          const klass = labelToClass(t.textContent);
          loadRecordedLectures({ class: klass });
        }
      });
    });

    if (isLecturesTabs) {
      const active = tabs.find((x) => x.classList.contains('active')) || tabs[0];
      const klass = labelToClass(active?.textContent);
      loadRecordedLectures({ class: klass });
    }
  });
}

function loadRecordedLectures({ class: klass } = {}) {
  const root = qs('#lecturesCarousel');
  if (!root) return;
  const track = qs('.notes-track', root);
  if (!track) return;

  const url = new URL(API_BASE + '/lectures');
  if (klass) url.searchParams.set('class', klass);

  fetch(url.toString())
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      const items = Array.isArray(data?.items) ? data.items : [];
      track.innerHTML = '';

      if (!items.length) {
        const empty = document.createElement('article');
        empty.className = 'note-card';
        empty.style.cssText = '--card:#f1f5f9; --ring:#94a3b8';
        empty.innerHTML = '<div class="note-top"><div class="note-title"><strong>No</strong><br />lectures yet</div></div>';
        track.appendChild(empty);
        return;
      }

      items.slice(0, 12).forEach((it) => {
        const card = document.createElement('article');
        card.className = 'note-card';
        card.style.cssText = '--card:#dbeafe; --ring:#3b82f6';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Play ${it.subject} lecture`);
        const thumb = youtubeThumbnailUrl(it.youtubeUrl) || 'assets/lectures/lec2.jpg';
        card.innerHTML = `
          <div class="note-top">
            <div class="note-title"><strong>${escapeHtml(it.subject || 'Lecture')}</strong><br />recorded lecture</div>
          </div>
          <div class="note-circle"><img src="${thumb}" alt="${escapeHtml(it.subject || 'Lecture')} recorded lecture" /></div>
        `;

        const play = () => {
          openLecturePlayer({
            title: `${it.subject || 'Lecture'} (Class ${it.class || ''}${it.section ? ' ' + it.section : ''})`,
            youtubeUrl: it.youtubeUrl,
          });
        };

        card.addEventListener('click', play);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            play();
          }
        });

        track.appendChild(card);
      });
    })
    .catch(() => {
      track.innerHTML = '';
      const fail = document.createElement('article');
      fail.className = 'note-card';
      fail.style.cssText = '--card:#ffe4e6; --ring:#fb7185';
      fail.innerHTML = '<div class="note-top"><div class="note-title"><strong>Failed</strong><br />to load</div></div>';
      track.appendChild(fail);
    });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

setYear();
setupMobileNav();
setupDashboardGate();
setupCounters();
setupForms();
setupProgramsCarousel();
setupNotesCarousel();
setupOfferingsTabs();
setupStudentsCarousel();
