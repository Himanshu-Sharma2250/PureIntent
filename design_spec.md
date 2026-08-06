# PureIntent: Comprehensive Design & Product Specification

Based on an exhaustive analysis of the `README.md`, `PRODUCT.md`, `DESIGN.md`, Tailwind configuration, Shadcn foundations, and ALL React components (including the deeply styled Auth pages), this document serves as the complete blueprint for **PureIntent**. If you were to recreate this application's aesthetic and philosophy from scratch, follow these specifications exactly.

## 1. Product & Brand Philosophy
- **Product Name**: PureIntent
- **Identity**: Refined, Academic, Intentional.
- **Product Purpose**: A focused, "editorial-grade" task management experience emphasizing typographic clarity and a deliberate, calm pace. Replaces traditional "tasks" with "intents".
- **Anti-References**: Avoid generic "SaaS dashboards" and over-saturated, hyper-rounded playful aesthetics. No noisy interfaces; feature density should never override legibility.
- **Brand Copy & Tone**: System toasts and placeholder copy are strictly editorial. Examples: 
  - Login Toast: *"Welcome back"*
  - Registration Toast: *"Your workspace is ready"*
  - Input labels: A password might be referred to as a *"Secret Key"*.
  - Subtitles: *"Begin your journey into focus."*

## 2. Shadcn/UI Foundational Config (`components.json`)
PureIntent uses a heavily customized Shadcn scaffold. If you are generating new components, the environment relies on this underlying configuration:
- **Style**: `radix-vega` 
- **Base Color**: `mist` 
- **Menu Accent**: `subtle`
- **Icon Registry Target**: While Shadcn components will scaffold using `"phosphor"` by default, the application's actual bespoke UX components strictly override this with `lucide-react`. 

## 3. Typography
The system employs a "Typographic First" design principle. Hierarchy is dictated primarily by deliberate sizing and weight contrast using serif typefaces.
- **Primary Typeface (Headings & Titles)**: `Instrument Serif` (Serif).
- **Secondary / Body Typeface**: System-default Serif (inherited gracefully via `font-serif` at the root `<html/>` level).
- **Hero/Landing Text**: Employs massive font scaling (`text-7xl md:text-9xl`) combined with extremely tight spacing (`tracking-tighter`) and constrained line height (`leading-[0.85]`).
- **Labels (Forms & Metadata)**: Deliberate contrast utilizing microscopic, heavily tracked capitalized text (`text-[10px] uppercase tracking-[0.2em] font-medium`).
- **Styling Details**:
  - Subtitles utilize `italic` serif styles to augment the editorial aesthetic.
  - Inputs utilize larger baseline fonts (`text-xl`, `text-lg`) to increase legibility.

## 4. Color Palette & Theming (OKLCH)
A strictly defined, high-contrast array using OKLCH formatting. Theme switches smoothly (500ms `ease-in-out`). The app defaults to **Dark Mode** (`storageKey="vite-ui-theme"`).

### Light Mode
- **Background**: `oklch(1 0 0)`
- **Foreground**: `oklch(0.148 0.004 228.8)`
- **Primary Accent**: `oklch(0.514 0.222 16.935)`
- **Muted Elements**: `oklch(0.963 0.002 197.1)` with foreground text `oklch(0.56 0.021 213.5)`

### Dark Mode (Default)
- **Background**: `oklch(0.148 0.004 228.8)`
- **Foreground**: `oklch(0.987 0.002 197.1)`
- **Primary Accent**: `oklch(0.455 0.188 13.697)`
- **Cards/Popovers**: `oklch(0.218 0.008 223.9)`

## 5. Layout & Details
- **Corner Radiuses**: Cards (`rounded-xl`), Modals/Empty states/Auth Blocks (`rounded-3xl`), Buttons (`rounded-full`).
- **Containers**: Generous padding (`p-6` on cards, `p-8 md:p-12` inside modals and Auth forms.
- **Global UI Placement**: The theme toggle floats permanently at `fixed top-6 right-6 z-50`.
- **Responsive Dashboard Grid**: `grid gap-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

## 6. UI Component Specifications

### Cards (Intents)
- **Styling**: `bg-card text-card-foreground overflow-hidden rounded-xl` with stacking flex layouts.
- **Inner Borders**: Cards use a subtle highlight ring: `shadow-xs ring-1 ring-foreground/10`.
- **Card Headings**: Titles act as primary interaction models `font-heading text-2xl group-hover:text-primary transition-colors`.

### Modals & Dialogs 
- **Overlay**: High-z stacking (`z-50`) placed over `bg-background/80 backdrop-blur-sm`.
- **Container**: `bg-card` surrounded by `ring-1 ring-border shadow-2xl rounded-3xl`.

### Form Fields (Inputs, Search)
- **Aesthetic**: Minimalist "Underline" style (`bg-transparent border-b border-border py-2 text-xl font-serif`). Placeholders text uses `text-muted-foreground/30`.

## 7. Icons & Indicators
Custom application UI exclusively uses **`lucide-react`**. Standard sizing is `size={18}` stroke 2.5, matching specific states.
- **Completion States**:
    - **COMPLETE**: `CheckCircle2` (`text-green-600`)
    - **IN_PROGRESS**: `Clock` (`text-primary`)
    - **PENDING**: `AlertCircle` (`text-muted-foreground`)

## 8. UX States & Advanced Staggered Animations
- **Mode Toggle Physics**: The Sun rotates `group-hover:rotate-12` while sliding out vertically `dark:-translate-y-10 dark:opacity-0`, instantly replaced by the Moon sliding into place `translate-y-10 opacity-0 dark:translate-y-0 dark:opacity-100` over a full 500ms window.
- **Loading State**: Uses a specific circular spinner logic (`w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin`).
- **Form Scaling (Physics)**: Standard buttons employ a hard squash `active:scale-95`, while massive Auth form buttons use a stiffer squish `active:scale-[0.98]`.
- **Hero Landing Page Staggering**: The main landing page title is split into individual blocks that cascade in from different directions over 1.2+ seconds, utilizing explicit CSS delays like `delay-300`, `delay-500`, and `delay-[1200ms]`.
- **Authentication Staggering**: Forms do not load simultaneously. In Login/Registration blocks, *every single input field* drops in sequentially. Header (`slide-in-from-bottom-8`), Card Body (`zoom-in-95 delay-200`), Email Field (`slide-in-from-left-4 delay-500`), Password Field (`delay-700`), Password 2 (`delay-1000`), Submit Box (`delay-[1200ms]`), and finally the Footer text (`delay-[1400ms]`).
- **Dashboard Staggered Enters**: Items stagger in using inline style calculations (`animationDelay: {i * 75}ms`).
- **Card Hover Physics**: The cards employ complex hover physics (`hover:ring-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300`). Action footers elegantly glide in by transitioning `opacity-0 translate-y-2` to `opacity-100 translate-y-0`.
