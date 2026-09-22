/**
 * Стеклянная плита — тот самый слой света, из которого собран весь
 * сайт: карточка кейса, строка цены, шаг, репозиторий, форма.
 *
 * Здесь она одна на всех, поэтому глубина везде одинаковая. Если
 * начать писать её заново в каждом компоненте, через месяц на
 * странице окажется пять разных прозрачностей.
 */
import { cn } from '../../lib/cn.js';

const RADIUS = {
  sm: 'rounded-xl',
  md: 'rounded-2xl',
  lg: 'rounded-[26px]'
};

export function Surface({ as: As = 'div', radius = 'md', interactive = false, className, ...rest }) {
  return (
    <As
      className={cn(
        'glass-plate',
        RADIUS[radius],
        interactive && 'transition-colors duration-300 hover:bg-glass-2 hover:border-rule',
        className
      )}
      {...rest}
    />
  );
}

export default Surface;
