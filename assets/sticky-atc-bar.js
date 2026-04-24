if (!customElements.get('sticky-atc-bar')) {
  customElements.define(
    'sticky-atc-bar',
    class StickyAtcBar extends HTMLElement {
      constructor() {
        super();
        this.observer = null;
        this.mainAtcMutationObserver = null;
        this.variantChangeUnsubscribe = null;
        this.miniPills = [];
      }

      connectedCallback() {
        this.init();
        if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          this.variantChangeUnsubscribe = subscribe(PUB_SUB_EVENTS.variantChange, () => {
            // Main variant-selects gets swapped; re-bind and re-sync mini state.
            this.init();
            this.refreshMiniFromMain();
          });
        }
      }

      disconnectedCallback() {
        this.teardown();
        if (this.variantChangeUnsubscribe) {
          this.variantChangeUnsubscribe();
          this.variantChangeUnsubscribe = null;
        }
      }

      init() {
        this.teardown();

        this.productInfo = this.closest('product-info');
        if (!this.productInfo) return;

        this.mainAtc = this.productInfo.querySelector('.product-form__submit');
        this.mainVariantSelects = this.productInfo.querySelector('variant-selects');
        this.miniSelect = this.querySelector('[data-sticky-atc-option]');
        this.miniPillsContainer = this.querySelector('[data-sticky-atc-pills-option]');
        this.miniPills = Array.from(this.querySelectorAll('[data-sticky-atc-pill-value]'));
        this.miniSubmit = this.querySelector('[data-sticky-atc-submit]');
        this.miniLabel = this.querySelector('[data-sticky-atc-label]');

        if (!this.mainAtc) return;

        this.setupVisibilityObserver();
        this.setupAtcMirror();
        this.setupOptionSync();
      }

      teardown() {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
        if (this.mainAtcMutationObserver) {
          this.mainAtcMutationObserver.disconnect();
          this.mainAtcMutationObserver = null;
        }
      }

      setupVisibilityObserver() {
        this.observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            this.toggleVisible(scrolledPast);
          },
          { root: null, threshold: 0 }
        );
        this.observer.observe(this.mainAtc);
      }

      toggleVisible(visible) {
        if (visible) {
          this.classList.add('is-visible');
          this.removeAttribute('inert');
          this.removeAttribute('aria-hidden');
          document.body.classList.add('has-sticky-atc-bar');
        } else {
          this.classList.remove('is-visible');
          this.setAttribute('inert', '');
          this.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('has-sticky-atc-bar');
        }
      }

      setupAtcMirror() {
        this.mirrorMainAtc();
        this.mainAtcMutationObserver = new MutationObserver(() => this.mirrorMainAtc());
        this.mainAtcMutationObserver.observe(this.mainAtc, {
          attributes: true,
          attributeFilter: ['disabled'],
          childList: true,
          subtree: true,
          characterData: true,
        });
      }

      mirrorMainAtc() {
        if (!this.miniSubmit || !this.mainAtc) return;
        const disabled = this.mainAtc.hasAttribute('disabled');
        this.miniSubmit.toggleAttribute('disabled', disabled);

        const mainLabelEl = this.mainAtc.querySelector('span');
        if (mainLabelEl && this.miniLabel) {
          this.miniLabel.textContent = mainLabelEl.textContent.trim();
        }
      }

      setupOptionSync() {
        if (this.miniSelect && this.mainVariantSelects) {
          this.miniSelect.addEventListener('change', () => {
            this.syncToMain(this.miniSelect.dataset.stickyAtcOption, this.miniSelect.value);
          });
        }

        if (this.miniPillsContainer && this.miniPills.length) {
          const optionName = this.miniPillsContainer.dataset.stickyAtcPillsOption;
          this.miniPills.forEach((pill) => {
            pill.addEventListener('click', () => {
              if (pill.getAttribute('aria-disabled') === 'true') return;
              const value = pill.dataset.stickyAtcPillValue;
              this.syncToMain(optionName, value);
              this.markPillSelected(value);
            });
          });
        }
      }

      markPillSelected(value) {
        this.miniPills.forEach((pill) => {
          const selected = pill.dataset.stickyAtcPillValue === value;
          pill.classList.toggle('is-selected', selected);
          pill.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
      }

      refreshMiniFromMain() {
        if (!this.mainVariantSelects) return;

        // ----- Refresh mobile <select> -----
        if (this.miniSelect) {
          const optionName = this.miniSelect.dataset.stickyAtcOption;
          const mainSelect = this.mainVariantSelects.querySelector(
            `select[name="options[${CSS.escape(optionName)}]"]`
          );
          if (mainSelect) {
            if (this.miniSelect.value !== mainSelect.value) this.miniSelect.value = mainSelect.value;
            for (const opt of this.miniSelect.options) {
              const mainOpt = Array.from(mainSelect.options).find((o) => o.value === opt.value);
              if (mainOpt) opt.disabled = mainOpt.disabled;
            }
          } else {
            const radios = this.mainVariantSelects.querySelectorAll(
              `input[type="radio"][name^="${CSS.escape(optionName)}-"]`
            );
            const checked = Array.from(radios).find((r) => r.checked);
            if (checked && this.miniSelect.value !== checked.value) this.miniSelect.value = checked.value;
            for (const opt of this.miniSelect.options) {
              const radio = Array.from(radios).find((r) => r.value === opt.value);
              if (radio) opt.disabled = radio.classList.contains('disabled');
            }
          }
        }

        // ----- Refresh desktop pills -----
        if (this.miniPillsContainer && this.miniPills.length) {
          const optionName = this.miniPillsContainer.dataset.stickyAtcPillsOption;
          const radios = this.mainVariantSelects.querySelectorAll(
            `input[type="radio"][name^="${CSS.escape(optionName)}-"]`
          );
          const mainSelect = this.mainVariantSelects.querySelector(
            `select[name="options[${CSS.escape(optionName)}]"]`
          );

          let checkedValue = null;
          const unavailable = new Set();

          if (radios.length) {
            const checked = Array.from(radios).find((r) => r.checked);
            checkedValue = checked ? checked.value : null;
            radios.forEach((r) => {
              if (r.classList.contains('disabled')) unavailable.add(r.value);
            });
          } else if (mainSelect) {
            checkedValue = mainSelect.value;
            Array.from(mainSelect.options).forEach((o) => {
              if (o.disabled) unavailable.add(o.value);
            });
          }

          this.miniPills.forEach((pill) => {
            const value = pill.dataset.stickyAtcPillValue;
            const selected = value === checkedValue;
            const isUnavailable = unavailable.has(value);
            pill.classList.toggle('is-selected', selected);
            pill.classList.toggle('is-unavailable', isUnavailable);
            pill.setAttribute('aria-pressed', selected ? 'true' : 'false');
            if (isUnavailable) pill.setAttribute('aria-disabled', 'true');
            else pill.removeAttribute('aria-disabled');
          });
        }
      }

      syncToMain(optionName, value) {
        if (!this.mainVariantSelects) return;

        const select = this.mainVariantSelects.querySelector(
          `select[name="options[${CSS.escape(optionName)}]"]`
        );
        if (select) {
          if (select.value !== value) {
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return;
        }

        const radios = this.mainVariantSelects.querySelectorAll(
          `input[type="radio"][name^="${CSS.escape(optionName)}-"]`
        );
        for (const radio of radios) {
          if (radio.value === value) {
            if (!radio.checked) {
              radio.checked = true;
              radio.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
          }
        }
      }
    }
  );
}
