# LucaOS production domains

LucaOS uses separate production domains for the public product site, browser application, runtime API, documentation, and service status. Keeping those responsibilities separate prevents the root Vite dashboard from replacing the public landing page.

## Domain plan

| Domain | Responsibility | Deployment status |
| --- | --- | --- |
| `lucaos.space` | Public LucaOS product landing page from `landing/` | Production landing target |
| `www.lucaos.space` | Redirect to, or mirror of, `lucaos.space` | Configure with the landing project |
| `app.lucaos.space` | LucaOS Web app/dashboard from the repository root | Future app deployment |
| `api.lucaos.space` | Hosted Luca Runtime API | Reserved for a future service |
| `docs.lucaos.space` | LucaOS documentation | Reserved for future documentation |
| `status.lucaos.space` | LucaOS service status page | Reserved for a future status service |

## Landing-page Vercel project

Create a dedicated Vercel project for `lucaos.space`:

| Setting | Value |
| --- | --- |
| Project name | `lucaos-landing` |
| Root Directory | `landing` |
| Framework Preset | Other / Static |
| Build Command | Leave empty |
| Output Directory | `.` |
| Production domains | `lucaos.space`, `www.lucaos.space` |

The landing page is plain HTML, CSS, and JavaScript. Its `landing/vercel.json` enables clean URLs and maps clean subpage routes to their checked-in HTML files. Configure `www.lucaos.space` as a redirect to the apex domain when a single canonical host is preferred; otherwise it may mirror the same deployment. The canonical landing URL is `https://lucaos.space/`.

If Vercel later requires an explicit build step, add `landing/package.json` with this minimal static-copy wrapper:

```json
{
  "scripts": {
    "build": "mkdir -p dist && find . -maxdepth 1 ! -name dist ! -name package.json ! -name package-lock.json -exec cp -R {} dist/ \\;"
  }
}
```

Then configure:

- Build Command: `npm run build`
- Output Directory: `dist`

The wrapper is not currently needed because the landing project can publish `landing/` directly.

## Future LucaOS Web app project

The repository-root Vite application belongs on `app.lucaos.space`, not on the apex domain. Create a separate Vercel project when the dashboard is ready for production:

| Setting | Value |
| --- | --- |
| Project name | `lucaos-app` |
| Root Directory | `./` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Production domain | `app.lucaos.space` |

The app should use `https://api.lucaos.space` as its hosted runtime API origin once that service exists. The API must be deployed separately; Vercel deployment of the root browser app does not run the local `server.js` backend.
