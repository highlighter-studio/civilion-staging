# PDP Gender Toggle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gender toggle on the PDP that navigates between men's and women's product versions via AJAX swap, with gendered size guide tabs.

**Architecture:** Extract the AJAX swap logic from `colorway-swatches.js` into a shared utility (`product-page-swap.js`), then build a gender toggle theme block that consumes it. Modify the size guide modal to render tabbed men's/women's measurement tables.

**Tech Stack:** Shopify Liquid, vanilla JS (IIFE/global pattern), CSS, Luxe theme conventions

**Testing:** This is a Shopify theme — no automated test runner. Each task includes manual browser verification steps against the Shopify preview.

**Spec:** `docs/superpowers/specs/2026-03-13-pdp-gender-toggle-design.md`

---

## Chunk 1: Shared Swap Utility + Colorway Refactor

### Task 1: Create shared swap utility

**Files:**
- Create: `assets/product-page-swap.js`

- [ ] **Step 1: Write `product-page-swap.js`**

```js
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
```

- [ ] **Step 2: Load utility unconditionally in `main-product.liquid`**

In `sections/main-product.liquid`, add the script load just before the block render loop (before line 290). Insert:

```liquid
<script src="{{ 'product-page-swap.js' | asset_url }}" defer="defer"></script>
```

Place it right before `{%- for block in section.blocks -%}` at line 290, so it loads on every PDP regardless of which blocks are present.

- [ ] **Step 3: Commit**

```bash
git add assets/product-page-swap.js sections/main-product.liquid
git commit -m "feat: add shared product page swap utility (product-page-swap.js)"
```

### Task 2: Refactor colorway-swatches.js to use shared utility

**Files:**
- Modify: `assets/colorway-swatches.js` (full rewrite — replace lines 1-78)

- [ ] **Step 1: Replace `colorway-swatches.js` contents**

The new file keeps the click handler and active-swatch guard, but delegates the swap to `ProductPageSwap.navigate()`. The inline fetch/parse/swap block and the popstate listener are both removed.

```js
/**
 * Colorway Swatches — click handler for pseudo-variant color navigation.
 *
 * Delegates AJAX product swap to ProductPageSwap utility.
 * Falls back to standard navigation if the swap fails.
 */
(function () {
  document.addEventListener('click', function (e) {
    const swatch = e.target.closest('.colorway-swatches-block__swatch[data-product-url]');
    if (!swatch || swatch.classList.contains('colorway-swatches-block__swatch--active')) return;

    e.preventDefault();

    const productUrl = swatch.dataset.productUrl;
    if (!productUrl) return;

    // Guard: fall back to standard navigation if utility not loaded
    if (!window.ProductPageSwap) {
      window.location.href = productUrl;
      return;
    }

    const swatchBlock = swatch.closest('.colorway-swatches-block');

    ProductPageSwap.navigate(productUrl, {
      stateKey: 'colorwaySwap',
      onBeforeSwap: function () {
        if (swatchBlock) swatchBlock.style.opacity = '0.5';
      }
    }).catch(function () {
      window.location.href = productUrl;
    });
  });
})();
```

- [ ] **Step 2: Verify colorway swatches still work**

In Shopify theme preview:
1. Navigate to a product with colorway swatches
2. Click a different colorway swatch
3. Verify: page swaps via AJAX (no full reload), URL updates, gallery/variant picker/sticky ATC reinitialize
4. Verify: browser back button reloads to previous product
5. Verify: no console errors

- [ ] **Step 3: Commit**

```bash
git add assets/colorway-swatches.js
git commit -m "refactor: colorway-swatches.js uses shared ProductPageSwap utility"
```

---

## Chunk 2: Gender Toggle Block

### Task 3: Create gender toggle CSS

**Files:**
- Create: `assets/gender-toggle.css`

- [ ] **Step 1: Write `gender-toggle.css`**

