# Product Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the product discovery experience for Civilion's Shopify store — collection page layout, gender-aware navigation, filtering, and editorial pages.

**Architecture:** Hybrid approach on Luxe v13.1.0 theme. Most configuration happens through Shopify admin (menus, theme settings, collections). Codebase changes are limited to: collection banner split-layout CSS, gender cookie JS snippet, mobile drawer accordion default-open Liquid tweak, and collection template JSON config updates.

**Tech Stack:** Shopify Liquid, CSS, vanilla JavaScript, Shopify theme JSON templates

**Spec:** `docs/superpowers/specs/2026-03-20-product-discovery-design.md`

---

## Important: Codebase vs. Theme Editor Split

This plan has two types of work. **Tasks prefixed with [CODE]** are codebase changes made locally. **Tasks prefixed with [ADMIN]** are documented instructions for the user to execute in Shopify admin / theme editor. Admin tasks are written as checklists, not code.

---

## File Map

### Files to Modify
| File | Responsibility | What Changes |
|------|---------------|-------------|
| `templates/collection.json` | Collection page template config | Grid columns 4→3, banner layout to split, theme settings |
| `assets/component-collection-hero.css` | Banner height/layout styles | Add split-layout refinements for contained banner |
| `assets/template-collection.css` | Collection grid/sub-nav styles | Adjust grid to 3-col desktop default, editorial break spacing |
| `snippets/header-nav-drawer.liquid` | Mobile drawer navigation | Default accordion sections to expanded state |

### Files to Create
| File | Responsibility |
|------|---------------|
| `assets/civilion-gender-cookie.js` | Gender cookie: read URL params, set/read cookie, apply default gender filter |
| `snippets/civilion-gender-cookie.liquid` | Liquid snippet to load gender cookie JS on collection pages |

---

## Task 1: [CODE] Update Collection Template Configuration

Update the collection template JSON to set the correct grid columns, banner layout, and card settings per the design spec.

**Files:**
- Modify: `templates/collection.json`

**Context:** Currently configured with 4 desktop columns, overlay banner layout. Needs 3 desktop columns and split_banner layout. The Luxe theme's `main-collection-banner.liquid` already supports a `split_banner` layout option natively — we just need to select it.

- [ ] **Step 1: Read current collection.json**

Read `templates/collection.json` to confirm current values before editing.

- [ ] **Step 2: Update banner section settings**

In the `main-collection-banner` section, change:
```json
{
  "banner_layout": "split_banner",
  "banner_height": "default",
  "text_alignment": "left",
  "text_position": "middle"
}
```

- [ ] **Step 3: Update product grid section settings**

In the `main-collection-product-grid` section, change:
```json
{
  "columns_desktop": 3,
  "columns_tablet": 3,
  "columns_mobile": 2,
  "enable_creative_layouts": true,
  "enable_filtering": true,
  "enable_sorting": true
}
```

- [ ] **Step 4: Verify template loads in theme preview**

Run: `shopify theme dev` (or check theme preview in Shopify admin)
Expected: Collection page renders with split banner and 3-column grid.

- [ ] **Step 5: Commit**

```bash
git add templates/collection.json
git commit -m "feat: configure collection template for 3-col grid and split banner"
```

---

## Task 2: [CODE] Collection Banner Split Layout CSS

Refine the split banner CSS to achieve the contained editorial look — text/copy on left, lifestyle image on right, warm background, proper proportions.

**Files:**
- Modify: `assets/component-collection-hero.css`
- Modify: `assets/template-collection.css`

**Context:** Luxe's `split_banner` layout already creates a 50/50 split at 900px+ breakpoint using `component-collection-hero.css` (lines with `.collection-hero--split`). The existing `template-collection.css` has prior custom work. We need to refine the split layout's proportions, spacing, and typography to match the Civilion brand — warm off-white background, serif heading, atmospheric copy, contained image.

- [ ] **Step 1: Read current split banner CSS**

Read `assets/component-collection-hero.css` — look for `.collection-hero--split` rules and the split banner card layout. Also read `assets/template-collection.css` for any existing overrides.

- [ ] **Step 2: Add Civilion split banner refinements to template-collection.css**

