package io.hormuzwatch.deploy.dashboard

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.hormuzwatch.deploy.logs.LogsViewModel
import io.hormuzwatch.deploy.logs.api.*
import io.hormuzwatch.deploy.logs.formatRelativeTime
import io.hormuzwatch.deploy.ui.theme.*

@Composable
fun DashboardScreen(
    logsViewModel: LogsViewModel,
    userName: String,
    onNavigateToLogs: () -> Unit
) {
    val logsState by logsViewModel.state.collectAsStateWithLifecycle()

    // Derived metrics
    val severeLogs  = (logsState.appLogs + logsState.azureLogs).count { it.level >= LogLevel.ERROR }
    val warnLogs    = (logsState.appLogs + logsState.azureLogs).count { it.level == LogLevel.WARN }
    val failedRuns  = logsState.pipelineLogs.count { it.conclusion == "failure" }
    val activeRuns  = logsState.pipelineLogs.count { it.status == "in_progress" }
    val recentDeploys = logsState.pipelineLogs.take(5)
    val recentErrors = (logsState.appLogs + logsState.azureLogs)
        .filter { it.level >= LogLevel.ERROR }
        .take(5)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DeepNavy)
            .verticalScroll(rememberScrollState())
    ) {
        // ── Header ───────────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color(0xFF1A1464).copy(alpha = 0.6f), Color.Transparent)
                    )
                )
                .padding(horizontal = 20.dp, vertical = 20.dp)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "Good ${greeting()}, ${userName.split(" ").first()}",
                    fontSize = 13.sp,
                    color = Slate400
                )
                Text(
                    "HormuzWatch",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    "Infrastructure Command Center",
                    fontSize = 12.sp,
                    color = Indigo400
                )
            }
        }

        Column(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ── Alert banner (if severe issues) ──────────────────────────────
            if (severeLogs > 0 || failedRuns > 0) {
                Surface(
                    color = Color(0xFF450A0A),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Filled.Warning, null, tint = Red500, modifier = Modifier.size(20.dp))
                        Column {
                            Text("Issues Detected", fontWeight = FontWeight.SemiBold, color = Red500, fontSize = 14.sp)
                            Text(
                                buildString {
                                    if (severeLogs > 0) append("$severeLogs error logs  ")
                                    if (failedRuns > 0) append("$failedRuns failed pipelines")
                                },
                                color = Color(0xFFFCA5A5), fontSize = 12.sp
                            )
                        }
                        Spacer(Modifier.weight(1f))
                        TextButton(onClick = onNavigateToLogs) {
                            Text("View", color = Red500, fontSize = 12.sp)
                        }
                    }
                }
            }

            // ── Stat cards ────────────────────────────────────────────────────
            Text("Overview", fontWeight = FontWeight.SemiBold, color = Color.White, fontSize = 16.sp)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                item { StatCard("Error Logs",  "$severeLogs", Red500,    Icons.Filled.Error) }
                item { StatCard("Warnings",    "$warnLogs",   Amber500,  Icons.Filled.WarningAmber) }
                item { StatCard("Pipelines",   "$activeRuns active", SkyBlue, Icons.Filled.PlayCircle) }
                item { StatCard("Failed Runs", "$failedRuns", Red500,    Icons.Filled.Cancel) }
            }

            // ── Recent deployments ────────────────────────────────────────────
            if (recentDeploys.isNotEmpty()) {
                SectionHeader("Recent Deployments", onNavigateToLogs)
                recentDeploys.forEach { run ->
                    DeploymentRow(run)
                }
            }

            // ── Recent errors ─────────────────────────────────────────────────
            if (recentErrors.isNotEmpty()) {
                SectionHeader("Recent Errors", onNavigateToLogs)
                recentErrors.forEach { entry ->
                    ErrorLogRow(entry)
                }
            }

            // ── Loading state ─────────────────────────────────────────────────
            if (logsState.loading && recentDeploys.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Indigo400, strokeWidth = 2.dp)
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

// ── Stat card ─────────────────────────────────────────────────────────────────

@Composable
fun StatCard(title: String, value: String, color: Color, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Surface(
        color = Navy900,
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.width(130.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(color.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, tint = color, modifier = Modifier.size(18.dp))
            }
            Text(value, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
            Text(title, fontSize = 11.sp, color = Slate500)
        }
    }
}

// ── Section header ────────────────────────────────────────────────────────────

@Composable
fun SectionHeader(title: String, onViewAll: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, fontWeight = FontWeight.SemiBold, color = Color.White, fontSize = 16.sp)
        TextButton(onClick = onViewAll) {
            Text("View all", color = Indigo400, fontSize = 12.sp)
        }
    }
}

// ── Deployment row ────────────────────────────────────────────────────────────

@Composable
fun DeploymentRow(run: GitHubRun) {
    val statusColor = when {
        run.conclusion == "success" -> Green500
        run.conclusion == "failure" -> Red500
        run.status == "in_progress" -> Amber500
        else -> Slate500
    }
    Surface(
        color = Navy900,
        shape = RoundedCornerShape(10.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                Modifier.size(8.dp).clip(CircleShape).background(statusColor)
            )
            Column(Modifier.weight(1f)) {
                Text(run.name, fontSize = 13.sp, color = Color.White, fontWeight = FontWeight.Medium)
                Text(run.headBranch, fontSize = 11.sp, color = Indigo400)
            }
            Text(formatRelativeTime(run.createdAt), fontSize = 11.sp, color = Slate500)
        }
    }
}

// ── Error log row ─────────────────────────────────────────────────────────────

@Composable
fun ErrorLogRow(entry: LogEntry) {
    Surface(
        color = Color(0xFF1A0A0A),
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, Red500.copy(alpha = 0.2f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Icon(Icons.Filled.Error, null, tint = Red500, modifier = Modifier.size(14.dp))
            Text(
                entry.line.take(120),
                fontSize = 11.sp,
                color = Color(0xFFFCA5A5),
                lineHeight = 15.sp,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fun greeting(): String {
    val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
    return when {
        hour < 12 -> "morning"
        hour < 17 -> "afternoon"
        else      -> "evening"
    }
}
