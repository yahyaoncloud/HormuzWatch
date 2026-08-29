import { APIExampleBlock } from '@/components/docs/APIExampleBlock';
import {
  DocCallout,
  DocCodeBlock,
  DocParagraph,
  DocumentationBlock,
} from '@/components/docs/DocumentationBlock';
import { EditorialMap } from '@/components/maps';
import { cn } from '@/utils/cn';

// ─── Threat heatmap methodology page ─────────────────────────────────────────

const heatmapLayers = [
  {
    name: 'Anomaly Density',
    desc: 'Spatial density of all detected anomalies weighted by severity score over the selected time window.',
    color: 'danger',
    update: '5 min',
  },
  {
    name: 'AIS Traffic Intensity',
    desc: 'Message rate per grid cell — high density indicates major shipping lanes and chokepoints.',
    color: 'primary',
    update: '2 min',
  },
  {
    name: 'Dark Period Heatmap',
    desc: 'Historical dark-period occurrence density. Persistent hotspots indicate habitual evasion zones.',
    color: 'warning',
    update: '15 min',
  },
  {
    name: 'Risk Score Surface',
    desc: 'Interpolated risk score surface across the region, blending anomaly density, historical incidents, and geopolitical context.',
    color: 'danger',
    update: '10 min',
  },
  {
    name: 'Weather Severity',
    desc: 'Wind speed, wave height, and visibility composited into a maritime weather hazard layer.',
    color: 'info',
    update: '30 min',
  },
  {
    name: 'Satellite Fire Events',
    desc: 'VIIRS fire detection composited onto the map — relevant for industrial fires, refinery activity, and conflict indicators.',
    color: 'warning',
    update: '15 min',
  },
];

const timeWindows = [
  { label: '1 hour', desc: 'Last 60 minutes of detections' },
  { label: '6 hours', desc: 'Morning/evening shift view' },
  { label: '24 hours', desc: 'Full-day situational picture' },
  { label: '7 days', desc: 'Weekly trend analysis' },
  { label: '30 days', desc: 'Monthly pattern detection' },
  { label: 'Custom', desc: 'User-defined time range' },
];

