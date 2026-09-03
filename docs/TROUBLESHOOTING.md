# HormuzWatch — Troubleshooting Guide

### 1. Docker Build Hangs on Client
* **Symptom:** `npm run build` hangs indefinitely.
* **Diagnosis:** esbuild ping background service in Node 20.
* **Remedy:** Ensure `client/package.json` build script triggers `node scripts/build.mjs` which invokes `execSync('npx react-router build')` and exits with `process.exit(0)`.

### 2. ML Service Permission Denied on Directory Creation
* **Symptom:** `PermissionError: [Errno 13] Permission denied: '/app/analysis_output'`.
* **Diagnosis:** `/app` is owned by root, while container runs as user `hormuz`.
* **Remedy:** Include `chown -R hormuz:hormuz /app` in the Dockerfile during layer preparation.

### 3. Client Nginx Returns 403 Forbidden
* **Symptom:** `directory index of "/usr/share/nginx/html/" is forbidden`.
* **Diagnosis:** `index.html` not present in build directory.
* **Remedy:** Run `npx react-router build` to generate SPA `index.html` into `build/client/index.html`.
