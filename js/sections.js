/* Section behaviours, ported from the Dinova Shopify theme. */
/* ===== about ===== */
  /* Respect reduced motion: keep videos paused on their first frame. */
  if (!customElements.get('mk-about')) {
    customElements.define(
      'mk-about',
      class MkAbout extends HTMLElement {
        connectedCallback() {
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          this.querySelectorAll('video').forEach((video) => {
            video.removeAttribute('autoplay');
            video.pause();
          });
        }
      }
    );
  }

/* ===== category-grid ===== */
  /* Touch screens: activate the tile crossing the middle of the screen, one at a time. */
  if (!customElements.get('mk-category-grid')) {
    customElements.define(
      'mk-category-grid',
      class MkCategoryGrid extends HTMLElement {
        connectedCallback() {
          this.touch = window.matchMedia('(hover: none)');
          this.tiles = [...this.querySelectorAll('.mk-cgrid__tile')];
          this.observer = new IntersectionObserver((entries) => this.onIntersect(entries), {
            rootMargin: '-50% 0px -50% 0px',
          });
          this.tiles.forEach((tile) => this.observer.observe(tile));
        }

        disconnectedCallback() {
          this.observer?.disconnect();
        }

        onIntersect(entries) {
          if (!this.touch.matches) return;
          const hit = entries.find((entry) => entry.isIntersecting);
          if (!hit) return;
          this.tiles.forEach((tile) => tile.classList.toggle('is-active', tile === hit.target));
        }
      }
    );
  }

/* ===== collection-carousel ===== */
  if (!customElements.get('mk-collection-carousel')) {
    customElements.define(
      'mk-collection-carousel',
      class MkCollectionCarousel extends HTMLElement {
        connectedCallback() {
          this.track = this.querySelector('[data-track]');
          this.arrows = [...this.querySelectorAll('.mk-ccar__arrow')];
          this.arrows.forEach((arrow) =>
            arrow.addEventListener('click', () => this.go(Number(arrow.dataset.direction)))
          );
          this.update = () => this.updateArrows();
          this.track.addEventListener('scroll', this.update, { passive: true });
          this.resizeObserver = new ResizeObserver(this.update);
          this.resizeObserver.observe(this.track);
          this.update();
        }

        disconnectedCallback() {
          this.resizeObserver?.disconnect();
        }

        go(direction) {
          const card = this.track.querySelector('.mk-ccar__item');
          if (!card) return;
          const gap = parseFloat(getComputedStyle(this.track).columnGap) || 0;
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          this.track.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: reduce ? 'auto' : 'smooth' });
        }

        updateArrows() {
          const { scrollLeft, scrollWidth, clientWidth } = this.track;
          /* Progress bar: the dark part is the share of cards in view. */
          const max = Math.max(scrollWidth - clientWidth, 0);
          const size = scrollWidth ? clientWidth / scrollWidth : 1;
          const progress = max ? scrollLeft / max : 0;
          this.style.setProperty('--mk-ccar-thumb', String(Math.min(size, 1)));
          this.style.setProperty('--mk-ccar-progress', String(progress));
          const [prev, next] = this.arrows;
          if (!prev || !next) return;
          prev.disabled = scrollLeft <= 1;
          next.disabled = scrollLeft + clientWidth >= scrollWidth - 1;
          this.querySelector('.mk-ccar__controls').hidden = scrollWidth <= clientWidth + 1;
        }
      }
    );
  }

