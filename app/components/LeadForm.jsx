/**
 * Заявка.
 *
 * Уезжает на свою же ручку /api/lead — её держит worker/index.js и
 * пересылает в Telegram. Страницы «спасибо» нет: ответ появляется
 * строкой под кнопкой, человек остаётся где был.
 *
 * Ручка может быть недоступна: на локальной статике её нет вовсе,
 * на сервере может не хватать токена бота. Тогда честно говорим об
 * этом и показываем запасной путь — кнопки в Telegram и на почту
 * прямо под формой.
 */
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../lib/i18n.jsx';
import { Section } from './ui/Section.jsx';
import { Kicker } from './ui/Kicker.jsx';
import { Button } from './ui/Button.jsx';
import { Reveal } from './ui/Reveal.jsx';
import { LINKS } from '../lib/content.js';
import { cn } from '../lib/cn.js';

const EMPTY = { name: '', contact: '', task: '', site: '' };

export function LeadForm({ id = 'contact' }) {
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [bad, setBad] = useState(new Set());
  const [status, setStatus] = useState({ text: '', kind: '' });
  const [sending, setSending] = useState(false);
  const first = useRef(null);

  const set = key => e => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setBad(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev); next.delete(key); return next;
    });
  };

  async function submit(e) {
    e.preventDefault();
    if (sending) return;

    // Проверяем то же, что и сервер: короткая задача — это не
    // задача, а «зробіть красиво».
    const wrong = new Set();
    if (!form.name.trim()) wrong.add('name');
    if (!form.contact.trim()) wrong.add('contact');
    if (form.task.trim().length < 10) wrong.add('task');
    if (wrong.size) {
      setBad(wrong);
      setStatus({ text: t('lead.required'), kind: 'bad' });
      if (first.current) first.current.focus();
      return;
    }

    setSending(true);
    setStatus({ text: t('lead.sending'), kind: '' });
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      });
      const answer = await res.json().catch(() => ({}));
      if (res.ok && answer.ok) {
        setForm(EMPTY);
        setStatus({ text: t('lead.ok'), kind: 'ok' });
      } else if (res.status === 422) {
        setStatus({ text: t('lead.required'), kind: 'bad' });
      } else {
        setStatus({ text: t('lead.offline'), kind: 'bad' });
      }
    } catch (err) {
      // сети нет или ручку не подняли — для человека это одно и то же
      setStatus({ text: t('lead.offline'), kind: 'bad' });
    } finally {
      setSending(false);
    }
  }

  const field = (key, label, area = false) => {
    const Tag = area ? 'textarea' : 'input';
    return (
      <label className="mb-8 block">
        <span className="mb-2 block text-[0.74rem] uppercase tracking-[0.1em] text-faint">{label}</span>
        <Tag
          ref={key === 'name' ? first : undefined}
          id={`lead-${key}`}
          name={key}
          value={form[key]}
          onChange={set(key)}
          rows={area ? 4 : undefined}
          maxLength={area ? 2000 : key === 'name' ? 80 : 160}
          autoComplete={key === 'name' ? 'name' : key === 'contact' ? 'email' : 'off'}
          required
          className={cn(
            'block w-full rounded-none border-0 border-b bg-transparent px-0 py-[11px] text-base',
            'text-paper transition-colors focus:outline-none',
            area && 'min-h-[116px] resize-y leading-[1.55]',
            bad.has(key) ? 'border-bad' : 'border-rule hover:border-white/15 focus:border-acid'
          )}
        />
      </label>
    );
  };

  return (
    <Section id={id}>
      <Kicker className="mb-4">{t('contact.kicker')}</Kicker>
      <h2 className="mb-2 max-w-[16ch] font-display text-[clamp(2rem,6vw,4.6rem)] font-extrabold leading-[0.96] tracking-[-0.05em]">
        {t('contact.title')}
        <span aria-hidden="true" className="ml-[0.1em] inline-block size-[0.2em] bg-acid align-baseline" />
      </h2>
      <p className="max-w-[62ch] text-[1.02rem] text-muted">{t('contact.lead')}</p>

      <Reveal>
        <form
          onSubmit={submit}
          noValidate
          className={cn(
            'glass-plate mt-12 max-w-[820px] rounded-[26px] p-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] md:p-12',
            sending && 'pointer-events-none opacity-60'
          )}
        >
          <div className="grid gap-x-8 sm:grid-cols-2">
            {field('name', t('lead.name'))}
            {field('contact', t('lead.contact'))}
          </div>
          {field('task', t('lead.task'), true)}

          {/* Ловушка для ботов: человек этого поля не видит и не
              табается в него, а заполненное поле выдаёт автомат. */}
          <div aria-hidden="true" className="absolute left-[-9999px] size-px overflow-hidden">
            <label>Сайт<input type="text" name="site" tabIndex={-1} autoComplete="off"
              value={form.site} onChange={set('site')} /></label>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-6">
            <Button as="button" type="submit" variant="solid" size="lg" disabled={sending}>
              {t('lead.send')}
            </Button>
            <p className="max-w-[34ch] text-[0.82rem] leading-[1.5] text-faint">{t('lead.note')}</p>
          </div>

          <p role="status" aria-live="polite"
             className={cn('mt-4 flex min-h-[1.3em] items-center gap-2 text-[0.9rem]',
               status.kind === 'ok' ? 'text-acid' : status.kind === 'bad' ? 'text-bad' : 'text-muted')}>
            <AnimatePresence>
              {status.kind === 'ok' && (
                /* Галочка рисуется линией, а не появляется целиком:
                   так видно, что это ответ на действие, а не текст,
                   который был тут всё время. */
                <motion.svg
                  key="check" viewBox="0 0 20 20" className="size-4 shrink-0"
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                >
                  <motion.path
                    d="M4 10.5 L8.5 15 L16 5.5"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                </motion.svg>
              )}
            </AnimatePresence>
            {status.text}
          </p>
        </form>
      </Reveal>

      <p className="mt-12 text-[0.74rem] uppercase tracking-[0.1em] text-faint">{t('lead.or')}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button as="a" href={`${LINKS.telegram}?text=${encodeURIComponent(t('contact.tgText'))}`}
                target="_blank" rel="noopener noreferrer" variant="solid" size="lg">
          {t('contact.tg')}
        </Button>
        <Button as="a" href={`mailto:${LINKS.email}`} size="lg">{t('contact.mail')}</Button>
      </div>
    </Section>
  );
}

export default LeadForm;