Append to `assets/template-collection.css`:

```css
/* ============================================
   Civilion: Contained Banner Split Layout
   Spec: docs/superpowers/specs/2026-03-20-product-discovery-design.md §2.1
   ============================================ */

/* Warm off-white background for split banner */
.collection-hero--split {
  --collection-hero-bg: #F5F0E8;
  background-color: var(--collection-hero-bg);
}

/* Left text panel: generous padding, left-aligned */
.collection-hero--split .collection-hero__card {
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

/* Serif heading for brand tone */
.collection-hero--split .collection-hero__title {
  font-family: var(--font-heading-family, Georgia, serif);
  letter-spacing: 0.02em;
  line-height: 1.1;
}

/* Subtitle / tagline: small caps, muted */
.collection-hero--split .collection-hero__subtitle {
  font-family: var(--font-body-family, sans-serif);
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  opacity: 0.6;
}

/* Description: atmospheric copy, readable width */
.collection-hero--split .collection-hero__description {
  max-width: 440px;
  line-height: 1.7;
  font-size: 14px;
}

/* Right image: contained with slight border radius */
.collection-hero--split .collection-hero__media img {
  border-radius: 4px;
  object-fit: cover;
}

/* Mobile: stack with reduced padding */
@media screen and (max-width: 899px) {
  .collection-hero--split .collection-hero__card {
    padding: 32px 20px;
  }
}
```

- [ ] **Step 3: Verify split banner in theme preview**

Run: `shopify theme dev` or check theme preview.
Expected: Collection banner shows warm off-white background, text left, image right. Typography matches brand (serif heading, small-caps subtitle).

- [ ] **Step 4: Commit**

```bash
git add assets/template-collection.css assets/component-collection-hero.css
git commit -m "feat: refine split banner CSS for Civilion contained editorial look"
```

---

## Task 3: [CODE] Adjust Collection Grid to 3-Column Default

Update the collection grid CSS to ensure 3 columns renders correctly as the default desktop layout, and adjust editorial break spacing.

**Files:**
- Modify: `assets/template-collection.css`

**Context:** The current CSS in `template-collection.css` defines grid columns for the collection. The template JSON (Task 1) sets columns_desktop to 3, but CSS may have hardcoded overrides. Also need to ensure editorial image break spacing works well with 3-column layout (breaks appear after rows 2-3, meaning grid positions 7-9 for the first break in a 3-col grid).

- [ ] **Step 1: Read current grid CSS**

Read `assets/template-collection.css` — look for grid-template-columns rules and any hardcoded column counts.

- [ ] **Step 2: Verify grid respects template settings**

Check if the CSS uses the Luxe theme's CSS variable for column count (typically `--grid-columns-desktop`) or hardcodes values. If hardcoded, update to respect the JSON setting. If variable-based, no change needed.

- [ ] **Step 3: Add editorial break spacing for 3-col grid**

If needed, append to `assets/template-collection.css`:

```css
/* ============================================
   Civilion: Editorial grid break spacing
   Breaks should appear after 2-3 rows (positions 7-9 in 3-col grid)
   ============================================ */

/* Ensure inline editorial images have breathing room in 3-col grid */
.collection-product-grid .grid__item--inline-image {
  margin-top: 16px;
  margin-bottom: 16px;
}
```

- [ ] **Step 4: Verify grid layout in theme preview**

Expected: 3 columns on desktop, 2 on mobile. If creative layout images are configured, they should have proper spacing.

- [ ] **Step 5: Commit**

```bash
git add assets/template-collection.css
git commit -m "feat: adjust collection grid CSS for 3-column default with editorial break spacing"
```

---

## Task 4: [CODE] Gender Cookie JavaScript

Create the gender cookie system that reads URL filter params, persists gender preference, and applies it as a default filter on collection pages.

**Files:**
- Create: `assets/civilion-gender-cookie.js`
- Create: `snippets/civilion-gender-cookie.liquid`

