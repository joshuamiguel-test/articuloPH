import { escapeHtml } from './utils.js';

export async function initProducts() {
  const list = document.getElementById('product-list');
  if (!list) return;

  // uncomment to simulate loading of product or to show the skeleton loading
  // await new Promise(r => setTimeout(r, 15000));

  let products = [];
  try {
    const res = await fetch('products.json');
    if (!res.ok) throw new Error('Failed to load products');
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
    const cat = p.category || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(p);
  });

  const cardHtml = (p) => `
    <article class="product-card">
      <div class="product-media">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />
        ${p.description ? `<div class="product-desc-overlay" aria-hidden="true"><p>${escapeHtml(p.description)}</p></div>` : ''}
      </div>
      <div class="product-body">
        <h4 class="product-name">${escapeHtml(p.name)}</h4>
        <p class="product-size">${escapeHtml(p.size || '')}</p>
        ${p.description ? `<p class="product-desc-text">${escapeHtml(p.description)}</p>` : ''}
        <div class="product-links">
          ${p.lazada ? `<a class="product-link" href="${escapeHtml(p.lazada)}" target="_blank" rel="noopener">Lazada</a>` : ''}
          ${p.shopee ? `<a class="product-link" href="${escapeHtml(p.shopee)}" target="_blank" rel="noopener">Shopee</a>` : ''}
        </div>
      </div>
    </article>
  `;

  list.innerHTML = Array.from(groups, ([category, items]) => `
    <div class="product-group">
      <h3 class="category-heading">${escapeHtml(category)}</h3>
      <div class="product-grid">
        ${items.map(cardHtml).join('')}
      </div>
    </div>
  `).join('');

  const cards = list.querySelectorAll('.product-card');
  cards.forEach((card, i) => {
    card.classList.add('fade-up');
    card.style.transitionDelay = `${i * 60}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  cards.forEach((card) => observer.observe(card));
}
