/* Разовая обработка изображений из экспорта Tilda.
   Запуск: node tools/images.mjs
   Исходники — 37 МБ несжатых PNG. На выходе WebP нужного размера. */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '..', 'site', 'souzgeostab', 'images');
const DST = join(ROOT, 'assets', 'img');

await mkdir(DST, { recursive: true });

/* Фавиконки: исходники из Tilda весят десятки килобайт при размере иконки.
   Пережимаем в реальные размеры. */
const icons = [
  { src: 'tild6461-3633-4563-b038-333531373636___1.png', out: 'favicon-32.png', size: 32 },
  { src: 'tild3133-3239-4662-b434-373562376163___1.png', out: 'apple-touch-icon.png', size: 180 },
  { src: 'tild3863-3166-4566-a263-303734323136___2.png', out: 'logo.png', size: 240 }
];

for (const i of icons) {
  try {
    await sharp(join(SRC, i.src))
      .resize(i.size, i.size, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toFile(join(DST, i.out));
    const s = await stat(join(DST, i.out));
    console.log(`  ${i.out.padEnd(24)} ${(s.size / 1024).toFixed(1)} КБ`);
  } catch (e) {
    console.log(`  ПРОПУЩЕНО ${i.out}: ${e.message}`);
  }
}

/* Картинка для соцсетей: 1200×630, из главного изображения сайта. */
try {
  await sharp(join(SRC, 'tild3736-3064-4638-b939-393734663039__main-img-2.png'))
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(DST, 'og.jpg'));
  const s = await stat(join(DST, 'og.jpg'));
  console.log(`  og.jpg                   ${(s.size / 1024).toFixed(1)} КБ`);
} catch (e) {
  console.log(`  ПРОПУЩЕНО og.jpg: ${e.message}`);
}

/* Контентные изображения: только крупные, всё мелкое — иконки Tilda, не нужны.
   Каждое отдаётся в двух ширинах для srcset. */
const files = await readdir(SRC);
const big = [];

for (const f of files) {
  if (!/\.(png|jpe?g)$/i.test(f)) continue;
  if (f.includes('-__resize__')) continue;          // превью Tilda, не исходник
  const s = await stat(join(SRC, f));
  if (s.size < 150 * 1024) continue;                // мелочь пропускаем
  big.push({ file: f, size: s.size });
}

big.sort((a, b) => b.size - a.size);
console.log(`\nКонтентных изображений к обработке: ${big.length}`);

let before = 0, after = 0;

for (const [idx, b] of big.entries()) {
  // Имя вида photo-01. Осмысленные имена присвоим, когда изображения
  // будут привязаны к конкретным страницам.
  const base = `photo-${String(idx + 1).padStart(2, '0')}`;
  before += b.size;

  for (const w of [1600, 800]) {
    const out = join(DST, `${base}-${w}.webp`);
    try {
      await sharp(join(SRC, b.file))
        .resize(w, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 })
        .toFile(out);
      const s = await stat(out);
      after += s.size;
    } catch (e) {
      console.log(`  ошибка ${b.file}: ${e.message}`);
    }
  }
}

console.log(`\nБыло:  ${(before / 1024 / 1024).toFixed(1)} МБ`);
console.log(`Стало: ${(after / 1024 / 1024).toFixed(1)} МБ (обе ширины)`);
console.log(`Экономия: ${(100 - (after / before) * 100).toFixed(0)} %`);
