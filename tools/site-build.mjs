/* Сборка многостраничного сайта из блоков Tilda.
   Запуск: node tools/site-build.mjs

   Принцип: блоки заказчика переносятся без изменений. Их вёрстка,
   фотографии, порядок, анимации при наведении и скрипты остаются
   ровно такими, как на souyzgeostab.kz. Меняется только одно -
   якорные ссылки меню становятся ссылками на отдельные страницы. */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARTS = join(ROOT, 'tools', 'parts');

const part = async (name) => readFile(join(PARTS, `${name}.html`), 'utf8');

/* --- Записи главной ------------------------------------------------------ */
const R = {
  header:  'rec2423725763',   // шапка (своя вёрстка, не Zero)
  hero:    'rec2423639743',   // первый экран с видео
  scroll:  'rec2423661563',   // индикатор SCROLL
  tasks:   'rec2423665763',   // Какие задачи мы решаем
  fields:  'rec2423688503',   // Отрасли применения
  tech:    'rec2423698673',   // Технологии
  steps:   'rec2441067283',   // Этапы работ
  docsSep: 'rec2453378743',   // якорь-разделитель раздела документов
  docs:    'rec2453378593',   // Документы: буклет и лифлет
  form:    'rec2423720173',   // Нужна оценка объекта + форма
  footer:  'rec2423725483',   // подвал
  util1:   'rec2437744173',   // служебный блок
  util2:   'rec2437744433'    // кнопка наверх
};

/* Меню было якорями по одной странице. Теперь это адреса страниц. */
const ANCHOR_TO_URL = {
  [`#${R.tasks}`]:  '/resheniya/',
  [`#${R.fields}`]: '/otrasli/',
  [`#${R.tech}`]:   '/tehnologii/',
  [`#${R.steps}`]:  '/etapy-rabot/',
  [`#${R.docsSep}`]: '/dokumenty/',
  [`#${R.docs}`]:   '/dokumenty/',
  [`#${R.form}`]:   '/kontakty/'
};

const EMAIL_OLD = ['souzgeostab@mail.ru', 'info@sgm1.kz'];
const EMAIL_NEW = 'info@souyzgeostab.kz';

