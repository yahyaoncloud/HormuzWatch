package io.hormuzwatch.deploy.settings

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.*
import io.hormuzwatch.deploy.auth.AuthViewModel
import io.hormuzwatch.deploy.ui.theme.*
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.material3.ExperimentalMaterial3Api

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    authViewModel: AuthViewModel,
    onSignOut: () -> Unit
) {
    val user = authViewModel.currentUser
    var retentionDays by remember { mutableStateOf("14") }
    var lokiUrl by remember { mutableStateOf("http://localhost:3100") }
    var logLevel by remember { mutableStateOf("INFO") }
    var showPasswordField by remember { mutableStateOf(false) }
    var newPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var saveSnackbar by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DeepNavy)
            .verticalScroll(rememberScrollState())
    ) {
        // ── Header ────────────────────────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 20.dp)
        ) {
            Text("Settings", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Color.White)
        }

        Column(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // ── Profile card ──────────────────────────────────────────────────
            Surface(color = Navy900, shape = RoundedCornerShape(16.dp)) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Indigo600),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            user?.displayName?.firstOrNull()?.toString() ?: "U",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                    Column {
                        Text(
                            user?.displayName ?: "User",
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                        Text(
                            user?.email ?: "",
                            fontSize = 12.sp,
                            color = Slate400
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Box(Modifier.size(6.dp).clip(CircleShape).background(Green500))
                            Text("Google SSO + 2FA", fontSize = 11.sp, color = Slate500)
                        }
                    }
                }
            }

            // ── Log Retention ─────────────────────────────────────────────────
            SettingsSection("Log Management") {
                SettingsField(
                    label = "Log Retention (days)",
                    value = retentionDays,
                    onValueChange = { retentionDays = it },
                    icon = Icons.Filled.Schedule,
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                )

                SettingsField(
                    label = "Loki Base URL",
                    value = lokiUrl,
                    onValueChange = { lokiUrl = it },
                    icon = Icons.Filled.Link
                )

                // Log level dropdown
                var expanded by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = !expanded }
                ) {
                    OutlinedTextField(
                        value = logLevel,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Minimum Log Level", color = Slate500, fontSize = 12.sp) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        colors = settingsTextFieldColors()
                    )
                    ExposedDropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false },
                        modifier = Modifier.background(Navy800)
                    ) {
                        listOf("DEBUG", "INFO", "WARN", "ERROR", "CRITICAL").forEach { level ->
                            DropdownMenuItem(
                                text = { Text(level, color = Color.White, fontSize = 13.sp) },
                                onClick = { logLevel = level; expanded = false }
                            )
                        }
                    }
                }

                Button(
                    onClick = { saveSnackbar = "Log settings saved" },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                ) { Text("Save Log Settings") }
            }

            // ── Security ──────────────────────────────────────────────────────
            SettingsSection("Security") {
                SettingsToggleRow(
                    label = "Update Password",
                    icon = Icons.Filled.Lock,
                    checked = showPasswordField,
                    onCheckedChange = { showPasswordField = it }
                )

                AnimatedVisibility(showPasswordField) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = newPassword,
                            onValueChange = { newPassword = it },
                            label = { Text("New Password", color = Slate500, fontSize = 12.sp) },
                            visualTransformation = if (passwordVisible)
                                VisualTransformation.None else PasswordVisualTransformation(),
                            trailingIcon = {
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(
                                        if (passwordVisible) Icons.Filled.Visibility
                                        else Icons.Filled.VisibilityOff,
                                        null, tint = Slate400
                                    )
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = settingsTextFieldColors()
                        )
                        Button(
                            onClick = {
                                // Firebase update password
                                user?.updatePassword(newPassword)
                                saveSnackbar = "Password updated"
                                newPassword = ""
                                showPasswordField = false
                            },
                            enabled = newPassword.length >= 8,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Indigo600)
                        ) { Text("Update Password") }
                    }
                }

                // 2FA info row
                Surface(
                    color = Navy800,
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Filled.Shield, null, tint = Green500, modifier = Modifier.size(18.dp))
                        Column {
                            Text("2-Step Verification", fontWeight = FontWeight.Medium, color = Color.White, fontSize = 13.sp)
                            Text("Managed by your Google Account", fontSize = 11.sp, color = Slate500)
                        }
                        Spacer(Modifier.weight(1f))
                        Box(
                            Modifier.clip(RoundedCornerShape(6.dp))
                                .background(Green500.copy(alpha = 0.15f))
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) { Text("Active", fontSize = 11.sp, color = Green500) }
                    }
                }
            }

            // ── About ──────────────────────────────────────────────────────────
            SettingsSection("About") {
                SettingsInfoRow(Icons.Filled.Info, "Version", "2.0.0")
                SettingsInfoRow(Icons.Filled.Cloud, "Environment", "Production")
                SettingsInfoRow(Icons.Filled.Code, "Repository", "yahyaoncloud/HormuzWatch")
            }

            // ── Sign Out ───────────────────────────────────────────────────────
            OutlinedButton(
                onClick = {
                    authViewModel.signOut()
                    onSignOut()
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Red500.copy(alpha = 0.5f))
            ) {
                Icon(Icons.Filled.Logout, null, tint = Red500, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Sign Out", color = Red500)
            }

            Spacer(Modifier.height(24.dp))
        }
    }

    saveSnackbar?.let { msg ->
        LaunchedEffect(msg) {
            kotlinx.coroutines.delay(2000)
            saveSnackbar = null
        }
        Box(Modifier.fillMaxSize().padding(bottom = 80.dp), contentAlignment = Alignment.BottomCenter) {
            Surface(
                color = Navy800,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.padding(horizontal = 24.dp)
            ) {
                Text(
                    "✅ $msg",
                    color = Green500,
                    modifier = Modifier.padding(14.dp),
                    fontSize = 13.sp
                )
            }
        }
    }
}

// ── Helper composables ─────────────────────────────────────────────────────────

@Composable
fun SettingsSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(title.uppercase(), fontSize = 11.sp, color = Slate500, fontWeight = FontWeight.Bold,
            letterSpacing = 1.5.sp)
        Surface(color = Navy900, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp),
                content = content)
        }
    }
}

@Composable
fun SettingsField(
    label: String, value: String, onValueChange: (String) -> Unit,
    icon: ImageVector,
    keyboardType: androidx.compose.ui.text.input.KeyboardType = androidx.compose.ui.text.input.KeyboardType.Text
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = Slate500, fontSize = 12.sp) },
        leadingIcon = { Icon(icon, null, tint = Slate500, modifier = Modifier.size(18.dp)) },
        modifier = Modifier.fillMaxWidth(),
        colors = settingsTextFieldColors(),
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = keyboardType)
    )
}

@Composable
fun SettingsToggleRow(label: String, icon: ImageVector, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Slate400, modifier = Modifier.size(18.dp))
            Text(label, color = Color.White, fontSize = 14.sp)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = Indigo600))
    }
}

@Composable
fun SettingsInfoRow(icon: ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Slate500, modifier = Modifier.size(16.dp))
            Text(label, color = Slate400, fontSize = 13.sp)
        }
        Text(value, color = Slate500, fontSize = 13.sp)
    }
}

@Composable
fun settingsTextFieldColors() = OutlinedTextFieldDefaults.colors(
    unfocusedBorderColor = Slate700,
    focusedBorderColor   = Indigo600,
    cursorColor          = SkyBlue,
    focusedTextColor     = Color.White,
    unfocusedTextColor   = Color.White,
    focusedContainerColor   = Navy800,
    unfocusedContainerColor = Navy800
)
