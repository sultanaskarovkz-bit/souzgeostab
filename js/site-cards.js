/* Кликабельные карточки технологий и решений.

   В Zero-блоках карточка - это группа .t396__group из отдельных абсолютно
   позиционированных элементов: подложка, заголовок, описание. Ссылкой при
   сборке становится сам заголовок - так делает и Tilda, и это даёт
   поисковику настоящую ссылку.

   Но человек жмёт по карточке целиком, а не строго по словам заголовка.
   Поэтому переход навешивается на всю группу. Ссылка в разметке при этом
   остаётся: убери скрипт - карточка продолжит работать по заголовку. */
(function () {
  'use strict';

  function activate() {
    var links = document.querySelectorAll('.sgs-tech-link');

    for (var i = 0; i < links.length; i++) {
      (function (link) {
        var card = link.closest('.t396__group') || link.closest('.tn-molecule');
        if (!card || card.getAttribute('data-sgs-card') === 'y') return;

        card.setAttribute('data-sgs-card', 'y');
        card.style.cursor = 'pointer';

        card.addEventListener('click', function (e) {
          // Клик по настоящей ссылке обрабатывает браузер
          if (e.target.closest && e.target.closest('a')) return;
          // Не мешаем выделению текста
          var sel = window.getSelection();
          if (sel && String(sel).length > 0) return;
          window.location.href = link.href;
        });

        // Доступ с клавиатуры: карточка не должна быть ловушкой для мыши
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && e.target === card) window.location.href = link.href;
        });
      })(links[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activate);
  } else {
    activate();
  }

  // Zero-блоки досоздают элементы после загрузки, поэтому повторяем проход
  if (window.MutationObserver) {
    var observer = new MutationObserver(activate);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); }, 15000);
  }
})();