/* ===== collection-switcher ===== */
  if (!customElements.get('mk-collection-switcher')) {
    customElements.define(
      'mk-collection-switcher',
      class MkCollectionSwitcher extends HTMLElement {
        connectedCallback() {
          this.tabs = [...this.querySelectorAll('.mk-switcher__name')];
          const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

          this.tabs.forEach((tab) => {
            tab.addEventListener('click', () => this.select(Number(tab.dataset.index)));
            if (this.dataset.hover === 'true' && canHover) {
              tab.addEventListener('mouseenter', () => this.select(Number(tab.dataset.index)));
            }
            tab.addEventListener('keydown', (event) => this.onKeydown(event));
          });

          /* Theme editor: show the category whose block is selected */
          document.addEventListener('shopify:block:select', (event) => {
            const tab = this.tabs.find((t) => t === event.target || t.contains(event.target));
            if (tab) this.select(Number(tab.dataset.index));
          });
        }

        onKeydown(event) {
          const current = this.tabs.indexOf(event.currentTarget);
          let next = null;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % this.tabs.length;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + this.tabs.length) % this.tabs.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = this.tabs.length - 1;
          if (next === null) return;
          event.preventDefault();
          this.select(next);
          this.tabs[next].focus();
        }

        select(index) {
          this.tabs.forEach((tab, i) => {
            tab.classList.toggle('is-active', i === index);
            tab.setAttribute('aria-selected', String(i === index));
            tab.tabIndex = i === index ? 0 : -1;
          });

          this.querySelectorAll('.mk-switcher__text, .mk-switcher__link').forEach((el) => {
            const active = Number(el.dataset.index) === index;
            el.classList.toggle('is-active', active);
            el.hidden = !active;
          });

          this.querySelectorAll('.mk-switcher__image').forEach((el) => {
            el.classList.toggle('is-active', Number(el.dataset.index) === index);
          });
        }
      }
    );
  }

/* ===== collections-hero ===== */
  if (!customElements.get('mk-collections-hero')) {
    customElements.define(
      'mk-collections-hero',
      class MkCollectionsHero extends HTMLElement {
        connectedCallback() {
          this.track = this.querySelector('[data-track]');
          this.arrows = [...this.querySelectorAll('.mk-chero__arrow')];
          this.arrows.forEach((arrow) =>
            arrow.addEventListener('click', () => this.go(Number(arrow.dataset.direction)))
          );
          this.slides = [...this.track.querySelectorAll('.mk-chero__slide')];
          this.update = () => {
            this.updateArrows();
            this.updateActive();
          };
          this.track.addEventListener('scroll', this.update, { passive: true });
          this.resizeObserver = new ResizeObserver(this.update);
          this.resizeObserver.observe(this.track);
          this.update();
          this.dataset.ready = '';

          /* Theme editor: scroll to the selected slide */
          document.addEventListener('shopify:block:select', (event) => {
            if (this.contains(event.target)) event.target.scrollIntoView({ block: 'nearest', inline: 'start' });
          });
        }

        disconnectedCallback() {
          this.resizeObserver?.disconnect();
        }

        go(direction) {
          const slide = this.track.querySelector('.mk-chero__slide');
          if (!slide) return;
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          this.track.scrollBy({ left: direction * slide.offsetWidth, behavior: reduce ? 'auto' : 'smooth' });
        }

        /* Only the slide in front shows its name and button; the others wait. */
        updateActive() {
          const { scrollLeft, scrollWidth, clientWidth } = this.track;
          const width = this.slides[0]?.offsetWidth;
          if (!width) return;
          const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;
          const index = atEnd ? this.slides.length - 1 : Math.round(scrollLeft / width);
          this.slides.forEach((slide, i) => {
            const active = i === index;
            slide.classList.toggle('is-active', active);
            slide.querySelector('.mk-chero__content')?.toggleAttribute('inert', !active);
          });
        }

        updateArrows() {
          const { scrollLeft, scrollWidth, clientWidth } = this.track;
          const [prev, next] = this.arrows;
          if (!prev || !next) return;
          prev.disabled = scrollLeft <= 1;
          next.disabled = scrollLeft + clientWidth >= scrollWidth - 1;
          this.querySelector('.mk-chero__arrows').hidden = scrollWidth <= clientWidth + 1;
        }
      }
    );
  }

