# PDP Gender Toggle — Design Spec

**Date:** 2026-03-13
**Client:** Civilion
**Theme:** Luxe (civilion-staging)

## Overview

Civilion's footwear is unisex by design, but each shoe model exists as two separate Shopify products — one men's, one women's — for Google Shopping, SEO, and customer UX. This feature adds a gender toggle on the PDP that navigates between men's and women's versions of the same shoe model, updating the URL and ensuring the size guide modal shows the correct gendered measurement table.

## Metafields

Two product metafields (created in Shopify admin, not by theme code):

- **`custom.product_gender`** — `single_line_text`, value `"Men's"` or `"Women's"`. Declares the product's gender identity. Determines active toggle state and default size guide tab.
- **`custom.gender_counterpart`** — `product_reference`, points to the opposite-gender version of the same shoe model + colorway. If empty, the toggle does not render.

## Component 1: Shared Swap Utility

**File:** `assets/product-page-swap.js` (new)

Extracts the AJAX product swap logic currently inlined in `colorway-swatches.js` into a reusable global utility.

### API

```js
window.ProductPageSwap = {
  navigate(url, options) → Promise<void>
}
```

**Options:**
- `onBeforeSwap(url)` — optional callback for loading states
- `onAfterSwap(url)` — optional callback for cleanup
- `stateKey` — string for pushState state object (default: `'productSwap'`)

### Responsibilities

1. Fetch target URL, parse with `DOMParser`
2. Swap `<main>` via `HTMLUpdateUtility.viewTransition()` with standard callbacks:
   - **Pre:** cancel `.scroll-trigger` animations
   - **Post:** reinit `Shopify.PaymentButton`, `ProductModel.loadShopifyXR()`
3. Update `<title>` from parsed document
4. `history.pushState()` with `{ [stateKey]: true, url }` state
5. Smooth scroll to product section
6. Return Promise — resolves on success, rejects on failure

### Popstate

Single `popstate` listener: reloads page if `e.state` contains any swap key (`productSwap`, `colorwaySwap`, `genderSwap`). Replaces the current listener in `colorway-swatches.js`.

### Refactor of colorway-swatches.js

Replace the inline fetch/parse/swap block (~40 lines) with:

```js
ProductPageSwap.navigate(productUrl, {
  stateKey: 'colorwaySwap',
  onBeforeSwap: function () { swatchBlock.style.opacity = '0.5'; }
}).catch(function () {
  window.location.href = productUrl;
});
```

Click handler, active-swatch guard, and event delegation remain unchanged.

## Component 2: Gender Toggle Block

### Liquid — `sections/main-product.liquid`

New `{%- when 'gender_toggle' -%}` case in the block render loop.

**Logic:**
1. Read `product.metafields.custom.product_gender` and `product.metafields.custom.gender_counterpart.value`
2. Guard: if either is blank, or counterpart product doesn't exist → render nothing
3. Render segmented pill toggle

**Markup:**
```html
<fieldset class="gender-toggle product-form__input" {{ block.shopify_attributes }}>
  <legend class="form__label">Gender</legend>
  <div class="gender-toggle__pills">
    <!-- Active gender -->
    <span class="gender-toggle__pill gender-toggle__pill--active" aria-current="true">Men's</span>
    <!-- Inactive gender — links to counterpart -->
    <a href="{{ counterpart_url }}"
       class="gender-toggle__pill"
       data-gender-swap-url="{{ counterpart_url }}"
       aria-label="Switch to Women's">Women's</a>
  </div>
</fieldset>
```

Active/inactive positions swap based on `custom.product_gender`.

**Schema registration:**
```json
{
  "type": "gender_toggle",
  "limit": 1,
  "name": "Gender toggle",
  "settings": []
}
```

### CSS — `assets/gender-toggle.css` (new)

Segmented pill styling:
- Two pills in a tight flex row with shared border container
- Active pill: solid fill (theme foreground), text in background color
- Inactive pill: transparent background, foreground text, subtle hover state
- Thin borders, no heavy shadows — consistent with Luxe's minimal luxury aesthetic
- Responsive: pills remain inline on mobile, typography scales with theme

