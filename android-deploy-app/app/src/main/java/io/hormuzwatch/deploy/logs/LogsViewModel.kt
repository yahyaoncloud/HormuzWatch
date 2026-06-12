package io.hormuzwatch.deploy.logs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.hormuzwatch.deploy.BuildConfig
import io.hormuzwatch.deploy.logs.api.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.temporal.ChronoUnit

data class LogsUiState(
    val appLogs:      List<LogEntry>   = emptyList(),
    val pipelineLogs: List<GitHubRun>  = emptyList(),
    val azureLogs:    List<LogEntry>   = emptyList(),
    val loading:      Boolean          = false,
    val error:        String?          = null,
    val lastRefresh:  String           = "never",
    // deploy-screen log stream (appended in real time during workflow polling)
    val deployStream: List<String>     = emptyList()
)

class LogsViewModel : ViewModel() {

    private val _state = MutableStateFlow(LogsUiState())
    val state: StateFlow<LogsUiState> = _state

    private var pollJob: Job? = null

    // ── Public API ────────────────────────────────────────────────────────────

    fun startPolling(intervalMs: Long = 30_000L) {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                fetchAll()
                delay(intervalMs)
            }
        }
    }

    fun stopPolling() { pollJob?.cancel() }

    fun refresh() = viewModelScope.launch { fetchAll() }

    /** Append a deployment log line in real time. */
    fun appendDeployLog(line: String) {
        _state.value = _state.value.copy(
            deployStream = _state.value.deployStream + "[${nowTime()}] $line"
        )
    }

    fun clearDeployStream() {
        _state.value = _state.value.copy(deployStream = emptyList())
    }

    // ── Fetch all sources ─────────────────────────────────────────────────────

    private suspend fun fetchAll() {
        _state.value = _state.value.copy(loading = true, error = null)
        try {
            val (app, azure) = fetchLokiLogs()
            val pipeline     = fetchPipelineLogs()
            _state.value = _state.value.copy(
                appLogs      = app,
                azureLogs    = azure,
                pipelineLogs = pipeline,
                loading      = false,
                lastRefresh  = nowTime()
            )
        } catch (e: Exception) {
            _state.value = _state.value.copy(
                loading = false,
                error   = "Log fetch error: ${e.message}"
            )
        }
    }

    // ── Loki: application + Azure-forwarded logs ──────────────────────────────

    private suspend fun fetchLokiLogs(): Pair<List<LogEntry>, List<LogEntry>> {
        val end   = Instant.now()
        val start = end.minus(1, ChronoUnit.HOURS)
        val endNs   = "${end.toEpochMilli()}000000"
        val startNs = "${start.toEpochMilli()}000000"

        val appStreams = runCatching {
            LogApiClients.loki.queryRange(
                query     = "{app=~\"hormuzwatch.*\"}",
                start     = startNs,
                end       = endNs,
                limit     = 300
            )
        }.getOrNull()

        val azureStreams = runCatching {
            LogApiClients.loki.queryRange(
                query     = "{source=\"azure-monitor\"}",
                start     = startNs,
                end       = endNs,
                limit     = 200
            )
        }.getOrNull()

        return Pair(
            parseStreams(appStreams, LogSource.APP),
            parseStreams(azureStreams, LogSource.AZURE)
        )
    }

    private fun parseStreams(response: LokiQueryResponse?, source: LogSource): List<LogEntry> {
        return response?.data?.result?.flatMap { stream ->
            stream.values.map { value ->
                LogEntry(
                    timestampNs = value[0],
                    line        = value[1],
                    labels      = stream.stream,
                    source      = source
                )
            }
        }?.sortedByDescending { it.timestampNs } ?: emptyList()
    }

    // ── GitHub Actions: pipeline logs ─────────────────────────────────────────

    private suspend fun fetchPipelineLogs(): List<GitHubRun> {
        val parts = BuildConfig.GITHUB_REPO.split("/")
        if (parts.size < 2) return emptyList()
        return runCatching {
            LogApiClients.github.getRuns(
                owner   = parts[0],
                repo    = parts[1],
                perPage = 30,
                token   = "Bearer ${BuildConfig.GITHUB_TOKEN}"
            ).workflowRuns
        }.getOrDefault(emptyList())
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun nowTime(): String {
        val now = java.util.Date()
        return java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(now)
    }
}
