// Test stand-in for the `server-only` package, which throws when imported
// outside a React Server Components build. Vitest runs in plain Node, where the
// modules under test are, in fact, server-only.
export {};
