import { useEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  CircleGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  TextureLoader,
  WebGLRenderer,
} from "three";
import { formatCoords } from "../lib/geo";
import { WORLD_NAME, WORLD_RADIUS_KM, type WorldId } from "./Worlds";

export interface LocatorPoint {
  world: WorldId;
  lat: number;
  lon: number;
  /** What the pin is: a place name. */
  name: string;
  /** Second line: a country, or the kind of place. */
  where: string | null;
}

const TEXTURE: Record<WorldId, string> = {
  earth: "blue-marble-2048",
  moon: "moon-wac-2048",
  mars: "mars-viking-2048",
};
const AMBER = "#FFB000";

/**
 * Two worlds side by side at their true relative size, each turned so the place is in the middle and
 * marked with a pin. A picture of where the two places are, not a map to read values from.
 */
export function Locator({ points }: { points: [LocatorPoint, LocatorPoint] }) {
  const holder = useRef<HTMLDivElement>(null);
  const reduced = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const key = points.map((p) => `${p.world}:${p.lat}:${p.lon}`).join("|");

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    let alive = true;
    let frame = 0;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true });
    } catch {
      setState("error");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = "absolute inset-0 h-full w-full";
    renderer.domElement.setAttribute("aria-hidden", "true");
    el.prepend(renderer.domElement);
    const scene = new Scene();
    scene.background = new Color("#0B0D0F");
    const camera = new OrthographicCamera(-1, 1, 1, -1, -2000, 2000);
    const sphere = new SphereGeometry(1, 72, 36);
    const ring = new RingGeometry(0.075, 0.1, 40);
    const halo = new RingGeometry(0.1, 0.125, 40);
    const dot = new CircleGeometry(0.03, 24);
    const loader = new TextureLoader();
    let pending = points.length;
    const draw = () => renderer.render(scene, camera);
    const bodies = points.map((p) => {
      const material = new MeshBasicMaterial({
        color: new Color(0.82, 0.82, 0.82),
      });
      loader.load(
        `${import.meta.env.BASE_URL}textures/${TEXTURE[p.world]}.jpg`,
        (tex) => {
          if (!alive) return;
          tex.colorSpace = SRGBColorSpace;
          tex.anisotropy = 4;
          material.map = tex;
          material.needsUpdate = true;
          if (--pending === 0) setState("ready");
          draw();
        },
        undefined,
        () => alive && setState("error"),
      );
      const mesh = new Mesh(sphere, material);
      // Bring the place to the middle of the disc, north up: turn about the polar axis, then tilt.
      const lat = (p.lat * Math.PI) / 180;
      const lon = (p.lon * Math.PI) / 180;
      const x = Math.cos(lon) * Math.cos(lat);
      const z = -Math.sin(lon) * Math.cos(lat);
      mesh.rotation.set(lat, Math.atan2(-x, z), 0, "XYZ");
      scene.add(mesh);
      // The pin sits on the near side, in the middle: a dark halo for contrast, an amber ring and a dot.
      const dark = new MeshBasicMaterial({
        color: "#0B0D0F",
        side: DoubleSide,
      });
      const amber = new MeshBasicMaterial({ color: AMBER, side: DoubleSide });
      const pin = [
        new Mesh(halo, dark),
        new Mesh(ring, amber),
        new Mesh(dot, amber),
      ];
      pin.forEach((m) => {
        m.position.z = 1.01;
        scene.add(m);
      });
      return { mesh, material, dark, amber, pin };
    });

    const largest = Math.max(...points.map((p) => WORLD_RADIUS_KM[p.world]));
    const layout = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      const col = w / points.length;
      const big = Math.min(h * 0.42, col * 0.46);
      bodies.forEach((b, i) => {
        const r = (big * WORLD_RADIUS_KM[points[i].world]) / largest;
        b.mesh.scale.setScalar(r);
        b.mesh.position.set(-w / 2 + col * (i + 0.5), h * 0.08, 0);
        // The pin is the same size on every world, about 9 px across at most, smaller on a small world.
        b.pin.forEach((m) => {
          m.scale.setScalar(Math.min(80, r * 2.8));
          m.position.set(b.mesh.position.x, b.mesh.position.y, r * 1.01);
        });
      });
    };
    const ro = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro.observe(el);
    layout();
    // A slow turn about the place, to show it is a sphere. The pin stays put.
    const base = bodies.map((b) => b.mesh.rotation.y);
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      bodies.forEach((b, i) => {
        b.mesh.rotation.y = base[i] + Math.sin(now / 2000 + i) * 0.12;
      });
      draw();
    };
    if (!reduced) frame = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      sphere.dispose();
      ring.dispose();
      halo.dispose();
      dot.dispose();
      bodies.forEach((b) => {
        b.material.map?.dispose();
        b.material.dispose();
        b.dark.dispose();
        b.amber.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);

  return (
    <figure className="m-0">
      <div
        ref={holder}
        className="relative h-[300px] w-full bg-bg sm:h-[340px]"
        role="img"
        aria-label={`${points[0].name} on ${WORLD_NAME[points[0].world]} and ${points[1].name} on ${WORLD_NAME[points[1].world]}, each marked with a pin`}
      >
        {state !== "ready" && (
          <p
            className="absolute left-0 top-0 text-[12px] text-muted"
            role="status"
          >
            {state === "loading"
              ? "Loading globes"
              : "Globes could not be drawn"}
          </p>
        )}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-2">
          {points.map((p) => (
            <div key={p.world + p.name} className="min-w-0 px-1 text-center">
              <p className="truncate text-[14px] font-medium text-text">
                {p.name}
              </p>
              <p className="truncate text-[12px] text-muted">
                {WORLD_NAME[p.world]}
                {p.where ? `, ${p.where}` : ""}
              </p>
              <p className="num truncate text-[11px] text-muted">
                {formatCoords(p.lat, p.lon)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}
