/**
 * Бегущая строка для списка технологий.
 *
 * Содержимое продублировано и едет ровно на свою половину, потом
 * прыгает в начало — шва не видно. Края растворяются маской,
 * иначе строка выглядит обрезанной, а не уходящей.
 *
 * Останавливается под курсором: иначе прочитать то, что проезжает,
 * невозможно.
 */
import { useReducedMotion } from 'motion/react';
import { cn } from '../../lib/cn.js';

export function Marquee({ items, speed = 38, className }) {
  const still = useReducedMotion();

  if (still) {
    return <ul className={cn('flex flex-wrap gap-2', className)}>{items.map(renderItem)}</ul>;
  }

  return (
    <div
      className={cn('marquee group relative overflow-hidden', className)}
      style={{ '--marquee-speed': `${speed}s` }}
    >
      <ul className="marquee-track flex w-max gap-2 group-hover:[animation-play-state:paused]">
        {items.map(renderItem)}
        {items.map(name => renderItem(name, name + '-copy', true))}
      </ul>
    </div>
  );
}

function renderItem(name, key, clone = false) {
  return (
    <li
      key={key || name}
      aria-hidden={clone ? 'true' : undefined}
      className="glass-plate shrink-0 rounded-full px-3.5 py-[7px] text-[0.82rem] text-muted
                 transition-colors hover:border-rule hover:text-acid"
    >
      {name}
    </li>
  );
}

export default Marquee;
