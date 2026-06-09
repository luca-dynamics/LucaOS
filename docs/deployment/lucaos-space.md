# `lucaos.space` production deployment

## Domain plan

The LucaOS public domains have separate responsibilities:

| Domain | Purpose |
| --- | --- |
| `lucaos.space` | Public LucaOS product landing page served from `landing/`. |
| `www.lucaos.space` | Redirects to, or mirrors, the canonical `lucaos.space` landing page. A redirect is preferred so canonical URLs remain consistent. |
| `app.lucaos.space` | LucaOS Web application and dashboard. This is separate from the landing-page Vercel project. |
| `api.lucaos.space` | Future Luca Runtime API. |
| `docs.lucaos.space` | Future dedicated LucaOS documentation site. |
| `status.lucaos.space` | Future LucaOS service status page. |

The apex domain must not deploy the root LucaOS Vite app. The root app/dashboard belongs on `app.lucaos.space` when its production deployment is configured.

## Landing-page source

The production landing source is the static HTML/CSS/JavaScript site in `landing/`. It was promoted from the former research path `research/Luca-landing-page/` so it can be maintained and deployed as a first-class site.

The landing project has no application build step. Its HTML files, styles, scripts, images, icons, and subpages are served directly. `landing/vercel.json` enables clean URLs and maps public paths to the static subpages.

## Vercel project settings

Create or configure the landing project with these settings:

| Setting | Value |
| --- | --- |
| Project Name | `lucaos-landing` |
| Root Directory | `landing` |
| Framework Preset | Other / Static Site |
| Build Command | Leave empty / no build command |
| Output Directory | `.` |

Attach `lucaos.space` to this project as the primary domain. Attach `www.lucaos.space` and configure it to redirect to `https://lucaos.space` when possible. Do not attach `app.lucaos.space` to this project.

## Build-command fallback

Vercel should deploy the files directly from `landing/`. If a future Vercel configuration requires an explicit build command and output directory, add this minimal `landing/package.json`:

```json
{
  "scripts": {
    "build": "mkdir -p dist && cp -R ./* dist/ && rm -rf dist/dist"
  }
}
```

Then configure:

- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Do not add this fallback unless the direct static deployment is rejected, because the no-build configuration is simpler and avoids duplicating the site into a generated directory.

## Route behavior

The Vercel configuration preserves these clean public routes:

- `/pitch`
- `/community`
- `/resources`
- `/download/*`
- `/legal/*`
- `/resources/*`

Each route maps to an existing static HTML page or subpage under `landing/`. No single-page-application fallback is required because this site is not a React/Vite SPA.
