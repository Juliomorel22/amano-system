# Design System Specification: The Fluid Minimalist

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Sanctuary."** Moving beyond the cold, rigid grids of standard SaaS, this system embraces a high-end editorial feel inspired by the expansive horizons of Formosa. It prioritizes "breathable" layouts, intentional asymmetry, and a tactile sense of depth. 

Instead of treating the mobile screen as a flat canvas, we treat it as a curated stack of premium materials. We break the "template" look by using exaggerated whitespace (the 16 and 20 spacing tokens) and a sophisticated typographic scale that allows headlines to command the stage, while utility elements recede gracefully into the background.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a "Professional Blue" and "Pure White" foundation, but it is executed through a sophisticated Material-based tonal range to avoid a "flat" appearance.

### The "No-Line" Rule
**Borders are strictly prohibited for sectioning.** To define boundaries, designers must use background color shifts. For example, a `surface-container-low` (#eff4ff) section should sit directly on a `surface` (#f8f9ff) background. The transition of tone is the only divider permitted.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following hierarchy to create "nested" depth:
*   **Base Layer:** `surface` (#f8f9ff)
*   **Secondary Sectioning:** `surface-container-low` (#eff4ff)
*   **Primary Content Cards:** `surface-container-lowest` (#ffffff)
*   **Interactive Overlays:** `surface-bright` (#f8f9ff) with backdrop-blur.

### The "Glass & Gradient" Rule
To elevate the mobile experience:
*   **Glassmorphism:** Use `surface-container-lowest` at 80% opacity with a `20px` backdrop-blur for floating navigation bars or headers.
*   **Signature Textures:** For primary CTAs, do not use a flat hex. Apply a subtle linear gradient from `primary` (#003f87) to `primary-container` (#0056b3) at a 135-degree angle to provide a "jewel" finish.

---

## 3. Typography
We utilize a dual-font pairing to balance authority with readability.

*   **Display & Headlines (Manrope):** This geometric sans-serif provides the "Editorial" voice. Use `display-lg` and `headline-md` with tight letter-spacing (-0.02em) to create a high-contrast, premium look.
*   **Body & UI (Inter):** Chosen for its exceptional legibility on mobile screens. `body-md` is the workhorse for all content.
*   **Hierarchy as Identity:** Use `title-lg` for card headers in `on_surface` (#121c2a), while using `label-md` in `on_secondary_container` (#475a7f) for metadata. This contrast in "optical weight" signals professionalism without needing bold lines.

---

## 4. Elevation & Depth
In this design system, depth is a feeling, not a feature.

*   **The Layering Principle:** Soft, natural lift is achieved by stacking. A `surface-container-lowest` card placed on a `surface-container-high` background creates an immediate focal point through tonal contrast alone.
*   **Ambient Shadows:** If a card requires a "float" (e.g., a bottom sheet), use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(18, 28, 42, 0.06);`. Note the use of the `on-surface` color for the shadow tint rather than pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a container boundary, use a `1px` stroke of `outline-variant` (#c2c6d4) at **15% opacity**. High-contrast, 100% opaque borders are forbidden.

---

## 5. Components

### Buttons
*   **Primary:** Uses the "Signature Gradient" (Primary to Primary-Container). Shape: `xl` (3rem) or `full`. Text: `label-md` in `on_primary` (#ffffff), Uppercase with 0.05em tracking.
*   **Secondary:** No fill. `1px` Ghost Border (20% opacity). Text: `primary` (#003f87).

### Cards & Lists
*   **The "No Divider" Mandate:** Forbid horizontal lines between list items. Use `3` (1rem) spacing between items or alternate background tones (`surface-container-low` to `surface-container-lowest`) to separate entries.
*   **Card Geometry:** Use `lg` (2rem) corner radius for main content cards to evoke a friendly, modern SaaS feel.

### Input Fields
*   **Styling:** Inputs should use `surface-container-lowest` as a background with a `sm` (0.5rem) radius. 
*   **Focus State:** Transition the background to `surface-container-high` and add a subtle `primary` glow. Do not use a heavy border on focus.

### Chips (Special Component: "The Formosa Filter")
*   Floating, pill-shaped elements using `full` radius. Use `surface-container-highest` for inactive states and `primary` with `on_primary` text for active states. These should feel like tactile pebbles.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Asymmetry:** Place a large `headline-lg` title aligned left with a 15% margin-right to create a sophisticated, editorial "white space lung."
*   **Use Tonal Transitions:** Use the Spacing Scale (specifically `8`, `10`, and `12`) to allow content to sit comfortably.
*   **Prioritize Thumb-Reach:** Place all primary CTAs in the bottom third of the mobile screen using floating `surface-bright` glass containers.

### Don't:
*   **Don't use 1px black borders.** This immediately breaks the "Digital Sanctuary" feel and makes the app look like a generic template.
*   **Don't use pure black text.** Always use `on_surface` (#121c2a) or `on_surface_variant` (#424752) to maintain a soft, premium contrast.
*   **Don't crowd the edges.** Maintain a minimum of `4` (1.4rem) horizontal padding on all screens to ensure the content feels framed and intentional.