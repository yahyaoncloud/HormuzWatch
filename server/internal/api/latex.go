package api

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"Geospatial-harmuz-watch/server/internal/db"
)

// fallbackLaTeXTemplate is used if reading from the template file fails
const fallbackLaTeXTemplate = `\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[margin=1in]{geometry}
\usepackage{fancyhdr}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage{booktabs}
\usepackage{array}
\usepackage{tikz}

% Define colors
\definecolor{primaryblue}{RGB}{20, 50, 90}
\definecolor{dangerred}{RGB}{180, 20, 20}
\definecolor{warnorange}{RGB}{220, 110, 10}
\definecolor{lightgray}{RGB}{240, 242, 245}
\definecolor{darkgray}{RGB}{60, 60, 60}

% Configure Hyperref
\hypersetup{
    colorlinks=true,
    linkcolor=primaryblue,
    urlcolor=primaryblue,
    pdftitle={HormuzWatch Intelligence Report},
    pdfauthor={HormuzWatch Operations Center}
}

% Page layout
\setlength{\headheight}{15pt}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0.5pt}
\renewcommand{\footrulewidth}{0.5pt}

% Headers and Footers
\lhead{\textcolor{dangerred}{\small\textbf{UNCLASSIFIED//FOR OFFICIAL USE ONLY}}}
\rhead{\textcolor{primaryblue}{\small\textbf{HormuzWatch Intelligence Report}}}
\lfoot{}
\rfoot{\textcolor{darkgray}{\small Report ID: \texttt{REPORT_ID_PLACEHOLDER} ~|~ Page \thepage}}
\cfoot{\textcolor{dangerred}{\small\textbf{UNCLASSIFIED//FOR OFFICIAL USE ONLY}}}

% Section styling
\titleformat{\section}
  {\color{primaryblue}\normalfont\Large\bfseries}
  {\thesection}{1em}{}
\titleformat{\subsection}
  {\color{primaryblue}\normalfont\large\bfseries}
  {\thesubsection}{1em}{}

% Custom command for metadata table row
\newcommand{\metadatarow}[2]{
    \textbf{#1} & #2 \\ \hline
}

\begin{document}

% =========================================================================
% COVER PAGE
% =========================================================================
\thispagestyle{fancy}
\begin{center}
    \vspace*{2cm}
    
    {\textcolor{dangerred}{\Large\textbf{UNCLASSIFIED//FOR OFFICIAL USE ONLY}}}
    
    \vspace{2.5cm}
    
    {\Huge\bfseries\textcolor{primaryblue}{HORMUZWATCH}}
    
    \vspace{0.5cm}
    {\Large\bfseries\textcolor{darkgray}{Regional Intelligence Assessment Report}}
    
    \vspace{2.5cm}
    
    \begin{tabular}{|m{5cm}|m{8cm}|}
        \hline
        \metadatarow{Report ID}{REPORT_ID_PLACEHOLDER}
        \metadatarow{Classification}{UNCLASSIFIED//FOR OFFICIAL USE ONLY}
        \metadatarow{Period Covered}{PERIOD_COVERED_PLACEHOLDER}
        \metadatarow{Generated At}{GENERATED_AT_PLACEHOLDER}
        \metadatarow{Source}{SOURCE_PLACEHOLDER}
        \metadatarow{Prepared By}{HormuzWatch Operations Center}
        \metadatarow{AOR}{Strait of Hormuz, Persian Gulf, Gulf of Oman, Red Sea}
        \hline
    \end{tabular}
    
    \vspace{2cm}
    
    \begin{minipage}{12cm}
        \centering
        \small\itshape
        This intelligence assessment is generated based on automated telemetry anomaly detection algorithms, satellite AIS data, ADS-B aviation tracking, and real-time geopolitical feed synthesis. Operational commanders should integrate these findings with organic tactical sensors prior to executing force protection measures.
    \end{minipage}
    
    \vfill
    
    {\textcolor{dangerred}{\Large\textbf{UNCLASSIFIED//FOR OFFICIAL USE ONLY}}}
    
    \vspace{1cm}
\end{center}

\newpage

% =========================================================================
% TABLE OF CONTENTS & EXECUTIVE SUMMARY
% =========================================================================
\tableofcontents
\newpage

\section{Executive Summary}
EXECUTIVE_SUMMARY_PLACEHOLDER

\newpage

% =========================================================================
% SECTIONS
% =========================================================================

SECTION_CONTENT_PLACEHOLDER

\newpage

% =========================================================================
% TELEMETRY FINDINGS & METRICS
% =========================================================================
\section{Telemetry \& Metric Analysis}

\subsection{Current AOR Telemetry Snapshot}
Below is the telemetry snapshot for the current reporting window across the active watch zones:

\vspace{0.3cm}
\begin{center}
\begin{tabular}{ll}
\toprule
\textbf{Metric Description} & \textbf{Value} \\
\midrule
Total Active Tracks & TOTAL_TRACKS_PLACEHOLDER \\
-- Maritime Tracks & MARITIME_TRACKS_PLACEHOLDER \\
-- Aviation Tracks & AVIATION_TRACKS_PLACEHOLDER \\
Average Anomaly Score & AVG_SCORE_PLACEHOLDER \\
Active Watch Regions & ACTIVE_REGIONS_PLACEHOLDER \\
\bottomrule
\end{tabular}
\end{center}
\vspace{0.3cm}

\noindent The chart below details the active track density across the three main watch zones in the AOR: Persian Gulf (North), Strait of Hormuz (Chokepoint), and Gulf of Oman (Eastern transit corridor).

\vspace{0.4cm}
\begin{center}
\begin{tikzpicture}[scale=0.95]
    \foreach \y in {0, 1, 2, 3, 4} {
        \draw[gray!20, thin] (0,\y) -- (7,\y);
    }
    \draw[thick,->] (0,0) -- (7,0) node[anchor=north] {Watch Zone};
    \draw[thick,->] (0,0) -- (0,4.5) node[anchor=east] {Tracks};
    
    \draw[fill=primaryblue!80, draw=primaryblue] (0.8,0) rectangle (2.0, PG_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{PG_COUNT_PLACEHOLDER}};
    \draw[fill=dangerred!80, draw=dangerred] (2.6,0) rectangle (3.8, SH_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{SH_COUNT_PLACEHOLDER}};
    \draw[fill=warnorange!80, draw=warnorange] (4.4,0) rectangle (5.6, GO_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{GO_COUNT_PLACEHOLDER}};
    
    \node[below, text=darkgray] at (1.4,-0.1) {\small\textbf{Persian Gulf}};
    \node[below, text=darkgray] at (3.2,-0.1) {\small\textbf{Strait of Hormuz}};
    \node[below, text=darkgray] at (5.0,-0.1) {\small\textbf{Gulf of Oman}};
\end{tikzpicture}
\end{center}
\vspace{0.3cm}

\noindent \textbf{Regional Traffic Comprehension:}
\begin{itemize}
    \item \textbf{Persian Gulf (North)}: Serves as the primary loading zone for global crude tankers. Traffic anomalies here are lower relative to the high volume of transits.
    \item \textbf{Strait of Hormuz}: A narrow shipping lane choke point with elevated anomaly frequencies, primarily driven by rapid speed changes and close naval patrols.
    \item \textbf{Gulf of Oman}: A high-sea transit sector prone to electronic warfare anomalies, GPS spoofing, and dark ship activity.
\end{itemize}
\vspace{0.4cm}

\subsection{Anomaly Distribution by Severity}
The table below categorizes detected telemetry anomalies based on severity levels:

\vspace{0.3cm}
\begin{center}
\begin{tabular}{lc}
\toprule
\textbf{Severity Level} & \textbf{Count} \\
\midrule
Critical ($\ge$ 80) & CRITICAL_COUNT_PLACEHOLDER \\
High (60--79) & HIGH_COUNT_PLACEHOLDER \\
Medium (40--59) & MEDIUM_COUNT_PLACEHOLDER \\
Low ($<$ 40) & LOW_COUNT_PLACEHOLDER \\
\bottomrule
\end{tabular}
\end{center}
\vspace{0.3cm}

\noindent The following chart illustrates the relative distribution of these anomalies:

\vspace{0.4cm}
\begin{center}
\begin{tikzpicture}[scale=0.95]
    \foreach \y in {0, 1, 2, 3, 4} {
        \draw[gray!20, thin] (0,\y) -- (7,\y);
    }
    \draw[thick,->] (0,0) -- (7,0) node[anchor=north] {Severity};
    \draw[thick,->] (0,0) -- (0,4.5) node[anchor=east] {Count};
    
    \draw[fill=dangerred!80, draw=dangerred] (0.6,0) rectangle (1.6, CRITICAL_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{CRITICAL_COUNT_PLACEHOLDER}};
    \draw[fill=warnorange!80, draw=warnorange] (2.0,0) rectangle (3.0, HIGH_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{HIGH_COUNT_PLACEHOLDER}};
    \draw[fill=yellow!70!orange, draw=yellow!80!orange] (3.4,0) rectangle (4.4, MEDIUM_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{MEDIUM_COUNT_PLACEHOLDER}};
    \draw[fill=primaryblue!60, draw=primaryblue] (4.8,0) rectangle (5.8, LOW_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{LOW_COUNT_PLACEHOLDER}};
    
    \node[below, text=darkgray] at (1.1,-0.1) {\small\textbf{Critical}};
    \node[below, text=darkgray] at (2.5,-0.1) {\small\textbf{High}};
    \node[below, text=darkgray] at (3.9,-0.1) {\small\textbf{Medium}};
    \node[below, text=darkgray] at (5.3,-0.1) {\small\textbf{Low}};
\end{tikzpicture}
\end{center}
\vspace{0.3cm}

\noindent \textbf{Severity Level Comprehension:}
\begin{itemize}
    \item \textbf{Critical ($\ge$ 80)}: Direct threat signature. These represent immediate anomalies (e.g., erratic course deviations or sudden transponder silence) requiring active tactical response.
    \item \textbf{High (60--79)}: Potential gray-zone activities or military patrol intercepts.
    \item \textbf{Medium \& Low ($<$ 60)}: Routine deviations caused by heavy commercial port traffic and weather-avoidance maneuvers.
\end{itemize}
\vspace{0.4cm}

\subsection{Top Anomaly Watchlist}
The following table details the top telemetry anomalies tracked in the AOR:

\vspace{0.3cm}
\begin{center}
\begin{tabular}{llcllp{5cm}}
\toprule
\textbf{Asset Name} & \textbf{Track ID} & \textbf{Score} & \textbf{Speed} & \textbf{Severity} & \textbf{Primary Reason(s)} \\
\midrule
ANOMALIES_TABLE_ROWS_PLACEHOLDER
\bottomrule
\end{tabular}
\end{center}
\vspace{0.3cm}

\newpage

% =========================================================================
% APPENDICES
% =========================================================================
\section{Appendices}

APPENDICES_CONTENT_PLACEHOLDER

\end{document}
`

