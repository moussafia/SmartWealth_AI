# Angular Frontend Development — Finance UI Skill

> Drop this file into your project as `.cursorrules` (root) or `.cursor/rules/angular-finance.mdc`
> (Cursor's newer rules format). Either works — Cursor reads project-level rules automatically.

## Purpose
Guides the agent to build Angular UI that looks and feels like a professional finance/fintech
product: trustworthy, data-dense but calm, compact typography, and a disciplined color system
for gains/losses/neutral states.

---

## 1. Angular Conventions

- Use **standalone components** (no NgModules unless the project already uses them).
- Prefer **signals** (`signal`, `computed`, `effect`) over RxJS for local component state;
  use RxJS for streams (HTTP, websockets, router events).
- Use the **new control-flow syntax**: `@if`, `@for`, `@switch` — not `*ngIf` / `*ngFor`.
- File naming: `feature-name.component.ts`, `.html`, `.scss` (separate files, no inline templates
  except for components under ~15 lines).
- One component = one responsibility. Extract presentational ("dumb") components for anything
  reused more than once (badges, amount cells, trend arrows, tickers).
- Strongly type everything. No `any`. Model API responses with `interface`s in a `models/` folder.
- Use `ChangeDetectionStrategy.OnPush` on all components by default.
- Currency/number formatting always goes through Angular's `CurrencyPipe` / `DecimalPipe` or a
  shared `formatMoney()` util — never hand-rolled string concatenation.
- Folder structure:
  ```
  src/app/
    core/          # singleton services, interceptors, guards
    shared/        # reusable components, pipes, directives
    features/
      dashboard/
      portfolio/
      transactions/
    models/
    styles/
      _tokens.scss
      _typography.scss
  ```

---

## 2. Design Tokens — Finance Palette

Use CSS custom properties, defined once in `styles/_tokens.scss`, never hardcoded hex values
in component styles.

```scss
:root {
  /* Base neutrals — deep, low-saturation navy/charcoal, not pure black */
  --color-bg: #0b1220;            /* app background (dark mode default) */
  --color-bg-light: #f7f8fa;      /* app background (light mode) */
  --color-surface: #111a2b;       /* cards, panels (dark) */
  --color-surface-light: #ffffff; /* cards, panels (light) */
  --color-border: #1f2a3d;
  --color-border-light: #e3e6eb;

  /* Text */
  --color-text-primary: #e8ecf3;
  --color-text-primary-light: #14181f;
  --color-text-secondary: #8a94a6;
  --color-text-muted: #5c6478;

  /* Brand */
  --color-primary: #1c3d5a;       /* deep navy — headers, primary actions */
  --color-primary-hover: #244d70;
  --color-accent: #c9a227;        /* muted gold — highlights, premium/CTA */

  /* Financial semantics */
  --color-positive: #1ea672;      /* gains, buy, up */
  --color-positive-bg: rgba(30, 166, 114, 0.12);
  --color-negative: #d64545;      /* losses, sell, down */
  --color-negative-bg: rgba(214, 69, 69, 0.12);
  --color-neutral: #8a94a6;       /* flat / no change */
  --color-warning: #d69e2e;       /* pending, at-risk */
  --color-info: #3f7ec1;

  /* Elevation */
  --shadow-card: 0 1px 2px rgba(0,0,0,0.06), 0 1px 1px rgba(0,0,0,0.04);
  --shadow-card-hover: 0 4px 10px rgba(0,0,0,0.10);

  /* Radius & spacing scale (8px base, tight) */
  --radius-sm: 4px;
  --radius-md: 6px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
}
```

**Rules for the agent:**
- Never use pure black `#000` or pure white `#fff` — use the tokens above.
- Positive/negative colors are reserved exclusively for numeric deltas, trend indicators, and
  status chips (gain/loss, buy/sell, up/down). Don't reuse green/red for unrelated UI (e.g. don't
  make a random "Save" button green just because green = go).
- Gold accent (`--color-accent`) is used sparingly — one focal point per screen max (a highlighted
  plan, a primary metric, a premium badge). It is not a general-purpose highlight color.

---

## 3. Typography — Compact / Data-Dense

Finance UIs prioritize information density over large decorative type.

```scss
:root {
  --font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'IBM Plex Mono', 'Roboto Mono', monospace; /* for numbers/tickers/tables */

  /* Slightly smaller than typical default (16px) baseline */
  --font-size-base: 13px;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 13px;
  --font-size-lg: 15px;
  --font-size-xl: 18px;
  --font-size-2xl: 22px;

  --line-height-tight: 1.25;
  --line-height-base: 1.45;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
}

body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
  color: var(--color-text-primary);
}
```

**Rules for the agent:**
- All numeric values (prices, balances, percentages, table cells) use `var(--font-family-mono)`
  with `font-variant-numeric: tabular-nums;` so digits align in columns.
- Headings stay modest: page title `--font-size-xl`, section title `--font-size-lg`,
  card/table labels `--font-size-sm` uppercase with `letter-spacing: 0.03em`.
- Never default to browser base font size (16px) for body text in this project — always set
  `--font-size-base` explicitly at the root.

---

## 4. Component Patterns

**Amount / delta display**
```html
<span class="amount" [class.positive]="value >= 0" [class.negative]="value < 0">
  {{ value | currency:'USD':'symbol':'1.2-2' }}
</span>
```
```scss
.amount {
  font-family: var(--font-family-mono);
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-medium);
  &.positive { color: var(--color-positive); }
  &.negative { color: var(--color-negative); }
}
```

**Cards / panels**: `--color-surface`, 1px `--color-border`, `--radius-md`, `--shadow-card`,
padding `--space-4`. Hover state (if interactive) bumps to `--shadow-card-hover`, no scale
transforms — finance UI should feel stable, not bouncy.

**Tables**: dense rows (36–40px height), right-align numeric columns, mono font for numbers,
zebra striping optional at very low contrast (`--color-surface` vs `--color-bg`), sticky header.

**Status chips**: pill shape, `--radius-sm` not fully rounded, background = the `-bg` variant of
the semantic color, text = the solid semantic color, `--font-size-xs` uppercase.

**Motion**: transitions ≤150ms, ease-out, only on opacity/color/shadow — no bouncy easing, no
large translate animations. Trust and stability over flourish.

---

## 5. Accessibility & Quality Bar

- Maintain WCAG AA contrast even with the compact font sizes (verify `--color-text-secondary`
  against both `--color-bg` and `--color-surface`).
- Never rely on color alone for gain/loss — always pair with `+`/`-` sign or an arrow icon.
- All interactive elements need visible focus states (`outline` using `--color-info` or
  `--color-accent`, not the browser default).
- Use `aria-live="polite"` on regions that update with live price/balance data.

---

## How to use with Cursor
1. Save this file as `.cursorrules` in your repo root, **or**
2. Save it as `.cursor/rules/angular-finance.mdc` for the newer per-project rules system.
3. Reference it explicitly in prompts if needed: "follow angular-finance.mdc conventions."
