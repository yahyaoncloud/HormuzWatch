import { useEffect, useRef } from "react";

interface GlobeCanvasProps {
  size?: number;
}

export default function GlobeCanvas({ size = 700 }: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const rotRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const R = size / 2;
    const cx = R;
    const cy = R;

    // Design token colours (from index.css)
    const PALETTE = {
      latLon:  "rgba(79,70,229,0.18)",    // indigo-primary dim
      prime:   "rgba(99,102,241,0.35)",   // indigo-light
      equator: "rgba(56,189,248,0.22)",   // sky-primary dim
      tropic:  "rgba(148,163,184,0.10)",  // border-strong
      dot:     "rgba(99,102,241,0.55)",   // accent dot
    };

    function project(lat: number, lon: number, rot: number) {
      const phi = (lat * Math.PI) / 180;
      const lam = ((lon + rot) * Math.PI) / 180;
      const x = R * Math.cos(phi) * Math.sin(lam);
      const y = -R * Math.sin(phi);
      const z = R * Math.cos(phi) * Math.cos(lam);
      return { x: cx + x, y: cy + y, z };
    }

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

        for (let lon = -180; lon <= 180; lon += 2) {
          const p = project(lat, lon, rot);
          if (p.z < 0) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }

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

        for (let lat = -90; lat <= 90; lat += 2) {
          const p = project(lat, lon, rot);
          if (p.z < 0) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }

        ctx.strokeStyle = isPrimeMeridian ? PALETTE.prime : PALETTE.latLon;
        ctx.lineWidth = isPrimeMeridian ? 1.0 : 0.7;
        ctx.stroke();
      }

      // ── Small accent dots at intersection nodes ──────────────────────
      for (let lat = -60; lat <= 60; lat += 30) {
        for (let lon = 0; lon < 360; lon += 30) {
          const p = project(lat, lon, rot);
          if (p.z < 0) continue;
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