// escapeLaTeX escapes special LaTeX control characters to prevent compile errors.
func escapeLaTeX(text string) string {
	r := strings.NewReplacer(
		`\`, `\textbackslash{}`,
		`{`, `\{`,
		`}`, `\}`,
		`%`, `\%`,
		`&`, `\&`,
		`$`, `\$`,
		`#`, `\#`,
		`_`, `\_`,
		`^`, `\textasciicircum{}`,
		`~`, `\textasciitilde{}`,
		`μ`, `$\mu$`,
		`σ`, `$\sigma$`,
		`ε`, `$\epsilon$`,
		`α`, `$\alpha$`,
		`β`, `$\beta$`,
		`λ`, `$\lambda$`,
		`π`, `$\pi$`,
		`θ`, `$\theta$`,
		`δ`, `$\delta$`,
		`Δ`, `$\Delta$`,
		`Σ`, `$\Sigma$`,
		`Ω`, `$\Omega$`,
		`ω`, `$\omega$`,
		`°`, `$^\circ$`,
		`≥`, `$\ge$`,
		`≤`, `$\le$`,
		`<`, `$,$`,
		`>`, `$>$`,
	)
	text = r.Replace(text)
	text = strings.ReplaceAll(text, `$,$`, `$<$`)
	return text
}

