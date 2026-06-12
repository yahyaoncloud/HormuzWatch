package io.hormuzwatch.deploy.logs

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.hormuzwatch.deploy.logs.api.*
import io.hormuzwatch.deploy.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

enum class LogTab { APP, PIPELINE, AZURE, DEPLOY }

@Composable
fun LogsScreen(viewModel: LogsViewModel, deployStream: List<String>) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableStateOf(LogTab.APP) }
    var levelFilter by remember { mutableStateOf<LogLevel?>(null) }
    var searchQuery by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { viewModel.startPolling() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DeepNavy)
    ) {
        // ── Header ──────────────────────────────────────────────────────
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Logs", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Text(
                    "Last: ${state.lastRefresh}",
                    fontSize = 11.sp,
                    color = Slate500
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (state.loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = SkyBlue,
                        strokeWidth = 2.dp
                    )
                }
                IconButton(onClick = { viewModel.refresh() }) {
                    Icon(Icons.Filled.Refresh, null, tint = Slate400)
                }
            }
        }

        // ── Search bar ───────────────────────────────────────────────────
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search logs...", color = Slate500, fontSize = 13.sp) },
            leadingIcon = { Icon(Icons.Filled.Search, null, tint = Slate500) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                unfocusedBorderColor = Slate700,
                focusedBorderColor   = Indigo600,
                cursorColor          = SkyBlue,
                focusedTextColor     = Color.White,
                unfocusedTextColor   = Color.White
            ),
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(Modifier.height(12.dp))

        // ── Tab bar ──────────────────────────────────────────────────────
        ScrollableTabRow(
            selectedTabIndex = selectedTab.ordinal,
            containerColor = DeepNavy,
            contentColor = Indigo400,
            edgePadding = 16.dp,
            divider = { HorizontalDivider(color = Slate700, thickness = 1.dp) }
        ) {
            LogTab.values().forEachIndexed { index, tab ->
                val label = when (tab) {
                    LogTab.APP      -> "Application"
                    LogTab.PIPELINE -> "Pipelines"
                    LogTab.AZURE    -> "Azure Cloud"
                    LogTab.DEPLOY   -> "Deploy Stream"
                }
                val badge = when (tab) {
                    LogTab.APP      -> state.appLogs.count { it.level >= LogLevel.ERROR }
                    LogTab.PIPELINE -> state.pipelineLogs.count { it.conclusion == "failure" }
                    LogTab.AZURE    -> state.azureLogs.count { it.level >= LogLevel.ERROR }
                    LogTab.DEPLOY   -> 0
                }
                Tab(
                    selected = selectedTab == tab,
                    onClick  = { selectedTab = tab },
                    text = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(label, fontSize = 13.sp)
                            if (badge > 0) {
                                Badge(containerColor = Red500) {
                                    Text("$badge", fontSize = 10.sp)
                                }
                            }
                        }
                    }
                )
            }
        }

        // ── Level filter chips (for APP / AZURE tabs) ─────────────────────
        if (selectedTab == LogTab.APP || selectedTab == LogTab.AZURE) {
            Row(
                modifier = Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                LevelChip("All", null, levelFilter) { levelFilter = null }
                LogLevel.values().reversed().forEach { level ->
                    LevelChip(level.name, level, levelFilter) { levelFilter = level }
                }
            }
        }

        // ── Content ──────────────────────────────────────────────────────
        when (selectedTab) {
            LogTab.APP      -> AppLogsList(
                logs = state.appLogs.filter {
                    (levelFilter == null || it.level == levelFilter) &&
                    (searchQuery.isEmpty() || it.line.contains(searchQuery, ignoreCase = true))
                }
            )
            LogTab.PIPELINE -> PipelineLogsList(
                runs = state.pipelineLogs.filter {
                    searchQuery.isEmpty() ||
                    it.name.contains(searchQuery, ignoreCase = true) ||
                    it.headBranch.contains(searchQuery, ignoreCase = true)
                }
            )
            LogTab.AZURE    -> AppLogsList(
                logs = state.azureLogs.filter {
                    (levelFilter == null || it.level == levelFilter) &&
                    (searchQuery.isEmpty() || it.line.contains(searchQuery, ignoreCase = true))
                }
            )
            LogTab.DEPLOY   -> DeployStreamList(lines = deployStream)
        }
    }
}

// ── Log entry row ────────────────────────────────────────────────────────────

@Composable
fun AppLogsList(logs: List<LogEntry>) {
    if (logs.isEmpty()) {
        EmptyState("No logs found")
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        items(logs, key = { it.timestampNs }) { entry ->
            LogEntryRow(entry)
        }
    }
}

