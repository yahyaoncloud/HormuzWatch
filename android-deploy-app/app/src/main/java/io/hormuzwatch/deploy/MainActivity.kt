package io.hormuzwatch.deploy

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
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
import androidx.lifecycle.viewmodel.compose.viewModel
import io.hormuzwatch.deploy.viewmodel.DeployState
import io.hormuzwatch.deploy.viewmodel.DeployViewModel
import kotlinx.coroutines.launch

// ── Design tokens ──────────────────────────────────────────────────────────
private val DeepNavy   = Color(0xFF050816)
private val Indigo     = Color(0xFF4F46E5)
private val IndigoLight= Color(0xFF818CF8)
private val SkyBlue    = Color(0xFF38BDF8)
private val Slate700   = Color(0xFF334155)
private val Slate400   = Color(0xFF94A3B8)
private val Green      = Color(0xFF22C55E)
private val Red        = Color(0xFFEF4444)
private val Amber      = Color(0xFFF59E0B)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            HormuzWatchDeployTheme {
                DeployApp()
            }
        }
    }
}

@Composable
fun HormuzWatchDeployTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            background  = DeepNavy,
            surface     = Color(0xFF0F172A),
            primary     = Indigo,
            onPrimary   = Color.White,
            onBackground= Color.White,
            onSurface   = Color.White
        ),
        content = content
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeployApp(vm: DeployViewModel = viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    val status by vm.infraStatus.collectAsStateWithLifecycle()
    val runs   by vm.recentRuns.collectAsStateWithLifecycle()

    var selectedEnv by remember { mutableStateOf("dev") }
    var showDestroyCofirm by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { vm.loadRecentRuns() }

    // Show snackbar on success/error
    LaunchedEffect(state) {
        when (val s = state) {
            is DeployState.Success -> scope.launch {
                snackbar.showSnackbar(s.message, duration = SnackbarDuration.Long)
            }
            is DeployState.Error -> scope.launch {
                snackbar.showSnackbar("❌ ${s.message}", duration = SnackbarDuration.Long)
            }
            else -> {}
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        containerColor = DeepNavy
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Header
            AppHeader()

            // Environment selector
            EnvSelector(selected = selectedEnv, onSelect = { selectedEnv = it })

            // Status card
            InfraStatusCard(status = status.copy(env = selectedEnv))

            // Deploy / Destroy buttons
            ActionButtons(
                state = state,
                onDeploy  = { vm.deployInfra(selectedEnv) },
                onDestroy = { showDestroyCofirm = true },
                onReset   = { vm.reset() }
            )

            // Progress
            AnimatedVisibility(state is DeployState.Running) {
                ProgressCard(state as? DeployState.Running)
            }

            // Recent workflow runs
            if (runs.isNotEmpty()) {
                RecentRunsCard(runs.take(5))
            }
        }
    }

    // Destroy confirmation dialog
    if (showDestroyCofirm) {
        AlertDialog(
            onDismissRequest = { showDestroyCofirm = false },
            containerColor = Color(0xFF0F172A),
            title = {
                Text("⚠️ Destroy $selectedEnv?", color = Amber, fontWeight = FontWeight.Bold)
            },
            text = {
                Text(
                    "All Azure resources for the $selectedEnv environment will be deleted.\n\n" +
                    "Your database will be backed up to Azure Blob Storage first.",
                    color = Slate400
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDestroyCofirm = false
                        vm.destroyInfra(selectedEnv)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Red)
                ) { Text("Destroy") }
            },
            dismissButton = {
                TextButton(onClick = { showDestroyCofirm = false }) {
                    Text("Cancel", color = Slate400)
                }
            }
        )
    }
}

@Composable
fun AppHeader() {
    Column {
        Text(
            "HormuzWatch",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Text(
            "Infrastructure Control Center",
            fontSize = 13.sp,
            color = IndigoLight
        )
    }
}

@Composable
fun EnvSelector(selected: String, onSelect: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        listOf("dev" to "Dev", "prod" to "Prod").forEach { (env, label) ->
            val active = env == selected
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (active) Indigo else Slate700)
                    .clickable { onSelect(env) }
                    .padding(horizontal = 20.dp, vertical = 10.dp)
            ) {
                Text(label, color = if (active) Color.White else Slate400, fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
fun InfraStatusCard(status: io.hormuzwatch.deploy.viewmodel.InfraStatus) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Infrastructure Status", fontWeight = FontWeight.SemiBold, color = Color.White)
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                StatusDot("Backend", status.backend)
                StatusDot("Frontend", status.frontend)
                StatusDot("DB", status.database)
                StatusDot("Redis", status.redis)
            }
            Text("Est. cost: ${status.estimatedCost}", fontSize = 12.sp, color = SkyBlue)
        }
    }
}

@Composable
fun StatusDot(label: String, active: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(Modifier.size(8.dp).clip(RoundedCornerShape(50)).background(if (active) Green else Slate700))
        Text(label, fontSize = 12.sp, color = if (active) Color.White else Slate400)
    }
}

@Composable
fun ActionButtons(
    state: DeployState,
    onDeploy: () -> Unit,
    onDestroy: () -> Unit,
    onReset: () -> Unit
) {
    val isRunning = state is DeployState.Running
    val isDone = state is DeployState.Success || state is DeployState.Error

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Button(
            onClick = onDeploy,
            enabled = !isRunning,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Indigo,
                disabledContainerColor = Slate700
            )
        ) {
            Icon(Icons.Filled.PlayArrow, null, Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text("🚀  Deploy Infra", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }

        OutlinedButton(
            onClick = onDestroy,
            enabled = !isRunning,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, if (!isRunning) Red else Slate700)
        ) {
            Text("🗑️  Destroy Infra", fontSize = 16.sp, color = if (!isRunning) Red else Slate400)
        }

        if (isDone) {
            TextButton(onClick = onReset, modifier = Modifier.fillMaxWidth()) {
                Text("Reset", color = Slate400)
            }
        }
    }
}

@Composable
fun ProgressCard(state: DeployState.Running?) {
    state ?: return
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(state.message, color = Color.White, fontWeight = FontWeight.Medium)
            LinearProgressIndicator(
                progress = { state.progress / 100f },
                modifier = Modifier.fillMaxWidth(),
                color = SkyBlue,
                trackColor = Slate700
            )
            Text("${state.progress}% complete", fontSize = 12.sp, color = Slate400)
        }
    }
}

@Composable
fun RecentRunsCard(runs: List<io.hormuzwatch.deploy.api.WorkflowRun>) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Recent Workflows", fontWeight = FontWeight.SemiBold, color = Color.White)
            runs.forEach { run ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(run.name, fontSize = 12.sp, color = Slate400, modifier = Modifier.weight(1f))
                    val (icon, color) = when {
                        run.conclusion == "success" -> "✅" to Green
                        run.conclusion == "failure" -> "❌" to Red
                        run.status == "in_progress" -> "⏳" to Amber
                        else -> "⬜" to Slate400
                    }
                    Text(icon, fontSize = 14.sp)
                }
            }
        }
    }
}
