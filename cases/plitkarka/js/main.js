/**
 * Пліткарка — перемикач «що в чашці».
 * Міняє знімок в арці, назву й підпис. Без залежностей і без збірки.
 */
(() => {
  'use strict';

  const MENU = window.MENU || [];
  if (!MENU.length) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const els = {
    arch: $('.arch-hero'),
    img: $('#heroImg'),
    name: $('#dishName'),
    sub: $('#dishSub'),
    rail: $('#rail')
  };

  let current = 0;
  let swapTimer = null;

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* --- мініатюри-арки --- */
  MENU.forEach((item, index) => {
    const li = document.createElement('li');

    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'pick';
    pick.setAttribute('role', 'tab');
    pick.setAttribute('aria-selected', String(index === 0));

    const img = document.createElement('img');
    img.src = item.photo;
    img.alt = '';
    img.width = 393;
    img.height = 460;
    img.loading = 'lazy';

    const name = document.createElement('span');
    name.className = 'pick-name';
    name.textContent = item.name;

    pick.append(img, name);
    pick.addEventListener('click', () => show(index));
    li.append(pick);
    els.rail.append(li);
  });

  const picks = $$('.pick', els.rail);

  function show(index) {
    if (index === current) return;
    const item = MENU[index];
    current = index;

    picks.forEach((pick, i) => pick.setAttribute('aria-selected', String(i === index)));

    const paint = () => {
      els.img.src = item.photo;
      els.img.alt = item.name;
      els.name.textContent = item.name;
      els.sub.textContent = item.sub;
    };

    if (reduceMotion) { paint(); return; }

    els.arch.classList.add('is-swapping');
    els.name.style.opacity = '0';
    els.sub.style.opacity = '0';

    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      paint();
      els.arch.classList.remove('is-swapping');
      els.name.style.opacity = '';
      els.sub.style.opacity = '';
    }, 260);
  }

  /* --- стрілками гортаємо --- */
  document.addEventListener('keydown', event => {
    if (event.target.matches('input, textarea')) return;
    if (event.key === 'ArrowRight') show((current + 1) % MENU.length);
    if (event.key === 'ArrowLeft') show((current - 1 + MENU.length) % MENU.length);
  });

  /* --- активний пункт навігації --- */
  const links = $$('.nav-link');
  const sections = links
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const navIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(section => navIO.observe(section));
})();
