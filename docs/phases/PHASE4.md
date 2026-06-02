# Phase 4 – Advanced Threat Intelligence & Real-Time AI Briefings

## Objective

Build operational intelligence capabilities on top of the Azure production infrastructure deployed in Phase 3.

This phase transforms GeospatialOps AI from a data ingestion platform into an operational intelligence platform capable of generating real-time threat assessments and AI-powered briefings.

---

## Current State

At the end of Phase 3:

- Azure infrastructure deployed and operational
- Terraform automation complete
- Real telemetry flowing through Event Hubs
- Managed Identity and Key Vault secured
- Basic monitoring and alerting in place
- Frontend consuming SSE stream

---

## Phase 4 Goals

Move beyond:

"What is the current state?"

and begin answering:

"What is the threat?"

and

"What should operators do?"

---

# Threat Intelligence Engine Enhancement

## Multi-Factor Threat Scoring

Implement sophisticated threat assessment combining:

### Vessel Risk Factors

- AIS signal patterns (spoofing, loss, inconsistency)
- Route deviation from expected corridors
- Speed anomalies (too fast, too slow, stopped)
- Historical behavior patterns
- Flag state risk assessment
- Ship type classification (tanker, cargo, general, etc.)
- Vessel age and condition
- Port of registry risk profile
- Ownership and registered operator
- Insurance and compliance status

### Geographic Risk Factors

- Proximity to sensitive areas (military zones, infrastructure)
- Piracy history in region
- Current conflict zones
- Storm surge and weather hazards
- Shallow water and collision risk
- Traffic density and collision probability

### Temporal Risk Factors

- Time of day
- Seasonal patterns
- Historical incident timing
- Day of week patterns

### Behavioral Anomalies

- Loitering in restricted areas
- Course changes toward dangerous waters
- Unscheduled stops
- Unusual speed profiles
- Rendezvous patterns
- Following/trailing behavior

### Intelligence Integration

- GDELT news about vessel/company
- GDELT news about destination
- GDELT news about region
- Historical incidents involving similar vessels
- Sanctions list matching
- Watch list cross-reference

## Implementation

### Data Structure

Store threat assessment in Azure Storage:

```json
{
  "vessel_mmsi": 123456789,
  "timestamp": "2026-06-01T14:30:00Z",
  "overall_threat_score": 7.2,
  "threat_factors": {
    "ais_signal_quality": 0.8,
    "route_anomaly": 0.9,
    "speed_anomaly": 0.3,
    "geographic_risk": 0.6,
    "behavioral_risk": 0.7,
    "intelligence_match": 0.5
  },
  "confidence": 0.85,
  "active_alerts": [
    {
      "alert_type": "ROUTE_DEVIATION",
      "severity": "HIGH",
      "description": "Vessel deviating from expected shipping lane"
    }
  ],
  "last_updated": "2026-06-01T14:30:00Z"
}
```

### Engine Implementation

Implement in Node.js:

```typescript
// threat-engine.ts

interface VesselTelemetry {
  mmsi: number;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  timestamp: Date;
}

interface ThreatAssessment {
  vesselMmsi: number;
  overallScore: number;
  factors: Record<string, number>;
  activeAlerts: Alert[];
  confidence: number;
}

class ThreatEngine {
  async assessThreat(telemetry: VesselTelemetry): Promise<ThreatAssessment> {
    // Multi-factor assessment
  }

  async detectAnomalies(telemetry: VesselTelemetry[]): Promise<Alert[]> {
    // Real-time anomaly detection
  }

  async enrichWithIntelligence(
    assessment: ThreatAssessment,
  ): Promise<ThreatAssessment> {
    // GDELT, sanctions, watch lists
  }
}
```

---

# Azure OpenAI Integration

## AI Briefing Generation

Implement natural language briefing generation using Azure OpenAI GPT-4.

### Briefing Types

#### Executive Summary

Brief (2-3 sentences) high-level threat overview:

**Example:**

"One vessel showing elevated threat indicators in the Strait of Hormuz. AIS signal loss and course deviation detected. Recommend increased monitoring and possible intercept."

#### Threat Analysis

Detailed assessment of threat factors:

**Example:**

"Vessel X (Liberian flag) transiting through Strait showing multiple anomalies:

- AIS signal loss for 47 minutes (18:23-19:10 UTC)
- Course deviation 34° from expected corridor
- Speed reduction from 12.3 to 3.2 knots
- GDELT reports vessel linked to sanctions violations in 2024
- Confidence: 89%"

#### Tactical Recommendations

Actionable guidance for operators:

**Example:**

"Recommend:

1. Request radio contact via VHF Channel 16
2. Verify vessel identity and destination via IMO registry
3. Coordinate with coastal patrol for surveillance
4. Monitor AIS closely for signal resumption
5. Alert port authority at intended destination"

### Implementation

Store briefing prompts in Key Vault:

```
BRIEFING_SYSTEM_PROMPT="""You are a senior Geospatial intelligence analyst.
Analyze vessel telemetry and threat intelligence data.
Provide clear, actionable briefings for naval operators.
Be concise but comprehensive.
Highlight only the most critical information."""

EXECUTIVE_SUMMARY_PROMPT="""Based on the threat assessment below,
write a 2-3 sentence executive summary suitable for a commanding officer."""

THREAT_ANALYSIS_PROMPT="""Analyze the threat factors and provide a detailed
assessment explaining the intelligence findings and their significance."""
```

### Backend Service

Implement in Azure Functions:

```typescript
// briefing-service.ts

async function generateBriefing(
  threatAssessment: ThreatAssessment,
  briefingType: "executive" | "analysis" | "tactical",
): Promise<string> {
  const client = new OpenAIClient();

  const prompt = buildPrompt(threatAssessment, briefingType);

  const response = await client.getChatCompletions(
    "gpt-4",
    [
      { role: "system", content: BRIEFING_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    { maxTokens: 500, temperature: 0.7 },
  );

  return response.choices[0].message.content || "";
}

function buildPrompt(assessment: ThreatAssessment, type: string): string {
  return `
Vessel: ${assessment.vesselMmsi}
Threat Score: ${assessment.overallScore}/10
Confidence: ${assessment.confidence * 100}%

