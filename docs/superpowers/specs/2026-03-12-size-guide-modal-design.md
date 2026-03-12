# Size Guide Modal — Design Spec

## Overview

Add a "Size Guide" text link inline with the size variant picker label on the PDP. Clicking it opens a modal displaying a silhouette diagram and measurement table specific to the product's footwear type (Oxford, Chelsea, Monaco, Rome). All content is managed via Shopify metaobjects referenced through a product metafield.

## Data Architecture

### Metaobject Definition: `size_guide`

Created in Shopify admin (not in theme code):

| Field | Type | Description |
|---|---|---|
| `product_type` | `single_line_text` | e.g. "Oxford", "Chelsea", "Monaco", "Rome" |
| `silhouette_image` | `file_reference` | Shoe diagram with measurement callouts |
| `measurements` | `rich_text` | Structured sizing content — headings, lists, and paragraphs with foot length, width, EU/UK/US conversions. Note: Shopify rich text does not support HTML tables; content should be formatted using headings and lists for each size |

### Product Metafield: `custom.size_guide`

- Type: `metaobject_reference` pointing to a `size_guide` entry
- Set per product in Shopify admin
- Products sharing a type (e.g. all Oxfords) point to the same metaobject entry

### Data Flow in Liquid

```
product.metafields.custom.size_guide.value → metaobject
  → metaobject.product_type.value
  → metaobject.silhouette_image.value
  → metaobject.measurements.value
```

## Approach

Reuse the existing `ModalDialog` web component class and `product-popup-modal` CSS patterns from the Luxe theme. The size guide is its own snippet/component that reads from metaobjects — visually consistent with existing modals but with a distinct data source. No modifications to the existing popup modal block.

## Trigger Link Integration

### Placement

Injected into `snippets/product-variant-picker.liquid` in two locations:
- **Button/pill picker** (`picker_type != 'dropdown'`): inside the `<legend>` tag for the Size option
- **Dropdown picker** (`picker_type == 'dropdown'`): inside the `<label>` tag for the Size option

Both paths render the same trigger markup.

### Conditions

- Only renders when `option.name == 'Size'`
- Only renders when `product.metafields.custom.size_guide.value` exists

### Markup

The metaobject is assigned once at the top of the snippet, before the options loop:

```liquid
{% assign size_guide_metaobject = product.metafields.custom.size_guide.value %}
```

Shared trigger block (used in both legend and label contexts):

```liquid
{% if option.name == 'Size' and size_guide_metaobject %}
  <modal-opener data-modal="#SizeGuideModal">
    <button type="button" class="size-guide-trigger" aria-haspopup="dialog">Size Guide</button>
  </modal-opener>
{% endif %}
```

Uses `<button>` inside `<modal-opener>` (not `<a>`) — semantically correct for dialog triggers and hooks into the existing `ModalDialog` JS automatically.

### Label Styling

The label/legend gets `display: flex; justify-content: space-between` via `:has(.size-guide-trigger)` selectors so the link sits right-aligned. Selectors target both `legend.form__label` (pill picker) and `label.form__label` (dropdown picker). Only applies when the trigger is present — other option labels unaffected.

## Modal Component

### File: `snippets/size-guide-modal.liquid`

```liquid
{% assign size_guide = product.metafields.custom.size_guide.value %}
{% if size_guide %}
{{ 'size-guide-modal.css' | asset_url | stylesheet_tag }}
<modal-dialog id="SizeGuideModal" class="product-popup-modal">
  <div role="dialog" aria-label="{{ size_guide.product_type.value }} Size Guide" aria-modal="true" class="product-popup-modal__content">
    <div class="modal-header">
      <button id="ModalClose-SizeGuide" type="button" class="product-popup-modal__toggle" aria-label="{{ 'accessibility.close' | t }}">
        {% render 'icon-close' %}
      </button>
      <span class="dialog-title">{{ size_guide.product_type.value }} Size Guide</span>
    </div>
    <div class="product-popup-modal__content-info size-guide-modal__body">
      {% if size_guide.silhouette_image.value %}
        <div class="size-guide-modal__image">
          {% assign sg_alt = size_guide.product_type.value | append: ' size guide diagram' %}
          {{ size_guide.silhouette_image.value | image_url: width: 800 | image_tag: loading: 'lazy', alt: sg_alt }}
        </div>
      {% endif %}
      <div class="size-guide-modal__measurements">
        {{ size_guide.measurements.value }}
      </div>
    </div>
  </div>
</modal-dialog>
{% endif %}
```

### Key Decisions

