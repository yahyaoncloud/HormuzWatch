package io.hormuzwatch.deploy

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.*
import io.hormuzwatch.deploy.auth.*
import io.hormuzwatch.deploy.dashboard.DashboardScreen
import io.hormuzwatch.deploy.logs.*
import io.hormuzwatch.deploy.settings.SettingsScreen
import io.hormuzwatch.deploy.ui.theme.HormuzTheme
import io.hormuzwatch.deploy.viewmodel.DeployViewModel

// ── Navigation destinations ───────────────────────────────────────────────────

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Dashboard", Icons.Filled.Home)
    object Logs      : Screen("logs",      "Logs",      Icons.Filled.Article)
    object Deploy    : Screen("deploy",    "Deploy",    Icons.Filled.RocketLaunch)
    object Settings  : Screen("settings", "Settings",  Icons.Filled.Settings)
}

val bottomNavItems = listOf(
    Screen.Dashboard,
    Screen.Logs,
    Screen.Deploy,
    Screen.Settings
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            HormuzTheme {
                HormuzApp()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HormuzApp() {
    val authVm:   AuthViewModel   = viewModel()
    val logsVm:   LogsViewModel   = viewModel()
    val deployVm: DeployViewModel = viewModel()

    val authState  by authVm.uiState.collectAsStateWithLifecycle()
    val deployState by deployVm.state.collectAsStateWithLifecycle()
    val logsState  by logsVm.state.collectAsStateWithLifecycle()

    // Forward deploy log lines to logsVm for the deploy stream tab
    LaunchedEffect(deployState) {
        val s = deployState
        if (s is io.hormuzwatch.deploy.viewmodel.DeployState.Running) {
            logsVm.appendDeployLog(s.message)
        }
    }

    // Auth gate
    val isAuthenticated = authState is AuthUiState.Authenticated

    if (!isAuthenticated) {
        AuthScreen(viewModel = authVm, onAuthenticated = {})
        return
    }

    val displayName = (authState as? AuthUiState.Authenticated)?.displayName ?: "User"

    val navController = rememberNavController()
    val navBackStack  by navController.currentBackStackEntryAsState()
    val currentRoute  = navBackStack?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = io.hormuzwatch.deploy.ui.theme.Navy900) {
                bottomNavItems.forEach { screen ->
                    val selected = currentRoute == screen.route

                    // Badge for Logs when errors exist
                    val badgeCount = if (screen == Screen.Logs) {
                        (logsState.appLogs + logsState.azureLogs).count {
                            it.level >= io.hormuzwatch.deploy.logs.api.LogLevel.ERROR
                        }
                    } else 0

                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            if (badgeCount > 0) {
                                BadgedBox(badge = {
                                    Badge { Text("$badgeCount") }
                                }) {
                                    Icon(screen.icon, contentDescription = screen.label)
                                }
                            } else {
                                Icon(screen.icon, contentDescription = screen.label)
                            }
                        },
                        label = { Text(screen.label, fontSize = androidx.compose.ui.unit.TextUnit(11f, androidx.compose.ui.unit.TextUnitType.Sp)) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor   = io.hormuzwatch.deploy.ui.theme.SkyBlue,
                            selectedTextColor   = io.hormuzwatch.deploy.ui.theme.SkyBlue,
                            unselectedIconColor = io.hormuzwatch.deploy.ui.theme.Slate500,
                            unselectedTextColor = io.hormuzwatch.deploy.ui.theme.Slate500,
                            indicatorColor      = io.hormuzwatch.deploy.ui.theme.Indigo600.copy(alpha = 0.15f)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Dashboard.route) {
                DashboardScreen(
                    logsViewModel    = logsVm,
                    userName         = displayName,
                    onNavigateToLogs = {
                        navController.navigate(Screen.Logs.route)
                    }
                )
            }

            composable(Screen.Logs.route) {
                LogsScreen(
                    viewModel    = logsVm,
                    deployStream = logsState.deployStream
                )
            }

            composable(Screen.Deploy.route) {
                DeployScreenWrapper(deployVm = deployVm, logsVm = logsVm)
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    authViewModel = authVm,
                    onSignOut     = {}
                )
            }
        }
    }
}

// ── Deploy screen wrapper (reuses existing DeployApp logic) ───────────────────

@Composable
fun DeployScreenWrapper(
    deployVm: DeployViewModel,
    logsVm:   LogsViewModel
) {
    val state by deployVm.state.collectAsStateWithLifecycle()

    // When a deploy is triggered, clear and start streaming
    LaunchedEffect(state) {
        val s = state
        if (s is io.hormuzwatch.deploy.viewmodel.DeployState.Running && s.progress == 5) {
            logsVm.clearDeployStream()
        }
    }

    // Minimal deploy page reusing DeployApp internals
    io.hormuzwatch.deploy.DeployPageContent(vm = deployVm)
}
