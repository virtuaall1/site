/**
 * Секция страницы: одинаковые поля, одинаковый воздух.
 *
 * `sunken` — та же плоскость, но чуть светлее и с волосяными
 * линиями по краям: граница без рамки. Чередование утопленных и
 * обычных секций и создаёт ритм длинной страницы.
 */
import { cn } from '../../lib/cn.js';
import { Kicker } from './Kicker.jsx';
import { Scramble } from './Scramble.jsx';
import { Rule } from './Rule.jsx';

export function Section({ id, sunken = false, className, children }) {
  const inner = (
    <div className={cn('mx-auto max-w-page px-5 py-24 sm:px-8 md:py-32 lg:px-[88px]', className)}>
      {children}
    </div>
  );

  if (!sunken) return <section id={id}>{inner}</section>;

  return (
    <section
      id={id}
      className="border-y border-rule-soft bg-ink
                 [background-image:linear-gradient(180deg,transparent,rgba(255,255,255,0.035)_12%,rgba(255,255,255,0.035)_88%,transparent)]"
    >
      {inner}
    </section>
  );
}

/**
 * Шапка секции: надзаголовок, заголовок, подводка.
 *
 * Снизу линия, которая прочерчивается, когда шапка доехала до
 * экрана. Она отделяет обещание от того, чем мы его подкрепляем, и
 * заодно задаёт ритм: глаз цепляется за начало секции, а не плывёт
 * по сплошной ленте.
 */
export function SectionHead({ kicker, title, lead, children, className, rule = true }) {
  return (
    <div className={cn('mb-16', className)}>
      {kicker && <Kicker className="mb-4">{kicker}</Kicker>}
      {title && (
        <Scramble
          as="h2"
          text={title}
          className="block max-w-[18ch] font-display text-[clamp(2rem,4.6vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance"
        />
      )}
      {lead && <p className="mt-4 max-w-[62ch] text-[1.02rem] text-muted">{lead}</p>}
      {children}
      {rule && <Rule className="mt-10" delay={0.15} />}
    </div>
  );
}

export default Section;
