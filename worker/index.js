/**
 * Приём заявок с сайта.
 *
 * Сайт лежит на Cloudflare статикой (assets в wrangler.jsonc). Этот
 * воркер добавляет к нему одну живую ручку: POST /api/lead. Всё
 * остальное он не трогает — файлы отдаёт сама платформа, воркер
 * просыпается только там, где файла нет.
 *
 * Что делает: проверяет присланное, склеивает сообщение и отправляет
 * его владельцу в Telegram. Никакой базы: заявка живёт в переписке,
 * а не у нас на диске. Ничего не логируем — в логах Cloudflare не
 * должно оказаться чужого телефона.
 *
 * Что нужно задать в настройках проекта (Settings → Variables):
 *
 *   TG_BOT_TOKEN — токен бота, от которого придёт заявка (секрет);
 *   TG_CHAT_ID   — куда её слать: свой id или id канала.
 *
 * Пока их нет, ручка честно отвечает 503, а форма на сайте
 * показывает запасной путь — написать в Telegram руками.
 */

const LIMITS = { name: 80, contact: 160, task: 2000 };

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

/** Обрезаем и чистим: в телеграм уедет текст, а не разметка. */
function clean(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')  // управляющие символы
    .trim()
    .slice(0, max);
}

/* Telegram ждёт разметку; отправляем без неё, но угловые скобки
   всё равно экранируем — иначе сообщение с <div> просто не дойдёт. */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Проверка «жива ли ручка», которую видно с телефона: открываешь
 * адрес в браузере — и сразу понятно, что именно не так.
 *
 * Причин, по которым форма молчит, ровно три, и по ответу формы их
 * не различить. Поэтому спрашиваем у самого телеграма: есть ли
 * токен, узнаёт ли он бота и достучится ли тот до чата.
 *
 * Значений не отдаём — только факты. Токен наружу не уходит.
 */
async function health(env) {
  const token = env.TG_BOT_TOKEN;
  const chat = env.TG_CHAT_ID;

  if (!token || !chat) {
    return json({
      ok: true,
      configured: false,
      step: 'variables',
      hint: 'Воркер не бачить TG_BOT_TOKEN і TG_CHAT_ID. Найчастіше вони задані в розділі Build, ' +
            'а потрібні у Variables and Secrets самого воркера.'
    });
  }

  /* Токен может быть на месте, но недействителен — например, его
     отозвали в BotFather. getMe отвечает на этот вопрос дешевле
     всего: ни сообщения, ни побочных действий. */
  const me = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    .then(r => r.json())
    .catch(() => null);

  if (!me || !me.ok) {
    return json({
      ok: true,
      configured: true,
      step: 'token',
      hint: 'Токен заданий, але телеграм його не приймає. Перевір TG_BOT_TOKEN — можливо, він відкликаний у BotFather.'
    });
  }

  /* Бот не может написать первым: пока человек не нажал /start,
     телеграм отвечает «chat not found». Это ловит почти всех один
     раз, поэтому проверяем отдельно и говорим прямо. */
  const reach = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chat)}`)
    .then(r => r.json())
    .catch(() => null);

  if (!reach || !reach.ok) {
    return json({
      ok: true,
      configured: true,
      step: 'chat',
      bot: `@${me.result.username}`,
      hint: `Бот @${me.result.username} живий, але не може писати в чат ${chat}. ` +
            'Відкрий цього бота в телеграмі й натисни /start — писати першим він не має права.'
    });
  }

  return json({
    ok: true,
    configured: true,
    step: 'ready',
    bot: `@${me.result.username}`,
    hint: 'Усе на місці: заявки з форми дійдуть.'
  });
}

async function lead(request, env) {
  // GET — это человек, открывший адрес в браузере, а не форма
  if (request.method === 'GET') return health(env);
  if (request.method !== 'POST') return json({ error: 'method' }, 405);

  // Форма своя и лежит на том же домене: чужие страницы слать сюда
  // не должны. Проверяем происхождение, пока оно ещё есть.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return json({ error: 'origin' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'body' }, 400);
  }

  // Ловушка для ботов: поле спрятано от человека и всегда пустое.
  // Заполнено — молча отвечаем «ок», чтобы бот не искал обход.
  if (clean(body.site, 200)) return json({ ok: true });

  const name = clean(body.name, LIMITS.name);
  const contact = clean(body.contact, LIMITS.contact);
  const task = clean(body.task, LIMITS.task);

  if (!name || !contact || task.length < 10) return json({ error: 'fields' }, 422);

  const token = env.TG_BOT_TOKEN;
  const chat = env.TG_CHAT_ID;
  if (!token || !chat) return json({ error: 'offline' }, 503);

  const text = [
    '<b>Заявка з сайту</b>',
    '',
    `<b>Хто:</b> ${esc(name)}`,
    `<b>Куди відповісти:</b> ${esc(contact)}`,
    '',
    esc(task)
  ].join('\n');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  // Что именно не понравилось телеграму — знать полезно, но в ответ
  // это не отдаём: наружу хватит «не вышло, напиши напрямую».
  if (!res.ok) return json({ error: 'send' }, 502);

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/lead') return lead(request, env);
    if (!env.ASSETS) return new Response('Not found', { status: 404 });

    const res = await env.ASSETS.fetch(request);

    /* Файла нет — отдаём свою страницу вместо пустоты платформы.
       Код при этом остаётся 404: с двухсотым поисковик решит, что
       это обычная страница, и начнёт её индексировать.

       Запрашиваем 404.html как отдельный адрес, а не подменяем
       тело: так страница проходит через тот же биндинг и получает
       правильные заголовки. */
    if (res.status === 404) {
      const page = await env.ASSETS.fetch(new Request(new URL('/404.html', request.url)));
      if (page.ok) {
        return new Response(page.body, {
          status: 404,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      }
    }

    return res;
  }
};
