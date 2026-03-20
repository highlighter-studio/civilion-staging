/**
 * Civilion Gender Cookie
 * Reads gender filter from URL params, persists as cookie.
 * On collection pages without gender filter, applies saved preference.
 * Spec: docs/superpowers/specs/2026-03-20-product-discovery-design.md §1
 */
(function() {
  var COOKIE_NAME = 'civilion_gender';
  var COOKIE_DAYS = 30;
  var FILTER_PARAM = 'filter.p.m.custom.product_gender';

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires + ';path=/;SameSite=Lax';
  }

  function deleteCookie(name) {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax';
  }

  var params = new URLSearchParams(window.location.search);
  var genderParam = params.get(FILTER_PARAM);

  // Prevent infinite redirect: if we already redirected this page load, don't do it again
  var REDIRECT_KEY = 'civilion_gender_redirected';

  if (genderParam) {
    // URL has gender filter — save preference, clear redirect flag
    setCookie(COOKIE_NAME, genderParam, COOKIE_DAYS);
    sessionStorage.removeItem(REDIRECT_KEY);
  } else {
    // No gender filter in URL — check cookie
    var savedGender = getCookie(COOKIE_NAME);
    if (savedGender && !sessionStorage.getItem(REDIRECT_KEY)) {
      // Apply saved gender filter by adding param and reloading
      sessionStorage.setItem(REDIRECT_KEY, '1');
      params.set(FILTER_PARAM, savedGender);
      window.location.search = params.toString();
    }
  }

  // Listen for "All" gender filter selection to clear cookie
  document.addEventListener('change', function(e) {
    if (e.target.closest && e.target.closest('[data-filter-param="' + FILTER_PARAM + '"]')) {
      var value = e.target.value || e.target.dataset.value;
      if (!value || value === '' || value === 'all') {
        deleteCookie(COOKIE_NAME);
      } else {
        setCookie(COOKIE_NAME, value, COOKIE_DAYS);
      }
    }
  });
})();
