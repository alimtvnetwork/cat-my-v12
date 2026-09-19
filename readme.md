<p align="center">
  <a href="https://github.com/alimtvnetwork/cat-my-v12">
    <img src="public/images/cat-my-v12-icon.png" alt="Control Automation HMI brand icon" width="160" height="160" />
  </a>
</p>

<h1 align="center">Control Automation</h1>

<p align="center">
  <strong>Desktop HMI for Factory-Floor Inspection & Camera Quality Control</strong>
</p>

<!-- STAMP:BADGES -->
<p align="center">
  <img src="https://img.shields.io/badge/version-v4.112.0-3B82F6" alt="Version v4.111.0" />
  <img src="https://img.shields.io/badge/license-MIT-10B981" alt="License MIT" />
  <img src="https://img.shields.io/badge/status-active-22C55E" alt="Status Active" />
  <img src="https://img.shields.io/badge/ai--ready-100%25-FF6E3C" alt="AI Ready" />
  <img src="https://img.shields.io/badge/build-passing-10B981" alt="Build Passing" />
  <img src="https://img.shields.io/badge/quality-A%2B-3B82F6" alt="Quality A+" />
</p>
<!-- /STAMP:BADGES -->

<!-- STAMP:PLATFORM_BADGES -->
<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-8B5CF6" alt="Platforms" />
  <img src="https://img.shields.io/badge/frontend-React%20%7C%20Vite%20%7C%20TanStack-EC4899" alt="Frontend" />
  <img src="https://img.shields.io/badge/backend-FastAPI%20%7C%20Python%203.11%2B-3B82F6" alt="Backend" />
  <img src="https://img.shields.io/badge/architecture-SplitDB%20Facade-14B8A6" alt="Architecture" />
</p>
<!-- /STAMP:PLATFORM_BADGES -->

<p align="center">
  <strong>By <a href="https://alimkarim.com/">Md. Alim Ul Karim</a></strong> — Chief Software Engineer, <a href="https://riseup-asia.com/">Riseup Asia LLC</a><br/>
  <a href="https://www.linkedin.com/in/alimkarim">LinkedIn</a> ·
  <a href="https://stackoverflow.com/users/513511/md-alim-ul-karim">Stack Overflow</a> ·
  <a href="https://github.com/alimtvnetwork">GitHub</a> ·
  <a href="docs/author.md">Full bio</a>
</p>

<p align="center">
  <sub>
    <!-- STAMP:VERSION -->v4.112.0<!-- /STAMP:VERSION --> ·
    <!-- STAMP:UPDATED -->2026-09-19<!-- /STAMP:UPDATED --> ·
    <!-- STAMP:FILES -->1064 files<!-- /STAMP:FILES --> ·
    <!-- STAMP:FOLDERS -->142 folders<!-- /STAMP:FOLDERS --> ·
    <!-- STAMP:LINES -->185000 lines<!-- /STAMP:LINES -->
  </sub>
</p>

---

## 📸 Screenshot

![Control Automation HMI](docs/images/hero.png)

---

## 🛠️ Install Scripts

On Windows (PowerShell 7+):

```powershell
.\run.ps1
```

On Linux / macOS (Bash):

```bash
./run.sh
```

---

<h2 align="center">📖 What is this</h2>

<p align="center">
  <strong>Control Automation is an inspection HMI (Human-Machine Interface) for factory-floor operators.</strong>
</p>

Control Automation provides camera-based quality control inspection. Operators define regions of interest, attach validation rules, and evaluate those rules against live or seeded camera frames.

The frontend is a TanStack Start + Vite React application. The backend is a Python FastAPI service powering capture, dispatcher, and worker processes through a vendor-neutral SDK facade.

Two primary runtime modes ship in the box:

- **Seed mode**: The UI runs entirely against local JSON fixtures. No backend required. Ideal for UI testing, design, and offline demos.
- **Backend mode**: The UI connects to a real Python backend API surface (default: `http://localhost:8787`).

---

## 🤖 For AI Agents

