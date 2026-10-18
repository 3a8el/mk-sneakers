/*
 * Checkout: cash on delivery only. The order is kept in this browser
 * (localStorage "mk-orders") and the visitor goes to order.html. When a
 * backend exists, POST the same order object to it instead.
 */
(() => {
  const { esc, money, settings, cart } = window.MK;
  const root = document.querySelector('[data-checkout]');
  if (!root) return;

  /* Delivery fee per governorate, in LE. Free over settings.free_shipping_over. */
  const GOVERNORATES = [
    ['Cairo', 60], ['Giza', 60], ['Alexandria', 75], ['Qalyubia', 70], ['Sharqia', 80], ['Dakahlia', 80],
    ['Gharbia', 80], ['Monufia', 80], ['Beheira', 80], ['Kafr El Sheikh', 85], ['Damietta', 85], ['Port Said', 85],
    ['Ismailia', 85], ['Suez', 85], ['Faiyum', 85], ['Beni Suef', 90], ['Minya', 95], ['Asyut', 100],
    ['Sohag', 100], ['Qena', 110], ['Luxor', 110], ['Aswan', 120], ['Red Sea', 120], ['Matrouh', 120],
    ['North Sinai', 130], ['South Sinai', 130], ['New Valley', 130],
  ];

  const form = root.querySelector('[data-checkout-form]');
  const select = form.querySelector('[data-governorates]');
  const summary = root.querySelector('[data-summary]');
  const formError = form.querySelector('[data-form-error]');

  select.innerHTML =
    '<option value="">Choose your governorate</option>' +
    GOVERNORATES.map(([name]) => `<option value="${esc(name)}">${esc(name)}</option>`).join('');

  const shippingFor = (subtotal) => {
    const free = settings.free_shipping_over || 0;
    if (free && subtotal >= free) return 0;
    const found = GOVERNORATES.find(([name]) => name === select.value);
    return found ? found[1] : null;
  };

  const linesHtml = (lines) =>
    `<ul class="mk-summary__items" role="list">${lines
      .map(
        (l) => `<li class="mk-summary__item">
          <div class="mk-summary__thumb"><img src="${esc(l.image)}" alt="" width="200" height="200"><span class="mk-summary__qty">${l.qty}</span></div>
          <div><p class="mk-summary__name">${esc(l.name)}</p><p class="mk-summary__meta">${esc(l.meta)}</p></div>
          <span>${money(l.total)}</span>
        </li>`
      )
      .join('')}</ul>`;

  const totalsHtml = ({ subtotal, shipping, total }) => `<div class="mk-summary__rows">
      <div><span>Subtotal</span><span>${money(subtotal)}</span></div>
      <div><span>Delivery</span><span>${shipping === null ? 'Choose a governorate' : shipping === 0 ? 'Free' : money(shipping)}</span></div>
      <div class="mk-summary__total"><span>Total</span><span>${money(total)}</span></div>
      <div><span>Payment</span><span>Cash on delivery</span></div>
    </div>`;

  const flatten = (lines) =>
    lines.map((l) => ({
      id: l.id,
      qty: l.qty,
      total: l.total,
      image: l.product.images[0],
      name: `${l.product.brand} ${l.product.model}`,
      meta: `${l.product.color} / EU ${l.variant.size}`,
    }));

  const render = () => {
    const { lines, subtotal } = cart.get();
    if (!lines.length) {
      root.innerHTML = `<section class="mk-message" style="grid-column: 1 / -1">
        <p class="mk-message__eyebrow">Checkout</p>
        <h1 class="mk-message__title">Your bag is empty</h1>
        <p class="mk-message__text">Add a pair or two, then come back here to order. You pay cash when it arrives.</p>
        <a class="mk-button" href="shop.html">Shop all</a>
      </section>`;
      return;
    }
    const shipping = shippingFor(subtotal);
    summary.innerHTML = `<h2 class="mk-fieldset__title visually-hidden">Order summary</h2>${linesHtml(flatten(lines))}${totalsHtml({
      subtotal,
      shipping,
      total: subtotal + (shipping || 0),
    })}`;
  };

  select.addEventListener('change', render);
  document.addEventListener('mk:cart', render);

  const markInvalid = (field) => field.setAttribute('aria-invalid', String(!field.checkValidity()));
  form.addEventListener('input', (event) => {
    if (event.target.hasAttribute('aria-invalid')) markInvalid(event.target);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const fields = [...form.querySelectorAll('input, select, textarea')].filter((f) => f.name && f.type !== 'radio');
    fields.forEach((f) => (f.value = f.value.trim()));
    fields.forEach(markInvalid);
    const invalid = fields.find((f) => !f.checkValidity());
    if (invalid) {
      formError.textContent =
        invalid.name === 'phone' ? 'Enter an Egyptian mobile number, for example 010 1234 5678.' : 'Fill in the highlighted fields to place your order.';
      formError.hidden = false;
      invalid.focus();
      return;
    }
    formError.hidden = true;

    const { lines, subtotal } = cart.get();
    const shipping = shippingFor(subtotal) || 0;
    const data = Object.fromEntries(new FormData(form));
    const order = {
      number: `MK-${String(Date.now()).slice(-6)}`,
      created_at: new Date().toISOString(),
      customer: data,
      lines: flatten(lines),
      subtotal,
      shipping,
      total: subtotal + shipping,
      payment: 'Cash on delivery',
    };
    try {
      const orders = JSON.parse(localStorage.getItem('mk-orders') || '[]');
      orders.push(order);
      localStorage.setItem('mk-orders', JSON.stringify(orders.slice(-20)));
      sessionStorage.setItem('mk-last-order', JSON.stringify(order));
    } catch (error) {}
    cart.clear();
    window.location.href = `order.html?n=${encodeURIComponent(order.number)}`;
  });

  render();
})();
