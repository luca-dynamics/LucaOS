# LucaOS public landing page

This folder powers [https://lucaos.space](https://lucaos.space), the public LucaOS product landing page.

The site is intentionally implemented as static HTML, CSS, and JavaScript. It can be deployed directly from this directory without running the LucaOS application build or dashboard server.

## Domain responsibilities

- `lucaos.space` hosts this public product landing page.
- `app.lucaos.space` is reserved for the LucaOS Web app and dashboard.
- `api.lucaos.space` is reserved for the future Luca Runtime API.

The static landing site includes its own product, community, resource, download/waitlist, and legal pages. Changes to this folder should not require changes to the root Vite application.

## Local preview

Serve the folder with any static HTTP server. For example:

```sh
python3 -m http.server 8000 --directory landing
```

Then open `http://localhost:8000`.

## Vercel

Deploy this directory as a Vercel project using the **Other / Static Site** framework preset. No build command is required, and the output directory is `.`. Route handling is defined in [`vercel.json`](./vercel.json).
