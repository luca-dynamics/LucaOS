# LucaOS landing page

This directory powers [https://lucaos.space](https://lucaos.space) and contains the public LucaOS product landing page.

The site is intentionally implemented as static HTML, CSS, and JavaScript. It is separate from the LucaOS Web app/dashboard in the repository root and does not build or run that application.

## Domain boundary

- `lucaos.space` — public LucaOS product landing page from this directory
- `www.lucaos.space` — redirect or mirror of the public landing page
- `app.lucaos.space` — LucaOS Web app/dashboard from the repository root
- `api.lucaos.space` — reserved for the future hosted Luca Runtime API
- `docs.lucaos.space` — reserved for future documentation
- `status.lucaos.space` — reserved for a future status page

## Vercel deployment

Create a dedicated Vercel project with these settings:

| Setting | Value |
| --- | --- |
| Project name | `lucaos-landing` |
| Root Directory | `landing` |
| Framework Preset | Other / Static |
| Build Command | Leave empty |
| Output Directory | `.` |

The checked-in `vercel.json` provides clean static routes for the landing page and its subpages. If a future Vercel configuration requires a build command, add a minimal package build wrapper that copies the static files to `dist`, then use `npm run build` and set the Output Directory to `dist`. Do not point this project at the root Vite app.
