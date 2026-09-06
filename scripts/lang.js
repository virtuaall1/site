'use strict';
/**
 * Разделение данных по языкам.
 *
 * В js/content.js оба языка лежат рядом: у каждой услуги, кейса,
 * шага и вопроса свои uk и en, и два полных словаря I18N. Человеку
 * так удобно — правишь текст и сразу видишь пару. Но в браузер
 * уезжали оба, а читает человек один.
 *
 * Здесь данные делятся надвое: всё украинское плюс общая часть
 * (ссылки, цены, id) остаётся в content.js, английское уходит в
 * отдельный файл. app.js забирает его только тогда, когда человек
 * действительно переключился на английский.
 *
 * Исходники не меняются: делёж происходит на сборке.
 */

/** ключи-языки; всё остальное — общее и остаётся на месте */
const OTHER = 'en';

/**
 * Возвращает две копии: без английского и только английское.
 * Обход общий: ищем ключ en на любой глубине, поэтому новый
 * список с переводами разделится сам, без правки этого файла.
 */
function split(value) {
  if (Array.isArray(value)) {
    const base = [];
    const extra = [];
    let has = false;
    for (const item of value) {
      const [b, e] = split(item);
      base.push(b);
      extra.push(e);
      if (e !== undefined) has = true;
    }
    return [base, has ? extra : undefined];
  }
  if (value && typeof value === 'object') {
    const base = {};
    const extra = {};
    let has = false;
    for (const [key, inner] of Object.entries(value)) {
      if (key === OTHER) { extra[key] = inner; has = true; continue; }
      const [b, e] = split(inner);
      base[key] = b;
      if (e !== undefined) { extra[key] = e; has = true; }
    }
    return [base, has ? extra : undefined];
  }
  return [value, undefined];
}

/**
 * Обратная сборка — та же, что делает app.js в браузере. Держим её
 * здесь, чтобы проверка могла убедиться: разделили и склеили — и
 * получилось ровно то же самое.
 */
function merge(base, extra) {
  if (extra === undefined || extra === null) return base;
  if (Array.isArray(base)) return base.map((item, i) => merge(item, extra[i]));
  if (base && typeof base === 'object') {
    const out = { ...base };
    for (const [key, value] of Object.entries(extra)) {
      out[key] = key in base ? merge(base[key], value) : value;
    }
    return out;
  }
  return extra;
}

module.exports = { split, merge };
