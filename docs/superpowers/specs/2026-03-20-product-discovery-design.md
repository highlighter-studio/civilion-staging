# Civilion Product Discovery — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Launch target:** April 24, 2026
**Theme:** Luxe v13.1.0 by Winter Studio (Hybrid approach — native config + targeted customization)

---

## Overview

Design the product discovery experience for Civilion's Shopify store — collections, filtering, navigation, and editorial pages. The system must feel like browsing a luxury lifestyle editorial, not shopping a product catalog. Designed for ~40 SKUs at launch, architected for 400+.

## Design Principles

1. **Curation at 40, infrastructure for 400.** The editorial experience works because the catalog is small enough to hand-curate. The underlying systems (filtering, collection structure, navigation) must scale without a redesign.
2. **Gender is a size range, not a product.** Men's and women's products are physically identical — the only difference is available sizes. Gender context flows through navigation and persists via cookie, not through duplicate product browsing.
3. **Sport & Leisure are editorial lenses, not collection parents.** The same shoe can be "Sport" (on a tennis court) or "Leisure" (at a poolside café). These are rich editorial landing pages, not taxonomic categories.
4. **Elegant absence over lorem ipsum.** Build every system and template now, but only populate with final content. Placeholder strategy communicates "coming soon," not "broken."
5. **Hybrid approach.** Use Luxe-native configuration where it's 90%+ right. Custom-build only where Luxe has real gaps.

---

## 1. Navigation Architecture

### Desktop Header

- Sticky header (Luxe native)
- **Top-level nav items:** Shop | Sport | Leisure | Journal | Story
- Search icon + Cart icon on the right
- Implementation: Luxe's `header.liquid` + `header-nav-desktop.liquid`, configured through Shopify menu structure and theme settings

### Shop Mega Menu

Layout: **Gender + Collections + Featured Image** (4-column)

| Column 1 | Column 2 | Column 3 | Column 4 |
|-----------|-----------|-----------|-----------|
| **Men's** | **Women's** | **Collections** | **Featured Image** |
| Slides | Slides | New Arrivals | Editorial image with |
| Sneakers | Sneakers | Licensed Designs | collection promo + |
| Trainers | Trainers | Sale | "Shop Now" CTA |
| Loafers | Loafers | Shop All → | |

- Men's/Women's links carry gender filter params (e.g., `/collections/slides?filter.p.m.custom.product_gender=Men's`)
- Collections column grows independently as catalog expands
- Featured image pulled from collection featured image (Luxe native)
- Implementation: Luxe's native mega menu via Shopify menu structure + dropdown panel width setting

### Sport & Leisure Nav Items

- Link directly to custom pages (`/pages/sport`, `/pages/leisure`)
- No dropdown — single click to editorial landing page

### Journal & Story

- Journal → `/blogs/journal` (Shopify blog)
- Story → `/pages/story` (custom page)

### Mobile Drawer

- Luxe's native `header-nav-drawer.liquid`
- "Shop" opens to reveal Men's and Women's accordion sections
- **Both accordions expanded by default** (may require minor Liquid customization)
- Each accordion lists: Slides, Sneakers, Trainers, Loafers + contextual links
- Sport, Leisure, Journal, Story as simple nav items below Shop

### Gender Cookie Logic (Custom JS — ~20 lines)

- When user navigates via a gendered mega menu link, JS reads the URL filter param and sets a `civilion_gender` cookie
- On subsequent collection page loads, if cookie exists and no gender filter in URL, cookie value is appended as default filter
- Cookie persists 30 days; cleared if user explicitly selects "All" in filter bar
- PDP gender toggle also sets this same cookie
- **Fallback for direct landing (Google/social/email):** Gender filter visible in horizontal bar; user self-selects. Brief duplicate visibility until they filter.

#### Implementation split:
- **Theme editor / Shopify admin:** Menu structure, menu item links, mega menu settings, dropdown panel width, featured image assignment
- **Codebase:** Gender cookie JS snippet, mobile drawer accordion default-open customization

---

## 2. Collection Page Template

### Page Structure (top to bottom)

#### 2.1 Contained Banner (~30-40vh)

