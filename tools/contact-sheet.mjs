/* Собирает все обработанные фото в одну сетку с номерами,
   чтобы разом увидеть, что есть в наличии. Служебный скрипт. */

import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'img');
const OUT = join(ROOT, '..', 'contact-sheet');

const files = (await readdir(DIR))
  .filter((f) => /^photo-\d+-800\.webp$/.test(f))
  .sort();

const COLS = 5, CELL = 300, ROWS_PER_SHEET = 3;
const perSheet = COLS * ROWS_PER_SHEET;

for (let s = 0; s * perSheet < files.length; s++) {
  const chunk = files.slice(s * perSheet, (s + 1) * perSheet);
  const rows = Math.ceil(chunk.length / COLS);

  const composites = [];
  for (const [i, f] of chunk.entries()) {
    const buf = await sharp(join(DIR, f))
      .resize(CELL, CELL, { fit: 'cover' })
      .toBuffer();
    composites.push({
      input: buf,
      left: (i % COLS) * CELL,
      top: Math.floor(i / COLS) * CELL
    });

    const num = f.match(/photo-(\d+)/)[1];
    const label = Buffer.from(
      `<svg width="${CELL}" height="40"><rect width="${CELL}" height="40" fill="#000" opacity="0.75"/>` +
      `<text x="10" y="27" font-family="sans-serif" font-size="22" fill="#fff">${num}</text></svg>`
    );
    composites.push({
      input: label,
      left: (i % COLS) * CELL,
      top: Math.floor(i / COLS) * CELL
    });
  }

  await sharp({
    create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: '#111' }
  })
    .composite(composites)
    .jpeg({ quality: 78 })
    .toFile(`${OUT}-${s + 1}.jpg`);

  console.log(`${OUT}-${s + 1}.jpg — ${chunk.length} шт.`);
}