Canonical specification and architectural entry points for AI agents:

| Resource                 | Path                                                                                 | Description                                            |
| ------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| **System Spec Overview** | [`02-spec/01-index.md`](02-spec/01-index.md)                                         | Full specification index & master architecture         |
| **Coding Guidelines**    | [`.ai-memory/coding-guidelines.md`](.ai-memory/coding-guidelines.md)                 | Master consolidated coding guidelines                  |
| **AI Quality Guide**     | [`.ai-memory/ai-improvement-guidelines.md`](.ai-memory/ai-improvement-guidelines.md) | Codebase preservation rules & quality constraints      |
| **Agent Playbook**       | [`AGENTS.md`](AGENTS.md)                                                             | Instructions and skill routing for autonomous agents   |
| **Runtime Map**          | [`docs/architecture/runtime-map.md`](docs/architecture/runtime-map.md)               | High-level execution architecture & runtime topologies |

---

## 📦 Bundle Installers

Per-bundle automated installer scripts for standalone deployment:

```powershell
# Full stack setup via PowerShell
.\scripts\ps\Invoke-DbBootstrap.ps1
```

```bash
# Frontend development build
bun install && bun run dev --port 5173
```

---

## 🚀 Full-Repo Install

To set up the repository from scratch for local development:

```bash
# 1. Clone repository
git clone https://github.com/alimtvnetwork/cat-my-v12.git
cd cat-my-v12

# 2. Run backend and frontend environment setup
.\run.ps1 -NoShell
```

---

## 📚 Documentation

Detailed documentation guides and architectural references:

- [`02-spec/01-spec-authoring-guide/13-root-readme-conventions.md`](02-spec/01-spec-authoring-guide/13-root-readme-conventions.md) — Root README structure & badge specifications.
- [`02-spec/02-coding-guidelines/`](02-spec/02-coding-guidelines/) — Code quality standards and linter rules.
- [`02-spec/03-error-manage/`](02-spec/03-error-manage/) — Universal Response Envelope & Error Architecture.
- [`docs/architecture/runtime-map.md`](docs/architecture/runtime-map.md) — System process map and data flows.

---

## 🔄 What's New

See [`CHANGELOG.md`](CHANGELOG.md) for complete version release notes and update details.

- **v4.112.0**: Implement release orchestrator automation and branch lifecycle
- **v4.111.0**: Minor release aligning Prettier forward-only formatting gate compliance, error capturing type safety, and RCA #43/#44 documentation.
- **v4.110.0**: Resolve TS2322 type error in error capturing, document 4-part RCA #43, and align release.
- **v4.108.0**: Greyscale + pattern inspection matching tool and white-box marking LUT translation layer.
- **v4.107.0**: Multi-language static analysis quality gates & linter infrastructure alignment.
- **v4.106.0**: Observability sessions log stream and error envelope toast deduplication.

---

## 🤝 Contributing

Before submitting contributions:

1. Validate root README formatting: `python linter-scripts/check-root-readme.py`.
2. Run cross-language coding guidelines validation: `python linter-scripts/validate-guidelines.py`.
3. Ensure internal spec cross-links resolve: `python linter-scripts/check-spec-cross-links.py`.
4. Verify backend unit tests pass: `pytest BE/ -q`.

---

<h2 align="center">👤 Author & Company</h2>

<p align="center">
  <strong>By <a href="https://alimkarim.com/">Md. Alim Ul Karim</a></strong> — Chief Software Engineer, <a href="https://riseup-asia.com/">Riseup Asia LLC</a><br/>
  <a href="https://www.linkedin.com/in/alimkarim">LinkedIn</a> ·
  <a href="https://stackoverflow.com/users/513511/md-alim-ul-karim">Stack Overflow</a> ·
  <a href="https://github.com/alimtvnetwork">GitHub</a> ·
  <a href="docs/author.md">Full bio</a>
</p>

---

<p align="center">
  <sub><em>Auto-generated specification root README compliant with §9 checklist.</em></sub>
</p>
