/* Иконки сайта и картинка для предпросмотра ссылок.
   Запуск: node tools/social.mjs

   Что решается:
   - прежний favicon.svg весил 130 КБ и содержал внутри растр, а не вектор;
   - тёмно-синяя эмблема пропадала на тёмной вкладке браузера;
   - картинкой ссылки был безымянный кусок фотографии без логотипа. */

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = join(ROOT, 'assets', 'img');

/* Источник — оригинал из экспорта Tilda, а не файл в assets/img.
   Иначе скрипт читал бы собственный результат прошлого прогона и запекал
   подложку внутрь эмблемы слой за слоем. */
const SRC_MARK = join(ROOT, '..', 'site', 'souzgeostab', 'images',
  'tild3133-3239-4662-b434-373562376163___1.png');

await mkdir(IMG, { recursive: true });

/* --- Светлая версия логотипа для тёмных подложек ------------------------- */
const logoSrc = await readFile(join(IMG, 'logo.svg'), 'utf8');
await writeFile(join(IMG, 'logo-light.svg'), logoSrc.replace(/#67767D/gi, '#FFFFFF'), 'utf8');

/* --- Иконки -------------------------------------------------------------- */
/* Эмблема нарисована синим и оранжевым. На прозрачном фоне она пропадает
   на тёмной вкладке, на синей подложке сливаются буквы «СГС». Белая подложка
   сохраняет фирменные цвета и читается в обеих темах браузера. */
const PLATE = { r: 255, g: 255, b: 255 };

const hex = `rgb(${PLATE.r},${PLATE.g},${PLATE.b})`;

async function icon(size, pad, shape) {
  const inner = Math.round(size * (1 - pad * 2));
  const off = Math.round((size - inner) / 2);

  const mark = await sharp(SRC_MARK)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Подложка рисуется SVG: так круг получается со сглаженным краем,
  // а не ступенькой, что особенно заметно на 16 и 32 пикселях.
  const plate = shape === 'circle'
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${hex}"/>`
    : `<rect width="${size}" height="${size}" fill="${hex}"/>`;

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([
      { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${plate}</svg>`), top: 0, left: 0 },
      { input: mark, top: off, left: off }
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const jobs = [
  { out: 'favicon-16.png', size: 16,  pad: 0.02, shape: 'circle' },
  { out: 'favicon-32.png', size: 32,  pad: 0.08, shape: 'circle' },
  { out: 'favicon-48.png', size: 48,  pad: 0.10, shape: 'circle' },
  { out: 'icon-192.png',   size: 192, pad: 0.16, shape: 'circle' },

  // iOS не умеет прозрачность и подставляет чёрный, а углы скругляет сам.
  // Поэтому здесь полный квадрат: круг дал бы чёрные углы вокруг него.
  { out: 'apple-touch-icon.png', size: 180, pad: 0.18, shape: 'square' },

  // Для Android-манифеста в режиме maskable система сама обрезает икону
  // под форму лаунчера, ей тоже нужен залитый квадрат с запасом по краям.
  { out: 'icon-512.png', size: 512, pad: 0.22, shape: 'square' }
];

for (const j of jobs) {
  await writeFile(join(IMG, j.out), await icon(j.size, j.pad, j.shape));
  console.log(`  ${j.out} (${j.shape === 'circle' ? 'круг' : 'квадрат'})`);
}

/* favicon.ico в корне: его запрашивают браузеры и краулеры напрямую,
   независимо от того, что указано в разметке */
const ico = await pngToIco([
  join(IMG, 'favicon-16.png'),
  join(IMG, 'favicon-32.png'),
  join(IMG, 'favicon-48.png')
]);
await writeFile(join(ROOT, 'favicon.ico'), ico);
console.log('  favicon.ico');

/* Векторную иконку не делаем: исходный favicon.svg из Tilda весил 130 КБ
   и содержал внутри растр, а рисовать свою эмблему нельзя - получится
   не фирменный знак. Набора PNG (16/32/48/192/512) хватает с запасом. */

/* --- Картинка предпросмотра ссылки --------------------------------------- */
/* 1200x630 — размер, который берут WhatsApp, Telegram, Facebook, LinkedIn.
   Фото объекта, затемнение, логотип и подпись: ссылка должна читаться
   как карточка компании, а не как случайный кадр. */
const OG_W = 1200, OG_H = 630;

const photo = await sharp(join(IMG, 'inekciya-osnovaniya-dvoe-1600.webp'))
  .resize(OG_W, OG_H, { fit: 'cover', position: 'centre' })
  .toBuffer();

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#0d1b2a" stop-opacity="0.94"/>
      <stop offset="45%"  stop-color="#0d1b2a" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="#0d1b2a" stop-opacity="0.97"/>
    </linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#0d1b2a" stop-opacity="0.92"/>
      <stop offset="70%"  stop-color="#0d1b2a" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#0d1b2a" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#g)"/>
  <rect width="${OG_W}" height="${OG_H}" fill="url(#s)"/>
  <rect x="0" y="${OG_H - 10}" width="${OG_W}" height="10" fill="#f2a900"/>
</svg>`);

const logoLight = await sharp(Buffer.from(logoSrc.replace(/#67767D/gi, '#FFFFFF')))
  .resize({ height: 58 })
  .png()
  .toBuffer();

// Текст рисуем контурами: системных шрифтов Manrope на машине сборки нет,
// а подставлять чужую гарнитуру в фирменную карточку нельзя.
const headline = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="240">
  <style>
    .t { font-family: "Manrope", "Segoe UI", Arial, sans-serif; fill: #ffffff; font-weight: 800; }
    .s { font-family: "Manrope", "Segoe UI", Arial, sans-serif; fill: #aebbc9; font-weight: 500; }
    .d { font-family: "Manrope", "Segoe UI", Arial, sans-serif; fill: #f2a900; font-weight: 700; }
  </style>
  <text class="t" x="0" y="52"  font-size="52">Инъекционные технологии</text>
  <text class="t" x="0" y="112" font-size="52">и геотехнические решения</text>
  <text class="s" x="0" y="168" font-size="26">Усиление фундаментов, подъём плит, устранение водопритоков</text>
  <text class="d" x="0" y="222" font-size="26">souyzgeostab.kz</text>
</svg>`);

await sharp(photo)
  .composite([
    { input: overlay, top: 0, left: 0 },
    { input: logoLight, top: 62, left: 72 },
    { input: headline, top: 210, left: 72 }
  ])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(join(IMG, 'og.jpg'));

console.log('  og.jpg 1200x630');
