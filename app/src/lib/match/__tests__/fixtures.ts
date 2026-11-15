// Shared fixtures for the match tests. Made-up numbers, chosen so every branch is easy to read.

import { computeEarthRanges } from '../../scoring/index';
import type { EarthCell, LithologyClass, LithologyTable, Target, TargetValue } from '../../scoring/index';
import type { EarthMetaLike, MineralFamily, SiteEntryLike, TargetMineral } from '../index';

export const val = (value: number | null, sigma: number | null, source = 'target source', badge: TargetValue['badge'] = 'Mission'): TargetValue =>
  value === null ? { value: null, sigma: null, source: null, badge: null, note: 'No published value.' } : { value, sigma, source, badge };

export const TARGET: Target = {
  id: 'mars-test',
  name: 'Test crater',
  body: 'mars',
  lat: 10,
  lon: 20,
  summary: 'A fixture.',
  values: {
    tempMean: val(-60, 15, 'climate model', 'Literature'),
    tempRange: val(50, 5, 'climate model', 'Literature'),
    precip: val(0, 250, 'no rain', 'Literature'),
    ndvi: val(0.05, 0.1, 'bare reference', 'Literature'),
    slope: val(4, 2),
    roughness: val(200, 100),
    lithology: { value: 2, sigma: null, source: 'a paper', badge: 'Literature' },
  },
  cannotCopy: ['Gravity: about one third.', 'Thin atmosphere: 6 mb.', 'Radiation: 0.67 mSv a day.'],
};

export const CLASSES: LithologyClass[] = [
  { code: 1, label: 'Unconsolidated sediments' },
  { code: 2, label: 'Basic volcanic rocks' },
  { code: 10, label: 'Intermediate volcanic rocks' },
];

export const TABLE: LithologyTable = {
  levels: { same: 1, related: 0.6, unrelated: 0.15 },
  pairs: [
    { a: 1, b: 2, relation: 'unrelated', justification: 'x', source: null },
    { a: 2, b: 10, relation: 'related', justification: 'x', source: null },
    { a: 1, b: 10, relation: 'unrelated', justification: 'x', source: null },
  ],
};

export const cell = (over: Partial<EarthCell> = {}): EarthCell => ({
  lat: 12, lon: 30, tempMean: -20, tempRange: 18, precip: 50, ndvi: 0.06, slope: 4.2, roughness: 210, lithology: 2, snowIceFrac: 0, barrenFrac: 0.9, ...over,
});

/** A small "Earth": enough cells to give the ranges a spread. */
export const EARTH: EarthCell[] = [
  cell(),
  cell({ lat: -5, tempMean: 26, tempRange: 6, precip: 2400, ndvi: 0.8, slope: 6, roughness: 500, lithology: 1 }),
  cell({ lat: 70, tempMean: -40, tempRange: 20, precip: 150, ndvi: 0.1, slope: 1, roughness: 40, lithology: 10 }),
  cell({ lat: 40, tempMean: 10, tempRange: 12, precip: 600, ndvi: 0.4, slope: 12, roughness: 900, lithology: 2 }),
];
export const RANGES = computeEarthRanges(EARTH);

export const META: EarthMetaLike = {
  factors: ['tempMean', 'tempRange', 'precip', 'ndvi', 'slope', 'roughness', 'lithology'].map((key) => ({ key, source: `${key} product`, badge: 'Measured' as const })),
  landCover: { source: 'land cover product' },
};

export const FAMILIES: MineralFamily[] = [
  { id: 'hematite', label: 'Hematite', emitPatterns: ['hematite'] },
  { id: 'goethite', label: 'Goethite', emitPatterns: ['goethite'] },
  { id: 'smectite', label: 'Smectite clay', emitPatterns: ['smectite', 'nontronite', 'montmorillonite', 'saponite'] },
  { id: 'carbonate', label: 'Carbonate', emitPatterns: ['carbonate', 'calcite', 'aragonite'] },
  { id: 'plagioclase', label: 'Plagioclase feldspar', emitPatterns: [], note: 'No diagnostic feature in the EMIT range.' },
];

const mineral = (family: string, name: string): TargetMineral => ({ family, name, method: 'in-place', instrument: 'CheMin', abundance: null, source: 'a paper', url: null, badge: 'Mission', access: 'abstract' });
export const TARGET_MINERALS: TargetMineral[] = [mineral('hematite', 'hematite'), mineral('smectite', 'saponite'), mineral('smectite', 'nontronite'), mineral('plagioclase', 'plagioclase'), mineral('carbonate', 'siderite')];

export const SITE: SiteEntryLike = {
  id: 'site-test',
  name: 'Test volcano',
  lat: 12.1,
  lon: 30.1,
  footprintKm: 5,
  footprintNote: 'The crater and its rim.',
  footprintStatus: 'provisional',
  caveat: 'Half the square is outside the lava.',
  values: {
    slope: { value: 9, unit: 'degrees', scale: 'site', source: 'site DEM', badge: 'Measured', windowKm: 5.09, pixels: 121 },
    roughness: { value: 120, unit: 'm', scale: 'site', source: 'site DEM', badge: 'Measured' },
    ndvi: { value: 0.3, unit: '', scale: 'site', source: 'Sentinel-2', badge: 'Measured' },
    bareFrac: { value: 0.28, unit: 'fraction', scale: 'site', source: 'Sentinel-2', badge: 'Measured' },
    rockType: { value: 'Andesite', unit: '', scale: 'volcano', source: 'GVP', badge: 'Literature' },
    lithology: { value: 10, unit: 'class code', scale: 'volcano', source: 'GVP', badge: 'Literature' },
    tempMean: { value: -20, unit: 'C', scale: 'grid', source: 'POWER', badge: 'Measured' },
    tempRange: { value: 18, unit: 'C', scale: 'grid', source: 'POWER', badge: 'Measured' },
    precip: { value: 50, unit: 'mm/year', scale: 'grid', source: 'POWER', badge: 'Measured' },
  },
  mineralogy: {
    value: {
      group1: { identifiedShare: 0.4, top: [
        { libraryName: 'fe3+_hematite.thincoat', libraryTitle: 'Hematite thin film', shareOfValidPixels: 0.12, meanBandDepth: 0.03 },
        { libraryName: 'fe3+_hematite.nano', libraryTitle: 'Nanohematite', shareOfValidPixels: 0.04, meanBandDepth: 0.03 },
        { libraryName: 'fe3+_goethite.thincoat', libraryTitle: 'Goethite thin film', shareOfValidPixels: 0.11, meanBandDepth: 0.03 },
      ] },
      group2: { identifiedShare: 0.8, top: [
        { libraryName: 'organic_vegetation-dry-grass-golden', libraryTitle: 'Dry grass', shareOfValidPixels: 0.6, meanBandDepth: 0.07 },
        { libraryName: 'smectite_nontronite_swelling', libraryTitle: 'Nontronite', shareOfValidPixels: 0.004, meanBandDepth: 0.02 },
        { libraryName: 'sioh_hydrated_basaltic_glass', libraryTitle: 'Hydrated basaltic glass', shareOfValidPixels: 0.03, meanBandDepth: 0.02 },
      ] },
    },
    source: 'NASA EMIT L2B',
    badge: 'Measured',
    date: '2024-10-28',
  },
};
