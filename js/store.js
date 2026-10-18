/*
 * Shared storefront code: catalog lookups, the cart (kept in localStorage),
 * product cards, and the header's menu, search and cart drawers.
 *
 * The catalog comes from js/catalog.js for now. When the Laravel API exists,
 * swap MK.catalog for a fetch() of /api/products and keep the rest.
 */
(() => {
  const catalog = window.MK_CATALOG || { products: [], brands: [], styles: [], collections: [] };
  const settings = catalog.settings || {};
  const CART_KEY = 'mk-cart';

  const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const money = (amount) => `LE ${Number(amount || 0).toLocaleString('en-US')}`;

  const productUrl = (p) => `product.html?p=${encodeURIComponent(p.slug)}`;
  const collectionUrl = (slug) => `shop.html?c=${encodeURIComponent(slug)}`;

  const findProduct = (slug) => catalog.products.find((p) => p.slug === slug);
  const findVariant = (id) => {
    for (const p of catalog.products) {
      const v = p.variants.find((x) => x.id === Number(id));
      if (v) return { product: p, variant: v };
    }
    return null;
  };

  const groups = () => [
    ...catalog.collections.map((c) => ({ ...c, kind: 'collection' })),
    ...catalog.brands.map((c) => ({ ...c, kind: 'brand' })),
    ...catalog.styles.map((c) => ({ ...c, kind: 'style' })),
  ];
  const findGroup = (slug) => groups().find((g) => g.slug === slug);
  const productsIn = (slug) => {
    if (!slug || slug === 'all') return catalog.products;
    return catalog.products.filter((p) => p.collections.includes(slug) || p.style === slug);
  };

  const priceHtml = (p) => {
    const sale = p.compare_at_price && p.compare_at_price > p.price;
    return `<span class="mk-price${sale ? ' mk-price--sale' : ''}">${
      sale ? `<s class="mk-price__compare">${money(p.compare_at_price)}</s>` : ''
    }<span class="mk-price__current">${money(p.price)}</span></span>`;
  };

  /* ---------- Cart ---------- */

  const read = () => {
    try {
      const items = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(items) ? items : [];
    } catch (error) {
      return [];
    }
  };

  const write = (items) => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (error) {
      /* Storage blocked: the cart lasts for this page only. */
    }
    memory = items;
    document.dispatchEvent(new CustomEvent('mk:cart', { detail: cart.get() }));
  };

  let memory = read();

  const cart = {
    /* Lines with their product and variant looked up; unknown ids are dropped. */
    get() {
      const lines = memory
        .map((line) => {
          const found = findVariant(line.id);
          return found ? { ...line, ...found, total: found.product.price * line.qty } : null;
        })
        .filter(Boolean);
      const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
      const count = lines.reduce((sum, l) => sum + l.qty, 0);
      return { lines, subtotal, count };
    },
    add(id, qty = 1) {
      const items = [...memory];
      const line = items.find((l) => l.id === Number(id));
      if (line) line.qty = Math.min(line.qty + qty, 10);
      else items.push({ id: Number(id), qty: Math.min(qty, 10) });
      write(items);
    },
    set(id, qty) {
      const items = memory.map((l) => (l.id === Number(id) ? { ...l, qty: Math.max(0, Math.min(qty, 10)) } : l)).filter((l) => l.qty > 0);
      write(items);
    },
    clear() {
      write([]);
    },
  };

  window.addEventListener('storage', (event) => {
    if (event.key !== CART_KEY) return;
    memory = read();
    document.dispatchEvent(new CustomEvent('mk:cart', { detail: cart.get() }));
  });

  /* ---------- Product card ---------- */

  const card = (p, { sizes = true } = {}) => {
    const sale = p.compare_at_price && p.compare_at_price > p.price;
    const soldOut = !p.variants.some((v) => v.available);
    const badge = soldOut
      ? '<span class="mk-card__badge">Sold out</span>'
      : sale
        ? `<span class="mk-card__badge mk-card__badge--sale">-${Math.round((1 - p.price / p.compare_at_price) * 100)}%</span>`
        : p.collections.includes('new-in')
          ? '<span class="mk-card__badge">New</span>'
          : '';
    const sizeList = sizes
      ? `<ul class="mk-card__sizes" role="list">${p.variants
          .map(
            (v) =>
              `<li><button type="button" class="mk-card__size" data-add-variant="${v.id}"${v.available ? '' : ' disabled'} aria-label="Add size ${esc(v.size)} to cart">${esc(v.size)}</button></li>`
          )
          .join('')}</ul>`
      : '';
    return `<article class="mk-card">
      <div class="mk-card__media">
        ${badge}
        <img class="mk-card__img" src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy" width="1000" height="1000">
        ${p.images[1] ? `<img class="mk-card__img mk-card__img--hover" src="${esc(p.images[1])}" alt="" loading="lazy" width="1000" height="1000">` : ''}
        ${sizeList}
      </div>
      <p class="mk-card__brand">${esc(p.brand)}</p>
      <h3 class="mk-card__title"><a href="${productUrl(p)}">${esc(p.model)} <span class="visually-hidden">${esc(p.color)}</span></a></h3>
      <p class="mk-card__price">${priceHtml(p)}</p>
    </article>`;
  };

  /* ---------- Toast ---------- */

  let toastTimer;
  const toast = (text) => {
    let el = document.querySelector('.mk-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'mk-toast';
      el.setAttribute('role', 'status');
      document.body.append(el);
    }
    el.textContent = text;
    requestAnimationFrame(() => el.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
  };

  /* ---------- Drawers ---------- */

  let lastFocus = null;
  const openDrawer = (el) => {
    if (!el) return;
    lastFocus = document.activeElement;
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => el.classList.add('is-open'));
    document.body.classList.add('is-locked');
    setTimeout(() => el.querySelector('[data-autofocus], button, a, input')?.focus(), 50);
  };

  const closeDrawer = (el) => {
    if (!el || !el.classList.contains('is-open')) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    lastFocus?.focus?.();
  };

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      event.preventDefault();
      const target = document.getElementById(opener.dataset.open);
      if (target?.classList.contains('mk-search')) openSearch();
      else openDrawer(target);
      return;
    }
    const closer = event.target.closest('[data-close]');
    if (closer) {
      const el = closer.closest('.mk-drawer, .mk-search');
      if (el?.classList.contains('mk-search')) closeSearch();
      else closeDrawer(el);
      return;
    }
    const quick = event.target.closest('[data-add-variant]');
    if (quick) {
      event.preventDefault();
      cart.add(quick.dataset.addVariant, 1);
      openDrawer(document.getElementById('cart-drawer'));
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.mk-drawer.is-open').forEach(closeDrawer);
    closeSearch();
  });

  /* ---------- Cart drawer ---------- */

  const minus = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h10" stroke="currentColor" stroke-width="1.2"/></svg>';
  const plus = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6h10M6 1v10" stroke="currentColor" stroke-width="1.2"/></svg>';

  const shippingBar = (subtotal) => {
    const free = settings.free_shipping_over || 0;
    if (!free) return '';
    const left = free - subtotal;
    const ratio = Math.min(subtotal / free, 1);
    return `<div class="mk-shipping-bar">
      <span>${left > 0 ? `You're ${money(left)} away from free shipping` : 'Your order ships free'}</span>
      <div class="mk-shipping-bar__track"><div class="mk-shipping-bar__fill" style="transform: scaleX(${ratio})"></div></div>
    </div>`;
  };

  const renderCart = () => {
    const { lines, subtotal, count } = cart.get();
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
    });
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    drawer.querySelector('[data-cart-title]').textContent = count ? `Your bag (${count})` : 'Your bag';
    const body = drawer.querySelector('.mk-drawer__body');
    const foot = drawer.querySelector('.mk-cart__foot');
    if (!lines.length) {
      body.innerHTML = `<div class="mk-cart__empty"><p>Your bag is empty</p><a class="mk-button" href="shop.html">Shop all</a></div>`;
      foot.hidden = true;
      return;
    }
    body.innerHTML =
      shippingBar(subtotal) +
      `<ul class="mk-cart__items" role="list">${lines
        .map(
          (l) => `<li class="mk-cart-item">
            <a class="mk-cart-item__image" href="${productUrl(l.product)}"><img src="${esc(l.product.images[0])}" alt="" width="200" height="200"></a>
            <div>
              <p class="mk-cart-item__name"><a href="${productUrl(l.product)}">${esc(l.product.brand)} ${esc(l.product.model)}</a></p>
              <p class="mk-cart-item__meta">${esc(l.product.color)} / EU ${esc(l.variant.size)}</p>
              <div class="mk-qty">
                <button type="button" data-qty="${l.id}" data-step="-1" aria-label="Decrease quantity">${minus}</button>
                <span aria-label="Quantity">${l.qty}</span>
                <button type="button" data-qty="${l.id}" data-step="1" aria-label="Increase quantity">${plus}</button>
              </div>
            </div>
            <div>
              <p class="mk-cart-item__price">${money(l.total)}</p>
              <button type="button" class="mk-cart-item__remove mk-underline" data-remove="${l.id}">Remove</button>
            </div>
          </li>`
        )
        .join('')}</ul>`;
    foot.hidden = false;
    foot.querySelector('[data-cart-subtotal]').textContent = money(subtotal);
  };

  document.addEventListener('click', (event) => {
    const step = event.target.closest('[data-qty]');
    if (step) {
      const line = cart.get().lines.find((l) => l.id === Number(step.dataset.qty));
      if (line) cart.set(line.id, line.qty + Number(step.dataset.step));
      return;
    }
    const remove = event.target.closest('[data-remove]');
    if (remove) cart.set(remove.dataset.remove, 0);
  });

  document.addEventListener('mk:cart', renderCart);

  /* ---------- Search ---------- */

  const search = () => document.getElementById('search');

  function openSearch() {
    const el = search();
    if (!el) return;
    lastFocus = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    setTimeout(() => el.querySelector('input')?.focus(), 80);
  }

  function closeSearch() {
    const el = search();
    if (!el?.classList.contains('is-open')) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    lastFocus?.focus?.();
  }

  const matches = (p, q) =>
    `${p.brand} ${p.model} ${p.color} ${p.style} ${p.material}`.toLowerCase().includes(q);

  const renderSearch = (value) => {
    const el = search();
    const out = el?.querySelector('.mk-search__results');
    if (!out) return;
    const q = value.trim().toLowerCase();
    const list = q ? catalog.products.filter((p) => q.split(/\s+/).every((word) => matches(p, word))) : catalog.products.slice(0, 6);
    if (!list.length) {
      out.innerHTML = `<p class="mk-search__empty">No pairs match "${esc(value)}". Try a brand or a model name.</p>`;
      return;
    }
    out.innerHTML = `<p class="mk-search__empty">${q ? `${list.length} result${list.length === 1 ? '' : 's'}` : 'Popular right now'}</p>
      <ul class="mk-search__grid" role="list">${list
        .slice(0, 12)
        .map(
          (p) => `<li class="mk-search__item"><a href="${productUrl(p)}"><img src="${esc(p.images[0])}" alt="" loading="lazy"><span>${esc(p.brand)} ${esc(p.model)}</span><span>${money(p.price)}</span></a></li>`
        )
        .join('')}</ul>`;
  };

  /* ---------- Header: hide on scroll down, show on scroll up ---------- */

  const header = document.querySelector('.mk-header');
  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      if (!header) return;
      const y = window.scrollY;
      const down = y > lastY && y > 200;
      header.classList.toggle('is-hidden', down && !document.body.classList.contains('is-locked'));
      lastY = y;
    },
    { passive: true }
  );

  document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    const input = search()?.querySelector('input');
    if (input) {
      renderSearch('');
      input.addEventListener('input', () => renderSearch(input.value));
      input.form?.addEventListener('submit', (event) => {
        event.preventDefault();
        window.location.href = `shop.html?q=${encodeURIComponent(input.value)}`;
      });
    }
    /* Newsletter and popup forms: no backend yet, so just thank the visitor. */
    document.querySelectorAll('form[data-form="customer"]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = form.querySelector('input[type="email"]');
        if (email && !email.checkValidity()) {
          email.setAttribute('aria-invalid', 'true');
          email.reportValidity();
          return;
        }
        try {
          localStorage.setItem('mk-popup', JSON.stringify({ subscribed: true }));
        } catch (error) {}
        const success = form.closest('[data-success-text]')?.dataset.successText || 'Thank you for subscribing.';
        form.innerHTML = `<p class="mk-form-success" role="status">${esc(success)}</p>`;
      });
    });
    /* Contact form: no backend yet, so confirm and clear it. */
    document.querySelectorAll('form[data-form="contact"]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        form.innerHTML = '<p class="mk-form-success" role="status">Thanks for your message. We will get back to you within one working day.</p>';
      });
    });
  });

  window.MK = {
    catalog,
    settings,
    esc,
    money,
    productUrl,
    collectionUrl,
    findProduct,
    findGroup,
    productsIn,
    priceHtml,
    card,
    cart,
    toast,
    openDrawer,
    closeDrawer,
  };
})();
