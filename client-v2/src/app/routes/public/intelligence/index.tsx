import { useState } from 'react';
import { Link, useLoaderData, useRouteError } from 'react-router';
import { Section } from '@/components/layout/Section';
import { MetricGrid } from '@/components/data/MetricGrid';
import { BottomSheet } from '@/components/ui/sheet';
import { getAIBriefing, getPublicMetrics, getTopTraces } from '@/lib/api';
import { cn } from '@/utils/cn';

// ============================================================
// Gulf Country & Chokepoint Threat Matrix Data
// ============================================================

export interface GulfThreatCard {
  id: string;
  name: string;
  code: string;
  flag: string;
  category: 'gcc' | 'chokepoint' | 'littoral';
  riskScore: number; // 0-100
  riskLevel: 'critical' | 'high' | 'moderate' | 'nominal';
  vessels: number;
  aircraft: number;
  anomalies: number;
  gpsInterference: 'Severe' | 'High' | 'Moderate' | 'Low';
  navalStatus: string;
  keyPortOrZone: string;
}

const GULF_THREAT_CARDS: GulfThreatCard[] = [
  {
    id: 'hormuz-chokepoint',
    name: 'Strait of Hormuz',
    code: 'HOR',
    flag: '⚓',
    category: 'chokepoint',
    riskScore: 82,
    riskLevel: 'critical',
    vessels: 234,
    aircraft: 45,
    anomalies: 8,
    gpsInterference: 'Severe',
    navalStatus: 'IRGC Patrol / High Watch Zone',
    keyPortOrZone: '21Nm Transit Corridor',
  },
  {
    id: 'iran-gulf',
    name: 'Iran (Gulf Coast & Islands)',
    code: 'IRN',
    flag: '🇮🇷',
    category: 'littoral',
    riskScore: 78,
    riskLevel: 'high',
    vessels: 412,
    aircraft: 68,
    anomalies: 12,
    gpsInterference: 'Severe',
    navalStatus: 'Active Naval Maneuvers',
    keyPortOrZone: 'Bandar Abbas / Abu Musa',
  },
  {
    id: 'uae-coast',
    name: 'United Arab Emirates',
    code: 'UAE',
    flag: '🇦🇪',
    category: 'gcc',
    riskScore: 38,
    riskLevel: 'nominal',
    vessels: 1420,
    aircraft: 312,
    anomalies: 2,
    gpsInterference: 'Low',
    navalStatus: 'Standard Coast Guard',
    keyPortOrZone: 'Fujairah / Jebel Ali',
  },
  {
    id: 'ksa-gulf',
    name: 'Saudi Arabia (Gulf Coast)',
    code: 'KSA',
    flag: '🇸🇦',
    category: 'gcc',
    riskScore: 52,
    riskLevel: 'moderate',
    vessels: 890,
    aircraft: 185,
    anomalies: 4,
    gpsInterference: 'Moderate',
    navalStatus: 'Terminal Shield Posture',
    keyPortOrZone: 'Ras Tanura / Juaymah',
  },
  {
    id: 'oman-strait',
    name: 'Sultanate of Oman',
    code: 'OMN',
    flag: '🇴🇲',
    category: 'gcc',
    riskScore: 32,
    riskLevel: 'nominal',
    vessels: 512,
    aircraft: 88,
    anomalies: 1,
    gpsInterference: 'Low',
    navalStatus: 'Corridor Security Escort',
    keyPortOrZone: 'Sohar / Duqm Corridor',
  },
  {
    id: 'qatar-peninsula',
    name: 'State of Qatar',
    code: 'QAT',
    flag: '🇶🇦',
    category: 'gcc',
    riskScore: 28,
    riskLevel: 'nominal',
    vessels: 380,
    aircraft: 142,
    anomalies: 0,
    gpsInterference: 'Low',
    navalStatus: 'LNG Patrol Duty',
    keyPortOrZone: 'Ras Laffan Channel',
  },
  {
    id: 'bahrain-gulf',
    name: 'Kingdom of Bahrain',
    code: 'BHR',
    flag: '🇧🇭',
    category: 'gcc',
    riskScore: 45,
    riskLevel: 'moderate',
    vessels: 195,
    aircraft: 62,
    anomalies: 2,
    gpsInterference: 'Moderate',
    navalStatus: 'US 5th Fleet Base Watch',
    keyPortOrZone: 'Mina Salman / NSA',
  },
  {
    id: 'kuwait-north',
    name: 'State of Kuwait',
    code: 'KWT',
    flag: '🇰🇼',
    category: 'gcc',
    riskScore: 34,
    riskLevel: 'nominal',
    vessels: 210,
    aircraft: 48,
    anomalies: 1,
    gpsInterference: 'Low',
    navalStatus: 'Northern Basin Patrol',
    keyPortOrZone: 'Mina al-Ahmadi',
  },
  {
    id: 'babalmandeb-chokepoint',
    name: 'Bab-el-Mandeb & Red Sea',
    code: 'BAB',
    flag: '⚓',
    category: 'chokepoint',
    riskScore: 88,
    riskLevel: 'critical',
    vessels: 567,
    aircraft: 78,
    anomalies: 15,
    gpsInterference: 'Severe',
    navalStatus: 'Coalition Escort Duty',
    keyPortOrZone: 'Southern Red Sea Transit',
  },
];

