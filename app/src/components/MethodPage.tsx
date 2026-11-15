import type { EarthFile, LithologySimilarity, Target } from '../types';
import { DIMENSIONS, PURPOSES, SUN_ELEVATION_SIGMA_DEG } from '../lib/scoringAdapter';
import { MIN_SEPARATION_CELLS, MIN_SEPARATION_KM, NEW_DISTANCE_KM, separationKm } from '../lib/rank';
import { formatValue, keyLabel, metaByKey } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { loadFrozen, loadSources } from '../data/validation';
import { FACTOR_KEYS } from '../types';
import { ComputedBadge, SourceBadge } from './Badges';
import { DataTable, Linked, Td } from './InfoParts';
import { MethodBars } from './MethodBars';
import { MethodCannotCopy } from './MethodCannotCopy';
import { MethodCoverage } from './MethodCoverage';
import { MethodFlow } from './MethodFlow';
import { MethodCurve, type Tolerance } from './MethodCurve';
import { MethodHoldout } from './MethodHoldout';
import { MethodMean } from './MethodMean';
import { MethodPipeline } from './MethodPipeline';
import { MethodWeights } from './MethodWeights';
import { MDetails, MFormula, MRule, MSection, WIDTH, pct } from './MethodParts';

interface Props {
  earth: EarthFile;
  targets: Target[];
  lithology: LithologySimilarity;
  listLimit: number;
  /** Number of sites in analogs.json. */
  siteCount: number;
}

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
  ['Verdict', 'A similarity read as matches (0.75 or more), partly (0.30 to 0.75) or does not match (below 0.30). A display rule: it changes no number.'],
  ['Stability', 'How far a rank moves when every weight is redrawn within 25% of its value, 200 times.'],
  ['Coverage', 'The share of the weight that had data, from 0 to 1. It sets the confidence: high, medium or low.'],
  ['Footprint', 'The 2 to 5 km square around a featured site in which its fine-scale values are measured.'],
  ['Readiness', 'GREEN, AMBER or RED: whether a base layout keeps every resource balance at or above zero.'],
  ['Measured, Mission, Literature', 'Where a value comes from: a gridded dataset, a spacecraft or rover, or a paper. Computed marks a value worked out in the browser.'],
];

