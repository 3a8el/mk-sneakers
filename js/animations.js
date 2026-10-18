/**
 * MK entrance animations (GSAP + ScrollTrigger + SplitText).
 * Loaded on every page. Visitors with reduced motion turned on see everything static.
 *
 * - Large serif text: lines slide up from behind a mask.
 * - Small text and buttons: fade up.
 * - Images and videos: unveil from the bottom while easing out of a slight zoom.
 */
(() => {
  const { gsap, ScrollTrigger, SplitText } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);

  const EASE = 'power3.out';
  const START = 'top 85%';

  /* Big Cormorant headings and decorative paragraphs. */
  const LINES = [
    '.mk-hero__title',
    '.mk-switcher__heading',
    '.mk-cuts__title',
    '.mk-split__text',
    '.mk-carousel__title',
    '.mk-about__text',
    '.mk-vblog__heading',
    '.mk-ahero__title',
    '.mk-notes__title',
    '.mk-values__title',
    '.mk-news__heading',
    '.mk-jhero__heading',
    '.mk-jhero__title',
    '.mk-jgrid__heading',
    '.mk-chero__heading',
    '.mk-ccar__heading',
    '.mk-spot__text',
    '.mk-contact__title',
    '.mk-ctitle__heading',
    '.mk-story__heading',
    '.mk-related__heading',
    '.mk-statement__title',
    '.mk-statement__lead',
    '.mk-journey__heading',
    '.mk-cta__title',
    '.mk-classic-story__title',
    '.mk-classic-story__subtitle',
  ];

  /* Smaller text, buttons and blocks that just fade up, staggered per section. */
  const FADES = [
    '.mk-switcher__texts',
    '.mk-switcher__names',
    '.mk-switcher__links',
    '.mk-split__content-image',
    '.mk-split__subtitle',
    '.mk-split__button',
    '.mk-carousel__footer',
    '.mk-about__button',
    '.mk-marquee__heading',
    '.mk-marquee__viewport',
    '.mk-vblog__text',
    '.mk-vblog__header > .mk-vblog__button',
    '.mk-cuts__caption',
    '.mk-ahero__subtitle',
    '.mk-ahero__text',
    '.mk-notes__text',
    '.mk-values__item',
    '.mk-news__form',
    '.mk-jhero__excerpt',
    '.mk-jhero__link',
    '.mk-jgrid__tags',
    '.mk-jgrid__body',
    '.mk-chero__text',
    '.mk-ccar__text',
    '.mk-footer__menu',
    '.mk-footer__contact',
    '.mk-contact__text',
    '.mk-contact__detail',
    '.mk-contact__form-wrap',
    '.mk-story__text',
    '.mk-values__subtitle',
    '.mk-statement__eyebrow',
    '.mk-statement__subtitle',
    '.mk-statement__text',
    '.mk-journey__eyebrow',
    '.mk-journey__step',
    '.mk-cta__subtitle',
    '.mk-cta__text',
    '.mk-cta__button',
    '.mk-classic-story__intro-text',
    '.mk-classic-story__text',
    '.mk-classic-values__item',
  ];

  /* Media frames that unveil; the image or video inside eases out of a zoom. */
  const MEDIA = [
    '.mk-contact__main',
    '.mk-story__media',
    '.mk-contact__detail-image',
    '.mk-switcher__media',
    '.mk-cuts__slides',
    '.mk-split__column',
    '.mk-carousel__image',
    '.mk-about__item',
    '.mk-vblog__media',
    '.mk-notes__image',
    '.mk-notes__small',
    '.mk-values__media',
    '.mk-news__frame',
    '.mk-jhero__media',
    '.mk-jgrid__media',
    '.mk-chero__slider',
    '.mk-ccar__media',
    '.mk-spot__card-media',
    '.mk-spot__photo',
    '.mk-cgrid__tile',
    '.mk-journey__frame',
    '.mk-cta__media',
    '.mk-classic-story__media',
    '.mk-classic-portrait__media',
  ];

  const sectionOf = (el) => el.closest('.mk-section') || el.parentElement;

  function lines(el) {
    if (!SplitText) return fade([el]);
    const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'mk-line' });
    gsap.from(split.lines, {
      yPercent: 110,
      duration: 1.1,
      ease: EASE,
      stagger: 0.09,
      scrollTrigger: { trigger: el, start: START, once: true },
      onComplete: () => split.revert(),
    });
  }

  function fade(els) {
    gsap.from(els, {
      autoAlpha: 0,
      y: 24,
      duration: 0.9,
      ease: EASE,
      stagger: 0.08,
      scrollTrigger: { trigger: els[0], start: START, once: true },
      clearProps: 'transform,opacity,visibility',
    });
  }

  function media(els) {
    els.forEach((el, i) => {
      const inner = el.querySelector('img, video, svg');
      const tl = gsap.timeline({
        delay: (i % 4) * 0.12,
        scrollTrigger: { trigger: el, start: START, once: true },
      });
      tl.fromTo(
        el,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power4.out', clearProps: 'clipPath' }
      );
      if (inner) {
        tl.fromTo(inner, { scale: 1.15 }, { scale: 1, duration: 1.6, ease: EASE, clearProps: 'transform' }, 0);
      }
    });
  }

  /* Headings marked data-mk-reveal: each letter shifts from white to the
     heading's own colour, scrubbed with the scroll. It starts when the heading
     column comes into view and finishes when a sticky heading reaches the
     bottom of its column, or at the end of the page if that comes first. */
  function reveal(el) {
    const color = getComputedStyle(el).color;
    const area = el.parentElement;
    const scrollerEl = () => scroller();
    const scrollPos = () => {
      const sc = scrollerEl();
      return sc === window ? window.scrollY : sc.scrollTop;
    };
    const viewport = () => {
      const sc = scrollerEl();
      return sc === window ? window.innerHeight : sc.clientHeight;
    };
    const maxScroll = () => ScrollTrigger.maxScroll(scrollerEl());
    const startPx = () => Math.max(0, area.getBoundingClientRect().top + scrollPos() - viewport() * 0.7);
    const endPx = () => {
      const stickTop = parseFloat(getComputedStyle(el).top) || 0;
      const natural = area.getBoundingClientRect().bottom + scrollPos() - stickTop - el.offsetHeight;
      return Math.max(startPx() + 1, Math.min(natural, maxScroll() - 2));
    };
    const targets = SplitText ? SplitText.create(el, { type: 'words,chars' }).chars : [el];
    gsap.fromTo(
      targets,
      { color: '#ffffff' },
      {
        color,
        ease: 'none',
        stagger: 0.1,
        immediateRender: true,
        scrollTrigger: { trigger: area, start: startPx, end: endPx, scrub: 0.6 },
      }
    );
  }

  /* Group matches by section so each section staggers on its own. */
  function bySection(selectors, root = document) {
    const groups = new Map();
    root.querySelectorAll(selectors.join(',')).forEach((el) => {
      const key = sectionOf(el);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el);
    });
    return [...groups.values()];
  }

  /* One gsap.matchMedia per section, so the theme editor can rebuild a single
     section when it is edited without touching the rest of the page. */
  const contexts = new Map();

  function init(root) {
    const mm = gsap.matchMedia(root);
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const lineEls = root.matches?.(LINES.join(',')) ? [root] : root.querySelectorAll(LINES.join(','));
      lineEls.forEach(lines);
      bySection(FADES, root).forEach(fade);
      bySection(MEDIA, root).forEach(media);
      const revealEls = root.matches?.('[data-mk-reveal]') ? [root] : root.querySelectorAll('[data-mk-reveal]');
      revealEls.forEach(reveal);
    });
    contexts.set(root, mm);
  }

  function teardown(root) {
    contexts.get(root)?.revert();
    contexts.delete(root);
  }

  const squeeze = window.matchMedia('(min-width: 990px)');
  const scroller = () => window;

  function start() {
    ScrollTrigger.defaults({ scroller: scroller() });
    init(document.body);

    squeeze.addEventListener('change', () => {
      [...contexts.keys()].forEach(teardown);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      ScrollTrigger.defaults({ scroller: scroller() });
      init(document.body);
      ScrollTrigger.refresh();
    });

    /* Images and fonts change the layout after load; re-measure trigger points.
       Lazy images load later too, so re-measure (debounced) whenever one lands. */
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    let refreshTimer;
    document.addEventListener(
      'load',
      (event) => {
        if (event.target.tagName !== 'IMG') return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
      },
      true
    );

  }

  const ready = () => (document.fonts?.ready || Promise.resolve()).then(start);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
})();
