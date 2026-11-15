// The match record and its parts. Pure TypeScript, no UI and no file or network access. See README.md.

export { MATCH_AT, PARTLY_AT, VERDICT_LABEL, verdictOf, verdictOfScore } from './verdict';
export { earthPlaceFromCell, earthPlaceFromSite, sitePosts, targetAtSiteWindow } from './place';
export type { EarthMetaLike, SiteEntryLike, SiteValueLike, TargetWindowsFile } from './place';
export { DEFAULT_EMIT_MINIMUM_SHARE, emitFamilies, familyOfEmitName, listLabels, sharedMinerals } from './minerals';
export type { EarthMineral, EmitEntry, EmitMineralogy, EmitSummary, MineralFamily, SharedMinerals, TargetMineral, TargetMineralsFile } from './minerals';
export { EXTRA_DIMENSIONS, EXTRA_DIMENSION_IDS, compareExtra, extendedPurposeScore, extraDimension, purposesOfExtra } from './extras';
export type { ExtraDimensionDef } from './extras';
export { CORE_KEYS, buildMatchRecord, sunElevations } from './record';
export type { MatchInput } from './record';
export { buildReport } from './report';
export type { MatchReport, ReportCitation, ReportInput, ReportSection, ReportTable, ReportText, ValidationFigures } from './report';
export type {
  EarthPlace,
  ExtraDimensionId,
  ExtraValue,
  MatchDimension,
  MatchDimensionId,
  MatchPurpose,
  MatchRecord,
  MatchRow,
  MatchSide,
  ValueScale,
  Verdict,
} from './types';
