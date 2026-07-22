/* Приём заявок без Tilda.

   Почему так. Форму в блоке строит скрипт Tilda, и отправляет она данные
   на forms.tildacdn.com по ключу подписки. Подмена адреса в action не
   помогает: перед отправкой скрипт Tilda сверяет домен с настройками
   проекта и на чужом домене отказывается отправлять вовсе - «укажите
   в настройках сайта действующее имя домена».

   Поэтому перехватываем клик по кнопке на этапе перехвата у document.
   Обработчик Tilda привязан к самому элементу, то есть сработал бы позже;
   остановка распространения не даёт событию до него дойти. Разметка формы
   при этом не меняется - внешний вид остаётся ровно таким, как был. */
(function () {
  'use strict';

  var ENDPOINT = window.SGS_FORM_ENDPOINT || 'form.php';

  function group(input) {
    return input ? input.closest('.t-input-group') : null;
  }

  function showError(input, text) {
    var g = group(input);
    if (!g) return;
    var box = g.querySelector('.t-input-error');
    if (box) {
      box.textContent = text;
      box.style.display = 'block';
      box.style.color = '#ff9498';
      box.style.fontSize = '13px';
      box.style.marginTop = '6px';
    }
    if (input) input.setAttribute('aria-invalid', 'true');
  }

  function clearErrors(form) {
    form.querySelectorAll('.t-input-error').forEach(function (b) {
      b.textContent = '';
      b.style.display = 'none';
    });
    form.querySelectorAll('[aria-invalid]').forEach(function (i) {
      i.removeAttribute('aria-invalid');
    });
  }

  function find(form, names) {
    for (var i = 0; i < names.length; i++) {
      var el = form.querySelector('[name="' + names[i] + '"]');
      if (el) return el;
    }
    return null;
  }

  function status(form, text, ok) {
    var box = form.querySelector('.sgs-form-status');
    if (!box) {
      box = document.createElement('div');
      box.className = 'sgs-form-status';
      form.appendChild(box);
    }
    box.textContent = text;
    box.setAttribute('data-state', ok ? 'ok' : 'fail');
  }

  function submit(form, button) {
    clearErrors(form);

    var name = find(form, ['имя', 'Имя', 'name', 'Name']);
    var phone = find(form, ['tildaspec-phone-part[]', 'Phone', 'phone']);
    var email = find(form, ['Email', 'email']);

    var ok = true;
    if (name && !name.value.trim()) { showError(name, 'Укажите, как к вам обращаться'); ok = false; }

    if (phone) {
      var digits = (phone.value || '').replace(/\D/g, '');
      if (digits.length < 10) { showError(phone, 'Введите номер телефона полностью'); ok = false; }
    }
    if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      showError(email, 'Проверьте адрес почты'); ok = false;
    }
    if (!ok) return;

    var data = new FormData(form);
    data.append('page', location.pathname);
    var params = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
      data.append(k, params.get(k) || '');
    });

    var label = button ? button.value || button.textContent : '';
    if (button) {
      button.disabled = true;
      if ('value' in button && button.tagName === 'INPUT') button.value = 'Отправляем…';
      else button.textContent = 'Отправляем…';
    }

    fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then(function () {
        form.reset();
        status(form, 'Заявка отправлена. Свяжемся в течение рабочего дня.', true);
        if (window.dataLayer) window.dataLayer.push({ event: 'lead_form_submit' });
        if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead');
        if (typeof window.ym === 'function' && window.SGS_YM_ID) {
          window.ym(window.SGS_YM_ID, 'reachGoal', 'lead_form_submit');
        }
      })
      .catch(function () {
        status(form, 'Не удалось отправить. Напишите на info@souyzgeostab.kz или в WhatsApp.', false);
      })
      .finally(function () {
        if (button) {
          button.disabled = false;
          if ('value' in button && button.tagName === 'INPUT') button.value = label;
          else button.textContent = label;
        }
      });
  }

  var SUBMIT_SELECTOR = 'input[type="submit"], button[type="submit"], .t-submit';

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    // Кликают обычно по обёртке .tn-form__submit, а сама кнопка лежит
    // внутри неё - поиск только вверх по дереву её не находил.
    var hit = e.target.closest(SUBMIT_SELECTOR + ', .tn-form__submit');
    if (!hit) return;

    var form = hit.closest('form');
    if (!form) return;

    var button = hit.matches(SUBMIT_SELECTOR) ? hit : form.querySelector(SUBMIT_SELECTOR);

    e.preventDefault();
    e.stopImmediatePropagation();
    submit(form, button);
  }, true);

  // Нажатие Enter в поле тоже отправляет форму
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    submit(form, form.querySelector('input[type="submit"], button[type="submit"], .t-submit'));
  }, true);
})();
