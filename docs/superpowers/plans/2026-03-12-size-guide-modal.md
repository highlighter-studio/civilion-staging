# Size Guide Modal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Size Guide" modal to the PDP that displays product-type-specific silhouette imagery and measurements from Shopify metaobjects.

**Architecture:** Reuse the existing `ModalDialog` web component and `product-popup-modal` CSS from the Luxe theme. New snippet renders the modal, new CSS file styles the size guide content, and the variant picker snippet is modified to add the trigger link and render the modal.

**Tech Stack:** Shopify Liquid, CSS, existing ModalDialog web component (JS)

**Spec:** `docs/superpowers/specs/2026-03-12-size-guide-modal-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `assets/size-guide-modal.css` | Create | Trigger button styling, label flex layout, image/measurements content styling |
| `snippets/size-guide-modal.liquid` | Create | Modal markup, metaobject data rendering, CSS loading |
| `snippets/product-variant-picker.liquid` | Modify | Metaobject assignment, trigger link injection (pill + dropdown), modal snippet render |

---

## Chunk 1: Implementation

### Task 1: Create the CSS file

**Files:**
- Create: `assets/size-guide-modal.css`

- [ ] **Step 1: Create `assets/size-guide-modal.css`**

```css
/* Size Guide Modal — size-guide-modal.css
   Only styles specific to size guide content.
   Modal shell uses existing product-popup-modal CSS from section-main-product.css. */

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

- [ ] **Step 2: Commit**

```bash
git add assets/size-guide-modal.css
git commit -m "feat: add size guide modal CSS"
```

---

### Task 2: Create the modal snippet

**Files:**
- Create: `snippets/size-guide-modal.liquid`

- [ ] **Step 1: Create `snippets/size-guide-modal.liquid`**

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

Note: `tabindex="-1"` added to the dialog div — matches the existing `product-popup-modal` pattern in `sections/main-product.liquid:1420` and is required for `trapFocus()` to work correctly.

- [ ] **Step 2: Commit**

```bash
git add snippets/size-guide-modal.liquid
git commit -m "feat: add size guide modal snippet"
```

---

### Task 3: Modify the variant picker to add trigger and render modal

**Files:**
- Modify: `snippets/product-variant-picker.liquid`

This task makes 3 edits to the file:

- [ ] **Step 1: Add metaobject assignment at top of snippet**

After line 20 (`{% endif %}`), before line 22 (`{%- unless product.has_only_default_variant -%}`), add:

```liquid

{% assign size_guide_metaobject = product.metafields.custom.size_guide.value %}
```

- [ ] **Step 2: Add trigger link inside pill/button picker legend**

In the `<legend>` tag (line 44–51), inject the trigger after the swatch label spans and before the closing `</legend>`. The current line 51 is:

```liquid
      </legend>
```

Replace with:

```liquid
        {% if option.name == 'Size' and size_guide_metaobject %}
          <modal-opener data-modal="#SizeGuideModal">
            <button type="button" class="size-guide-trigger" aria-haspopup="dialog">Size Guide</button>
          </modal-opener>
        {% endif %}
      </legend>
```

- [ ] **Step 3: Add trigger link inside dropdown picker label**

In the dropdown `<label>` tag (lines 116–118), the current line 118 is:

```liquid
      </label>
```

Replace with:

```liquid
        {% if option.name == 'Size' and size_guide_metaobject %}
          <modal-opener data-modal="#SizeGuideModal">
            <button type="button" class="size-guide-trigger" aria-haspopup="dialog">Size Guide</button>
          </modal-opener>
        {% endif %}
      </label>
```

- [ ] **Step 4: Render modal snippet after the options loop**

After line 143 (`{%- endfor -%}`), before line 145 (`<script type="application/json" data-selected-variant>`), add:

```liquid

  {% render 'size-guide-modal', product: product %}

```

- [ ] **Step 5: Commit**

```bash
git add snippets/product-variant-picker.liquid
git commit -m "feat: add size guide trigger and modal render to variant picker"
```

---

## Chunk 2: Verification

### Task 4: Manual verification checklist

No automated test framework exists for Shopify Liquid. Verify by deploying to the Civilion staging theme and checking:

- [ ] **Step 1: Verify trigger renders for products with size guide metafield**

Navigate to a PDP for a product with `custom.size_guide` set. Confirm the "Size Guide" link appears inline with the "Size" label, right-aligned.

- [ ] **Step 2: Verify trigger does NOT render for products without metafield**

Navigate to a PDP for a product without `custom.size_guide`. Confirm no "Size Guide" link appears.

- [ ] **Step 3: Verify modal opens and displays correct content**

Click "Size Guide". Confirm:
- Modal opens with centered overlay (desktop)
- Heading shows correct product type (e.g. "Oxford Size Guide")
- Silhouette image displays
- Measurements content displays

- [ ] **Step 4: Verify modal close behaviour**

- Click X button — modal closes
- Click backdrop — modal closes
- Press Escape — modal closes
- Focus returns to trigger button after close

- [ ] **Step 5: Verify mobile responsive behaviour**

Open PDP on mobile viewport. Confirm modal slides up from bottom as a sheet.

- [ ] **Step 6: Check for regressions**

- No console errors
- No layout shift when trigger renders
- Existing variant picker selection still works
- Other option rows (Color, etc.) unaffected
- Existing product popup modal still works
