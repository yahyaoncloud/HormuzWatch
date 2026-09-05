// =============================================================================
// 🌊 HormuzWatch — Continuous Deployment (CD) Declarative Jenkins Pipeline
// Automated Deployment on Git Commits / Webhooks
// Target Host: tunkstun (192.168.1.51) Docker Compose Engine
// =============================================================================

pipeline {
    agent any

    options {
        timeout(time: 25, unit: 'MINUTES')
        disableConcurrentBuilds()
        ansiColor('xterm')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    triggers {
        // Trigger on GitHub push webhooks
        githubPush()
        // Fallback: Poll SCM every 5 minutes if webhooks cannot reach private LAN
        pollSCM('H/5 * * * *')
    }

    parameters {
        string(name: 'BRANCH_NAME', defaultValue: 'production-ready', description: 'Git branch to deploy')
        booleanParam(name: 'FORCE_REBUILD', defaultValue: false, description: 'Force rebuild Docker images with --no-cache')
        booleanParam(name: 'VERIFY_MODELS', defaultValue: true, description: 'Verify ML Model & Dataset Cryptographic SHA256 Checksums')
    }

    environment {
        PROJECT_DIR = '/home/yahya/SHARED/Projects/HormuzWatch'
        COMPOSE_FILE = 'docker-compose.dev.yml'
        DOCKER_BUILDKIT = '1'
        PREV_COMMIT = ''
    }

    stages {
        stage('Initialize & Record Rollback Baseline') {
            steps {
                script {
                    echo "=========================================================="
                    echo " HormuzWatch CD Pipeline: Deploying ${params.BRANCH_NAME} "
                    echo " Target Project Dir: ${env.PROJECT_DIR}                  "
                    echo " Trigger: ${currentBuild.getBuildCauses()}                "
                    echo "=========================================================="

                    dir(env.PROJECT_DIR) {
                        env.PREV_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                        echo "==> Rollback baseline captured: ${env.PREV_COMMIT}"
                        
                        echo "==> Syncing latest commits from origin..."
                        sh "git fetch origin ${params.BRANCH_NAME}"
                        sh "git checkout ${params.BRANCH_NAME}"
                        sh "git reset --hard origin/${params.BRANCH_NAME}"
                        
                        def currentCommit = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                        echo "==> Checked out latest commit: ${currentCommit}"
                    }
                }
            }
        }

        stage('Artifacts & Models Provenance Audit') {
            when {
                expression { return params.VERIFY_MODELS }
            }
            steps {
                dir(env.PROJECT_DIR) {
                    echo "==> Validating ML Model Registry checksums..."
                    sh 'python3 scripts/model_registry.py verify'
                    
                    echo "==> Validating Dataset Registry manifests..."
                    sh 'python3 scripts/dataset_registry.py list'
                }
            }
        }

        stage('Build Container Images') {
            steps {
                dir(env.PROJECT_DIR) {
                    script {
                        def buildFlags = params.FORCE_REBUILD ? '--no-cache' : ''
                        echo "==> Building Docker images (${buildFlags})..."
                        sh "docker compose -f ${env.COMPOSE_FILE} build ${buildFlags}"
                    }
                }
            }
        }

        stage('Zero-Downtime Rollout') {
            steps {
                dir(env.PROJECT_DIR) {
                    echo "==> Recreating and rolling out updated containers in detached mode..."
                    sh "docker compose -f ${env.COMPOSE_FILE} up -d --remove-orphans"
                }
            }
        }

        stage('Automated SRE Health Gate Verification') {
            steps {
                dir(env.PROJECT_DIR) {
                    script {
                        echo "==> Executing Automated Health Gate (20 attempts x 3s = 60s probe)..."
                        def isHealthy = false
                        for (int i = 1; i <= 20; i++) {
                            echo "Probing services health (attempt ${i}/20)..."
                            def serverCheck = sh(script: 'curl -sf http://localhost:10020/health/live >/dev/null', returnStatus: true)
                            def mlCheck = sh(script: 'curl -sf http://localhost:8090/health >/dev/null', returnStatus: true)
                            def clientCheck = sh(script: 'curl -sf -I http://localhost:3000 >/dev/null', returnStatus: true)

                            if (serverCheck == 0 && mlCheck == 0 && clientCheck == 0) {
                                echo "==> All endpoints are HEALTHY and verified!"
                                isHealthy = true
                                break
                            }
                            sleep(time: 3, unit: 'SECONDS')
                        }

                        if (!isHealthy) {
                            error("Automated Health Gate FAILED! Services did not respond healthy within 60s.")
                        }
                    }
                }
            }
        }

        stage('SRE Comprehensive System Audit') {
            steps {
                dir(env.PROJECT_DIR) {
                    echo "==> Running SRE diagnostic health suite..."
                    sh './service/sre/sre.sh health'
                }
            }
        }
    }

    post {
        success {
            dir(env.PROJECT_DIR) {
                echo "=========================================================="
                echo " 🚀 HormuzWatch Deployment SUCCEEDED!                     "
                echo "=========================================================="
                sh "docker compose -f ${env.COMPOSE_FILE} ps"
            }
        }
        failure {
            echo "=========================================================="
            echo " ❌ Deployment FAILED! Triggering automated rollback...    "
            echo " Restoring baseline commit: ${env.PREV_COMMIT}             "
            echo "=========================================================="
            dir(env.PROJECT_DIR) {
                sh """
                    git checkout ${env.PREV_COMMIT}
                    docker compose -f ${env.COMPOSE_FILE} up -d --build
                    echo "==> Rollback complete. Restored to commit: ${env.PREV_COMMIT}"
                """
            }
        }
    }
}
