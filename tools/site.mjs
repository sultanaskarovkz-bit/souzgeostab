/* Единый источник правды: контакты, реквизиты, навигация.
   Меняется здесь — расходится по всем 27 страницам при генерации. */

export const site = {
  name: 'СоюзГеоСтаб',
  legalName: 'ТОО «СоюзГеоСтаб»',
  domain: 'https://souyzgeostab.kz',
  tagline: 'Инъекционные технологии и геотехнические решения',

  // ВНИМАНИЕ: подтвердить у заказчика — см. ЗАПРОС-МАТЕРИАЛОВ, разделы 1 и 2
  phone: '+7 (747) 679-17-67',
  phoneHref: 'tel:+77476791767',
  whatsapp: 'https://wa.me/77476791767',
  email: 'souzgeostab@mail.ru',        // TODO: перевести на info@souyzgeostab.kz
  emailHref: 'mailto:souzgeostab@mail.ru',

  // TODO: заполнить после ответа заказчика. Пока не выводим на страницы.
  address: null,        // { street, city, postal, region }
  bin: null,
  workHours: 'Пн–Пт, 09:00–18:00',
  foundedYear: null,

  // Приёмник заявок. Заменить на реальный endpoint перед публикацией.
  formAction: '/form.php',

  // Аналитика. Пустая строка = счётчик не подключается.
  ga4: '',              // 'G-XXXXXXXXXX'
  metrika: '',          // '00000000'
  gscVerify: 'aCzcDkbn-0TSKw62MzicWrOKr1hiudrZNv6HiOdm7ME',

  year: new Date().getFullYear()
};

/* Главное меню. Разделы — хабы, в подменю их дети. */
export const nav = [
  {
    title: 'Услуги',
    href: '/uslugi/',
    children: 'uslugi'
  },
  {
    title: 'Технологии',
    href: '/tehnologii/',
    children: 'tehnologii'
  },
  {
    title: 'Отрасли',
    href: '/otrasli/',
    children: 'otrasli'
  },
  { title: 'Этапы работ', href: '/etapy-raboty/' },
  { title: 'Кейсы', href: '/kejsy/' },
  { title: 'О компании', href: '/o-kompanii/' },
  { title: 'Контакты', href: '/kontakty/' }
];