Threat Factors:
${Object.entries(assessment.factors)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

Active Alerts:
${assessment.activeAlerts
  .map((a) => `- [${a.severity}] ${a.alertType}: ${a.description}`)
  .join("\n")}

${getPromptForType(type)}
  `;
}
```

---

# Real-Time Dashboard Integration

## Dashboard Updates

### Threat Display

Add threat indicators to map:

- Color-coded threat levels (green, yellow, orange, red)
- Threat score badge on vessel markers
- Visual indicators for active alerts
- Trend indicator (improving/degrading)

### Sidebar Threat Panel

Display for selected vessel:

- Overall threat score with gauge
- Active alerts with severity
- Threat factor breakdown (chart)
- AI-generated briefing
- Historical threat trend
- Related vessels (formations, followers)

### Alert Timeline

Display temporal sequence of threats:

- Timeline of detected anomalies
- Alert escalation
- Intelligence matches
- Briefing updates

---

# Integration with Telemetry Data

## Real-Time Processing

### Event Hub Consumer

Process each vessel telemetry event:

1. Receive telemetry from Event Hub
2. Validate and normalize data
3. Assess threat score
4. Detect anomalies
5. Enrich with intelligence
6. Generate briefing if significant
7. Store assessment in Table Storage
8. Broadcast update via SSE

### Processing Pipeline

```
Event Hub (Telemetry)
    ↓
Azure Function (ProcessTelemetry)
    ├─ Validation
    ├─ Threat Assessment
    ├─ Anomaly Detection
    ├─ Intelligence Enrichment
    ├─ Storage Write
    └─ SSE Broadcast
```

## Latency Requirements

- Telemetry ingestion: < 100ms
- Threat assessment: < 500ms
- Intelligence enrichment: < 1s
- SSE broadcast: < 2s
- **Total end-to-end: < 3s**

---

# Historical Intelligence Storage

## Data Retention

Store all threat assessments for historical analysis:

### Immediate Access (30 days)

- Table Storage (hot tier)
- Indexed by vessel MMSI and timestamp
- Full threat detail

### Archive (12 months)

- Blob Storage (cool tier)
- Hourly aggregates
- Daily summaries
- Quarterly reports

### Purge

- Delete assessment details after 12 months
- Retain aggregate statistics indefinitely

## Schema

```sql
-- Table Storage: ThreatAssessments
PartitionKey: MMSI (for fast vessel lookup)
RowKey: Timestamp (for temporal queries)

Columns:
- overallScore (double)
- factors (JSON)
- alerts (JSON)
- briefing (string)
- confidence (double)
- gdeltMatches (JSON)
```

---

# GDELT Intelligence Integration

## Enhanced Integration

Move beyond simple news search to intelligent correlation:

### Correlation Logic

1. **Vessel-Based Search**
   - Vessel name, MMSI, flag state
   - Registered owner, operator
   - Recent port visits

2. **Location-Based Search**
   - Destination port, region
   - Piracy incidents in area
   - Military operations
   - Sanctions enforcement

3. **Temporal Correlation**
   - News within last 7 days
   - Seasonal patterns
   - Recent escalations

4. **Entity Extraction**
   - Key officials and organizations
   - Sanctions designations
   - Wanted persons
   - Known trafficking networks

### Briefing Integration

Cite GDELT intelligence in AI-generated briefings:

```
"GDELT reports from June 1:
- 23 articles mentioning Iran Geospatial sanctions
- 5 articles on Hormuz tension escalation
- Reports of increased IRGC naval activity

Vessel linked to previous sanctions violations (GDELT June 2025)"
```

---

# Aviation Threat Intelligence

## Aircraft Integration

Extend threat intelligence to aircraft:

### Risk Factors

- Unusual flight paths (military airspace, restricted zones)
- Altitude anomalies (too low, rapid descent)
- Speed anomalies
- Transponder loss or spoofing
- Proximity to vessels (Geospatial coordination)
- Historical patterns

### Briefing Generation

Generate briefings for:

- Coordinated vessel-aircraft activity
- Potential surveillance operations
- Search and rescue coordination
- Anomalous flight patterns

---

# Testing & Validation

## Unit Tests

```typescript
// threat-engine.test.ts

describe("ThreatEngine", () => {
  it("should detect loitering behavior", () => {
    // Test implementation
  });

  it("should correlate AIS gaps with spoofing", () => {
    // Test implementation
  });

  it("should enrich with GDELT intelligence", () => {
    // Test implementation
  });

  it("should generate threat scores", () => {
    // Test implementation
  });
});

// briefing-service.test.ts

describe("BriefingService", () => {
  it("should generate executive summary", () => {
    // Test implementation
  });

  it("should generate tactical recommendations", () => {
    // Test implementation
  });
});
```

## Integration Tests

- End-to-end telemetry to briefing
- Azure OpenAI API integration
- Event Hub to Dashboard
- Storage write verification
- SSE broadcast validation

## Performance Tests

- Threat assessment latency (< 500ms)
- Briefing generation latency (< 2s)
- End-to-end processing (< 3s)
- Concurrent vessel processing (100+ vessels)

---

# Monitoring & Observability

## Key Metrics

Track in Application Insights:

- **Threat Engine**
  - Assessment latency (p50, p95, p99)
  - Assessment count per minute
  - Anomaly detection rate
  - GDELT enrichment latency
  - Error rate

- **AI Briefings**
  - Generation latency
  - Token usage
  - Cost tracking
  - Error rate
  - Model response time

- **Data Quality**
  - Missing vessel data
  - Invalid threat scores
  - Stale intelligence
  - Intelligence enrichment failures

## Alerts

Create alerts for:

- Threat assessment failure
- Briefing generation failure
- Intelligence enrichment latency > 2s
- High threat score (> 8.0) on vessel
- Azure OpenAI quota exceeded
- GDELT API failures

---

# Cost Considerations

## Computational

- Azure Functions for threat assessment: ~$15/month
- Azure OpenAI API:
  - ~500 briefings/day × 200 tokens average
  - ~$25/month at current pricing

## Storage

- Threat assessments: ~50KB per vessel per day
- 500 vessels × 30 days × 50KB = 750MB
- Table Storage: ~$1/month
- Archive (Blob Cool): ~$0.50/month

## Total Estimated Monthly Cost

- **~$40-50/month** for threat intelligence and AI briefing components

---

# Success Criteria

Phase 4 is complete when:

✓ Multi-factor threat scoring operational

✓ Threat assessments generated in real-time

✓ GDELT intelligence integrated with scoring

✓ Azure OpenAI integration live

✓ Executive summary briefings generated

✓ Threat analysis briefings generated

✓ Tactical recommendation briefings generated

✓ Dashboard displays threat indicators

✓ Alert timeline functional

✓ Historical threat storage working

✓ End-to-end latency < 3 seconds

✓ Unit tests passing

✓ Integration tests passing

✓ Performance tests passing

✓ Monitoring and alerting operational

✓ Documentation updated

At completion, GeospatialOps AI becomes an operational intelligence platform capable of not just monitoring Geospatial activity, but assessing threats and recommending actions for naval operators.

---

# Transition to Phase 5

Upon completion of Phase 4:

✓ Real-time threat assessment operational

✓ AI briefing generation proven

✓ Intelligence integration validated

✓ Dashboard threat display working

Phase 5 will add:

- Historical trend analysis
- Predictive risk modeling
- Route deviation prediction
- Behavioral anomaly forecasting
- Risk escalation forecasting

This progression moves from **reactive** (Phase 4) to **predictive** (Phase 5) intelligence capabilities.
