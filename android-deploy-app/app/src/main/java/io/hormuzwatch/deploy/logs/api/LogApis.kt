package io.hormuzwatch.deploy.logs.api

import com.google.gson.annotations.SerializedName
import io.hormuzwatch.deploy.BuildConfig
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

// ── Loki response models ───────────────────────────────────────────────────────

data class LokiQueryResponse(
    val status: String,
    val data: LokiData
)

data class LokiData(
    val resultType: String,
    val result: List<LokiStream>
)

data class LokiStream(
    val stream: Map<String, String>,  // labels
    val values: List<List<String>>    // [[timestamp_ns, log_line], ...]
)

data class LogEntry(
    val timestampNs: String,
    val line: String,
    val labels: Map<String, String>,
    val source: LogSource
) {
    val level: LogLevel get() = when {
        line.contains("CRITICAL", ignoreCase = true) ||
        line.contains("FATAL", ignoreCase = true)    -> LogLevel.CRITICAL
        line.contains("ERROR", ignoreCase = true)    -> LogLevel.ERROR
        line.contains("WARN", ignoreCase = true)     -> LogLevel.WARN
        line.contains("DEBUG", ignoreCase = true)    -> LogLevel.DEBUG
        else                                          -> LogLevel.INFO
    }
}

enum class LogLevel { DEBUG, INFO, WARN, ERROR, CRITICAL }
enum class LogSource { APP, PIPELINE, AZURE }

// ── Loki HTTP API ──────────────────────────────────────────────────────────────

interface LokiApi {
    @GET("loki/api/v1/query_range")
    suspend fun queryRange(
        @Query("query") query: String,
        @Query("start") start: String,     // epoch nanoseconds
        @Query("end") end: String,
        @Query("limit") limit: Int = 200,
        @Query("direction") direction: String = "backward"
    ): LokiQueryResponse

    @GET("loki/api/v1/labels")
    suspend fun getLabels(): Map<String, Any>
}

// ── GitHub Actions log API ─────────────────────────────────────────────────────

data class WorkflowRunLog(
    val runId: Long,
    val workflowName: String,
    val status: String,
    val conclusion: String?,
    val createdAt: String,
    val logContent: String = ""
)

interface GitHubLogsApi {
    @GET("repos/{owner}/{repo}/actions/runs")
    suspend fun getRuns(
        @Path("owner") owner: String,
        @Path("repo") repo: String,
        @Query("per_page") perPage: Int = 20,
        @Header("Authorization") token: String,
        @Header("Accept") accept: String = "application/vnd.github+json"
    ): GitHubRunsResponse
}

data class GitHubRunsResponse(
    @SerializedName("workflow_runs") val workflowRuns: List<GitHubRun>
)

data class GitHubRun(
    val id: Long,
    val name: String,
    val status: String,
    val conclusion: String?,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("updated_at") val updatedAt: String,
    @SerializedName("html_url") val htmlUrl: String,
    @SerializedName("head_branch") val headBranch: String
)

// ── Azure Monitor Log Analytics API ────────────────────────────────────────────

data class AzureQueryRequest(
    val query: String,
    val timespan: String = "PT1H"   // ISO 8601 duration
)

data class AzureQueryResponse(
    val tables: List<AzureTable>
)

data class AzureTable(
    val name: String,
    val columns: List<AzureColumn>,
    val rows: List<List<Any?>>
)

data class AzureColumn(
    val name: String,
    val type: String
)

interface AzureMonitorApi {
    @POST("v1/workspaces/{workspaceId}/query")
    suspend fun query(
        @Path("workspaceId") workspaceId: String,
        @Body request: AzureQueryRequest,
        @Header("Authorization") bearer: String
    ): AzureQueryResponse
}

// ── Singleton clients ──────────────────────────────────────────────────────────

object LogApiClients {
    val loki: LokiApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.LOKI_BASE_URL.trimEnd('/') + "/")
            .addConverterFactory(GsonConverterFactory.create())
            .client(
                OkHttpClient.Builder()
                    .connectTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .build()
            )
            .build()
            .create(LokiApi::class.java)
    }

    val github: GitHubLogsApi by lazy {
        Retrofit.Builder()
            .baseUrl("https://api.github.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(GitHubLogsApi::class.java)
    }

    val azureMonitor: AzureMonitorApi by lazy {
        Retrofit.Builder()
            .baseUrl("https://api.loganalytics.io/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(AzureMonitorApi::class.java)
    }
}
