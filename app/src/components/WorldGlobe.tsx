import { useEffect, useMemo, useRef } from 'react';
import Globe, { type GlobeInstance } from 'globe.gl';
import { Color, MeshBasicMaterial } from 'three';
import { Minus, Plus } from 'lucide-react';
import type { Target } from '../types';

type Body = 'moon' | 'mars';

/** Global mosaics served from the app's own files. Sources are in SOURCES.md. */
const TEXTURE: Record<Body, { file: string; credit: string }> = {
  moon: { file: 'moon-wac', credit: 'LROC WAC global mosaic, NASA/GSFC/Arizona State University' },
  mars: { file: 'mars-viking', credit: 'Viking MDIM 2.1 colour mosaic, NASA/JPL/USGS' },
};
const BODY_LABEL: Record<Body, string> = { moon: 'Moon', mars: 'Mars' };

interface Props {
  targets: Target[];
  targetId: string;
  /** Selects a target without leaving step 1. */
  onTarget: (id: string) => void;
  /** A marker was clicked: select that target and go on to Earth. */
  onPick: (id: string) => void;
  /** False while another view covers the globe, so it stops drawing. */
  active: boolean;
}

/** Step 1: the Moon or Mars as a globe, with the target sites as markers. */
export function WorldGlobe({ targets, targetId, onTarget, onPick, active }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const target = targets.find((t) => t.id === targetId) ?? targets[0];
  const body: Body = target.body;
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const bodies = (['moon', 'mars'] as const).filter((b) => targets.some((t) => t.body === b));

  useEffect(() => {
    const el = holder.current!;
    const globe = new Globe(el, { animateIn: false, waitForGlobeReady: false })
      .backgroundColor('#0B0D0F')
      .showAtmosphere(false)
      .showGraticules(false)
      // Unlit and a little darker than the mosaic, so the markers are the brightest thing on screen.
      .globeMaterial(new MeshBasicMaterial({ color: new Color(0.78, 0.78, 0.78) }))
      .width(el.clientWidth || 300)
      .height(el.clientHeight || 300)
      .htmlLat('lat')
      .htmlLng('lon')
      .htmlAltitude(0.004)
      .htmlTransitionDuration(0)
      .htmlElement((d: object) => {
        const t = d as Target & { on: boolean };
        const b = document.createElement('button');
        b.type = 'button';
        b.tabIndex = -1; // the target list in the left panel is the keyboard path
        b.className = `tm${t.on ? ' tm-on' : ''}`;
        b.setAttribute('aria-label', `${t.name}: find analogs on Earth`);
        const dot = document.createElement('span');
        dot.className = 'tm-dot';
        const name = document.createElement('span');
        name.className = 'tm-name';
        name.textContent = t.name;
        b.append(dot, name);
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          pickRef.current(t.id);
        });
        return b;
      })
      .htmlElementVisibilityModifier((elm: HTMLElement, visible: boolean) => {
        elm.style.visibility = visible ? 'visible' : 'hidden';
      });
    const controls = globe.controls();
    controls.autoRotate = false;
    controls.enableDamping = !reduced;
    controls.minDistance = 112;
    controls.maxDistance = 600;
    globeRef.current = globe;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) globe.width(el.clientWidth).height(el.clientHeight);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      globe._destructor();
      el.replaceChildren();
      globeRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    const size = window.innerWidth < 768 ? 2048 : 4096;
    globeRef.current?.globeImageUrl(`${import.meta.env.BASE_URL}textures/${TEXTURE[body].file}-${size}.jpg`);
  }, [body]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.htmlElementsData(targets.filter((t) => t.body === body).map((t) => ({ ...t, on: t.id === target.id })));
    // Close enough to tell neighbouring sites apart: the lunar targets are within a few degrees of each other.
    globe.pointOfView({ lat: target.lat, lng: target.lon, altitude: body === 'moon' ? 0.7 : 1.6 }, reduced ? 0 : 900);
  }, [targets, body, target, reduced]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    if (active) {
      globe.resumeAnimation();
      // A flight started while the globe was hidden never ran: put the camera where it belongs.
      globe.pointOfView({ lat: target.lat, lng: target.lon, altitude: body === 'moon' ? 0.7 : 1.6 }, 0);
    } else globe.pauseAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const zoom = (factor: number) => {
    const globe = globeRef.current;
    if (!globe) return;
    const pov = globe.pointOfView();
    globe.pointOfView({ ...pov, altitude: Math.min(5, Math.max(0.15, pov.altitude * factor)) }, reduced ? 0 : 300);
  };

  return (
    <section className="relative h-full min-h-0 w-full overflow-hidden bg-bg" aria-label={`${BODY_LABEL[body]} globe with target sites`}>
      <div ref={holder} className="absolute inset-0" />
      <div className="absolute left-3 top-3 flex border border-line bg-panel" role="group" aria-label="World">
        {bodies.map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={b === body}
            onClick={() => {
              const first = targets.find((t) => t.body === b);
              if (first && b !== body) onTarget(first.id);
            }}
            className={`label min-h-11 border-r border-line px-4 last:border-r-0 ${b === body ? 'bg-bg !text-accent' : '!text-text hover:bg-bg'}`}
          >
            {BODY_LABEL[b]}
          </button>
        ))}
      </div>
      <p className="label pointer-events-none absolute bottom-3 left-3 max-w-[60%] bg-bg px-1.5 py-1 normal-case tracking-normal">{TEXTURE[body].credit}</p>
      <div className="absolute bottom-3 right-3 flex flex-col border border-line bg-panel">
        <button type="button" onClick={() => zoom(0.7)} aria-label="Zoom in" className="flex h-11 w-11 items-center justify-center text-text hover:text-accent">
          <Plus size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => zoom(1.4)} aria-label="Zoom out" className="flex h-11 w-11 items-center justify-center border-t border-line text-text hover:text-accent">
          <Minus size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