/* ===== journal-hero ===== */
  if (!customElements.get('mk-journal-hero')) {
    customElements.define(
      'mk-journal-hero',
      class MkJournalHero extends HTMLElement {
        connectedCallback() {
          const media = this.querySelector('[data-video-id]');
          const button = this.querySelector('.mk-jhero__play');
          if (!media || !button) return;
          button.addEventListener('click', () => {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube-nocookie.com/embed/${media.dataset.videoId}?autoplay=1&rel=0&playsinline=1`;
            iframe.title = button.getAttribute('aria-label');
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.className = 'mk-jhero__iframe';
            media.append(iframe);
            media.classList.add('is-playing');
            iframe.focus();
          });
        }
      }
    );
  }

/* ===== marquee ===== */
  if (!customElements.get('mk-marquee')) {
    customElements.define(
      'mk-marquee',
      class MkMarquee extends HTMLElement {
        connectedCallback() {
          this.track = this.querySelector('.mk-marquee__track');
          if (!this.track) return;
          this.observer = new ResizeObserver(() => this.fill());
          this.observer.observe(this);
          this.observer.observe(this.track.firstElementChild);
          this.fill();
        }

        disconnectedCallback() {
          this.observer?.disconnect();
        }

        /* Clone the phrase group until the row is always covered, then size the loop to one group. */
        fill() {
          const groups = this.track.querySelectorAll('.mk-marquee__group');
          const first = groups[0];
          const groupWidth = first.getBoundingClientRect().width;
          if (!groupWidth) return;

          const needed = Math.ceil(this.clientWidth / groupWidth) + 1;
          for (let i = groups.length; i < needed; i++) {
            const clone = first.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.inert = true;
                  this.track.append(clone);
          }

          const speed = Number(this.dataset.speed) || 40;
          this.style.setProperty('--mk-marquee-distance', `${groupWidth}px`);
          this.style.setProperty('--mk-marquee-duration', `${groupWidth / speed}s`);
        }
      }
    );
  }

/* ===== product-carousel ===== */
  if (!customElements.get('mk-product-carousel')) {
    customElements.define(
      'mk-product-carousel',
      class MkProductCarousel extends HTMLElement {
        connectedCallback() {
          this.track = this.querySelector('[data-track]');
          this.arrows = [...this.querySelectorAll('.mk-carousel__arrow')];
          this.arrows.forEach((arrow) =>
            arrow.addEventListener('click', () => this.scrollByCard(Number(arrow.dataset.direction)))
          );
          this.update = () => this.updateArrows();
          this.track.addEventListener('scroll', this.update, { passive: true });
          this.resizeObserver = new ResizeObserver(this.update);
          this.resizeObserver.observe(this.track);
          this.update();
        }

        disconnectedCallback() {
          this.resizeObserver?.disconnect();
        }

        scrollByCard(direction) {
          const item = this.track.querySelector('.mk-carousel__item');
          if (!item) return;
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          this.track.scrollBy({ left: direction * item.offsetWidth, behavior: reduce ? 'auto' : 'smooth' });
        }

        updateArrows() {
          const { scrollLeft, scrollWidth, clientWidth } = this.track;
          const overflowing = scrollWidth > clientWidth + 1;
          const [prev, next] = this.arrows;
          if (!prev || !next) return;
          prev.hidden = !overflowing || scrollLeft <= 1;
          next.hidden = !overflowing || scrollLeft + clientWidth >= scrollWidth - 1;
        }
      }
    );
  }

/* ===== split-media ===== */
  /* Respect reduced motion: pause background videos on their first frame. */
  if (!customElements.get('mk-split-media')) {
    customElements.define(
      'mk-split-media',
      class MkSplitMedia extends HTMLElement {
        connectedCallback() {
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          this.querySelectorAll('video').forEach((video) => {
            video.removeAttribute('autoplay');
            video.pause();
          });
        }
      }
    );
  }

/* ===== stone-cuts ===== */
  if (!customElements.get('mk-stone-cuts')) {
    customElements.define(
      'mk-stone-cuts',
      class MkStoneCuts extends HTMLElement {
        connectedCallback() {
          this.slides = [...this.querySelectorAll('.mk-cuts__slide')];
          this.bigNames = [...this.querySelectorAll('.mk-cuts__big-name')];
          this.names = this.bigNames.map((el) => el.textContent.trim());
          this.index = 0;
          if (this.slides.length < 2) return;

          this.querySelectorAll('.mk-cuts__nav').forEach((button) => {
            button.addEventListener('click', () => this.go(this.index + Number(button.dataset.direction)));
          });

          this.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') this.go(this.index - 1);
            if (event.key === 'ArrowRight') this.go(this.index + 1);
          });

          /* Swipe on touch screens */
          const stage = this.querySelector('.mk-cuts__stage');
          let startX = null;
          stage.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
          stage.addEventListener(
            'touchend',
            (e) => {
              if (startX === null) return;
              const dx = e.changedTouches[0].clientX - startX;
              if (Math.abs(dx) > 40) this.go(this.index + (dx < 0 ? 1 : -1));
              startX = null;
            },
            { passive: true }
          );

          /* Theme editor: jump to the selected cut */
          document.addEventListener('shopify:block:select', (event) => {
            const i = this.slides.indexOf(event.target);
            if (i !== -1) this.go(i);
          });
        }

        go(target) {
          const count = this.slides.length;
          const next = (target + count) % count;
          if (next === this.index) return;
          this.index = next;

          [this.slides, this.bigNames].forEach((list) =>
            list.forEach((el, i) => el.classList.toggle('is-active', i === next))
          );
          this.slides.forEach((el, i) => el.setAttribute('aria-hidden', String(i !== next)));

          const prevLabel = this.querySelector('.mk-cuts__nav--prev .mk-cuts__nav-label');
          const nextLabel = this.querySelector('.mk-cuts__nav--next .mk-cuts__nav-label');
          prevLabel.textContent = this.names[(next - 1 + count) % count];
          nextLabel.textContent = this.names[(next + 1) % count];

          const live = this.querySelector('[data-live]');
          if (live) live.textContent = this.names[next];
        }
      }
    );
  }

/* ===== video-blog ===== */
  if (!customElements.get('mk-video-blog')) {
    customElements.define(
      'mk-video-blog',
      class MkVideoBlog extends HTMLElement {
        connectedCallback() {
          this.track = this.querySelector('[data-track]');
          this.arrows = [...this.querySelectorAll('.mk-vblog__arrow')];
          this.arrows.forEach((arrow) =>
            arrow.addEventListener('click', () => this.scrollByCard(Number(arrow.dataset.direction)))
          );
          this.update = () => this.updateArrows();
          this.track.addEventListener('scroll', this.update, { passive: true });
          this.resizeObserver = new ResizeObserver(this.update);
          this.resizeObserver.observe(this.track);
          this.update();

          /* YouTube has no maxres thumbnail for some videos and returns a 120px stand-in. */
          this.querySelectorAll('img[data-fallback]').forEach((img) => {
            const check = () => {
              if (img.naturalWidth && img.naturalWidth <= 120) img.src = img.dataset.fallback;
            };
            img.complete ? check() : img.addEventListener('load', check, { once: true });
            img.addEventListener('error', () => (img.src = img.dataset.fallback), { once: true });
          });

          this.querySelectorAll('.mk-vblog__play').forEach((button) =>
            button.addEventListener('click', () => this.play(button.closest('[data-video-id]')))
          );
        }

        disconnectedCallback() {
          this.resizeObserver?.disconnect();
        }

        /* Swap the thumbnail for the YouTube player, and stop any other playing video. */
        play(media) {
          this.querySelectorAll('.mk-vblog__media.is-playing').forEach((other) => {
            if (other === media) return;
            other.querySelector('iframe')?.remove();
            other.classList.remove('is-playing');
          });
          if (media.classList.contains('is-playing')) return;
          const iframe = document.createElement('iframe');
          iframe.src = `https://www.youtube-nocookie.com/embed/${media.dataset.videoId}?autoplay=1&rel=0&playsinline=1`;
          iframe.title = media.querySelector('.mk-vblog__play')?.getAttribute('aria-label') || 'YouTube video';
          iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
          iframe.allowFullscreen = true;
          iframe.className = 'mk-vblog__iframe';
          media.append(iframe);
          media.classList.add('is-playing');
          iframe.focus();
        }

        scrollByCard(direction) {
          const item = this.track.querySelector('.mk-vblog__item');
          if (!item) return;
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const gap = parseFloat(getComputedStyle(this.track).columnGap) || 0;
          this.track.scrollBy({ left: direction * (item.offsetWidth + gap), behavior: reduce ? 'auto' : 'smooth' });
        }

        updateArrows() {
          const { scrollLeft, scrollWidth, clientWidth } = this.track;
          const overflowing = scrollWidth > clientWidth + 1;
          const [prev, next] = this.arrows;
          if (!prev || !next) return;
          prev.hidden = !overflowing || scrollLeft <= 1;
          next.hidden = !overflowing || scrollLeft + clientWidth >= scrollWidth - 1;
        }
      }
    );
  }

/* ===== popup ===== */
  if (!customElements.get('mk-popup')) {
    const STORAGE_KEY = 'mk-popup';
    const DAY = 24 * 60 * 60 * 1000;

    const readState = () => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      } catch (error) {
        return {};
      }
    };

    const writeState = (state) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        /* Storage blocked: the popup simply shows again next visit. */
      }
    };

    class MkPopup extends HTMLElement {
      connectedCallback() {
        this.dialog = this.querySelector('dialog');
        if (!this.dialog) return;

        this.onClick = (event) => {
          if (event.target.closest('[data-popup-close]')) this.close();
        };
        this.onCancel = (event) => {
          event.preventDefault();
          this.close();
        };
        this.dialog.addEventListener('click', this.onClick);
        this.dialog.addEventListener('cancel', this.onCancel);

        if (window.Shopify && window.Shopify.designMode) {
          this.setupEditor();
          return;
        }

        const posted = window.location.hash === `#${this.dataset.formId}`;
        if (this.querySelector('[data-popup-success]')) {
          writeState({ subscribed: true });
          if (posted) this.open();
          return;
        }
        if (posted && this.querySelector('[data-popup-error]')) {
          this.open();
          return;
        }

        if (this.dataset.auto !== 'true') return;
        const state = readState();
        if (state.subscribed) return;
        const days = Number(this.dataset.days) || 0;
        if (state.closedAt && Date.now() - state.closedAt < days * DAY) return;

        this.timer = setTimeout(() => this.open(), (Number(this.dataset.delay) || 0) * 1000);
      }

      disconnectedCallback() {
        clearTimeout(this.timer);
        clearTimeout(this.closeTimer);
        if (this.onSelect) {
          document.removeEventListener('shopify:section:select', this.onSelect);
          document.removeEventListener('shopify:section:deselect', this.onDeselect);
        }
      }

      /* In the theme editor: open while the section is selected, and stay
         open when a setting change re-renders it. */
      setupEditor() {
        const key = `mk-popup-editing-${this.dataset.sectionId}`;
        this.onSelect = (event) => {
          if (event.detail.sectionId !== this.dataset.sectionId) return;
          sessionStorage.setItem(key, '1');
          this.open();
        };
        this.onDeselect = (event) => {
          if (event.detail.sectionId !== this.dataset.sectionId) return;
          sessionStorage.removeItem(key);
          this.close({ remember: false });
        };
        document.addEventListener('shopify:section:select', this.onSelect);
        document.addEventListener('shopify:section:deselect', this.onDeselect);
        if (sessionStorage.getItem(key)) this.open({ instant: true });
      }

      open({ instant = false } = {}) {
        if (this.dialog.open) return;
        this.previousFocus = document.activeElement;
        this.dialog.showModal();
        if (instant) {
          this.dialog.classList.add('is-visible');
        } else {
          requestAnimationFrame(() => requestAnimationFrame(() => this.dialog.classList.add('is-visible')));
        }
      }

      close({ remember = true } = {}) {
        if (!this.dialog.open) return;
        if (remember && !(window.Shopify && window.Shopify.designMode)) {
          const state = readState();
          if (!state.subscribed) writeState({ closedAt: Date.now() });
        }
        if (window.location.hash === `#${this.dataset.formId}`) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        this.dialog.classList.remove('is-visible');
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.closeTimer = setTimeout(() => {
          this.dialog.close();
          if (this.previousFocus && this.previousFocus.focus) this.previousFocus.focus();
        }, reduced ? 200 : 600);
      }
    }

    customElements.define('mk-popup', MkPopup);
  }
