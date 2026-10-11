# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
# Access Key applicativa

La pagina mostra esclusivamente la schermata neutra di accesso finché il dispositivo non presenta una Access Key valida nel formato `MURLAN-XXXX-XXXX-XXXX`. La chiave non viene mai salvata nel browser: il server conserva solo SHA-256 e crea il cookie HttpOnly `murlan_access`. La revoca della chiave revoca a cascata tutte le sessioni dispositivo.

Migration: `drizzle/0004_access_keys.sql` (in produzione: `npx wrangler d1 migrations apply murlan-game-db --remote`).

Segreti/variabili: configurare il secret `ACCESS_ADMIN_SECRET` con `npx wrangler secret put ACCESS_ADMIN_SECRET`. Il binding D1 resta `DB`.

Prima chiave: `node scripts/create-access-key.mjs "Paolo"`, quindi inserire il solo `id`, `label` e `hash` prodotti nell'endpoint amministrativo o in D1:
`INSERT INTO access_keys (id,label,hash,active) VALUES ('ID','Paolo','HASH',1);`
La stringa `key` completa va consegnata una sola volta e non va archiviata.

Amministrazione via `POST /api/access/admin` con header `Authorization: Bearer ACCESS_ADMIN_SECRET` (creazione), `GET` (elenco senza hash) e `PATCH` con `{ "keyId": "..." }` o `{ "sessionId": "..." }` (revoca).

Deploy: `npm ci`; `npm run db:generate`; `npm run build:pages`; `npx wrangler d1 migrations apply murlan-game-db --remote`; `npx wrangler pages deploy dist/pages-deploy --project-name murlan-game`.
