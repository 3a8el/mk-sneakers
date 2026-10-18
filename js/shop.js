/*
 * Shop page: one page for every listing. ?c=<collection, brand or style>
 * picks the products, ?q= searches them, and the filters (brand, size, style,
 * price, sort) are kept in the URL so a filtered view can be shared.
 */
(() => {
  const { catalog, esc, money, findGroup, productsIn, card } = window.MK;
  const page = document.querySelector('[data-shop]');
  if (!page) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('c') || 'all';
  const query = (params.get('q') || '').trim();
  const group = findGroup(slug);

  const SORTS = [
    ['featured', 'Featured'],
    ['newest', 'Newest'],
    ['price-asc', 'Price, low to high'],
    ['price-desc', 'Price, high to low'],
    ['name', 'Alphabetically, A to Z'],
  ];

  /* ---------- Heading ---------- */

  const title = query ? `Results for "${query}"` : group ? group.title : 'Shop all';
  const heading = document.querySelector('.mk-ctitle__heading');
  if (heading) heading.textContent = title;
  if (group?.description && heading) {
    heading.insertAdjacentHTML('afterend', `<div class="mk-ctitle__text"><p>${esc(group.description)}</p></div>`);
  }
  document.title = `${title} | MK Sneakers`;

  /* ---------- Base list: collection, then search ---------- */

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const base = productsIn(slug).filter((p) =>
    words.every((w) => `${p.brand} ${p.model} ${p.color} ${p.style} ${p.material}`.toLowerCase().includes(w))
  );

  const brands = catalog.brands.filter((b) => base.some((p) => p.brand_slug === b.slug));
  const styles = catalog.styles.filter((s) => base.some((p) => p.style === s.slug));
  const sizes = [...new Set(base.flatMap((p) => p.variants.map((v) => v.size)))].sort((a, b) => a - b);
  const prices = base.map((p) => p.price);
  const floor = prices.length ? Math.floor(Math.min(...prices) / 100) * 100 : 0;
  const ceil = prices.length ? Math.ceil(Math.max(...prices) / 100) * 100 : 0;

  /* ---------- State, read from and written to the URL ---------- */

  const list = (key) => (params.get(key) || '').split(',').filter(Boolean);
  const state = {
    brand: list('brand'),
    size: list('size'),
    style: list('style'),
    min: params.get('min') || '',
    max: params.get('max') || '',
    sort: params.get('sort') || 'featured',
  };

  const syncUrl = () => {
    const next = new URLSearchParams();
    if (slug !== 'all') next.set('c', slug);
    if (query) next.set('q', query);
    ['brand', 'size', 'style'].forEach((k) => state[k].length && next.set(k, state[k].join(',')));
    if (state.min) next.set('min', state.min);
    if (state.max) next.set('max', state.max);
    if (state.sort !== 'featured') next.set('sort', state.sort);
    const qs = next.toString();
    history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  };

  /* ---------- Facets (rendered twice: sidebar and mobile drawer) ---------- */

  const count = (test) => base.filter(test).length;
  const check = (name, value, label, n, type = 'checkbox') =>
    `<li><label class="mk-check"><input type="${type}" name="${name}" value="${esc(value)}"><span>${esc(label)}</span>${
      n === undefined ? '' : `<span class="mk-check__count">${n}</span>`
    }</label></li>`;
  const facet = (label, body, open = true) =>
    `<details class="mk-facet"${open ? ' open' : ''}><summary>${label}</summary>${body}</details>`;

  const facetsHtml = () =>
    [
      brands.length > 1 &&
        facet('Brand', `<ul class="mk-facet__options" role="list">${brands.map((b) => check('brand', b.slug, b.title, count((p) => p.brand_slug === b.slug))).join('')}</ul>`),
      sizes.length &&
        facet(
          'Size (EU)',
          `<ul class="mk-facet__options mk-facet__options--sizes" role="list">${sizes
            .map((s) => `<li><label class="mk-size-chip"><input type="checkbox" name="size" value="${s}"><span>${s}</span></label></li>`)
            .join('')}</ul>`
        ),
      styles.length > 1 &&
        facet('Style', `<ul class="mk-facet__options" role="list">${styles.map((s) => check('style', s.slug, s.title, count((p) => p.style === s.slug))).join('')}</ul>`),
      prices.length &&
        facet(
          'Price',
          `<div class="mk-facet__options"><div class="mk-price-range">
            <label><span class="visually-hidden">Minimum price</span><input type="number" name="min" min="0" step="100" inputmode="numeric" placeholder="LE ${floor.toLocaleString('en-US')}"></label>
            <label><span class="visually-hidden">Maximum price</span><input type="number" name="max" min="0" step="100" inputmode="numeric" placeholder="LE ${ceil.toLocaleString('en-US')}"></label>
          </div></div>`,
          false
        ),
      facet('Sort by', `<ul class="mk-facet__options" role="list">${SORTS.map(([v, l]) => check('sort', v, l, undefined, 'radio')).join('')}</ul>`, false),
    ]
      .filter(Boolean)
      .join('');

  const forms = [...page.ownerDocument.querySelectorAll('[data-facets]')];
  forms.forEach((form) => {
    form.innerHTML = facetsHtml();
    form.addEventListener('submit', (e) => e.preventDefault());
    form.addEventListener('change', () => readForm(form));
    form.addEventListener('input', (e) => {
      if (e.target.type === 'number') readForm(form);
    });
  });

  const fillForms = () => {
    forms.forEach((form) => {
      form.querySelectorAll('input').forEach((input) => {
        if (input.type === 'checkbox') input.checked = state[input.name].includes(input.value);
        else if (input.type === 'radio') input.checked = state.sort === input.value;
        else if (document.activeElement !== input) input.value = state[input.name];
      });
    });
  };

  function readForm(form) {
    const data = new FormData(form);
    state.brand = data.getAll('brand');
    state.size = data.getAll('size');
    state.style = data.getAll('style');
    state.min = data.get('min') || '';
    state.max = data.get('max') || '';
    state.sort = data.get('sort') || 'featured';
    update();
  }

  /* ---------- Filtering and sorting ---------- */

  const filtered = () => {
    const min = Number(state.min) || 0;
    const max = Number(state.max) || Infinity;
    const out = base.filter(
      (p) =>
        (!state.brand.length || state.brand.includes(p.brand_slug)) &&
        (!state.style.length || state.style.includes(p.style)) &&
        (!state.size.length || p.variants.some((v) => v.available && state.size.includes(String(v.size)))) &&
        p.price >= min &&
        p.price <= max
    );
    const sorters = {
      newest: (a, b) => b.created - a.created,
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      name: (a, b) => a.title.localeCompare(b.title),
    };
    return sorters[state.sort] ? [...out].sort(sorters[state.sort]) : out;
  };

  const grid = page.querySelector('[data-grid]');
  const counter = page.querySelector('[data-count]');
  const active = page.querySelector('[data-active]');
  const showCount = document.querySelector('[data-show-count]');

  const pills = () => {
    const out = [];
    state.brand.forEach((v) => out.push(['brand', v, catalog.brands.find((b) => b.slug === v)?.title || v]));
    state.size.forEach((v) => out.push(['size', v, `EU ${v}`]));
    state.style.forEach((v) => out.push(['style', v, catalog.styles.find((s) => s.slug === v)?.title || v]));
    if (state.min) out.push(['min', state.min, `From ${money(state.min)}`]);
    if (state.max) out.push(['max', state.max, `Up to ${money(state.max)}`]);
    if (!out.length) return '';
    return (
      out
        .map(
          ([k, v, label]) =>
            `<button type="button" class="mk-pill" data-pill="${k}" data-value="${esc(v)}" aria-label="Remove filter ${esc(label)}">${esc(label)}<span aria-hidden="true">&times;</span></button>`
        )
        .join('') + '<button type="button" class="mk-facets__clear mk-underline" data-clear>Clear all</button>'
    );
  };

  function update() {
    const items = filtered();
    const n = `${items.length} ${items.length === 1 ? 'pair' : 'pairs'}`;
    counter.textContent = n;
    if (showCount) showCount.textContent = `Show ${n}`;
    grid.innerHTML = items.length
      ? items.map((p) => `<li>${card(p)}</li>`).join('')
      : `<li class="mk-shop__empty" style="grid-column: 1 / -1; border: 0"><p>No pairs match</p><button type="button" class="mk-button" data-clear>Clear filters</button></li>`;
    active.innerHTML = pills();
    fillForms();
    syncUrl();
  }

  document.addEventListener('click', (event) => {
    const pill = event.target.closest('[data-pill]');
    if (pill) {
      const { pill: key, value } = pill.dataset;
      if (Array.isArray(state[key])) state[key] = state[key].filter((v) => v !== value);
      else state[key] = '';
      update();
      return;
    }
    if (event.target.closest('[data-clear]')) {
      Object.assign(state, { brand: [], size: [], style: [], min: '', max: '' });
      update();
    }
  });

  /* ---------- Grid size ---------- */

  const views = page.querySelectorAll('[data-view]:not([data-grid])');
  const setView = (n) => {
    grid.dataset.view = n;
    views.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === n)));
    try {
      localStorage.setItem('mk-view', n);
    } catch (error) {}
  };
  views.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  try {
    const saved = localStorage.getItem('mk-view');
    if (saved === '2' || saved === '3') setView(saved);
    else if (window.matchMedia('(min-width: 990px)').matches) setView('3');
  } catch (error) {}

  update();
})();
