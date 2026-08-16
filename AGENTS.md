# AGENTS.md - KKSetu Repository Guide

This file defines the repository structure, coding constraints, and verification expectations for
agents working on KKSetu. Treat current source and tests as the source of truth; README files can
lag behind implementation.

## Project Overview

KKSetu is a serverless image utility SPA built with React 19, TypeScript, Webpack, TanStack Query,
and Cloudflare Pages Functions. It provides Xiaohongshu and Skland image extraction, local image
obfuscation, a legacy TXT/Base64 extractor, and shared image preview controls.

There is no active database binding or persistent server-side storage. Types in
`src/types/index.ts` are legacy/prepared types, not evidence of an active D1 feature.

## Working Rules

- Inspect `git status --short` before editing and preserve unrelated user changes.
- Make surgical changes. Do not refactor or reformat adjacent code without a task-related reason.
- Verify behavior from current source and tests instead of inferring it from filenames or README
  prose.
- Remove code and styles made obsolete by your own change, but leave unrelated legacy code alone.
- Do not edit `dist/`, `node_modules/`, or generated `functions/types.d.ts` by hand.
- Do not commit, push, deploy, delete branches, or modify remote state unless explicitly requested.

## Repository Layout

```text
src/
  App.tsx                       BrowserRouter and application shell
  index.js                      React DOM entry point
  components/                   Shared UI and layout components
    ImageContainer/             Image grid and fullscreen viewer
  pages/
    XiaohongshuExtractPage/
    SklandExtractPage/
    ImageObfuscationPage/
    ExtractPage/
  hooks/                        TanStack Query feature hooks
  utils/                        Client utilities and image transforms
  styles/global.css             Global tokens and layout

functions/
  api/                          Cloudflare Pages Function routes
  _utils/                       Shared server-only helpers
  tsconfig.json                 Functions type-check config
  types.d.ts                    Generated Cloudflare declarations

tests/                          Vitest tests
public/                         HTML template and favicon
```

Put page-private components under the owning page's `__internal__/` directory. Put reusable,
business-neutral components in `src/components/`.

## Architecture and Ownership

- `src/App.tsx` owns `BrowserRouter`, `Header`, and `MainContent`.
- `MainContent` owns the shared TanStack `QueryClient` and page composition.
- `TabPanel` hides inactive pages without unmounting them. Route-sensitive listeners must check the
  active pathname and clean themselves up.
- Visible routes are `/`, `/skland`, and `/obfuscate`.
- `/extract` is intentionally hidden from `TabBar` and is reached by five Header clicks within one
  second. Do not expose or remove it unless explicitly requested.
- Pages own feature-specific input, validation, copy, and error messages.
- Hooks own client request state and response validation.
- `ImageContainer` owns generic loading, placeholder, image-grid, and fullscreen behavior. Keep it
  business-neutral and compatible with remote, Blob, and data URLs.
- `ImageObfuscationPage` owns upload, paste, batch state, and Blob URL lifecycle;
  `src/utils/imageObfuscation.ts` owns the reversible pixel transform. Revoke owned Blob URLs during
  replacement, failure, clearing, and unmounting.
- TXT extraction remains client-only.

## Cloudflare Pages Functions

Files in `functions/api/` map to `/api/<file-name>`. Keep route files focused on HTTP validation and
response mapping; reusable server logic belongs in `functions/_utils/`.

When changing a Function:

- Validate methods, content types, payloads, URLs, and identifiers before upstream work.
- Keep external destinations allowlisted and never create an arbitrary URL proxy.
- Parse untrusted data as `unknown` and narrow it explicitly.
- Preserve existing CORS, status-code, timeout, and error-response behavior unless the task changes
  the contract.
- Avoid logging cookies, tokens, signatures, device IDs, or full upstream payloads.
- Inject fetch, time, or UUID dependencies when deterministic tests need them.

## Development Commands

```bash
# Install dependencies
npm install

# Frontend only, port 3000; does not serve Pages Functions
npm start

# Frontend plus Pages Functions, normally port 8788
npm run dev

# Production build
npm run build

# Test suite
npm test -- --run

# One test file
npm test -- --run tests/skland.test.ts
```

Type-check frontend and Functions separately:

