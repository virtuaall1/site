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

  /* Пока меню открыто, страница под ним не ездит. Иначе палец
     листает фон сквозь панель, и, закрыв меню, человек оказывается
     не там, где был. */
  useEffect(() => {
    if (!open) return;
    const was = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = was; };
  }, [open]);

  return (
    <>
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_SNAP}
      /* Размытия под шапкой больше нет, и это не экономия на спичках.
         backdrop-filter заставляет браузер заново размывать полосу
         позади шапки на каждом кадре прокрутки — при удвоенной
         плотности экрана это самая дорогая операция на странице
         после сетки. Замер: без него доля кадров вне бюджета падала
         с 22.8 до 15.7 процента.
       
         На чёрном сайте разница видна только рядом: почти
         непрозрачная плоскость и волосяная линия по нижней кромке
         дают то же самое ощущение слоя, а стоят ноль. */
      className="sticky top-0 z-100 flex items-center gap-6 border-b border-rule-soft
                 bg-void/92 px-5 py-3 sm:px-8 lg:px-[88px]"
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
          {/* Обе полоски лежат в одной ячейке сетки, поэтому
              place-items-center сводит их в одну точку — центр
              кнопки. Закрытое состояние разводит их на три пикселя
              вверх и вниз, открытое просто поворачивает вокруг того
              же центра, и получается крест.
           
              Раньше полоски стояли в разных строках сетки и
              расходились на двадцать один пиксель, а навстречу им
              давали по три — крест не сходился, выходил знак «>». */}
          <span className={cn('col-start-1 row-start-1 h-[1.5px] w-[17px] bg-paper transition-transform duration-300',
            open ? 'rotate-45' : '-translate-y-[3px]')} />
          <span className={cn('col-start-1 row-start-1 h-[1.5px] w-[17px] bg-paper transition-transform duration-300',
            open ? '-rotate-45' : 'translate-y-[3px]')} />
        </button>
      </div>

    </motion.header>

    {/* Меню — сосед шапки, а не её потомок, и это не вкусовщина.
     
        Пока оно лежало внутри, его ломало любое свойство шапки,
        создающее точку отсчёта для position: fixed — transform,
        filter, backdrop-filter, will-change. Так и вышло: у шапки
        было backdrop-filter, и «от края до края экрана» превратилось
        в «от края до края шапки». Панель схлопывалась в 96 пикселей,
        фон красил только эту полоску, а пункты вываливались наружу
        и висели поверх первого экрана без подложки.
     
        Снаружи отсчёт всегда от экрана, и починить это заново
        нельзя — что бы потом ни появилось на шапке.
     
        Размытия здесь тоже нет: под непрозрачной плоскостью размывать
        нечего, а на телефоне это заметная цена ни за что. Панель
        кроет весь экран, отступ сверху оставляет шапку на виду, и
        она остаётся выше по слою — из меню всегда видно, чем его
        закрыть. */}
    <motion.div
      ref={menu}
      id="mobileMenu"
      hidden={!open}
      className="fixed inset-0 z-90 flex flex-col overflow-y-auto bg-void px-5 pb-12 pt-[84px]
                 font-display text-[1.7rem] font-semibold tracking-[-0.03em] sm:px-8 lg:hidden"
    >
      {LINKS.concat({ href: '/#contact', key: 'nav.contact', fallback: 'Контакти' }).map(link => (
        <a key={link.href} href={link.href} onClick={() => setOpen(false)}
           className="border-b border-rule-soft py-3">
          {label(link)}
        </a>
      ))}
    </motion.div>
    </>
  );
}

export default Header;
