import { escapeHtml } from './utils.js';

export async function initTestimonialCarousel() {
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
}
