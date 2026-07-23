package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"

	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf/v2"
)

// BriefingResponse is the structured response returned to the frontend.
type BriefingResponse struct {
	ExecutiveSummary        string   `json:"executive_summary"`
	ThreatAnalysis          []string `json:"threat_analysis"`
	TacticalRecommendations []string `json:"tactical_recommendations"`
	GeneratedAt             string   `json:"generated_at"`
	Source                  string   `json:"source"` // "ai" or "fallback"
}

type newsRow struct {
	Title   string
	Summary string
}

// GetBriefing handles the request to generate a situational intelligence briefing.
func GetBriefing(c *gin.Context) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" || apiKey == "your_openrouter_api_key" {
		log.Println("[Briefing] OPENROUTER_API_KEY is not configured. Returning fallback briefing.")
		c.JSON(http.StatusOK, getFallbackBriefing())
		return
	}

	// Fetch anomalies and news to build context
	anomalies := queryTopTraces()
	news := queryRecentNews()

	// Build LLM prompt
	prompt := buildBriefingPrompt(anomalies, news)

	// Call OpenRouter
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	briefing, err := callOpenRouter(ctx, apiKey, prompt)
	if err != nil {
		log.Printf("[Briefing] OpenRouter API call failed: %v. Returning fallback.", err)
		c.JSON(http.StatusOK, getFallbackBriefing())
		return
	}

	c.JSON(http.StatusOK, briefing)
}

type openRouterRequest struct {
	Model     string              `json:"model"`
	Messages  []openRouterMessage `json:"messages"`
	MaxTokens int                 `json:"max_tokens,omitempty"`
}

type openRouterMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openRouterResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

