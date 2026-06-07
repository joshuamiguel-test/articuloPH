// ── Shared cart state ─────────────────────────────────────────────────────
// Backed by localStorage so the cart survives navigation between the catalog
// and order pages (and page reloads). One key, one array of line items.

const KEY = 'articulo_cart';
const listeners = new Set();

// Item shape: { product_id, product_name, unit_price, image_url, quantity }

export function getCart() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  listeners.forEach((fn) => fn(cart));
}

export function addItem(product, qty = 1) {
  const quantity = Math.max(1, Math.floor(qty) || 1);
  const cart = getCart();
  const existing = cart.find((i) => i.product_id === product.product_id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      product_id: product.product_id,
      product_name: product.product_name ?? product.name,
      unit_price: Number(product.unit_price ?? product.price) || 0,
      image_url: product.image_url || '',
      quantity,
    });
  }
  save(cart);
}

export function setQty(product_id, qty) {
  const quantity = Math.floor(qty);
  const cart = getCart();
  const item = cart.find((i) => i.product_id === product_id);
  if (!item) return;
  if (quantity <= 0) {
    removeItem(product_id);
    return;
  }
  item.quantity = quantity;
  save(cart);
}

export function removeItem(product_id) {
  save(getCart().filter((i) => i.product_id !== product_id));
}

export function clearCart() {
  save([]);
}

export function cartCount() {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}

export function cartTotal() {
  return getCart().reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
}

// Subscribe to cart changes (same-tab edits + cross-tab via storage event).
// Returns an unsubscribe function.
export function onCartChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

window.addEventListener('storage', (e) => {
  if (e.key === KEY) listeners.forEach((fn) => fn(getCart()));
});

// Keep the header cart badge (#cart-count) in sync with the cart.
export function initCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  const update = () => {
    const count = cartCount();
    badge.textContent = count;
    badge.hidden = count === 0;
  };
  update();
  onCartChange(update);
}
