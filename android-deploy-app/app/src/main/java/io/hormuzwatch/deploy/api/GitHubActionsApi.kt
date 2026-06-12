package io.hormuzwatch.deploy.api

import retrofit2.http.*

data class WorkflowDispatchRequest(
    val ref: String,
    val inputs: Map<String, String>
)

data class WorkflowRun(
    val id: Long,
    val status: String,      // queued, in_progress, completed
    val conclusion: String?, // success, failure, cancelled
    val html_url: String,
    val created_at: String,
    val name: String
)

data class WorkflowRunsResponse(
    val workflow_runs: List<WorkflowRun>
)

interface GitHubActionsApi {

    @POST("repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches")
    suspend fun triggerWorkflow(
        @Path("owner") owner: String,
        @Path("repo") repo: String,
        @Path("workflow_id") workflowId: String,
        @Body request: WorkflowDispatchRequest,
        @Header("Authorization") token: String,
        @Header("Accept") accept: String = "application/vnd.github+json"
    )

    @GET("repos/{owner}/{repo}/actions/runs")
    suspend fun getWorkflowRuns(
        @Path("owner") owner: String,
        @Path("repo") repo: String,
        @Query("workflow_id") workflowId: String? = null,
        @Query("per_page") perPage: Int = 5,
        @Header("Authorization") token: String,
        @Header("Accept") accept: String = "application/vnd.github+json"
    ): WorkflowRunsResponse

    @GET("repos/{owner}/{repo}/actions/runs/{run_id}")
    suspend fun getWorkflowRun(
        @Path("owner") owner: String,
        @Path("repo") repo: String,
        @Path("run_id") runId: Long,
        @Header("Authorization") token: String,
        @Header("Accept") accept: String = "application/vnd.github+json"
    ): WorkflowRun
}