```css
/* Gender Toggle — segmented pill for men's/women's product navigation */

.gender-toggle {
  border: none;
  padding: 0;
  margin: 0;
}

.gender-toggle__pills {
  display: inline-flex;
  border: 1px solid rgba(var(--color-foreground), 0.15);
  border-radius: 4px;
  overflow: hidden;
}

.gender-toggle__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.25rem;
  font-size: 0.8125rem;
  font-family: inherit;
  letter-spacing: 0.04em;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  border: none;
  background: transparent;
  color: rgba(var(--color-foreground), 0.55);
}

.gender-toggle__pill--active {
  background: rgb(var(--color-foreground));
  color: rgb(var(--color-background));
  cursor: default;
}

.gender-toggle__pill:not(.gender-toggle__pill--active):hover {
  background: rgba(var(--color-foreground), 0.06);
  color: rgba(var(--color-foreground), 0.8);
}

/* Divider between pills */
.gender-toggle__pill + .gender-toggle__pill {
  border-left: 1px solid rgba(var(--color-foreground), 0.15);
}

.gender-toggle__pill--active + .gender-toggle__pill,
.gender-toggle__pill + .gender-toggle__pill--active {
  border-left-color: transparent;
}
```

- [ ] **Step 2: Commit**

```bash
git add assets/gender-toggle.css
git commit -m "feat: add gender toggle CSS (segmented pill styling)"
```

### Task 4: Create gender toggle JS

**Files:**
- Create: `assets/gender-toggle.js`

- [ ] **Step 1: Write `gender-toggle.js`**

```js
/**
 * Gender Toggle — click handler for men's/women's product navigation.
 *
 * Delegates AJAX product swap to ProductPageSwap utility.
 * Falls back to standard navigation if the swap fails.
 */
(function () {
  document.addEventListener('click', function (e) {
    const pill = e.target.closest('[data-gender-swap-url]');
    if (!pill) return;

    e.preventDefault();

    const url = pill.dataset.genderSwapUrl;
    if (!url) return;

    // Guard: fall back to standard navigation if utility not loaded
    if (!window.ProductPageSwap) {
      window.location.href = url;
      return;
    }

    const toggle = pill.closest('.gender-toggle');

    ProductPageSwap.navigate(url, {
      stateKey: 'genderSwap',
      onBeforeSwap: function () {
        if (toggle) toggle.style.opacity = '0.5';
      }
    }).catch(function () {
      window.location.href = url;
    });
  });
})();
```

- [ ] **Step 2: Commit**

```bash
git add assets/gender-toggle.js
git commit -m "feat: add gender toggle JS (click handler with AJAX swap)"
```

### Task 5: Add gender toggle block to main-product.liquid

**Files:**
- Modify: `sections/main-product.liquid`
  - Block render: insert new `when` case after the `colorway_swatches` case (after line 967)
  - Block schema: insert new block type after the `colorway_swatches` schema entry (after line 3102)

- [ ] **Step 1: Add `when 'gender_toggle'` case**

Insert after the `{%- endif -%}` that closes the `colorway_swatches` case (line 967), before `{%- when 'custom_liquid' -%}` (line 969):

```liquid

            {%- when 'gender_toggle' -%}
            {%- liquid
              assign product_gender = product.metafields.custom.product_gender.value
              assign counterpart = product.metafields.custom.gender_counterpart.value
            -%}
            {%- if product_gender != blank and counterpart != blank -%}
              {{ 'gender-toggle.css' | asset_url | stylesheet_tag }}
              {%- if product_gender == "Women's" -%}
                {%- assign active_label = "Women's" -%}
                {%- assign inactive_label = "Men's" -%}
              {%- else -%}
                {%- assign active_label = "Men's" -%}
                {%- assign inactive_label = "Women's" -%}
              {%- endif -%}
              <fieldset class="gender-toggle product-form__input" {{ block.shopify_attributes }}>
                <legend class="form__label">Gender</legend>
                <div class="gender-toggle__pills">
                  <span class="gender-toggle__pill gender-toggle__pill--active" aria-current="true">{{ active_label }}</span>
                  <a href="{{ counterpart.url }}" class="gender-toggle__pill" data-gender-swap-url="{{ counterpart.url }}" aria-label="Switch to {{ inactive_label }}">{{ inactive_label }}</a>
                </div>
              </fieldset>
              <script src="{{ 'gender-toggle.js' | asset_url }}" defer="defer"></script>
            {%- endif -%}
```

