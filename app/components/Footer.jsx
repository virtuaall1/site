/**
 * Подвал. Домен, а не ник: он переживёт смену мессенджера, и его
 * не стыдно напечатать на визитке.
 */
import { LINKS } from '../lib/content.js';

export function Footer() {
  return (
    <footer className="mx-auto flex max-w-page flex-wrap justify-between gap-6 border-t border-rule-soft
                       px-5 py-8 text-[0.82rem] text-faint sm:px-8 lg:px-[88px]">
      <span>
        © {new Date().getFullYear()} v<span aria-hidden="true" className="mx-px inline-block size-[0.26em] bg-acid" />studio
      </span>
      <a href="/" className="transition-colors hover:text-acid">{LINKS.domain}</a>
    </footer>
  );
}

export default Footer;