- **Left:** Collection title (serif, large), subtitle/tagline (sans-serif, small caps), 2-3 sentences of atmospheric copy
- **Right:** Contained lifestyle image (collection featured image)
- Warm off-white background (brand palette, not pure white)
- Implementation: Luxe's `main-collection-banner.liquid` with CSS adjustments for split layout. Existing `component-collection-hero.css` and `template-collection.css` provide a starting point.

#### 2.2 Subcollection Navigation (conditional)

- Not every collection needs subcollections
- When present (e.g., a licensed collection spanning multiple product types): Luxe's native `main-collection-sub-navigation.liquid` in **pills style**
- Sits between banner and filter bar
- Menu-driven — configured through Shopify navigation menus, not code

#### 2.3 Horizontal Filter Bar

- Sits below banner (or subcollection nav), above grid
- **Left:** Gender toggle (Men's / Women's / All) as pill-style buttons
- **Center:** Size and Color filter dropdowns
- **Right:** Sort dropdown (Featured, Price Low→High, Price High→Low, Newest)
- Implementation: Luxe's native `facets.liquid` with `filter_type: "horizontal"` theme setting
- Minimal at launch — expands naturally as catalog grows and new filter metafields are added

#### 2.4 Product Grid

- **3 columns desktop, 2 columns mobile**
- Locked portrait aspect ratios (`card_img_aspect_ratio` theme setting)
- Product cards show: image with secondary image on hover, product name, price, color swatches
- No quick-add at launch
- **Editorial lifestyle image break every 2-3 rows** via Luxe's creative layouts (inline image cards positioned at grid slots 7-9 or 10-12)
- Creative layouts disabled when filters are active (Luxe native behavior) — grid falls back to clean uniform layout
- Implementation: Luxe's `main-collection-product-grid.liquid` with `enable_creative_layouts: true` + product/image tags for positioning

#### 2.5 Pagination

- Standard pagination at launch (not critical with ~10 products per collection)
- Switch to "Load More" button when collections exceed ~20 products
- Luxe supports both natively

#### Implementation split:
- **Theme editor / Shopify admin:** Banner content (title, copy, image), filter settings, grid column count, aspect ratio, creative layout image assignments, pagination style, subcollection menu structure
- **Codebase:** Contained banner CSS adjustments (split layout), any creative layout positioning tweaks

---

## 3. Sport & Leisure Editorial Pages

Custom Shopify pages (`/pages/sport`, `/pages/leisure`) assembled from Luxe's modular section library. **Fully configurable in theme editor — no custom code.**

### Page Structure (top to bottom)

1. **Full-bleed hero image (60-70vh)**
   - Atmospheric photography — Riviera for Leisure, Palm Springs tennis court for Sport
   - Overlaid: title + one-line manifesto
   - Section: Luxe's `image-banner.liquid`

2. **Editorial copy block**
   - 2-3 paragraphs of brand narrative
   - Centered, generous whitespace
   - Section: Luxe's `rich-text.liquid`

3. **Curated product feature**
   - Hand-picked products (3-4) in editorial layout
   - Lookbook feel, not catalog grid
   - Section: Luxe's `featured-collection.liquid` pointed at manually curated collections ("Sport — Featured", "Leisure — Featured")

4. **Lifestyle media gallery**
   - Campaign photography, brand world visuals
   - Asymmetric layout
   - Section: Luxe's `media-gallery.liquid`

5. **CTA to shop**
   - Links to product type collections with gender context
   - Section: Luxe's `collection-cards.liquid` or `rich-text.liquid` with buttons

### Placeholder strategy:
- **Do not populate until photography is near-ready.** Build templates, link in nav, but use "Coming Soon" state initially. Brand narrative falls flat with stock images.

#### Implementation split:
- **Theme editor / Shopify admin:** All content — imagery, copy, featured products, section ordering. 100% theme editor work.
- **Codebase:** None. Page templates created via theme editor customizer.

---

## 4. Search

### At Launch

- Luxe's native search — icon in header, search drawer/overlay
- Products only (Shopify default)
- Results as product grid (3-col desktop, 2-col mobile)
- Implementation: Luxe's `main-search.liquid` + `predictive-search.liquid` — no custom work

### Phase 2 (post-launch)

