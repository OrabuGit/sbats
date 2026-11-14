import { describe, it } from 'node:test';
import { deepEqual, equal, ok, throws } from 'node:assert/strict';
import { LithologyPairError, lithologySimilarity, validateLithologyTable } from '../lithology';
import { prepareTarget, scoreCell } from '../score';
import type { LithologyTable } from '../types';
import { BASE, CLASSES, makeCell, makeTarget, near, productScore, sunSimilarity, TABLE, WIDE_RANGES } from './fixtures';

describe('Lithology similarity table', () => {
  it('gives 1.0 for the same class, 0.6 for related and 0.15 for unrelated', () => {
    equal(lithologySimilarity(1, 1, TABLE), 1.0);
    equal(lithologySimilarity(2, 1, TABLE), 0.6);
    equal(lithologySimilarity(3, 1, TABLE), 0.15);
  });

  it('is symmetric', () => {
    equal(lithologySimilarity(1, 2, TABLE), lithologySimilarity(2, 1, TABLE));
    equal(lithologySimilarity(3, 2, TABLE), lithologySimilarity(2, 3, TABLE));
  });

  it('reads the three levels from the table instead of hard-coding them', () => {
    const other: LithologyTable = { ...TABLE, levels: { same: 0.9, related: 0.5, unrelated: 0.1 } };
    equal(lithologySimilarity(1, 1, other), 0.9);
    equal(lithologySimilarity(1, 2, other), 0.5);
    equal(lithologySimilarity(1, 3, other), 0.1);
  });

  it('throws for a pair that is not listed, never a silent default', () => {
    throws(() => lithologySimilarity(1, 9, TABLE), LithologyPairError);
    const incomplete: LithologyTable = { ...TABLE, pairs: TABLE.pairs.slice(0, 2) };
    throws(() => lithologySimilarity(2, 3, incomplete), LithologyPairError);
  });
});

describe('Lithology table validation', () => {
  it('accepts a complete table', () => {
    deepEqual(validateLithologyTable(TABLE, CLASSES), []);
  });

  it('reports every pair of legend classes that is missing', () => {
    const incomplete: LithologyTable = { ...TABLE, pairs: TABLE.pairs.slice(0, 1) };
    deepEqual(validateLithologyTable(incomplete, CLASSES), ['pair (1, 3) is missing', 'pair (2, 3) is missing']);
  });

  it('reports a pair with a not less than b, a duplicate, and a code outside the legend', () => {
    const [first] = TABLE.pairs;
    ok(first);
    const bad: LithologyTable = {
      ...TABLE,
      pairs: [...TABLE.pairs, { ...first, a: 2, b: 1 }, { ...first, a: 1, b: 7 }],
    };
    const problems = validateLithologyTable(bad, CLASSES);
    ok(problems.some((p) => p.includes('(2, 1)') && p.includes('a must be less than b')));
    ok(problems.some((p) => p.includes('(2, 1)') && p.includes('more than once')));
    ok(problems.some((p) => p.includes('(1, 7)') && p.includes('not in the class legend')));
  });

  it('reports an empty justification, a bad relation and levels out of range', () => {
    const [first] = TABLE.pairs;
    ok(first);
    const bad = {
      levels: { same: 1, related: 0, unrelated: 0.15 },
      pairs: [{ ...first, justification: ' ' }, { a: 1, b: 3, relation: 'similar', justification: 'x', source: null }],
    } as unknown as LithologyTable;
    const problems = validateLithologyTable(bad);
    ok(problems.some((p) => p.includes('levels.related')));
    ok(problems.some((p) => p.includes('justification is empty')));
    ok(problems.some((p) => p.includes('relation must be')));
  });

  it('requires unrelated to stay above zero so rock type can never veto', () => {
    const zero: LithologyTable = { ...TABLE, levels: { same: 1, related: 0.6, unrelated: 0 } };
    ok(validateLithologyTable(zero).some((p) => p.includes('levels.unrelated')));
  });
});

describe('Rock type inside the score', () => {
  const target = makeTarget();
  const prepared = prepareTarget(target, WIDE_RANGES, TABLE);
  const sun = sunSimilarity(makeCell().lat, target);

  it('uses the table value as the Rock type similarity', () => {
    for (const [code, expected] of [[1, 1.0], [2, 0.6], [3, 0.15]] as const) {
      const result = scoreCell(makeCell({ lithology: code }), prepared, BASE);
      const rock = result.breakdown.find((f) => f.factor === 'rockType');
      ok(rock);
      ok(near(rock.similarity, expected));
      ok(near(result.score, productScore([{ s: sun, w: 0.1 }, { s: expected, w: 0.15 }, { s: 1, w: 0.75 }])));
    }
  });

  it('cannot veto a site on its own: an unrelated rock still leaves about 75 of 100', () => {
    const result = scoreCell(makeCell({ lithology: 3 }), prepared, { ...BASE, sunlight: 0 });
    // 0.15 ^ (0.15 / 0.9) with Sunlight switched off
    ok(near(result.score, 100 * 0.15 ** (0.15 / 0.9)));
    ok((result.score ?? 0) > 70);
  });

  it('throws when a cell carries a class code the table does not cover', () => {
    throws(() => scoreCell(makeCell({ lithology: 42 }), prepared, BASE), LithologyPairError);
  });

  it('leaves Rock type out when no table is given, and says so', () => {
    const noTable = prepareTarget(target, WIDE_RANGES, null);
    ok(noTable.missingTargetKeys.includes('lithology'));
    ok(noTable.warnings.some((w) => w.includes('lithology')));
    const result = scoreCell(makeCell(), noTable, BASE);
    deepEqual(result.missing, ['lithology']);
    equal(result.coverage, 0.85);
    equal(result.confidence, 'medium');
  });
});
