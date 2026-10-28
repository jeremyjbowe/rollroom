# Rollroom

A press-room roll-length calculator with a shared D1 product library.

## Pilot setup

The calculator and active calculation product fields are public: no station sign-in is needed. The /admin page requires ChatGPT sign-in and the registered administrator's stable Site identity. All product writes enforce the same authorization on the server. Anonymous and non-admin visitors cannot read notes, audit metadata, or archived products.

The owner registered while the site was owner-private. The setup endpoint is now permanently closed (403), including when settings are absent. Never reopen first-visitor registration on a public site. Only change administrator ownership through an explicitly authorized maintenance workflow.

Record total caliper including adhesive and liner, actual core outside diameter, and measurement date. Admin supports adding, editing, and archiving products. The library is shared across stations; calculations are transient. Refresh or refocus to retrieve product updates. There is no roll tracking in this version.

## Calculation

Length in feet = π × (rollOD² − coreOD²) / (4 × thicknessMil / 1000) / 12, with diameters normalized to inches. Buildup uses rollOD = coreOD + 2 × buildup. Usable footage subtracts an explicit allowance, clamps at zero, and rounds down for job comparisons. A close fit is less than 10% of job footage or 5 ft of margin, whichever is larger. This is a configurable-in-code operational heuristic, not a validated confidence interval. Test against known rolls before relying on estimates for production.

## Development

Node 24+, pnpm 11.25.0. Run `pnpm install`, `pnpm dev`. Local preview uses the starter's loopback-only mock sign-in. Hosted authentication is managed by Sites. Generated schema migrations are in drizzle/ and hosting settings in .openai/hosting.json. Local database and QA products are excluded from source and deployment.

Checks: `node --experimental-strip-types --test tests/calculator.test.ts`, `pnpm exec tsc --noEmit`, then the Sites build helper. See the Sites skill for local database migration, source synchronization, and publishing.

## Verified

Eight calculation/access/validation tests, TypeScript checking, production build. Browser checks: admin setup, product creation, shared-library load, imperial/metric equivalence, buildup equivalence, invalid roll diameter, job fit and close-fit output. Production library starts empty. Manual physical validation remains required.
