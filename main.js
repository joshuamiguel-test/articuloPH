// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Back to top
(function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  const SHOW_AFTER = 400;
  let ticking = false;

  function update() {
    if (window.scrollY > SHOW_AFTER) btn.classList.add('is-visible');
    else btn.classList.remove('is-visible');
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    btn.blur();
  });
})();

// Mobile nav toggle
(function initMobileNav() {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) nav.setAttribute('data-open', 'true');
    else nav.removeAttribute('data-open');
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    setOpen(!open);
  });

  nav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
})();

// Testimonial carousel
(async function initTestimonialCarousel() {
  const track = document.getElementById('testimonial-track');
  const dotsWrap = document.getElementById('testimonial-dots');
  const prevBtn = document.getElementById('testimonial-prev');
  const nextBtn = document.getElementById('testimonial-next');

  if (!track) return;
  const carouselEl = track.closest('.carousel');

  let items = [];
  try {
    const res = await fetch('testimonials.json');
    if (!res.ok) throw new Error('Failed to load testimonials');
    items = await res.json();
  } catch (err) {
    track.innerHTML = '<li class="carousel-slide placeholder">Could not load testimonials.</li>';
    console.error(err);
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    track.innerHTML = '<li class="carousel-slide placeholder">No testimonials yet.</li>';
    return;
  }

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  track.innerHTML = items.map((t) => `
    <li class="carousel-slide">
      <figure class="testimonial">
        <blockquote>&ldquo;${escapeHtml(t.quote)}&rdquo;</blockquote>
        <figcaption>
          <strong>${escapeHtml(t.name || '')}</strong>
          <span>${escapeHtml(t.location || '')}</span>
        </figcaption>
      </figure>
    </li>
  `).join('');

  const AUTO_MS = 5000;
  let index = 0;
  let perView = 1;
  let pageCount = 1;
  let timer = null;

  function getPerView() {
    const v = parseInt(getComputedStyle(carouselEl).getPropertyValue('--per-view'), 10);
    return Math.max(1, Math.min(v || 1, items.length));
  }

  function renderDots() {
    dotsWrap.innerHTML = Array.from({ length: pageCount }).map((_, i) => `
      <button class="carousel-dot" role="tab" aria-label="Go to slide ${i + 1}" data-index="${i}"></button>
    `).join('');
    dotsWrap.querySelectorAll('.carousel-dot').forEach((d) => {
      d.addEventListener('click', () => {
        go(parseInt(d.dataset.index, 10));
        start();
      });
    });
  }

  function go(to) {
    index = ((to % pageCount) + pageCount) % pageCount;
    track.style.transform = `translateX(-${(index * 100) / perView}%)`;
    dotsWrap.querySelectorAll('.carousel-dot').forEach((d, i) => {
      d.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });
  }

  function recalc() {
    const newPerView = getPerView();
    perView = newPerView;
    pageCount = Math.max(1, items.length - perView + 1);
    renderDots();
    if (index >= pageCount) index = pageCount - 1;
    go(index);
  }

  function start() {
    stop();
    if (pageCount > 1) timer = setInterval(() => go(index + 1), AUTO_MS);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  prevBtn.addEventListener('click', () => { go(index - 1); start(); });
  nextBtn.addEventListener('click', () => { go(index + 1); start(); });

  carouselEl.addEventListener('mouseenter', stop);
  carouselEl.addEventListener('mouseleave', start);

  // Touch swipe
  let touchStartX = null;
  carouselEl.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    stop();
  }, { passive: true });
  carouselEl.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    touchStartX = null;
    start();
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(recalc, 150);
  });

  recalc();
  start();
})();


// Products grid
(async function initProducts() {
  const list = document.getElementById("product-list");
  if (!list) return;

  const escapeHtml = (s) => String(s).replace(/[&<>"\x27]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  // uncomment to simulate loading of product or to show the skeleton loading
  // await new Promise(r => setTimeout(r, 15000));

  let products = [];
  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error("Failed to load products");
    products = await res.json();
  } catch (err) {
    list.innerHTML = '<p class="product-placeholder">Could not load collection.</p>';
    console.error(err);
    return;
  }

  if (!Array.isArray(products) || products.length === 0) {
    list.innerHTML = '<p class="product-placeholder">No pieces yet.</p>';
    return;
  }

  const featured = products.filter((p) => p.featured);
  const toRender = featured.length > 0 ? featured : products;

  // Group by category, preserving first-seen order
  const groups = new Map();
  toRender.forEach((p) => {
    const cat = p.category || "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(p);
  });

  const cardHtml = (p) => `
    <article class="product-card">
      <div class="product-media">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />
      </div>
      <div class="product-body">
        <h4 class="product-name">${escapeHtml(p.name)}</h4>
        <p class="product-size">${escapeHtml(p.size || "")}</p>
        <div class="product-links">
          ${p.lazada ? `<a class="product-link" href="${escapeHtml(p.lazada)}" target="_blank" rel="noopener">Lazada</a>` : ""}
          ${p.shopee ? `<a class="product-link" href="${escapeHtml(p.shopee)}" target="_blank" rel="noopener">Shopee</a>` : ""}
        </div>
      </div>
    </article>
  `;

  list.innerHTML = Array.from(groups, ([category, items]) => `
    <div class="product-group">
      <h3 class="category-heading">${escapeHtml(category)}</h3>
      <div class="product-grid">
        ${items.map(cardHtml).join("")}
      </div>
    </div>
  `).join("");
})();
