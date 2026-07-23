import { type LoaderFunctionArgs, useLoaderData, useRouteError } from 'react-router';
import { Section } from '@/components/layout/Section';
import {
  AVIATION_METRICS,
  MARITIME_METRICS,
  MetricGrid,
  RegionalDashboardBlock,
} from '@/components/data/MetricGrid';
import { RegionalEditorialMap, type RegionKey } from '@/components/maps';
import { getPublicMetrics, getTopTraces } from '@/lib/api';
import { PageTodoList, type TodoItem } from "@/components/ui/PageTodoList";

const REGION_TODOS: TodoItem[] = [
  { id: "r1", title: "Regional Map & Threat Matrix", category: "UI & UX", completed: true, notes: "Interactive sector map with live metrics breakdown" },
  { id: "r2", title: "Live AIS Geo-fence Filtering", category: "API & Data", completed: false, notes: "Filter incoming WebSocket tracks by polygon bounds of selected region" },
  { id: "r3", title: "Historical Region Risk Score Trend", category: "ML & Anomaly", completed: false, notes: "Chart comparing historical risk index over 30-day window for this sector" },
];

function getRegionNameByCoords(lat: number, lon: number): string {
  if (lat >= 29.9 && lat <= 31.3 && lon >= 32.2 && lon <= 32.6) {
    return 'Suez Canal';
  }
  if (lat >= 12.0 && lat <= 29.9 && lon >= 32.2 && lon <= 44.0) {
    return 'Red Sea';
  }
  if (lat >= 25.5 && lat <= 27.5 && lon >= 55.5 && lon <= 57.2) {
    return 'Strait of Hormuz';
  }
  if (lat >= 23.5 && lat <= 30.5 && lon >= 47.0 && lon < 55.5) {
    return 'Persian Gulf';
  }
  if (lat >= 21.0 && lat <= 25.5 && lon > 57.2 && lon <= 61.5) {
    return 'Gulf of Oman';
  }
  return 'Gulf Region';
}

