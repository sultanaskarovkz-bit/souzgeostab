/* Генератор статики. Запуск: node tools/build.mjs
   На выходе — обычные .html в корне репозитория. Заливаются на хостинг как есть. */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { site, nav } from './site.mjs';
import { uslugi, uslugiIntro } from './content/uslugi.mjs';
import { tehnologii, tehnologiiIntro } from './content/tehnologii.mjs';
import { otrasli, otrasliIntro } from './content/otrasli.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* --- Помощники ---------------------------------------------------------- */
/* Длинные и средние тире приводим к обычному дефису: в вёрстке под Manrope
   они выглядели чужеродно и рвали строку. */
const esc = (s = '') => String(s)
  .replace(/[—–]/g, '-')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* --- Фотографии ---------------------------------------------------------
   Соответствие снято по контактному листу: каждой странице свой кадр,
   по возможности с реальных объектов и в фирменной форме.               */
const PHOTO = {
  hero:    { file: 'inekciya-osnovaniya-dvoe',   alt: 'Специалисты СоюзГеоСтаб выполняют инъекционное закрепление основания' },
  process: { file: 'shema-podem-plity-etapy',    alt: 'Схема этапов подъёма плиты инъекционным методом' },
  company: { file: 'brigada-zamery-na-obekte',   alt: 'Бригада СоюзГеоСтаб выполняет замеры на объекте' },
  team:    { file: 'brigada-na-obekte',          alt: 'Специалисты СоюзГеоСтаб на объекте' },
  stages:  { file: 'geodeziya-brigada-doroga',   alt: 'Геодезический контроль отметок на дорожном покрытии' },
  docs:    { file: 'geofizika-inzhener-planshet', alt: 'Инженер с данными обследования объекта' },
  cases:   { file: 'burovaya-ustanovka-jet-grouting', alt: 'Буровая установка на объекте' },
  contact: { file: 'inekciya-fundamenta-brigada', alt: 'Инъекционное усиление фундамента' },

  uslugi: {
    'usilenie-fundamentov':        { file: 'inekciya-fundamenta-krupno',  alt: 'Инъекционное усиление фундамента здания' },
    'podyem-plit-i-polov':         { file: 'podem-pola-sklad',            alt: 'Подъём промышленного пола склада инъекционным методом' },
    'ustranenie-vodopritokov':     { file: 'shema-otsechka-vodopritoka',  alt: 'Схема отсечки водопритока инъекционной завесой' },
    'zapolnenie-pustot':           { file: 'zapolnenie-pustoty-krupno',   alt: 'Заполнение пустоты под конструкцией' },
    'stabilizaciya-slabyh-gruntov':{ file: 'shema-jet-grouting-kolonna',  alt: 'Грунтоцементная колонна в разрезе основания' },
    'vodoponizhenie':              { file: 'vodoponizhenie-kotlovan',     alt: 'Водопонижение в котловане' },
    'avarijnye-raboty':            { file: 'tonnel-remont-obdelki',       alt: 'Аварийные работы в подземной выработке' }
  },

  tehnologii: {
    'jet-grouting':          { file: 'burovaya-ustanovka-jet-grouting', alt: 'Буровая установка Jet Grouting на объекте' },
    'deep-stabilization':    { file: 'shema-deep-stabilization',        alt: 'Разрез: зона закрепления грунта при глубинной стабилизации' },
    'floor-lifting':         { file: 'shema-podem-plity',               alt: 'Разрез: подъём плиты инъекционным составом' },
    'leak-sealing':          { file: 'inekciya-v-osnovanie-krupno',     alt: 'Инъекционная герметизация конструкции' },
    'void-filling':          { file: 'inekcionnye-pakery-v-betone',     alt: 'Инъекционные пакеры, установленные в бетон' },
    'dewatering':            { file: 'vodoponizhenie-kotlovan',         alt: 'Система водопонижения на объекте' },
    'geofizicheskiy-kontrol':{ file: 'geofizika-inzhener-planshet',     alt: 'Геофизическое обследование объекта' }
  },

  otrasli: {
    'gornodobyvayushchaya':     { file: 'shahta-gornaya-vyrabotka',   alt: 'Горная выработка шахты' },
    'stroitelnaya':             { file: 'zhilaya-zastrojka',          alt: 'Жилая застройка' },
    'transportnaya':            { file: 'otrasl-transportnaya',       alt: 'Автодорога, железная дорога и взлётно-посадочная полоса' },
    'gidrotehnicheskaya':       { file: 'gts-plotina-panorama',       alt: 'Гидротехническое сооружение' },
    'toplivno-energeticheskaya':{ file: 'obekt-tek-doroga',           alt: 'Объект топливно-энергетического комплекса' },
    'promyshlennye-obekty':     { file: 'promyshlennyj-obekt-rabota', alt: 'Работы на промышленном объекте' },
    'podzemnye-sooruzheniya':   { file: 'tonnel-rabota-v-vyrabotke',  alt: 'Работы в тоннеле' },
    'inzhenernaya-infrastruktura':{ file: 'inzhenernye-seti-kolodec', alt: 'Инженерные сети и колодец' }
  }
};

/* Адаптивная картинка: браузер сам берёт нужную ширину и не тянет
   1600px на телефон. */
function picture(photo, { cls = '', ratio = '', eager = false } = {}) {
  if (!photo) return '';
  return `<img src="/assets/img/${photo.file}-800.webp"
      srcset="/assets/img/${photo.file}-800.webp 800w, /assets/img/${photo.file}-1600.webp 1600w"
      sizes="${ratio || '(max-width: 620px) 100vw, (max-width: 980px) 50vw, 33vw'}"
      alt="${esc(photo.alt)}"${cls ? ` class="${cls}"` : ''}
      loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;
}

const byslug = (list) => Object.fromEntries(list.map((x) => [x.slug, x]));
const U = byslug(uslugi), T = byslug(tehnologii), O = byslug(otrasli);

const navChildren = {
  uslugi: uslugi.map((x) => ({ title: x.nav, href: `/uslugi/${x.slug}/` })),
  tehnologii: tehnologii.map((x) => ({ title: x.nav, href: `/tehnologii/${x.slug}/` })),
  otrasli: otrasli.map((x) => ({ title: x.nav, href: `/otrasli/${x.slug}/` }))
};

/* --- Микроразметка ------------------------------------------------------ */
function orgSchema() {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    legalName: site.legalName,
    url: site.domain,
    description: site.tagline,
    logo: `${site.domain}/assets/img/logo.png`,
    telephone: site.phone,
    email: site.email,
    areaServed: { '@type': 'Country', name: 'Казахстан' },
    contactPoint: [{
      '@type': 'ContactPoint',
      telephone: site.phone,
      contactType: 'sales',
      availableLanguage: ['ru', 'kk']
    }]
  };
  // Адрес добавится, как только заказчик его пришлёт — пустой PostalAddress хуже,
  // чем его отсутствие: Google не любит незаполненные обязательные поля.
  if (site.address) {
    org.address = {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      postalCode: site.address.postal,
      addressCountry: 'KZ'
    };
  }
  return org;
}

function crumbSchema(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.title,
      item: site.domain + c.href
    }))
  };
}

function faqSchema(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

function serviceSchema(p, path) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: p.h1,
    description: p.seoDesc,
    url: site.domain + path,
    serviceType: p.h1,
    provider: { '@type': 'Organization', name: site.legalName, url: site.domain },
    areaServed: { '@type': 'Country', name: 'Казахстан' }
  };
}

/* Все ссылки в шаблонах пишутся от корня («/uslugi/»), а на выходе
   переводятся в относительные («../uslugi/»). Так страницы открываются
   и с хостинга, и двойным кликом по файлу — последнее нужно, чтобы
   показывать сайт заказчику без сервера.

   Исключение — 404.html: Apache отдаёт его по произвольному адресу,
   и базой для относительных путей станет несуществующая папка. Там
   пути обязаны остаться абсолютными. */
function relativize(html, path, absolute) {
  // Длинные и средние тире меняем на обычный дефис на выходе, а не в esc():
  // часть текста написана прямо в шаблонах и через экранирование не проходит.
  html = html.replace(/[—–]/g, '-');

  if (absolute) return html;

  const parts = path.split('/').filter(Boolean);
  const depth = path.endsWith('/') ? parts.length : parts.length - 1;
  const prefix = depth > 0 ? '../'.repeat(depth) : '';

  return html
    // Ссылка на главную: пустая строка сломала бы href
    .replace(/(href|src)="\/"/g, `$1="${prefix || './'}"`)
    // Всё остальное от корня, кроме //cdn и полных URL
    .replace(/(href|src)="\/(?!\/)/g, `$1="${prefix}`);
}

