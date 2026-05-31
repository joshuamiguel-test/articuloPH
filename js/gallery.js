import { escapeHtml } from './utils.js';

function getColCount() {
  const w = window.innerWidth;
  if (w <= 600) return 2;
  if (w <= 900) return 3;
  return 4;
}

export async function initGallery() {
  const wall = document.getElementById('masonry');
  if (!wall) return;

  let images = [];
  try {
    const res = await fetch('data/review-images.json');
    if (!res.ok) throw new Error('Failed to load review images');
    images = await res.json();
  } catch (err) {
    console.error(err);
    return;
  }

  if (!Array.isArray(images) || images.length === 0) return;

  // Varied aspect ratios (width / height) cycled by index so similar-sized
  // source photos render at different heights — the key to a real masonry feel.
  // Length 7 vs. column counts of 2/3/4 means columns don't end up with
  // identical patterns.
  const aspectPattern = [3 / 4, 1, 4 / 5, 3 / 2, 2 / 3, 5 / 4, 4 / 5];
  const sized = images.map((img, i) => ({ img, aspect: aspectPattern[i % aspectPattern.length] }));

  const render = () => {
    const colCount = getColCount();
    const cols = Array.from({ length: colCount }, () => ({ items: [], height: 0 }));
    sized.forEach((it) => {
      const target = cols.reduce((min, c) => (c.height < min.height ? c : min));
      target.items.push(it);
      target.height += 1 / it.aspect;
    });

    wall.innerHTML = cols.map(col => `
      <div class="masonry-col">
        ${col.items.map(({ img, aspect }) => `
          <figure class="masonry-item" style="--aspect: ${aspect};">
            <img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt || '')}" loading="lazy" />
          </figure>
        `).join('')}
      </div>
    `).join('');

    const items = wall.querySelectorAll('.masonry-item');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    items.forEach((el, i) => {
      el.style.transitionDelay = `${(i % colCount) * 80}ms`;
      observer.observe(el);
    });
  };

  render();

  let currentCols = getColCount();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const next = getColCount();
      if (next !== currentCols) {
        currentCols = next;
        render();
      }
    }, 150);
  });
}
