/* Order confirmation: shows the order checkout.js saved in this browser. */
(() => {
  const { esc, money } = window.MK;
  const root = document.querySelector('[data-order]');
  if (!root) return;

  const number = new URLSearchParams(window.location.search).get('n');
  let order = null;
  try {
    const orders = JSON.parse(localStorage.getItem('mk-orders') || '[]');
    order = orders.find((o) => o.number === number) || JSON.parse(sessionStorage.getItem('mk-last-order') || 'null');
  } catch (error) {}

  const summary = root.querySelector('[data-order-summary]');
  if (!order) {
    root.querySelector('[data-order-number]').textContent = 'Order';
    summary.closest('.mk-order').hidden = true;
    return;
  }

  const c = order.customer;
  root.querySelector('[data-order-number]').textContent = `Order ${order.number}`;
  root.querySelector('[data-order-text]').textContent = `Thanks, ${c.first_name}. We will call or WhatsApp you on ${c.phone} to confirm your order before it ships. Have ${money(order.total)} ready in cash for the courier.`;

  summary.innerHTML = `<ul class="mk-summary__items" role="list">${order.lines
    .map(
      (l) => `<li class="mk-summary__item">
        <div class="mk-summary__thumb"><img src="${esc(l.image)}" alt="" width="200" height="200"><span class="mk-summary__qty">${l.qty}</span></div>
        <div><p class="mk-summary__name">${esc(l.name)}</p><p class="mk-summary__meta">${esc(l.meta)}</p></div>
        <span>${money(l.total)}</span>
      </li>`
    )
    .join('')}</ul>
    <div class="mk-summary__rows">
      <div><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
      <div><span>Delivery</span><span>${order.shipping ? money(order.shipping) : 'Free'}</span></div>
      <div class="mk-summary__total"><span>Total</span><span>${money(order.total)}</span></div>
      <div><span>Payment</span><span>${esc(order.payment)}</span></div>
      <div><span>Deliver to</span><span>${esc([c.address, c.city, c.governorate].filter(Boolean).join(', '))}</span></div>
    </div>`;
})();
