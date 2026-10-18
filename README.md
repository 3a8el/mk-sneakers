# MK Sneakers

Frontend demo of the MK Sneakers store: plain HTML, CSS and vanilla JavaScript with GSAP animations, built from the Dinova design. No build step and no backend yet.

## View it

- **Locally:** open `index.html` in a browser, or run `python3 -m http.server` in this folder and go to http://localhost:8000.
- **Online:** turn on GitHub Pages (Settings > Pages > Deploy from branch `main`, folder `/`), or upload the folder to any static host. On Apache/Hostinger, `.htaccess` gives clean URLs (`/shop` instead of `/shop.html`).

## What is in it

| Page | File | Notes |
| --- | --- | --- |
| Home | `index.html` | Hero, carousels, brand switcher, style slider, about, marquee, newsletter popup |
| Shop | `shop.html` | All listings: `?c=` collection, brand or style slug, `?q=` search. Filters, sort, 2/3 grid |
| Product | `product.html?p=<slug>` | Gallery, sizes (sold-out sizes disabled), size guide, sticky buy bar, related pairs |
| Checkout | `checkout.html` | Cash on delivery only, delivery fee by governorate, free over LE 5,000 |
| Order | `order.html` | Confirmation of the order just placed |
| Collections, About, Contact, Exchange & refunds, Terms, 404 | `*.html` | Content pages |

The cart and demo orders live in the visitor's browser (localStorage). Nothing is sent anywhere yet.

## Editing

- **Products, brands, collections:** `js/catalog.js`. Each product has a slug, brand, model, color, price, optional `compare_at_price`, style, collections, images and one variant per size (`available: false` marks a sold-out size).
- **Images:** `assets/images/`. The sneakers are drawn placeholders; swap the paths in `js/catalog.js` and in the HTML for real photos.
- **Text and sections:** edit the HTML pages directly. Header, footer and drawers are repeated in every page.
- **Styles:** `css/base.css` (layout, header, shop, product, checkout) and `css/sections.css` (home and content sections).
- **Shared settings:** free-shipping threshold and WhatsApp number at the end of `js/catalog.js`; delivery fees in `js/checkout.js`.
- **Placeholders to replace:** WhatsApp number `201000000000`, phone, email and address in the footer and contact page.
