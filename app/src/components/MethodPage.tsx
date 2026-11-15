import type { EarthFile, LithologySimilarity, Target } from '../types';
import {
  FACTORS,
  MEDIUM_CONFIDENCE_COVERAGE,
  DIMENSIONS,
  MIN_COVERAGE,
  PRESETS,
  PURPOSES,
  SUN_ELEVATION_SIGMA_DEG,
} from '../lib/scoringAdapter';
import { MIN_SEPARATION_CELLS, MIN_SEPARATION_KM, NEW_DISTANCE_KM, separationKm } from '../lib/rank';
import { formatValue, keyLabel, metaByKey } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { loadFrozen, loadSources } from '../data/validation';
import { FACTOR_KEYS } from '../types';
import { SourceBadge } from './Badges';
import { DataTable, Formula, Linked, Rule, Section, Td } from './InfoParts';

interface Props {
  earth: EarthFile;
  targets: Target[];
  lithology: LithologySimilarity;
  listLimit: number;
  /** Number of sites in analogs.json. */
  siteCount: number;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** One name per concept. The app uses these words and no others for them. */
const GLOSSARY: [string, string][] = [
  ['Target', 'A place on the Moon or Mars where a base is planned or proposed.'],
  ['Cell', 'One 0.5° square of the Earth grid, about 55 km on a side at the equator. Every score describes a whole cell.'],
  ['Site', 'A named place on Earth from analogs.json: a known analog, a proposed site or a negative control.'],
  ['Proposed site', 'A site put forward by the SBATS team. The six in the data are in Indonesia. Not used in validation.'],
  ['Candidate', 'A cell in the ranked list for the selected target.'],
  ['Factor', 'One of the six things compared: terrain, bare ground, dryness, temperature, sunlight, rock type.'],
  ['Measurement', 'A data value behind a factor, for example mean slope. Terrain and Temperature have two each.'],
  ['Similarity', 'How close one measurement or factor is to the target, from 0 to 1.'],
  ['Match score', 'The similarities combined into one number from 0 to 100.'],
  ['All-round match', 'The match score with all six factors, at the weights of the mission preset.'],
  ['Purpose', 'One use of an analog site, such as rover mobility. A purpose score uses only the factors that use depends on.'],
  ['Analog profile', 'The similarity of a cell on five dimensions, each with its percentile among all Earth cells. No weights and no veto.'],
  ['Coverage', 'The share of the weight that had data, from 0 to 1. It sets the confidence: high, medium or low.'],
  ['Footprint', 'The 2 to 5 km square around a featured site in which its fine-scale values are measured.'],
  ['Readiness', 'GREEN, AMBER or RED: whether a base layout keeps every resource balance at or above zero.'],
  ['Measured, Mission, Literature', 'Where a value comes from: a gridded dataset, a spacecraft or rover, or a paper. Computed marks a value worked out in the browser.'],
];

/** The Method page: how a score is made, with what data, and where it stops being reliable. Numbers come from the code and the data files. */
export function MethodPage({ earth, targets, lithology, listLimit, siteCount }: Props) {
  const spacing = separationKm(earth);
  const cellKm = earth.meta.resolutionDeg * 111;
  const meta = metaByKey(earth);
  const classes = meta.lithology?.classes ?? [];
  const className = (code: number) => classes.find((c) => c.code === code)?.label ?? `class ${code}`;
  const related = lithology.pairs.filter((p) => p.relation === 'related');
  const unrelated = lithology.pairs.filter((p) => p.relation === 'unrelated');
  const frozen = useAsync(loadFrozen, 'frozen');
  const sources = useAsync(loadSources, 'sources');
  const fz = frozen.status === 'ready' ? frozen.value : null;
  const numericKeys = FACTOR_KEYS.filter((k) => k !== 'lithology');
  const noNdvi = earth.cells.filter((c) => c.ndvi === null).length;
  const someIce = earth.cells.filter((c) => c.ndvi !== null && (c.snowIceFrac ?? 0) > 0).length;

  return (
    <>
      <Section id="m-terms" title="Glossary">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          {GLOSSARY.map(([term, meaning]) => (
            <div key={term} className="sm:col-span-2 sm:grid sm:grid-cols-subgrid">
              <dt className="font-medium text-text">{term}</dt>
              <dd className="text-[13px] text-muted">{meaning}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="m-factors" title="Six factors" wide>
        <p className="max-w-[72ch]">
          Every cell is compared with the target on six factors. A factor is measured the same way on Earth, the Moon and Mars. A mission
          preset changes the weights only.
        </p>
        <DataTable caption="Factors and preset weights" headers={['Factor', 'What it measures', ...PRESETS.map((p) => p.label)]} numeric={PRESETS.map((_, i) => i + 2)} minWidth={640}>
          {FACTORS.map((f) => (
            <tr key={f.id} className="border-b border-line">
              <th scope="row" className="py-2 pr-4 font-medium text-text">
                {f.label}
              </th>
              <Td muted>{f.measures}</Td>
              {PRESETS.map((p) => (
                <Td key={p.id} num>
                  {pct(p.weights[f.id])}
                </Td>
              ))}
            </tr>
          ))}
        </DataTable>
        <p className="text-[13px] text-muted">A factor with two measurements (Terrain, Temperature) splits its weight equally between them.</p>
      </Section>

      <Section id="m-formula" title="Formula">
        <p>Each measurement gets a similarity between 0 and 1, from the gap between the Earth value and the target value:</p>
        <Formula>similarity = exp( −0.5 × ((earth − target) / tolerance)² )</Formula>
        <p>
          Each target value carries its own tolerance (table below). A target value outside anything found on Earth is first moved to Earth's
          nearest limit, and the dossier reports the gap under "What Earth cannot copy".
        </p>
        <p>
          Sunlight is the annual mean noon Sun elevation, computed from latitude and the axial tilt of each body, with a tolerance of{' '}
          <span className="num">{SUN_ELEVATION_SIGMA_DEG}°</span>. It is worked out in the browser, not read from a dataset, and is tagged Computed.
        </p>
        <p>The score is 100 times the weighted geometric mean of the similarities:</p>
        <Formula>score = 100 × exp( Σ weight × ln(similarity) / Σ weight )</Formula>
        <p>One similarity near 0 pulls the whole score near 0. This is the veto: good terrain does not offset forest cover or heavy rain.</p>
      </Section>

      <Section id="m-bare" title="Bare ground and permanent ice">
        <p>One rule for every cell. The Bare ground similarity is the share of the cell's ground that is exposed and free of ice.</p>
        <p>Where the cell has an NDVI value, the NDVI match is lowered by the share of the cell under permanent snow and ice:</p>
        <Formula>bare ground = exp( −0.5 × ((ndvi − target) / tolerance)² ) × (1 − ice share)</Formula>
        <p>
          Where the NDVI product has no data (every cell south of 60°S, <span className="num">{noNdvi.toLocaleString('en-US')}</span> cells), the
          measured barren share of the cell is used directly. No stand-in NDVI is invented:
        </p>
        <Formula>bare ground = barren share</Formula>
        <p>
          A cell that is all permanent ice gets 0 either way, so its score is 0. It is scored and ranked, not shown as "no data": ice is not
          regolith. <span className="num">{someIce.toLocaleString('en-US')}</span> cells with NDVI have some permanent ice and are lowered by this
          rule. The dossier says which of the two measurements was used.
        </p>
      </Section>

      <Section id="m-tolerances" title="Target values and tolerances" wide>
        <p className="max-w-[72ch]">
          The value and tolerance used for every target. "No data" means no published value was found: that measurement is left out for the
          target, which lowers confidence.
        </p>
        <DataTable caption="Target values and tolerances" headers={['Target', ...numericKeys.map((k) => keyLabel(k, meta).replace(/ \(.*\)$/, '')), 'Rock class']} minWidth={980}>
          {targets.map((t) => (
            <tr key={t.id} className="border-b border-line">
              <th scope="row" className="py-2 pr-4 align-top font-medium text-text">
                {t.name}
              </th>
              {numericKeys.map((k) => {
                const v = t.values[k];
                return (
                  <td key={k} className="py-2 pr-4 align-top">
                    <span className={`num block text-[12px] ${v.value === null ? 'text-muted' : 'text-text'}`}>{formatValue(k, v.value, meta)}</span>
                    {v.value !== null && (
                      <span className="num block text-[11px] text-muted">± {v.sigma === null ? 'no data' : formatValue(k, v.sigma, meta)}</span>
                    )}
                    <SourceBadge badge={v.badge} source={v.source} />
                  </td>
                );
              })}
              <td className="py-2 pr-4 align-top">
                <span className={`block text-[12px] ${t.values.lithology.value === null ? 'num text-muted' : 'text-text'}`}>
                  {formatValue('lithology', t.values.lithology.value, meta)}
                </span>
                <SourceBadge badge={t.values.lithology.badge} source={t.values.lithology.source} />
              </td>
            </tr>
          ))}
        </DataTable>
        {fz && (
          <p className="max-w-[72ch] text-[13px] text-muted">
            The tolerances were set by rule before any validation run and frozen on <span className="num">{fz.frozenAt}</span>: mean temperature{' '}
            <span className="num">{fz.after.tempMeanSigma} °C</span>, day-night temperature range <span className="num">{fz.after.tempRangeSigma} °C</span>,
            precipitation <span className="num">{fz.after.precipSigma} mm/year</span>, NDVI <span className="num">{fz.after.ndviSigma}</span>, slope
            and roughness <span className="num">{pct(fz.after.terrainFraction)}</span> of the target's own value, sunlight{' '}
            <span className="num">{fz.after.sunSigma}°</span>. The one tuning pass changed <span className="num">{fz.changes.length}</span> of them.
            See the Validation page.
          </p>
        )}
      </Section>

      <Section id="m-rock" title="Rock type lookup table" wide>
        <p className="max-w-[72ch]">
          Rock type is a class, not a number, so it uses a lookup table instead of the formula: same class{' '}
          <span className="num">{lithology.levels.same.toFixed(2)}</span>, related class <span className="num">{lithology.levels.related.toFixed(2)}</span>,
          unrelated class <span className="num">{lithology.levels.unrelated.toFixed(2)}</span>. Unrelated is not zero, so rock type alone never rules
          a site out. Of the <span className="num">{lithology.pairs.length}</span> pairs of different classes,{' '}
          <span className="num">{related.length}</span> are related and <span className="num">{unrelated.length}</span> are unrelated.
        </p>
        {[
          { title: 'Related pairs', list: related, open: true },
          { title: 'Unrelated pairs', list: unrelated, open: false },
        ].map(({ title, list, open }) => (
          <details key={title} open={open} className="border border-line">
            <summary className="label flex min-h-11 cursor-pointer items-center px-3 !text-text hover:bg-bg">
              {title} · {list.length}
            </summary>
            <div className="border-t border-line px-3">
              <DataTable caption={title} headers={['Class', 'Class', 'Why', 'Source']} minWidth={760}>
                {list.map((p) => (
                  <tr key={`${p.a}-${p.b}`} className="border-b border-line last:border-b-0">
                    <Td>{className(p.a)}</Td>
                    <Td>{className(p.b)}</Td>
                    <Td muted>{p.justification}</Td>
                    <Td muted>{p.source ?? 'no source: team judgement'}</Td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </details>
        ))}
      </Section>

      <Section id="m-missing" title="Missing data and confidence">
        <p>
          A measurement with no value, on Earth or for the target, is left out and the other weights are scaled up to fill the gap. The share of
          the weight that had data is the coverage.
        </p>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Rule name="Required" value="Bare ground and Dryness">
            A cell without both has no score, because they carry the veto.
          </Rule>
          <Rule name="Minimum coverage" value={pct(MIN_COVERAGE)}>
            Below this the cell has no score and shows as "no data" with the reason.
          </Rule>
          <Rule name="High confidence" value="100%">
            Every measurement had data.
          </Rule>
          <Rule name="Medium confidence" value={`${pct(MEDIUM_CONFIDENCE_COVERAGE)} or more`}>
            Anything lower is low confidence, and is left out of the candidates list unless you ask for it.
          </Rule>
        </div>
      </Section>

      <Section id="m-purpose" title="Analog profile and match by purpose" wide>
        <p className="max-w-[72ch]">
          The all-round match asks whether a whole base could be rehearsed at a place. Many analog sites are used for one thing only: a
          crater in farmland is a geology site, whatever its climate. The analog profile reports each cell on five dimensions, and match by
          purpose ranks by one use. Neither adds a tuned number: every value is one of the factor similarities above, combined with the frozen
          Base weights.
        </p>
        <DataTable caption="Purposes and the dimensions they use" headers={['Purpose', 'Depends on', 'Why']} minWidth={720}>
          {PURPOSES.map((p) => (
            <tr key={p.id} className="border-b border-line">
              <th scope="row" className="py-2 pr-4 align-top font-medium text-text">
                {p.label}
              </th>
              <Td>{p.dimensions.map((d) => DIMENSIONS.find((x) => x.id === d)?.label ?? d).join(', ')}</Td>
              <Td muted>{p.why}</Td>
            </tr>
          ))}
        </DataTable>
        <p className="max-w-[72ch] text-[13px] text-muted">
          Climate joins Temperature and Dryness. A profile has no veto, no required factor and no minimum coverage. Geology has three possible
          values, so very many cells tie on it. Percentiles count a tie as half, so an average cell sits at 50 whatever the ties, and the dossier
          shows the tied share. The purposes were written down after every known site had been scored, so their rankings are development
          numbers and not evidence.
        </p>
      </Section>

      <Section id="m-ranking" title="Candidates list rules">
        <p>
          The list shows the {listLimit} best cells, highest score first. Two rules shape it. Neither changes a score: both act only on which cells
          are listed and how they are tagged.
        </p>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Rule name="List spacing" value={`${MIN_SEPARATION_KM} km`}>
            A cell is listed only if it is at least this far from every cell ranked above it, so one desert does not fill the list. If{' '}
            {MIN_SEPARATION_CELLS} cell widths is more than that, the spacing is {MIN_SEPARATION_CELLS} cell widths instead. With the current{' '}
            {earth.meta.resolutionDeg}° grid (about {Math.round(cellKm)} km per cell) the spacing in use is {Math.round(spacing)} km.
          </Rule>
          <Rule name="New tag" value={`${NEW_DISTANCE_KM} km`}>
            A cell is tagged New when it is farther than this from every known analog. Known analogs are the validation set. New cells are the
            result.
          </Rule>
        </div>
        <p className="text-[13px] text-muted">Distances are great-circle distances between cell centres.</p>
      </Section>

      <Section id="m-sites" title="Featured sites, best month and terrain">
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Rule name="Footprint" value="2 to 5 km">
            A featured site is measured again inside a small square: slope and roughness on the same 463 m posts as the grid, NDVI from
            Sentinel-2 at 10 m. The site page shows these next to the cell values. The ranking uses the cell values only.
          </Rule>
          <Rule name="Best month" value="12 months">
            The month whose normals are closest to the target on precipitation (as a yearly rate), mean temperature and day-night temperature
            range, by the formula above with the Base weights for Dryness and Temperature. Grid-cell values, not measured at the site.
          </Rule>
          <Rule name="Ground extracts" value="20 km">
            Every extract covers the same 20 km square, north up. Pixel size is 30 m on Earth, 80 m on the Moon and 463 m on Mars, and nothing
            is upsampled. Relief is shaded with one light on all three.
          </Rule>
          <Rule name="3D terrain" value="1 : 1">
            No vertical exaggeration. Heights are measured from each place's own lowest point, because the datums differ. Modules are drawn
            about 50 times larger than life.
          </Rule>
        </div>
      </Section>

      <Section id="m-limits" title="Limits">
        <ul className="space-y-2">
          <li className="border-l-2 border-line pl-3">
            Gravity, vacuum and radiation cannot be matched anywhere on Earth. They are never scored. Each dossier lists them under "What Earth
            cannot copy".
          </li>
          <li className="border-l-2 border-line pl-3">
            The grid is {earth.meta.resolutionDeg}°, about {Math.round(cellKm)} km per cell. A score describes the whole cell. A small site inside a
            different landscape, such as a volcano in a forested cell or an ice-free valley in an ice cell, is scored as its surroundings.
          </li>
          <li className="border-l-2 border-line pl-3">
            Rock class is the single dominant class of the cell on a global map. Outcrops are far smaller than a cell.
          </li>
          <li className="border-l-2 border-line pl-3">
            The Moon and Mars are colder than anywhere on Earth. Target temperatures are moved to Earth's coldest cell before scoring, so the
            temperature match is always better than the real gap. The dossier shows the real value next to the one used.
          </li>
          <li className="border-l-2 border-line pl-3">
            Scores use annual means. Monthly normals exist for the {siteCount} sites in analogs.json only. They feed "Best month to test" and
            never a score.
          </li>
          <li className="border-l-2 border-line pl-3">
            Absolute scores are low and known Moon analogs rank mid-table. The numbers are on the Validation page.
          </li>
          <li className="border-l-2 border-line pl-3">
            The base simulation is a daily balance of power, water, oxygen and food. It has no thermal model, no dust on panels outside a
            storm and no transit. A module with an unsourced number is tagged Illustrative and its effect is left out.
          </li>
        </ul>
      </Section>

      <Section id="m-sources" title="Data sources" wide>
        <p className="max-w-[72ch]">Every row of SOURCES.md, as it stands in this build.</p>
        {sources.status === 'loading' && <p className="label">Loading sources</p>}
        {sources.status === 'error' && <p className="text-muted">The sources table could not be loaded: {sources.message}</p>}
        {sources.status === 'ready' && sources.value === null && <p className="text-muted">No data. The sources table was not published with this build.</p>}
        {sources.status === 'ready' &&
          sources.value?.map((t, i) => (
            <details key={t.title} open={i === 0} className="border border-line">
              <summary className="label flex min-h-11 cursor-pointer items-center px-3 !text-text hover:bg-bg">
                {t.title.replace(/ \(Session .\)$/, '')} · {t.rows.length}
              </summary>
              <div className="border-t border-line px-3">
                <DataTable caption={t.title} headers={t.headers} minWidth={t.headers.length > 4 ? 1100 : 640}>
                  {t.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-line last:border-b-0">
                      {t.headers.map((h, ci) => (
                        <Td key={h} muted={ci > 0}>
                          {h === 'Badge' && row[ci] ? <SourceBadge badge={row[ci] as 'Measured'} /> : <Linked text={row[ci] ?? ''} />}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </DataTable>
              </div>
            </details>
          ))}
      </Section>
    </>
  );
}
