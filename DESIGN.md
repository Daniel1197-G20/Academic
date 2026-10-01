# DESIGN SYSTEM — ACADEMIC PLATFORM

## 1. Visual Identity & Brand Philosophy
The Academic Platform is designed as a serious, premium academic productivity instrument for university students. It combines the focus and precision of modern university systems, high-end fintech ergonomics, and serious productivity tools (Linear, Notion, Craft).

---

## 2. Color System

### Primary Colors
- **Ink (`#111827`)**: Primary body text, high-emphasis headings, primary buttons.
- **Deep Navy (`#172033`)**: Accent dark backgrounds, brand editorial sidebars.
- **Academic Green (`#176B4D`)**: Primary brand accent, progress indicators, active states, verified tags.
- **Light Green (`#DDEFE5`)**: Subtle accent backgrounds, badges, and active highlights.
- **Canvas / Background (`#F6F7F3`)**: Primary page background with warm, calming paper-like neutrality.
- **Surface (`#FFFFFF`)**: Clean component cards, modals, table surfaces, and dropdowns.

### Supporting Colors
- **Muted Text (`#667085`)**: Secondary descriptions, metadata, inactive labels.
- **Border (`#E5E7EB`)**: Restrained 1px structural borders defining components.
- **Academic Gold (`#C89B3C`)**: Study streaks, honours classifications, warnings.
- **Danger (`#C24141`)**: Account erasure warnings, invalid input alerts, error toasts.
- **Success (`#176B4D`)**: Completed topics, positive grade trends, confirmation states.
- **Warning (`#B7791F`)**: Disclaimers and non-blocking notices.

---

## 3. Typography Hierarchy

### Typefaces
- **Primary UI Sans**: `Manrope` (weights: 400, 500, 600, 700, 800)
- **Editorial Serif (Headings)**: `DM Serif Display` (weight: 400, italic)
- **Monospace (Data / Code / Times)**: `JetBrains Mono` (weights: 400, 500, 600)

### Scale
- **Display / Editorial**: `font-serif text-3xl xl:text-4xl`, tracking-tight, line-height 1.2
- **Page Heading (H1)**: `font-sans font-bold text-2xl sm:text-3xl`, tracking-tight
- **Section Heading (H2)**: `font-sans font-bold text-lg sm:text-xl`, tracking-tight
- **Card Heading (H3)**: `font-sans font-semibold text-base sm:text-lg`, tracking-tight
- **Subheading / Label**: `font-sans font-semibold text-xs sm:text-sm`, text-ink
- **Body Text**: `font-sans text-xs sm:text-sm`, line-height 1.6, text-muted or text-ink
- **Caption / Meta**: `font-sans text-[11px]`, text-muted
- **Data / Units**: `font-mono text-xs font-semibold`, text-ink

---

## 4. Spacing Scale
Consistent 4px grid progression:
- `4px` (`gap-1`, `p-1`)
- `8px` (`gap-2`, `p-2`)
- `12px` (`gap-3`, `p-3`)
- `16px` (`gap-4`, `p-4`)
- `20px` (`gap-5`, `p-5`)
- `24px` (`gap-6`, `p-6`)
- `32px` (`gap-8`, `p-8`)
- `40px` (`gap-10`, `p-10`)
- `48px` (`gap-12`, `p-12`)
- `64px` (`gap-16`, `p-16`)

---

## 5. Border Radii
- **Small (`rounded-md`, 6px)**: Badges, timeline dots, inner input icons.
- **Medium (`rounded-[10px]`, 10px)**: Buttons, text inputs, selects, textareas.
- **Large (`rounded-card`, 14px)**: Cards, banners, modal containers.
- **Full (`rounded-full`)**: Avatars, pill badges, progress bar tracks.

---

## 6. Depth & Elevation
- **Subtle**: `0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)` (cards, stat chips)
- **Card Hover**: `0 4px 12px 0 rgba(17, 24, 39, 0.07)` (interactive course/plan cards)
- **Modal**: `0 20px 25px -5px rgba(17, 24, 39, 0.08), 0 8px 10px -6px rgba(17, 24, 39, 0.04)` (dialog surfaces)

---

## 7. Motion & Transitions
- Duration: `150ms – 250ms`
- Timing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Properties: `opacity`, `transform`, `background-color`, `border-color`
- Accessible: Graceful static fallbacks with `motion-reduce`.