/* --- Каркас документа --------------------------------------------------- */
function layout({ title, desc, path, schemas = [], body, crumbs, absolute }) {
  const canonical = site.domain + path;
  const ld = schemas.filter(Boolean)
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n  ');

  const analytics = [
    site.ga4 && `<script async src="https://www.googletagmanager.com/gtag/js?id=${site.ga4}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${site.ga4}');</script>`,
    site.metrika && `<script>window.YM_ID=${site.metrika};(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${site.metrika},'init',{webvisor:true,clickmap:true,trackLinks:true,accurateTrackBounce:true});</script>`
  ].filter(Boolean).join('\n  ');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonical}">
  <meta name="google-site-verification" content="${site.gscVerify}">

  <!-- Предпросмотр ссылки в WhatsApp, Telegram, Facebook, LinkedIn.
       Размеры указаны явно: без них мессенджеры иногда рисуют мелкую
       квадратную превьюшку вместо широкой карточки. -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${site.domain}/assets/img/og.jpg">
  <meta property="og:image:secure_url" content="${site.domain}/assets/img/og.jpg">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="СоюзГеоСтаб - инъекционные технологии и геотехнические решения">
  <meta property="og:locale" content="ru_RU">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${site.domain}/assets/img/og.jpg">

  <meta name="theme-color" content="#0d1b2a">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" type="image/png" sizes="16x16" href="/assets/img/favicon-16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png">
  <link rel="icon" type="image/png" sizes="48x48" href="/assets/img/favicon-48.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/img/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap&subset=cyrillic,latin">
  <link rel="stylesheet" href="/assets/css/main.css">

  ${ld}
  ${analytics}
</head>
<body>
<a class="skip-link" href="#main">Перейти к содержанию</a>
${header(path)}
${mobileNav()}
<main id="main">
${crumbs ? breadcrumbs(crumbs) : ''}
${body}
</main>
${footer()}
${waFloat()}
<script src="/assets/js/main.js" defer></script>
</body>
</html>
`;

  return relativize(html, path, absolute);
}

/* --- Шапка -------------------------------------------------------------- */
function header(path) {
  const links = nav.map((item) => {
    const active = path === item.href || (item.href !== '/' && path.startsWith(item.href));
    const cls = `nav__link${active ? ' is-active' : ''}`;
    if (!item.children) {
      return `<li class="nav__item"><a class="${cls}" href="${item.href}"${active ? ' aria-current="page"' : ''}>${esc(item.title)}</a></li>`;
    }
    const panel = navChildren[item.children]
      .map((c) => `<a href="${c.href}">${esc(c.title)}</a>`).join('\n            ');
    return `<li class="nav__item">
          <a class="${cls}" href="${item.href}"${active ? ' aria-current="page"' : ''}>${esc(item.title)}</a>
          <div class="nav__panel">
            ${panel}
          </div>
        </li>`;
  }).join('\n        ');

  return `<header class="header">
  <div class="wrap header__inner">
    <a class="header__brand" href="/" aria-label="${esc(site.name)} — на главную">
      <img class="header__logo" src="/assets/img/logo-dark.svg" alt="${esc(site.name)}" width="180" height="30">
    </a>
    <nav class="nav" aria-label="Основная навигация">
      <ul style="display:flex;align-items:center;gap:.25rem">
        ${links}
      </ul>
    </nav>
    <a class="header__phone" href="${site.phoneHref}">${esc(site.phone)}</a>
    <div class="header__cta">
      <a class="btn btn--primary" href="/kontakty/#zayavka">Оценить объект</a>
    </div>
    <button class="burger" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Открыть меню">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;
}

function mobileNav() {
  const group = (title, items) => `<div class="mobile-nav__group">
      <div class="mobile-nav__title">${esc(title)}</div>
      ${items.map((i) => `<a href="${i.href}">${esc(i.title)}</a>`).join('\n      ')}
    </div>`;

  return `<div class="mobile-nav" id="mobile-nav" data-open="false">
  <div class="mobile-nav__inner">
    ${group('Услуги', [{ title: 'Все услуги', href: '/uslugi/' }, ...navChildren.uslugi])}
    ${group('Технологии', [{ title: 'Все технологии', href: '/tehnologii/' }, ...navChildren.tehnologii])}
    ${group('Отрасли', [{ title: 'Все отрасли', href: '/otrasli/' }, ...navChildren.otrasli])}
    ${group('Компания', [
      { title: 'Этапы работ', href: '/etapy-raboty/' },
      { title: 'Кейсы', href: '/kejsy/' },
      { title: 'Документы', href: '/dokumenty/' },
      { title: 'О компании', href: '/o-kompanii/' },
      { title: 'Контакты', href: '/kontakty/' }
    ])}
    <div class="btn-row">
      <a class="btn btn--primary" href="${site.phoneHref}">${esc(site.phone)}</a>
      <a class="btn btn--wa" href="${site.whatsapp}" rel="noopener">WhatsApp</a>
    </div>
  </div>
</div>`;
}

/* --- Хлебные крошки ----------------------------------------------------- */
function breadcrumbs(crumbs) {
  const items = crumbs.map((c, i) =>
    i === crumbs.length - 1
      ? `<li aria-current="page">${esc(c.title)}</li>`
      : `<li><a href="${c.href}">${esc(c.title)}</a></li>`
  ).join('\n      ');
  return `<div class="wrap">
  <nav aria-label="Хлебные крошки">
    <ol class="crumbs">
      ${items}
    </ol>
  </nav>
</div>`;
}

/* --- Подвал ------------------------------------------------------------- */
function footer() {
  const col = (title, items) => `<div>
        <div class="footer__title">${esc(title)}</div>
        <ul>
          ${items.map((i) => `<li><a href="${i.href}">${esc(i.title)}</a></li>`).join('\n          ')}
        </ul>
      </div>`;

  return `<footer class="footer">
  <div class="wrap">
    <div class="footer__grid">
      ${col('Услуги', navChildren.uslugi)}
      ${col('Технологии', navChildren.tehnologii)}
      ${col('Отрасли', navChildren.otrasli.slice(0, 8))}
      <div>
        <div class="footer__title">Компания</div>
        <ul>
          <li><a href="/o-kompanii/">О компании</a></li>
          <li><a href="/etapy-raboty/">Этапы работ</a></li>
          <li><a href="/kejsy/">Кейсы</a></li>
          <li><a href="/dokumenty/">Документы</a></li>
          <li><a href="/kontakty/">Контакты</a></li>
        </ul>
        <div class="footer__title" style="margin-top:1.75rem">Связаться</div>
        <ul>
          <li><a href="${site.phoneHref}">${esc(site.phone)}</a></li>
          <li><a href="${site.emailHref}">${esc(site.email)}</a></li>
          <li><a href="${site.whatsapp}" rel="noopener">WhatsApp</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <span>© ${site.year} ${esc(site.name)}. Инженерные решения для устойчивости оснований, фундаментов, массивов и сооружений.</span>
      <span>${esc(site.tagline)}</span>
    </div>
  </div>
</footer>`;
}

function waFloat() {
  return `<a class="wa-float" href="${site.whatsapp}" rel="noopener" aria-label="Написать в WhatsApp">
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2z"/></svg>
</a>`;
}

