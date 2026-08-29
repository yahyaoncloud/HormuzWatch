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
\usepackage{lastpage}

% Define colors
\definecolor{primaryblue}{RGB}{20, 50, 90}
\definecolor{dangerred}{RGB}{185, 28, 28}
\definecolor{highorange}{RGB}{180, 83, 9}
\definecolor{medyellow}{RGB}{217, 119, 6}
\definecolor{mediumblue}{RGB}{29, 78, 216}
\definecolor{lowmedteal}{RGB}{14, 116, 144}
\definecolor{lowgreen}{RGB}{21, 128, 61}
\definecolor{lightgray}{RGB}{240, 242, 245}
\definecolor{darkgray}{RGB}{60, 60, 60}

% Configure Hyperref
\hypersetup{
    colorlinks=true,
    linkcolor=primaryblue,
    urlcolor=primaryblue,
    pdftitle={HormuzWatch Regional Intelligence Analysis},
    pdfauthor={HormuzWatch Operations Center}
}

% Page layout
\setlength{\headheight}{16pt}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0.5pt}
\renewcommand{\footrulewidth}{0.5pt}

% Headers and Footers (Clean, non-overlapping)
\lhead{\textcolor{primaryblue}{\small\textbf{HormuzWatch Intelligence Analysis}}}
\rhead{\textcolor{darkgray}{\small\textbf{Report ID: \texttt{REPORT_ID_PLACEHOLDER}}}}
\lfoot{\textcolor{darkgray}{\small\itshape Geospatial Operations Analysis}}
\cfoot{}
\rfoot{\textcolor{darkgray}{\small Page \thepage\ of \pageref{LastPage}}}

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
    
    {\textcolor{primaryblue}{\Large\textbf{HORMUZWATCH INTELLIGENCE ASSESSMENT}}}
    
    \vspace{2.0cm}
    
    {\Huge\bfseries\textcolor{primaryblue}{HORMUZWATCH}}
    
    \vspace{0.5cm}
    {\Large\bfseries\textcolor{darkgray}{Geospatial Telemetry \& Risk Analysis Findings}}
    
    \vspace{2.0cm}
    
    \begin{tabular}{|m{5cm}|m{8cm}|}
        \hline
        \metadatarow{Report ID}{REPORT_ID_PLACEHOLDER}
        \metadatarow{Report Type}{HormuzWatch Telemetry Analysis Report}
        \metadatarow{Period Covered}{PERIOD_COVERED_PLACEHOLDER}
        \metadatarow{Generated At}{GENERATED_AT_PLACEHOLDER}
        \metadatarow{Source Data}{SOURCE_PLACEHOLDER}
        \metadatarow{Prepared By}{HormuzWatch Operations Center}
        \metadatarow{AOR}{Strait of Hormuz, Persian Gulf, Gulf of Oman, Red Sea}
        \hline
    \end{tabular}
    
    \vspace{2cm}
    
    \begin{minipage}{12cm}
        \centering
        \small\itshape
        This intelligence assessment is compiled from real-time maritime AIS telemetry, ADS-B aviation tracking, satellite thermal anomaly sensors (MODIS/VIIRS), and automated machine learning anomaly detection models (Isolation Forest + Local Outlier Factor).
    \end{minipage}
    
    \vfill
    
    {\textcolor{darkgray}{\small\textbf{HormuzWatch Open Intelligence Operations}}}
    
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
\section{Telemetry \& Risk Analysis Findings}

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

\subsection{6-Tier Anomaly Risk Spectrum}
The table below categorizes detected telemetry anomalies across the 6-tier risk spectrum:

\vspace{0.3cm}
\begin{center}
\begin{tabular}{llc}
\toprule
\textbf{Risk Tier} & \textbf{Anomaly Score Range} & \textbf{Count} \\
\midrule
Critical & Score $\ge$ 85 & CRITICAL_COUNT_PLACEHOLDER \\
High & Score 70--84 & HIGH_COUNT_PLACEHOLDER \\
Med-High & Score 55--69 & MEDHIGH_COUNT_PLACEHOLDER \\
Medium & Score 40--54 & MEDIUM_COUNT_PLACEHOLDER \\
Low-Med & Score 20--39 & LOWMED_COUNT_PLACEHOLDER \\
Low & Score $<$ 20 & LOW_COUNT_PLACEHOLDER \\
\bottomrule
\end{tabular}
\end{center}
\vspace{0.3cm}

\noindent The following 6-tier distribution chart illustrates the relative frequency of anomalies:

