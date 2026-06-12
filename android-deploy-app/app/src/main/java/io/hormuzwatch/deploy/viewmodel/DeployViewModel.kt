package io.hormuzwatch.deploy.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.hormuzwatch.deploy.BuildConfig
import io.hormuzwatch.deploy.api.GitHubActionsApi
import io.hormuzwatch.deploy.api.WorkflowDispatchRequest
import io.hormuzwatch.deploy.api.WorkflowRun
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

sealed class DeployState {
    object Idle : DeployState()
    data class Running(val message: String, val progress: Int = 0) : DeployState()
    data class Success(val message: String, val url: String = "") : DeployState()
    data class Error(val message: String) : DeployState()
}

data class InfraStatus(
    val env: String,
    val backend: Boolean = false,
    val frontend: Boolean = false,
    val database: Boolean = false,
    val redis: Boolean = false,
    val lastDeploy: String = "unknown",
    val estimatedCost: String = "~\$90/mo"
)

class DeployViewModel : ViewModel() {

    private val _state = MutableStateFlow<DeployState>(DeployState.Idle)
    val state: StateFlow<DeployState> = _state

    private val _infraStatus = MutableStateFlow(InfraStatus("dev"))
    val infraStatus: StateFlow<InfraStatus> = _infraStatus

    private val _recentRuns = MutableStateFlow<List<WorkflowRun>>(emptyList())
    val recentRuns: StateFlow<List<WorkflowRun>> = _recentRuns

    private val api: GitHubActionsApi by lazy {
        Retrofit.Builder()
            .baseUrl("https://api.github.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(GitHubActionsApi::class.java)
    }

    private val token get() = "Bearer ${BuildConfig.GITHUB_TOKEN}"
    private val repo = BuildConfig.GITHUB_REPO
    private val owner = repo.split("/").getOrNull(0) ?: ""
    private val repoName = repo.split("/").getOrNull(1) ?: ""

    fun deployInfra(env: String) = viewModelScope.launch {
        _state.value = DeployState.Running("🚀 Triggering deployment for $env...", 5)
        try {
            val ref = if (env == "prod") "azure-dep" else "mvp"

            api.triggerWorkflow(
                owner, repoName,
                "terraform-apply.yml",
                WorkflowDispatchRequest(
                    ref = ref,
                    inputs = mapOf("action" to "apply", "environment" to env)
                ),
                token
            )
            _state.value = DeployState.Running("⏳ Infra provisioning (~5 min)...", 20)

            // Poll for workflow completion
            val run = pollForLatestRun("terraform-apply.yml", env)
            if (run != null) {
                _state.value = DeployState.Running("🐳 Building & deploying containers...", 70)

                // Trigger backend deploy after infra
                api.triggerWorkflow(
                    owner, repoName,
                    "deploy-backend.yml",
                    WorkflowDispatchRequest(ref = ref, inputs = mapOf("environment" to env)),
                    token
                )
                pollForLatestRun("deploy-backend.yml", env)
                _state.value = DeployState.Success(
                    "✅ $env environment is LIVE!",
                    "https://hormuzwatch.azurestaticapps.net"
                )
            }
        } catch (e: Exception) {
            _state.value = DeployState.Error("Deploy failed: ${e.message}")
        }
    }

    fun destroyInfra(env: String) = viewModelScope.launch {
        _state.value = DeployState.Running("💾 Backing up data before destroy...", 10)
        try {
            val ref = if (env == "prod") "azure-dep" else "mvp"

            // Step 1: Backup first
            api.triggerWorkflow(
                owner, repoName,
                "ansible-config.yml",
                WorkflowDispatchRequest(
                    ref = ref,
                    inputs = mapOf("playbook" to "backup", "environment" to env)
                ),
                token
            )
            pollForLatestRun("ansible-config.yml", env)

            _state.value = DeployState.Running("🗑️ Destroying $env infrastructure...", 50)

            // Step 2: Destroy infra
            api.triggerWorkflow(
                owner, repoName,
                "terraform-apply.yml",
                WorkflowDispatchRequest(
                    ref = ref,
                    inputs = mapOf("action" to "destroy", "environment" to env)
                ),
                token
            )
            pollForLatestRun("terraform-apply.yml", env)

            _state.value = DeployState.Success("🗑️ $env infrastructure destroyed. Data backed up.")
            _infraStatus.value = InfraStatus(env, false, false, false, false)

        } catch (e: Exception) {
            _state.value = DeployState.Error("Destroy failed: ${e.message}")
        }
    }

    fun loadRecentRuns() = viewModelScope.launch {
        try {
            val runs = api.getWorkflowRuns(owner, repoName, token = token)
            _recentRuns.value = runs.workflow_runs
        } catch (_: Exception) {}
    }

    fun reset() { _state.value = DeployState.Idle }

    private suspend fun pollForLatestRun(workflow: String, env: String): WorkflowRun? {
        // Wait for the workflow to appear
        delay(3000)
        repeat(60) { attempt ->
            try {
                val runs = api.getWorkflowRuns(owner, repoName, workflow, token = token)
                val latest = runs.workflow_runs.firstOrNull()
                if (latest != null && (latest.status == "completed")) {
                    return latest
                }
                val progress = minOf(90, 20 + attempt * 1)
                _state.value = DeployState.Running(
                    "⏳ Workflow running... (${attempt * 5}s elapsed)",
                    progress
                )
            } catch (_: Exception) {}
            delay(5000) // poll every 5s
        }
        return null
    }
}
