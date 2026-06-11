# CI/CD & Deployment

HormuzWatch uses **GitHub Actions** for continuous integration and continuous deployment. The workflows are defined in `.github/workflows/`.

---

## 1. Workflows Overview

| Workflow File | Trigger | Purpose |
|---|---|---|
| `web-ci.yml` | Push to `main` (`client/**`) | Builds the Vite React app to ensure code compiles and types check. |
| `security-scan.yml` | Schedule (Weekly) & Push | Runs CodeQL analysis for vulnerabilities in Go, Python, and JS. |
| `deploy-frontend.yml`| Push to `main` (`client/**`) | Deploys the built React app to Azure Static Web Apps. |
| `deploy-backend.yml` | Push to `main` (`server/**` or `ml-service/**`) | Builds Docker images, pushes to ACR, and updates Azure Container Apps. |

---

## 2. Frontend Deployment (Azure Static Web Apps)

**File:** `.github/workflows/deploy-frontend.yml`

The deployment to Azure SWA is handled entirely by the official `Azure/static-web-apps-deploy` action.

**Steps:**
1. Checkout code.
2. Build the Vite app (`npm run build`).
3. Push the `/dist` output to the SWA environment.
4. The deployment relies on the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret.

**Routing Configuration:**
SWA handles SPA routing natively. Ensure a `staticwebapp.config.json` is present in the `client/` directory to map fallback routes to `index.html`.

---

## 3. Backend & ML Deployment (Azure Container Apps)

**File:** `.github/workflows/deploy-backend.yml`

This pipeline deploys both the Go server and the Python ML service.

**Steps:**
1. **Azure Login**: Authenticates via `azure/login` using `AZURE_CREDENTIALS`.
2. **ACR Login**: Authenticates to the Azure Container Registry.
3. **Build & Push ML Service**: Uses `docker/build-push-action` to build the `ml-service/Dockerfile` and push to ACR tagged with the Git SHA.
4. **Build & Push Go Backend**: Uses `docker/build-push-action` to build `server/Dockerfile` and push to ACR.
5. **Update ACA (ML)**: Runs `az containerapp update` to point the ML container app to the newly pushed SHA image.
6. **Update ACA (Backend)**: Runs `az containerapp update` to point the Go container app to the newly pushed SHA image.

---

## 4. Render Alternative Deployment

If Azure Container Apps is not desired for the ML Service, a `render.yaml` configuration is included at the repository root.

**Steps to Deploy on Render:**
1. Create an account on Render.com.
2. Connect your GitHub repository.
3. Render automatically reads the `render.yaml` file.
4. It will provision a Python Web Service mapped to the `ml-inference` directory.
5. Updates are triggered automatically on push to `main` matching that directory.

---

## 5. Secrets Required in GitHub Actions

To enable the deployment pipelines, the following secrets must be configured in your GitHub repository settings:

- `AZURE_CREDENTIALS`: A JSON object representing an Azure Service Principal with `Contributor` rights to the resource group.
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: The deployment token retrieved from the Azure Portal for the SWA.
- `PROJECT_NAME`: e.g., `hormuzwatch`
- `ENV_NAME`: e.g., `prod`
