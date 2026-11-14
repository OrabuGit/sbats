// Minimal declarations of the Node built-ins used by the tests in this folder.
// The app's tsconfig loads only "vite/client" types, so without these the test files would not
// type-check and would break `npm run build`. Only named functions are declared, which merge
// cleanly with @types/node if that is ever loaded too. Nothing here is used at run time.

declare module 'node:test' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert/strict' {
  export function ok(value: unknown, message?: string): asserts value;
  export function equal(actual: unknown, expected: unknown, message?: string): void;
  export function notEqual(actual: unknown, expected: unknown, message?: string): void;
  export function deepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function throws(fn: () => unknown, expected?: unknown, message?: string): void;
  export function doesNotThrow(fn: () => unknown, message?: string): void;
}

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: 'utf8'): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
