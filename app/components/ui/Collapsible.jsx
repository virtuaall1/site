/**
 * Раскрытие: вопрос, пример услуги.
 *
 * Высоту не меряем — её анимирует сетка (0fr → 1fr в main.css).
 * Любой замер в скрипте ломается ровно тогда, когда текст длиннее
 * ожидаемого или шрифт доехал позже.
 */
import { cn } from '../../lib/cn.js';

export function Collapsible({ open, id, className, children }) {
  return (
    <div id={id} className={cn('collapsible', className)} data-open={open ? 'true' : 'false'}>
      <div>{children}</div>
    </div>
  );
}

/** Плюс, который становится минусом. Один элемент, один поворот. */
export function ToggleSign({ open }) {
  return (
    <span aria-hidden="true" className="relative block size-3 shrink-0">
      <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
      <span
        className="absolute inset-x-0 top-1/2 h-px bg-current transition-transform duration-300"
        style={{ transform: open ? 'rotate(0deg)' : 'rotate(90deg)' }}
      />
    </span>
  );
}

export default Collapsible;