**Context:** When a customer navigates via the mega menu (e.g., Men's > Slides), the URL contains `?filter.p.m.custom.product_gender=Men's`. This JS snippet reads that param, stores it as a cookie, and on future collection page visits without the param, redirects or injects it. The Liquid snippet conditionally loads the JS on collection pages.

- [ ] **Step 1: Create the gender cookie JS**

Create `assets/civilion-gender-cookie.js`:

```javascript
/**
 * Civilion Gender Cookie
 * Reads gender filter from URL params, persists as cookie.
 * On collection pages without gender filter, applies saved preference.
 * Spec: docs/superpowers/specs/2026-03-20-product-discovery-design.md §1
 */
(function() {
  const COOKIE_NAME = 'civilion_gender';
  const COOKIE_DAYS = 30;
  const FILTER_PARAM = 'filter.p.m.custom.product_gender';

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
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
```

- [ ] **Step 2: Create the Liquid loader snippet**

Create `snippets/civilion-gender-cookie.liquid`:

```liquid
{% comment %}
  Civilion Gender Cookie Loader
  Loads gender cookie JS on collection pages.
  Include in layout/theme.liquid or collection template.
{% endcomment %}

{% if template.name == 'collection' %}
  <script src="{{ 'civilion-gender-cookie.js' | asset_url }}" defer></script>
{% endif %}
```

- [ ] **Step 3: Wire snippet into theme layout**

Read `layout/theme.liquid` and add the snippet include before the closing `</body>` tag:

```liquid
{% render 'civilion-gender-cookie' %}
```

- [ ] **Step 4: Test gender cookie flow manually**

Test sequence:
1. Visit `/collections/slides?filter.p.m.custom.product_gender=Men's` — verify cookie is set (check browser DevTools > Application > Cookies)
2. Navigate to `/collections/sneakers` (no gender param) — verify redirect to `/collections/sneakers?filter.p.m.custom.product_gender=Men's`
3. Clear the cookie manually, visit `/collections/slides` — verify no redirect (no cookie, no param)

- [ ] **Step 5: Commit**

```bash
git add assets/civilion-gender-cookie.js snippets/civilion-gender-cookie.liquid layout/theme.liquid
git commit -m "feat: add gender cookie system for persistent gender filtering"
```

---

## Task 5: [CODE] Mobile Drawer Accordion Default-Open

Modify the mobile drawer navigation so Men's and Women's accordion sections under "Shop" are expanded by default.

**Files:**
- Modify: `snippets/header-nav-drawer.liquid`

**Context:** Luxe's mobile drawer uses a sliding panel or accordion system. The accordion sections are collapsed by default. We need the second-level items under "Shop" (which will be Men's and Women's once the menu is configured) to render in their expanded/open state. The drawer uses `details`/`summary` HTML elements or a custom disclosure pattern for accordions.

- [ ] **Step 1: Read the drawer accordion implementation**

Read `snippets/header-nav-drawer.liquid` — identify exactly how accordion expand/collapse works. Look for:
- `<details>` elements (HTML native accordion — add `open` attribute to default-open)
- CSS classes like `is-open`, `expanded`
- JavaScript toggle handlers
- The pattern for second-level menu items

- [ ] **Step 2: Add default-open behavior for second-level accordions**

Based on what the drawer uses:

**If `<details>` elements:** Add the `open` attribute to the `<details>` tag for second-level items:
```liquid
<details {% if link.levels > 0 %}open{% endif %}>
```

**If CSS/JS toggle:** Add an `is-open` class or equivalent to the second-level container element and ensure the content panel has no `display: none` or `height: 0` in its default state.

The exact edit depends on the drawer's implementation pattern — Step 1 determines this.

- [ ] **Step 3: Verify in mobile preview**

Test at mobile viewport (375px width):
1. Open hamburger menu
2. Tap "Shop"
3. Verify Men's and Women's sections are already expanded showing product types
4. Verify other nav items (Sport, Leisure, etc.) are not affected

- [ ] **Step 4: Commit**

```bash
git add snippets/header-nav-drawer.liquid
git commit -m "feat: default mobile drawer accordions to expanded for Shop sub-items"
```

---

## Task 6: [ADMIN] Shopify Admin Setup — Navigation Menus

These steps are performed by the user in Shopify admin, not in the codebase. This documents the exact menu structure to create.

**Where:** Shopify Admin > Online Store > Navigation

- [ ] **Step 1: Edit Main Menu**

Structure the main menu as follows:

```
Main Menu
├── Shop
│   ├── Men's
│   │   ├── Slides → /collections/slides?filter.p.m.custom.product_gender=Men's
│   │   ├── Sneakers → /collections/sneakers?filter.p.m.custom.product_gender=Men's
│   │   ├── Trainers → /collections/trainers?filter.p.m.custom.product_gender=Men's
│   │   └── Loafers → /collections/loafers?filter.p.m.custom.product_gender=Men's
│   ├── Women's
│   │   ├── Slides → /collections/slides?filter.p.m.custom.product_gender=Women's
│   │   ├── Sneakers → /collections/sneakers?filter.p.m.custom.product_gender=Women's
│   │   ├── Trainers → /collections/trainers?filter.p.m.custom.product_gender=Women's
│   │   └── Loafers → /collections/loafers?filter.p.m.custom.product_gender=Women's
│   └── Collections
│       ├── New Arrivals → /collections/new-arrivals
│       ├── Licensed Designs → /collections/licensed-designs
│       ├── Sale → /collections/sale
│       └── Shop All → /collections/all
├── Sport → /pages/sport
├── Leisure → /pages/leisure
├── Journal → /blogs/journal
└── Story → /pages/story
```

**Note:** The `?filter.p.m.custom.product_gender=Men's` param format must match the actual metafield namespace/key. Verify the exact param name after setting up the gender metafield (Task 7 Step 1). Shopify navigation supports full URLs with query params.

- [ ] **Step 2: Configure mega menu settings in theme editor**

Go to Theme Editor > Header section:
- Set `main_menu` to the main menu created above
- Set dropdown panel width to "drawer" (full-width) for the Shop item
- Ensure dropdown trigger is set to "hover" for desktop

- [ ] **Step 3: Add featured image block to Shop mega menu**

In theme editor header section, add an image block:
- Match block name to "Shop" (handleized: "shop")
- Upload a placeholder editorial image
- Add heading text (e.g., "New: Riviera Collection")
- Add link and button text ("Shop Now")

---

## Task 7: [ADMIN] Shopify Admin Setup — Products & Collections

**Where:** Shopify Admin > Products, Collections, Settings

- [ ] **Step 1: Create gender metafield definition**

Go to Shopify Admin > Settings > Custom data > Products:
- Add metafield definition:
  - Name: Gender
  - Namespace and key: `custom.product_gender`
  - Type: Single line text (or Single option: "Men", "Women")
- Set the value on each product ("Men" or "Women")

- [ ] **Step 2: Enable gender metafield as storefront filter**

Go to Shopify Admin > Online Store > Navigation > Collection and search filters:
- Add `custom.product_gender` as a filter
- This makes it available in the horizontal filter bar and as a URL filter param

- [ ] **Step 3: Verify filter param format**

Visit a collection page and use the filter UI to select a gender value. Check the URL to confirm the exact param format. It should be `filter.p.m.custom.product_gender=Men's`. If the format differs, update:
- Navigation menu links (Task 6 Step 1)
- Gender cookie JS `FILTER_PARAM` constant (Task 4)

- [ ] **Step 4: Create product type collections**

Create these collections in Shopify Admin > Collections:
- **Slides** (handle: `slides`) — automated rule: Product type equals "Slides"
- **Sneakers** (handle: `sneakers`) — automated rule: Product type equals "Sneakers"
- **Trainers** (handle: `trainers`) — automated rule: Product type equals "Trainers"
- **Loafers** (handle: `loafers`) — automated rule: Product type equals "Loafers"

Each collection includes both men's and women's products. Add a featured image (placeholder is fine) and collection description for the banner.

- [ ] **Step 5: Create contextual collections**

- **New Arrivals** (handle: `new-arrivals`) — automated rule: Created date is within last 30 days
- **Sale** (handle: `sale`) — automated rule: Compare at price is not empty
- **Licensed Designs** (handle: `licensed-designs`) — manual collection, curate as designs launch
- **All** (handle: `all`) — Shopify creates this automatically

- [ ] **Step 6: Create editorial curated collections**

- **Sport — Featured** (handle: `sport-featured`) — manual, hand-pick 3-4 products
- **Leisure — Featured** (handle: `leisure-featured`) — manual, hand-pick 3-4 products

These are used by the Sport/Leisure editorial pages (Task 9).

---

## Task 8: [ADMIN] Theme Editor Settings

**Where:** Shopify Theme Editor > Theme Settings

- [ ] **Step 1: Configure filter settings**

- Filter type: `horizontal`
- Facets enable count: `true`
- Facets visual display: `true` (for color swatches)
- Sort by style: `pill`

- [ ] **Step 2: Configure card settings**

- Card image aspect ratio: `portrait`
- Card image display: `second_image_hover`
- Card quick add position: `none` (disabled at launch)
- Card show vendor inline: `false`
- Card corner radius: `4` (subtle)

- [ ] **Step 3: Configure sub-navigation (if used)**

For collections that use subcollection pills:
- Menu style: `pills`
- Alignment: `center`

---

## Task 9: [ADMIN] Sport & Leisure Editorial Pages

**Where:** Shopify Admin > Online Store > Pages + Theme Editor

- [ ] **Step 1: Create pages in Shopify admin**

- Create page "Sport" (handle: `sport`)
- Create page "Leisure" (handle: `leisure`)

- [ ] **Step 2: Build page templates in theme editor**

For each page, add sections in this order:
1. **Image banner** (`image-banner.liquid`) — full-bleed hero, 60-70vh height
2. **Rich text** (`rich-text.liquid`) — editorial copy block, centered
3. **Featured collection** (`featured-collection.liquid`) — point to "Sport — Featured" or "Leisure — Featured" collection
4. **Media gallery** (`media-gallery.liquid`) — placeholder for campaign photography
5. **Collection cards** or **Rich text with buttons** — CTAs linking to product type collections

**Note:** Do not populate with final content until photography is available. Set up the template structure with placeholder content. Update to "Coming Soon" messaging if preferred.

---

## Task 10: [CODE] Final Verification & QA

End-to-end verification of all codebase changes.

**Files:** All modified files from Tasks 1-5

- [ ] **Step 1: Run theme check for Liquid errors**

```bash
cd /Users/liamcarmichael/Desktop/highlighter-studio/client-themes/civilion-staging
shopify theme check
```

Expected: No critical errors related to our changes. Warnings about theme best practices are acceptable.

- [ ] **Step 2: Verify collection page renders correctly**

In theme preview, check:
- Split banner displays (text left, image right, warm background)
- 3-column product grid on desktop
- 2-column grid on mobile (use browser DevTools responsive mode)
- Horizontal filter bar visible with gender/size/color options
- Sort dropdown functional

- [ ] **Step 3: Verify gender cookie flow**

1. Navigate via mega menu Men's > Slides — URL should have gender param
2. Check cookie is set in DevTools
3. Navigate to another collection — should auto-filter to Men's
4. Use filter bar to select "All" — cookie should clear
5. Navigate to another collection — should show all products (no redirect)

- [ ] **Step 4: Verify mobile drawer**

At mobile viewport:
1. Open hamburger menu
2. "Shop" shows Men's and Women's expanded by default
3. Tapping a product type navigates correctly with gender param
4. Other nav items (Sport, Leisure, etc.) work correctly

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: QA adjustments for product discovery implementation"
```

---

## Follow-Up Items (Out of Scope)

These items are referenced in the spec but intentionally excluded from this plan:

1. **PDP gender toggle → cookie integration.** The spec says "PDP gender toggle also sets this same cookie." The PDP toggle is a separate system (decided Mar 13). When that system is built, it should call the same `setCookie('civilion_gender', value, 30)` pattern. Track this as a dependency in the PDP implementation plan.

2. **Search enhancements.** Dual-tabbed search (Products + Content) is Phase 2. No work needed at launch.

3. **Kids sizing.** Planned for future, not at launch. When added, extend the gender cookie to support a third value or rearchitect as a "sizing context" cookie.