- [ ] **Step 2: Add block schema entry**

Insert after the `colorway_swatches` schema block (after line 3102, before the `custom_liquid` block):

```json
    {
      "type": "gender_toggle",
      "limit": 1,
      "name": "Gender toggle",
      "settings": []
    },
```

- [ ] **Step 3: Verify toggle renders**

Prerequisites: set up test data in Shopify admin:
1. Create `custom.product_gender` metafield on two products (one "Men's", one "Women's")
2. Create `custom.gender_counterpart` on each, pointing to the other
3. Add the "Gender toggle" block to the product template via theme editor, positioned above the variant picker

In Shopify theme preview:
1. Navigate to the men's product → verify toggle shows "Men's" active, "Women's" as link
2. Navigate to the women's product → verify toggle shows "Women's" active, "Men's" as link
3. Click the inactive pill → verify AJAX swap occurs: URL updates, page content changes, no full reload
4. Verify browser back/forward works
5. Navigate to a product without `gender_counterpart` → verify toggle does not render (no empty fieldset, no layout shift)
6. Verify no console errors

- [ ] **Step 4: Commit**

```bash
git add sections/main-product.liquid
git commit -m "feat: add gender toggle block to product template"
```

---

## Chunk 3: Size Guide Modal — Gendered Tabs

### Task 6: Add gendered tabs to size guide modal

**Files:**
- Modify: `snippets/size-guide-modal.liquid` (replace lines 32-54 with tabbed implementation)
- Create: `assets/size-guide-tabs.js` (tab switching via document-level event delegation — survives AJAX swap)
- Modify: `assets/size-guide-modal.css` (add tab styles at end of file)

- [ ] **Step 1: Modify `snippets/size-guide-modal.liquid`**

Replace the entire file contents with:

```liquid
{% comment %}
  Renders the size guide modal for the current product.

  Accepts:
  - product: {Object} product object with custom.size_guide metafield

  Usage:
  {% render 'size-guide-modal', product: product %}
{% endcomment %}

{% assign size_guide = product.metafields.custom.size_guide.value %}
{% if size_guide %}
{{ 'size-guide-modal.css' | asset_url | stylesheet_tag }}
<modal-dialog id="SizeGuideModal" class="product-popup-modal">
  <div role="dialog" aria-label="{{ size_guide.product_type.value }} Size Guide" aria-modal="true" class="product-popup-modal__content" tabindex="-1">
    <div class="modal-header">
      <button id="ModalClose-SizeGuide" type="button" class="product-popup-modal__toggle" aria-label="{{ 'accessibility.close' | t }}">
        {% render 'icon-close' %}
      </button>
      <span class="dialog-title">{{ size_guide.product_type.value }} Size Guide</span>
    </div>
    {% if size_guide.fit_description.value %}
      <p class="size-guide-modal__fit-description">{{ size_guide.fit_description.value }}</p>
    {% endif %}
    <div class="product-popup-modal__content-info size-guide-modal__body">
      {% if size_guide.silhouette_image.value %}
        <div class="size-guide-modal__image">
          {% assign sg_alt = size_guide.product_type.value | append: ' size guide diagram' %}
          {{ size_guide.silhouette_image.value | image_url: width: 800 | image_tag: loading: 'lazy', alt: sg_alt }}
        </div>
      {% endif %}
      {% assign measurements = size_guide.measurements.value %}
      {% assign womens_measurements = size_guide.womens_measurements.value %}
      {% assign product_gender = product.metafields.custom.product_gender.value %}
      {% assign has_mens = false %}
      {% assign has_womens = false %}
      {% if measurements.headers and measurements.rows %}
        {% assign has_mens = true %}
      {% endif %}
      {% if womens_measurements.headers and womens_measurements.rows %}
        {% assign has_womens = true %}
      {% endif %}

      {% if has_mens and has_womens %}
        {%- comment -%} Tabbed interface — both gendered tables {%- endcomment -%}
        {% assign womens_active = false %}
        {% if product_gender == "Women's" %}
          {% assign womens_active = true %}
        {% endif %}
        <div class="size-guide-modal__tabs" role="tablist">
          <button class="size-guide-modal__tab{% unless womens_active %} size-guide-modal__tab--active{% endunless %}"
                  data-tab="mens" type="button" role="tab"
                  aria-selected="{% if womens_active %}false{% else %}true{% endif %}"
                  aria-controls="sg-panel-mens"
                  id="sg-tab-mens">Men's</button>
          <button class="size-guide-modal__tab{% if womens_active %} size-guide-modal__tab--active{% endif %}"
                  data-tab="womens" type="button" role="tab"
                  aria-selected="{% if womens_active %}true{% else %}false{% endif %}"
                  aria-controls="sg-panel-womens"
                  id="sg-tab-womens">Women's</button>
        </div>
        <div class="size-guide-modal__tab-panel" data-panel="mens"
             role="tabpanel" id="sg-panel-mens" aria-labelledby="sg-tab-mens"
             {% if womens_active %}hidden{% endif %}>
          <div class="size-guide-modal__measurements">
            <table>
              <thead>
                <tr>
                  {% for header in measurements.headers %}
                    <th>{{ header }}</th>
                  {% endfor %}
                </tr>
              </thead>
              <tbody>
                {% for row in measurements.rows %}
                  <tr>
                    {% for cell in row %}
                      <td>{{ cell }}</td>
                    {% endfor %}
                  </tr>
                {% endfor %}
              </tbody>
            </table>
          </div>
        </div>
        <div class="size-guide-modal__tab-panel" data-panel="womens"
             role="tabpanel" id="sg-panel-womens" aria-labelledby="sg-tab-womens"
             {% unless womens_active %}hidden{% endunless %}>
          <div class="size-guide-modal__measurements">
            <table>
              <thead>
                <tr>
                  {% for header in womens_measurements.headers %}
                    <th>{{ header }}</th>
                  {% endfor %}
                </tr>
              </thead>
              <tbody>
                {% for row in womens_measurements.rows %}
                  <tr>
                    {% for cell in row %}
                      <td>{{ cell }}</td>
                    {% endfor %}
                  </tr>
                {% endfor %}
              </tbody>
            </table>
          </div>
        </div>
      {% elsif has_mens %}
        {%- comment -%} Single table — men's only (backwards compatible) {%- endcomment -%}
        <div class="size-guide-modal__measurements">
          <table>
            <thead>
              <tr>
                {% for header in measurements.headers %}
                  <th>{{ header }}</th>
                {% endfor %}
              </tr>
            </thead>
            <tbody>
              {% for row in measurements.rows %}
                <tr>
                  {% for cell in row %}
                    <td>{{ cell }}</td>
                  {% endfor %}
                </tr>
              {% endfor %}
            </tbody>
          </table>
        </div>
      {% elsif has_womens %}
        {%- comment -%} Single table — women's only {%- endcomment -%}
        <div class="size-guide-modal__measurements">
          <table>
            <thead>
              <tr>
                {% for header in womens_measurements.headers %}
                  <th>{{ header }}</th>
                {% endfor %}
              </tr>
            </thead>
            <tbody>
              {% for row in womens_measurements.rows %}
                <tr>
                  {% for cell in row %}
                    <td>{{ cell }}</td>
                  {% endfor %}
                </tr>
              {% endfor %}
            </tbody>
          </table>
        </div>
      {% endif %}
    </div>
  </div>
</modal-dialog>
{% endif %}
```

- [ ] **Step 2: Create `assets/size-guide-tabs.js`**