export default function LearnHeatmaps() {
  return (
    <>
      {/* Introduction */}
      <DocumentationBlock
        id="introduction"
        title="Heatmap Methodology"
        subtitle="How HormuzWatch computes, renders, and interprets geospatial density visualizations"
        level={1}
        badges={[
          { label: 'layers', value: '17', color: 'primary' },
          { label: 'refresh', value: '5 min', color: 'success' },
          { label: 'resolution', value: '0.1°', color: 'info' },
        ]}
      >
        <DocParagraph>
          Heatmaps are the primary analytical tool for identifying spatial patterns in maritime and
          aviation data. Unlike point-based visualizations (individual vessel/aircraft markers),
          heatmaps reveal <strong>density, clustering, and temporal persistence</strong> — showing
          where activity concentrates over time.
        </DocParagraph>
        <DocParagraph>
          HormuzWatch generates heatmaps using a kernel density estimation (KDE) approach applied to
          georeferenced events. Each heatmap layer has its own data source, weighting function, time
          window, and color scale.
        </DocParagraph>
        <DocCallout type="tip" title="Interpreting hotspots">
          A persistent hotspot across multiple time windows is more significant than a transient
          spike. Always compare the 1-hour and 7-day layers to distinguish operational activity from
          anomalous surges.
        </DocCallout>
      </DocumentationBlock>

      {/* Live Heatmap */}
      <DocumentationBlock
        id="live-heatmap"
        title="Live Anomaly Heatmap"
        subtitle="Active threat density — updated every 5 minutes"
      >
        <div className="relative aspect-[16/9] rounded-xl overflow-hidden glass-card border border-border/50">
          <EditorialMap
            region="hormuz"
            className="w-full h-full"
            height="100%"
            showLayerControls={true}
            showMetricsRibbon={false}
          />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 pointer-events-none">
            <div className="glass-card px-3 py-2 rounded-lg border border-border/50">
              <p className="font-ui text-caption text-fg-muted">
                Heatmap: Anomaly Density — Last 24h
              </p>
            </div>
            <div className="flex items-center gap-1.5 glass-card px-3 py-2 rounded-lg border border-border/50">
              <span className="font-data text-caption text-fg-muted">Low</span>
              <div className="w-20 h-2 rounded-full bg-gradient-to-r from-info via-warning to-danger" />
              <span className="font-data text-caption text-fg-muted">High</span>
            </div>
          </div>
        </div>

        {/* Time window selector */}
        <div className="mt-4 flex flex-wrap gap-2">
          {timeWindows.map((tw) => (
            <button
              type="button"
              key={tw.label}
              className={cn(
                'px-3 py-1.5 rounded-lg font-ui text-body-sm font-medium transition-colors border',
                timeWindows.indexOf(tw) === 2
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background-elevated border-border/50 text-fg-muted hover:text-fg hover:border-primary/30'
              )}
              aria-pressed={timeWindows.indexOf(tw) === 2}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </DocumentationBlock>

      {/* KDE Algorithm */}
      <DocumentationBlock
        id="algorithm"
        title="Kernel Density Estimation"
        subtitle="The mathematical basis for generating smooth heatmap surfaces"
      >
        <DocParagraph>
          Given a set of georeferenced events <em>X = {'{x₁, x₂, ..., xₙ}'}</em>, the kernel density
          estimate at location <em>x</em> is:
        </DocParagraph>
        <DocCodeBlock
          language="math"
          filename="KDE formula"
          code={`f̂(x) = (1 / nh) × Σᵢ K((x − xᵢ) / h)

Where:
  n  = number of events
  h  = bandwidth (controls smoothing radius)
  K  = Gaussian kernel function: K(u) = (1/√2π) × exp(−u²/2)

Bandwidth selection:
  h = σ × n^(−1/6)  (Silverman's rule of thumb for 2D)
  σ = standard deviation of event distribution

Events weighted by severity score s ∈ [0, 100]:
  f̂w(x) = (1 / nh) × Σᵢ (sᵢ/100) × K((x − xᵢ) / h)`}
        />
        <DocCallout type="info" title="GPU Acceleration">
          HormuzWatch computes heatmaps on the frontend using WebGL fragment shaders, enabling
          real-time re-computation as the time slider moves without server round-trips. The KDE is
          approximated via multi-pass Gaussian blur on a sparse event point texture.
        </DocCallout>
      </DocumentationBlock>

      {/* Heatmap Layers */}
      <DocumentationBlock
        id="layers"
        title="Available Heatmap Layers"
        subtitle="Each layer visualizes a different aspect of maritime intelligence"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {heatmapLayers.map((layer, i) => (
            <div
              key={i}
              className={cn(
                'glass-card rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-colors'
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="font-display text-heading-sm text-fg">{layer.name}</h4>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-caption font-medium',
                      layer.color === 'danger' && 'bg-danger/10 text-danger',
                      layer.color === 'warning' && 'bg-warning/10 text-warning',
                      layer.color === 'primary' && 'bg-primary/10 text-primary',
                      layer.color === 'info' && 'bg-info/10 text-info'
                    )}
                  >
                    {layer.update}
                  </span>
                </div>
              </div>
              <p className="font-ui text-body-sm text-fg-muted">{layer.desc}</p>
            </div>
          ))}
        </div>
      </DocumentationBlock>

      {/* API */}
      <DocumentationBlock
        id="api"
        title="Heatmap API"
        subtitle="Fetch precomputed heatmap data for integration"
      >
        <APIExampleBlock
          method="GET"
          endpoint="/api/v1/heatmap"
          description="Returns a GeoJSON FeatureCollection of heatmap cells for the given layer and time window."
          params={[
            {
              name: 'layer',
              type: 'string',
              required: true,
              description: 'Heatmap layer type',
              example: 'anomaly_density',
            },
            { name: 'region', type: 'string', description: 'Geographic region', example: 'hormuz' },
            { name: 'window', type: 'string', description: 'Time window', example: '24h' },
            {
              name: 'resolution',
              type: 'number',
              description: 'Grid cell size in degrees',
              example: '0.1',
            },
          ]}
          examples={[
            {
              lang: 'curl',
              code: `curl -H "Authorization: Bearer $TOKEN" \\
  "https://api.hormuzwatch.com/api/v1/heatmap?layer=anomaly_density&region=hormuz&window=24h"`,
            },
            {
              lang: 'js',
              code: `const res = await fetch('/api/v1/heatmap?layer=anomaly_density&region=hormuz&window=24h', {
  headers: { Authorization: \`Bearer \${token}\` }
});
const { geojson, metadata } = await res.json();
// geojson.features[i].properties.intensity ∈ [0, 1]`,
            },
            {
              lang: 'python',
              code: `import requests, geopandas as gpd

resp = requests.get(
  'https://api.hormuzwatch.com/api/v1/heatmap',
  headers={'Authorization': f'Bearer {token}'},
  params={'layer': 'anomaly_density', 'region': 'hormuz', 'window': '24h'}
)
gdf = gpd.GeoDataFrame.from_features(resp.json()['geojson']['features'])`,
            },
          ]}
          sampleResponse={`{
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [56.3, 26.1] },
        "properties": { "intensity": 0.87, "count": 12, "max_severity": 94.2 }
      }
    ]
  },
  "metadata": {
    "layer": "anomaly_density",
    "window": "24h",
    "cell_count": 1247,
    "generated_at": "2026-07-20T03:40:00Z"
  }
}`}
        />
      </DocumentationBlock>
    </>
  );
}
