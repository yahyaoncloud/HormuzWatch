package io.hormuzwatch.deploy.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import io.hormuzwatch.deploy.BuildConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

sealed class AuthUiState {
    object Idle        : AuthUiState()
    object Loading     : AuthUiState()
    data class Authenticated(val email: String, val displayName: String?) : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}

class AuthViewModel : ViewModel() {

    private val auth = FirebaseAuth.getInstance()

    private val _uiState = MutableStateFlow<AuthUiState>(
        // Auto-restore session if already signed in
        auth.currentUser?.let {
            AuthUiState.Authenticated(it.email ?: "", it.displayName)
        } ?: AuthUiState.Idle
    )
    val uiState: StateFlow<AuthUiState> = _uiState

    val currentUser get() = auth.currentUser

    fun firebaseAuthWithGoogle(idToken: String) = viewModelScope.launch {
        _uiState.value = AuthUiState.Loading
        try {
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            val result = auth.signInWithCredential(credential).await()
            val user = result.user!!

            // Enforce allowed account
            val allowed = BuildConfig.ALLOWED_GOOGLE_ACCOUNT
            if (allowed.isNotEmpty() && user.email?.lowercase() != allowed.lowercase()) {
                auth.signOut()
                _uiState.value = AuthUiState.Error(
                    "Access denied. Only $allowed is authorised."
                )
                return@launch
            }

            _uiState.value = AuthUiState.Authenticated(
                email       = user.email ?: "",
                displayName = user.displayName
            )
        } catch (e: Exception) {
            _uiState.value = AuthUiState.Error("Authentication failed: ${e.message}")
        }
    }

    fun signOut() {
        auth.signOut()
        _uiState.value = AuthUiState.Idle
    }

    fun setError(msg: String) {
        _uiState.value = AuthUiState.Error(msg)
    }
}