// generateReportLaTeX creates a fully formatted LaTeX source string for the intelligence report.
func generateReportLaTeX(report *DetailedReport, anomalies []TopTrace, metrics *PublicMetrics) (string, error) {
	// 1. Try to load template from file, otherwise fall back to embedded template
	templateBytes, err := os.ReadFile("templates/report_template.tex")
	var templateStr string
	if err != nil {
		// Try alternative path (relative to server/ cmd/main.go execution context)
		templateBytes, err = os.ReadFile("server/templates/report_template.tex")
		if err != nil {
			log.Printf("[LaTeX] Could not read template file: %v. Using built-in fallback template.", err)
			templateStr = fallbackLaTeXTemplate
		} else {
			templateStr = string(templateBytes)
		}
	} else {
		templateStr = string(templateBytes)
	}

	// 2. Perform replacements
	// Metadata
	templateStr = strings.ReplaceAll(templateStr, "REPORT_ID_PLACEHOLDER", escapeLaTeX(report.ReportID))
	templateStr = strings.ReplaceAll(templateStr, "PERIOD_COVERED_PLACEHOLDER", escapeLaTeX(report.PeriodCovered))
	templateStr = strings.ReplaceAll(templateStr, "GENERATED_AT_PLACEHOLDER", escapeLaTeX(report.GeneratedAt))
	templateStr = strings.ReplaceAll(templateStr, "SOURCE_PLACEHOLDER", escapeLaTeX(strings.ToUpper(report.Source)))

	// Executive Summary (preserving paragraphs)
	execParagraphs := strings.Split(report.ExecutiveSummary, "\n\n")
	var execEscaped []string
	for _, p := range execParagraphs {
		p = strings.TrimSpace(p)
		if p != "" {
			execEscaped = append(execEscaped, escapeLaTeX(p))
		}
	}
	templateStr = strings.ReplaceAll(templateStr, "EXECUTIVE_SUMMARY_PLACEHOLDER", strings.Join(execEscaped, "\n\n"))

	// Main Sections
	var sectionsBuilder strings.Builder
	for _, sec := range report.Sections {
		sectionsBuilder.WriteString(fmt.Sprintf("\\section{%s}\n", escapeLaTeX(sec.Title)))
		for _, para := range sec.Content {
			para = strings.TrimSpace(para)
			if para != "" {
				sectionsBuilder.WriteString(escapeLaTeX(para) + "\n\n")
			}
		}
		sectionsBuilder.WriteString("\\newpage\n\n")
	}
	templateStr = strings.ReplaceAll(templateStr, "SECTION_CONTENT_PLACEHOLDER", sectionsBuilder.String())

	// Query active track counts by region (Persian Gulf, Strait of Hormuz, Gulf of Oman)
	var pgCount, shCount, goCount int
	if db.DB != nil {
		db.DB.QueryRow(`SELECT COUNT(*) FROM tracks WHERE last_updated >= NOW() - INTERVAL '2 hours' AND lon < 56.0`).Scan(&pgCount)
		db.DB.QueryRow(`SELECT COUNT(*) FROM tracks WHERE last_updated >= NOW() - INTERVAL '2 hours' AND lon >= 56.0 AND lon <= 59.0`).Scan(&shCount)
		db.DB.QueryRow(`SELECT COUNT(*) FROM tracks WHERE last_updated >= NOW() - INTERVAL '2 hours' AND lon > 59.0`).Scan(&goCount)
	}

	// Calculate TikZ bar heights for watch zones
	var pgHeight, shHeight, goHeight float64 = 0, 0, 0
	maxReg := pgCount
	if shCount > maxReg {
		maxReg = shCount
	}
	if goCount > maxReg {
		maxReg = goCount
	}
	if maxReg > 0 {
		pgHeight = (float64(pgCount) / float64(maxReg)) * 4.0
		shHeight = (float64(shCount) / float64(maxReg)) * 4.0
		goHeight = (float64(goCount) / float64(maxReg)) * 4.0
	} else {
		// Default mock heights for fallback if DB is empty
		pgHeight = 2.5
		shHeight = 4.0
		goHeight = 1.5
	}

	// Calculate TikZ bar heights for severities
	var critHeight, highHeight, medHeight, lowHeight float64 = 0, 0, 0, 0
	if metrics != nil {
		maxSev := metrics.CriticalCount
		if metrics.HighCount > maxSev {
			maxSev = metrics.HighCount
		}
		if metrics.MediumCount > maxSev {
			maxSev = metrics.MediumCount
		}
		if metrics.LowCount > maxSev {
			maxSev = metrics.LowCount
		}

		if maxSev > 0 {
			critHeight = (float64(metrics.CriticalCount) / float64(maxSev)) * 4.0
			highHeight = (float64(metrics.HighCount) / float64(maxSev)) * 4.0
			medHeight = (float64(metrics.MediumCount) / float64(maxSev)) * 4.0
			lowHeight = (float64(metrics.LowCount) / float64(maxSev)) * 4.0
		} else {
			critHeight = 3.5
			highHeight = 2.5
			medHeight = 1.5
			lowHeight = 0.8
		}
	} else {
		critHeight = 3.5
		highHeight = 2.5
		medHeight = 1.5
		lowHeight = 0.8
	}

	// Replace watch zone variables in template
	templateStr = strings.ReplaceAll(templateStr, "PG_COUNT_PLACEHOLDER", fmt.Sprintf("%d", pgCount))
	templateStr = strings.ReplaceAll(templateStr, "SH_COUNT_PLACEHOLDER", fmt.Sprintf("%d", shCount))
	templateStr = strings.ReplaceAll(templateStr, "GO_COUNT_PLACEHOLDER", fmt.Sprintf("%d", goCount))

	templateStr = strings.ReplaceAll(templateStr, "PG_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", pgHeight))
	templateStr = strings.ReplaceAll(templateStr, "SH_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", shHeight))
	templateStr = strings.ReplaceAll(templateStr, "GO_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", goHeight))

	// Replace severity height variables in template
	templateStr = strings.ReplaceAll(templateStr, "CRITICAL_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", critHeight))
	templateStr = strings.ReplaceAll(templateStr, "HIGH_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", highHeight))
	templateStr = strings.ReplaceAll(templateStr, "MEDIUM_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", medHeight))
	templateStr = strings.ReplaceAll(templateStr, "LOW_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", lowHeight))

	// Metrics snapshot
	totalTracks := "N/A"
	maritimeCount := "N/A"
	aviationCount := "N/A"
	avgScore := "N/A"
	activeRegions := "N/A"
	criticalCount := "N/A"
	highCount := "N/A"
	mediumCount := "N/A"
	lowCount := "N/A"

	if metrics != nil {
		totalTracks = fmt.Sprintf("%d", metrics.TotalTracks)
		maritimeCount = fmt.Sprintf("%d", metrics.MaritimeCount)
		aviationCount = fmt.Sprintf("%d", metrics.AviationCount)
		avgScore = fmt.Sprintf("%.1f", metrics.AvgScore)
		activeRegions = fmt.Sprintf("%d", metrics.ActiveRegions)
		criticalCount = fmt.Sprintf("%d", metrics.CriticalCount)
		highCount = fmt.Sprintf("%d", metrics.HighCount)
		mediumCount = fmt.Sprintf("%d", metrics.MediumCount)
		lowCount = fmt.Sprintf("%d", metrics.LowCount)
	}

	templateStr = strings.ReplaceAll(templateStr, "TOTAL_TRACKS_PLACEHOLDER", totalTracks)
	templateStr = strings.ReplaceAll(templateStr, "MARITIME_TRACKS_PLACEHOLDER", maritimeCount)
	templateStr = strings.ReplaceAll(templateStr, "AVIATION_TRACKS_PLACEHOLDER", aviationCount)
	templateStr = strings.ReplaceAll(templateStr, "AVG_SCORE_PLACEHOLDER", avgScore)
	templateStr = strings.ReplaceAll(templateStr, "ACTIVE_REGIONS_PLACEHOLDER", activeRegions)

	templateStr = strings.ReplaceAll(templateStr, "CRITICAL_COUNT_PLACEHOLDER", criticalCount)
	templateStr = strings.ReplaceAll(templateStr, "HIGH_COUNT_PLACEHOLDER", highCount)
	templateStr = strings.ReplaceAll(templateStr, "MEDIUM_COUNT_PLACEHOLDER", mediumCount)
	templateStr = strings.ReplaceAll(templateStr, "LOW_COUNT_PLACEHOLDER", lowCount)

	// Anomalies watchlist table
	var anomaliesRows []string
	if len(anomalies) == 0 {
		anomaliesRows = append(anomaliesRows, `\multicolumn{6}{c}{No notable anomalies detected in this cycle.} \\`)
	} else {
		for _, a := range anomalies {
			row := fmt.Sprintf("%s & %s & %.1f & %.1f kts & %s & %s \\\\",
				escapeLaTeX(a.AssetName),
				escapeLaTeX(a.TrackID),
				a.Score,
				a.Speed,
				escapeLaTeX(a.Severity),
				escapeLaTeX(a.Reasons),
			)
			anomaliesRows = append(anomaliesRows, row)
		}
	}
	templateStr = strings.ReplaceAll(templateStr, "ANOMALIES_TABLE_ROWS_PLACEHOLDER", strings.Join(anomaliesRows, "\n"))

	// Appendices
	var appBuilder strings.Builder
	for _, app := range report.Appendices {
		parts := strings.SplitN(app, " — ", 2)
		if len(parts) == 2 {
			appBuilder.WriteString(fmt.Sprintf("\\subsection{%s}\n%s\n\n", escapeLaTeX(parts[0]), escapeLaTeX(parts[1])))
		} else {
			parts2 := strings.SplitN(app, " - ", 2)
			if len(parts2) == 2 {
				appBuilder.WriteString(fmt.Sprintf("\\subsection{%s}\n%s\n\n", escapeLaTeX(parts2[0]), escapeLaTeX(parts2[1])))
			} else {
				appBuilder.WriteString(fmt.Sprintf("\\subsection{Appendix}\n%s\n\n", escapeLaTeX(app)))
			}
		}
	}
	templateStr = strings.ReplaceAll(templateStr, "APPENDICES_CONTENT_PLACEHOLDER", appBuilder.String())

	return templateStr, nil
}