```bash
npx tsc --noEmit --ignoreDeprecations 5.0
npx tsc -p functions/tsconfig.json --noEmit --ignoreDeprecations 5.0
```

The override is required while the repository uses TypeScript 5.9 and root `tsconfig.json` contains
`ignoreDeprecations: "6.0"`; plain `npx tsc --noEmit` raises `TS5103`.

Live Skland tests are opt-in and perform real network requests:

```powershell
$env:RUN_SKLAND_LIVE_TESTS='1'
npm test -- --run tests/skland.live.test.ts
```

Generate Cloudflare declarations only when bindings or platform types change:

```bash
npx wrangler types --path=./functions/types.d.ts
```

Deploy only when explicitly requested:

```bash
npx wrangler pages deploy
```

## Verification

| Change | Minimum verification |
| --- | --- |
| Documentation only | Link/path review and `git diff --check` |
| Frontend component, hook, or utility | Frontend type-check, relevant tests, diff check |
| Pages Function or `_utils` | Both type-checks, relevant tests, diff check |
| Routing, config, or cross-cutting behavior | Full tests, both type-checks, build, diff check |

Webpack's existing asset-size warnings are non-blocking only when the build succeeds and the change
does not materially increase the affected bundle. Do not run live tests as part of the default
suite.

## Code Style

`prettier.config.js` is authoritative:

- 100-character print width and 2-space indentation
- Semicolons
- Single quotes in TypeScript and JSX
- ES5 trailing commas and bracket spacing
- Parentheses around arrow-function parameters
- Markdown prose wrapping

Import order:

1. React and external packages
2. Internal aliases (`@/`, `@components`, `@hooks`, `@utils`, `@styles`, `@types`)
3. Relative imports
4. Co-located CSS last

Match surrounding legacy style where needed; do not reformat an entire file as collateral work.

## TypeScript and React

- Strict TypeScript is enabled. Do not add `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Treat untrusted input as `unknown` and narrow it with explicit checks.
- Use `interface` for object shapes and `type` for unions or utility compositions.
- Keep feature-local types near their consumer. Move a type to `src/types/index.ts` only when it is
  genuinely shared.
- Prefer plain function components for new code. Do not rewrite existing `React.FC` components
  without a reason.
- Derive render-only values during render. Put interaction work in event handlers.
- Clean up timers, listeners, and owned resources in effects.
- Use functional state updates when the next value depends on previous state.
- TanStack Query keys must identify the request; use `enabled` to block invalid or empty inputs.
- Never leave an empty `catch`; handle, translate, or rethrow the error.

## CSS and UI

- Co-locate component/page styles in a same-named CSS file.
- Use kebab-case classes and existing variables from `src/styles/global.css`.
- Keep shared components and styles business-neutral; page-specific layout and copy belong to the
  page.
- Preserve keyboard behavior, labels, ARIA attributes, focus behavior, and mobile layout.
- Remove selectors made obsolete by your change without cleaning unrelated legacy styles.

## Naming

| Element | Convention | Example |
| --- | --- | --- |
| Components/pages | PascalCase | `SklandExtractPage` |
| Component files | PascalCase | `ImageContainer.tsx` |
| Hooks | `use` plus camelCase | `useGetSklandImages` |
| Utilities/functions | camelCase | `parseSklandArticleId` |
| CSS classes | kebab-case | `image-obfuscation-upload` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_TIMEOUT_MS` |
| Interfaces/types | PascalCase | `SklandImagesResponse` |

## Tests

- Tests live in `tests/` and use Vitest.
- Add the smallest regression test that proves changed parsing, validation, error mapping, caching,
  proxy allowlisting, or protocol behavior.
- Keep unit tests deterministic; mock or inject upstream fetches, time, and UUID generation.
- `tests/skland.live.test.ts` is the only live-upstream suite and remains gated by
  `RUN_SKLAND_LIVE_TESTS=1`.

## Documentation and Licensing

- `README.md` is the default Simplified Chinese README; `README_EN.md` is the English version. Keep
  their technical claims, commands, links, and license sections synchronized.
- Project-original code uses `LICENSE` (`PolyForm-Noncommercial-1.0.0`). Do not describe it as
  OSI-approved open source or imply that commercial use is allowed.
- Third-party code retains its original license. Preserve required notices and update
  `THIRD_PARTY_NOTICES.md` when adding or adapting third-party code.