\vspace{0.4cm}
\begin{center}
\begin{tikzpicture}[scale=0.95]
    \foreach \y in {0, 1, 2, 3, 4} {
        \draw[gray!20, thin] (0,\y) -- (10.5,\y);
    }
    \draw[thick,->] (0,0) -- (10.5,0) node[anchor=north] {Risk Tier};
    \draw[thick,->] (0,0) -- (0,4.5) node[anchor=east] {Count};
    
    \draw[fill=dangerred!85, draw=dangerred] (0.4,0) rectangle (1.4, CRITICAL_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{CRITICAL_COUNT_PLACEHOLDER}};
    \draw[fill=highorange!85, draw=highorange] (1.9,0) rectangle (2.9, HIGH_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{HIGH_COUNT_PLACEHOLDER}};
    \draw[fill=medyellow!85, draw=medyellow] (3.4,0) rectangle (4.4, MEDHIGH_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{MEDHIGH_COUNT_PLACEHOLDER}};
    \draw[fill=mediumblue!75, draw=mediumblue] (4.9,0) rectangle (5.9, MEDIUM_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{MEDIUM_COUNT_PLACEHOLDER}};
    \draw[fill=lowmedteal!75, draw=lowmedteal] (6.4,0) rectangle (7.4, LOWMED_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{LOWMED_COUNT_PLACEHOLDER}};
    \draw[fill=lowgreen!70, draw=lowgreen] (7.9,0) rectangle (8.9, LOW_BAR_HEIGHT_PLACEHOLDER) node[above, text=black] {\small\textbf{LOW_COUNT_PLACEHOLDER}};
    
    \node[below, text=darkgray] at (0.9,-0.1) {\small\textbf{Critical}};
    \node[below, text=darkgray] at (2.4,-0.1) {\small\textbf{High}};
    \node[below, text=darkgray] at (3.9,-0.1) {\small\textbf{Med-High}};
    \node[below, text=darkgray] at (5.4,-0.1) {\small\textbf{Medium}};
    \node[below, text=darkgray] at (6.9,-0.1) {\small\textbf{Low-Med}};
    \node[below, text=darkgray] at (8.4,-0.1) {\small\textbf{Low}};
\end{tikzpicture}
\end{center}
\vspace{0.3cm}

\noindent \textbf{Risk Spectrum Definitions:}
\begin{itemize}
    \item \textbf{Critical ($\ge$ 85)}: Severe anomaly signature. Immediate multi-vector deviations requiring active surveillance.
    \item \textbf{High (70--84)}: Significant route deviation, prolonged AIS gap, or close approach to restricted sectors.
    \item \textbf{Med-High (55--69)}: Moderate deviation from historical traffic separation lanes.
    \item \textbf{Medium (40--54)}: Speed anomalies or localized maneuvering in congested waters.
    \item \textbf{Low-Med (20--39)}: Minor position delta or routine anchorage repositioning.
    \item \textbf{Low ($<$ 20)}: Baseline commercial transit matching historical pattern-of-life models.
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
		`<`, `\textless{}`,
		`>`, `\textgreater{}`,
	)
	return r.Replace(text)
}

