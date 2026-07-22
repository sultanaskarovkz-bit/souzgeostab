/* Локальный сервер для просмотра сайта. Запускается через ПРОСМОТР-САЙТА.cmd.
   Нужен только для показа: адреса вида /uslugi/ с диска браузер открыть
   не может, ему требуется сервер, отдающий index.html для папки. */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};

createServer(async (req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);

  // Заглушка обработчика заявок: PHP локально не выполняется, а проверить
  // отправку формы нужно. Пишет полученные поля в консоль сервера.
  if (req.method === 'POST' && url.endsWith('/form.php')) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    const fields = [...raw.matchAll(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n--/g)]
      .map(([, k, v]) => `${k}=${v}`).filter((s) => !s.endsWith('='));
    console.log('ЗАЯВКА: ' + (fields.join('; ') || '(пусто)'));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, test: true }));
    return;
  }

  // Не выпускаем за пределы папки сайта
  const safe = normalize(url).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, safe);

  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, 'index.html');
  } catch {
    // не нашли — отдадим 404 ниже
  }

  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    try {
      const notFound = await readFile(join(ROOT, '404.html'));
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(notFound);
    } catch {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end('<h1>404</h1>');
    }
  }
}).listen(PORT, () => {
  console.log(`  Сайт открыт: http://localhost:${PORT}/`);
  console.log('  Закройте это окно, чтобы остановить просмотр.\n');
});