- Dual-tabbed search (Products + Content) — Tracksmith reference
- Editorial content (Journal, Story) searchable alongside products
- Revisit when catalog or content volume justifies investment

---

## 5. Empty States & Placeholder Strategy

| Asset | Placeholder approach | Swap method |
|-------|---------------------|-------------|
| Product images | Solid-color cards in brand palette with product name centered | Shopify admin product media |
| Collection banner images | Atmospheric stock photography (Riviera/Palm Springs) | Theme editor section settings |
| Mega menu featured image | Placeholder editorial image | Shopify menu / theme settings |
| Sport/Leisure pages | "Coming Soon" state — templates built but not populated | Theme editor customizer |
| Editorial grid breaks | Skip until lifestyle photography available — grid works fine without them | Creative layout image tags |

**Principle:** "Elegant absence" — every system built and ready, content populated only when assets are final or near-final.

---

## 6. Shopify Data Architecture

### Products

- Each design exists as **two Shopify products**: one men's, one women's (for SEO)
- Products are physically identical — only size ranges differ
- Connected via metafield (e.g., `custom.product_gender`: "Men's" / "Women's") for filtering
- PDP presents a unified experience with gender toggle swapping size ranges

### Collections

- **Product type collections:** Slides, Sneakers, Trainers, Loafers — contain both men's and women's products
- **Contextual collections:** New Arrivals, Sale — automated via Shopify collection rules
- **Licensed design collections:** One per design/collaboration (if spanning multiple product types)
- **Curated editorial collections:** "Sport — Featured", "Leisure — Featured" — manually curated for editorial pages
- Sport and Leisure are **not** collections — they are custom pages

### Metafields Required

- `product.metafields.custom.gender` — "Men's" / "Women's" (for filtering + cookie logic)
- Additional metafields as needed for future filters (material, activity, etc.)

### Navigation Menus (Shopify Admin)

- **Main menu:** Shop (with nested Men's/Women's/Collections), Sport, Leisure, Journal, Story
- **Men's submenu:** Slides, Sneakers, Trainers, Loafers (links carry `?filter.p.m.custom.product_gender=Men's`)
- **Women's submenu:** Same product types (links carry `?filter.p.m.custom.product_gender=Women's`)
- **Collections submenu:** New Arrivals, Licensed Designs, Sale, Shop All
- **Subcollection menus:** Created per-collection as needed in Shopify navigation

---

## 7. What's Custom vs. Native

### Luxe Native (theme settings / Shopify admin)

- Mega menu structure and imagery
- Product grid (columns, aspect ratios, card settings)
- Creative layouts (editorial image breaks via product tags)
- Horizontal filter bar
- Sub-navigation pills
- Collection banner (base section)
- Search
- Mobile drawer navigation
- Sport/Leisure editorial pages (assembled from section library)
- Product cards (hover states, swatches, pricing)
- Pagination

### Light Customization (CSS/Liquid tweaks)

- Collection banner split layout (CSS adjustments to `main-collection-banner.liquid`)
- Mobile drawer accordions default-open (Liquid tweak to `header-nav-drawer.liquid`)

### Custom Build (new code)

- Gender cookie JS snippet (~20 lines) — reads URL filter params, sets/reads `civilion_gender` cookie, applies default gender filter on collection page load
- Gender cookie integration with PDP toggle (connects to existing PDP gender toggle system)

---

## 8. Future Scaling Considerations (400+ SKUs)

These decisions were made with future scale in mind:

| Current (40 SKUs) | Future (400+ SKUs) |
|--------------------|--------------------|
| 3-col desktop grid | Shift to 4-col (theme setting change) |
| Minimal filters (Gender, Size, Color) | Add filters via Shopify metafields — no code change |
| Horizontal filter bar | Can shift to vertical sidebar (theme setting change) |
| Editorial grid breaks every 2-3 rows | Space every 3-4 rows, or remove entirely |
| Standard pagination | Switch to "Load More" or infinite scroll (theme setting) |
| Curated editorial collections | Automated collections via Shopify rules |
| Product types as subcollections (rare) | Product types as primary nav, subcollections more common |
| Gender as separate products | May need gender-variant architecture if products diverge physically |
| Kids deferred | Add as third gender context when ready |