/* --- Пересчёт путей под глубину страницы --------------------------------- */
function rebase(html, prefix) {
  if (!prefix) return html;
  return html
    .replace(/((?:src|href|data-original|data-lazy-original|content)=")(?=(?:images|css|js|files)\/)/g, `$1${prefix}`)
    .replace(/url\((['"]?)(?=(?:images|css|js|files)\/)/g, `url($1${prefix}`)
    .replace(/srcset="([^"]*)"/g, (_, v) =>
      `srcset="${v.replace(/(^|,\s*)(?=(?:images|css|js|files)\/)/g, `$1${prefix}`)}"`);
}

/* --- Ссылки меню и кнопок ------------------------------------------------ */
function relink(html, prefix) {
  for (const [anchor, url] of Object.entries(ANCHOR_TO_URL)) {
    const target = prefix + url.replace(/^\//, '');
    html = html.replaceAll(`href="${anchor}"`, `href="${target}"`);
  }
  // Логотип ведёт на главную
  html = html.replace(
    /(<div class="nav-header__logo-wrapper">)\s*(<img)/,
    `$1<a href="${prefix || './'}" aria-label="СоюзГеоСтаб, на главную">$2`
  ).replace(
    /(class="nav-header__logo-image[^>]*>)/,
    '$1</a>'
  );
  return html;
}

/* --- Почта --------------------------------------------------------------- */
function fixEmail(html) {
  for (const old of EMAIL_OLD) html = html.replaceAll(old, EMAIL_NEW);
  return html;
}

/* --- Мобильное меню ------------------------------------------------------
   В исходнике ниже 480px меню скрыто через display:none, а скрипт,
   который его открывает, закомментирован самим разработчиком. На телефоне
   меню недоступно вовсе. Включаем: добавляем кнопку и обработчик,
   используя уже существующий в их CSS класс .is-open.            */
function enableMobileMenu(html) {
  html = html.replace(
    '<nav class="nav-header__menu">',
    `<button class="nav-header__burger" type="button" aria-label="Меню" aria-expanded="false">
              <span></span><span></span><span></span>
            </button>
            <nav class="nav-header__menu" id="nav-menu">`
  );

  const css = `
/* Кнопка мобильного меню. Появляется там же, где их CSS прячет меню. */
.nav-header__burger { display: none; }
@media (max-width: 480px) {
  .nav-header__burger {
    display: flex; flex-direction: column; justify-content: center; gap: 5px;
    width: 40px; height: 40px; padding: 0 8px; margin-left: auto;
    background: none; border: 0; cursor: pointer; order: 2;
  }
  .nav-header__burger span {
    display: block; width: 100%; height: 2px; background: #0D1B2A; border-radius: 2px;
    transition: transform .25s ease, opacity .2s ease;
  }
  .nav-header__burger[aria-expanded="true"] span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .nav-header__burger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
  .nav-header__burger[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
  .nav-header__right { order: 4; width: 100%; }
}
</style>`;
  html = html.replace('</style>', css);

  const js = `
(function () {
  var burger = document.querySelector('.nav-header__burger');
  var menu = document.getElementById('nav-menu');
  if (!burger || !menu) return;
  burger.addEventListener('click', function () {
    var open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    menu.classList.toggle('is-open', !open);
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      burger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
    }
  });
})();
</script>`;
  html = html.replace('</script>', js);

  return html;
}

/* --- Голова документа ---------------------------------------------------- */
async function buildHead(page, prefix) {
  let head = await part('_head');

  // Заголовок и описание страницы
  head = head
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${page.desc}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${page.title}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${page.desc}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="https://souyzgeostab.kz${page.url}" />`)
    .replace(/<link rel="canonical" href="[^"]*">/,
      `<link rel="canonical" href="https://souyzgeostab.kz${page.url}">`);

  // Дополнительный CSS под текстовые разделы
  head = head.replace('</head>', '');
  head += `\n<link rel="stylesheet" href="${prefix}css/site-extra.css" type="text/css" media="all" />`;

  return rebase(head, prefix);
}

/* --- Сборка страницы ----------------------------------------------------- */
async function buildPage(page) {
  const depth = page.url === '/' ? 0 : page.url.split('/').filter(Boolean).length;
  const prefix = '../'.repeat(depth);

  const head = await buildHead(page, prefix);
  const open = await part('_allrecords-open');

  const chunks = [];
  for (const rec of page.records) {
    let html = await part(rec);
    if (rec === R.header) html = enableMobileMenu(html);
    html = relink(html, prefix);
    html = rebase(html, prefix);
    html = fixEmail(html);
    chunks.push(html);

    // Шапка фиксированная. На главной под ней идёт первый экран, который
    // это учитывает; на внутренних страницах нужна распорка, иначе
    // заголовок блока уезжает под шапку.
    if (rec === R.header && page.url !== '/') {
      chunks.push('<div class="sgs-header-offset"></div>');
    }

    // Текстовый раздел ставится сразу после своего блока
    if (page.text && page.text.after === rec) chunks.push(page.text.html);
  }

  const body = `<!DOCTYPE html>
<html lang="ru">
<head>
${head}
</head>
<body class="t-body" style="margin:0;">
<!--allrecords-->
${open}
${chunks.join('\n')}
${page.extra || ''}
</div>
<!--/allrecords-->
</body>
</html>
`;

  const file = page.url === '/'
    ? join(ROOT, 'index.html')
    : join(ROOT, page.url.replace(/^\/|\/$/g, ''), 'index.html');

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, body, 'utf8');
  return page.url;
}

/* --- Страницы ------------------------------------------------------------ */
const UTIL = [R.util1, R.util2];

const PAGES = [
  {
    url: '/',
    title: 'СоюзГеоСтаб - инъекционные технологии и геотехнические решения',
    desc: 'СоюзГеоСтаб - инженерная компания: усиление оснований, подъём фундаментов, выравнивание зданий, устранение водопритоков. Инъекционные технологии и геотехнические решения.',
    records: [R.header, R.hero, R.scroll, R.tasks, R.fields, R.tech, R.steps, R.docsSep, R.docs, R.form, R.footer, ...UTIL]
  },
  {
    url: '/resheniya/',
    title: 'Решения - какие задачи мы решаем | СоюзГеоСтаб',
    desc: 'Осадки фундаментов, подъём плит и полов, водопритоки и фильтрация, пустоты и разуплотнения, слабые грунты, осушение, аварийные участки.',
    records: [R.header, R.tasks, R.form, R.footer, ...UTIL]
  },
  {
    url: '/otrasli/',
    title: 'Отрасли применения | СоюзГеоСтаб',
    desc: 'Здания и сооружения, промышленные объекты, шахты и карьеры, гидротехнические сооружения, автодороги, железные дороги и аэродромы, фундаменты, подземные сооружения.',
    records: [R.header, R.fields, R.form, R.footer, ...UTIL]
  },
  {
    url: '/tehnologii/',
    title: 'Технологии - Jet Grouting, Deep Stabilization, инъекции | СоюзГеоСтаб',
    desc: 'Floor Lifting и Structural Releveling, Deep Stabilization, Leak Sealing, Void Filling, Jet Grouting, Dewatering, геофизический контроль и моделирование.',
    records: [R.header, R.tech, R.form, R.footer, ...UTIL]
  },
  {
    url: '/etapy-rabot/',
    title: 'Этапы работ - от обследования до отчёта | СоюзГеоСтаб',
    desc: 'Обследование объекта, диагностика и модель проблемы, подбор технологии, выполнение работ, контроль результата, отчёт и рекомендации.',
    records: [R.header, R.steps, R.form, R.footer, ...UTIL]
  },
  {
    url: '/dokumenty/',
    title: 'Документы - буклет и лифлет | СоюзГеоСтаб',
    desc: 'Буклет и лифлет компании СоюзГеоСтаб: описание технологий, областей применения и порядка работы.',
    records: [R.header, R.docsSep, R.docs, R.form, R.footer, ...UTIL]
  },
  {
    url: '/kontakty/',
    title: 'Контакты - оценка объекта | СоюзГеоСтаб',
    desc: 'Свяжитесь с СоюзГеоСтаб: направьте описание проблемы, фото и материалы обследований. Предварительно оценим задачу и предложим инженерное решение.',
    records: [R.header, R.form, R.footer, ...UTIL]
  }
];

const made = [];
for (const p of PAGES) made.push(await buildPage(p));

console.log(`Собрано страниц: ${made.length}`);
made.forEach((u) => console.log('  ' + u));
