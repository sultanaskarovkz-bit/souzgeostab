/* СоюзГеоСтаб — поведение интерфейса. Без зависимостей. */
(function () {
  'use strict';

  /* --- Мобильное меню --------------------------------------------------- */
  var burger = document.querySelector('.burger');
  var mobileNav = document.getElementById('mobile-nav');

  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      mobileNav.setAttribute('data-open', String(!open));
      document.body.style.overflow = open ? '' : 'hidden';
    });

    // Клик по ссылке закрывает меню
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        mobileNav.setAttribute('data-open', 'false');
        document.body.style.overflow = '';
      }
    });

    // Escape закрывает меню
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        burger.setAttribute('aria-expanded', 'false');
        mobileNav.setAttribute('data-open', 'false');
        document.body.style.overflow = '';
        burger.focus();
      }
    });
  }

  /* --- Тень у шапки при прокрутке --------------------------------------- */
  var header = document.querySelector('.header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- Появление блоков при прокрутке ----------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* --- Схема процесса: запуск по появлению и цикл ------------------------ */
  var figure = document.querySelector('[data-process]');
  var steps = Array.prototype.slice.call(document.querySelectorAll('.process__step'));

  if (figure) {
    var CYCLE = 7600;                    // длительность полного проигрыша
    // Момент, когда подсвечивается очередной шаг. Совпадает с задержками в CSS.
    var MARKS = [150, 1200, 2600, 3400];
    var timers = [];
    var loop = null;
    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var clear = function () {
      timers.forEach(clearTimeout);
      timers = [];
    };

    var play = function () {
      clear();
      figure.classList.remove('is-run');
      void figure.offsetWidth;           // перезапуск CSS-анимаций
      figure.classList.add('is-run');

      steps.forEach(function (s) { s.setAttribute('data-on', 'false'); });
      MARKS.forEach(function (t, i) {
        timers.push(setTimeout(function () {
          steps.forEach(function (s, j) { s.setAttribute('data-on', String(j <= i)); });
        }, t));
      });
    };

    if (calm) {
      figure.classList.add('is-run');
      steps.forEach(function (s) { s.setAttribute('data-on', 'true'); });
    } else if ('IntersectionObserver' in window) {
      var pio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            play();
            if (!loop) loop = setInterval(play, CYCLE + 1600);
          } else {
            // За пределами экрана крутить незачем: это лишняя работа для батареи
            clearInterval(loop);
            loop = null;
            clear();
          }
        });
      }, { threshold: 0.35 });
      pio.observe(figure);
    } else {
      play();
    }
  }

  /* --- Форма заявки ------------------------------------------------------ */
  var forms = document.querySelectorAll('form[data-lead-form]');

  forms.forEach(function (form) {
    var status = form.querySelector('.form__status');
    var submit = form.querySelector('button[type="submit"]');

    var setError = function (field, message) {
      var wrap = field.closest('.field');
      if (!wrap) return;
      wrap.classList.add('field--error');
      var box = wrap.querySelector('.field__error');
      if (box) box.textContent = message;
      field.setAttribute('aria-invalid', 'true');
    };

    var clearError = function (field) {
      var wrap = field.closest('.field');
      if (!wrap) return;
      wrap.classList.remove('field--error');
      field.removeAttribute('aria-invalid');
    };

    form.addEventListener('input', function (e) {
      if (e.target.matches('input, textarea')) clearError(e.target);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.querySelector('[name="name"]');
      var phone = form.querySelector('[name="phone"]');
      var email = form.querySelector('[name="email"]');
      var honey = form.querySelector('[name="company_website"]');
      var ok = true;

      // Скрытое поле-ловушка: заполнено — значит бот, тихо выходим
      if (honey && honey.value) return;

      if (name && !name.value.trim()) {
        setError(name, 'Укажите, как к вам обращаться');
        ok = false;
      }

      // Телефон: минимум 10 цифр, маска не навязывается
      if (phone) {
        var digits = phone.value.replace(/\D/g, '');
        if (digits.length < 10) {
          setError(phone, 'Введите номер телефона полностью');
          ok = false;
        }
      }

      if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        setError(email, 'Проверьте адрес почты');
        ok = false;
      }

      if (!ok) {
        var firstBad = form.querySelector('.field--error input, .field--error textarea');
        if (firstBad) firstBad.focus();
        return;
      }

      // Метки источника — чтобы в заявке было видно, откуда пришёл клиент
      var params = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
        var input = form.querySelector('[name="' + k + '"]');
        if (input) input.value = params.get(k) || '';
      });
      var pageField = form.querySelector('[name="page"]');
      if (pageField) pageField.value = window.location.pathname;

      if (submit) { submit.disabled = true; submit.textContent = 'Отправляем…'; }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.reset();
          if (status) {
            status.textContent = 'Заявка отправлена. Свяжемся в течение рабочего дня.';
            status.setAttribute('data-state', 'ok');
          }
          if (window.dataLayer) window.dataLayer.push({ event: 'lead_form_submit' });
          if (typeof gtag === 'function') gtag('event', 'generate_lead');
          if (typeof ym === 'function' && window.YM_ID) ym(window.YM_ID, 'reachGoal', 'lead_form_submit');
        })
        .catch(function () {
          if (status) {
            status.textContent = 'Не удалось отправить. Напишите в WhatsApp или на почту — ответим быстрее.';
            status.setAttribute('data-state', 'fail');
          }
        })
        .finally(function () {
          if (submit) { submit.disabled = false; submit.textContent = 'Отправить заявку'; }
        });
    });
  });

  /* --- Отслеживание кликов по контактам ---------------------------------- */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me"]');
    if (!link) return;

    var channel = link.href.indexOf('tel:') === 0 ? 'phone'
      : link.href.indexOf('mailto:') === 0 ? 'email' : 'whatsapp';

    if (window.dataLayer) window.dataLayer.push({ event: 'contact_click', channel: channel });
    if (typeof gtag === 'function') gtag('event', 'contact_click', { channel: channel });
    if (typeof ym === 'function' && window.YM_ID) ym(window.YM_ID, 'reachGoal', 'contact_' + channel);
  });
})();
