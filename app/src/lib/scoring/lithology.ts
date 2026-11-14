import type { LithologyClass, LithologyTable } from './types';

/** Thrown when a pair of rock classes is not in data/lithology_similarity.json. Never a silent default. */
export class LithologyPairError extends Error {
  readonly a: number;
  readonly b: number;
  constructor(a: number, b: number) {
    super(
      `Rock classes ${a} and ${b} have no entry in lithology_similarity.json. ` +
        'Every pair of different classes must be listed.',
    );
    this.name = 'LithologyPairError';
    this.a = a;
    this.b = b;
  }
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Rock type similarity from the lookup table (data/SCHEMA.md, "Lithology").
 * Same class: levels.same. Otherwise levels[relation] of the listed pair. The table is symmetric.
 * The three numbers are read from the table, not hard-coded here.
 */
export function lithologySimilarity(cellCode: number, targetCode: number, table: LithologyTable): number {
  if (cellCode === targetCode) return table.levels.same;
  const key = pairKey(cellCode, targetCode);
  for (const p of table.pairs) {
    if (pairKey(p.a, p.b) === key) return table.levels[p.relation];
  }
  throw new LithologyPairError(cellCode, targetCode);
}

/**
 * Builds the lookup from a cell's class code to its similarity with one target class.
 * Used by prepareTarget so that scoring a cell is a single Map read.
 */
export function buildLithologyLookup(targetCode: number, table: LithologyTable): Map<number, number> {
  const lookup = new Map<number, number>();
  lookup.set(targetCode, table.levels.same);
  for (const p of table.pairs) {
    if (p.a === targetCode && p.b !== targetCode) lookup.set(p.b, table.levels[p.relation]);
    else if (p.b === targetCode && p.a !== targetCode) lookup.set(p.a, table.levels[p.relation]);
  }
  return lookup;
}

/**
 * Checks the table against the rules in data/SCHEMA.md. Returns a list of problems, empty when valid.
 * Pass the class legend from earth.json meta.factors to also check that every pair is listed
 * and that no pair uses an unknown code.
 */
export function validateLithologyTable(table: LithologyTable, classes?: readonly LithologyClass[]): string[] {
  const problems: string[] = [];
  const { same, related, unrelated } = table.levels;
  for (const [name, v] of [['same', same], ['related', related], ['unrelated', unrelated]] as const) {
    if (typeof v !== 'number' || !(v > 0 && v <= 1)) {
      problems.push(`levels.${name} must be greater than 0 and at most 1, got ${String(v)}`);
    }
  }
  if (!(same >= related && related >= unrelated)) {
    problems.push('levels must be ordered: same >= related >= unrelated');
  }

  const seen = new Set<string>();
  const codes = classes ? new Set(classes.map((c) => c.code)) : null;
  for (const p of table.pairs) {
    const where = `pair (${p.a}, ${p.b})`;
    if (!Number.isInteger(p.a) || !Number.isInteger(p.b)) problems.push(`${where}: codes must be integers`);
    if (!(p.a < p.b)) problems.push(`${where}: a must be less than b`);
    if (p.relation !== 'related' && p.relation !== 'unrelated') {
      problems.push(`${where}: relation must be "related" or "unrelated"`);
    }
    if (typeof p.justification !== 'string' || p.justification.trim() === '') {
      problems.push(`${where}: justification is empty`);
    }
    const key = pairKey(p.a, p.b);
    if (seen.has(key)) problems.push(`${where}: listed more than once`);
    seen.add(key);
    if (codes && (!codes.has(p.a) || !codes.has(p.b))) {
      problems.push(`${where}: uses a code that is not in the class legend`);
    }
  }

  if (classes) {
    const sorted = [...codes ?? []].sort((x, y) => x - y);
    for (const a of sorted) {
      for (const b of sorted) {
        if (a < b && !seen.has(pairKey(a, b))) problems.push(`pair (${a}, ${b}) is missing`);
      }
    }
  }
  return problems;
}
