/* Сборка многостраничного сайта из блоков Tilda.
   Запуск: node tools/site-build.mjs

   Принцип: блоки заказчика переносятся без изменений. Их вёрстка,
   фотографии, порядок, анимации при наведении и скрипты остаются
   ровно такими, как на souyzgeostab.kz. Меняется только одно -
   якорные ссылки меню становятся ссылками на отдельные страницы. */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { otrasli } from './content/otrasli.mjs';
import { tehnologii } from './content/tehnologii.mjs';
import { resheniya } from './content/resheniya.mjs';

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
  // Кавычки в экспорте встречаются и двойные, и одинарные: часть картинок
  // записана как data-original='images/...'. Учитываем оба варианта.
  return html
    .replace(/((?:src|href|data-original|data-lazy-original|content)=["'])(?=(?:images|css|js|files)\/)/g, `$1${prefix}`)
    .replace(/url\((['"]?)(?=(?:images|css|js|files)\/)/g, `url($1${prefix}`)
    .replace(/srcset=(["'])([^"']*)\1/g, (_, q, v) =>
      `srcset=${q}${v.replace(/(^|,\s*)(?=(?:images|css|js|files)\/)/g, `$1${prefix}`)}${q}`);
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

/* --- Карточки становятся ссылками ---------------------------------------
   Блоки не переверстываются. В карточку отраслей добавляется прозрачная
   ссылка на всю её площадь (у карточки уже position: relative), а
   у технологий в ссылку превращается сам заголовок - именно так Tilda
   и оформляет кликабельные элементы Zero-блоков. */
function linkIndustryCards(html, prefix) {
  for (const item of otrasli) {
    const at = html.indexOf(`>${item.card}<`);
    if (at === -1) continue;

    const open = html.lastIndexOf('<div class="ind-industries__card"', at);
    if (open === -1) continue;

    const tagEnd = html.indexOf('>', open) + 1;
    const link = `<a class="sgs-card-link" href="${prefix}otrasli/${item.slug}/" aria-label="${item.card}"></a>`;
    html = html.slice(0, tagEnd) + link + html.slice(tagEnd);
  }
  return html;
}

/* Заголовки внутри Zero-блоков: превращаем div в ссылку.
   Именно так Tilda и оформляет кликабельные элементы - <a class='tn-atom'>. */
function linkZeroTitles(html, items, base, prefix) {
  for (const item of items) {
    const re = new RegExp(
      `<div class='tn-atom'(field='[^']*')>${item.card.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</div>`
    );
    html = html.replace(re,
      `<a class='tn-atom sgs-tech-link' href="${prefix}${base}/${item.slug}/" $1>${item.card}</a>`);
  }
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
/* --- Выпадающие подменю в шапке ------------------------------------------
   Пункты «Решения», «Отрасли» и «Технологии» получают список подстраниц.
   Сам пункт остаётся ссылкой на раздел: наведение открывает список,
   клик ведёт на хаб. */
function addDropdowns(html, prefix) {
  const groups = [
    { section: 'solutions', base: 'resheniya', items: resheniya },
    { section: 'industries', base: 'otrasli', items: otrasli },
    { section: 'tech', base: 'tehnologii', items: tehnologii }
  ];

  for (const g of groups) {
    const re = new RegExp(
      `<a href="([^"]+)" class="nav-header__menu-item" data-section="${g.section}">([^<]+)</a>`
    );
    const links = g.items
      .map((i) => `<a href="${prefix}${g.base}/${i.slug}/" class="nav-header__drop-item">${i.card}</a>`)
      .join('');

    html = html.replace(re, (_, href, label) =>
      `<div class="nav-header__group">` +
      `<a href="${href}" class="nav-header__menu-item" data-section="${g.section}">${label}</a>` +
      `<div class="nav-header__drop">${links}</div>` +
      `</div>`);
  }

  const css = `
/* Выпадающие подменю разделов */
.nav-header__group { position: relative; display: flex; align-items: center; }
.nav-header__drop {
  position: absolute;
  top: 100%;
  left: -14px;
  min-width: 290px;
  padding: 8px;
  background: #ffffff;
  border: 1px solid rgba(13, 27, 42, 0.1);
  border-top: 2px solid #F2A900;
  box-shadow: 0 18px 44px rgba(13, 27, 42, 0.16);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-6px);
  transition: opacity .18s ease, transform .18s ease, visibility .18s;
  z-index: 20;
}
.nav-header__group:hover .nav-header__drop,
.nav-header__group:focus-within .nav-header__drop {
  opacity: 1; visibility: visible; transform: translateY(0);
}
.nav-header__drop-item {
  display: block;
  padding: 9px 12px;
  font-size: 14px;
  line-height: 1.35;
  color: #0D1B2A;
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: color .15s ease, background-color .15s ease, border-color .15s ease;
}
.nav-header__drop-item:hover {
  color: #F2A900;
  background: rgba(242, 169, 0, 0.07);
  border-left-color: #F2A900;
}

/* На телефоне выпадать некуда: подпункты показываются сразу,
   отступом под своим разделом. */
@media (max-width: 480px) {
  .nav-header__group { display: block; width: 100%; }
  .nav-header__drop {
    position: static;
    opacity: 1;
    visibility: visible;
    transform: none;
    min-width: 0;
    padding: 0 0 6px 14px;
    border: 0;
    box-shadow: none;
    background: transparent;
  }
  .nav-header__drop-item { padding: 7px 0; font-size: 13px; color: #52616F; }
}
</style>`;

  return html.replace('</style>', css);
}

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

  head += `\n<link rel="stylesheet" href="${prefix}css/site-extra.css" type="text/css" media="all" />`;
  // Приём заявок на свой обработчик вместо forms.tildacdn.com
  head += `\n<script>window.SGS_FORM_ENDPOINT="${prefix}form.php";</script>`;
  head += `\n<script src="${prefix}js/site-forms.js" charset="utf-8"></script>`;

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
    if (rec === R.header) html = addDropdowns(enableMobileMenu(html), prefix);
    if (rec === R.fields) html = linkIndustryCards(html, prefix);
    if (rec === R.tech) html = linkZeroTitles(html, tehnologii, 'tehnologii', prefix);
    if (rec === R.tasks) html = linkZeroTitles(html, resheniya, 'resheniya', prefix);
    html = relink(html, prefix);
    html = rebase(html, prefix);
    html = fixEmail(html);
    chunks.push(html);

    // Шапка фиксированная. На главной под ней идёт первый экран, который
    // это учитывает; на внутренних страницах нужна распорка, иначе
    // заголовок блока уезжает под шапку.
    if (rec === R.header && page.url !== '/') {
      chunks.push('<div class="sgs-header-offset"></div>');
      if (page.bodyAfterHeader) chunks.push(page.bodyAfterHeader(prefix));
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

/* --- Содержимое подстраниц ----------------------------------------------
   Текст идёт обычным потоком в стилистике сайта: шрифты, цвета и ритм
   те же, но высота не задана жёстко, поэтому объём можно наращивать. */
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function sectionOpen(mod, eyebrow, title) {
  return `<section class="sgs-text${mod ? ' ' + mod : ''}">
  <div class="sgs-text__inner">
    ${eyebrow ? `<p class="sgs-text__eyebrow">${esc(eyebrow)}</p>` : ''}
    ${title ? `<h2>${esc(title)}</h2>` : ''}`;
}
const sectionClose = `  </div>
</section>`;

const listOf = (items) =>
  `<ul class="sgs-list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

const parasOf = (items) => items.map((p) => `<p>${esc(p)}</p>`).join('\n      ');

function specTable(rows) {
  return `<div class="sgs-spec-wrap"><table class="sgs-spec"><tbody>${
    rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')
  }</tbody></table></div>`;
}

function relatedLinks(title, items, prefix) {
  if (!items || !items.length) return '';
  return `${sectionOpen('', 'Смотрите также', title)}
    <div class="sgs-links">${items.map((i) => `<a href="${prefix}${i.href}">${esc(i.label)}</a>`).join('')}</div>
${sectionClose}`;
}

function industryBody(item, prefix) {
  const techLinks = item.tech
    .map((s) => tehnologii.find((t) => t.slug === s))
    .filter(Boolean)
    .map((t) => ({ label: t.h1, href: `tehnologii/${t.slug}/` }));

  return `
${sectionOpen('', 'Отрасль', null)}
    <h1 class="sgs-h1">${esc(item.h1)}</h1>
    <p class="sgs-lead">${esc(item.lead)}</p>
${sectionClose}

${sectionOpen('sgs-text--light', 'Состав работ', 'Что выполняем на объектах отрасли')}
    ${listOf(item.works)}
${sectionClose}

${sectionOpen('', 'Обследование', item.signsTitle)}
    <div class="sgs-text__cols">
      <div><p>Решение подбирается по фактическому состоянию объекта. Ниже - то, что определяет схему работ и объём.</p></div>
      <div>${parasOf(item.signs)}</div>
    </div>
${sectionClose}

${sectionOpen('sgs-text--light', 'Производство работ', item.howTitle)}
    ${parasOf(item.how)}
${sectionClose}

${sectionOpen('', 'Условия', item.limitsTitle)}
    ${listOf(item.limits)}
${sectionClose}

${relatedLinks('Технологии, которые применяем в отрасли', techLinks, prefix)}
`;
}

function solutionBody(item, prefix) {
  const techLinks = item.tech
    .map((s) => tehnologii.find((t) => t.slug === s))
    .filter(Boolean)
    .map((t) => ({ label: t.h1, href: `tehnologii/${t.slug}/` }));

  const indLinks = item.otrasli
    .map((s) => otrasli.find((o) => o.slug === s))
    .filter(Boolean)
    .map((o) => ({ label: o.h1, href: `otrasli/${o.slug}/` }));

  return `
${sectionOpen('', 'Решение', null)}
    <h1 class="sgs-h1">${esc(item.h1)}</h1>
    <p class="sgs-lead">${esc(item.lead)}</p>
${sectionClose}

${sectionOpen('sgs-text--light', 'Признаки', item.signsTitle)}
    ${listOf(item.signs)}
${sectionClose}

${sectionOpen('', 'Производство работ', item.howTitle)}
    ${parasOf(item.how)}
${sectionClose}

${sectionOpen('sgs-text--light', 'Условия', item.factorsTitle)}
    ${listOf(item.factors)}
${sectionClose}

${relatedLinks('Технологии для этой задачи', techLinks, prefix)}
${relatedLinks('Отрасли, где встречается задача', indLinks, prefix)}
`;
}

function techBody(item, prefix) {
  const indLinks = item.otrasli
    .map((s) => otrasli.find((o) => o.slug === s))
    .filter(Boolean)
    .map((o) => ({ label: o.h1, href: `otrasli/${o.slug}/` }));

  return `
${sectionOpen('', 'Технология', null)}
    <h1 class="sgs-h1">${esc(item.h1)}</h1>
    ${item.sub ? `<p class="sgs-sub">${esc(item.sub)}</p>` : ''}
    <p class="sgs-lead">${esc(item.lead)}</p>
${sectionClose}

${sectionOpen('sgs-text--light', 'Принцип', item.principleTitle)}
    ${parasOf(item.principle)}
${sectionClose}

${sectionOpen('', 'Преимущества', item.benefitsTitle)}
    ${listOf(item.benefits)}
${sectionClose}

${sectionOpen('sgs-text--light', 'Параметры', item.specsTitle)}
    <p>Значения приведены как диапазоны применимости технологии. Параметры для конкретного объекта уточняются по результатам обследования.</p>
    ${specTable(item.specs)}
${sectionClose}

${sectionOpen('', 'Контроль', item.controlTitle)}
    ${parasOf(item.control)}
${sectionClose}

${relatedLinks('Отрасли, где применяется технология', indLinks, prefix)}
`;
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

/* Подстраницы отраслей и технологий: шапка, текст, форма, подвал */
for (const item of otrasli) {
  PAGES.push({
    url: `/otrasli/${item.slug}/`,
    title: item.seoTitle,
    desc: item.seoDesc,
    records: [R.header, R.form, R.footer, ...UTIL],
    bodyAfterHeader: (prefix) => industryBody(item, prefix)
  });
}

for (const item of tehnologii) {
  PAGES.push({
    url: `/tehnologii/${item.slug}/`,
    title: item.seoTitle,
    desc: item.seoDesc,
    records: [R.header, R.form, R.footer, ...UTIL],
    bodyAfterHeader: (prefix) => techBody(item, prefix)
  });
}

for (const item of resheniya) {
  PAGES.push({
    url: `/resheniya/${item.slug}/`,
    title: item.seoTitle,
    desc: item.seoDesc,
    records: [R.header, R.form, R.footer, ...UTIL],
    bodyAfterHeader: (prefix) => solutionBody(item, prefix)
  });
}

const made = [];
for (const p of PAGES) made.push(await buildPage(p));

/* --- Карта сайта и robots ------------------------------------------------ */
const DOMAIN = 'https://souyzgeostab.kz';
const today = new Date().toISOString().slice(0, 10);

const priority = (url) => {
  if (url === '/') return '1.0';
  if (url.split('/').filter(Boolean).length === 1) return '0.9';
  return '0.8';
};

await writeFile(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${made.map((u) => `  <url>
    <loc>${DOMAIN}${u}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority(u)}</priority>
  </url>`).join('\n')}
</urlset>
`, 'utf8');

await writeFile(join(ROOT, 'robots.txt'),
  `User-agent: *
Allow: /
Disallow: /tools/

Sitemap: ${DOMAIN}/sitemap.xml
`, 'utf8');

console.log(`Собрано страниц: ${made.length}`);
made.forEach((u) => console.log('  ' + u));
console.log('sitemap.xml, robots.txt');
