/**
 * Шапка: знак, навигация, язык, кнопка действия.
 *
 * Сайт многостраничный, поэтому навигация ведёт на страницы, а не
 * на якоря. Текущая страница отмечается aria-current — и для
 * читалки, и для подчёркивания: один атрибут вместо класса плюс
 * атрибута.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useI18n } from '../lib/i18n.jsx';
import { Button } from './ui/Button.jsx';
import { cn } from '../lib/cn.js';
import { SPRING_SNAP } from './ui/Reveal.jsx';

const LINKS = [
  { href: '/bots/', key: 'nav.bots', fallback: 'Боти' },
  { href: '/websites/', key: 'nav.websites', fallback: 'Сайти' },
  { href: '/backend/', key: 'nav.backend', fallback: 'Бекенд' },
  { href: '/#cases', key: 'nav.cases', fallback: 'Кейси' },
  { href: '/#faq', key: 'nav.faq', fallback: 'Питання' }
];

export function Header({ path = '/' }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(null);
  const burger = useRef(null);
  const menu = useRef(null);

  /* Открытое меню ведёт себя как открытое меню: Escape закрывает,
     фокус возвращается на кнопку. Иначе он остаётся на невидимом
     пункте, и следующий Tab уводит в никуда. */
  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      if (burger.current) burger.current.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const label = link => t(link.key) === link.key ? link.fallback : t(link.key);
  const current = href => (href.startsWith('/#') ? path === '/' && false : path === href);

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_SNAP}
      className="sticky top-0 z-100 flex items-center gap-6 border-b border-rule-soft
                 bg-void/70 px-5 py-3 backdrop-blur-xl backdrop-saturate-150 sm:px-8 lg:px-[88px]"
    >
      <a href="/" className="inline-flex items-baseline gap-0.5 font-display text-[1.05rem] font-extrabold tracking-[-0.03em]">
        v<span aria-hidden="true" className="inline-block size-[0.26em] bg-acid" />studio
      </a>

      <nav
        aria-label="Основна навігація"
        onMouseLeave={() => setHover(null)}
        className="ml-auto hidden gap-6 text-[0.88rem] text-muted lg:flex"
      >
        {LINKS.map(link => {
          const here = current(link.href);
          const lit = hover ? hover === link.href : here;
          return (
            <a
              key={link.href}
              href={link.href}
              onMouseEnter={() => setHover(link.href)}
              aria-current={here ? 'page' : undefined}
              className={cn('relative py-1 transition-colors hover:text-paper', here && 'text-paper')}
            >
              {label(link)}
              {/* Одна и та же полоска переезжает между пунктами:
                  layoutId говорит Motion, что это тот же элемент, и
                  он сам считает путь. Двух полосок на экране не
                  бывает, поэтому и мигания нет. */}
              {lit && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute inset-x-0 -bottom-px h-px bg-acid"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </a>
          );
        })}
      </nav>

      <div className={cn('flex items-center gap-3', 'ml-auto lg:ml-0')}>
        <div role="group" aria-label="Мова / Language" className="flex rounded-full border border-rule-soft bg-glass p-0.5">
          {['uk', 'en'].map(code => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={cn(
                'min-w-[34px] rounded-full px-2.5 py-[5px] text-[0.72rem] font-semibold tracking-[0.06em] transition-colors',
                lang === code ? 'bg-glass-2 text-paper' : 'text-faint hover:text-paper'
              )}
            >
              {code === 'uk' ? 'UA' : 'EN'}
            </button>
          ))}
        </div>

        <Button as="a" href="/#contact" variant="solid" size="sm" className="hidden lg:inline-flex">
          {t('nav.order')}
        </Button>

        <button
          ref={burger}
          type="button"
          aria-label="Меню"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="grid size-10 place-items-center rounded-md border border-rule lg:hidden"
        >
          <span className={cn('block h-[1.5px] w-[17px] bg-paper transition-transform duration-300',
            open && 'translate-y-[3.25px] rotate-45')} />
          <span className={cn('mt-[5px] block h-[1.5px] w-[17px] bg-paper transition-transform duration-300',
            open && '-translate-y-[3.25px] -rotate-45')} />
        </button>
      </div>

      <motion.div
        ref={menu}
        id="mobileMenu"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[62px] z-99 flex flex-col bg-void/95 px-5 py-12
                   font-display text-[1.7rem] font-semibold tracking-[-0.03em] backdrop-blur-2xl sm:px-8 lg:hidden"
      >
        {LINKS.concat({ href: '/#contact', key: 'nav.contact', fallback: 'Контакти' }).map(link => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}
             className="border-b border-rule-soft py-3">
            {label(link)}
          </a>
        ))}
      </motion.div>
    </motion.header>
  );
}

export default Header;
