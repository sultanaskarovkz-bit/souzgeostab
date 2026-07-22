/* Разбор экспорта Tilda на части.
   Запуск: node tools/extract.mjs

   Главная страница Tilda состоит из записей (record) - самостоятельных
   блоков со своей разметкой. Каждая запись переносится на другую страницу
   как есть: вёрстка, фотографии, анимации и скрипты у них общие,
   подключаются одним CSS и одним JS на всю страницу.

   На выходе - parts/*.html для сборки многостраничного сайта. */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '..', 'site', 'souzgeostab', 'page151351773.html');
const OUT = join(ROOT, 'tools', 'parts');

await mkdir(OUT, { recursive: true });

const html = await readFile(SRC, 'utf8');

/* --- head: всё до <body> ------------------------------------------------- */
const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
await writeFile(join(OUT, '_head.html'), headMatch[1].trim(), 'utf8');

/* --- обёртка allrecords -------------------------------------------------- */
const wrapMatch = html.match(/<div id="allrecords"[^>]*>/);
await writeFile(join(OUT, '_allrecords-open.html'), wrapMatch[0], 'utf8');

/* --- хвост после последней записи ---------------------------------------- */
const tailMatch = html.match(/<\/div>\s*<!--\/allrecords-->([\s\S]*)$/);
await writeFile(join(OUT, '_tail.html'), tailMatch ? tailMatch[1].trim() : '', 'utf8');

/* --- записи -------------------------------------------------------------- */
const starts = [...html.matchAll(/<div id="(rec\d+)" class="r [^"]*"[^>]*>/g)];
const endOfBody = html.indexOf('<!--/allrecords-->');

const map = [];

for (const [i, m] of starts.entries()) {
  const from = m.index;
  const to = i + 1 < starts.length ? starts[i + 1].index : endOfBody;
  let chunk = html.slice(from, to);

  // У последней записи отрезаем закрывающий div контейнера allrecords
  if (i + 1 === starts.length) chunk = chunk.replace(/<\/div>\s*$/, '');

  const id = m[1];
  const type = (m[0].match(/data-record-type="(\d+)"/) || [])[1] || '?';

  await writeFile(join(OUT, `${id}.html`), chunk.trim(), 'utf8');
  map.push({ id, type, bytes: chunk.length });
}

await writeFile(join(OUT, '_map.json'), JSON.stringify(map, null, 2), 'utf8');

console.log(`head: ${(headMatch[1].length / 1024).toFixed(1)} КБ`);
console.log(`записей: ${map.length}`);
for (const r of map) {
  console.log(`  ${r.id.padEnd(16)} type ${String(r.type).padEnd(6)} ${(r.bytes / 1024).toFixed(1)} КБ`);
}
