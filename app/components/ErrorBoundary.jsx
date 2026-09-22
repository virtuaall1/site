/**
 * Что человек видит, когда в коде страницы случилась ошибка.
 *
 * Без этого React снимает с экрана всё дерево целиком — остаётся
 * белая (у нас чёрная) пустота и ни одного объяснения. Человек
 * решает, что сайт умер, и уходит.
 *
 * Здесь вместо пустоты — короткое объяснение и рабочие выходы:
 * перезагрузить, вернуться на главную, написать напрямую. Контакты
 * зашиты строками нарочно: до данных сайта и переводов дело может
 * не дойти, если сломалось именно там.
 *
 * Отдельно отправляем ошибку в Sentry: то, что увидел человек,
 * должны увидеть и мы. Sentry не подключён — просто ничего не
 * происходит.
 */
import { Component } from 'react';
import { reportError } from '../lib/sentry.js';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Sentry (если он вообще подключён) приедет по этому вызову —
    // и приедет только сейчас, когда ошибка уже случилась.
    reportError(error, { componentStack: info.componentStack });
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="mx-auto flex min-h-[70vh] max-w-page flex-col justify-center px-5 py-24 sm:px-8 lg:px-[88px]">
        <p className="inline-flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.14em] text-faint">
          <span aria-hidden="true" className="size-1.5 bg-acid" />
          Помилка
        </p>

        <h1 className="mt-4 max-w-[20ch] font-display text-[clamp(2rem,5.6vw,4rem)] font-extrabold leading-[0.98] tracking-[-0.05em]">
          Тут щось зламалося
        </h1>

        <p className="mt-6 max-w-[54ch] text-[1.02rem] text-muted">
          Сторінка не змогла намалюватись до кінця. Це наша помилка, і ми вже про неї знаємо.
          Спробуйте перезавантажити — або напишіть напряму, відповімо швидше, ніж полагодимо.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center rounded-full bg-acid px-[22px] py-3
                       text-[0.92rem] font-semibold text-acid-ink transition-colors hover:bg-acid-hi"
          >
            Перезавантажити
          </button>
          <a
            href="/"
            className="glass-plate inline-flex min-h-11 items-center rounded-full px-[22px] py-3 text-[0.92rem]"
          >
            На головну
          </a>
          <a
            href="https://t.me/virtuaall01"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-plate inline-flex min-h-11 items-center rounded-full px-[22px] py-3 text-[0.92rem]"
          >
            Написати в Telegram
          </a>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
