package io.hormuzwatch.deploy.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ── Design tokens (mirrors client/src/index.css) ──────────────────────────────
val DeepNavy     = Color(0xFF050816)
val Navy900      = Color(0xFF0F172A)
val Navy800      = Color(0xFF1E293B)
val Slate700     = Color(0xFF334155)
val Slate500     = Color(0xFF64748B)
val Slate400     = Color(0xFF94A3B8)
val Slate200     = Color(0xFFE2E8F0)
val Indigo600    = Color(0xFF4F46E5)
val Indigo400    = Color(0xFF818CF8)
val SkyBlue      = Color(0xFF38BDF8)
val SkyDim       = Color(0xFF0EA5E9)
val Green500     = Color(0xFF22C55E)
val Red500       = Color(0xFFEF4444)
val Amber500     = Color(0xFFF59E0B)
val Purple500    = Color(0xFFA855F7)

val HormuzColorScheme = darkColorScheme(
    background         = DeepNavy,
    surface            = Navy900,
    surfaceVariant     = Navy800,
    primary            = Indigo600,
    primaryContainer   = Color(0xFF312E81),
    onPrimary          = Color.White,
    onBackground       = Color.White,
    onSurface          = Color.White,
    onSurfaceVariant   = Slate400,
    secondary          = SkyBlue,
    tertiary           = Green500,
    error              = Red500,
    outline            = Slate700
)

@Composable
fun HormuzTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = HormuzColorScheme,
        content = content
    )
}