// compileLaTeXToPDF compiles the latexContent into PDF bytes by calling pdflatex.
func compileLaTeXToPDF(latexContent string) ([]byte, error) {
	// 1. Create a temp directory inside workspace
	tempDir, err := os.MkdirTemp("", "hormuzwatch_latex_*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// 2. Write report.tex
	texPath := filepath.Join(tempDir, "report.tex")
	err = os.WriteFile(texPath, []byte(latexContent), 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to write tex file: %w", err)
	}

	// 3. Compile first time
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	cmd1 := exec.CommandContext(ctx, "pdflatex", "-interaction=nonstopmode", "-halt-on-error", "report.tex")
	cmd1.Dir = tempDir
	var stdout1, stderr1 bytes.Buffer
	cmd1.Stdout = &stdout1
	cmd1.Stderr = &stderr1

	err = cmd1.Run()
	if err != nil {
		return nil, fmt.Errorf("pdflatex compile 1 failed: %w\nstdout: %s\nstderr: %s", err, stdout1.String(), stderr1.String())
	}

	// 4. Compile second time to resolve Table of Contents
	cmd2 := exec.CommandContext(ctx, "pdflatex", "-interaction=nonstopmode", "-halt-on-error", "report.tex")
	cmd2.Dir = tempDir
	var stdout2, stderr2 bytes.Buffer
	cmd2.Stdout = &stdout2
	cmd2.Stderr = &stderr2

	err = cmd2.Run()
	if err != nil {
		return nil, fmt.Errorf("pdflatex compile 2 failed: %w\nstdout: %s\nstderr: %s", err, stdout2.String(), stderr2.String())
	}

	// 5. Read generated PDF
	pdfPath := filepath.Join(tempDir, "report.pdf")
	pdfBytes, err := os.ReadFile(pdfPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read generated pdf: %w", err)
	}

	return pdfBytes, nil
}