Tab switching uses document-level event delegation so it survives AJAX DOM swaps (inline scripts don't execute after `innerHTML` replacement).

```js
/**
 * Size Guide Tabs — tab switching for gendered measurement tables.
 *
 * Uses document-level event delegation so it works after AJAX
 * product swaps (inline scripts in swapped HTML don't re-execute).
 */
(function () {
  if (window.__sizeGuideTabsInit) return;
  window.__sizeGuideTabsInit = true;

  document.addEventListener('click', function (e) {
    const tab = e.target.closest('.size-guide-modal__tab');
    if (!tab || tab.classList.contains('size-guide-modal__tab--active')) return;

    const target = tab.dataset.tab;
    const modal = tab.closest('#SizeGuideModal');
    if (!modal) return;

    modal.querySelectorAll('.size-guide-modal__tab').forEach(function (t) {
      t.classList.remove('size-guide-modal__tab--active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('size-guide-modal__tab--active');
    tab.setAttribute('aria-selected', 'true');

    modal.querySelectorAll('.size-guide-modal__tab-panel').forEach(function (p) {
      p.hidden = p.dataset.panel !== target;
    });
  });
})();
```

Also, add the script load in the size guide modal snippet. In the Liquid from Step 1, add this line right before the closing `</modal-dialog>` tag (inside the `{% if has_mens and has_womens %}` branch, after the women's tab panel):

```liquid
        <script src="{{ 'size-guide-tabs.js' | asset_url }}" defer="defer"></script>
```

Note: While this script tag is inside `<main>` and will be replaced on AJAX swap, the event delegation on `document` means only one listener is ever active — subsequent loads are harmless IIFEs that re-register on `document` (event delegation is idempotent in terms of behavior, though technically adds redundant listeners). For this low-frequency interaction, this is acceptable. If it becomes a concern, a guard like `if (window.__sizeGuideTabsInit) return; window.__sizeGuideTabsInit = true;` can be added at the top of the IIFE.

- [ ] **Step 3: Add tab styles to `assets/size-guide-modal.css`**

Append to end of file:

```css

/* Gendered measurement tabs */
.size-guide-modal__tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(var(--color-foreground), 0.08);
}

.size-guide-modal__tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-family: inherit;
  color: rgba(var(--color-foreground), 0.5);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.size-guide-modal__tab:hover {
  color: rgba(var(--color-foreground), 0.75);
}

.size-guide-modal__tab--active {
  color: rgb(var(--color-foreground));
  border-bottom-color: rgb(var(--color-foreground));
  cursor: default;
}
```

- [ ] **Step 4: Verify size guide tabs**

Prerequisites: add `womens_measurements` JSON field to the `size_guide` metaobject in Shopify admin with test data.

In Shopify theme preview:
1. Navigate to a men's product → open size guide modal → verify "Men's" tab is active, men's table visible
2. Click "Women's" tab → verify women's table appears, men's hides
3. Navigate to a women's product → open size guide → verify "Women's" tab is active by default
4. Navigate to a product with only `measurements` (no `womens_measurements`) → verify single table renders with no tabs (backwards compatible)
5. Verify no console errors

- [ ] **Step 5: Commit**

```bash
git add snippets/size-guide-modal.liquid assets/size-guide-tabs.js assets/size-guide-modal.css
git commit -m "feat: add gendered measurement tabs to size guide modal"
```

---

## Chunk 4: Integration Verification

### Task 7: End-to-end verification

No code changes — this is a manual verification pass across all interactions.

- [ ] **Step 1: Gender toggle basic flow**

1. Men's product PDP → toggle shows "Men's" active
2. Click "Women's" → AJAX swap, URL updates, women's product loads
3. Toggle now shows "Women's" active
4. Click "Men's" → swaps back
5. Browser back → returns to previous product
6. Browser forward → returns to next product

- [ ] **Step 2: Gender toggle + colorway swatches interaction**

1. On a men's product with colorway swatches and gender toggle
2. Click a different colorway → AJAX swap, gender toggle still shows "Men's" active
3. Click "Women's" on the gender toggle → swaps to women's version of the new colorway
4. Verify colorway swatches now show women's colorway group

- [ ] **Step 3: Gender toggle + size guide**

1. On a men's product, open size guide → "Men's" tab active
2. Close modal, click "Women's" toggle → swap to women's product
3. Open size guide again → "Women's" tab now active by default

- [ ] **Step 4: Graceful degradation**

1. Product with no `gender_counterpart` → no toggle rendered, no empty space
2. Product with `product_gender` but no counterpart → no toggle rendered

- [ ] **Step 5: Responsive check**

1. Toggle renders correctly on mobile viewport (< 750px)
2. Toggle renders correctly on desktop viewport
3. Size guide tabs work on mobile

- [ ] **Step 6: Console check**

1. Open DevTools console on all test pages
2. Verify zero errors across all swap interactions
3. Verify no layout shift (CLS) when toggle is present or absent
