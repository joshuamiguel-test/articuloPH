import { initBackToTop } from '../../js/back-to-top.js';
import { initMobileNav } from '../../js/mobile-nav.js';
import { initCartBadge } from '../../js/cart.js';
import { initOrder } from './order.js';

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

initBackToTop();
initMobileNav();
initCartBadge();
initOrder();
