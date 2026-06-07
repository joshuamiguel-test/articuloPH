import { API_URL } from '../../js/config.js';
import { escapeHtml, formatPeso } from '../../js/utils.js';
import { getCart, setQty, removeItem, clearCart, cartTotal } from '../../js/cart.js';

export function initOrder() {
  const summary = document.getElementById('order-summary');
  const form = document.getElementById('order-form');
  const confirmation = document.getElementById('order-confirmation');
  if (!summary || !form) return;

  const checkoutGrid = form.closest('.checkout-grid');
  const cartHeading = document.getElementById('cart-heading');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Enable "Place order" only when name, email, phone and address are all
  // filled in and valid (form has type=email + required fields).
  function syncSubmitState() {
    submitBtn.disabled = !form.checkValidity();
  }
  form.addEventListener('input', syncSubmitState);

  function renderSummary() {
    const cart = getCart();

    if (cart.length === 0) {
      summary.innerHTML = `
        <div class="cart-empty-state">
          <p class="cart-empty">Your cart is empty.</p>
          <a href="../catalog/" class="btn btn-primary">Browse the shop</a>
        </div>`;
      form.hidden = true;
      if (cartHeading) cartHeading.hidden = true;
      checkoutGrid.classList.add('cart-is-empty');
      return;
    }

    if (cartHeading) cartHeading.hidden = false;
    checkoutGrid.classList.remove('cart-is-empty');
    form.hidden = false;
    syncSubmitState();
    summary.innerHTML = `
      <ul class="cart-lines">
        ${cart.map(lineHtml).join('')}
      </ul>
      <div class="cart-total-row">
        <span>Total</span>
        <span class="cart-total">${formatPeso(cartTotal())}</span>
      </div>`;

    summary.querySelectorAll('.cart-line').forEach((row) => {
      const id = row.dataset.productId;
      const item = cart.find((i) => String(i.product_id) === id);
      if (!item) return;

      row.querySelectorAll('.qty-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          setQty(item.product_id, item.quantity + Number(btn.dataset.step));
          renderSummary();
        });
      });
      const input = row.querySelector('.qty-input');
      if (input) {
        input.addEventListener('change', () => {
          setQty(item.product_id, Math.floor(Number(input.value) || 1));
          renderSummary();
        });
      }
      const remove = row.querySelector('.cart-remove');
      if (remove) {
        remove.addEventListener('click', () => {
          removeItem(item.product_id);
          renderSummary();
        });
      }
    });
  }

  function lineHtml(i) {
    return `
      <li class="cart-line" data-product-id="${escapeHtml(i.product_id)}">
        <div class="cart-line-media">
          ${i.image_url ? `<img src="${escapeHtml(i.image_url)}" alt="${escapeHtml(i.product_name)}" loading="lazy" />` : ''}
        </div>
        <div class="cart-line-info">
          <p class="cart-line-name">${escapeHtml(i.product_name)}</p>
          <p class="cart-line-price muted">${formatPeso(i.unit_price)} each</p>
        </div>
        <div class="qty-stepper">
          <button type="button" class="qty-btn" data-step="-1" aria-label="Decrease quantity">−</button>
          <input class="qty-input" type="number" min="1" value="${i.quantity}" aria-label="Quantity" />
          <button type="button" class="qty-btn" data-step="1" aria-label="Increase quantity">+</button>
        </div>
        <div class="cart-line-total">${formatPeso(i.unit_price * i.quantity)}</div>
        <button type="button" class="cart-remove" aria-label="Remove item">&times;</button>
      </li>`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cart = getCart();
    if (cart.length === 0) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const errorBox = document.getElementById('order-error');
    if (errorBox) errorBox.hidden = true;

    const order = {
      action: 'createOrder',
      customer_name: form.customer_name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      total: cartTotal(),
      items: cart.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    };

    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = 'Placing order…';

    try {
      // NOTE: no Content-Type header — this keeps the request "simple" and
      // avoids a CORS preflight that Google Apps Script cannot answer.
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(order),
      });
      const data = await res.json();
      if (!res.ok || !data.order_id) {
        throw new Error(data.error || 'Order could not be placed');
      }

      clearCart();
      if (checkoutGrid) checkoutGrid.hidden = true;
      const intro = document.getElementById('checkout-intro');
      if (intro) intro.hidden = true;
      if (confirmation) {
        confirmation.hidden = false;
        confirmation.querySelector('.order-id').textContent = data.order_id;
        confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (err) {
      console.error(err);
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent =
          'Sorry, we could not place your order. Please check your details and try again.';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  renderSummary();
}
