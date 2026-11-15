// Extra declarations of Node built-ins used by the tests in this folder (see the note in
// app/src/lib/scoring/__tests__/node-shims.d.ts). Reading a file without an encoding returns bytes.

declare module 'node:fs' {
  export function readFileSync(path: string): { buffer: ArrayBuffer; byteOffset: number; byteLength: number };
}