/* --- Форма заявки ------------------------------------------------------- */
function leadForm(id = 'zayavka') {
  return `<form class="form" data-lead-form action="${site.formAction}" method="post" id="${id}">
      <input type="hidden" name="page" value="">
      <input type="hidden" name="utm_source" value=""><input type="hidden" name="utm_medium" value="">
      <input type="hidden" name="utm_campaign" value=""><input type="hidden" name="utm_term" value="">
      <input type="hidden" name="utm_content" value="">
      <div style="position:absolute;left:-9999px" aria-hidden="true">
        <label for="${id}-hp">Не заполняйте это поле</label>
        <input id="${id}-hp" type="text" name="company_website" tabindex="-1" autocomplete="off">
      </div>

      <div class="form__row">
        <div class="field">
          <label for="${id}-name">Как к вам обращаться</label>
          <input id="${id}-name" name="name" type="text" autocomplete="name" required>
          <div class="field__error" role="alert"></div>
        </div>
        <div class="field">
          <label for="${id}-phone">Телефон</label>
          <input id="${id}-phone" name="phone" type="tel" autocomplete="tel" placeholder="+7 ___ ___ __ __" required>
          <div class="field__error" role="alert"></div>
        </div>
      </div>

      <div class="field">
        <label for="${id}-email">Почта</label>
        <input id="${id}-email" name="email" type="email" autocomplete="email">
        <div class="field__error" role="alert"></div>
      </div>

      <div class="field">
        <label for="${id}-msg">Что происходит на объекте</label>
        <textarea id="${id}-msg" name="message" rows="5" placeholder="Тип объекта, что наблюдаете: трещины, просадка, вода. Есть ли геология и материалы обследований."></textarea>
      </div>

      <div class="btn-row" style="margin-top:.5rem">
        <button class="btn btn--primary" type="submit">Отправить заявку</button>
        <a class="btn btn--wa" href="${site.whatsapp}" rel="noopener">Написать в WhatsApp</a>
      </div>

      <p class="form__note">Нажимая кнопку, вы соглашаетесь на обработку персональных данных. Материалы по объекту можно прислать на <a href="${site.emailHref}">${esc(site.email)}</a> — так мы ответим предметнее.</p>
      <div class="form__status" role="status" aria-live="polite" hidden></div>
    </form>`;
}

/* --- Блок «Нужна оценка объекта» ---------------------------------------- */
function ctaSection() {
  return `<section class="section section--deep">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Оценка объекта</p>
        <h2 class="h2">Опишите задачу — скажем, что с ней делать</h2>
        <div class="prose" style="margin-top:1.5rem">
          <p>Направьте описание проблемы, фото, материалы обследований, данные по геологии, водопритокам, осадкам, кренам или деформациям. Мы предварительно оценим задачу и предложим инженерное решение.</p>
          <p>Также можно заказать выезд специалиста на объект — для обследования, инструментальной диагностики и подготовки рекомендаций по устранению проблемы.</p>
        </div>
        <div class="btn-row">
          <a class="btn btn--ghost" href="${site.phoneHref}">${esc(site.phone)}</a>
        </div>
      </div>
      <div>
        ${leadForm()}
      </div>
    </div>
  </div>
</section>`;
}

/* --- Карточки ----------------------------------------------------------- */
/* Карточка-призыв. Ставится последней, чтобы 7 услуг в сетке из 4 колонок
   не оставляли пустую ячейку. */
function ctaCard(text) {
  return `<article class="card card--cta reveal">
      <div class="card__body">
        <h3 class="card__title">Не нашли свою задачу?</h3>
        <p class="card__text">${esc(text)}</p>
        <span class="card__meta">Описать объект</span>
      </div>
      <a class="card__link" href="/kontakty/#zayavka"><span class="visually-hidden">Описать объект</span></a>
    </article>`;
}

function cardsGrid(items, cols = 3, cta) {
  return `<div class="grid grid--${cols}">
    ${items.map((i) => `<article class="card reveal">
      ${i.photo ? `<div class="card__media">${picture(i.photo)}</div>` : ''}
      <div class="card__body">
        <h3 class="card__title">${esc(i.title)}</h3>
        <p class="card__text">${esc(i.text)}</p>
        <span class="card__meta">${esc(i.meta || 'Подробнее')}</span>
      </div>
      <a class="card__link" href="${i.href}"><span class="visually-hidden">${esc(i.title)}</span></a>
    </article>`).join('\n    ')}
    ${cta ? ctaCard(cta) : ''}
  </div>`;
}

/* Перечень фактов: признаки, объекты, условия. Это не навигация — ссылками
   такие пункты делать нельзя, иначе читалка объявит их переходами в никуда. */
function factList(items) {
  return `<ul class="facts">
    ${items.map((t) => `<li>${esc(t)}</li>`).join('\n    ')}
  </ul>`;
}

function linkList(items) {
  return `<ul class="linklist">
    ${items.map((i) => `<li><a href="${i.href}"><span>${esc(i.title)}</span><span class="linklist__note">${esc(i.note || '')}</span></a></li>`).join('\n    ')}
  </ul>`;
}

function specTable(title, rows) {
  return `<div class="spec-wrap">
    <table class="spec">
      <caption class="visually-hidden">${esc(title)}</caption>
      <tbody>
        ${rows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('\n        ')}
      </tbody>
    </table>
  </div>`;
}

