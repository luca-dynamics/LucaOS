# LucaOS Web release deployment

LucaOS Web is a first-class release target for production browser deployment, not merely a localhost development mode. The deployable application is the root Vite React app, and the root `vercel.json` configures its production build and single-page application routing.

## Deployment boundary

Vercel hosts the LucaOS browser UI only. It runs `npm run build` and publishes the generated `dist` directory.

`npm run server` starts LucaOS's local Node backend. It is not deployed by this Vercel target. For production, the backend responsibilities used by the browser UI should be deployed as a separately hosted API and configured through `VITE_LUCA_API_URL`.

Electron IPC, local model discovery and installation, filesystem-backed memory, native device control, and native Luca Link host control remain desktop-only capabilities. The web release keeps the related product surfaces understandable while avoiding calls into unavailable native runtimes.

## Vercel project settings

Use the following project settings:

| Setting | Value |
| --- | --- |
| Root Directory | `./` |
| Framework Preset | Vite |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Copy the public runtime configuration from `.env.vercel.example` into the appropriate Vercel environment settings. A production web deployment should set `VITE_LUCA_RUNTIME_TARGET=vercel`; Vercel also supplies `VERCEL=1`, which the Vite build uses as a release-target signal for root-relative assets.

## Domains

Suggested production domains:

- Web application: `app.lucaos.space`
- Hosted API: `api.lucaos.space`

The apex domain, `lucaos.space`, is reserved for the public product landing page in `landing/`; do not assign it to the app/dashboard project.

Point `VITE_LUCA_API_URL` at the hosted API origin when that service is available. Keep browser/API origin policy, authentication, and request validation configured for the production domains.

## Secrets

Variables prefixed with `VITE_` are compiled into the browser bundle and are public. Never place provider secret keys, private signing material, database credentials, or other secrets in `VITE_` variables.

Secret keys must remain server-side in the hosted API environment. The browser should call authenticated server endpoints rather than receive infrastructure or model-provider secrets directly.

## Local and native development

The existing commands retain their responsibilities:

- `npm run dev` and `npm start` run the Vite browser UI.
- `npm run server` runs the local Node backend.
- `npm run electron:dev` and `npm run electron:full` run the desktop runtime.
- Mobile builds continue to use the embedded relative asset base required by Capacitor.

The Vite public base remains `./` for Electron and mobile embedded builds, while Vercel builds use `/`.
