/**
 * Test stub for the `server-only` package.
 *
 * `import "server-only"` throws outside a React Server Component, which would
 * stop Vitest from importing server modules whose pure logic we want to test.
 * `vitest.config.mts` aliases the package to this empty module.
 */
export {};
