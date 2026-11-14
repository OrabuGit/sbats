// Reference decoder for data/earth.bin (format "SBE1"). Written by the pipeline session for the
// app session to copy; the layout is documented in pipeline/compact.py and data/SCHEMA.md.
// It returns the same { meta, cells } object as data/earth.json. Written with AI assistance.

type Column = { key: string; dtype: "uint8" | "uint16" | "int16"; byteOffset: number; scale?: number; nullValue?: number };
type Header = { format: string; cellCount: number; resolutionDeg: number; meta: unknown; columns: Column[] };
export type EarthCell = { lat: number; lon: number; [key: string]: number | null };

export function decodeEarthBin(buf: ArrayBuffer): { meta: unknown; cells: EarthCell[] } {
  const view = new DataView(buf);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== "SBE1") throw new Error("earth.bin: unknown format " + magic);
  const headerLength = view.getUint32(4, true);
  const header: Header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, headerLength)));
  const n = header.cellCount;
  const res = header.resolutionDeg;
  // DataView reads are little-endian on every platform; typed arrays would depend on the host.
  const read = (c: Column, i: number): number =>
    c.dtype === "uint8" ? view.getUint8(c.byteOffset + i)
    : c.dtype === "uint16" ? view.getUint16(c.byteOffset + 2 * i, true)
    : view.getInt16(c.byteOffset + 2 * i, true);
  const row = header.columns.find((c) => c.key === "row")!;
  const col = header.columns.find((c) => c.key === "col")!;
  const factors = header.columns.filter((c) => c.key !== "row" && c.key !== "col");
  const cells: EarthCell[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const cell: EarthCell = { lat: 90 - res * (read(row, i) + 0.5), lon: -180 + res * (read(col, i) + 0.5) };
    for (const c of factors) {
      const v = read(c, i);
      cell[c.key] = v === c.nullValue ? null : v / (c.scale ?? 1);
    }
    cells[i] = cell;
  }
  return { meta: header.meta, cells };
}
