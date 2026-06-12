package io.hormuzwatch.deploy

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import io.hormuzwatch.deploy.ui.theme.*
import io.hormuzwatch.deploy.viewmodel.*

@Composable
fun DeployPageContent(vm: DeployViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    val status by vm.infraStatus.collectAsStateWithLifecycle()
    val runs   by vm.recentRuns.collectAsStateWithLifecycle()

    var selectedEnv       by remember { mutableStateOf("dev") }
    var showDestroyDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { vm.loadRecentRuns() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DeepNavy)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // Title
        Column {
            Text("Deploy", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Text("Manage Azure Infrastructure", fontSize = 12.sp, color = Slate400)
        }

        // Env selector
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf("dev", "prod").forEach { env ->
                val active = env == selectedEnv
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (active) Indigo600 else Navy900)
                        .clickable { selectedEnv = env }
                        .padding(horizontal = 24.dp, vertical = 12.dp)
                ) {
                    Text(
                        env.replaceFirstChar { it.uppercase() },
                        color = if (active) Color.White else Slate400,
                        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal
                    )
                }
            }
        }

        // Status card
        Surface(color = Navy900, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Infrastructure Status", fontWeight = FontWeight.SemiBold, color = Color.White)
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    listOf(
                        "Backend" to status.backend,
                        "Frontend" to status.frontend,
                        "DB" to status.database,
                        "Redis" to status.redis
                    ).forEach { (label, up) ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(
                                Modifier.size(7.dp).clip(androidx.compose.foundation.shape.CircleShape)
                                    .background(if (up) Green500 else Slate700)
                            )
                            Text(label, fontSize = 12.sp, color = if (up) Color.White else Slate500)
                        }
                    }
                }
                Text(status.estimatedCost, fontSize = 12.sp, color = SkyBlue)
            }
        }

        // Buttons
        val isRunning = state is DeployState.Running

        Button(
            onClick = { vm.deployInfra(selectedEnv) },
            enabled = !isRunning,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Indigo600,
                disabledContainerColor = Slate700
            )
        ) {
            if (isRunning) {
                CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                Spacer(Modifier.width(8.dp))
            } else {
                Icon(Icons.Filled.PlayArrow, null, Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(
                if (isRunning) "Deploying..." else "🚀 Deploy Infra",
                fontWeight = FontWeight.SemiBold
            )
        }

        OutlinedButton(
            onClick = { showDestroyDialog = true },
            enabled = !isRunning,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, if (!isRunning) Red500 else Slate700)
        ) {
            Text("🗑️ Destroy Infra", color = if (!isRunning) Red500 else Slate500, fontWeight = FontWeight.SemiBold)
        }

        // Progress
        AnimatedVisibility(isRunning) {
            val s = state as? DeployState.Running
            Surface(color = Navy900, shape = RoundedCornerShape(14.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(s?.message ?: "", color = Color.White, fontSize = 13.sp)
                    LinearProgressIndicator(
                        progress = { (s?.progress ?: 0) / 100f },
                        modifier = Modifier.fillMaxWidth(),
                        color = SkyBlue,
                        trackColor = Slate700
                    )
                    Text("${s?.progress ?: 0}%", fontSize = 11.sp, color = Slate400)
                }
            }
        }

        // Success / Error
        AnimatedVisibility(state is DeployState.Success || state is DeployState.Error) {
            val isSuccess = state is DeployState.Success
            Surface(
                color = if (isSuccess) Color(0xFF052E16) else Color(0xFF450A0A),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(if (isSuccess) "✅" else "❌", fontSize = 16.sp)
                    Text(
                        if (isSuccess) (state as DeployState.Success).message
                        else (state as DeployState.Error).message,
                        color = if (isSuccess) Green500 else Red500,
                        fontSize = 13.sp
                    )
                }
            }
            TextButton(onClick = { vm.reset() }) {
                Text("Dismiss", color = Slate400, fontSize = 12.sp)
            }
        }

        // Recent runs
        if (runs.isNotEmpty()) {
            Text("Recent Workflows", fontWeight = FontWeight.SemiBold, color = Color.White, fontSize = 15.sp)
            runs.take(5).forEach { run ->
                val statusColor = when {
                    run.conclusion == "success" -> Green500
                    run.conclusion == "failure" -> Red500
                    run.status == "in_progress" -> Amber500
                    else -> Slate500
                }
                Surface(color = Navy900, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        Modifier.padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(run.name, fontSize = 13.sp, color = Color.White, modifier = Modifier.weight(1f))
                        Text(run.conclusion ?: run.status, fontSize = 11.sp, color = statusColor)
                    }
                }
            }
        }

        Spacer(Modifier.height(8.dp))
    }

    if (showDestroyDialog) {
        AlertDialog(
            onDismissRequest = { showDestroyDialog = false },
            containerColor = Navy900,
            title = { Text("⚠️ Destroy $selectedEnv?", color = Amber500, fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "All Azure resources for $selectedEnv will be deleted.\nDatabase will be backed up first.",
                    color = Slate400, fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = { showDestroyDialog = false; vm.destroyInfra(selectedEnv) },
                    colors = ButtonDefaults.buttonColors(containerColor = Red500)
                ) { Text("Destroy") }
            },
            dismissButton = {
                TextButton(onClick = { showDestroyDialog = false }) {
                    Text("Cancel", color = Slate400)
                }
            }
        )
    }
}
