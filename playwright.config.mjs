// The pipeline's real Playwright config lives at qa-pipeline/playwright/playwright.config.js
// (see pipeline/README.md — kept nested rather than at the repo root because this repo's root
// is a Next.js app, not a test project). This re-export exists solely because the
// playwright-test MCP server's run-test-mcp-server (specifically the internal "test-server"
// child process it spawns) has a path-relativization bug when given an explicit --config
// pointing at a nested file: it re-derives the config path against the wrong base directory
// and ends up looking for a doubled, nonexistent path
// (urgent-printers-frontend/urgent-printers-frontend/...). Default config discovery at the
// repo root (what this file provides) sidesteps that bug entirely — see pipeline/README.md's
// "Known infra findings" for the full diagnosis.
//
// .mjs (not .js) so this resolves as an ES module regardless of this repo's own
// package.json — which has no "type": "module", since it's a Next.js app, not this file.
export { default } from './qa-pipeline/playwright/playwright.config.js';
