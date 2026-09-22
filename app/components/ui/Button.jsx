/**
 * Кнопка.
 *
 * Варианты описаны таблицей, а не ветвлением в разметке: добавить
 * ещё один — дописать строку, а не искать все места, где кнопка
 * рисуется. Ссылка и кнопка — один компонент: решает проп `as`,
 * потому что различие между «перейти» и «сделать» семантическое,
 * а не визуальное.
 */
import { cn } from '../../lib/cn.js';

const BASE = 'inline-flex items-center justify-center gap-2 rounded-full font-medium ' +
  'whitespace-nowrap transition-[background-color,color,border-color] duration-300 ' +
  'border border-transparent select-none';

const VARIANTS = {
  /* Единственная сплошная кнопка на экран — та, которую мы хотим,
     чтобы нажали. Остальные стеклянные. */
  solid: 'bg-acid text-acid-ink font-semibold hover:bg-acid-hi',
  glass: 'glass-plate text-paper hover:bg-glass-2 hover:border-white/15',
  ghost: 'text-muted hover:text-paper'
};

/* Минимум 44 пикселя по высоте — это палец, а не курсор. */
const SIZES = {
  sm: 'min-h-[34px] px-4 py-[7px] text-[0.82rem]',
  md: 'min-h-11 px-[22px] py-3 text-[0.92rem]',
  lg: 'min-h-[52px] px-[30px] py-[15px] text-base'
};

export function Button({ as: As = 'button', variant = 'glass', size = 'md', className, ...rest }) {
  if (As === 'button' && !rest.type) rest.type = 'button';
  return <As className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...rest} />;
}

export default Button;