### JS — `assets/gender-toggle.js` (new)

Minimal click handler:
- Event delegation on `[data-gender-swap-url]` clicks
- Prevent default
- Set loading state (opacity on parent `.gender-toggle`)
- Call `ProductPageSwap.navigate(url, { stateKey: 'genderSwap' })`
- Catch: fallback to `window.location.href`

## Component 3: Size Guide Modal — Gendered Tabs

### Metaobject Change

Add `womens_measurements` JSON field to existing `size_guide` metaobject definition. Same structure as `measurements`: `{ headers: string[], rows: string[][] }`. Existing `measurements` field serves as men's data.

### Liquid — `snippets/size-guide-modal.liquid` (modified)

- Read `product.metafields.custom.product_gender` to determine active tab
- If both `measurements` and `womens_measurements` exist → render tabbed interface
- If only one exists → render single table, no tabs (backwards compatible)

**Tab markup:**
```html
<div class="size-guide-modal__tabs">
  <button class="size-guide-modal__tab size-guide-modal__tab--active"
          data-tab="mens" type="button">Men's</button>
  <button class="size-guide-modal__tab"
          data-tab="womens" type="button">Women's</button>
</div>
<div class="size-guide-modal__tab-panel" data-panel="mens">
  <!-- men's measurement table -->
</div>
<div class="size-guide-modal__tab-panel" data-panel="womens" hidden>
  <!-- women's measurement table -->
</div>
```

Active tab defaults to current product's `product_gender`. After AJAX swap, the modal is fully re-rendered with the new product's gender context.

**Tab JS:** ~10 lines of inline vanilla JS within a `<script>` block in the snippet. Tab click toggles `--active` class and `hidden` attribute on panels.

### CSS — `assets/size-guide-modal.css` (modified)

- Tab bar: flex row, bottom-aligned
- Active tab: border-bottom accent line
- Inactive tab: no border, subtle hover opacity
- Consistent with modal's existing typography (font-size, weight, color)
- Panels: show/hide via `hidden` attribute

## Integration & Edge Cases

### Colorway swatch interaction

No changes needed. Colorway groups are gender-specific — men's products link to other men's colorways. After colorway AJAX swap, the new product's `product_gender` and `gender_counterpart` metafields render the correct toggle state.

### Graceful degradation

| Condition | Behavior |
|-----------|----------|
| No `gender_counterpart` | Block renders nothing |
| `product_gender` set, no counterpart | Block renders nothing |
| Counterpart deleted/unpublished | Liquid `.value` returns nil → nothing rendered |
| AJAX fetch fails | Promise rejects → fallback to `window.location.href` |

### Reinit after swap

The shared utility's post-swap callbacks handle PaymentButton and ProductModel. All PDP elements (toggle, swatches, size guide, variant picker, sticky ATC) live inside `<main>` and are fully replaced with fresh HTML from the new page.

## Files Touched

| File | Status | Purpose |
|------|--------|---------|
| `assets/product-page-swap.js` | New | Shared AJAX swap utility |
| `assets/gender-toggle.js` | New | Toggle click handler |
| `assets/gender-toggle.css` | New | Segmented pill styles |
| `sections/main-product.liquid` | Modified | Add `gender_toggle` block type + schema |
| `assets/colorway-swatches.js` | Modified | Replace inline swap with utility call |
| `snippets/size-guide-modal.liquid` | Modified | Add tabbed gendered measurement tables |
| `assets/size-guide-modal.css` | Modified | Tab styles within modal |

## Not Touched

- Variant picker logic/behavior
- `blocks/colorway-swatches.liquid` markup
- Size guide modal trigger link or open/close behavior
- Sticky ATC

## Constraints

- No hardcoded product handles, IDs, or gender values beyond "Men's" and "Women's"
- Toggle is a repositionable theme block
- Toggle visually lightweight — luxury brand, quiet option
