/* Служебное: собирает иконки в один кадр для визуальной проверки. */
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = join(ROOT, 'assets', 'img');

const cell = async (file, nearest) =>
  sharp(join(IMG, file)).resize(96, 96, nearest ? { kernel: 'nearest' } : {}).png().toBuffer();

const items = [
  ['favicon-16.png', true],
  ['favicon-32.png', true],
  ['favicon-48.png', true],
  ['apple-touch-icon.png', false]
];

const composites = [];
for (const [i, [file, nearest]] of items.entries()) {
  composites.push({ input: await cell(file, nearest), top: 24, left: 24 + i * 120 });
}

// Половина кадра тёмная, половина светлая: иконку видно в обеих темах браузера
await sharp({ create: { width: 528, height: 144, channels: 4, background: { r: 32, g: 36, b: 42, alpha: 1 } } })
  .composite([
    { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="528" height="144"><rect x="264" width="264" height="144" fill="#eef1f5"/></svg>`), top: 0, left: 0 },
    ...composites
  ])
  .png()
  .toFile(join(ROOT, '..', 'favicon-check.png'));

console.log('favicon-check.png готов');
