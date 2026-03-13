/**
 * ProductPageSwap — Shared AJAX product page swap utility.
 *
 * Fetches a product URL, parses the HTML, swaps <main> via
 * HTMLUpdateUtility.viewTransition(), updates the URL, and
 * reinitializes interactive elements.
 *
 * Consumed by colorway-swatches.js and gender-toggle.js.
 */
window.ProductPageSwap = {
  /**
   * Navigate to a product URL via AJAX swap.
   * @param {string} url — The product URL to navigate to.
   * @param {Object} [options]
   * @param {Function} [options.onBeforeSwap] — Called before the swap begins.
   * @param {Function} [options.onAfterSwap] — Called after the swap completes.
   * @param {string} [options.stateKey='productSwap'] — Key for pushState state object.
   * @returns {Promise<void>}
   */
  navigate: function (url, options) {
    const opts = options || {};
    const stateKey = opts.stateKey || 'productSwap';

    if (typeof opts.onBeforeSwap === 'function') opts.onBeforeSwap(url);

    return fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
      })
      .then(function (html) {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const newMain = parsed.querySelector('main');
        const oldMain = document.querySelector('main');

        if (!newMain || !oldMain) throw new Error('Could not find main element');

        // Update page title
        const newTitle = parsed.querySelector('head title');
        if (newTitle) document.querySelector('head title').innerHTML = newTitle.innerHTML;

        // Swap main content
        const preCallbacks = [
          function (content) {
            content.querySelectorAll('.scroll-trigger').forEach(function (el) {
              el.classList.add('scroll-trigger--cancel');
            });
          }
        ];
        const postCallbacks = [
          function () {
            if (window.Shopify && window.Shopify.PaymentButton) window.Shopify.PaymentButton.init();
            if (window.ProductModel) window.ProductModel.loadShopifyXR();
          }
        ];

        HTMLUpdateUtility.viewTransition(oldMain, newMain, preCallbacks, postCallbacks);

        // Update URL
        const state = { url: url };
        state[stateKey] = true;
        window.history.pushState(state, '', url);

        // Scroll to product section
        const productSection = document.querySelector('main .section-main-product, main product-info');
        if (productSection) {
          productSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (typeof opts.onAfterSwap === 'function') opts.onAfterSwap(url);
      });
  }
};

// Handle browser back/forward after any AJAX swap
window.addEventListener('popstate', function (e) {
  if (e.state && (e.state.productSwap || e.state.colorwaySwap || e.state.genderSwap)) {
    window.location.reload();
  }
});