const FALLBACK = {
  status: 'operational' as const,
  message: 'All systems nominal. Tracking vessels and aircraft globally.',
  globalMetrics: {
    vessels: 12847,
    aircraft: 8234,
    anomalies: 23,
    riskIndex: 67,
    aisRate: 45200,
    adsbRate: 128700,
  },
  regionalMetrics: {
    hormuz: {
      region: 'hormuz',
      vessels: 234,
      aircraft: 45,
      anomalies: 3,
      riskScore: 72,
      aisRate: 1200,
      adsbRate: 800,
    },
    redSea: {
      region: 'redSea',
      vessels: 567,
      aircraft: 78,
      anomalies: 7,
      riskScore: 68,
      aisRate: 2100,
      adsbRate: 1200,
    },
    suez: {
      region: 'suez',
      vessels: 89,
      aircraft: 12,
      anomalies: 1,
      riskScore: 45,
      aisRate: 450,
      adsbRate: 200,
    },
    persianGulf: {
      region: 'persianGulf',
      vessels: 1123,
      aircraft: 156,
      anomalies: 5,
      riskScore: 61,
      aisRate: 3200,
      adsbRate: 900,
    },
  },
  recentIncidents: [
    {
      id: 'inc-001',
      type: 'anomaly',
      severity: 'high',
      title: 'Route Deviation - IRN881',
      region: 'Hormuz Strait',
      time: Date.now() - 3600000,
    },
    {
      id: 'inc-002',
      type: 'alert',
      severity: 'medium',
      title: 'Loitering Vessels',
      region: 'Bab-el-Mandeb',
      time: Date.now() - 7200000,
    },
    {
      id: 'inc-003',
      type: 'weather',
      severity: 'low',
      title: 'High Winds Advisory',
      region: 'North Arabian Sea',
      time: Date.now() - 10800000,
    },
    {
      id: 'inc-004',
      type: 'security',
      severity: 'critical',
      title: 'Sanctions Evasion Alert',
      region: 'Persian Gulf',
      time: Date.now() - 14400000,
    },
  ],
  briefing: {
    executive_summary:
      'Geopolitical risk indicators show elevated traffic density in the Strait of Hormuz. Normal operational baseline is maintained across chokepoints with no critical security interdictions reported in the last 24 hours.',
    threat_analysis: [
      'AIS transponder signal gaps detected on multiple merchant vessels transiting the Northern Basin.',
      'GDELT events index shows moderate activity near Farsi Island, typical of current routine naval patrols.',
    ],
    tactical_recommendations: [
      'Maintain standard surveillance posture across primary chokepoints and restricted watch zones.',
      'Coordinate with local maritime information centers to verify any unexpected AIS dropouts.',
    ],
    generated_at: new Date().toISOString(),
    source: 'fallback' as const,
  },
};

