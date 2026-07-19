/* Обработка изображений из экспорта Tilda.
   Запуск: node tools/images.mjs

   Исходники — 32 МБ несжатых PNG со случайными именами Tilda.
   На выходе WebP в двух ширинах с осмысленными именами: так их видно
   в поиске по картинкам и понятно в коде. */

import sharp from 'sharp';
import { readdir, mkdir, stat, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, '..', 'site', 'souzgeostab', 'images');
const DST = join(ROOT, 'assets', 'img');

await mkdir(DST, { recursive: true });

/* --- Иконки -------------------------------------------------------------- */
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
  } catch (e) {
    console.log(`  пропущено ${i.out}: ${e.message}`);
  }
}

/* --- Контентные фото ------------------------------------------------------
   Порядок исходников детерминирован: сортировка по размеру убывающе.
   Номер -> смысловое имя. Соответствие снято глазами по контактному листу
   (tools/contact-sheet.mjs).                                              */
const NAMES = {
  1:  'geodeziya-dorozhnoe-pokrytie',      // геодезист с нивелиром на дороге
  2:  'otrasl-transportnaya',              // дорога, ж/д, ВПП
  3:  'inekciya-v-osnovanie-krupno',       // инъекция под конструкцию, янтарный состав
  4:  'kotlovan-ukreplenie-otkosa',
  5:  'kotlovan-rabota-tehniki',
  6:  'beregoukreplenie',
  // 7 — религиозная каллиграфия, к сайту отношения не имеет, пропускаем
  8:  'geofizika-inzhener-planshet',       // инженер с планшетом на карьере
  9:  'inekciya-v-plitu',
  10: 'shema-deep-stabilization',          // разрез: колонна и зона закрепления
  11: 'shema-jet-grouting-kolonna',
  12: 'podem-pola-sklad',                  // инъекция промышленного пола склада
  13: 'inekcionnye-pakery-v-betone',
  14: 'brigada-na-obekte',                 // бригада в фирменной форме
  15: 'inekciya-fundamenta-brigada',
  16: 'burovaya-ustanovka-jet-grouting',
  17: 'vodoponizhenie-kotlovan',
  18: 'inekciya-osnovaniya-dvoe',          // главный кадр: двое, янтарные «корни»
  19: 'dorozhnye-raboty-gorod',
  20: 'tonnel-rabota-v-vyrabotke',
  21: 'shema-otsechka-vodopritoka',        // разрез: завеса против фильтрации
  22: 'zapolnenie-pustoty-krupno',
  23: 'burenie-u-steny-zdaniya',
  24: 'shema-podem-plity-etapy',           // разрез: последовательность подъёма
  25: 'shema-podem-plity',
  26: 'gts-stroitelstvo-prichala',
  27: 'gts-plotina-stroitelstvo',
  28: 'skalnyj-massiv-krepenie-setkoj',
  29: 'obekt-tek-doroga',
  30: 'promyshlennyj-obekt-rabota',
  31: 'inzhenernye-seti-kolodec',
  32: 'zhd-put-obsledovanie',
  34: 'zhilaya-zastrojka',
  35: 'shahta-gornaya-vyrabotka',
  36: 'rabota-v-podvale',
  37: 'inekciya-steny-brigada',
  38: 'brigada-zamery-na-obekte',
  39: 'gts-plotina-panorama',
  40: 'dorozhnye-raboty-obochina',
  41: 'inekciya-fundamenta-krupno',
  42: 'geodeziya-brigada-doroga',
  43: 'tekstura-izolinii',                 // топографические изолинии, фон
  44: 'gts-shluz-remont',
  45: 'tonnel-remont-obdelki'
};

const files = await readdir(SRC);
const big = [];

for (const f of files) {
  if (!/\.(png|jpe?g)$/i.test(f)) continue;
  if (f.includes('-__resize__')) continue;
  const s = await stat(join(SRC, f));
  if (s.size < 150 * 1024) continue;
  big.push({ file: f, size: s.size });
}

big.sort((a, b) => b.size - a.size);

// Убираем прошлые прогоны, чтобы не копились файлы под старыми именами
for (const f of await readdir(DST)) {
  if (/^photo-\d+-\d+\.webp$/.test(f)) await rm(join(DST, f));
}

let before = 0, after = 0, made = 0;

for (const [idx, b] of big.entries()) {
  const name = NAMES[idx + 1];
  if (!name) continue;                    // не размечено — не тащим на сайт

  before += b.size;

  for (const w of [1600, 800]) {
    const out = join(DST, `${name}-${w}.webp`);
    try {
      await sharp(join(SRC, b.file))
        .resize(w, null, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80, effort: 5 })
        .toFile(out);
      after += (await stat(out)).size;
      made++;
    } catch (e) {
      console.log(`  ошибка ${b.file}: ${e.message}`);
    }
  }
}

/* Кадр для соцсетей — из главного снимка инъекции */
try {
  const heroSrc = big[18 - 1];
  await sharp(join(SRC, heroSrc.file))
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(DST, 'og.jpg'));
} catch (e) {
  console.log(`  пропущено og.jpg: ${e.message}`);
}

console.log(`Файлов: ${made} (${Object.keys(NAMES).length} снимков в двух ширинах)`);
console.log(`Было ${(before / 1024 / 1024).toFixed(1)} МБ -> стало ${(after / 1024 / 1024).toFixed(1)} МБ`);