const mapParamToRegionKey = (param: string): RegionKey => {
  if (param === 'red-sea') return 'redSea';
  if (param === 'persian-gulf') return 'persianGulf';
  if (param === 'suez') return 'suez';
  if (param === 'bab-el-mandeb') return 'babElMandeb';
  return param as RegionKey;
};

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const regionParam = params.region || 'hormuz';

  const [metricsRes, tracesRes] = await Promise.all([
    getPublicMetrics().catch(() => null),
    getTopTraces().catch(() => null),
  ]);

  const globalMetrics = metricsRes?.metrics;
  const traces = tracesRes?.traces || [];

  // Filter traces belonging to the current region
  const regionalTraces = traces.filter((t) => {
    const regionName = getRegionNameByCoords(t.lat, t.lon);
    if (regionParam === 'hormuz') return regionName === 'Strait of Hormuz';
    if (regionParam === 'red-sea') return regionName === 'Red Sea';
    if (regionParam === 'suez') return regionName === 'Suez Canal';
    if (regionParam === 'persian-gulf') return regionName === 'Persian Gulf';
    return false;
  });

  // Calculate regional metrics
  const anomaliesCount = regionalTraces.length;
  // If there are anomalies in the region, risk score goes up
  const baseRisk =
    regionParam === 'hormuz'
      ? 72
      : regionParam === 'red-sea'
        ? 68
        : regionParam === 'suez'
          ? 45
          : 61;
  const riskScore = Math.min(100, baseRisk + anomaliesCount * 5);

  const regionMeta = {
    hormuz: {
      name: 'Strait of Hormuz',
      subtitle: 'Strategic chokepoint monitoring — 21% of global petroleum transit',
      description:
        "The Strait of Hormuz is the world's most important oil transit chokepoint. It links the Persian Gulf with the Gulf of Oman and the Arabian Sea. It is 21 miles wide at its narrowest point, with shipping lanes only two miles wide in either direction.",
      facts: [
        { label: 'Estimated Daily Transits', value: '85-90 vessels' },
        { label: 'Risk Index', value: `${riskScore}/100` },
        { label: 'Active Regional Anomalies', value: String(anomaliesCount) },
        { label: 'Global Oil Transit', value: '21%' },
      ],
      contexts: [
        {
          title: 'Energy Security',
          desc: '21% of global petroleum liquids transit. Closure would remove ~17M bpd from market.',
          icon: '⚡',
        },
        {
          title: 'Chokepoint Risk',
          desc: 'Narrowest point 21 nautical miles. Vulnerable to mines, missiles, and asymmetric threats.',
          icon: '⚠️',
        },
        {
          title: 'Historical Incidents',
          desc: '1980s Tanker War, 2019 attacks, 2021 seizures. Pattern of escalation during regional tension.',
          icon: '📜',
        },
      ],
    },
    'red-sea': {
      name: 'Red Sea / Bab-el-Mandeb',
      subtitle: 'Critical trade link between Europe and Asia',
      description:
        'The Bab-el-Mandeb Strait is a chokepoint between the Horn of Africa and the Middle East, connecting the Red Sea to the Gulf of Aden and Arabian Sea. Most exports from the Persian Gulf that transit the Suez Canal must pass through it.',
      facts: [
        { label: 'Estimated Daily Transits', value: '55-60 vessels' },
        { label: 'Risk Index', value: `${riskScore}/100` },
        { label: 'Active Regional Anomalies', value: String(anomaliesCount) },
        { label: 'Global Trade Flow', value: '12%' },
      ],
      contexts: [
        {
          title: 'Asymmetric Threats',
          desc: 'Frequent drone and anti-ship missile attacks from coastal launchers targeting merchant shipping.',
          icon: '🚀',
        },
        {
          title: 'Trade Divergence',
          desc: 'Vessels increasingly re-routing around the Cape of Good Hope, adding 10-14 days to transit times.',
          icon: '🗺️',
        },
        {
          title: 'Naval Coalition',
          desc: 'Operation Prosperity Guardian and international naval task forces providing active escort.',
          icon: '🛡️',
        },
      ],
    },
    suez: {
      name: 'Suez Canal',
      subtitle: "Egypt's strategic maritime artery",
      description:
        'The Suez Canal is an artificial sea-level waterway in Egypt, connecting the Mediterranean Sea to the Red Sea. It offers watercraft a more direct route between the North Atlantic and northern Indian oceans.',
      facts: [
        { label: 'Estimated Daily Transits', value: '75-80 vessels' },
        { label: 'Risk Index', value: `${riskScore}/100` },
        { label: 'Active Regional Anomalies', value: String(anomaliesCount) },
        { label: 'Global Container Traffic', value: '30%' },
      ],
      contexts: [
        {
          title: 'Economic Impact',
          desc: 'Suez Canal tolls represent a vital source of foreign currency for Egypt, highly sensitive to traffic drops.',
          icon: '💰',
        },
        {
          title: 'Physical Vulnerability',
          desc: 'Narrow channel susceptible to grounding incidents (e.g., Ever Given in 2021) that block global shipping.',
          icon: '🚧',
        },
        {
          title: 'Logistics Bottleneck',
          desc: 'Delays in Suez transit propagate rapidly through European and Asian container port schedules.',
          icon: '⏱️',
        },
      ],
    },
    'persian-gulf': {
      name: 'Persian Gulf',
      subtitle: 'High-density energy production basin',
      description:
        "The Persian Gulf is a mediterranean sea in Western Asia. An extension of the Indian Ocean, it is surrounded by the world's largest oil reserves and hosts intense industrial, commercial, and military maritime traffic.",
      facts: [
        { label: 'Estimated Daily Transits', value: '100+ vessels' },
        { label: 'Risk Index', value: `${riskScore}/100` },
        { label: 'Active Regional Anomalies', value: String(anomaliesCount) },
        { label: 'Monitored Production', value: '32%' },
      ],
      contexts: [
        {
          title: 'Naval Presence',
          desc: 'High density of state actors, coast guards, and commercial shipping creates complex correlation demands.',
          icon: '⚓',
        },
        {
          title: 'Industrial Infrastructure',
          desc: 'Host to hundreds of offshore oil platforms, loading terminals, and submarine pipelines.',
          icon: '🏗️',
        },
        {
          title: 'Watchlist Thresholds',
          desc: 'Pattern deviations are heavily weighted due to proximity to disputed islands and territorial boundaries.',
          icon: '🔍',
        },
      ],
    },
  };

  const meta = regionMeta[regionParam as keyof typeof regionMeta] || regionMeta['hormuz'];

  // Last incident mapping
  let lastIncident: any = {
    type: 'No Active Incident',
    severity: 'low',
    time: Date.now(),
    description: 'No active anomalous telemetry reports for this region.',
  };

  if (regionalTraces.length > 0) {
    const t = regionalTraces[0];
    let reasonsList: string[] = [];
    try {
      reasonsList = JSON.parse(t.reasons);
    } catch {
      if (t.reasons) reasonsList = t.reasons.split(',').map((r) => r.trim());
    }
    const primaryReason = reasonsList.length > 0 ? reasonsList[0] : 'Elevated Anomaly';
    lastIncident = {
      type: primaryReason,
      severity: t.severity,
      time: new Date(t.timestamp).getTime(),
      description: `Track ${t.trackId} (${t.assetName || 'Unknown'}) flagged for ${primaryReason.toLowerCase()}`,
    };
  }

  const vesselsCount = globalMetrics
    ? Math.round(
        globalMetrics.maritimeCount *
          (regionParam === 'hormuz'
            ? 0.25
            : regionParam === 'red-sea'
              ? 0.35
              : regionParam === 'suez'
                ? 0.15
                : 0.45)
      )
    : regionParam === 'hormuz'
      ? 234
      : regionParam === 'red-sea'
        ? 567
        : regionParam === 'suez'
          ? 89
          : 1123;
  const aircraftCount = globalMetrics
    ? Math.round(
        globalMetrics.aviationCount *
          (regionParam === 'hormuz'
            ? 0.18
            : regionParam === 'red-sea'
              ? 0.22
              : regionParam === 'suez'
                ? 0.1
                : 0.38)
      )
    : regionParam === 'hormuz'
      ? 45
      : regionParam === 'red-sea'
        ? 78
        : regionParam === 'suez'
          ? 12
          : 156;

  return {
    region: regionParam,
    meta,
    metrics: {
      region: regionParam,
      vessels: vesselsCount,
      aircraft: aircraftCount,
      anomalies: anomaliesCount,
      riskScore: riskScore,
      aisRate:
        regionParam === 'hormuz'
          ? 1200
          : regionParam === 'red-sea'
            ? 2100
            : regionParam === 'suez'
              ? 450
              : 3200,
      adsbRate:
        regionParam === 'hormuz'
          ? 800
          : regionParam === 'red-sea'
            ? 1200
            : regionParam === 'suez'
              ? 200
              : 900,
      lastIncident,
    },
    liveVessels: vesselsCount,
    liveAircraft: aircraftCount,
    activeAnomalies: anomaliesCount,
    riskTrend:
      regionParam === 'hormuz'
        ? [65, 67, 68, 70, 71, 72]
        : regionParam === 'red-sea'
          ? [50, 55, 58, 62, 65, 68]
          : regionParam === 'suez'
            ? [44, 45, 45, 46, 45, 45]
            : [55, 58, 59, 60, 62, 61],
    vesselTrend:
      regionParam === 'hormuz'
        ? [220, 225, 228, 230, 232, 234]
        : regionParam === 'red-sea'
          ? [540, 548, 552, 558, 562, 567]
          : regionParam === 'suez'
            ? [80, 82, 85, 87, 88, 89]
            : [1080, 1095, 1105, 1112, 1118, 1123],
    aircraftTrend:
      regionParam === 'hormuz'
        ? [42, 43, 44, 45, 45, 45]
        : regionParam === 'red-sea'
          ? [70, 72, 75, 76, 78, 78]
          : regionParam === 'suez'
            ? [10, 11, 11, 12, 12, 12]
            : [142, 145, 148, 150, 153, 156],
  };
}

