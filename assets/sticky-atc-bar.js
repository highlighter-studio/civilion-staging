if (!customElements.get('sticky-atc-bar')) {
  customElements.define(
    'sticky-atc-bar',
    class StickyAtcBar extends HTMLElement {
      constructor() {
        super();
        this.observer = null;
        this.mainAtcMutationObserver = null;
        this.variantChangeUnsubscribe = null;
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
            // Show only when the main ATC has scrolled ABOVE the viewport
            // (not when it's below, e.g. on initial page load before any scroll).
            const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            this.toggleVisible(scrolledPast);
          },
          { root: null, threshold: 0 }
        );
        this.observer.observe(this.mainAtc);
      }

      toggleVisible(visible) {
        if (visible) {
          this.removeAttribute('hidden');
          document.body.classList.add('has-sticky-atc-bar');
        } else {
          this.setAttribute('hidden', '');
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
        if (!this.miniSelect || !this.mainVariantSelects) return;

        this.miniSelect.addEventListener('change', () => {
          const optionName = this.miniSelect.dataset.stickyAtcOption;
          const value = this.miniSelect.value;
          this.syncToMain(optionName, value);
        });
      }

      refreshMiniFromMain() {
        if (!this.miniSelect || !this.mainVariantSelects) return;
        const optionName = this.miniSelect.dataset.stickyAtcOption;

        // Mirror selected value + disabled state from the main picker.
        const mainSelect = this.mainVariantSelects.querySelector(
          `select[name="options[${CSS.escape(optionName)}]"]`
        );
        if (mainSelect) {
          if (this.miniSelect.value !== mainSelect.value) {
            this.miniSelect.value = mainSelect.value;
          }
          for (const opt of this.miniSelect.options) {
            const mainOpt = Array.from(mainSelect.options).find((o) => o.value === opt.value);
            opt.disabled = mainOpt ? mainOpt.disabled : opt.disabled;
          }
          return;
        }

        const radios = this.mainVariantSelects.querySelectorAll(
          `input[type="radio"][name^="${CSS.escape(optionName)}-"]`
        );
        if (!radios.length) return;

        const checked = Array.from(radios).find((r) => r.checked);
        if (checked && this.miniSelect.value !== checked.value) {
          this.miniSelect.value = checked.value;
        }
        for (const opt of this.miniSelect.options) {
          const radio = Array.from(radios).find((r) => r.value === opt.value);
          if (!radio) continue;
          // Radios aren't disabled via attribute in this theme; they carry a `.disabled` class.
          opt.disabled = radio.classList.contains('disabled');
        }
      }

      syncToMain(optionName, value) {
        if (!this.mainVariantSelects) return;

        // Try a matching <select> first (dropdown picker)
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

        // Otherwise look for a radio (pill picker); name format is `{OptionName}-{position}`
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
