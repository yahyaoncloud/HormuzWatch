package source

// DefaultGulfSources returns the pre-configured Gulf-region intelligence
// sources. Each source implements the Source interface and is ready to be
// registered in the Registry and scheduled for periodic collection.
func DefaultGulfSources() []Source {
	return []Source{
		// ── GCC Official News Agencies ──────────────────────────────
		NewRSSSource(
			"WAM", // Emirates News Agency
			"https://www.wam.ae/en/rss",
			"ar", "AE",
		),
		NewRSSSource(
			"SPA", // Saudi Press Agency
			"https://www.spa.gov.sa/en/rss",
			"ar", "SA",
		),
		NewRSSSource(
			"KUNA", // Kuwait News Agency
			"https://www.kuna.net.kw/rss/en",
			"ar", "KW",
		),
		NewRSSSource(
			"BNA", // Bahrain News Agency
			"https://www.bna.bh/en/rss",
			"ar", "BH",
		),
		NewRSSSource(
			"ONA", // Oman News Agency
			"https://www.omannews.gov.om/rss",
			"ar", "OM",
		),
		NewRSSSource(
			"QNA", // Qatar News Agency
			"https://www.qna.org.qa/en/rss",
			"ar", "QA",
		),

		// ── Iran & Iraq ────────────────────────────────────────────
		NewRSSSource(
			"IRNA", // Islamic Republic News Agency
			"https://en.irna.ir/rss",
			"fa", "IR",
		),
		NewRSSSource(
			"INA", // Iraqi News Agency
			"https://ina.iq/eng/rss",
			"ar", "IQ",
		),

		// ── International Defence & Security ────────────────────────
		NewRSSSource(
			"USNI News",
			"https://news.usni.org/feed",
			"en", "US",
		),
		NewRSSSource(
			"DefenseNews Naval",
			"https://www.defensenews.com/arc/outboundfeeds/v2/category/naval/?outputType=xml",
			"en", "US",
		),
		NewRSSSource(
			"Al Jazeera Middle East",
			"https://www.aljazeera.com/xml/rss/all.xml",
			"ar", "QA",
		),
		NewRSSSource(
			"Reuters World",
			"https://www.reutersagency.com/feed/",
			"en", "GB",
		),

		// ── Maritime Security ──────────────────────────────────────
		NewRSSSource(
			"UKMTO Warnings",
			"https://www.ukmto.org/indian-ocean/rss",
			"en", "GB",
		),
		NewRSSSource(
			"IMO News",
			"https://www.imo.org/en/MediaCentre/PressBriefings/_layouts/15/listfeed.aspx?List=9c9e4c5f-4163-47a8-b3c1-30e40f714a71",
			"en", "GB",
		),
		NewRSSSource(
			"Maritime Executive",
			"https://www.maritime-executive.com/rss",
			"en", "US",
		),
		NewRSSSource(
			"gCaptain Maritime",
			"https://gcaptain.com/feed/",
			"en", "US",
		),

		// ── Energy ─────────────────────────────────────────────────
		NewRSSSource(
			"OPEC News",
			"https://www.opec.org/opec_web/en/pressroom/feed.xml",
			"en", "AT",
		),

		// ── Scraper Sources (HTML pages without RSS) ───────────────
		NewScraperSource(
			"IRGC Press",
			"https://sepahnews.ir/en",
			"a.news-title",        // link selector: article title links
			"h1.entry-title",      // title selector on article page
			"div.entry-content",   // body selector
			"fa", "IR",
		),
		NewScraperSource(
			"Yemen Press Agency",
			"https://www.saba.ye/en",
			"a.news-title, h2 a",  // link selector
			"h1.entry-title, h2.title", // title selector
			"div.entry-content, article", // body selector
			"ar", "YE",
		),
		NewScraperSource(
			"Tasnim News",
			"https://www.tasnimnews.com/en",
			"a.news-link, .news-item a",
			"h1.title, h1.news-title",
			"div.content, article.news-body",
			"fa", "IR",
		),
	}
}

// SourceReliabilityOverrides allows per-deployment source reliability tuning.
// Keys match source names; values override the hardcoded defaults.
var SourceReliabilityOverrides = map[string]float64{}