export default function HormuzIntelligence() {
  const data = useLoaderData<typeof clientLoader>();

  const liveMetrics = [
    {
      id: 'vessels',
      label: 'Active Vessels',
      value: data.liveVessels,
      unit: '',
      color: 'primary' as const,
      trend: 'up' as const,
      change: 2.1,
    },
    {
      id: 'aircraft',
      label: 'Active Aircraft',
      value: data.liveAircraft,
      unit: '',
      color: 'info' as const,
      trend: 'stable' as const,
      change: 0,
    },
    {
      id: 'anomalies',
      label: 'Active Anomalies',
      value: data.activeAnomalies,
      unit: '',
      color: 'danger' as const,
      trend: 'up' as const,
      change: 50,
    },
    {
      id: 'risk',
      label: 'Risk Score',
      value: data.metrics.riskScore,
      unit: '/100',
      color: 'warning' as const,
      trend: 'up' as const,
      change: 3,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 space-y-12">
      <Section
        id="overview"
        title={`${data.meta.name} Intelligence`}
        subtitle={data.meta.subtitle}
        className="mb-8"
        wide
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <RegionalEditorialMap
              region={mapParamToRegionKey(data.region)}
              className="aspect-[16/9] rounded-xl overflow-hidden glass-card "
              height="450px"
              showLayerControls={true}
              showMetricsRibbon={false}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-4">
                <h4 className="font-display text-heading-sm text-[var(--color-fg)] mb-2">
                  Key Statistics
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {data.meta.facts.map((fact: any) => (
                    <div key={fact.label}>
                      <p className="font-data text-data text-[var(--color-fg)]">{fact.value}</p>
                      <p className="font-ui text-caption text-[var(--color-fg-muted)]">
                        {fact.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <h4 className="font-display text-heading-sm text-[var(--color-fg)] mb-2">
                  Risk Trend (24h)
                </h4>
                <div className="h-20">
                  <div className="h-full flex items-end justify-center gap-1">
                    {data.riskTrend.map((val: any, i: any) => (
                      <div
                        key={`risk-${i}`}
                        className="w-6 bg-primary/50 rounded-t"
                        style={{ height: `${(val / 80) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <MetricGrid metrics={liveMetrics} compact />

            <RegionalDashboardBlock region={data.meta.name} metrics={data.metrics} />
          </div>
        </div>
      </Section>

      <Section
        id="maritime"
        title="Maritime Domain Awareness"
        subtitle="AIS vessel tracking and behavioral analysis"
        className="mt-12"
        wide
      >
        <MetricGrid metrics={MARITIME_METRICS} columns={4} />
      </Section>

      <Section
        id="aviation"
        title="Aviation Domain Awareness"
        subtitle="ADS-B aircraft tracking over the region"
        className="mt-12"
        wide
      >
        <MetricGrid metrics={AVIATION_METRICS} columns={4} />
      </Section>

      <Section
        id="context"
        title="Strategic Context"
        subtitle={`Why the ${data.meta.name} matters`}
        className="mt-12"
        wide
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.meta.contexts.map((item: any) => (
            <div key={item.title} className="glass-card rounded-xl p-6">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h4 className="font-display text-heading-sm text-[var(--color-fg)] mb-2">
                {item.title}
              </h4>
              <p className="font-ui text-body text-[var(--color-fg-muted)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* TODO List Component */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <PageTodoList pageTitle={`${data.meta.name} Sector`} items={REGION_TODOS} />
      </div>
    </div>
  );
}



export function ErrorBoundary() {
  const error = useRouteError();
  console.error('HormuzIntelligence error:', error);
  return (
    <div className="flex items-center justify-center min-h-[500px] text-[var(--color-danger)] flex-col gap-4">
      <h3 className="font-display text-xl font-semibold">Failed to load regional intelligence data</h3>
      <p className="font-ui text-body-sm">{error instanceof Error ? error.message : 'An unknown error occurred.'}</p>
    </div>
  );
}
