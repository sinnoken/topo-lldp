---
name: frontend-design
description: Build distinctive, production-ready frontend interfaces. Use this skill for web components, pages, dashboards, applications, and any UI work. Produces polished, accessible code that avoids generic AI aesthetics.
---

# Frontend Design Skill

Build interfaces that are distinctive, accessible, and production-ready. Every design decision should be intentional. Generic output is unacceptable.

## Before You Write Code

### 1. Understand the Context

Ask yourself (don't ask the user):
- **What is this?** Dashboard, marketing site, tool, app, landing page, portfolio?
- **Who uses it?** Developers, consumers, enterprise, creative professionals?
- **What's the emotional goal?** Trust, excitement, calm, urgency, playfulness?
- **What are the constraints?** Framework, existing design system, brand guidelines?

### 2. Choose an Aesthetic Direction

Commit to ONE direction. Don't hedge. Here are starting points:

| Direction | Characteristics | Best For |
|-----------|----------------|----------|
| **Precision & Density** | Tight spacing, monospace accents, borders over shadows, cool neutrals | Developer tools, admin panels, data-heavy apps |
| **Warm & Approachable** | Generous whitespace, soft shadows, rounded corners, warm neutrals | Consumer apps, onboarding flows, collaborative tools |
| **Bold & Editorial** | Strong typography hierarchy, dramatic scale contrasts, intentional asymmetry | Marketing sites, portfolios, content platforms |
| **Dark & Immersive** | Deep backgrounds, glowing accents, layered depth, cinematic feel | Creative tools, media apps, gaming interfaces |
| **Minimal & Refined** | Extreme restraint, careful typography, subtle interactions, luxurious space | Premium products, portfolios, single-purpose tools |
| **Retro & Playful** | Visible borders, chunky elements, saturated colors, nostalgic references | Creative products, indie tools, community platforms |
| **Industrial & Utilitarian** | Function over form, dense information, muted palette, no decoration | Enterprise software, monitoring dashboards, internal tools |

These are starting points. Combine, adapt, or invent your own. The goal is coherence, not conformity.

### 3. Accessibility is Non-Negotiable

Accessibility is not an add-on. Build it in from the start:
- Every interactive element must be keyboard accessible
- Color alone cannot convey meaning
- Contrast ratios must meet WCAG AA minimum (4.5:1 for text, 3:1 for UI)
- Screen readers must be able to navigate the interface

Bold design and accessibility are not in conflict. The best designs achieve both.

---

## Typography

Typography carries the design's voice. Default fonts signal default thinking.

### Principles

- **Never use:** Arial, Helvetica, Times New Roman as primary fonts. These signal "no thought given."
- **Be cautious with:** Inter, Roboto, Open Sans. They're fine fonts but overused. If you use them, pair with something distinctive.
- **Consider:** System font stacks for body text (performance), distinctive fonts for display text (personality).

### Hierarchy

Work the full typographic range:
- **Size:** Create clear levels (e.g., 48/32/24/18/16/14px, not 18/17/16/15)
- **Weight:** Use weight to establish importance (700 for headings, 400 for body, 500 for UI)
- **Case:** ALL CAPS for labels/metadata, sentence case for content
- **Spacing:** Letter-spacing for uppercase text, generous line-height for readability (1.5-1.7 for body)

### Pairing

- One display font (personality) + one text font (readability)
- Or one versatile family with enough weights (e.g., a variable font)
- Test at actual sizes before committing

---

## Color

Lead with conviction. Timid palettes create forgettable interfaces.

### Approach

Choose one of these strategies:

1. **Bold & Saturated:** One dominant saturated color, neutrals everywhere else, sharp accent for actions
2. **Moody & Restrained:** Desaturated palette, subtle color shifts, one carefully placed accent
3. **High-Contrast Minimal:** Near-black and near-white with a single accent color
4. **Warm Neutrals:** Cream, tan, brown spectrum with warm accent
5. **Cool Technical:** Slate, zinc, gray spectrum with blue or green accent

### Implementation

- Use CSS custom properties for all colors
- Define semantic names (`--color-primary`, `--color-surface`, `--color-text-muted`)
- Include dark mode variables if appropriate for the project
- Test contrast ratios for all text/background combinations

### What to Avoid

- Purple-to-blue gradients on white (the "AI slop" gradient)
- Rainbow color schemes without clear purpose
- More than 3-4 colors fighting for attention
- Accent colors that don't meet contrast requirements

---

## Layout & Composition

Predictable layouts are invisible. Intentional layouts are memorable.

### Spatial System

Pick a base unit and stick to it:
- **4px base:** 4, 8, 12, 16, 24, 32, 48, 64, 96
- **8px base:** 8, 16, 24, 32, 48, 64, 96, 128

Use these values for ALL spacing: padding, margins, gaps. Consistency creates cohesion.

### Composition Techniques

- **Asymmetry:** Off-center layouts create tension and interest
- **Overlap:** Elements that break grid lines feel intentional
- **Negative space:** Generous space around important elements increases their weight
- **Density:** Intentionally tight spacing for data-heavy interfaces
- **Viewport awareness:** Hero sections that respect the fold, content that rewards scrolling

### Responsive Approach

- Mobile-first: Start with the smallest viewport
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Fluid typography: Use clamp() for sizes that scale smoothly
- Container queries for component-level responsiveness when appropriate

---

## Depth & Surface

How elements relate in z-space defines the interface's personality.

### Strategies

1. **Flat with borders:** Clean, technical feel. Use subtle borders (1px, low opacity) to define surfaces.
2. **Soft shadows:** Approachable, modern feel. Use layered shadows with large blur radius.
3. **Hard shadows:** Bold, graphic feel. Use offset shadows with no blur.
4. **Layered surfaces:** Different background lightness levels to create depth without shadows.
5. **Glassmorphism:** Frosted glass effect with backdrop-filter. Use sparingly.

### Surface Hierarchy

Define 3-5 surface levels:
```css
--surface-0: /* base/page background */
--surface-1: /* cards, panels */
--surface-2: /* elevated elements, dropdowns */
--surface-3: /* modals, popovers */
```

---

## Motion & Interaction

Animation should feel inevitable, not decorative.

### Principles

- **Purpose:** Every animation should serve a function (feedback, orientation, delight)
- **Speed:** Most UI transitions: 150-300ms. Longer feels sluggish.
- **Easing:** Use ease-out for entrances, ease-in for exits, ease-in-out for state changes
- **Restraint:** One well-crafted page load animation beats scattered micro-interactions

### High-Impact Moments

- **Page load:** Staggered reveals with animation-delay create rhythm
- **Hover states:** Subtle transforms (scale, translate) and color shifts
- **Focus states:** Clear, visible, animated focus rings
- **State transitions:** Smooth transitions for toggles, expansions, tab switches

### Implementation

- Prefer CSS transitions and animations over JavaScript when possible
- Use `prefers-reduced-motion` media query to respect user preferences
- For React: Use Framer Motion or React Spring for complex animations
- For HTML/CSS: Native CSS animations with @keyframes

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Backgrounds & Texture

Solid colors are safe. Atmosphere is memorable.

### Techniques

- **Subtle gradients:** Very slight color shifts (< 10% difference) add depth
- **Noise/grain:** 2-5% noise overlay adds organic texture
- **Geometric patterns:** Grids, dots, lines as subtle background texture
- **Gradient meshes:** Multiple gradient layers for complex color fields
- **Blur layers:** Background elements with blur create depth

### When to Use

- **Marketing sites:** More texture, more atmosphere
- **Apps/tools:** Less texture, more clarity
- **Dark themes:** Texture helps reduce the "void" feeling

---

## Accessibility Checklist

### Semantic Structure

- [ ] Use semantic HTML elements (`<nav>`, `<main>`, `<article>`, `<aside>`, `<header>`, `<footer>`)
- [ ] Heading hierarchy is logical (h1 -> h2 -> h3, no skipping)
- [ ] Lists use `<ul>`, `<ol>`, `<dl>` appropriately
- [ ] Landmarks are present and unique

### Keyboard Navigation

- [ ] All interactive elements are focusable
- [ ] Tab order follows visual order
- [ ] Focus is visible and meets contrast requirements
- [ ] Skip link provided for main content
- [ ] No keyboard traps

### Visual Accessibility

- [ ] Text contrast: 4.5:1 minimum (3:1 for large text)
- [ ] UI component contrast: 3:1 minimum
- [ ] Color is not the only indicator of state
- [ ] Text can be resized to 200% without loss of function
- [ ] Animations respect `prefers-reduced-motion`

### Forms & Interactive Components

- [ ] All inputs have visible labels
- [ ] Error states are announced and visually clear
- [ ] Required fields are indicated (not just by color)
- [ ] Buttons have accessible names
- [ ] Custom components have appropriate ARIA roles

### Screen Readers

- [ ] Images have meaningful alt text (or alt="" for decorative)
- [ ] Icons have accessible labels when interactive
- [ ] Dynamic content changes are announced (aria-live)
- [ ] Modal dialogs trap focus and have proper roles

---

## Framework Patterns

### React + Tailwind

```jsx
// Component structure
function Card({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-surface-1 border border-white/5 rounded-lg p-4',
    elevated: 'bg-surface-2 shadow-lg rounded-lg p-4',
  };
  
  return (
    <div className={variants[variant]}>
      {children}
    </div>
  );
}

// Extend Tailwind config for design tokens
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
        },
      },
    },
  },
};
```

### Plain HTML/CSS

```html
<!-- Use CSS custom properties for theming -->
<style>
  :root {
    --surface-0: #0a0a0a;
    --surface-1: #141414;
    --surface-2: #1f1f1f;
    --text-primary: #fafafa;
    --text-muted: #a1a1a1;
    --accent: #3b82f6;
  }
  
  @media (prefers-color-scheme: light) {
    :root {
      --surface-0: #ffffff;
      --surface-1: #f5f5f5;
      --surface-2: #e5e5e5;
      --text-primary: #0a0a0a;
      --text-muted: #525252;
    }
  }
</style>
```

---

## Anti-Patterns: What to Avoid

### NEVER

- Generic system fonts with no typographic hierarchy
- Purple-blue gradients on white backgrounds
- Evenly-distributed rainbow color schemes
- Cookie-cutter card grids with no visual tension
- Shadows and borders and gradients all competing
- Animations that delay user actions
- Placeholder text left in production
- Icons without labels on critical actions

### INSTEAD

- Distinctive fonts with clear hierarchy
- Committed color palettes with intentional accent placement
- Layouts with visual rhythm and intentional spacing
- Cohesive depth strategy (pick shadows OR borders OR surfaces)
- Animations that feel instantaneous and purposeful
- Real content or realistic placeholder data
- Icons paired with text, or with accessible labels

---

## Performance

Design and performance are not at odds. Shipped beats perfect.

### Fonts

- Subset fonts to only needed characters
- Use `font-display: swap` to prevent invisible text
- Preload critical fonts
- Consider variable fonts to reduce total file size

### Images

- Use modern formats (WebP, AVIF)
- Implement responsive images with srcset
- Lazy load below-fold images
- Provide width/height to prevent layout shift

### CSS

- Prefer CSS over JavaScript for animations
- Use `will-change` sparingly and only when needed
- Minimize repaints with transform and opacity animations
- Consider critical CSS for above-fold content

---

## Final Checklist

Before shipping, verify:

- [ ] Design has a clear, coherent direction
- [ ] Typography creates clear hierarchy
- [ ] Color palette is committed, not scattered
- [ ] Spacing follows a consistent system
- [ ] Accessibility requirements are met
- [ ] Responsive behavior is tested
- [ ] Animations respect user preferences
- [ ] Performance is acceptable

---

Build interfaces that people remember. Make every pixel intentional. Ship work you're proud of.