- Reuses `product-popup-modal` class for all existing modal CSS (centered desktop, slide-up mobile, sticky header, scrollable content). Uses the default (normal) width — no width modifier class needed
- Close button ID follows the `ModalClose-` prefix pattern required by `ModalDialog` constructor (`id="ModalClose-SizeGuide"`)
- Heading uses `product_type` value (e.g. "Oxford Size Guide")
- Image renders at 800px width via `image_url` filter with descriptive alt text
- Measurements rich text renders directly as HTML (headings, lists, paragraphs — not tables)
- Entire snippet guarded by `{% if size_guide %}` — no output when metafield is empty

### Render Location

Called from `snippets/product-variant-picker.liquid`, once, outside the options loop (after the fieldsets). Note: `ModalDialog.connectedCallback()` moves the element to `document.body` via `appendChild`, so it will be detached from the snippet's DOM context at runtime. This is expected and ensures correct stacking/z-index behavior.

## JavaScript & Accessibility

### No New JS Required

The existing `ModalDialog` class in `assets/global.js` provides:

- Open via `<modal-opener>` element with `data-modal` attribute
- Close via close button, backdrop click, Escape key
- Focus trapping (`trapFocus` / `removeTrapFocus`)
- Body scroll lock (`overflow-hidden`)

### Accessibility

- `aria-haspopup="dialog"` on trigger button
- `role="dialog"` and `aria-modal="true"` on modal
- `aria-label` with product type name on modal
- `aria-label="Close"` on close button
- Focus trapped inside modal when open
- Focus returns to trigger on close

## Styling

### File: `assets/size-guide-modal.css`

Only styles specific to size guide content. The modal shell uses existing `product-popup-modal` CSS from `section-main-product.css`.

```css
/* Trigger: button styled as text link */
.size-guide-trigger {
  background: none;
  border: none;
  padding: 0;
  font-size: inherit;
  font-family: inherit;
  color: rgba(var(--color-link), var(--alpha-link));
  text-decoration: underline;
  cursor: pointer;
}

/* Label/legend flex layout — only when trigger present */
.product-form__input legend.form__label:has(.size-guide-trigger),
.product-form__input label.form__label:has(.size-guide-trigger) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* Silhouette image */
.size-guide-modal__image {
  text-align: center;
  margin-bottom: 2rem;
}
.size-guide-modal__image img {
  max-width: 100%;
  height: auto;
}

/* Measurements rich text content */
.size-guide-modal__measurements h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}
.size-guide-modal__measurements ul,
.size-guide-modal__measurements ol {
  padding-left: 1.2rem;
  margin-bottom: 1rem;
}
.size-guide-modal__measurements li {
  padding: 0.3rem 0;
  border-bottom: 1px solid rgba(var(--color-foreground), 0.08);
}
.size-guide-modal__measurements p {
  margin-bottom: 0.8rem;
}
```

### Loading

CSS loaded via `stylesheet_tag` inside the snippet — only on pages where the modal renders.

### Responsive

No mobile-specific overrides needed. The existing `product-popup-modal` CSS handles bottom-sheet behavior on mobile and centered overlay on desktop.

## Files Touched

| File | Action | Purpose |
|---|---|---|
| `snippets/size-guide-modal.liquid` | New | Modal markup + metaobject rendering |
| `assets/size-guide-modal.css` | New | Size guide-specific styles |
| `snippets/product-variant-picker.liquid` | Modified | Add metaobject assignment, trigger link in Size legend, render modal snippet |

## Graceful Degradation

- No `custom.size_guide` metafield → trigger link not rendered, modal snippet outputs nothing
- Metaobject exists but `silhouette_image` is empty → image section skipped, measurements still render
- Metaobject exists but `measurements` is empty → empty measurements div (image still renders)
- Metaobject entirely empty → entire modal not rendered (guarded by `{% if size_guide %}`)

## Acceptance Criteria

- [ ] "Size Guide" link renders inline with Size variant label when `custom.size_guide` metafield is set
- [ ] Clicking link opens modal with silhouette image and measurements from metaobject
- [ ] Modal displays correct size guide per product type (Oxford, Chelsea, Monaco, Rome)
- [ ] No link renders when metafield is empty or metaobject is missing
- [ ] Modal closes via X button, backdrop click, and Escape key
- [ ] Responsive: bottom-sheet on mobile, centered overlay on desktop
- [ ] Scrollable content when measurements exceed viewport
- [ ] No console errors, no layout shift, no interference with existing PDP elements
- [ ] Works with Luxe theme default product template
