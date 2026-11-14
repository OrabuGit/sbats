import { ArrowLeft } from 'lucide-react';
import type { EarthFile, LithologySimilarity } from '../types';
import {
  FACTORS,
  KEY_INFO,
  MEDIUM_CONFIDENCE_COVERAGE,
  MIN_COVERAGE,
  PRESETS,
  REQUIRED_KEYS,
  SUN_ELEVATION_SIGMA_DEG,
} from '../lib/scoringAdapter';
import { MIN_SEPARATION_CELLS, MIN_SEPARATION_KM, NEW_DISTANCE_KM, separationKm } from '../lib/rank';

interface Props {
  earth: EarthFile;
  lithology: LithologySimilarity;
  listLimit: number;
  onBack: () => void;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-b border-line px-4 py-5 sm:px-6">
      <h3 id={id} className="label mb-2 !text-text">
        {title}
      </h3>
      <div className="max-w-[72ch] space-y-2 text-[14px] text-text">{children}</div>
    </section>
  );
}

function Rule({ name, value, children }: { name: string; value: string; children: React.ReactNode }) {
  return (
    <div className="border border-line bg-bg p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="label !text-text">{name}</span>
        <span className="num text-[18px] font-semibold text-accent">{value}</span>
      </div>
      <p className="mt-1.5 text-[13px] text-text">{children}</p>
    </div>
  );
}

const Formula = ({ children }: { children: React.ReactNode }) => (
  <p className="num overflow-x-auto border-l border-line pl-3 text-[13px] text-text">{children}</p>
);

/** The Method page: how a score is made and how the candidates list is built. Numbers come from the code. */
export function MethodPage({ earth, lithology, listLimit, onBack }: Props) {
  const spacing = separationKm(earth);
  const cellKm = earth.meta.resolutionDeg * 111;
  const required = REQUIRED_KEYS.map((k) => KEY_INFO[k].label).join(' and ');
  return (
    <main className="scroll min-h-0 flex-1 bg-panel" aria-labelledby="h-method">
      <header className="border-b border-line">
        <button
          type="button"
          onClick={onBack}
          className="label flex min-h-11 w-full items-center gap-2 border-b border-line px-4 !text-text hover:!text-accent sm:px-6"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back to the globe
        </button>
        <div className="px-4 py-4 sm:px-6">
          <p className="label">Method</p>
          <h2 id="h-method" className="mt-1 text-[17px] font-semibold text-text">
            How a match score is made, and how the candidates list is built
          </h2>
        </div>
      </header>

      <Section id="m-factors" title="Six factors">
        <p>
          Every Earth cell is compared with the target on six factors. The same factor is measured the same way on Earth, the Moon and
          Mars. Mission presets change the weights only.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="label py-2 pr-3 font-normal">
                  Factor
                </th>
                <th scope="col" className="label py-2 pr-3 font-normal">
                  What it measures
                </th>
                {PRESETS.map((p) => (
                  <th key={p.id} scope="col" className="label w-[92px] py-2 pl-4 text-right font-normal">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FACTORS.map((f) => (
                <tr key={f.id} className="border-b border-line">
                  <th scope="row" className="py-2 pr-3 font-medium text-text">
                    {f.label}
                  </th>
                  <td className="py-2 pr-3 text-muted">{f.measures}</td>
                  {PRESETS.map((p) => (
                    <td key={p.id} className="num py-2 pl-4 text-right text-text">
                      {pct(p.weights[f.id])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-muted">
          A factor with two measurements (Terrain, Temperature) splits its weight equally between them.
        </p>
      </Section>

      <Section id="m-formula" title="Formula">
        <p>Each measurement gets a similarity between 0 and 1, from the gap between the Earth value and the target value:</p>
        <Formula>similarity = exp( −0.5 × ((earth − target) / tolerance)² )</Formula>
        <p>
          Each target value carries its own tolerance. A target value outside anything found on Earth is first
          moved to Earth's nearest limit, and the dossier reports the gap under "What Earth cannot copy".
        </p>
        <p>
          Rock type is a class, not a number, so it uses a lookup table instead: same class{' '}
          <span className="num">{lithology.levels.same.toFixed(2)}</span>, related class{' '}
          <span className="num">{lithology.levels.related.toFixed(2)}</span>, unrelated class{' '}
          <span className="num">{lithology.levels.unrelated.toFixed(2)}</span>.
        </p>
        <p>
          Sunlight is the annual mean noon Sun elevation, computed from latitude and the axial tilt of each body, with a tolerance of{' '}
          <span className="num">{SUN_ELEVATION_SIGMA_DEG}°</span>. It is the one value computed in the browser, and it is tagged
          Computed.
        </p>
        <p>The score is 100 times the weighted geometric mean of the similarities:</p>
        <Formula>score = 100 × exp( Σ weight × ln(similarity) / Σ weight )</Formula>
        <p>One similarity near 0 pulls the whole score near 0. A forest or a wet region cannot be rescued by good terrain.</p>
      </Section>

      <Section id="m-missing" title="Missing data and confidence">
        <p>
          A measurement with no value, on Earth or for the target, is left out and the other weights are scaled up to fill the gap. The
          share of the weight that had data is the coverage.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Rule name="Required" value={required}>
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

      <Section id="m-ranking" title="Candidates list rules">
        <p>
          The list shows the {listLimit} best cells, highest score first. Two rules shape it. Neither changes a score: both act only on
          which cells are listed and how they are tagged.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Rule name="List spacing" value={`${MIN_SEPARATION_KM} km`}>
            A cell is listed only if it is at least this far from every cell ranked above it, so one desert does not fill the list. If
            {' '}{MIN_SEPARATION_CELLS} cell widths is more than that, the spacing is {MIN_SEPARATION_CELLS} cell widths instead. With the current{' '}
            {earth.meta.resolutionDeg}° grid (about {Math.round(cellKm)} km per cell) the spacing in use is {Math.round(spacing)} km.
          </Rule>
          <Rule name="New tag" value={`${NEW_DISTANCE_KM} km`}>
            A site is tagged New when it is farther than this from every known analog site in the literature set. The known sites
            validate the score. The new ones are what this tool is for.
          </Rule>
        </div>
        <p className="text-[13px] text-muted">Distances are great-circle distances between cell centres.</p>
      </Section>

      <Section id="m-never" title="Never part of the score">
        <p>
          Gravity, vacuum and radiation cannot be matched anywhere on Earth. They are never scored. Each dossier lists them under "What
          Earth cannot copy".
        </p>
      </Section>
    </main>
  );
}
