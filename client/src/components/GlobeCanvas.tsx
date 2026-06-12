<<<<<<< HEAD
import { useEffect, useRef } from "react";
=======
import { useEffect, useRef, useState } from "react";
>>>>>>> 68ae3a8 (feat(azure): complete cloud infra, DevOps, globe continent mapping)

interface GlobeCanvasProps {
  size?: number;
}

<<<<<<< HEAD
=======
type Position = number[]; // [lon, lat]
type Ring = Position[];

interface GlobeData {
  rings: Ring[];
}

>>>>>>> 68ae3a8 (feat(azure): complete cloud infra, DevOps, globe continent mapping)
export default function GlobeCanvas({ size = 700 }: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const rotRef = useRef(0);
<<<<<<< HEAD
=======
  const [globeData, setGlobeData] = useState<GlobeData>({ rings: [] });

  // Load world.geojson at runtime to avoid static-import parse issues
  useEffect(() => {
    fetch("/world.geojson")
      .then((r) => r.json())
      .then((geo) => {
        const rings: Ring[] = [];
        for (const feature of geo.features || []) {
          const g = feature.geometry;
          if (!g) continue;
          if (g.type === "Polygon") {
            for (const ring of g.coordinates) rings.push(ring);
          } else if (g.type === "MultiPolygon") {
            for (const poly of g.coordinates)
              for (const ring of poly) rings.push(ring);
          }
        }
        setGlobeData({ rings });
      })
      .catch(() => {
        // Globe gracefully falls back to grid-only if GeoJSON fails
      });
  }, []);
>>>>>>> 68ae3a8 (feat(azure): complete cloud infra, DevOps, globe continent mapping)

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const R = size / 2;
    const cx = R;
    const cy = R;

<<<<<<< HEAD
    // Design token colours (from index.css)
    const PALETTE = {
      latLon:  "rgba(79,70,229,0.18)",    // indigo-primary dim
      prime:   "rgba(99,102,241,0.35)",   // indigo-light
      equator: "rgba(56,189,248,0.22)",   // sky-primary dim
      tropic:  "rgba(148,163,184,0.10)",  // border-strong
      dot:     "rgba(99,102,241,0.55)",   // accent dot
    };

=======
>>>>>>> 68ae3a8 (feat(azure): complete cloud infra, DevOps, globe continent mapping)
    function project(lat: number, lon: number, rot: number) {
      const phi = (lat * Math.PI) / 180;
      const lam = ((lon + rot) * Math.PI) / 180;
      const x = R * Math.cos(phi) * Math.sin(lam);
      const y = -R * Math.sin(phi);
      const z = R * Math.cos(phi) * Math.cos(lam);
      return { x: cx + x, y: cy + y, z };
    }

<<<<<<< HEAD
    function drawGraticule(rot: number) {
      ctx.clearRect(0, 0, size, size);

      // Subtle vignette glow behind globe
      const grd = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.1);
      grd.addColorStop(0, "rgba(79,70,229,0.04)");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, size, size);

      // Clip to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
      ctx.clip();

      const STEP = 10; // degrees between graticule lines

      // ── Latitude lines ──────────────────────────────────────────────
      for (let lat = -80; lat <= 80; lat += STEP) {
        const isEquator = lat === 0;
        const isTropic = Math.abs(lat) === 30 || Math.abs(lat) === 60;

        ctx.beginPath();
        let first = true;

=======
    function drawContinents(rot: number, rings: Ring[]) {
      for (const ring of rings) {
        if (ring.length < 2) continue;
        ctx.beginPath();
        let started = false;
        let prevVisible = false;

        for (let i = 0; i < ring.length; i++) {
          const lon = ring[i][0];
          const lat = ring[i][1];
          const p = project(lat, lon, rot);
          const visible = p.z >= 0;

          if (!visible) {
            prevVisible = false;
            continue;
          }
          if (!started || !prevVisible) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
          prevVisible = true;
        }

        // Land fill — subtle sky-blue tint
        ctx.fillStyle = "rgba(56,189,248,0.045)";
        ctx.fill();
        // Bright outline
        ctx.strokeStyle = "rgba(56,189,248,0.62)";
        ctx.lineWidth = 0.85;
        ctx.lineJoin = "round";
        ctx.stroke();
      }
    }

    function drawGraticule(rot: number) {
      for (let lat = -80; lat <= 80; lat += 10) {
        ctx.beginPath();
        let first = true;
>>>>>>> 68ae3a8 (feat(azure): complete cloud infra, DevOps, globe continent mapping)
        for (let lon = -180; lon <= 180; lon += 2) {
          const p = project(lat, lon, rot);
          if (p.z < 0) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
<<<<<<< HEAD

        ctx.strokeStyle = isEquator
          ? PALETTE.equator
          : isTropic
          ? PALETTE.tropic
          : PALETTE.latLon;
        ctx.lineWidth = isEquator ? 1.2 : 0.7;
        ctx.stroke();
      }

      // ── Longitude lines ─────────────────────────────────────────────
      for (let lon = 0; lon < 360; lon += STEP) {
        const isPrimeMeridian = lon === 0 || lon === 180;
        ctx.beginPath();
        let first = true;

=======
        if (lat === 0) {
          ctx.strokeStyle = "rgba(56,189,248,0.22)";
          ctx.lineWidth = 1.1;
        } else {
          ctx.strokeStyle = "rgba(79,70,229,0.13)";
          ctx.lineWidth = 0.6;
        }
        ctx.stroke();
      }

      for (let lon = 0; lon < 360; lon += 10) {
        ctx.beginPath();
        let first = true;
>>>>>>> 68ae3a8 (feat(azure): complete cloud infra, DevOps, globe continent mapping)
        for (let lat = -90; lat <= 90; lat += 2) {
          const p = project(lat, lon, rot);
          if (p.z < 0) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
<<<<<<< HEAD

        ctx.strokeStyle = isPrimeMeridian ? PALETTE.prime : PALETTE.latLon;
        ctx.lineWidth = isPrimeMeridian ? 1.0 : 0.7;
        ctx.stroke();
      }

      // ── Small accent dots at intersection nodes ──────────────────────
=======
        ctx.strokeStyle = (lon === 0 || lon === 180)
          ? "rgba(99,102,241,0.32)"
          : "rgba(79,70,229,0.13)";
        ctx.lineWidth = (lon === 0 || lon === 180) ? 0.9 : 0.6;
        ctx.stroke();
      }

      // Accent dots at intersections
>>>>>>> 68ae3a8 (feat(azure): complete cloud infra, DevOps, globe continent mapping)
      for (let lat = -60; lat <= 60; lat += 30) {
        for (let lon = 0; lon < 360; lon += 30) {
          const p = project(lat, lon, rot);
          if (p.z < 0) continue;
<<<<<<< HEAD
          // Fade dots near the limb
          const fade = Math.max(0, p.z / R);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = PALETTE.dot.replace("0.55)", `${(0.55 * fade).toFixed(2)})`);
          ctx.fill();
        }
      }

      ctx.restore();

      // ── Globe rim ────────────────────────────────────────────────────
      const rimGrd = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
      rimGrd.addColorStop(0, "rgba(99,102,241,0.08)");
      rimGrd.addColorStop(0.8, "rgba(15,23,42,0.0)");
      rimGrd.addColorStop(1, "rgba(79,70,229,0.28)");

      ctx.beginPath();
      ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(79,70,229,0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Fill with very faint fill
      ctx.fillStyle = "rgba(5,8,22,0.55)";
      ctx.fill();
    }

    function tick() {
      // ~4 degrees / second at 60 fps → imperceptibly slow
      rotRef.current += 0.025;
      drawGraticule(rotRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [size]);
=======
          const fade = Math.max(0, p.z / R);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(99,102,241,${(0.55 * fade).toFixed(2)})`;
          ctx.fill();
        }
      }
    }

    function drawFrame(rot: number, rings: Ring[]) {
      ctx.clearRect(0, 0, size, size);

      // Background glow
      const grd = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.1);
      grd.addColorStop(0, "rgba(79,70,229,0.04)");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, size, size);

      // Clip to globe circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
      ctx.clip();

      // 1 — Continents below graticule
      drawContinents(rot, rings);
      // 2 — Grid
      drawGraticule(rot);

      ctx.restore();

      // Rim stroke
      ctx.beginPath();
      ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(79,70,229,0.28)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const currentRings = globeData.rings;

    function tick() {
      rotRef.current += 0.022;
      drawFrame(rotRef.current, currentRings);
      rafRef.current = requestAnimationFrame(tick);
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [size, globeData]);
>>>>>>> 68ae3a8 (feat(azure): complete cloud infra, DevOps, globe continent mapping)

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: "block" }}
      aria-hidden="true"
    />
  );
}