function faqBlock(faq) {
  return `<section class="section section--tight section--tint">
  <div class="wrap">
    <p class="eyebrow">Частые вопросы</p>
    <h2 class="h2">Что спрашивают чаще всего</h2>
    <div class="grid grid--2" style="margin-top:2.5rem">
      ${faq.map((f) => `<div class="card reveal">
        <h3 class="card__title">${esc(f.q)}</h3>
        <p class="card__text">${esc(f.a)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`;
}

/* --- Этапы работ -------------------------------------------------------- */
const etapy = [
  { t: 'Обследование объекта', d: 'Изучаем дефекты, историю эксплуатации, материалы обследований, геологию, водопритоки, необходимость осушения, осадки и доступность участка.' },
  { t: 'Диагностика и модель проблемы', d: 'Определяем предполагаемые зоны пустот, ослабления, фильтрации, просадок, кренов и деформаций.' },
  { t: 'Подбор технологии', d: 'Выбираем материал, схему бурения, глубину, шаг, последовательность инъекций и необходимость совмещения технологий.' },
  { t: 'Выполнение работ', d: 'Проводим бурение, установку инъекционных элементов, подачу состава и оперативный контроль параметров.' },
  { t: 'Контроль результата', d: 'Оцениваем фактическое заполнение, стабилизацию, снижение водопритока, подъём или восстановление положения конструкции.' },
  { t: 'Отчёт и рекомендации', d: 'Передаём заказчику техническое заключение, исполнительную информацию и рекомендации по дальнейшей эксплуатации.' }
];

function stepsBlock() {
  return `<ol class="steps">
    ${etapy.map((s) => `<li class="step reveal">
      <div>
        <h3 class="step__title">${esc(s.t)}</h3>
        <p class="step__text">${esc(s.d)}</p>
      </div>
    </li>`).join('\n    ')}
  </ol>`;
}

/* ==========================================================================
   Анимированный разрез: как работает инъекционная стабилизация.
   Геометрия «корней» построена генератором, а не нарисована на глаз —
   так ветвление выглядит естественно и повторяет реальные фото объектов.
   ========================================================================== */

/* Детерминированный псевдослучайный ряд: при пересборке картинка та же,
   diff не шумит. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function rootCluster(cx, cy, seed, delayBase) {
  const rand = rng(seed);
  const paths = [];
  const BRANCHES = 13;

  for (let i = 0; i < BRANCHES; i++) {
    // Веер вниз и в стороны: состав идёт по пути наименьшего сопротивления,
    // вверх к плите его прижимает, поэтому сектор шире по горизонтали
    const a = Math.PI * (0.06 + 0.88 * (i / (BRANCHES - 1))) + (rand() - 0.5) * 0.16;
    const len = 52 + rand() * 76;

    const ex = cx - Math.cos(a) * len;
    const ey = cy + Math.sin(a) * len * 0.52;
    const mx = cx - Math.cos(a) * len * 0.5 + (rand() - 0.5) * 26;
    const my = cy + Math.sin(a) * len * 0.28 - 8 - rand() * 10;

    const dist = Math.hypot(ex - cx, ey - cy);
    const w = (1.9 + rand() * 1.7).toFixed(2);
    const delay = (delayBase + 0.1 + rand() * 0.5).toFixed(2);

    paths.push(
      `<path class="inj-root" d="M${cx.toFixed(0)} ${cy.toFixed(0)} Q${mx.toFixed(0)} ${my.toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}" ` +
      `stroke-width="${w}" opacity="${(0.55 + rand() * 0.45).toFixed(2)}" ` +
      `style="--len:${Math.round(dist * 1.5)};--delay:${delay}s"/>`
    );

    // Ответвление от середины основной ветки
    if (rand() > 0.42) {
      const bx = ex - Math.cos(a + 0.7) * len * 0.4;
      const by = ey + Math.sin(a + 0.7) * len * 0.22;
      const bdist = Math.hypot(bx - ex, by - ey);
      paths.push(
        `<path class="inj-root" d="M${ex.toFixed(0)} ${ey.toFixed(0)} Q${((ex + bx) / 2).toFixed(0)} ${(ey - 6).toFixed(0)} ${bx.toFixed(0)} ${by.toFixed(0)}" ` +
        `stroke-width="1.3" opacity="0.5" ` +
        `style="--len:${Math.round(bdist * 1.5)};--delay:${(Number(delay) + 0.45).toFixed(2)}s"/>`
      );
    }
  }

  return paths.join('\n        ');
}

function processSection() {
  const POINTS = [
    { x: 300, seed: 1207, delay: 0.9 },
    { x: 600, seed: 4451, delay: 1.35 },
    { x: 900, seed: 9013, delay: 1.8 }
  ];

  const SLAB_Y = 120, SLAB_H = 30, GROUND_Y = 150, TIP_Y = 248;

  const H = 356;

  const pipes = POINTS.map((p) =>
    `<line class="inj-pipe" x1="${p.x}" y1="${SLAB_Y - 48}" x2="${p.x}" y2="${TIP_Y}" style="--delay:${(p.delay - 0.75).toFixed(2)}s"/>
        <circle class="inj-glow" cx="${p.x}" cy="${SLAB_Y - 52}" r="7" fill="#c8d3de" style="--delay:${(p.delay - 0.75).toFixed(2)}s"/>`
  ).join('\n        ');

  const glows = POINTS.map((p) =>
    `<ellipse class="inj-glow" cx="${p.x}" cy="${TIP_Y + 4}" rx="140" ry="54" fill="url(#injGlow)" style="--delay:${(p.delay + 0.5).toFixed(2)}s"/>`
  ).join('\n        ');

  const roots = POINTS.map((p) => rootCluster(p.x, TIP_Y, p.seed, p.delay)).join('\n        ');

  const arrows = POINTS.map((p) =>
    `<g class="lift-arrow"><path d="M${p.x} ${SLAB_Y - 66} l0 -30 M${p.x} ${SLAB_Y - 96} l-8 10 M${p.x} ${SLAB_Y - 96} l8 10"
        stroke="#f2a900" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`
  ).join('\n        ');

  // Слои породы: горизонтали с лёгким уклоном, как на реальном разрезе
  const strata = Array.from({ length: 6 }, (_, i) => {
    const y = GROUND_Y + 30 + i * 40;
    return `<path d="M0 ${y} C 300 ${y - 7}, 900 ${y + 8}, 1200 ${y - 4}" stroke="rgba(255,255,255,.06)" stroke-width="1.5" fill="none"/>`;
  }).join('\n        ');

  return `<section class="process" aria-labelledby="process-title">
  <div class="wrap" style="padding-top:var(--section-y);padding-bottom:clamp(1.5rem,3vw,2.5rem)">
    <p class="eyebrow">Как это работает</p>
    <h2 class="h2" id="process-title">Состав уходит в грунт, заполняет пустоту и поднимает конструкцию</h2>
    <p class="lead muted" style="margin-top:1rem">Разрез основания под плитой. Схема повторяет реальную последовательность работ: бурение, подача состава, уплотнение, контролируемый подъём.</p>
  </div>

  <div class="process__figure" data-process>
    <svg class="process__svg" viewBox="0 0 1200 ${H}" preserveAspectRatio="xMidYMid slice" role="img"
         aria-label="Схема: инъекционный состав заполняет пустоты под плитой и поднимает её в проектное положение">
      <defs>
        <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#1e2c3a"/>
          <stop offset="55%"  stop-color="#121e2a"/>
          <stop offset="100%" stop-color="#070d14"/>
        </linearGradient>
        <linearGradient id="slabGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#e8eef4"/>
          <stop offset="100%" stop-color="#a7b5c4"/>
        </linearGradient>
        <radialGradient id="injGlow">
          <stop offset="0%"   stop-color="#f2a900" stop-opacity="0.40"/>
          <stop offset="55%"  stop-color="#f2a900" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#f2a900" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <rect x="0" y="${GROUND_Y}" width="1200" height="${H - GROUND_Y}" fill="url(#groundGrad)"/>
      ${strata}

      <!-- Пустоты и зоны разуплотнения до начала работ -->
      <ellipse cx="330" cy="${GROUND_Y + 22}" rx="120" ry="19" fill="#04080d" opacity="0.8"/>
      <ellipse cx="640" cy="${GROUND_Y + 17}" rx="150" ry="14" fill="#04080d" opacity="0.65"/>
      <ellipse cx="905" cy="${GROUND_Y + 24}" rx="106" ry="20" fill="#04080d" opacity="0.75"/>

      ${glows}
      ${roots}

      <g class="slab-lift">
        <rect x="0" y="${SLAB_Y}" width="1200" height="${SLAB_H}" fill="url(#slabGrad)"/>
        <rect x="0" y="${SLAB_Y}" width="1200" height="3" fill="#ffffff" opacity="0.6"/>
        <line x1="410" y1="${SLAB_Y}" x2="410" y2="${SLAB_Y + SLAB_H}" stroke="#8d9aa8" stroke-width="2"/>
        <line x1="800" y1="${SLAB_Y}" x2="800" y2="${SLAB_Y + SLAB_H}" stroke="#8d9aa8" stroke-width="2"/>
      </g>

      ${pipes}
      ${arrows}
    </svg>
  </div>

  <div class="process__steps">
    <div class="process__step" data-step="0"><h3>1. Бурение</h3><p>Отверстия 18-22 мм по расчётной сетке. Конструкция не демонтируется.</p></div>
    <div class="process__step" data-step="1"><h3>2. Подача состава</h3><p>Состав идёт по пути наименьшего сопротивления и заполняет пустоты.</p></div>
    <div class="process__step" data-step="2"><h3>3. Уплотнение</h3><p>Расширяясь, состав уплотняет грунт и армирует основание.</p></div>
    <div class="process__step" data-step="3"><h3>4. Подъём</h3><p>Плита выходит на проектную отметку под геодезическим контролем.</p></div>
  </div>
</section>`;
}

/* --- Главная ------------------------------------------------------------ */
function homePage() {
  const body = `
<section class="hero">
  <div class="hero__media">
    ${picture(PHOTO.hero, { ratio: '100vw', eager: true })}
  </div>
  <div class="wrap hero__inner">
    <p class="eyebrow">Инъекционные технологии и геотехнические решения</p>
    <h1 class="hero__title">Укрепляем основания. Поднимаем фундаменты. <em>Останавливаем воду.</em></h1>
    <p class="hero__lead">Инженерная компания для горнодобывающей промышленности, строительства, инфраструктуры и гидротехнических сооружений. Подбираем технологию под фактическую проблему объекта: от слабого грунта и пустот до осадок фундаментов и деформаций сооружений.</p>
    <div class="btn-row">
      <a class="btn btn--primary" href="/kontakty/#zayavka">Оценить объект</a>
      <a class="btn btn--ghost" href="/tehnologii/">Посмотреть технологии</a>
    </div>
  </div>
</section>

<div class="wrap">
  <div class="metrics">
    <div class="metric"><div class="metric__value">2 мм</div><p class="metric__label">точность выхода конструкции на проектную отметку</p></div>
    <div class="metric"><div class="metric__value">15-30 мин</div><p class="metric__label">до возврата эксплуатационной нагрузки</p></div>
    <div class="metric"><div class="metric__value">30 м</div><p class="metric__label">глубина стабилизации основания</p></div>
    <div class="metric"><div class="metric__value">0,1 мм</div><p class="metric__label">минимальное раскрытие герметизируемых трещин</p></div>
  </div>
</div>

<section class="section section--light">
  <div class="wrap">
    <p class="eyebrow">Услуги</p>
    <h2 class="h2">Какие задачи мы решаем</h2>
    <p class="lead" style="margin-top:1rem">Работаем с объектами, где нужен не косметический ремонт, а устранение причин деформаций, водопритоков и пустот: там, где традиционные методы оказываются неэффективными.</p>
    <div style="margin-top:2.25rem">
      ${cardsGrid(uslugi.map((u) => ({
        title: u.h1, text: u.lead, href: `/uslugi/${u.slug}/`, photo: PHOTO.uslugi[u.slug]
      })), 4, 'Опишите, что происходит на объекте: разберёмся и скажем, какая технология применима, а какая нет.')}
    </div>
  </div>
</section>

${processSection()}

<section class="section section--light">
  <div class="wrap">
    <div class="split split--sticky">
      <div>
        <p class="eyebrow">Технологии</p>
        <h2 class="h2">Мы не продаём технологию</h2>
        <div class="prose" style="margin-top:1.5rem">
          <p>Мы определяем причину возникновения дефекта и подбираем метод, который обеспечит результат с минимальными сроками, рисками и затратами, с учётом геологии, гидрогеологических условий, состояния конструкций и характера дефекта.</p>
        </div>
        <figure class="figure figure--wide" style="margin-top:2rem">
          ${picture(PHOTO.tehnologii['jet-grouting'], { ratio: '(max-width: 900px) 100vw, 42vw' })}
          <figcaption>Буровая установка Jet Grouting на объекте</figcaption>
        </figure>
        <div class="btn-row"><a class="btn btn--ghost" href="/tehnologii/">Все технологии</a></div>
      </div>
      <div>
        ${linkList(tehnologii.map((t) => ({ title: t.h1, href: `/tehnologii/${t.slug}/`, note: t.nav })))}
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <p class="eyebrow">Отрасли</p>
    <h2 class="h2">Где мы работаем</h2>
    <p class="lead" style="margin-top:1.25rem">${esc(otrasliIntro.lead)}</p>
    <div style="margin-top:2.25rem">
      ${cardsGrid(otrasli.map((o) => ({
        title: o.h1, text: o.lead, href: `/otrasli/${o.slug}/`,
        meta: 'Смотреть отрасль', photo: PHOTO.otrasli[o.slug]
      })), 4)}
    </div>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Этапы работ</p>
        <h2 class="h2">От обследования до отчёта</h2>
        <div class="prose" style="margin-top:1.5rem">
          <p>Последовательность одинакова на любом объекте: сначала выясняем причину, потом подбираем технологию, и только затем работаем. Результат подтверждается измерением, а не объёмом израсходованного материала.</p>
        </div>
        <div class="btn-row"><a class="btn btn--ghost" href="/etapy-raboty/">Подробнее об этапах</a></div>
      </div>
      <div>${stepsBlock()}</div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="callout reveal">
      <p class="eyebrow">Документы</p>
      <h2 class="h2">Буклет и лифлет компании</h2>
      <p class="lead" style="margin-top:1.25rem">Краткое описание технологий, областей применения и порядка работы — в формате, который удобно передать техническому директору или в отдел закупок.</p>
      <div class="btn-row">
        <a class="btn btn--primary" href="/dokumenty/">Смотреть документы</a>
      </div>
    </div>
  </div>
</section>

${ctaSection()}
`;

  return layout({
    title: 'СоюзГеоСтаб — инъекционные технологии и геотехнические решения в Казахстане',
    desc: 'Усиление фундаментов, подъём плит и полов, устранение водопритоков, стабилизация грунтов, Jet Grouting и глубинная стабилизация. Работы без демонтажа конструкций и остановки эксплуатации объекта.',
    path: '/',
    schemas: [orgSchema(), {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.name,
      url: site.domain
    }],
    body
  });
}

/* --- Хабы --------------------------------------------------------------- */
function hubPage({ intro, items, base, kind }) {
  const crumbs = [{ title: 'Главная', href: '/' }, { title: intro.eyebrow, href: base }];
  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">${esc(intro.eyebrow)}</p>
    <h1 class="h1 page-head__title">${esc(intro.h1)}</h1>
    <p class="lead">${esc(intro.lead)}</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    ${cardsGrid(items.map((i) => ({
      title: i.h1, text: i.lead, href: `${base}${i.slug}/`, photo: PHOTO[kind][i.slug]
    })), 4, kind === 'otrasli' ? null : 'Опишите объект и что на нём происходит: скажем, применима ли наша технология к вашей задаче.')}
    <p class="lead muted" style="margin-top:2.5rem">${esc(intro.outro)}</p>
  </div>
</section>

${ctaSection()}
`;
  return layout({
    title: intro.seoTitle, desc: intro.seoDesc, path: base,
    schemas: [crumbSchema(crumbs)], body, crumbs
  });
}

/* --- Страница услуги ---------------------------------------------------- */
function uslugaPage(p) {
  const path = `/uslugi/${p.slug}/`;
  const crumbs = [{ title: 'Главная', href: '/' }, { title: 'Услуги', href: '/uslugi/' }, { title: p.nav, href: path }];

  const body = `
<section class="page-head page-head--media">
  <div class="wrap">
    <div class="page-head__media">${picture(PHOTO.uslugi[p.slug], { ratio: '100vw', eager: true })}</div>
    <p class="eyebrow">Услуга</p>
    <h1 class="h1 page-head__title">${esc(p.h1)}</h1>
    <p class="lead">${esc(p.lead)}</p>
    <div class="btn-row">
      <a class="btn btn--primary" href="#zayavka">Описать объект</a>
      <a class="btn btn--wa" href="${site.whatsapp}" rel="noopener">WhatsApp</a>
    </div>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <div class="split split--sticky">
      <div>
        <p class="eyebrow">Признаки</p>
        <h2 class="h2">${esc(p.signsTitle)}</h2>
        <p class="prose" style="margin-top:1.25rem"><span class="muted">${esc(p.signsNote)}</span></p>
      </div>
      <div>
        ${factList(p.signs)}
      </div>
    </div>
  </div>
</section>

<section class="section section--deep">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Порядок работ</p>
        <h2 class="h2">${esc(p.workTitle)}</h2>
      </div>
      <div class="prose">
        ${p.work.map((t) => `<p>${esc(t)}</p>`).join('\n        ')}
      </div>
    </div>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Параметры</p>
        <h2 class="h2">${esc(p.specsTitle)}</h2>
        <p class="prose muted" style="margin-top:1.25rem">Значения приведены как диапазоны применимости технологии. Конкретные параметры для вашего объекта определяются по результатам обследования.</p>
      </div>
      <div>${specTable(p.specsTitle, p.specs)}</div>
    </div>
  </div>
</section>

<section class="section section--deep">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Контроль</p>
        <h2 class="h2">${esc(p.controlTitle)}</h2>
      </div>
      <div class="prose">
        ${p.control.map((t) => `<p>${esc(t)}</p>`).join('\n        ')}
      </div>
    </div>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <p class="eyebrow">Чем решается</p>
    <h2 class="h2">Технологии для этой задачи</h2>
    <div style="margin-top:2.5rem">
      ${cardsGrid(p.tech.map((s) => ({ title: T[s].h1, text: T[s].lead, href: `/tehnologii/${s}/`, meta: 'Технология', photo: PHOTO.tehnologii[s] })), 3)}
    </div>

    <h2 class="h2" style="margin-top:4rem">Отрасли, где это применяется</h2>
    <div style="margin-top:2rem">
      ${linkList(p.otrasli.map((s) => ({ title: O[s].h1, href: `/otrasli/${s}/`, note: O[s].nav })))}
    </div>
  </div>
</section>

${faqBlock(p.faq)}
${ctaSection()}
`;

  return layout({
    title: p.seoTitle, desc: p.seoDesc, path,
    schemas: [serviceSchema(p, path), crumbSchema(crumbs), faqSchema(p.faq)],
    body, crumbs
  });
}

/* --- Страница технологии ------------------------------------------------ */
function tehPage(p) {
  const path = `/tehnologii/${p.slug}/`;
  const crumbs = [{ title: 'Главная', href: '/' }, { title: 'Технологии', href: '/tehnologii/' }, { title: p.nav, href: path }];

  const body = `
<section class="page-head page-head--media">
  <div class="wrap">
    <div class="page-head__media">${picture(PHOTO.tehnologii[p.slug], { ratio: '100vw', eager: true })}</div>
    <p class="eyebrow">Технология</p>
    <h1 class="h1 page-head__title">${esc(p.h1)}</h1>
    <p class="lead">${esc(p.lead)}</p>
    <div class="btn-row">
      <a class="btn btn--primary" href="#zayavka">Подобрать решение</a>
      <a class="btn btn--ghost" href="${site.phoneHref}">${esc(site.phone)}</a>
    </div>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Принцип</p>
        <h2 class="h2">${esc(p.principleTitle)}</h2>
      </div>
      <div class="prose">
        ${p.principle.map((t) => `<p>${esc(t)}</p>`).join('\n        ')}
      </div>
    </div>
  </div>
</section>

<section class="section section--deep">
  <div class="wrap">
    <p class="eyebrow">Варианты</p>
    <h2 class="h2">${esc(p.variantsTitle)}</h2>
    <div class="grid grid--3" style="margin-top:2.5rem">
      ${p.variants.map((v) => `<div class="card reveal">
        <h3 class="card__title">${esc(v.name)}</h3>
        <p class="card__text">${esc(v.text)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Параметры</p>
        <h2 class="h2">${esc(p.specsTitle)}</h2>
        <p class="prose muted" style="margin-top:1.25rem">Диапазоны применимости технологии. Параметры для конкретного объекта уточняются по результатам обследования и опытного участка.</p>
      </div>
      <div>${specTable(p.specsTitle, p.specs)}</div>
    </div>
  </div>
</section>

<section class="section section--deep">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Применение</p>
        <h2 class="h2">${esc(p.applicationTitle)}</h2>
      </div>
      <div>
        ${factList(p.application)}
      </div>
    </div>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Контроль</p>
        <h2 class="h2">${esc(p.controlTitle)}</h2>
      </div>
      <div class="prose">
        ${p.control.map((t) => `<p>${esc(t)}</p>`).join('\n        ')}
      </div>
    </div>
  </div>
</section>

<section class="section section--deep">
  <div class="wrap">
    <p class="eyebrow">Связанные задачи</p>
    <h2 class="h2">Что решается этой технологией</h2>
    <div style="margin-top:2.5rem">
      ${cardsGrid(p.uslugi.map((s) => ({ title: U[s].h1, text: U[s].lead, href: `/uslugi/${s}/`, meta: 'Услуга', photo: PHOTO.uslugi[s] })),3)}
    </div>

    <h2 class="h2" style="margin-top:4rem">Отрасли применения</h2>
    <div style="margin-top:2rem">
      ${linkList(p.otrasli.map((s) => ({ title: O[s].h1, href: `/otrasli/${s}/`, note: O[s].nav })))}
    </div>
  </div>
</section>

${faqBlock(p.faq)}
${ctaSection()}
`;

  return layout({
    title: p.seoTitle, desc: p.seoDesc, path,
    schemas: [serviceSchema(p, path), crumbSchema(crumbs), faqSchema(p.faq)],
    body, crumbs
  });
}

/* --- Страница отрасли --------------------------------------------------- */
function otraslPage(p) {
  const path = `/otrasli/${p.slug}/`;
  const crumbs = [{ title: 'Главная', href: '/' }, { title: 'Отрасли', href: '/otrasli/' }, { title: p.nav, href: path }];

  const body = `
<section class="page-head page-head--media">
  <div class="wrap">
    <div class="page-head__media">${picture(PHOTO.otrasli[p.slug], { ratio: '100vw', eager: true })}</div>
    <p class="eyebrow">Отрасль</p>
    <h1 class="h1 page-head__title">${esc(p.h1)}</h1>
    <p class="lead">${esc(p.lead)}</p>
    <div class="btn-row">
      <a class="btn btn--primary" href="#zayavka">Описать объект</a>
      <a class="btn btn--wa" href="${site.whatsapp}" rel="noopener">WhatsApp</a>
    </div>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Объекты</p>
        <h2 class="h2">${esc(p.objectsTitle)}</h2>
      </div>
      <div>
        ${factList(p.objects)}
      </div>
    </div>
  </div>
</section>

<section class="section section--deep">
  <div class="wrap">
    <p class="eyebrow">Задачи</p>
    <h2 class="h2">${esc(p.tasksTitle)}</h2>
    <div class="grid grid--2" style="margin-top:2.5rem">
      ${p.tasks.map((t) => `<div class="card reveal">
        <h3 class="card__title">${esc(t.t)}</h3>
        <p class="card__text">${esc(t.d)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Условия</p>
        <h2 class="h2">${esc(p.whyTitle)}</h2>
        <p class="prose muted" style="margin-top:1.25rem">Технология — только половина решения. Вторая определяется режимом эксплуатации объекта и требованиями безопасности.</p>
      </div>
      <div>
        ${factList(p.why)}
      </div>
    </div>
  </div>
</section>

<section class="section section--deep">
  <div class="wrap">
    <p class="eyebrow">Услуги для отрасли</p>
    <h2 class="h2">С чем обращаются чаще всего</h2>
    <div style="margin-top:2.5rem">
      ${cardsGrid(p.uslugi.map((s) => ({ title: U[s].h1, text: U[s].lead, href: `/uslugi/${s}/`, meta: 'Услуга', photo: PHOTO.uslugi[s] })),4)}
    </div>

    <h2 class="h2" style="margin-top:4rem">Применяемые технологии</h2>
    <div style="margin-top:2rem">
      ${linkList(p.tehnologii.map((s) => ({ title: T[s].h1, href: `/tehnologii/${s}/`, note: T[s].nav })))}
    </div>
  </div>
</section>

${ctaSection()}
`;

  return layout({
    title: p.seoTitle, desc: p.seoDesc, path,
    schemas: [serviceSchema(p, path), crumbSchema(crumbs)],
    body, crumbs
  });
}

/* --- Прочие страницы ---------------------------------------------------- */
function etapyPage() {
  const path = '/etapy-raboty/';
  const crumbs = [{ title: 'Главная', href: '/' }, { title: 'Этапы работ', href: path }];
  const body = `
<section class="page-head page-head--media">
  <div class="wrap">
    <div class="page-head__media">${picture(PHOTO.stages, { ratio: '100vw', eager: true })}</div>
    <p class="eyebrow">Порядок работы</p>
    <h1 class="h1 page-head__title">Этапы работ</h1>
    <p class="lead">Последовательность от обследования объекта до отчёта и рекомендаций по дальнейшей эксплуатации. Она одинакова для здания, дороги, плотины и горной выработки — меняются методы, но не порядок.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">${stepsBlock()}</div>
</section>

<section class="section section--deep">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Принцип</p>
        <h2 class="h2">Почему порядок именно такой</h2>
      </div>
      <div class="prose">
        <p>Самая дорогая ошибка в геотехнике — начать работы, не установив причину. Одна и та же трещина может означать осадку основания, вымывание грунта водой или потерю контакта конструкции с основанием. Три разные причины, три разные технологии, и только одна из них даст результат.</p>
        <p>Поэтому первые три этапа — обследование, диагностика и подбор технологии — занимают больше времени, чем кажется разумным заказчику, который уже видит трещину и хочет её закрыть. Эти этапы окупаются на четвёртом: работы выполняются один раз, а не повторяются через сезон.</p>
        <p>Последние два этапа существуют по той же причине. Объём израсходованного состава доказывает, что материал подан, но не доказывает, что задача решена. Керновый контроль, лабораторные испытания и геодезический мониторинг доказывают второе — и именно они попадают в техническое заключение.</p>
      </div>
    </div>
  </div>
</section>

${ctaSection()}
`;
  return layout({
    title: 'Этапы работ: от обследования объекта до технического заключения | СоюзГеоСтаб',
    desc: 'Порядок выполнения геотехнических работ: обследование объекта, диагностика, подбор технологии, производство работ, контроль результата, отчёт и рекомендации по эксплуатации.',
    path, schemas: [crumbSchema(crumbs)], body, crumbs
  });
}

function kejsyPage() {
  const path = '/kejsy/';
  const crumbs = [{ title: 'Главная', href: '/' }, { title: 'Кейсы', href: path }];
  const body = `
<section class="page-head page-head--media">
  <div class="wrap">
    <div class="page-head__media">${picture(PHOTO.cases, { ratio: '100vw', eager: true })}</div>
    <p class="eyebrow">Выполненные объекты</p>
    <h1 class="h1 page-head__title">Кейсы</h1>
    <p class="lead">Раздел заполняется. Здесь будут выполненные объекты с описанием задачи, применённой технологии, фактическими объёмами и подтверждённым результатом.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="callout">
      <h2 class="h2">Материалы по объектам готовятся к публикации</h2>
      <div class="prose" style="margin-top:1.5rem">
        <p>Часть объектов выполнена по договорам, ограничивающим раскрытие информации о заказчике. Такие работы будут опубликованы обезличенно — с указанием типа объекта, региона, технологии и фактических параметров, без названия предприятия.</p>
        <p>Если вам нужны примеры по конкретной задаче — водопритоки в выработку, подъём промышленного пола, усиление фундамента под действующим зданием — напишите или позвоните. Разберём похожие объекты предметно, с цифрами.</p>
      </div>
      <div class="btn-row">
        <a class="btn btn--primary" href="#zayavka">Запросить примеры</a>
        <a class="btn btn--ghost" href="${site.phoneHref}">${esc(site.phone)}</a>
      </div>
    </div>
  </div>
</section>

${ctaSection()}
`;
  return layout({
    title: 'Кейсы — выполненные объекты | СоюзГеоСтаб',
    desc: 'Выполненные геотехнические объекты: задача, применённая технология, фактические объёмы и подтверждённый результат. Раздел пополняется.',
    path, schemas: [crumbSchema(crumbs)], body, crumbs
  });
}

/* Документы для скачивания. Пусто, пока заказчик не пришлёт исходные PDF —
   ссылки на отсутствующие файлы хуже, чем честное «вышлем по запросу».
   Как появятся: положить в /files/ и раскомментировать строки. */
const DOCS = [
  // { title: 'Буклет компании (PDF)', href: '/files/souzgeostab-buklet.pdf', note: 'Скачать' },
  // { title: 'Лифлет (PDF)',          href: '/files/souzgeostab-liflet.pdf', note: 'Скачать' }
];

function dokumentyPage() {
  const path = '/dokumenty/';
  const crumbs = [{ title: 'Главная', href: '/' }, { title: 'Документы', href: path }];
  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Документы</p>
    <h1 class="h1 page-head__title">Документы компании</h1>
    <p class="lead">Материалы для передачи техническому руководству, службе эксплуатации и отделу закупок.</p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    ${DOCS.length
      ? linkList(DOCS.map((d) => ({ title: d.title, href: d.href, note: d.note })))
      : `<div class="callout">
      <h2 class="h2">Файлы размещаются на домене</h2>
      <div class="prose" style="margin-top:1.5rem">
        <p>Буклет и лифлет переносятся на souyzgeostab.kz с внешнего хранилища. До завершения переноса вышлем их по запросу — напишите или позвоните, отправим в ответном письме.</p>
      </div>
      <div class="btn-row">
        <a class="btn btn--primary" href="#zayavka">Запросить буклет</a>
        <a class="btn btn--ghost" href="${site.emailHref}">${esc(site.email)}</a>
      </div>
    </div>`}
    <p class="prose muted" style="margin-top:2rem">Лицензии, допуски и сертификаты на применяемые материалы предоставляются по запросу — напишите, какие документы требуются для вашей процедуры согласования.</p>
  </div>
</section>

${ctaSection()}
`;
  return layout({
    title: 'Документы: буклет, лифлет, допуски | СоюзГеоСтаб',
    desc: 'Буклет и лифлет компании СоюзГеоСтаб. Лицензии, допуски и сертификаты на применяемые материалы предоставляются по запросу.',
    path, schemas: [crumbSchema(crumbs)], body, crumbs
  });
}

function oKompaniiPage() {
  const path = '/o-kompanii/';
  const crumbs = [{ title: 'Главная', href: '/' }, { title: 'О компании', href: path }];
  const body = `
<section class="page-head">
  <div class="wrap">
    <div class="page-head__media">${picture(PHOTO.team, { ratio: '100vw', eager: true })}</div>
    <p class="eyebrow">О компании</p>
    <h1 class="h1 page-head__title">${esc(site.legalName)}</h1>
    <p class="lead">Инженерная компания, специализирующаяся на инъекционных технологиях и геотехнических решениях для горнодобывающей промышленности, строительства, транспортной и гидротехнической инфраструктуры.</p>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Подход</p>
        <h2 class="h2">Технология подбирается под проблему, а не наоборот</h2>
      </div>
      <div class="prose">
        <p>Мы не продаём технологию и не продаём материал. Компания, у которой есть только один метод, будет предлагать его на любом объекте — и на части объектов он не сработает. Мы держим набор технологий именно для того, чтобы иметь возможность выбирать.</p>
        <p>Выбор определяется геологией, гидрогеологическими условиями, состоянием конструкций, характером дефекта и требуемым результатом. На сложных объектах методы комбинируются: Jet Grouting формирует несущий массив, глубинная стабилизация уплотняет активный слой, полимерные инъекции герметизируют и поднимают.</p>
        <p>Работаем на объектах, которые нельзя остановить: действующие производства, дороги, гидротехнические сооружения, горные выработки. Отсюда и основное требование к технологиям — отсутствие масштабных земляных работ и быстрый возврат эксплуатационной нагрузки.</p>
      </div>
    </div>
  </div>
</section>

<section class="section section--deep">
  <div class="wrap">
    <p class="eyebrow">Что определяет результат</p>
    <h2 class="h2">Три вещи, на которых мы не экономим</h2>
    <div class="grid grid--3" style="margin-top:2.5rem">
      <div class="card reveal">
        <h3 class="card__title">Обследование до начала работ</h3>
        <p class="card__text">Схема инъектирования, построенная на предположениях, либо не заполняет дефект, либо расходует кратно больше состава. Геофизика и контрольное бурение почти всегда дешевле любой из этих ошибок.</p>
      </div>
      <div class="card reveal">
        <h3 class="card__title">Контроль в процессе</h3>
        <p class="card__text">Давление, фактический расход, геодезические отметки и реакция конструкции фиксируются непрерывно. Отклонение расхода от расчётного — сигнал, что реальное строение основания отличается от принятого, и повод скорректировать схему на ходу.</p>
      </div>
      <div class="card reveal">
        <h3 class="card__title">Подтверждение результата</h3>
        <p class="card__text">Керновый контроль, лабораторные испытания, повторное обследование. Объём израсходованного состава доказывает, что материал подан. Что задача решена — доказывает измерение.</p>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <p class="eyebrow">Направления</p>
    <h2 class="h2">Отрасли, в которых работаем</h2>
    <div style="margin-top:2rem">
      ${linkList(otrasli.map((o) => ({ title: o.h1, href: `/otrasli/${o.slug}/`, note: o.nav })))}
    </div>
  </div>
</section>

${ctaSection()}
`;
  return layout({
    title: 'О компании СоюзГеоСтаб — инъекционные технологии и геотехника',
    desc: 'ТОО «СоюзГеоСтаб» — инженерная компания, специализирующаяся на инъекционных технологиях и геотехнических решениях для горнодобычи, строительства, транспортной и гидротехнической инфраструктуры.',
    path, schemas: [orgSchema(), crumbSchema(crumbs)], body, crumbs
  });
}

function kontaktyPage() {
  const path = '/kontakty/';
  const crumbs = [{ title: 'Главная', href: '/' }, { title: 'Контакты', href: path }];
  const body = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Контакты</p>
    <h1 class="h1 page-head__title">Связаться с нами</h1>
    <p class="lead">Опишите объект и что на нём происходит — ответим, применима ли наша технология к вашей задаче, и что для оценки понадобится ещё.</p>
  </div>
</section>

<section class="section section--light">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Реквизиты связи</p>
        <h2 class="h2">${esc(site.legalName)}</h2>
        <div style="margin-top:2rem">
          ${linkList([
            { title: site.phone, href: site.phoneHref, note: 'Телефон' },
            { title: 'Написать в WhatsApp', href: site.whatsapp, note: 'WhatsApp' },
            { title: site.email, href: site.emailHref, note: 'Почта' }
          ])}
        </div>
        <p class="prose muted" style="margin-top:2rem">${esc(site.workHours)}. По аварийным ситуациям — пишите в WhatsApp в любое время, с описанием и фото происходящего.</p>
      </div>
      <div>
        <p class="eyebrow">Заявка</p>
        <h2 class="h2" style="margin-bottom:2rem">Оценка объекта</h2>
        ${leadForm()}
      </div>
    </div>
  </div>
</section>

<section class="section section--deep">
  <div class="wrap">
    <div class="split">
      <div>
        <p class="eyebrow">Что приложить</p>
        <h2 class="h2">Чем больше данных, тем точнее ответ</h2>
      </div>
      <div>
        ${factList([
          'Фото и видео дефекта: трещины, просадка, течь, деформация',
          'Данные по геологии и материалы инженерных изысканий',
          'Исполнительные схемы, чертежи конструкций, планы',
          'История эксплуатации: когда началось, как развивалось',
          'Замеры: величина осадки, раскрытие трещин, расход притока',
          'Ограничения: можно ли останавливать объект, есть ли подъезд'
        ])}
      </div>
    </div>
  </div>
</section>
`;
  return layout({
    title: 'Контакты СоюзГеоСтаб — заявка на оценку объекта',
    desc: 'Свяжитесь с СоюзГеоСтаб: телефон, WhatsApp, почта. Опишите объект и характер дефекта — оценим задачу и предложим инженерное решение.',
    path, schemas: [orgSchema(), crumbSchema(crumbs)], body, crumbs
  });
}

function notFoundPage() {
  const body = `
<section class="section" style="padding-top:6rem">
  <div class="wrap">
    <p class="eyebrow">Ошибка 404</p>
    <h1 class="h1">Страница не найдена</h1>
    <p class="lead" style="margin-top:1.5rem">Возможно, страница переехала при обновлении сайта. Ниже — основные разделы.</p>
    <div style="margin-top:3rem">
      ${linkList([
        { title: 'Главная', href: '/', note: '' },
        { title: 'Услуги', href: '/uslugi/', note: 'Что решаем' },
        { title: 'Технологии', href: '/tehnologii/', note: 'Чем работаем' },
        { title: 'Отрасли', href: '/otrasli/', note: 'Где работаем' },
        { title: 'Контакты', href: '/kontakty/', note: 'Связаться' }
      ])}
    </div>
  </div>
</section>
`;
  return layout({
    title: 'Страница не найдена | СоюзГеоСтаб',
    desc: 'Страница не найдена. Перейдите в основные разделы сайта СоюзГеоСтаб.',
    path: '/404.html', body, absolute: true
  });
}

/* --- sitemap ------------------------------------------------------------ */
function sitemap(paths) {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url>
    <loc>${site.domain}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
}

/* --- Сборка ------------------------------------------------------------- */
async function out(rel, content) {
  const file = join(ROOT, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
  return rel;
}

const written = [];
const urls = [];

written.push(await out('index.html', homePage()));
urls.push({ path: '/', priority: '1.0' });

written.push(await out('uslugi/index.html', hubPage({ intro: uslugiIntro, items: uslugi, base: '/uslugi/', kind: 'uslugi' })));
urls.push({ path: '/uslugi/', priority: '0.9' });
for (const p of uslugi) {
  written.push(await out(`uslugi/${p.slug}/index.html`, uslugaPage(p)));
  urls.push({ path: `/uslugi/${p.slug}/`, priority: '0.9' });
}

written.push(await out('tehnologii/index.html', hubPage({ intro: tehnologiiIntro, items: tehnologii, base: '/tehnologii/', kind: 'tehnologii' })));
urls.push({ path: '/tehnologii/', priority: '0.9' });
for (const p of tehnologii) {
  written.push(await out(`tehnologii/${p.slug}/index.html`, tehPage(p)));
  urls.push({ path: `/tehnologii/${p.slug}/`, priority: '0.8' });
}

written.push(await out('otrasli/index.html', hubPage({ intro: otrasliIntro, items: otrasli, base: '/otrasli/', kind: 'otrasli' })));
urls.push({ path: '/otrasli/', priority: '0.8' });
for (const p of otrasli) {
  written.push(await out(`otrasli/${p.slug}/index.html`, otraslPage(p)));
  urls.push({ path: `/otrasli/${p.slug}/`, priority: '0.8' });
}

written.push(await out('etapy-raboty/index.html', etapyPage()));  urls.push({ path: '/etapy-raboty/', priority: '0.6' });
written.push(await out('kejsy/index.html', kejsyPage()));          urls.push({ path: '/kejsy/', priority: '0.6' });
written.push(await out('dokumenty/index.html', dokumentyPage()));  urls.push({ path: '/dokumenty/', priority: '0.5' });
written.push(await out('o-kompanii/index.html', oKompaniiPage())); urls.push({ path: '/o-kompanii/', priority: '0.7' });
written.push(await out('kontakty/index.html', kontaktyPage()));    urls.push({ path: '/kontakty/', priority: '0.8' });
written.push(await out('404.html', notFoundPage()));

/* Манифест: иконка и цвета при добавлении сайта на домашний экран телефона */
written.push(await out('site.webmanifest', JSON.stringify({
  name: site.legalName,
  short_name: site.name,
  description: site.tagline,
  start_url: '/',
  display: 'standalone',
  background_color: '#0d1b2a',
  theme_color: '#0d1b2a',
  icons: [
    { src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2)));

written.push(await out('sitemap.xml', sitemap(urls)));
written.push(await out('robots.txt', `User-agent: *
Allow: /
Disallow: /files/tmp/

Sitemap: ${site.domain}/sitemap.xml
`));

console.log(`Сгенерировано ${written.length} файлов:`);
written.forEach((f) => console.log('  ' + f));
