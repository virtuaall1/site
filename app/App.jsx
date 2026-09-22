/**
 * Оболочка страницы: шапка, содержимое, подвал.
 *
 * Роутера нет намеренно. Страниц пять, каждая — отдельный
 * статический файл, а переходы между ними делает браузер. Это и
 * быстрее (нечего гидрировать ради навигации), и честнее для
 * поисковика, и переход между страницами анимирует сам браузер
 * через View Transitions.
 */
import { I18nProvider } from './lib/i18n.jsx';
import { Header } from './components/Header.jsx';
import { Footer } from './components/Footer.jsx';
import { Home } from './pages/Home.jsx';
import { ServicePage } from './pages/ServicePage.jsx';

const PAGES = {
  Home: () => <Home />,
  Boty: () => <ServicePage name="boty" services={['bot', 'shop-bot']} cases={['guard', 'shop-bot', 'booking', 'spend']} />,
  Sajty: () => <ServicePage name="sajty" services={['landing', 'webapp']} cases={null} />,
  Backend: () => <ServicePage name="backend" services={['backend', 'automation', 'custom']} cases={null} />
};

export function App({ page = 'Home', path = '/' }) {
  const Page = PAGES[page] || PAGES.Home;
  return (
    <I18nProvider>
      <a href="#main" className="absolute left-[-9999px] top-0 z-200 bg-acid px-5 py-3 font-semibold text-acid-ink focus:left-2 focus:top-2">
        Перейти до вмісту
      </a>
      <Header path={path} />
      <main id="main" className="relative z-1">
        <Page />
      </main>
      <Footer />
    </I18nProvider>
  );
}

export default App;
