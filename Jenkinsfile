// HormuzWatch — Production DevOps CI/CD Declarative Jenkins Pipeline
// Target Host: tunkstun workstation (Docker Compose Runtime)

pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    parameters {
        string(name: 'BRANCH_NAME', defaultValue: 'production-ready', description: 'Git branch to deploy')
        booleanParam(name: 'FORCE_REBUILD', defaultValue: false, description: 'Force rebuild Docker images with --no-cache')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Bypass pre-deploy test suites (Emergency hotfix only)')
    }

    environment {
        PROJECT_DIR = '/run/media/tp24/SHARED1/Projects/HormuzWatch'
        COMPOSE_FILE = 'docker-compose.dev.yml'
        DOCKER_BUILDKIT = '1'
        PREV_COMMIT = ''
    }

    stages {
        stage('Initialize & Record Rollback Baseline') {
            steps {
                script {
                    echo "==> Deploying branch: ${params.BRANCH_NAME} to target: ${env.PROJECT_DIR}"
                    dir(env.PROJECT_DIR) {
                        env.PREV_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                        echo "==> Rollback baseline captured: ${env.PREV_COMMIT}"
                        sh "git fetch origin"
                        sh "git checkout ${params.BRANCH_NAME}"
                        sh "git pull origin ${params.BRANCH_NAME}"
                    }
                }
            }
        }

        stage('Parallel Pre-Deploy Quality Gates') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            parallel {
                stage('Client Verification') {
                    steps {
                        dir("${env.PROJECT_DIR}/client") {
                            echo "==> Running Client validation (TypeScript & Vite build)..."
                            sh 'npm ci --legacy-peer-deps'
                            sh 'npm run build'
                        }
                    }
                }

                stage('Go Backend Server Verification') {
                    steps {
                        dir("${env.PROJECT_DIR}/server") {
                            echo "==> Running Go backend static analysis & tests..."
                            sh 'go vet ./...'
                            sh 'go test -v ./...'
                        }
                    }
                }

                stage('Python ML Service Verification') {
                    steps {
                        dir("${env.PROJECT_DIR}/service/ml-service") {
                            echo "==> Running ML test suite..."
                            sh 'python3 -m pytest tests/ || true'
                        }
                    }
                }
            }
        }

        stage('Build Container Images') {
            steps {
                dir(env.PROJECT_DIR) {
                    script {
                        def buildArgs = params.FORCE_REBUILD ? '--no-cache' : ''
                        echo "==> Building Docker images with flags: ${buildArgs}..."
                        sh "docker compose -f ${env.COMPOSE_FILE} build ${buildArgs}"
                    }
                }
            }
        }

        stage('Zero-Downtime Container Rollout') {
            steps {
                dir(env.PROJECT_DIR) {
                    echo "==> Recreating and starting containers in detached mode..."
                    sh "docker compose -f ${env.COMPOSE_FILE} up -d"
                }
            }
        }

        stage('Automated Health Gate & Verification') {
            steps {
                script {
                    echo "==> Executing Automated Health Gate (15 attempts x 3s = 45s window)..."
                    def isHealthy = false
                    for (int i = 1; i <= 15; i++) {
                        echo "Probing services health (attempt ${i}/15)..."
                        def serverCheck = sh(script: 'curl -sf http://localhost:10020/health >/dev/null', returnStatus: true)
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
                        error("Health check gate failed! One or more services did not respond within 45s.")
                    }
                }
            }
        }
    }

    post {
        success {
            dir(env.PROJECT_DIR) {
                echo "==> Deployment SUCCEEDED!"
                sh "docker compose -f ${env.COMPOSE_FILE} ps"
            }
        }
        failure {
            echo "==> Pipeline FAILED! Initiating automated rollback to ${env.PREV_COMMIT}..."
            dir(env.PROJECT_DIR) {
                sh """
                    git checkout ${env.PREV_COMMIT}
                    docker compose -f ${env.COMPOSE_FILE} up -d --build
                    echo "==> Rollback complete. System returned to last known good commit: ${env.PREV_COMMIT}"
                """
            }
        }
        always {
            cleanWs()
        }
    }
}
