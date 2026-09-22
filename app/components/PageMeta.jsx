/**
 * Заголовок вкладки и описание страницы.
 *
 * Их ставит сборка — и на этом всё: React про <head> ничего не
 * знает и при смене языка оставляет заголовок прежним. Человек
 * переключает на английский, а вкладка так и висит украинской.
 *
 * Поэтому обновляем сами. Атрибут lang у <html> тоже здесь: по
 * нему читалка выбирает произношение, а браузер — правила
 * переносов.
 */
import { useEffect } from 'react';
import { useI18n } from '../lib/i18n.jsx';
import { ROUTES, NOT_FOUND } from '../lib/routes.js';

export function PageMeta({ path }) {
  const { lang } = useI18n();

  useEffect(() => {
    const route = [...ROUTES, NOT_FOUND].find(r => r.path === path);
    if (!route) return;

    const copy = route[lang] || route.uk;
    document.title = copy.title;
    document.documentElement.lang = lang;

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', copy.desc);

    // Соцсети читают свои теги, а не обычные: открытая вкладка
    // может уехать в мессенджер прямо сейчас.
    const og = document.querySelector('meta[property="og:title"]');
    if (og) og.setAttribute('content', copy.title.split(' | ')[0]);
  }, [lang, path]);

  return null;
}

export default PageMeta;