function getRegionNameByCoords(_lat: number, lon: number): string {
  if (lon < 56.0) return 'Persian Gulf';
  if (lon >= 56.0 && lon <= 59.0) return 'Strait of Hormuz';
  return 'Gulf of Oman';
}

export async function clientLoader() {
  try {
    const [metricsRes, _tracesRes, briefingRes] = await Promise.all([
      getPublicMetrics(),
      getTopTraces(),
      getAIBriefing().catch(() => null),
    ]);

    const m = metricsRes?.metrics;
    const status = 'operational' as const;

    const globalMetrics = m
      ? {
          vessels: m.totalTracks ?? FALLBACK.globalMetrics.vessels,
          aircraft: m.aviationCount ?? FALLBACK.globalMetrics.aircraft,
          anomalies:
            (m.criticalCount ?? 0) +
              (m.highCount ?? 0) +
              (m.mediumCount ?? 0) +
              (m.lowCount ?? 0) || FALLBACK.globalMetrics.anomalies,
          riskIndex: m.avgScore ? Math.round(m.avgScore) : FALLBACK.globalMetrics.riskIndex,
          aisRate: FALLBACK.globalMetrics.aisRate,
          adsbRate: FALLBACK.globalMetrics.adsbRate,
        }
      : FALLBACK.globalMetrics;

    const briefing = briefingRes ?? FALLBACK.briefing;

    const recentIncidents =
      _tracesRes?.traces?.map((t) => {
        let reasonsList: string[] = [];
        try {
          reasonsList = JSON.parse(t.reasons);
        } catch {
          if (t.reasons) {
            reasonsList = t.reasons.split(',').map((r: string) => r.trim());
          }
        }
        const primaryReason = reasonsList.length > 0 ? reasonsList[0] : 'Elevated Anomaly Score';

        return {
          id: t.trackId,
          type: 'anomaly' as const,
          severity: (t.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
          title: `${primaryReason} - ${t.assetName || t.trackId}`,
          region: getRegionNameByCoords(t.lat, t.lon),
          time: new Date(t.timestamp).getTime(),
        };
      }) ?? FALLBACK.recentIncidents;

    return {
      status,
      message: m
        ? `Live: tracking ${m.totalTracks ?? 0} assets across ${m.activeRegions ?? 0} regions.`
        : FALLBACK.message,
      globalMetrics,
      regionalMetrics: FALLBACK.regionalMetrics,
      recentIncidents,
      rawTraces: _tracesRes?.traces ?? [],
      briefing,
    };
  } catch {
    return {
      ...FALLBACK,
      rawTraces: [],
    };
  }
}

const omitRegion = <T extends { region: unknown }>(obj: T): Omit<T, 'region'> => {
  const { region: _region, ...rest } = obj;
  return rest;
};

export default function IntelligenceIndex() {
  const data = useLoaderData<typeof clientLoader>();
  const [selectedTrace, setSelectedTrace] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'gcc' | 'chokepoint' | 'high-risk'>('all');

  const liveMetrics = [
    {
      id: 'vessels',
      label: 'Active Vessels',
      value: data.globalMetrics.vessels,
      unit: '',
      color: 'primary' as const,
      trend: 'up' as const,
      change: 2.3,
    },
    {
      id: 'aircraft',
      label: 'Active Aircraft',
      value: data.globalMetrics.aircraft,
      unit: '',
      color: 'info' as const,
      trend: 'stable' as const,
      change: 0.2,
    },
    {
      id: 'anomalies',
      label: 'Active Anomalies',
      value: data.globalMetrics.anomalies,
      unit: '',
      color: 'danger' as const,
      trend: 'up' as const,
      change: 15,
    },
    {
      id: 'risk',
      label: 'Global Risk Index',
      value: data.globalMetrics.riskIndex,
      unit: '/100',
      color: 'warning' as const,
      trend: 'up' as const,
      change: 3,
    },
    {
      id: 'ais',
      label: 'AIS Messages/min',
      value: data.globalMetrics.aisRate,
      unit: '',
      color: 'primary' as const,
      trend: 'up' as const,
      change: 1.2,
    },
    {
      id: 'adsb',
      label: 'ADS-B Messages/min',
      value: data.globalMetrics.adsbRate,
      unit: '',
      color: 'info' as const,
      trend: 'up' as const,
      change: 0.8,
    },
  ];

  const filteredThreatCards = GULF_THREAT_CARDS.filter((card) => {
    if (activeFilter === 'gcc') return card.category === 'gcc';
    if (activeFilter === 'chokepoint') return card.category === 'chokepoint';
    if (activeFilter === 'high-risk') return card.riskScore >= 65;
    return true;
  });

  const regionalCards = [
    {
      region: 'Hormuz Strait',
      ...omitRegion(data.regionalMetrics.hormuz),
      href: '/intelligence/hormuz',
      riskColor: 'danger',
    },
    {
      region: 'Red Sea / Bab-el-Mandeb',
      ...omitRegion(data.regionalMetrics.redSea),
      href: '/intelligence/red-sea',
      riskColor: 'warning',
    },
    {
      region: 'Suez Canal',
      ...omitRegion(data.regionalMetrics.suez),
      href: '/intelligence/suez',
      riskColor: 'info',
    },
    {
      region: 'Persian Gulf',
      ...omitRegion(data.regionalMetrics.persianGulf),
      href: '/intelligence/persian-gulf',
      riskColor: 'warning',
    },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[var(--color-bg)] text-[var(--color-fg)]">
      {/* 50/50 Split Layout Container */}
      <div className="flex flex-col lg:flex-row w-full lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: Static / Pinned Gulf Threat Cards Grid (50%)    */}
        {/* ============================================================ */}
        <div className="w-full lg:w-1/2 lg:h-full lg:overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)]/30 p-4 sm:p-6 lg:p-8 space-y-6 shrink-0">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[var(--color-primary-600)]/15 text-[var(--color-primary-600)] border border-[var(--color-primary-600)]/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-600)] animate-pulse" />
                GULF THREAT COVERAGE
              </span>
              <span className="font-mono text-xs text-[var(--color-fg-muted)]">
                {GULF_THREAT_CARDS.length} Key Sectors
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-fg)]">
              Gulf Regional Threat Matrix
            </h1>
            <p className="mt-1 font-ui text-xs sm:text-sm text-[var(--color-fg-muted)]">
              Real-time threat status across Arabian Peninsula littoral states & tactical chokepoints.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)] overflow-x-auto">
            {[
              { id: 'all', label: 'All Gulf' },
              { id: 'chokepoint', label: 'Chokepoints' },
              { id: 'gcc', label: 'GCC States' },
              { id: 'high-risk', label: 'High Risk' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={cn(
                  'px-3 py-1 rounded-md font-ui text-xs font-medium transition-colors shrink-0',
                  activeFilter === tab.id
                    ? 'bg-[var(--color-primary-600)] text-white'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] border border-[var(--color-border)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Gulf Threat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredThreatCards.map((card) => (
              <div
                key={card.id}
                className="glass-card rounded-xl p-4 border border-[var(--color-border)] hover:border-[var(--color-primary-600)]/50 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{card.flag}</span>
                      <h3 className="font-display text-sm font-semibold text-[var(--color-fg)] truncate max-w-[140px]">
                        {card.name}
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--color-fg-muted)]">
                      {card.keyPortOrZone}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0',
                      card.riskLevel === 'critical' && 'bg-[var(--color-danger)]/20 text-[var(--color-danger)] border border-[var(--color-danger)]/30',
                      card.riskLevel === 'high' && 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
                      card.riskLevel === 'moderate' && 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/30',
                      card.riskLevel === 'nominal' && 'bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/30'
                    )}
                  >
                    RISK {card.riskScore}
                  </span>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-[var(--color-border)]/60 bg-[var(--color-bg)]/40 rounded-lg px-2 text-center">
                  <div>
                    <div className="font-mono text-xs font-bold text-[var(--color-fg)]">
                      {card.vessels}
                    </div>
                    <div className="font-ui text-[9px] text-[var(--color-fg-muted)] uppercase">Vessels</div>
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-[var(--color-fg)]">
                      {card.aircraft}
                    </div>
                    <div className="font-ui text-[9px] text-[var(--color-fg-muted)] uppercase">Aircraft</div>
                  </div>
                  <div>
                    <div
                      className={cn(
                        'font-mono text-xs font-bold',
                        card.anomalies > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-fg-muted)]'
                      )}
                    >
                      {card.anomalies}
                    </div>
                    <div className="font-ui text-[9px] text-[var(--color-fg-muted)] uppercase">Anomalies</div>
                  </div>
                </div>

                {/* Status footer */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-ui text-[var(--color-fg-muted)] truncate max-w-[150px]">
                    {card.navalStatus}
                  </span>
                  <span
                    className={cn(
                      'font-mono font-medium',
                      card.gpsInterference === 'Severe' && 'text-[var(--color-danger)]',
                      card.gpsInterference === 'High' && 'text-amber-500',
                      card.gpsInterference === 'Moderate' && 'text-[var(--color-warning)]',
                      card.gpsInterference === 'Low' && 'text-[var(--color-fg-muted)]'
                    )}
                  >
                    GPS: {card.gpsInterference}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Independently Scrollable Intelligence Feed (50%) */}
        {/* ============================================================ */}
        <div className="w-full lg:w-1/2 lg:h-full lg:overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8">
          {/* Header */}
          <div className="border-b border-[var(--color-border)] pb-4">
            <span className="font-mono text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">
              Real-Time Metrics & Assessment
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-fg)]">
              Intelligence Assessment Feed
            </h2>
          </div>

          {/* AI Analyst Briefing */}
          <Section
            id="ai-briefing"
            title="AI Analyst Briefing"
            subtitle="Natural language assessment powered by gpt-latest"
          >
            <div className="glass-card rounded-xl p-5 border border-[var(--color-border)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider',
                      data.briefing.source === 'ai'
                        ? 'bg-[var(--color-primary-600)]/20 text-[var(--color-primary-600)] border border-[var(--color-primary-600)]/30'
                        : 'bg-neutral-500/20 text-[var(--color-fg-muted)] border border-neutral-500/30'
                    )}
                  >
                    {data.briefing.source === 'ai' ? 'Live AI Analysis' : 'Fallback Advisory'}
                  </span>
                  <span className="text-xs text-[var(--color-fg-subtle)] font-mono">
                    Generated {new Date(data.briefing.generated_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-display text-xs font-semibold text-[var(--color-fg-subtle)] mb-1 uppercase tracking-wide">
                    Executive Summary
                  </h4>
                  <p className="font-ui text-sm text-[var(--color-fg)]/90 leading-relaxed">
                    {data.briefing.executive_summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[var(--color-border)]">
                  <div>
                    <h4 className="font-display text-xs font-semibold text-[var(--color-fg-subtle)] mb-2 uppercase tracking-wide">
                      Key Threat Factors
                    </h4>
                    <ul className="space-y-1.5">
                      {data.briefing.threat_analysis.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 font-ui text-xs text-[var(--color-fg-muted)]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)] mt-1 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-display text-xs font-semibold text-[var(--color-fg-subtle)] mb-2 uppercase tracking-wide">
                      Tactical Recommendations
                    </h4>
                    <ul className="space-y-1.5">
                      {data.briefing.tactical_recommendations.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 font-ui text-xs text-[var(--color-fg-muted)]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-600)] mt-1 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Global Metrics */}
          <Section
            id="global-metrics"
            title="Global Situational Awareness"
            subtitle="Real-time metrics updated via WebSocket"
          >
            <MetricGrid metrics={liveMetrics} columns={2} />
          </Section>

          {/* Regional Intelligence */}
          <Section
            id="regional"
            title="Strategic Regional Channels"
            subtitle="Deep-dive chokepoint intelligence"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {regionalCards.map(
                ({
                  region,
                  vessels,
                  aircraft,
                  riskScore,
                  href,
                  riskColor,
                }) => (
                  <Link
                    key={region}
                    to={href}
                    className="glass-card rounded-xl p-4 border border-[var(--color-border)] hover:border-[var(--color-primary-600)] transition-all group block"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display text-sm font-semibold text-[var(--color-fg)] group-hover:text-[var(--color-primary-600)] transition-colors flex items-center gap-1">
                          {region}
                          <span className="text-xs text-[var(--color-primary-600)] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </h3>
                        <p className="font-ui text-xs text-[var(--color-fg-muted)]">
                          Chokepoint monitoring
                        </p>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-mono font-medium',
                          riskColor === 'danger' && 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]',
                          riskColor === 'warning' && 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]',
                          riskColor === 'info' && 'bg-[var(--color-info)]/20 text-[var(--color-info)]',
                          riskColor === 'success' && 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                        )}
                      >
                        Risk: {riskScore}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 bg-[var(--color-bg-elevated)] rounded-lg">
                        <div className="font-mono font-bold text-[var(--color-fg)]">
                          {vessels.toLocaleString()}
                        </div>
                        <div className="font-ui text-[10px] text-[var(--color-fg-muted)]">Vessels</div>
                      </div>
                      <div className="p-2 bg-[var(--color-bg-elevated)] rounded-lg">
                        <div className="font-mono font-bold text-[var(--color-fg)]">{aircraft}</div>
                        <div className="font-ui text-[10px] text-[var(--color-fg-muted)]">Aircraft</div>
                      </div>
                    </div>
                  </Link>
                )
              )}
            </div>
          </Section>

          {/* Recent Incidents */}
          <Section
            id="incidents"
            title="Recent Incidents & Alerts"
            subtitle="Live threat event log"
          >
            <div className="space-y-2.5">
              {data.recentIncidents.map((incident: any) => (
                <div
                  key={incident.id}
                  onClick={() => {
                    const trace = data.rawTraces?.find((t: any) => t.trackId === incident.id);
                    if (trace) {
                      setSelectedTrace(trace);
                    }
                  }}
                  className="glass-card rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-primary-600)] transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        incident.severity === 'critical' && 'bg-[var(--color-danger)]',
                        incident.severity === 'high' && 'bg-amber-500',
                        incident.severity === 'medium' && 'bg-[var(--color-warning)]',
                        incident.severity === 'low' && 'bg-[var(--color-info)]'
                      )}
                    />
                    <div>
                      <h4 className="font-display text-xs font-semibold text-[var(--color-fg)]">
                        {incident.title}
                      </h4>
                      <p className="font-ui text-[11px] text-[var(--color-fg-muted)]">
                        {incident.region}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--color-fg-subtle)] shrink-0">
                    {formatRelative(incident.time)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {/* Selected Incident Drawer/Sheet */}
      {selectedTrace && (
        <BottomSheet open={!!selectedTrace} onClose={() => setSelectedTrace(null)}>
          <div className="space-y-4 p-4">
            <h3 className="font-display text-lg font-bold text-[var(--color-fg)]">
              Incident Details: {selectedTrace.assetName || selectedTrace.trackId}
            </h3>
            <p className="font-ui text-sm text-[var(--color-fg-muted)]">
              Severity: {selectedTrace.severity} | Anomaly Score: {selectedTrace.score}
            </p>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error('IntelligenceIndex error:', error);
  return (
    <div className="flex items-center justify-center min-h-[500px] text-[var(--color-danger)] flex-col gap-4">
      <h3 className="font-display text-xl font-semibold">Failed to load intelligence data</h3>
      <p className="font-ui text-body-sm">
        {error instanceof Error ? error.message : 'An unknown error occurred.'}
      </p>
    </div>
  );
}
