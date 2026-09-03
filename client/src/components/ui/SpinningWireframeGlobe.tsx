import React from 'react';

interface SpinningWireframeGlobeProps {
  className?: string;
  size?: number;
}

/**
 * SpinningWireframeGlobe
 * -----------------------
 * Dual-sphere concentric vector wireframe globe with continuous 3D rotation,
 * graticule latitude/longitude lines, orbital telemetry nodes, and tactical light indigo aura.
 * Positioned on the top-right corner with ~60% of the sphere revealed in the viewport.
 */
export const SpinningWireframeGlobe: React.FC<SpinningWireframeGlobeProps> = ({
  className = '',
  size = 560,
}) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none overflow-visible ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Background Soft Indigo Atmospheric Glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 45% 45%, rgba(129, 140, 248, 0.22) 0%, rgba(99, 102, 241, 0.08) 45%, transparent 72%)',
          filter: 'blur(32px)',
        }}
      />

      <svg
        viewBox="0 0 500 500"
        className="w-full h-full overflow-visible drop-shadow-[0_0_25px_rgba(129,140,248,0.45)]"
      >
        <defs>
          {/* Light Indigo Linear Gradient for Outer Shell */}
          <linearGradient id="globeOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#818cf8" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.25" />
          </linearGradient>

          {/* Glowing Gradient for Inner Shell */}
          <linearGradient id="globeInnerGrad" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#312e81" stopOpacity="0.2" />
          </linearGradient>

          {/* Core Radial Atmosphere */}
          <radialGradient id="globeCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Core Sphere */}
        <circle cx="250" cy="250" r="210" fill="url(#globeCoreGlow)" />

        {/* =================================================================== */}
        {/* SPHERE 1: OUTER WIREFRAME GLOBE (Radius = 210px, Clockwise Rotation) */}
        {/* =================================================================== */}
        <g
          className="origin-center"
          style={{
            transformOrigin: '250px 250px',
            animation: 'spinGlobeOuter 32s linear infinite',
          }}
        >
          {/* Outer Boundary Circle */}
          <circle
            cx="250"
            cy="250"
            r="210"
            fill="none"
            stroke="url(#globeOuterGrad)"
            strokeWidth="1.75"
            strokeDasharray="4 2"
            opacity="0.8"
          />

          {/* Latitude Parallels */}
          <ellipse
            cx="250"
            cy="250"
            rx="210"
            ry="75"
            fill="none"
            stroke="url(#globeOuterGrad)"
            strokeWidth="1.2"
            opacity="0.65"
          />
          <ellipse
            cx="250"
            cy="165"
            rx="185"
            ry="55"
            fill="none"
            stroke="url(#globeOuterGrad)"
            strokeWidth="1"
            opacity="0.45"
          />
          <ellipse
            cx="250"
            cy="335"
            rx="185"
            ry="55"
            fill="none"
            stroke="url(#globeOuterGrad)"
            strokeWidth="1"
            opacity="0.45"
          />
          <ellipse
            cx="250"
            cy="105"
            rx="140"
            ry="38"
            fill="none"
            stroke="url(#globeOuterGrad)"
            strokeWidth="0.8"
            opacity="0.3"
          />
          <ellipse
            cx="250"
            cy="395"
            rx="140"
            ry="38"
            fill="none"
            stroke="url(#globeOuterGrad)"
            strokeWidth="0.8"
            opacity="0.3"
          />

          {/* Longitude Meridians */}
          <ellipse
            cx="250"
            cy="250"
            rx="75"
            ry="210"
            fill="none"
            stroke="url(#globeOuterGrad)"
            strokeWidth="1.2"
            opacity="0.65"
          />
          <ellipse
            cx="250"
            cy="250"
            rx="145"
            ry="210"
            fill="none"
            stroke="url(#globeOuterGrad)"
            strokeWidth="1.1"
            opacity="0.5"
          />
          <line
            x1="250"
            y1="40"
            x2="250"
            y2="460"
            stroke="url(#globeOuterGrad)"
            strokeWidth="1.4"
            opacity="0.75"
          />
          <line
            x1="40"
            y1="250"
            x2="460"
            y2="250"
            stroke="url(#globeOuterGrad)"
            strokeWidth="1.4"
            opacity="0.75"
          />

          {/* Orbital Satellite Node Markers */}
          <circle cx="250" cy="40" r="3.5" fill="#c7d2fe" />
          <circle cx="250" cy="460" r="3" fill="#818cf8" />
          <circle cx="40" cy="250" r="3" fill="#818cf8" />
          <circle cx="460" cy="250" r="3.5" fill="#c7d2fe" />
          <circle cx="395" cy="180" r="2.5" fill="#a5b4fc" opacity="0.85" />
          <circle cx="105" cy="320" r="2.5" fill="#a5b4fc" opacity="0.85" />
        </g>

        {/* =================================================================== */}
        {/* SPHERE 2: INNER CONCENTRIC WIREFRAME (Radius = 155px, Counter-Spin) */}
        {/* =================================================================== */}
        <g
          className="origin-center"
          style={{
            transformOrigin: '250px 250px',
            animation: 'spinGlobeInner 22s linear infinite',
          }}
        >
          {/* Inner Outlined Shell */}
          <circle
            cx="250"
            cy="250"
            r="155"
            fill="none"
            stroke="url(#globeInnerGrad)"
            strokeWidth="1.5"
            opacity="0.85"
          />

          {/* Inner Latitude Parallels */}
          <ellipse
            cx="250"
            cy="250"
            rx="155"
            ry="60"
            fill="none"
            stroke="url(#globeInnerGrad)"
            strokeWidth="1.1"
            opacity="0.7"
          />
          <ellipse
            cx="250"
            cy="190"
            rx="135"
            ry="45"
            fill="none"
            stroke="url(#globeInnerGrad)"
            strokeWidth="0.9"
            opacity="0.5"
          />
          <ellipse
            cx="250"
            cy="310"
            rx="135"
            ry="45"
            fill="none"
            stroke="url(#globeInnerGrad)"
            strokeWidth="0.9"
            opacity="0.5"
          />

          {/* Inner Longitude Meridians */}
          <ellipse
            cx="250"
            cy="250"
            rx="55"
            ry="155"
            fill="none"
            stroke="url(#globeInnerGrad)"
            strokeWidth="1.1"
            opacity="0.7"
          />
          <ellipse
            cx="250"
            cy="250"
            rx="110"
            ry="155"
            fill="none"
            stroke="url(#globeInnerGrad)"
            strokeWidth="0.9"
            opacity="0.5"
          />

          {/* Inner Coordinate Intersections */}
          <circle cx="250" cy="250" r="2.5" fill="#ffffff" opacity="0.9" />
          <circle cx="305" cy="250" r="2" fill="#818cf8" />
          <circle cx="195" cy="250" r="2" fill="#818cf8" />
          <circle cx="250" cy="190" r="2" fill="#818cf8" />
          <circle cx="250" cy="310" r="2" fill="#818cf8" />
        </g>

        {/* Equatorial Target Ring / Calibration Marks */}
        <circle
          cx="250"
          cy="250"
          r="230"
          fill="none"
          stroke="#818cf8"
          strokeWidth="0.75"
          strokeDasharray="2 12"
          opacity="0.45"
        />
        <circle
          cx="250"
          cy="250"
          r="242"
          fill="none"
          stroke="#6366f1"
          strokeWidth="0.5"
          strokeDasharray="1 8"
          opacity="0.3"
        />
      </svg>
    </div>
  );
};
