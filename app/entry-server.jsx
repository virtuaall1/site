/**
 * Отрисовка страницы при сборке.
 *
 * Выполняется в Node, браузера здесь нет. Всё, что трогает window,
 * localStorage или fetch, обязано жить в useEffect — на сервере он
 * не вызывается.
 */
import { renderToString } from 'react-dom/server';
import { App } from './App.jsx';

export function render(page, path) {
  return renderToString(<App page={page} path={path} />);
}

export default render;
