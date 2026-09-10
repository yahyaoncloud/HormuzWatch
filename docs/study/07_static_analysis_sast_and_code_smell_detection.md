# Module 07: Static Code Analysis, SAST & Code Smell Detection

## 1. What is Static Application Security Testing (SAST)?
**SAST (Static Application Security Testing)** inspects application source code, configuration files, and dependencies *without executing the program*.

In modern DevOps pipelines, static analysis achieves two major goals:
1. **Security Vulnerability Prevention (Shift-Left SAST)**: Catches SQL injections, hardcoded credentials, insecure crypto algorithms, unsafe deserialization, and path traversals.
2. **Code Smell & Anti-Pattern Detection**: Flags cyclomatic complexity spikes, memory leaks, unclosed goroutines/sockets, dead code, and naming conventions.

---

## 2. Multi-Language Toolchain in HormuzWatch

```
┌─────────────────────────────────────────────────────────────────┐
│                    HormuzWatch SAST Matrix                      │
├───────────────┬────────────────────────────┬────────────────────┤
│ Service       │ Toolchain                  │ Primary Rules      │
├───────────────┼────────────────────────────┼────────────────────┤
│ Go Server     │ golangci-lint, go vet,     │ errcheck, gosimple,│
│ (Backend API) │ staticcheck, ineffassign   │ govet, unconvert   │
├───────────────┼────────────────────────────┼────────────────────┤
│ Python ML     │ bandit, flake8, ruff,      │ AST injection,     │
│ (Inference)   │ mypy                       │ unsafe pickle, eval│
├───────────────┼────────────────────────────┼────────────────────┤
│ React Client  │ eslint, typescript (tsc)   │ react-hooks rules, │
│ (Dashboard)   │                            │ no-any, XSS sinks  │
└───────────────┴────────────────────────────┴────────────────────┘
```

---

## 3. Go SAST Deep Dive: `golangci-lint`

### Key Linters Configured:
- **`errcheck`**: Ensures all Go error return values are explicitly checked and handled.
- **`govet`**: Detects standard Go bugs like shadow variables, printf format mismatches, and unreachable code.
- **`staticcheck`**: Applies advanced static analysis patterns (e.g. infinite loops, unneeded sync mutex locking).
- **`ineffassign`**: Finds variable assignments that are overwritten without being read.

### Execution in CI:
```bash
cd server
golangci-lint run --timeout 5m ./...
```

---

## 4. Python SAST Deep Dive: `bandit` & `ruff`

### Why `bandit` for Machine Learning & Python APIs?
Python data science code often uses risky modules like `pickle.load()` (arbitrary code execution), `subprocess.Popen` (shell injection), or `assert` statements in production logic (which get stripped in optimized bytecode `-O`).

`bandit` builds an Abstract Syntax Tree (AST) of the Python codebase and audits each node against a database of security test plugins.

### Execution in CI:
```bash
bandit -r service/ml-service mlops -ll -ii
flake8 service/ml-service mlops --max-line-length=120 --ignore=E501,W503
```

---

## 5. React Frontend SAST Deep Dive: `eslint` & `tsc`

### Front-End Vulnerabilities Targeted:
- **Cross-Site Scripting (XSS)**: Flagging `dangerouslySetInnerHTML` or unsanitized leaflet map popups.
- **Hook Lifecycle Violations**: `react-hooks/exhaustive-deps` ensuring telemetry streaming websockets are not leaked or disconnected prematurely.
- **TypeScript Type Soundness**: `tsc --noEmit` guaranteeing zero runtime `TypeError: undefined is not an object` in tactical map rendering.

### Execution in CI:
```bash
cd client
npm run lint
```

---

## 6. Best Practices for CI Quality Gates
1. **Never suppress linter warnings globally**: Use inline annotations (`//nolint:gosec`, `# nosec`) with clear architectural justification.
2. **Run parallel SAST stages**: Analyzing Go, Python, and TypeScript concurrently saves up to 70% of CI wall-clock time.
3. **Fail build on new violations**: Enforce a strict ratcheting policy (zero new warnings allowed on PRs).
