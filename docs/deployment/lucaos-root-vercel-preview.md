# LucaOS root Vercel preview

This document describes the Vercel setup for the root LucaOS web interface preview project.

## Project scope

- Use the repository root as the Vercel project root.
- This project is for founder visual QA of the root LucaOS web interface only.
- This project is not the production `app.lucaos.space` deployment.
- Do not attach the public `app.lucaos.space` domain to this preview project yet.
- Do not use this project for the separate landing page.

The landing page remains a separate Vercel project that uses the `landing/` directory.

## Build settings

The root `vercel.json` controls the deployment commands and output directory so the Vercel UI does not need to be edited.

- Framework preset: Vite
- Install command: `npm ci --ignore-scripts`
- Build command: `npm run build:web`
- Output directory: `dist`

The `npm run build:web` path is intentional. Do not use the default `npm run build` command for this preview project because the full repository build includes unrelated TypeScript and test debt outside the web-safe preview path.

## Routing

The root `vercel.json` includes a rewrite from all browser routes to `/index.html` so the Vite single-page app can handle client-side routing.

## Environment variables

Configure the following Vercel environment variables for the root preview project:

```dotenv
VITE_LUCA_RELEASE_TARGET=web
VITE_LUCA_APP_MODE=web
VITE_LUCA_RUNTIME_TARGET=vercel
VITE_ENABLE_DESKTOP_RUNTIME=false
VITE_ENABLE_LOCAL_MODEL_SCAN=false
VITE_ENABLE_LOCAL_OLLAMA=false
VITE_ENABLE_FILESYSTEM_MEMORY=false
VITE_ENABLE_LUCALINK_NATIVE_CONTROL=false
VITE_LUCA_API_URL=
VITE_CLOUD_API_URL=
VITE_CLOUD_CORTEX_URL=
```

Do not add provider secrets to Vercel for this preview project. The root web preview is for visual QA only and should not receive production secrets or native desktop/runtime credentials.

## Deployment guardrails

- Do not attach `app.lucaos.space` yet.
- Do not change domain attachment logic for this preview.
- Do not modify the `landing/` project for this root preview setup.
- Do not deploy from local automation when updating this configuration; let Vercel run the preview build from the committed configuration.
