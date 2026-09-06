/**
 * Проверка вложенности тегов в html-файлах.
 *
 *   node scripts/htmlcheck.js index.html cases/booking/index.html
 *
 * Смысл простой: после крупной правки разметки легко забыть закрыть
 * div, а браузер это молча переживёт и покажет поехавшую вёрстку.
 * Здесь оно падает сразу и с номером строки.
 */
const fs = require('fs');

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

function check(file) {
  const src = fs.readFileSync(file, 'utf8');
  // комментарии и содержимое script/style выкидываем, но длину сохраняем,
  // иначе номера строк перестанут совпадать с файлом
  const blank = s => s.replace(/[^\n]/g, ' ');
  const clean = src
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, blank)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, blank);

  const stack = [];
  const errors = [];
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = tag.exec(clean))) {
    const [, closing, name, self] = m;
    const lower = name.toLowerCase();
    if (VOID.has(lower) || self === '/') continue;
    const line = clean.slice(0, m.index).split('\n').length;

    if (!closing) { stack.push({ name: lower, line }); continue; }
    if (!stack.length) { errors.push(`строка ${line}: лишний </${lower}>`); continue; }
    const open = stack.pop();
    if (open.name !== lower) {
      errors.push(`строка ${line}: </${lower}>, а открыт <${open.name}> на строке ${open.line}`);
    }
  }
  stack.forEach(o => errors.push(`строка ${o.line}: <${o.name}> не закрыт`));
  return errors;
}

let bad = 0;
for (const file of process.argv.slice(2)) {
  const errors = check(file);
  if (errors.length) { bad++; console.log(`${file}:`); errors.forEach(e => console.log('  ' + e)); }
  else console.log(`${file}: разметка сходится`);
}
process.exit(bad ? 1 : 0);
