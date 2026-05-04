(function () {
  'use strict';

  const KLAVIYO_BASE = 'https://a.klaviyo.com/client';
  const REVISION = '2024-10-15';

  function getKlaviyoConfig() {
    const body = document.body;
    return {
      publicKey: body.dataset.klaviyoPublicKey || '',
      listId: body.dataset.klaviyoPreLaunchListId || '',
    };
  }

  async function subscribeToList(publicKey, listId, email) {
    const url = `${KLAVIYO_BASE}/subscriptions/?company_id=${encodeURIComponent(publicKey)}`;
    const body = {
      data: {
        type: 'subscription',
        attributes: {
          profile: {
            data: {
              type: 'profile',
              attributes: { email },
            },
          },
        },
        relationships: {
          list: {
            data: { type: 'list', id: listId },
          },
        },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        revision: REVISION,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Subscribe failed: ${res.status}`);
    }
  }

  async function trackEvent(publicKey, email, productData) {
    const url = `${KLAVIYO_BASE}/events/?company_id=${encodeURIComponent(publicKey)}`;
    const properties = {
      product_id: productData.productId,
      product_title: productData.productTitle,
      product_url: productData.productUrl,
      product_image: productData.productImage,
    };
    if (productData.launchDate) {
      properties.launch_date = productData.launchDate;
    }

    const body = {
      data: {
        type: 'event',
        attributes: {
          properties,
          metric: {
            data: {
              type: 'metric',
              attributes: { name: 'Subscribed to Pre-Launch' },
            },
          },
          profile: {
            data: {
              type: 'profile',
              attributes: { email },
            },
          },
        },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        revision: REVISION,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Event failed: ${res.status}`);
    }
  }

  function bindForm(form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const config = getKlaviyoConfig();
      if (!config.publicKey || !config.listId) {
        console.warn('[pre-listing] Klaviyo settings missing on <body> data attrs.');
        showError(form);
        return;
      }

      const emailInput = form.querySelector('input[name="email"]');
      const email = (emailInput && emailInput.value || '').trim();
      if (!email) return;

      const productData = {
        productId: form.dataset.productId,
        productTitle: form.dataset.productTitle,
        productUrl: form.dataset.productUrl,
        productImage: form.dataset.productImage,
        launchDate: form.dataset.launchDate || null,
      };

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      if (submitButton) submitButton.classList.add('is-loading');

      try {
        await subscribeToList(config.publicKey, config.listId, email);
        await trackEvent(config.publicKey, email, productData);
        showSuccess(form);
      } catch (err) {
        console.error('[pre-listing] Klaviyo submit failed:', err);
        showError(form);
        if (submitButton) submitButton.disabled = false;
        if (submitButton) submitButton.classList.remove('is-loading');
      }
    });
  }

  function showSuccess(form) {
    form.hidden = true;
    const block = form.closest('.pre-listing-block');
    if (!block) return;
    const success = block.querySelector('[data-pre-listing-success]');
    if (success) success.hidden = false;
  }

  function showError(form) {
    const error = form.querySelector('[data-pre-listing-error]');
    if (error) error.hidden = false;
  }

  function init() {
    const forms = document.querySelectorAll('[data-pre-listing-form]');
    forms.forEach(bindForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