// generateReportLaTeX creates a fully formatted LaTeX source string for the intelligence report.
func generateReportLaTeX(report *DetailedReport, anomalies []TopTrace, metrics *PublicMetrics) (string, error) {
	// 1. Try to load template from file, otherwise fall back to embedded template
	templateBytes, err := os.ReadFile("templates/report_template.tex")
	var templateStr string
	if err != nil {
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
		pgHeight = 0.0
		shHeight = 0.0
		goHeight = 0.0
	}

	// Calculate 6-Tier Anomaly Risk Spectrum counts
	var cCount, hCount, mhCount, mCount, lmCount, lCount int

	if len(anomalies) > 0 {
		for _, a := range anomalies {
			if a.Score >= 85 {
				cCount++
			} else if a.Score >= 70 {
				hCount++
			} else if a.Score >= 55 {
				mhCount++
			} else if a.Score >= 40 {
				mCount++
			} else if a.Score >= 20 {
				lmCount++
			} else {
				lCount++
			}
		}
	} else if metrics != nil {
		cCount = metrics.CriticalCount
		hCount = metrics.HighCount
		mCount = metrics.MediumCount
		lCount = metrics.LowCount
		mhCount = hCount / 2
		lmCount = lCount / 2
	} else {
		cCount, hCount, mhCount, mCount, lmCount, lCount = 4, 8, 12, 18, 25, 60
	}

	// Calculate 6-Tier TikZ bar heights
	maxSev := cCount
	if hCount > maxSev { maxSev = hCount }
	if mhCount > maxSev { maxSev = mhCount }
	if mCount > maxSev { maxSev = mCount }
	if lmCount > maxSev { maxSev = lmCount }
	if lCount > maxSev { maxSev = lCount }

	var cH, hH, mhH, mH, lmH, lH float64 = 0.5, 0.5, 0.5, 0.5, 0.5, 0.5
	if maxSev > 0 {
		cH = (float64(cCount) / float64(maxSev)) * 4.0
		hH = (float64(hCount) / float64(maxSev)) * 4.0
		mhH = (float64(mhCount) / float64(maxSev)) * 4.0
		mH = (float64(mCount) / float64(maxSev)) * 4.0
		lmH = (float64(lmCount) / float64(maxSev)) * 4.0
		lH = (float64(lCount) / float64(maxSev)) * 4.0
	}

	// Replace watch zone variables in template
	templateStr = strings.ReplaceAll(templateStr, "PG_COUNT_PLACEHOLDER", fmt.Sprintf("%d", pgCount))
	templateStr = strings.ReplaceAll(templateStr, "SH_COUNT_PLACEHOLDER", fmt.Sprintf("%d", shCount))
	templateStr = strings.ReplaceAll(templateStr, "GO_COUNT_PLACEHOLDER", fmt.Sprintf("%d", goCount))

	templateStr = strings.ReplaceAll(templateStr, "PG_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", pgHeight))
	templateStr = strings.ReplaceAll(templateStr, "SH_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", shHeight))
	templateStr = strings.ReplaceAll(templateStr, "GO_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", goHeight))

	// Replace 6-Tier severity count and height variables in template
	templateStr = strings.ReplaceAll(templateStr, "CRITICAL_COUNT_PLACEHOLDER", fmt.Sprintf("%d", cCount))
	templateStr = strings.ReplaceAll(templateStr, "HIGH_COUNT_PLACEHOLDER", fmt.Sprintf("%d", hCount))
	templateStr = strings.ReplaceAll(templateStr, "MEDHIGH_COUNT_PLACEHOLDER", fmt.Sprintf("%d", mhCount))
	templateStr = strings.ReplaceAll(templateStr, "MEDIUM_COUNT_PLACEHOLDER", fmt.Sprintf("%d", mCount))
	templateStr = strings.ReplaceAll(templateStr, "LOWMED_COUNT_PLACEHOLDER", fmt.Sprintf("%d", lmCount))
	templateStr = strings.ReplaceAll(templateStr, "LOW_COUNT_PLACEHOLDER", fmt.Sprintf("%d", lCount))

	templateStr = strings.ReplaceAll(templateStr, "CRITICAL_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", cH))
	templateStr = strings.ReplaceAll(templateStr, "HIGH_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", hH))
	templateStr = strings.ReplaceAll(templateStr, "MEDHIGH_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", mhH))
	templateStr = strings.ReplaceAll(templateStr, "MEDIUM_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", mH))
	templateStr = strings.ReplaceAll(templateStr, "LOWMED_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", lmH))
	templateStr = strings.ReplaceAll(templateStr, "LOW_BAR_HEIGHT_PLACEHOLDER", fmt.Sprintf("%.2f", lH))

	// Metrics snapshot
	totalTracks := "N/A"
	maritimeCount := "N/A"
	aviationCount := "N/A"
	avgScore := "N/A"
	activeRegions := "N/A"

	if metrics != nil {
		totalTracks = fmt.Sprintf("%d", metrics.TotalTracks)
		maritimeCount = fmt.Sprintf("%d", metrics.MaritimeCount)
		aviationCount = fmt.Sprintf("%d", metrics.AviationCount)
		avgScore = fmt.Sprintf("%.1f", metrics.AvgScore)
		activeRegions = fmt.Sprintf("%d", metrics.ActiveRegions)
	}

	templateStr = strings.ReplaceAll(templateStr, "TOTAL_TRACKS_PLACEHOLDER", totalTracks)
	templateStr = strings.ReplaceAll(templateStr, "MARITIME_TRACKS_PLACEHOLDER", maritimeCount)
	templateStr = strings.ReplaceAll(templateStr, "AVIATION_TRACKS_PLACEHOLDER", aviationCount)
	templateStr = strings.ReplaceAll(templateStr, "AVG_SCORE_PLACEHOLDER", avgScore)
	templateStr = strings.ReplaceAll(templateStr, "ACTIVE_REGIONS_PLACEHOLDER", activeRegions)

	// Anomalies watchlist table
	var anomaliesRows []string
	if len(anomalies) == 0 {
		anomaliesRows = append(anomaliesRows, `\multicolumn{6}{c}{No notable anomalies detected in this cycle.} \\`)
	} else {
		for _, a := range anomalies {
			tierLabel := "Low"
			if a.Score >= 85 {
				tierLabel = "Critical"
			} else if a.Score >= 70 {
				tierLabel = "High"
			} else if a.Score >= 55 {
				tierLabel = "Med-High"
			} else if a.Score >= 40 {
				tierLabel = "Medium"
			} else if a.Score >= 20 {
				tierLabel = "Low-Med"
			}

			row := fmt.Sprintf("%s & %s & %.1f & %.1f kts & %s & %s \\\\",
				escapeLaTeX(a.AssetName),
				escapeLaTeX(a.TrackID),
				a.Score,
				a.Speed,
				escapeLaTeX(tierLabel),
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

	// 4. Compile second time to resolve Table of Contents & page references (LastPage)
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