const P = 'max-w-[62ch] text-[14px] leading-6 text-text';
const PM = 'max-w-[62ch] text-[13px] leading-5 text-muted';

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
  const nCells = earth.cells.length;

  // Tolerances for the curve: the frozen values, read from the file. None is typed here.
  const tolerances: Tolerance[] = fz
    ? [
        { id: 'tempMean', label: 'Mean temperature', unit: '°C', sigma: fz.after.tempMeanSigma },
        { id: 'tempRange', label: 'Day-night range', unit: '°C', sigma: fz.after.tempRangeSigma },
        { id: 'precip', label: 'Precipitation', unit: 'mm/year', sigma: fz.after.precipSigma },
        { id: 'ndvi', label: 'Vegetation (NDVI)', unit: 'NDVI', sigma: fz.after.ndviSigma },
        { id: 'sun', label: 'Noon Sun elevation', unit: '°', sigma: fz.after.sunSigma },
      ]
    : [];

  return (
    <div className="bg-bg">
      <MethodFlow earth={earth} targets={targets} lithology={lithology} />

      <MSection
        id="m-pipeline"
        kicker="All the steps"
        title="From datasets to one score"
        lead="Every Earth cell is compared with the target on six factors, measured the same way on Earth, the Moon and Mars."
      >
        <MethodPipeline earth={earth} />
      </MSection>

      <MSection id="m-data" kicker="1 · Data" title="Data in this build">
        <p className={P}>
          The Earth grid is <span className="num">{earth.meta.resolutionDeg}°</span>, about <span className="num">{Math.round(cellKm)} km</span> per cell
          at the equator, with <span className="num">{nCells.toLocaleString('en-US')}</span> land cells. It was built on{' '}
          <span className="num">{String(earth.meta.generatedAt).slice(0, 10)}</span>. The period of each dataset is part of its source line.
        </p>
        <div className="mt-6">
          <MDetails title="Earth measurements and their sources" count={earth.meta.factors.length + (earth.meta.landCover ? 1 : 0)}>
            <DataTable caption="Earth measurements and their sources" headers={['Measurement', 'Unit', 'Source and period', 'Badge']} minWidth={760}>
              {earth.meta.factors.map((f) => (
                <tr key={f.key} className="border-b border-line">
                  <Td>{keyLabel(f.key, meta)}</Td>
                  <Td muted>{f.unit === '' ? 'none' : f.unit}</Td>
                  <Td muted>{f.source}</Td>
                  <Td>
                    <SourceBadge badge={f.badge} source={f.source} />
                  </Td>
                </tr>
              ))}
              {earth.meta.landCover && (
                <tr className="border-b border-line">
                  <Td>Permanent ice and barren shares</Td>
                  <Td muted>share, 0 to 1</Td>
                  <Td muted>{earth.meta.landCover.source}</Td>
                  <Td>
                    <SourceBadge badge="Measured" source={earth.meta.landCover.source} />
                  </Td>
                </tr>
              )}
            </DataTable>
          </MDetails>
        </div>
      </MSection>

      <MSection
        id="m-factors"
        kicker="2 · Factors and weights"
        title="Six factors, four sets of weights"
        lead="A mission preset changes the weights and nothing else."
      >
        <MethodWeights />
        <p className={`${PM} mt-8`}>A factor with two measurements (Terrain, Temperature) splits its weight equally between them.</p>
      </MSection>

      <MSection
        id="m-formula"
        kicker="3 · Similarity"
        title="Close to the target scores near 1"
        lead="The gap between the Earth value and the target value, in tolerances, becomes a similarity from 0 to 1."
      >
        <MFormula>similarity = exp( −0.5 × ((earth − target) / tolerance)² )</MFormula>
        <div className="mt-8">
          <MethodCurve tolerances={tolerances} />
        </div>
        <div className="mt-8 space-y-3">
          <p className={P}>
            Each target value carries its own tolerance (table below). A target value outside anything found on Earth is first moved to Earth's
            nearest limit, and the dossier reports the gap under "What Earth cannot copy".
          </p>
          <p className={P}>
            Sunlight is the annual mean noon Sun elevation, computed from latitude and the axial tilt of each body, with a tolerance of{' '}
            <span className="num">{SUN_ELEVATION_SIGMA_DEG}°</span>. It is worked out in the browser, not read from a dataset, and is tagged{' '}
            <ComputedBadge />.
          </p>
        </div>
      </MSection>

      <MSection
        id="m-rock"
        kicker="3 · Similarity, rock type"
        title="Rock type uses a lookup, not a curve"
        lead="Rock type is a class, so it uses a lookup table."
      >
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <MethodBars
            label="Similarity by relation between rock classes"
            items={[
              { label: 'Same class', share: lithology.levels.same, text: lithology.levels.same.toFixed(2) },
              { label: 'Related class', share: lithology.levels.related, text: lithology.levels.related.toFixed(2), note: `${related.length} pairs` },
              { label: 'Unrelated class', share: lithology.levels.unrelated, text: lithology.levels.unrelated.toFixed(2), note: `${unrelated.length} pairs` },
            ]}
          />
          <p className={`${P} self-center`}>
            Unrelated is not zero, so rock type alone never rules a site out. Of the <span className="num">{lithology.pairs.length}</span> pairs of
            different classes, <span className="num">{related.length}</span> are related and <span className="num">{unrelated.length}</span> are
            unrelated.
          </p>
        </div>
        <div className="mt-10">
          {[
            { title: 'Related pairs', list: related, open: false },
            { title: 'Unrelated pairs', list: unrelated, open: false },
          ].map(({ title, list, open }) => (
            <MDetails key={title} title={title} count={list.length} open={open}>
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
            </MDetails>
          ))}
        </div>
      </MSection>

      <MSection
        id="m-bare"
        kicker="3 · Similarity, bare ground"
        title="Bare ground and permanent ice"
        lead="Bare ground is how much of a cell is exposed and free of ice."
      >
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-4">
            <p className={P}>Where the cell has an NDVI value, the NDVI match is lowered by the share of the cell under permanent snow and ice:</p>
            <MFormula>bare ground = exp( −0.5 × ((ndvi − target) / tolerance)² ) × (1 − ice share)</MFormula>
            <p className={P}>
              Where the NDVI product has no data (every cell south of 60°S), the measured barren share of the cell is used directly. No stand-in
              NDVI is invented:
            </p>
            <MFormula>bare ground = barren share</MFormula>
          </div>
          <div className="space-y-6">
            <MethodBars
              label="Cells affected by the bare ground rule"
              items={[
                { label: 'Land cells', share: 1, text: nCells.toLocaleString('en-US') },
                { label: 'No NDVI: barren share used', share: nCells ? noNdvi / nCells : 0, text: noNdvi.toLocaleString('en-US') },
                { label: 'NDVI and some permanent ice: lowered', share: nCells ? someIce / nCells : 0, text: someIce.toLocaleString('en-US') },
              ]}
            />
            <p className={PM}>
              A cell that is all permanent ice gets 0 either way, so its score is 0. It is scored and ranked, not shown as "no data": ice is not
              regolith. The dossier says which of the two measurements was used.
            </p>
          </div>
        </div>
      </MSection>

      <MSection
        id="m-score"
        kicker="4 · Match score"
        title="One bad factor drags the score down"
        lead="The score is 100 times the weighted geometric mean of the similarities."
      >
        <MFormula>score = 100 × exp( Σ weight × ln(similarity) / Σ weight )</MFormula>
        <div className="mt-8">
          <MethodMean />
        </div>
        <p className={`${P} mt-8`}>One similarity near 0 pulls the whole score near 0. This is the veto: good terrain does not offset forest cover or heavy rain.</p>
      </MSection>

      <MSection
        id="m-missing"
        kicker="5 · Confidence"
        title="Missing data and confidence"
        lead="A measurement with no value is left out and the other weights scale up. The share of weight with data is the coverage."
      >
        <MethodCoverage />
      </MSection>

      <MSection
        id="m-cannot"
        kicker="Outside the score"
        title="What Earth cannot copy"
        lead="No place on Earth can match gravity, vacuum or radiation. They are never scored."
      >
        <MethodCannotCopy targets={targets} />
      </MSection>

      <MSection
        id="m-validation"
        kicker="6 · Does it work"
        title="Known sites against a hold-out set"
        lead="The hold-out sites were never used to set a tolerance or a weight."
      >
        <MethodHoldout />
        <p className={`${PM} mt-8`}>
          The hold-out set is small, so read it as a check, not a precise estimate. All numbers, including the weak ones, are on the Validation page.
        </p>
      </MSection>

      <MSection
        id="m-tolerances"
        kicker="Reference · Targets"
        title="Target values and tolerances"
        lead={'The value and tolerance used for every target. "No data" means no published value was found: that measurement is left out for the target, which lowers confidence.'}
      >
        {fz && (
          <p className={`${PM} mb-6`}>
            The tolerances were set by rule before any validation run and frozen on <span className="num">{fz.frozenAt}</span>: mean temperature{' '}
            <span className="num">{fz.after.tempMeanSigma} °C</span>, day-night temperature range <span className="num">{fz.after.tempRangeSigma} °C</span>,
            precipitation <span className="num">{fz.after.precipSigma} mm/year</span>, NDVI <span className="num">{fz.after.ndviSigma}</span>, slope and
            roughness <span className="num">{pct(fz.after.terrainFraction)}</span> of the target's own value, sunlight{' '}
            <span className="num">{fz.after.sunSigma}°</span>. The one tuning pass changed <span className="num">{fz.changes.length}</span> of them. See the
            Validation page.
          </p>
        )}
        <MDetails title="Value and tolerance for every target" count={targets.length}>
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
        </MDetails>
      </MSection>

      <MSection
        id="m-purpose"
        kicker="Reference · Purposes"
        title="Analog profile and match by purpose"
        lead="Many analog sites serve one use only: a crater in farmland is a geology site, whatever its climate."
      >
        <p className={P}>
          The analog profile reports each cell on five dimensions, and match by purpose ranks by one use. Neither adds a tuned number: every value is
          one of the factor similarities above, combined with the frozen Base weights.
        </p>
        <div className="mt-6">
          <MDetails title="Purposes and the dimensions they use" count={PURPOSES.length}>
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
          </MDetails>
        </div>
        <p className={`${PM} mt-6`}>
          Climate joins Temperature and Dryness. A profile has no veto, no required factor and no minimum coverage. Geology has three possible values,
          so very many cells tie on it. Percentiles count a tie as half, so an average cell sits at 50 whatever the ties, and the dossier shows the tied
          share. The purposes were written down after every known site had been scored, so their rankings are development numbers and not evidence.
        </p>
      </MSection>

      <MSection
        id="m-ranking"
        kicker="Reading the results"
        title="Candidates list rules"
        lead={`The list shows the ${listLimit} best cells, highest score first. Neither rule changes a score: both act only on which cells are listed and how they are tagged.`}
      >
        <div className="grid gap-x-8 gap-y-8 md:grid-cols-2">
          <MRule name="List spacing" value={`${MIN_SEPARATION_KM} km`}>
            A cell is listed only if it is at least this far from every cell ranked above it, so one desert does not fill the list. If{' '}
            {MIN_SEPARATION_CELLS} cell widths is more than that, the spacing is {MIN_SEPARATION_CELLS} cell widths instead. With the current{' '}
            {earth.meta.resolutionDeg}° grid (about {Math.round(cellKm)} km per cell) the spacing in use is {Math.round(spacing)} km.
          </MRule>
          <MRule name="New tag" value={`${NEW_DISTANCE_KM} km`}>
            A cell is tagged New when it is farther than this from every known analog. Known analogs are the validation set. New cells are the result.
          </MRule>
        </div>
        <p className={`${PM} mt-6`}>Distances are great-circle distances between cell centres.</p>
      </MSection>

      <MSection id="m-sites" kicker="Reading the results" title="Featured sites, verdicts, stability, routes and terrain">
        <div className="grid gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          <MRule name="Footprint" value="2 to 5 km">
            A featured site is measured again inside a small square: slope and roughness on the same 463 m posts as the grid, NDVI from Sentinel-2 at
            10 m. The site page shows these next to the cell values. The ranking uses the cell values only.
          </MRule>
          <MRule name="Best month" value="12 months">
            The month whose normals are closest to the target on precipitation (as a yearly rate), mean temperature and day-night temperature range, by
            the formula above with the Base weights for Dryness and Temperature. Grid-cell values, not measured at the site.
          </MRule>
          <MRule name="Ground extracts" value="20 km">
            Every extract covers the same 20 km square, north up. Pixel size differs by world (30 m on Earth, 20 to 60 m on the Moon, 200 m on Mars) and
            is printed under each picture, and nothing is upsampled. Relief is shaded with one light on all three.
          </MRule>
          <MRule name="Verdict" value="0.75 and 0.30">
            A similarity of 0.75 or more reads "matches", 0.30 to 0.75 "partly", below 0.30 "does not match". The cut-offs put the same, related and
            unrelated rock class on the three verdicts. They are a display rule.
          </MRule>
          <MRule name="Stability" value="200 redraws">
            Each weight is multiplied by a random factor between 0.75 and 1.25, the weights are renormalised and every cell is scored again, 200 times
            with a fixed seed. The app reports how much of the top 10 survives and where a cell's rank falls in nine redraws of ten. No redraw is kept:
            the frozen weights are read, never changed.
          </MRule>
          <MRule name="Route" value="pixel size">
            A route is straight legs between waypoints, sampled at the pixel size of the elevation grid (30 m on Earth, 20 to 60 m on the Moon, 200 m on
            Mars). Slope is measured over that distance, so a coarser grid hides short steep steps and routes on grids of different pixel size must not be
            compared by slope. No driving time or energy is shown.
          </MRule>
          <MRule name="3D terrain" value="1 : 1">
            No vertical exaggeration. Heights are measured from each place's own lowest point, because the datums differ. Modules are drawn about 50
            times larger than life.
          </MRule>
        </div>
      </MSection>

      <MSection id="m-limits" kicker="Honest limits" title="Where it stops being reliable">
        <p className="mb-6 max-w-[70ch] border-t border-line pt-4 text-[14px] leading-6 text-text">
          <span className="label mr-2">Known gap</span>
          We hold no global dataset of caves, lava tubes or other underground environments. The tool cannot find them; where a site&apos;s own story or a
          cited source records a cave, it is noted on that site&apos;s page.
        </p>
        <ul className="grid gap-x-12 md:grid-cols-2">
          {[
            `Gravity, vacuum and radiation cannot be matched anywhere on Earth. They are never scored. Each dossier lists them under "What Earth cannot copy".`,
            `The grid is ${earth.meta.resolutionDeg}°, about ${Math.round(cellKm)} km per cell. A score describes the whole cell. A small site inside a different landscape, such as a volcano in a forested cell or an ice-free valley in an ice cell, is scored as its surroundings.`,
            'Rock class is the single dominant class of the cell on a global map. Outcrops are far smaller than a cell.',
            "The Moon and Mars are colder than anywhere on Earth. Target temperatures are moved to Earth's coldest cell before scoring, so the temperature match is always better than the real gap. The dossier shows the real value next to the one used.",
            `Scores use annual means. Monthly normals exist for the ${siteCount} sites in analogs.json only. They feed "Best month to test" and never a score.`,
            'Absolute scores are low and known Moon analogs rank mid-table. The numbers are on the Validation page.',
            'Atacama, Antarctica, Iceland, Hawaii, Mojave, Death Valley and Haughton are the seven well-known analog places. The tool treats them as known, and its job is to find places beyond them. Our data holds footprint-scale values for some of them only.',
            'The base simulation is a daily balance of power, water, oxygen and food. It has no thermal model, no dust on panels outside a storm and no transit. A module with an unsourced number is tagged Illustrative and its effect is left out.',
          ].map((t) => (
            <li key={t} className="border-t border-line py-4 text-[14px] leading-6 text-text">
              {t}
            </li>
          ))}
        </ul>
      </MSection>

      <section aria-labelledby="m-reference" className="border-t border-line px-4 py-12 sm:px-6 sm:py-16">
        <div className={WIDTH}>
          <p className="label">Reference</p>
          <h3 id="m-reference" className="display-l mt-2 text-[28px] text-text sm:text-[38px]">
            Words and sources
          </h3>
          <div className="mt-8">
            <MDetails title="Glossary" count={GLOSSARY.length} id="m-terms">
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[max-content_1fr]">
                {GLOSSARY.map(([term, meaning]) => (
                  <div key={term} className="sm:col-span-2 sm:grid sm:grid-cols-subgrid">
                    <dt className="font-medium text-text">{term}</dt>
                    <dd className="text-[13px] leading-5 text-muted">{meaning}</dd>
                  </div>
                ))}
              </dl>
            </MDetails>
            <div id="m-sources">
              <p className={`${PM} mb-2 mt-6`}>Data sources: every row of SOURCES.md, as it stands in this build.</p>
              {sources.status === 'loading' && <p className="label">Loading sources</p>}
              {sources.status === 'error' && <p className="text-muted">The sources table could not be loaded: {sources.message}</p>}
              {sources.status === 'ready' && sources.value === null && <p className="text-muted">No data. The sources table was not published with this build.</p>}
              {sources.status === 'ready' &&
                sources.value?.map((t) => (
                  <MDetails key={t.title} title={t.title.replace(/ \(Session .\)$/, '')} count={t.rows.length}>
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
                  </MDetails>
                ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
