import { useEffect, useRef, useState } from "react";

interface GlobeCanvasProps {
  size?: number;
}

type Position = number[]; // [lon, lat]
type Ring = Position[];

interface GlobeData {
  rings: Ring[];
}

export default function GlobeCanvas({ size = 700 }: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const rotRef = useRef(0);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const R = size / 2;
    const cx = R;
    const cy = R;

    function project(lat: number, lon: number, rot: number) {
      const phi = (lat * Math.PI) / 180;
      const lam = ((lon + rot) * Math.PI) / 180;
      const x = R * Math.cos(phi) * Math.sin(lam);
      const y = -R * Math.sin(phi);
      const z = R * Math.cos(phi) * Math.cos(lam);
      return { x: cx + x, y: cy + y, z };
    }

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
        for (let lon = -180; lon <= 180; lon += 2) {
          const p = project(lat, lon, rot);
          if (p.z < 0) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
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
        for (let lat = -90; lat <= 90; lat += 2) {
          const p = project(lat, lon, rot);
          if (p.z < 0) { first = true; continue; }
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = (lon === 0 || lon === 180)
          ? "rgba(99,102,241,0.32)"
          : "rgba(79,70,229,0.13)";
        ctx.lineWidth = (lon === 0 || lon === 180) ? 0.9 : 0.6;
        ctx.stroke();
      }

      // Accent dots at intersections
      for (let lat = -60; lat <= 60; lat += 30) {
        for (let lon = 0; lon < 360; lon += 30) {
          const p = project(lat, lon, rot);
          if (p.z < 0) continue;
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
