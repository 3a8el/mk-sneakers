/*
 * Product page: product.html?p=<slug>. Fills the gallery, details, size picker
 * and accordion from the catalog, wires the sticky buy bar in the story
 * section, and lists related pairs from the same brand or style.
 */
(() => {
  const { catalog, esc, money, priceHtml, findProduct, findGroup, productUrl, collectionUrl, cart, openDrawer } = window.MK;
  const page = document.querySelector('[data-product-page]');
  if (!page) return;

  const slug = new URLSearchParams(window.location.search).get('p');
  const product = findProduct(slug) || (slug ? null : catalog.products[0]);

  if (!product) {
    const main = document.getElementById('main');
    main.innerHTML = `<section class="mk-message">
      <p class="mk-message__eyebrow">Not found</p>
      <h1 class="mk-message__title">This pair has gone</h1>
      <p class="mk-message__text">It may have sold out or moved. Have a look at what is in stock.</p>
      <a class="mk-button" href="shop.html">Shop all</a>
    </section>`;
    document.title = 'Product not found | MK Sneakers';
    return;
  }

  const $ = (sel, root = page) => root.querySelector(sel);
  const brand = findGroup(product.brand_slug);
  const style = findGroup(product.style);

  document.title = `${product.brand} ${product.model}, ${product.color} | MK Sneakers`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', product.description);

  /* ---------- Gallery: a swipe row on mobile, a stack on desktop ---------- */

  const slides = $('[data-slides]');
  const dots = $('[data-dots]');
  slides.innerHTML = product.images
    .map(
      (src, i) =>
        `<li class="mk-product__slide"><img src="${esc(src)}" alt="${i === 0 ? esc(product.title) : ''}" width="1000" height="1000"${i ? ' loading="lazy"' : ''}></li>`
    )
    .join('');
  dots.innerHTML = product.images
    .map((_, i) => `<button type="button" class="mk-product__dot" aria-label="Image ${i + 1}" aria-current="${i === 0}"></button>`)
    .join('');
  dots.addEventListener('click', (event) => {
    const dot = event.target.closest('.mk-product__dot');
    if (!dot) return;
    const i = [...dots.children].indexOf(dot);
    slides.scrollTo({ left: slides.children[i].offsetLeft, behavior: 'smooth' });
  });
  slides.addEventListener(
    'scroll',
    () => {
      const i = Math.round(slides.scrollLeft / (slides.clientWidth || 1));
      [...dots.children].forEach((d, n) => d.setAttribute('aria-current', String(n === i)));
    },
    { passive: true }
  );

  /* ---------- Details ---------- */

  $('[data-breadcrumb]').innerHTML = `<li><a href="index.html">Home</a></li>${
    brand ? `<li><a href="${collectionUrl(brand.slug)}">${esc(brand.title)}</a></li>` : ''
  }<li aria-current="page">${esc(product.model)}</li>`;
  $('[data-brand]').innerHTML = brand ? `<a href="${collectionUrl(brand.slug)}">${esc(product.brand)}</a>` : esc(product.brand);
  $('[data-title]').textContent = product.model;
  $('[data-color]').textContent = product.color;
  $('[data-price]').innerHTML = priceHtml(product);
  $('[data-description]').innerHTML = `<p>${esc(product.description)}</p>`;
  $('[data-specs]').innerHTML = [
    ['Brand', product.brand],
    ['Model', product.model],
    ['Colorway', product.color],
    ['Style', style?.title || product.style],
    ['Upper', product.material],
    ['Condition', 'New, in its original box'],
  ]
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('');

  /* ---------- Size and quantity ---------- */

  const form = $('[data-product-form]');
  const sizes = $('[data-sizes]');
  const chosen = $('[data-size-chosen]');
  const error = $('[data-error]');
  const qty = $('[data-qty]', form);
  const soldOut = !product.variants.some((v) => v.available);

  sizes.innerHTML = `<legend class="visually-hidden">Size</legend>${product.variants
    .map(
      (v) =>
        `<label><input type="radio" name="size" value="${v.id}"${v.available ? '' : ' disabled'}><span${
          v.available ? '' : ' title="Sold out"'
        }>${esc(v.size)}</span></label>`
    )
    .join('')}`;

  let variant = null;
  const bar = document.querySelector('.mk-buybar');

  const selectVariant = (id) => {
    variant = product.variants.find((v) => v.id === Number(id)) || null;
    chosen.textContent = variant ? `: ${variant.size}` : '';
    error.hidden = true;
    if (bar) {
      bar.querySelector('[data-variant-title]').textContent = variant ? `${product.color} / EU ${variant.size}` : product.color;
      bar.querySelector('[data-variant-id]').value = variant ? variant.id : '';
    }
  };

  sizes.addEventListener('change', (event) => selectVariant(event.target.value));

  const clampQty = (value) => Math.max(1, Math.min(10, Number(value) || 1));
  const stepper = (root, input) =>
    root.addEventListener('click', (event) => {
      const step = event.target.closest('[data-step]');
      if (!step || !root.contains(step)) return;
      input.value = clampQty(Number(input.value) + Number(step.dataset.step));
    });
  stepper(form, qty);
  qty.addEventListener('change', () => (qty.value = clampQty(qty.value)));

  const addButton = $('[data-add]', form);
  if (soldOut) {
    addButton.disabled = true;
    addButton.textContent = 'Sold out';
  }

  const add = (count) => {
    if (!variant) {
      error.hidden = false;
      sizes.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    cart.add(variant.id, count);
    openDrawer(document.getElementById('cart-drawer'));
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    add(clampQty(qty.value));
  });

  /* ---------- Size guide ---------- */

  const dialog = document.getElementById('size-guide');
  $('[data-size-guide]').addEventListener('click', () => dialog?.showModal());
  dialog?.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  if (window.location.hash === '#size-guide') dialog?.showModal();

  /* ---------- Sticky buy bar in the story section ---------- */

  if (bar) {
    bar.querySelector('.mk-buybar__img').src = product.images[0];
    bar.querySelector('.mk-buybar__title').textContent = `${product.brand} ${product.model}`;
    bar.querySelector('[data-price]').textContent = money(product.price);
    selectVariant(null);
    const barQty = bar.querySelector('[data-qty]');
    stepper(bar, barQty);
    barQty.addEventListener('change', () => (barQty.value = clampQty(barQty.value)));
    bar.querySelector('[data-choose]')?.addEventListener('click', () => sizes.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    const barAdd = bar.querySelector('[data-add]');
    if (soldOut) {
      barAdd.disabled = true;
      barAdd.querySelector('[data-add-label]').textContent = 'Sold out';
    }
    bar.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      add(clampQty(barQty.value));
    });
  }

  /* ---------- Related: same brand first, then same style ---------- */

  const related = document.querySelector('.mk-related');
  if (related) {
    const others = catalog.products.filter((p) => p.slug !== product.slug);
    const picks = [
      ...others.filter((p) => p.brand_slug === product.brand_slug),
      ...others.filter((p) => p.brand_slug !== product.brand_slug && p.style === product.style),
      ...others,
    ].filter((p, i, all) => all.indexOf(p) === i).slice(0, 4);
    related.innerHTML = `<h2 class="mk-related__heading">You may also like</h2>
      <ul class="mk-related__grid list-unstyled" role="list">${picks
        .map(
          (p) => `<li class="mk-related__item"><a class="mk-related__card" href="${productUrl(p)}">
            <div class="mk-related__media mk-related__media--hover">
              <img class="mk-related__img mk-related__img--primary" src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy" width="1000" height="1000">
              <img class="mk-related__img mk-related__img--hover" src="${esc(p.images[1])}" alt="" loading="lazy" width="1000" height="1000">
            </div>
            <div class="mk-related__meta"><span class="mk-related__title">${esc(p.brand)} ${esc(p.model)}</span><span class="mk-related__price">${money(p.price)}</span></div>
          </a></li>`
        )
        .join('')}</ul>`;
  }
})();
