---
name: Modern Earthy Commerce
colors:
  surface: '#fbf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#fbf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ef'
  surface-container: '#efeeea'
  surface-container-high: '#eae8e4'
  surface-container-highest: '#e4e2de'
  on-surface: '#1b1c1a'
  on-surface-variant: '#51443d'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f0ed'
  outline: '#83746c'
  outline-variant: '#d5c3b9'
  surface-tint: '#805437'
  primary: '#502c12'
  on-primary: '#ffffff'
  primary-container: '#6b4226'
  on-primary-container: '#e9b08c'
  inverse-primary: '#f4ba96'
  secondary: '#934b00'
  on-secondary: '#ffffff'
  secondary-container: '#fc943b'
  on-secondary-container: '#683300'
  tertiary: '#1c3b2b'
  on-tertiary: '#ffffff'
  tertiary-container: '#335241'
  on-tertiary-container: '#a2c4ae'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbc7'
  primary-fixed-dim: '#f4ba96'
  on-primary-fixed: '#311300'
  on-primary-fixed-variant: '#653d22'
  secondary-fixed: '#ffdcc4'
  secondary-fixed-dim: '#ffb781'
  on-secondary-fixed: '#301400'
  on-secondary-fixed-variant: '#703800'
  tertiary-fixed: '#c7ebd4'
  tertiary-fixed-dim: '#accfb8'
  on-tertiary-fixed: '#012113'
  on-tertiary-fixed-variant: '#2e4d3c'
  background: '#fbf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2de'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system embodies a "Modern Earthy" aesthetic, bridging the gap between high-end tactile luxury and hyper-efficient digital commerce. The brand personality is grounded, trustworthy, and organic, yet technologically sophisticated. 

The design style is a hybrid of **Minimalism** and **Glassmorphism**, utilizing heavy whitespace to create a premium "boutique" atmosphere. It avoids the cluttered nature of traditional e-commerce by prioritizing breathing room and structural clarity. Visual interest is generated through high-quality product photography set against warm, paper-like surfaces rather than aggressive decorative elements. 

The emotional response should be one of "calm reliability"—the user should feel they are shopping at a curated local market that has been refined through a premium digital lens.

## Colors

The palette is rooted in organic tones to reinforce the "hyperlocal" and "earthy" narrative.

- **Primary (#6B4226):** A deep, roasted brown used for branding, primary buttons, and high-level headings. It provides a sense of stability and premium quality.
- **Accent (#F28C33):** A warm, sun-kissed orange reserved for high-priority calls to action, sale indicators, and highlighting critical path interactions.
- **Background (#FDFBF7):** A light beige "paper" tone that reduces eye strain and distinguishes the UI from generic "white-label" apps.
- **Surface (#FFFFFF):** Pure white is used exclusively for floating cards and interactive containers to create a clear "lift" from the beige background.
- **Success (#2D4C3B):** A muted Forest Green for positive confirmations, keeping within the earthy spectrum.
- **Error (#D9534F):** A soft, desaturated red that communicates issues without creating high-stress visual vibration.

## Typography

The design system utilizes **Manrope** for its modern, geometric construction and excellent legibility at small sizes. The typographic hierarchy is steep to ensure clear information architecture in a dense commerce environment.

- **Headlines:** Use Bold (700) or ExtraBold (800) weights with slight negative letter-spacing to create a "locked-in" premium feel.
- **Body Text:** Kept at a generous 16px base to maintain accessibility and a relaxed reading pace.
- **Labels:** Small labels for "In Stock" or "Category" tags use an uppercase style with increased letter-spacing to provide a rhythmic contrast to the sentence-case body text.
- **Mobile Scaling:** Headline sizes drop by approximately 15-20% on mobile devices to ensure product titles do not wrap excessively.

## Layout & Spacing

The layout follows a **Fluid Grid** philosophy with a strict 8px base unit. This ensures a mathematical harmony across all components.

- **Desktop:** A 12-column grid with a 1280px max-width. Large 40px external margins are used to center the content and provide an "Apple-esque" sense of focus.
- **Mobile:** A 2-column or 4-column grid depending on content density. Margins are reduced to 16px to maximize screen real estate for product imagery.
- **Spacing Rhythm:** Use large gaps (32px, 48px, 64px) between major sections to prevent the "cluttered marketplace" look. Smaller components (items in a list) should use 8px or 16px increments.

## Elevation & Depth

Visual hierarchy is established through **Ambient Shadows** and **Glassmorphism**.

1.  **Level 0 (Base):** The Light Beige (#FDFBF7) background.
2.  **Level 1 (Cards):** White surfaces with a very soft, multi-layered shadow (Blur: 20px, Spread: -5px, Opacity: 4% Black). This creates a "resting" effect rather than a "floating" effect.
3.  **Level 2 (Interactive/Sticky):** Navigation bars and bottom sheets use a **Glassmorphic** blur (Backdrop-filter: blur(12px)) with a 70% opacity white fill. This maintains context of the scroll position while providing a clear interactive layer.
4.  **Level 3 (Modals):** High-diffusion shadows with a subtle tint of the primary brown (#6B4226 at 10% opacity) to ground the element in the earthy palette.

## Shapes

The shape language is extremely friendly and modern, utilizing **Large Rounded Corners**. 

- **Cards and Containers:** Use `rounded-2xl` (1rem / 16px) as the standard for product cards to evoke a "soft-touch" physical object feel.
- **Buttons and Inputs:** Use `rounded-xl` (0.75rem / 12px) to maintain a distinct but complementary language to the cards.
- **Search Bars & Badges:** Use `rounded-full` (Pill-shaped) to differentiate these high-frequency utility elements from structural content containers.
- **Icons:** Should feature rounded terminals and a consistent 2px stroke weight to match the softness of the UI.

## Components

- **Buttons:** 
    - *Primary:* Deep Brown background, white text. No border. Heavy internal horizontal padding.
    - *Secondary:* Transparent background with a 1.5px Primary Brown border.
    - *CTA (Add to Cart):* Warm Orange background. Use subtle micro-animations (scale 0.98 on press).
- **Product Cards:** Minimalist layout. The image occupies the top 70% of the card with no border. Text is left-aligned with the price in a Bold weight and the brand name in a smaller, muted Label-sm style.
- **Input Fields:** Soft beige background (a shade darker than the page background) with a 1px border that turns Primary Brown on focus. No shadows on resting state.
- **Chips/Filter Tags:** Pill-shaped with a white background and a subtle border. When active, they switch to a Primary Brown fill.
- **Glass Sticky Header:** Contains the search bar and location picker. The blur effect allows the warm background colors to bleed through, maintaining the earthy feel during scroll.
- **Bottom Sheets (Mobile):** High rounded corners (32px top radius) and a tactile "grabber" bar. Used for cart summaries and product filters.