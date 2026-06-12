plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    id("com.google.gms.google-services")
}

android {
    namespace = "io.hormuzwatch.deploy"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.hormuzwatch.deploy"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "2.0.0"

        buildConfigField("String", "GITHUB_REPO",  "\"${project.findProperty("github.repo")  ?: "yahyaoncloud/HormuzWatch"}\"")
        buildConfigField("String", "GITHUB_TOKEN", "\"${project.findProperty("github.token") ?: ""}\"")
        buildConfigField("String", "LOKI_BASE_URL", "\"${project.findProperty("loki.url")    ?: "http://localhost:3100"}\"")
        buildConfigField("String", "AZURE_LOG_WORKSPACE_ID", "\"${project.findProperty("azure.log.workspace") ?: ""}\"")
        buildConfigField("String", "AZURE_CLIENT_ID", "\"${project.findProperty("azure.client.id") ?: ""}\"")
        buildConfigField("String", "AZURE_TENANT_ID", "\"${project.findProperty("azure.tenant.id") ?: ""}\"")
        buildConfigField("String", "ALLOWED_GOOGLE_ACCOUNT", "\"${project.findProperty("google.allowed.account") ?: "ykinwork1@gmail.com"}\"")
    }

    buildFeatures {
        compose    = true
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.2")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Firebase (Google SSO + Auth)
    implementation(platform("com.google.firebase:firebase-bom:33.1.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.android.gms:play-services-auth:21.2.0")

    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Swipe refresh
    implementation("com.google.accompanist:accompanist-swiperefresh:0.34.0")
}
