# magisterdigital-redesign

Rebuild work for **magisterdigital.ai** — a WordPress Full-Site-Editing block theme (`magister-digital`) on WP Engine behind Cloudflare.

**This repository is the staging environment.** WP Engine is production only.

## Live mockup

**https://betchy1511-arch.github.io/magisterdigital-redesign/mockup/**

Served by GitHub Pages from `main` → `/` (root). Push to `main` and the link updates. Mockup pages carry `noindex` so they cannot be crawled while in review.

| Page | What it is |
|---|---|
| [`mockup/index.html`](mockup/index.html) | Landing page for the mockup |
| [`mockup/styleguide.html`](mockup/styleguide.html) | The design system — tokens, type scale, spacing, radius, elevation, interactive states, WCAG contrast verification |

## Accessibility finding

Contrast ratios were computed with the WCAG 2.1 relative-luminance formula, not estimated.

| Foreground | Background | Ratio | Verdict |
|---|---|---|---|
| `#D4AF37` gold | `#16171A` ink | **8.52:1** | AAA |
| `#D4AF37` gold | `#F7F7F5` paper | **1.96:1** | **Fails AA at every text size, and fails the 3:1 UI floor** |
| `#6E561A` gold-deep | `#F7F7F5` paper | **6.51:1** | AA — this is the accessible gold for light surfaces |
| `#A8842A` gold-dark | `#F7F7F5` paper | 3.26:1 | Large text and UI components only |

**The rule this produces:** never reference the raw gold directly in a component. Use `--accent-on-dark` or `--accent-on-light`, which resolve to `#D4AF37` and `#6E561A` respectively. The full matrix is rendered on the design system page.

## Structure

```
mockup/          Static HTML/CSS mockup — no WordPress, no build step
                 This is what GitHub Pages serves.
```

`theme/` will be added when the WordPress theme comes under version control — it will mirror `wp-content/themes/magister-digital/`.

## What is deliberately not in here

Audit documents, the baseline capture and client-facing analysis stay outside this repository. It is public so that GitHub Pages can serve the mockup on a free plan, and none of that material should be world-readable.

## Local development

No tooling required for the mockup — open `mockup/index.html` in a browser.

The WordPress theme, when added, runs locally via Local by Flywheel or `wp-env` against a database export. GitHub cannot execute PHP, so the theme cannot be run from this repository; the repo is version control and review.

## Deploying to production

Not yet wired. Theme code reaches WP Engine by git-push, zip upload, or SFTP — the method is unconfirmed pending client access. Note that response headers, HTTPS redirects and `robots.txt` live at the Cloudflare and WP Engine layer, above the theme, so they have no staging surface in this repository and go to production individually.
