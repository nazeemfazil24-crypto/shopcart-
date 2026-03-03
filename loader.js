/**
 * Global loader for every loading scenario.
 * Include loader.css and add <div id="globalLoader" class="loader-overlay">...</div> in your page,
 * or call ensureLoader() before showLoader() to inject it.
 */
(function () {
  var overlayId = 'globalLoader';

  function getOverlay() {
    return document.getElementById(overlayId);
  }

  function ensureLoader() {
    if (getOverlay()) return;
    var overlay = document.createElement('div');
    overlay.id = overlayId;
    overlay.className = 'loader-overlay';
    overlay.innerHTML = '<div class="loader">' +
      '<div class="inner one"></div>' +
      '<div class="inner two"></div>' +
      '<div class="inner three"></div>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  function showLoader() {
    ensureLoader();
    var el = getOverlay();
    if (el) {
      el.classList.remove('loader-hidden');
      el.style.display = '';
    }
  }

  function hideLoader() {
    var el = getOverlay();
    if (el) {
      el.classList.add('loader-hidden');
      setTimeout(function () {
        el.style.display = 'none';
      }, 300);
    }
  }

  window.showLoader = showLoader;
  window.hideLoader = hideLoader;
  window.ensureLoader = ensureLoader;
})();
