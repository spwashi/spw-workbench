import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType

plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "2.4.10"
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "com.spwashi"
version = "0.3.0"

val oldestSupportedWebStorm = "2024.2.1"
val requestedWebStorm = "2026.2.0.1"
val latestSupportedWebStorm = "2026.2.1"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    testImplementation(kotlin("test"))

    intellijPlatform {
        // Compile against the oldest supported host so newer APIs cannot hide
        // a backwards-compatibility break.
        webstorm(oldestSupportedWebStorm)
        bundledPlugin("org.jetbrains.plugins.textmate")
        // Compiler instrumentation, Plugin Verifier, and ZIP Signer tools are
        // supplied by the current IntelliJ Platform Gradle Plugin defaults.
        pluginVerifier()
        zipSigner()
    }
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

kotlin {
    jvmToolchain(21)
}

intellijPlatform {
    pluginConfiguration {
        name.set("Spw Language Support")

        ideaVersion {
            sinceBuild.set("242")
            untilBuild.set("262.*")
        }
    }

    pluginVerification {
        ides {
            create(IntelliJPlatformType.WebStorm, requestedWebStorm)
            create(IntelliJPlatformType.WebStorm, latestSupportedWebStorm)
        }
    }

    buildSearchableOptions.set(false)
}

tasks {
    withType<JavaCompile> {
        sourceCompatibility = "21"
        targetCompatibility = "21"
    }
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21)
        }
    }
    test {
        useJUnitPlatform()
    }
}
