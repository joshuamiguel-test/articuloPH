import { API_URL } from '../../js/config.js';
import { escapeHtml, formatPeso } from '../../js/utils.js';
import { addItem } from '../../js/cart.js';

export async function initCatalog() {
  const list = document.getElementById('catalog-list');
  if (!list) return;

  let products = [];
  try {
    const res = await fetch(`${API_URL}?action=getProducts`);
    if (!res.ok) throw new Error('Failed to load products');
    const data = await res.json();
    products = data.products || [];
  } catch (err) {
    list.innerHTML = '<p class="product-placeholder">Could not load the shop. Please try again later.</p>';
    console.error(err);
    return;
  }

  if (!Array.isArray(products) || products.length === 0) {
    list.innerHTML = '<p class="product-placeholder">No products available yet.</p>';
    return;
  }

  const cardHtml = (p) => {
    const price = Number(p.price) || 0;
    return `
    <article class="product-card catalog-card" data-product-id="${escapeHtml(p.product_id)}">
      <div class="product-media">
        <img src="${escapeHtml(p.image_url || '')}" alt="${escapeHtml(p.name)}" loading="lazy" />
      </div>
      <div class="product-body">
        <h4 class="product-name">${escapeHtml(p.name)}</h4>
        ${p.description ? `<p class="product-desc-text">${escapeHtml(p.description)}</p>` : ''}
        <p class="product-price">${formatPeso(price)}</p>
        <div class="catalog-actions">
          <div class="qty-stepper">
            <button type="button" class="qty-btn" data-step="-1" aria-label="Decrease quantity">−</button>
            <input class="qty-input" type="number" min="1" value="1" aria-label="Quantity" />
            <button type="button" class="qty-btn" data-step="1" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="btn btn-primary add-to-cart">Add to cart</button>
        </div>
      </div>
    </article>`;
  };

  // Group by category, preserving first-seen order (same as the homepage)
  const groups = new Map();
  products.forEach((p) => {
    const cat = p.category || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(p);
  });

  list.innerHTML = Array.from(groups, ([category, items]) => `
    <div class="product-group">
      <h3 class="category-heading">${escapeHtml(category)}</h3>
      <div class="product-grid">
        ${items.map(cardHtml).join('')}
      </div>
    </div>
  `).join('');

  // Wire up steppers + add-to-cart
  list.querySelectorAll('.catalog-card').forEach((card) => {
    const id = card.dataset.productId;
    const product = products.find((p) => String(p.product_id) === id);
    if (!product) return;

    const input = card.querySelector('.qty-input');

    card.querySelectorAll('.qty-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = Number(btn.dataset.step);
        input.value = Math.max(1, (Number(input.value) || 1) + step);
      });
    });

    if (input) {
      input.addEventListener('change', () => {
        input.value = Math.max(1, Math.floor(Number(input.value) || 1));
      });
    }

    const addBtn = card.querySelector('.add-to-cart');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const qty = Math.max(1, Number(input.value) || 1);
        addItem(
          {
            product_id: product.product_id,
            product_name: product.name,
            unit_price: Number(product.price) || 0,
            image_url: product.image_url || '',
          },
          qty
        );
        // Brief feedback
        const original = addBtn.textContent;
        addBtn.textContent = 'Added ✓';
        addBtn.classList.add('added');
        setTimeout(() => {
          addBtn.textContent = original;
          addBtn.classList.remove('added');
        }, 1200);
      });
    }
  });

  // Fade-in on scroll (same pattern as the homepage collection)
  const cards = list.querySelectorAll('.product-card');
  cards.forEach((card, i) => {
    card.classList.add('fade-up');
    card.style.transitionDelay = `${Math.min(i, 8) * 60}ms`;
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