@Composable
fun LogEntryRow(entry: LogEntry) {
    val levelColor = when (entry.level) {
        LogLevel.CRITICAL -> Color(0xFFFF3B3B)
        LogLevel.ERROR    -> Red500
        LogLevel.WARN     -> Amber500
        LogLevel.DEBUG    -> Slate500
        LogLevel.INFO     -> SkyBlue
    }
    val levelBg = levelColor.copy(alpha = 0.08f)

    Surface(
        color = Navy900,
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Level indicator
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(levelBg)
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    entry.level.name.take(4),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = levelColor,
                    fontFamily = FontFamily.Monospace
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                // App label
                entry.labels["app"]?.let { app ->
                    Text(app, fontSize = 10.sp, color = Indigo400)
                }
                Text(
                    entry.line,
                    fontSize = 12.sp,
                    color = if (entry.level >= LogLevel.ERROR) Color.White else Slate200,
                    fontFamily = FontFamily.Monospace,
                    lineHeight = 16.sp
                )
            }
        }
    }
}

// ── Pipeline run rows ────────────────────────────────────────────────────────

@Composable
fun PipelineLogsList(runs: List<GitHubRun>) {
    if (runs.isEmpty()) {
        EmptyState("No pipeline runs found")
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(runs, key = { it.id }) { run ->
            PipelineRunRow(run)
        }
    }
}

@Composable
fun PipelineRunRow(run: GitHubRun) {
    val (statusColor, statusIcon) = when {
        run.conclusion == "success"  -> Green500 to "✅"
        run.conclusion == "failure"  -> Red500 to "❌"
        run.status == "in_progress"  -> Amber500 to "⏳"
        run.status == "queued"       -> Slate400 to "⬜"
        else                         -> Slate700 to "○"
    }

    Surface(
        color = Navy900,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(statusIcon, fontSize = 18.sp)
            Column(modifier = Modifier.weight(1f)) {
                Text(run.name, fontWeight = FontWeight.Medium, color = Color.White, fontSize = 14.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(run.headBranch, fontSize = 11.sp, color = Indigo400)
                    Text(formatRelativeTime(run.createdAt), fontSize = 11.sp, color = Slate500)
                }
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(statusColor.copy(alpha = 0.15f))
                    .padding(horizontal = 8.dp, vertical = 3.dp)
            ) {
                Text(
                    run.conclusion ?: run.status,
                    fontSize = 11.sp,
                    color = statusColor,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

// ── Deploy stream ─────────────────────────────────────────────────────────────

@Composable
fun DeployStreamList(lines: List<String>) {
    val listState = rememberLazyListState()

    LaunchedEffect(lines.size) {
        if (lines.isNotEmpty()) listState.animateScrollToItem(lines.size - 1)
    }

    if (lines.isEmpty()) {
        EmptyState("No active deployment stream.\nTrigger a deploy to see live logs.")
        return
    }

    LazyColumn(
        state = listState,
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF020408))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        items(lines) { line ->
            Text(
                line,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                color = when {
                    line.contains("ERROR") || line.contains("❌") -> Red500
                    line.contains("✅") || line.contains("success", ignoreCase = true) -> Green500
                    line.contains("⏳") || line.contains("Running") -> Amber500
                    else -> Color(0xFF9CA3AF)
                },
                lineHeight = 15.sp
            )
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

@Composable
fun LevelChip(label: String, level: LogLevel?, selected: LogLevel?, onClick: () -> Unit) {
    val active = selected == level
    val color = when (level) {
        LogLevel.CRITICAL -> Color(0xFFFF3B3B)
        LogLevel.ERROR    -> Red500
        LogLevel.WARN     -> Amber500
        LogLevel.INFO     -> SkyBlue
        LogLevel.DEBUG    -> Slate500
        null              -> Slate400
    }
    FilterChip(
        selected = active,
        onClick  = onClick,
        label = { Text(label, fontSize = 12.sp) },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = color.copy(alpha = 0.18f),
            selectedLabelColor     = color,
            containerColor         = Navy900,
            labelColor             = Slate400
        ),
        border = FilterChipDefaults.filterChipBorder(
            enabled = true,
            selected = active,
            selectedBorderColor = color,
            borderColor = Slate700
        )
    )
}

@Composable
fun EmptyState(message: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(message, color = Slate500, fontSize = 14.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

fun formatRelativeTime(isoDate: String): String {
    return try {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault())
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        val date = sdf.parse(isoDate) ?: return isoDate
        val diffMs = System.currentTimeMillis() - date.time
        val mins = diffMs / 60_000
        val hrs  = mins / 60
        val days = hrs / 24
        when {
            mins < 1  -> "just now"
            mins < 60 -> "${mins}m ago"
            hrs < 24  -> "${hrs}h ago"
            else      -> "${days}d ago"
        }
    } catch (_: Exception) { isoDate }
}
