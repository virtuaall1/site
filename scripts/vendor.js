#!/usr/bin/env node
/**
 * Складывает чужую библиотеку к себе.
 *
 *   node scripts/vendor.js   →   vendor/motion.min.js
 *
 * Анимации держит Motion (motion.dev) — та же команда, что делала
 * Framer Motion, только без React. Пружины, scroll-привязка, inView
 * и stagger — всё оттуда.
 *
 * Зачем тащить к себе: пока библиотека грузится с чужого домена, у
 * страницы есть посторонний источник, которому разрешено исполнять
 * код в браузере посетителя. Взломают его — выполнится что угодно.
 * После этого шага сборка подменяет адрес на локальный, и в CSP
 * остаётся script-src 'self'.
 *
 * Берём из реестра npm, а не с cdnjs: cdnjs и jsdelivr отвечают
 * 403 со сборочных машин за строгим прокси, и сборка падала на
 * ровном месте. Реестр доступен везде, где работает npm install.
 *
 * Версия прибита гвоздями. Не скачалось — сборка падает, и наружу
 * едет прошлая рабочая версия сайта, а не сломанная новая.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const PKG = 'motion';
const VERSION = '13.4.0';
/* Из пакета нужен ровно один файл: собранный UMD-бандл, который
   кладёт себя в window.Motion. Остальное там — сборки под React,
   three.js и исходники с картами. */
const INSIDE = 'package/dist/motion.js';
const OUT = 'motion.min.js';
const MIN_BYTES = 40000;   // меньше — значит приехало не то

const dir = path.join(__dirname, '..', 'vendor');

(() => {
  fs.mkdirSync(dir, { recursive: true });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-'));
  try {
    // npm сам разберётся с реестром, прокси и авторизацией —
    // повторять его логику своим fetch незачем
    const tgz = execFileSync('npm', ['pack', `${PKG}@${VERSION}`, '--silent'],
      { cwd: tmp, encoding: 'utf8' }).trim().split('\n').pop();

    execFileSync('tar', ['-xzf', tgz, INSIDE], { cwd: tmp });

    const body = fs.readFileSync(path.join(tmp, INSIDE));
    if (body.length < MIN_BYTES) {
      throw new Error(`${INSIDE} весит ${body.length} байт — это не библиотека`);
    }

    const target = path.join(dir, OUT);
    fs.writeFileSync(target, body);

    const sha = crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
    console.log(`→ vendor/${OUT}  ${(body.length / 1024).toFixed(0)} КБ  sha256:${sha}`);
    console.log(`   ${PKG}@${VERSION} из реестра npm`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})();
