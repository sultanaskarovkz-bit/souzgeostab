/* Проверка целостности: каждая локальная ссылка и картинка на каждой
   странице должна указывать на существующий файл — и при открытии
   через сервер, и при открытии файла с диска.
   Запуск: node tools/check-links.mjs */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

async function pages(dir = ROOT, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'tools' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) await pages(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const exists = async (p) => { try { await stat(p); return true; } catch { return false; } };

const files = await pages();
let checked = 0;
const broken = [];

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const base = dirname(file);
  const refs = new Set();

  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) refs.add(m[1]);
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url) refs.add(url);
    }
  }

  for (const ref of refs) {
    // Внешние адреса, якоря, телефоны и почту не проверяем
    if (/^(https?:|\/\/|#|mailto:|tel:|data:)/.test(ref)) continue;

    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) continue;

    // Абсолютный путь работает только с сервера, относительный — везде.
    // 404.html намеренно абсолютный: Apache отдаёт его по любому адресу.
    const target = clean.startsWith('/')
      ? join(ROOT, clean)
      : resolve(base, clean);

    // Каталог -> в нём должен лежать index.html
    const candidate = clean.endsWith('/') || !clean.split('/').pop().includes('.')
      ? join(target, 'index.html')
      : target;

    checked++;
    if (!(await exists(candidate))) {
      broken.push(`${relative(ROOT, file)}  ->  ${ref}`);
    }
  }
}

console.log(`Страниц: ${files.length}, проверено ссылок: ${checked}`);
if (broken.length) {
  console.log(`\nБИТЫХ: ${broken.length}`);
  broken.forEach((b) => console.log('  ' + b));
  process.exitCode = 1;
} else {
  console.log('Битых ссылок нет.');
}
