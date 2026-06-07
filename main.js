import { initBackToTop } from './js/back-to-top.js';
import { initMobileNav } from './js/mobile-nav.js';
import { initTestimonialCarousel } from './js/testimonials.js';
import { initGallery } from './js/gallery.js';
import { initProducts } from './js/products.js';
import { initCartBadge } from './js/cart.js';

document.getElementById('year').textContent = new Date().getFullYear();

initBackToTop();
initMobileNav();
initCartBadge();
initTestimonialCarousel();
initGallery();
initProducts();