func callOpenRouter(ctx context.Context, apiKey string, prompt string) (*BriefingResponse, error) {
	reqBody := openRouterRequest{
		Model:     "google/gemini-2.5-flash",
		MaxTokens: 1500,
		Messages: []openRouterMessage{
			{
				Role: "system",
				Content: `You are a senior Geospatial intelligence analyst.
Analyze telemetry anomalies and news events to provide a concise, actionable briefing for naval operators.
You must output ONLY a valid JSON object matching the following structure, with no markdown formatting blocks (do not wrap in ` + "```json" + ` tags):
{
  "executive_summary": "2-3 sentences summarizing the overall regional threat landscape.",
  "threat_analysis": ["bullet point 1", "bullet point 2", ...],
  "tactical_recommendations": ["recommendation 1", "recommendation 2", ...]
}`,
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP error %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var orResp openRouterResponse
	if err := json.Unmarshal(bodyBytes, &orResp); err != nil {
		return nil, err
	}

	if orResp.Error.Message != "" {
		return nil, fmt.Errorf("OpenRouter error: %s", orResp.Error.Message)
	}

	if len(orResp.Choices) == 0 {
		return nil, fmt.Errorf("empty choices returned")
	}

	content := orResp.Choices[0].Message.Content
	// Strip markdown blocks if present (in case the model ignores the instruction)
	content = cleanJsonMarkdown(content)

	var briefing BriefingResponse
	if err := json.Unmarshal([]byte(content), &briefing); err != nil {
		return nil, fmt.Errorf("failed to parse AI response as JSON: %w (content: %s)", err, content)
	}

	briefing.GeneratedAt = time.Now().UTC().Format(time.RFC3339)
	briefing.Source = "ai"
	return &briefing, nil
}

func cleanJsonMarkdown(content string) string {
	content = strings.ReplaceAll(content, "```json", "")
	content = strings.ReplaceAll(content, "```", "")
	return strings.TrimSpace(content)
}

func queryRecentNews() []newsRow {
	query := `
		SELECT title, summary 
		FROM news 
		ORDER BY pub_date DESC 
		LIMIT 5
	`
	rows, err := db.DB.Query(query)
	if err != nil {
		log.Printf("[Briefing] Failed to query news: %v", err)
		return nil
	}
	defer rows.Close()

	var news []newsRow
	for rows.Next() {
		var n newsRow
		if err := rows.Scan(&n.Title, &n.Summary); err == nil {
			news = append(news, n)
		}
	}
	return news
}

func buildBriefingPrompt(anomalies []TopTrace, news []newsRow) string {
	var builder strings.Builder
	builder.WriteString("Please analyze the following situational data and generate the intelligence briefing.\n\n")

	builder.WriteString("Recent Telemetry Anomalies:\n")
	if len(anomalies) == 0 {
		builder.WriteString("- No notable anomalies detected.\n")
	} else {
		for _, a := range anomalies {
			builder.WriteString(fmt.Sprintf("- Vessel/Aircraft: %s (Track ID: %s), Anomaly Score: %.1f, Severity: %s, Reasons: %s\n",
				a.AssetName, a.TrackID, a.Score, a.Severity, a.Reasons))
		}
	}

	builder.WriteString("\nRecent Geopolitical News Events:\n")
	if len(news) == 0 {
		builder.WriteString("- No recent news reports found.\n")
	} else {
		for _, n := range news {
			builder.WriteString(fmt.Sprintf("- Title: %s. Summary: %s\n", n.Title, n.Summary))
		}
	}

	builder.WriteString("\nReturn the analysis in the JSON structure specified.")
	return builder.String()
}

func getFallbackBriefing() *BriefingResponse {
	return &BriefingResponse{
		ExecutiveSummary: "Geopolitical risk indicators show elevated traffic density in the Strait of Hormuz. Normal operational baseline is maintained across chokepoints with no critical security interdictions reported in the last 24 hours.",
		ThreatAnalysis: []string{
			"AIS transponder signal gaps detected on multiple merchant vessels transiting the Northern Basin.",
			"GDELT events index shows moderate activity near Farsi Island, typical of current routine naval patrols.",
			"No coordinate match anomalies reported within exclusion zones.",
		},
		TacticalRecommendations: []string{
			"Maintain standard surveillance posture across primary chokepoints and restricted watch zones.",
			"Coordinate with local maritime information centers to verify any unexpected AIS dropouts.",
			"Ensure search and rescue teams remain on standby for high-density shipping lanes.",
		},
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Source:      "fallback",
	}
}

// ============================================================
// Detailed Intelligence Report Generation (JSON + PDF)
// ============================================================

// ReportSection represents a section in the detailed intelligence report
type ReportSection struct {
	Title   string   `json:"title"`
	Content []string `json:"content"`
}

// DetailedReport is the full structured report returned to the frontend
type DetailedReport struct {
	ReportID         string          `json:"report_id"`
	Title            string          `json:"title"`
	Classification   string          `json:"classification"`
	GeneratedAt      string          `json:"generated_at"`
	Source           string          `json:"source"` // "ai" or "fallback"
	PeriodCovered    string          `json:"period_covered"`
	ExecutiveSummary string          `json:"executive_summary"`
	Sections         []ReportSection `json:"sections"`
	Appendices       []string        `json:"appendices"`
}

// GetDetailedReport generates a comprehensive 5-6 page intelligence report
func GetDetailedReport(c *gin.Context) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" || apiKey == "your_openrouter_api_key" {
		log.Println("[DetailedReport] OPENROUTER_API_KEY is not configured. Returning fallback report.")
		c.JSON(http.StatusOK, getFallbackDetailedReport())
		return
	}

	// Fetch current telemetry data
	anomalies := queryTopTraces()
	news := queryRecentNews()
	metrics := queryBriefingMetrics()

	// Build comprehensive prompt
	prompt := buildDetailedReportPrompt(anomalies, news, metrics)

	// Call OpenRouter
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	report, err := callOpenRouterForReport(ctx, apiKey, prompt)
	if err != nil {
		log.Printf("[DetailedReport] OpenRouter API call failed: %v. Returning fallback.", err)
		c.JSON(http.StatusOK, getFallbackDetailedReport())
		return
	}

	c.JSON(http.StatusOK, report)
}

// GetDetailedReportPDF generates and returns a PDF version of the detailed report
func GetDetailedReportPDF(c *gin.Context) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" || apiKey == "your_openrouter_api_key" {
		log.Println("[DetailedReportPDF] OPENROUTER_API_KEY is not configured. Generating fallback PDF.")
		report := getFallbackDetailedReport()
		anomalies := queryTopTraces()
		metrics := queryBriefingMetrics()

		// Try LaTeX PDF generation first
		latexStr, err := generateReportLaTeX(report, anomalies, metrics)
		if err == nil {
			pdfBytes, err := compileLaTeXToPDF(latexStr)
			if err == nil {
				servePDF(c, pdfBytes, "HormuzWatch_Intelligence_Report_Fallback.pdf")
				return
			}
			log.Printf("[DetailedReportPDF] LaTeX compilation failed: %v. Falling back to gofpdf.", err)
		} else {
			log.Printf("[DetailedReportPDF] LaTeX generation failed: %v. Falling back to gofpdf.", err)
		}

		pdfBytes, err := generateReportPDF(report)
		if err != nil {
			c.String(http.StatusInternalServerError, "Failed to generate PDF: %v", err)
			return
		}
		servePDF(c, pdfBytes, "HormuzWatch_Intelligence_Report_Fallback.pdf")
		return
	}

	anomalies := queryTopTraces()
	news := queryRecentNews()
	metrics := queryBriefingMetrics()

	prompt := buildDetailedReportPrompt(anomalies, news, metrics)

	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	report, err := callOpenRouterForReport(ctx, apiKey, prompt)
	if err != nil {
		log.Printf("[DetailedReportPDF] OpenRouter API call failed: %v. Using fallback.", err)
		report = getFallbackDetailedReport()
	}

	// Try LaTeX PDF generation first
	latexStr, err := generateReportLaTeX(report, anomalies, metrics)
	if err == nil {
		pdfBytes, err := compileLaTeXToPDF(latexStr)
		if err == nil {
			filename := fmt.Sprintf("HormuzWatch_Intelligence_Report_%s.pdf", time.Now().UTC().Format("20060102_150405"))
			servePDF(c, pdfBytes, filename)
			return
		}
		log.Printf("[DetailedReportPDF] LaTeX compilation failed: %v. Falling back to gofpdf.", err)
	} else {
		log.Printf("[DetailedReportPDF] LaTeX generation failed: %v. Falling back to gofpdf.", err)
	}

	pdfBytes, err := generateReportPDF(report)
	if err != nil {
		c.String(http.StatusInternalServerError, "Failed to generate PDF: %v", err)
		return
	}

	filename := fmt.Sprintf("HormuzWatch_Intelligence_Report_%s.pdf", time.Now().UTC().Format("20060102_150405"))
	servePDF(c, pdfBytes, filename)
}

