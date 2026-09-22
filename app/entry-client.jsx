/**
 * Оживление страницы в браузере.
 *
 * Разметка уже пришла готовой — её нарисовала сборка. hydrateRoot
 * не строит дерево заново, а только привязывает обработчики к
 * тому, что уже есть на экране. Поэтому первый кадр не мигает.
 *
 * Какая это страница, сборка кладёт в data-page на body: одному и
 * тому же бандлу надо знать, что оживлять.
 */
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { initSentry } from './lib/sentry.js';
import './main.css';

const root = document.getElementById('root');
const page = document.body.dataset.page || 'Home';
const path = document.body.dataset.path || '/';

hydrateRoot(root, <StrictMode><App page={page} path={path} /></StrictMode>);

// Отчёты об ошибках подключаем после гидратации: они не должны
// задерживать первый экран.
initSentry();
