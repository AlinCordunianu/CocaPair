# CocaPair

React + JavaScript + Vite + SCSS. Camera images are processed locally in a worker using the supplied `best.tflite`; no frame uploads or inference backend.

## Run and verify

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
npm run format
npm run format:check
```

## Cloudflare Workers deployment

Deploy this frontend with Workers Static Assets using the root `wrangler.jsonc`.
No server Worker entry point or Cloudflare Pages project is required. The build
copies the model, browser detector worker, and WASM runtime into `dist/` alongside
the Vite output. Unknown paths fall back to `index.html` for client-side navigation.

In **Workers & Pages → your Worker → Settings → Build**, configure:

- Root directory: the repository root (leave the default if already selected).
- Build command: `npm run build`.
- Deploy command (production): `npx wrangler@4.162.0 deploy`.
- Preview command (non-production branches, if enabled): `npx wrangler@4.162.0 preview`.
- Production branch: the branch intended to publish the live application.

The configured Worker name must match `cocapair` in `wrangler.jsonc`; change that
name if the connected Cloudflare Worker has a different name. Commit the config
so it is available to Git-connected builds. Build commands are dashboard settings;
editing this file does not change them automatically.

The empty `previews` block enables branch Previews for this assets-only project.
It does not promote a Preview to production. If the production Deploy command is
currently `npx wrangler preview`, replace it with the production command above.
For an intentional non-production build, keep the Preview command.

Validate locally without publishing (the build must run first):

```sh
npm run build
npx wrangler@4.162.0 deploy --dry-run
npx wrangler@4.162.0 dev
```

Wrangler is versioned explicitly in these commands so CI does not silently select
a different release. Production publishing requires Cloudflare authentication and
permission to deploy the connected Worker. See Cloudflare's
[build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/),
[Preview configuration](https://developers.cloudflare.com/workers/previews/configuration/),
and [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/).
