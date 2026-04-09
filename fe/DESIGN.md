# Design System Specification: Technical Etherealism
 
## 1. Overview & Creative North Star
**The Creative North Star: "The Digital Atrium"**
 
This design system moves away from the rigid, "boxed-in" nature of traditional SaaS interfaces toward a breathable, architectural experience. Inspired by high-end editorial layouts and modern glass architecture, the system prioritizes negative space, light refraction, and structural depth. 
 
We are not building "pages"; we are layering light. By utilizing intentional asymmetry and overlapping frosted surfaces, we break the "template" look. The goal is a UI that feels technical yet weightless—as if the interface is projected onto panes of precision-cut glass floating in a sunlit gallery.
 
---
 
## 2. Colors & Surface Logic
Our palette is rooted in high-chroma whites and technical grays, punctuated by ethereal pastel gradients.
 
### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. Boundaries must be defined solely through background color shifts. Use `surface-container-low` for large section backgrounds sitting on a `surface` base. 
 
### Surface Hierarchy & Nesting
Instead of a flat grid, treat the UI as physical layers of glass.
- **Base Layer:** `surface` (#f7f9fb) – The canvas.
- **Sectioning:** `surface-container-low` (#f0f4f7) – Used to define broad content areas.
- **Component Level:** `surface-container-lowest` (#ffffff) – Used for primary content cards to create a "lifted" feel.
- **Nesting:** When a card needs an inner section (e.g., a code block inside a card), use `surface-container-high` (#e3e9ed) to create a recessed, "etched" look.
 
### The "Glass & Gradient" Rule
To achieve a signature premium feel, floating elements (modals, dropdowns, navigation bars) must use **Glassmorphism**:
- **Background:** `surface` at 60-80% opacity.
- **Effect:** `backdrop-filter: blur(20px) saturate(120%)`.
- **Signature Textures:** Use subtle linear gradients for CTAs: `primary` (#6e3bd8) to `primary-container` (#8f60fa) at a 135° angle. This adds "soul" and depth that prevents the UI from looking sterile.
 
---
 
## 3. Typography
The typography strategy balances the technical precision of **Inter** with the editorial authority of **Manrope**.
 
*   **Display & Headlines (Manrope):** These are the "architectural anchors." Use `display-lg` (3.5rem) with -0.02em letter spacing for a high-end, compressed technical look. 
*   **Body & Labels (Inter):** Focused on extreme legibility. Body text should utilize "generous tracking"—increase `letter-spacing` by 0.01em for `body-md` to enhance the "airy" feel.
*   **Visual Hierarchy:** Use `primary` color for `label-md` to highlight metadata or technical tags, ensuring they pop against the neutral glass backgrounds.
 
---
 
## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than structural lines or heavy shadows.
 
### The Layering Principle
Stack containers to create natural hierarchy. A `surface-container-lowest` card placed on a `surface-container-low` background creates a soft "physical" lift without the need for a shadow.
 
### Ambient Shadows
When a "floating" effect is mandatory (e.g., a modal), use an **Ambient Shadow**:
- **Blur:** 40px to 60px.
- **Color:** `on_surface` (#2c3437) at 4% to 6% opacity.
- **Spread:** -5px to keep the shadow tucked under the object, mimicking natural overhead studio lighting.
 
### The "Ghost Border" Fallback
If a border is required for accessibility, it must be a **Ghost Border**:
- **Token:** `outline-variant` (#acb3b7) at 15% opacity.
- **Weight:** 1px or 1.5px. 
- **Rule:** Never use 100% opaque borders; they shatter the "glass" illusion.
 
---
 
## 5. Components
 
### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`). Roundedness: `full`. No border.
- **Secondary:** Glass-style. `surface` at 50% opacity, `backdrop-filter: blur(10px)`, Ghost Border.
- **Tertiary:** Text-only in `primary` with `label-md` styling and an 8px animated underline on hover.
 
### Input Fields
- **Styling:** `surface-container-low` background. No border, only a 2px `primary` bottom-stroke that animates from center-out on focus.
- **Glass Variant:** For search bars on hero sections, use a frosted glass background with `backdrop-filter`.
 
### Cards & Lists
- **The "No-Divider" Mandate:** Forbid the use of horizontal rules (`
`). Use 32px or 48px of vertical whitespace (from the scale) to separate list items. If a separator is required, use a subtle background shift in a small strip.
 
 
### Progress Indicators
- Use the **Mint/Sky Blue** pastel tones. A progress bar should be a `secondary-container` track with a `secondary` gradient fill to provide a "technical" but soft feedback loop.
 
---
 
## 6. Do's and Don'ts
 
### Do
- **DO** use generous padding. If you think there is enough whitespace, add 16px more.
- **DO** overlap elements. Allow a glass card to partially obscure a background pastel gradient to showcase the blur effect.
- **DO** use `manrope` for numbers and data points to emphasize the technical brand personality.
 
### Don't
- **DON'T** use pure black (#000000) for text. Use `on_surface` (#2c3437) to maintain the soft, high-end contrast.
- **DON'T** use standard "Drop Shadows." If the element doesn't look like it's made of light and glass, it doesn't belong.
- **DON'T** use sharp corners. Stick strictly to the `md` (0.75rem) and `xl` (1.5rem) roundedness scale to keep the interface feeling approachable.
 
---
 
## 7. Accessibility Note
While the system is "airy," all text-to-background pairings must meet WCAG AA standards. When using Glassmorphism, ensure the `on_surface` text color is placed over a semi-opaque layer that provides sufficient contrast against the moving background elements. Use the `outline` token (#747c80) for essential UI boundaries to assist low-vision users.