/**
 * Gender Toggle — click handler for men's/women's product navigation.
 *
 * Uses standard navigation for now. AJAX swap can be layered on
 * once basic navigation is confirmed working.
 */
(function () {
  // This script ships inline inside the swappable <main>, so it re-executes
  // after every ProductPageSwap. Guard the document-level listener so click
  // handlers don't stack up across swaps.
  if (window.__genderToggleBound) return;
  window.__genderToggleBound = true;

  document.addEventListener('click', function (e) {
    const pill = e.target.closest('[data-gender-swap-url]');
    if (!pill) return;

    e.preventDefault();

    const url = pill.dataset.genderSwapUrl || pill.getAttribute('href');
    if (url) {
      window.location.href = url;
    }
  });
})();