// servePDF sends the PDF as a downloadable file
func servePDF(c *gin.Context, pdfBytes []byte, filename string) {
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Length", fmt.Sprintf("%d", len(pdfBytes)))
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

type detailedReportResponse struct {
	ReportID         string          `json:"report_id"`
	Title            string          `json:"title"`
	Classification   string          `json:"classification"`
	GeneratedAt      string          `json:"generated_at"`
	Source           string          `json:"source"`
	PeriodCovered    string          `json:"period_covered"`
	ExecutiveSummary string          `json:"executive_summary"`
	Sections         []ReportSection `json:"sections"`
	Appendices       []string        `json:"appendices"`
}

func callOpenRouterForReport(ctx context.Context, apiKey string, prompt string) (*DetailedReport, error) {
	reqBody := openRouterRequest{
		Model:     "google/gemini-2.5-flash",
		MaxTokens: 3500,
		Messages: []openRouterMessage{
			{
				Role: "system",
				Content: `You are a senior Geospatial Intelligence Analyst producing a formal Intelligence Assessment Report for naval and maritime security commanders.
Generate a comprehensive, structured intelligence report covering the Gulf region (Persian Gulf, Strait of Hormuz, Gulf of Oman, Red Sea/Bab-el-Mandeb).
The report must be 5-6 pages equivalent in detail and follow standard intelligence documentation standards.

You MUST output ONLY a valid JSON object matching this exact structure, with NO markdown formatting:
{
  "report_id": "HW-INT-YYYYMMDD-HHMMSS",
  "title": "HormuzWatch Regional Intelligence Assessment",
  "classification": "UNCLASSIFIED//FOR OFFICIAL USE ONLY",
  "generated_at": "ISO8601 timestamp",
  "source": "ai",
  "period_covered": "Last 24 hours",
  "executive_summary": "3-4 paragraph executive summary covering overall threat posture, key flashpoints, and strategic implications",
  "sections": [
    {"title": "1. Strategic Overview", "content": ["paragraph1", "paragraph2", "paragraph3"]},
    {"title": "2. Maritime Domain Analysis", "content": ["paragraph1", "paragraph2", "paragraph3"]},
    {"title": "3. Aviation Domain Analysis", "content": ["paragraph1", "paragraph2", "paragraph3"]},
    {"title": "4. Geopolitical Threat Assessment", "content": ["paragraph1", "paragraph2", "paragraph3"]},
    {"title": "5. Anomaly & Pattern Analysis", "content": ["paragraph1", "paragraph2", "paragraph3"]},
    {"title": "6. Outlook & Tactical Recommendations", "content": ["paragraph1", "paragraph2", "paragraph3", "paragraph4"]}
  ],
  "appendices": ["Appendix A: Data Sources & Methodology", "Appendix B: Anomaly Scoring Framework", "Appendix C: Watch Zone Definitions", "Appendix D: Acronyms & Abbreviations"]
}

Each section content array should contain 3-4 detailed paragraphs. Write in formal intelligence style: objective, evidence-based, qualified assessments. Use standard intelligence terminology (INDICATE, ASSESS, LIKELY, UNLIKELY).`,
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP error %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var orResp openRouterResponse
	if err := json.Unmarshal(bodyBytes, &orResp); err != nil {
		return nil, err
	}

	if orResp.Error.Message != "" {
		return nil, fmt.Errorf("OpenRouter error: %s", orResp.Error.Message)
	}

	if len(orResp.Choices) == 0 {
		return nil, fmt.Errorf("empty choices returned")
	}

	content := orResp.Choices[0].Message.Content
	content = cleanJsonMarkdown(content)

	var reportResp detailedReportResponse
	if err := json.Unmarshal([]byte(content), &reportResp); err != nil {
		return nil, fmt.Errorf("failed to parse AI response as JSON: %w (content: %s)", err, content)
	}

	return &DetailedReport{
		ReportID:         reportResp.ReportID,
		Title:            reportResp.Title,
		Classification:   reportResp.Classification,
		GeneratedAt:      reportResp.GeneratedAt,
		Source:           reportResp.Source,
		PeriodCovered:    reportResp.PeriodCovered,
		ExecutiveSummary: reportResp.ExecutiveSummary,
		Sections:         reportResp.Sections,
		Appendices:       reportResp.Appendices,
	}, nil
}

func buildDetailedReportPrompt(anomalies []TopTrace, news []newsRow, metrics *PublicMetrics) string {
	var builder strings.Builder
	builder.WriteString("Generate a comprehensive HormuzWatch Regional Intelligence Assessment Report.\n\n")

	builder.WriteString("CURRENT TELEMETRY SNAPSHOT:\n")
	if metrics != nil {
		builder.WriteString(fmt.Sprintf("- Total Active Tracks: %d (Maritime: %d, Aviation: %d)\n", metrics.TotalTracks, metrics.MaritimeCount, metrics.AviationCount))
		builder.WriteString(fmt.Sprintf("- Anomaly Distribution: Critical: %d, High: %d, Medium: %d, Low: %d\n", metrics.CriticalCount, metrics.HighCount, metrics.MediumCount, metrics.LowCount))
		builder.WriteString(fmt.Sprintf("- Average Anomaly Score: %.1f/100\n", metrics.AvgScore))
		builder.WriteString(fmt.Sprintf("- Active Watch Zones: %d\n", metrics.ActiveRegions))
	}
	builder.WriteString("\n")

	builder.WriteString("RECENT TELEMETRY ANOMALIES (Top 10):\n")
	if len(anomalies) == 0 {
		builder.WriteString("- No notable anomalies detected in current cycle.\n")
	} else {
		for _, a := range anomalies {
			builder.WriteString(fmt.Sprintf("- Track: %s (%s) | Score: %.1f | Severity: %s | Lat: %.4f Lon: %.4f | Speed: %.1f kts | Heading: %.0f° | Reasons: %s\n",
				a.AssetName, a.TrackID, a.Score, a.Severity, a.Lat, a.Lon, a.Speed, a.Heading, a.Reasons))
		}
	}
	builder.WriteString("\n")

	builder.WriteString("RECENT GEOPOLITICAL NEWS EVENTS:\n")
	if len(news) == 0 {
		builder.WriteString("- No recent news reports found in database.\n")
	} else {
		for _, n := range news {
			builder.WriteString(fmt.Sprintf("- Title: %s | Summary: %s\n", n.Title, n.Summary))
		}
	}
	builder.WriteString("\n")

	builder.WriteString("WATCH ZONES FOR ANALYSIS:\n")
	builder.WriteString("1. Strait of Hormuz (55.0-56.5°E, 25.5-27.5°N) - Primary chokepoint\n")
	builder.WriteString("2. Persian Gulf North (50.0-55.0°E, 27.5-30.5°N) - Oil terminals, naval bases\n")
	builder.WriteString("3. Gulf of Oman (56.5-60.0°E, 23.0-26.0°N) - Transit corridor to Arabian Sea\n")
	builder.WriteString("4. Red Sea - Bab-el-Mandeb (42.5-43.5°E, 12.0-13.5°N) - Houthi conflict zone\n")
	builder.WriteString("5. Red Sea North - Gulf of Aqaba to Jeddah (35.0-40.0°E, 20.0-28.0°N)\n\n")

	builder.WriteString("REPORT REQUIREMENTS:\n")
	builder.WriteString("- 5-6 main analytical sections plus appendices\n")
	builder.WriteString("- Each section: 3-4 detailed paragraphs\n")
	builder.WriteString("- Formal intelligence writing style (INDICATE/ASSESS/LIKELY)\n")
	builder.WriteString("- Reference specific anomaly data, geospatial coordinates, and news events\n")
	builder.WriteString("- Include tactical recommendations for naval/maritime operators\n")
	builder.WriteString("- Output ONLY valid JSON per the specified structure\n")

	return builder.String()
}

func queryBriefingMetrics() *PublicMetrics {
	m := queryPublicMetrics()
	return &m
}

func getFallbackDetailedReport() *DetailedReport {
	now := time.Now().UTC()
	return &DetailedReport{
		ReportID:         fmt.Sprintf("HW-INT-%s", now.Format("20060102-150405")),
		Title:            "HormuzWatch Regional Intelligence Assessment",
		Classification:   "UNCLASSIFIED//FOR OFFICIAL USE ONLY",
		GeneratedAt:      now.Format(time.RFC3339),
		Source:           "fallback",
		PeriodCovered:    "Last 24 hours (fallback data)",
		ExecutiveSummary: "Geopolitical risk indicators across the Gulf region show elevated but stable activity within established baselines. The Strait of Hormuz continues to experience high commercial traffic density with routine naval patrol patterns observed. No critical security interdictions or coordinate-match anomalies within exclusion zones have been reported in the last 24 hours. The Red Sea Bab-el-Mandeb corridor remains an active conflict zone with persistent Houthi anti-ship missile and USV threats to commercial shipping; coalition patrol posture is assessed as SUSTAINED. Overall regional threat posture is assessed as ELEVATED BUT MANAGEABLE with standard surveillance protocols sufficient at this time.",
		Sections: []ReportSection{
			{
				Title: "1. Strategic Overview",
				Content: []string{
					"The Gulf region strategic environment remains characterized by persistent great-power competition, regional proxy conflicts, and critical energy chokepoint vulnerabilities. The Strait of Hormuz, through which approximately 20% of global petroleum liquids transit, continues to function as the primary maritime flashpoint. Current intelligence indicates no imminent disruption to freedom of navigation, though the underlying structural risks—Iranian asymmetric capabilities, Yemeni Houthi Red Sea campaign, and GCC-Iran tensions—remain latent.",
					"Maritime traffic analysis over the reporting period shows vessel transit patterns consistent with seasonal norms. AIS data indicates 85-90% compliance with standard traffic separation schemes in the Strait. Notable exceptions include periodic AIS darkening by vessels transiting near Farsi Island and the Larak Island approaches, assessed as LIKELY routine operational security measures by Iranian naval and IRGCN assets rather than hostile intent.",
					"Aviation activity in the Gulf remains elevated with routine GCC air defense patrols, US CENTCOM ISR orbits, and commercial carrier overflights. No airspace violations or unsafe intercepts reported. The establishment of deconfliction channels between regional actors appears to be FUNCTIONING, reducing miscalculation risk in congested airspace.",
					"Strategic outlook: The probability of a major chokepoint closure event in the next 30 days is assessed as LOW (<15%). However, the probability of localized kinetic incidents (warning shots, USV swarms, missile flyovers) remains MODERATE (35-45%), particularly in the Red Sea and northern Strait approaches.",
				},
			},
			{
				Title: "2. Maritime Domain Analysis",
				Content: []string{
					"Maritime surface picture shows approximately 450-520 active AIS-emitting vessels across the AOR at any given time. Traffic composition: 60% tankers (crude/products/LPG), 25% bulk/general cargo, 10% naval/coast guard, 5% fishing/other. The Northern Persian Gulf approaches to Kharg Island, Mina Al-Ahmadi, and Jubail show the highest density with 80+ vessels in anchorage/approach at peak.",
					"Anomaly detection algorithms flagged 12 vessels with behavioral deviations exceeding the 70/100 threshold in the last 24 hours. Primary anomaly drivers: (1) AIS gap duration >4 hours (5 vessels), (2) Course deviation >45° from filed route (4 vessels), (3) Speed anomalies inconsistent with vessel class (3 vessels). Geospatial clustering analysis shows 7 of 12 anomalies concentrated in the Strait of Hormuz TSS separation zone, consistent with known congestion-induced behavioral variations rather than hostile action.",
					"IRGCN and Iranian Navy surface activity assessed as ROUTINE: 6-8 fast attack craft (FAC) patrols daily in northern Strait, 2-3 Sahand/Sahand-class frigates rotating in Bandar Abbas. No concentration of naval assets near commercial anchorages observed. UAE and Saudi naval patrols maintain presence in southern Gulf; US 5th Fleet surface combatants operating in Gulf of Oman/Northern Arabian Sea.",
					"Sub-surface: No confirmed LOW confidence assessment. Iranian KILO-class SSK deployments typically surge during heightened tensions; current SIGINT/OSINT indicators do not suggest sortie. Recommend continued acoustic monitoring at choke points.",
				},
			},
			{
				Title: "3. Aviation Domain Analysis",
				Content: []string{
					"Air domain activity tracks approximately 180-220 ADS-B/Mode-S contacts across the Gulf AOR. Composition: 55% commercial airliners (Emirates, Qatar, Etihad, Gulf Air, flydubai, Saudi Arabian), 25% business/private, 15% military/state (C-130, P-8, E-3, F-15/16/18, Mirage, Typhoon, Rafale), 5% rotary-wing (SAR, utility, naval).",
					"Military aviation pattern analysis: US CENTCOM P-8A Poseidon ISR orbits observed daily over Gulf of Oman and northern Arabian Sea (3-4 sorties/24hr). GCC F-15/F-16 CAP rotations over critical infrastructure (Ras Tanura, Abqaiq, Jebel Ali, Fujairah). Iranian F-4/F-14/MiG-29 sorties from Bushehr/Tabriz assessed as training/readiness. No radar-lock or fire-control illuminations reported on commercial traffic.",
					"Regional air defense posture: UAE (THAAD/PAC-3), Saudi (PAC-2/3, THAAD), Qatar (PAC-3, NASAMS), Bahrain (PAC-3) maintain 24/7 alert status. Integrated air picture sharing via GCC Shield and bilateral US-GCC links assessed as OPERATIONAL. Deconfliction with Iranian civil aviation (Tehran FIR) remains via ICAO standard procedures; no NOTAM anomalies.",
					"Risk to civil aviation: Assessed as LOW in Gulf proper; MODERATE in Red Sea/Yemen airspace due to Houthi SAM/AAA capability (SA-2/SA-6 derivatives, MANPADS). Carriers advised to maintain FL320+ over Yemen landmass and Bab-el-Mandeb corridor.",
				},
			},
			{
				Title: "4. Geopolitical Threat Assessment",
				Content: []string{
					"Iran: Strategic posture remains CALCULATED AMBIGUITY. Supreme Leader public statements emphasize 'resistance economy' and deterrence without direct confrontation. IRGCN asymmetric capabilities (FAC swarms, ASCMs, naval mines, USVs, UAVs) remain the primary kinetic threat to commercial shipping. Nuclear program escalation (60% enrichment, advanced centrifuges) increases diplomatic pressure but has not translated to maritime escalation. ASSESS: Iran LIKELY to maintain gray-zone pressure (harassment, seizures, AIS spoofing) rather than kinetic closure.",
					"Yemen/Houthi: Red Sea campaign ENTERING 18TH MONTH. Houthi capability to threaten shipping in Bab-el-Mandeb and southern Red Sea assessed as DEGRADED BUT RESILIENT. Coalition strikes (US/UK Operation PROSPERITY GUARDIAN, EU ASPIDES) have reduced launch platform availability but not eliminated inventory. Recent shift to UAV/USV swarms indicates adaptation. ASSESS: Houthi attacks on commercial shipping LIKELY TO CONTINUE at 2-4 incidents/week through 2024, with periodic surge attempts.",
					"GCC Unity: Saudi-UAE-Qatar coordination on maritime security improved post-Al-Ula. Joint exercises (GULF SHIELD, PEARL OF THE GULF) demonstrate interoperability. However, bilateral Iran engagement (Saudi-Iran rapprochement, UAE-Iran trade) creates strategic divergence. ASSESS: GCC collective maritime security framework FUNCTIONAL but not INTEGRATED; national responses likely to precede collective action.",
					"Extra-regional: US 5th Fleet/CENTCOM posture SUSTAINED. UK/France EU ASPIDES contribution MODERATE. China/Russia/India naval port calls (Bandar Abbas, Jask, Chabahar) signal great-power interest but no operational commitment to Gulf security architecture. ASSESS: No external power likely to intervene kinetically absent direct attack on flagged shipping.",
				},
			},
			{
				Title: "5. Anomaly & Pattern Analysis",
				Content: []string{
					"Statistical analysis of 30-day anomaly trends reveals cyclical patterns correlating with: (1) Lunar/tidal cycles affecting small craft activity in northern Gulf, (2) Friday/weekend reduced commercial traffic increasing anomaly false-positive rate, (3) Ramadan/seasonal schedule shifts. Current 24-hour anomaly count (12 >70 threshold) falls within 1-sigma of 30-day mean (μ=10.4, σ=3.2).",
					"Geospatial clustering (DBSCAN, ε=15nm, MinPts=3) identifies two persistent anomaly hotspots: (A) Strait TSS separation zone (26.55°N, 56.25°E) — congestion-induced course/speed variations, 65% of anomalies; (B) Farsi Island approaches (26.75°N, 53.45°E) — IRGCN patrol interaction zone, 25% of anomalies. Both assessed as ENVIRONMENTAL/OPERATIONAL not HOSTILE.",
					"Vessel-specific pattern: 3 vessels (IMO 9XXXXXX, 9XXXXXX, 9XXXXXX) show recurring AIS gaps >6hrs in same geofence over 14 days. Behavioral signature consistent with: (1) Iranian-flagged tankers conducting STS transfers, (2) sanctions-evading 'dark fleet' operations. RECOMMEND: Add to watchlist for enhanced monitoring; coordinate with UKMTO/IMB for verification.",
					"Emerging pattern: Increased UAV/loitering munition radar returns near Abu Musa/Tunb Islands (detected by coastal radar gaps). Correlates with Iranian Mohajer-6/Shahed-129 activity. While not directly threatening commercial shipping, INDICATES enhanced ISR posture. Monitor for spillover into TSS.",
				},
			},
			{
				Title: "6. Outlook & Tactical Recommendations",
				Content: []string{
					"30-Day Outlook: BASELINE SCENARIO (60% probability) — Status quo maintained. Routine IRGCN harassment (warning shots, close approaches, temporary seizures) continues at 2-3 incidents/week. Houthi Red Sea attacks persist at current tempo. No chokepoint closure. ESCALATION SCENARIO (25%) — Israeli/Iran direct exchange triggers IRGCN mining/swarm surge in Strait; shipping insurance rates spike 300%+; transit delays 7-14 days. DE-ESCALATION SCENARIO (15%) — Diplomatic breakthrough reduces gray-zone activity; anomaly rates return to 2022 baseline.",
					"IMMEDIATE TACTICAL RECOMMENDATIONS: (1) COMMERCIAL SHIPPING: Maintain AIS ON in TSS; report IRGCN interactions to UKMTO within 30 min; transit Strait in daylight where practicable; embark armed guards for Red Sea transit. (2) NAVAL FORCES: Sustain 24/7 surface presence in Strait TSS; pre-position mine countermeasures (MCM) assets at Fujairah/Mina Salman; maintain P-8 ISR surge capacity. (3) SHORE-BASED: Enhance coastal radar fusion (UAE/Qatar/Bahrain/Kuwait) for UAV detection; activate GCC Shield maritime data-sharing protocol.",
					"OPERATIONAL PLANNING CONSIDERATIONS: (A) CONTINGENCY: Develop Strait closure reroute plans (Cape of Good Hope +14 days, Cape Horn +21 days) with charter market engagement. (B) INTELLIGENCE: Prioritize collection on Iranian mine-laying platforms (Shahid Behesti-class, IRGCN aux); Houthi UAV/USV launch sites (Hudaydah, Salif, Ras Isa). (C) DIPLOMATIC: Support UN/OIC/IMO mediation tracks; maintain deconfliction channels with IRGCN via Swiss protecting power.",
					"FORCE PROTECTION: All coalition assets in AOR maintain THREATCON BRAVO. Review ROE for UAV/USV swarm engagement. Ensure CIWS/SEARAM magazines at 100%. Conduct quarterly strait transit exercises with commercial shipping volunteers.",
				},
			},
		},
		Appendices: []string{
			"Appendix A: Data Sources & Methodology — AIS (MarineTraffic/Spire/Kystverket), ADS-B (OpenSky/ADSBx), GDELT v2.0, NASA FIRMS, Open-Meteo, UKMTO/IMB/EU NAVFOR advisories, OSINT. Anomaly scoring: Isolation Forest + LOF ensemble, isotonic calibration, 0-100 scale.",
			"Appendix B: Anomaly Scoring Framework — CRITICAL ≥80 (Immediate threat, kinetic action probable); HIGH 60-79 (Significant deviation, enhanced monitoring); MEDIUM 40-59 (Behavioral anomaly, investigate); LOW <40 (Baseline variance, log only). Factors: AIS gaps, course/speed deviation, proximity to restricted zones, pattern-of-life violation.",
			"Appendix C: Watch Zone Definitions — Z1 Strait of Hormuz TSS (55.0-56.5°E, 25.5-27.5°N); Z2 Persian Gulf North (50.0-55.0°E, 27.5-30.5°N); Z3 Gulf of Oman (56.5-60.0°E, 23.0-26.0°N); Z4 Red Sea Bab-el-Mandeb (42.5-43.5°E, 12.0-13.5°N); Z5 Red Sea North (35.0-40.0°E, 20.0-28.0°N).",
			"Appendix D: Acronyms — AIS: Automatic Identification System; ADS-B: Automatic Dependent Surveillance-Broadcast; ASCM: Anti-Ship Cruise Missile; CAP: Combat Air Patrol; FAC: Fast Attack Craft; FIR: Flight Information Region; GDELT: Global Database of Events, Language, and Tone; IRGCN: Islamic Revolutionary Guard Corps Navy; ISR: Intelligence, Surveillance, Reconnaissance; MCM: Mine Countermeasures; NOTAM: Notice to Airmen; OSINT: Open-Source Intelligence; ROE: Rules of Engagement; SAM: Surface-to-Air Missile; SIGINT: Signals Intelligence; SSK: Diesel-Electric Submarine; STS: Ship-to-Ship Transfer; TSS: Traffic Separation Scheme; UAV: Unmanned Aerial Vehicle; USV: Unmanned Surface Vehicle.",
		},
	}
}

// generateReportPDF creates a professional PDF from the detailed report
func generateReportPDF(report *DetailedReport) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.SetAutoPageBreak(true, 20)

	// Fallback to built-in fonts if download fails
	pdf.SetFont("Helvetica", "", 10)

	// Cover page
	pdf.AddPage()
	generateCoverPage(pdf, report)

	// Table of Contents
	pdf.AddPage()
	generateTOC(pdf, report)

	// Executive Summary
	pdf.AddPage()
	generateSection(pdf, "EXECUTIVE SUMMARY", report.ExecutiveSummary, true)

	// Main sections
	for _, section := range report.Sections {
		pdf.AddPage()
		generateSection(pdf, section.Title, strings.Join(section.Content, "\n\n"), false)
	}

	// Appendices
	for _, appendix := range report.Appendices {
		pdf.AddPage()
		generateSection(pdf, appendix, "", false)
	}

	// Output to bytes
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	return buf.Bytes(), err
}

func generateCoverPage(pdf *gofpdf.Fpdf, report *DetailedReport) {
	pdf.SetFont("Helvetica", "B", 28)
	pdf.Ln(40)
	pdf.CellFormat(0, 15, "HORMUZWATCH", "", 1, "C", false, 0, "")
	pdf.Ln(5)
	pdf.SetFont("Helvetica", "", 18)
	pdf.CellFormat(0, 10, "Regional Intelligence Assessment", "", 1, "C", false, 0, "")
	pdf.Ln(15)

	pdf.SetFont("Helvetica", "", 12)
	pdf.CellFormat(0, 8, fmt.Sprintf("Report ID: %s", report.ReportID), "", 1, "C", false, 0, "")
	pdf.CellFormat(0, 8, fmt.Sprintf("Classification: %s", report.Classification), "", 1, "C", false, 0, "")
	pdf.CellFormat(0, 8, fmt.Sprintf("Period Covered: %s", report.PeriodCovered), "", 1, "C", false, 0, "")
	pdf.CellFormat(0, 8, fmt.Sprintf("Generated: %s", report.GeneratedAt), "", 1, "C", false, 0, "")
	pdf.CellFormat(0, 8, fmt.Sprintf("Source: %s", strings.ToUpper(report.Source)), "", 1, "C", false, 0, "")

	pdf.Ln(20)
	pdf.SetFont("Helvetica", "I", 10)
	pdf.CellFormat(0, 6, "Maritime Domain Awareness | Geospatial Intelligence | Anomaly Detection", "", 1, "C", false, 0, "")
	pdf.CellFormat(0, 6, "Persian Gulf | Strait of Hormuz | Gulf of Oman | Red Sea", "", 1, "C", false, 0, "")
}

func generateTOC(pdf *gofpdf.Fpdf, report *DetailedReport) {
	pdf.SetFont("Helvetica", "B", 16)
	pdf.CellFormat(0, 10, "TABLE OF CONTENTS", "", 1, "L", false, 0, "")
	pdf.Ln(5)

	pdf.SetFont("Helvetica", "", 11)
	tocItems := []string{
		"Executive Summary",
	}
	for _, s := range report.Sections {
		tocItems = append(tocItems, s.Title)
	}
	for _, a := range report.Appendices {
		tocItems = append(tocItems, a)
	}

	for i, item := range tocItems {
		pdf.CellFormat(10, 7, fmt.Sprintf("%d.", i), "", 0, "R", false, 0, "")
		pdf.CellFormat(0, 7, item, "", 1, "L", false, 0, "")
	}
}

func generateSection(pdf *gofpdf.Fpdf, title, content string, isExecutive bool) {
	if isExecutive {
		pdf.SetFont("Helvetica", "B", 14)
	} else {
		pdf.SetFont("Helvetica", "B", 13)
	}
	pdf.CellFormat(0, 8, title, "", 1, "L", false, 0, "")
	pdf.Ln(3)

	pdf.SetFont("Helvetica", "", 10)

	if content != "" {
		paragraphs := strings.Split(content, "\n\n")
		for _, para := range paragraphs {
			para = strings.TrimSpace(para)
			if para != "" {
				pdf.MultiCell(0, 5, para, "", "J", false)
				pdf.Ln(2)
			}
		}
	}
}
