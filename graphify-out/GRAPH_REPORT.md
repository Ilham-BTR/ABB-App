# Graph Report - Activate-Asia-Tomo-MS-Audit-Bridgestone  (2026-08-25)

## Corpus Check
- 75 files · ~63,676 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 422 nodes · 831 edges · 26 communities (23 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Core Types & App Shell
- Offline DB & Sync Engine
- Form Rendering
- Scoring & Worker Auth
- Runtime Dependencies
- Dev Dependencies
- App TS Config
- Worker TS Config
- Audit Spec & Scoring Rules
- Build & Node Config
- Photo Upload & Retry
- Architecture & Deploy Concepts
- Database Schema (D1)
- XLSX to Schema Generator
- Outlet SQL Generator
- App Icon 512
- Activate Asia Logo
- Root TS Config
- App Icon 192
- Bridgestone Logo

## God Nodes (most connected - your core abstractions)
1. `base()` - 21 edges
2. `SurveyFormPage()` - 20 edges
3. `compilerOptions` - 18 edges
4. `getDB()` - 17 edges
5. `compilerOptions` - 17 edges
6. `useAuth()` - 14 edges
7. `api` - 13 edges
8. `compilerOptions` - 12 edges
9. `scripts` - 11 edges
10. `syncNow()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Skema Skor Java vs Non-Java` --semantically_similar_to--> `SPEC Aplikasi Surveyor`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/SPEC.md
- `AuthState` --references--> `UserInfo`  [EXTRACTED]
  src/context/auth.tsx → shared/types.ts
- `index.html SPA Entry` --conceptually_related_to--> `Visual Design System`  [INFERRED]
  index.html → docs/DESIGN.md
- `SurveyFormPage()` --calls--> `computeScore()`  [EXTRACTED]
  src/pages/SurveyForm.tsx → shared/scoring.ts
- `Props` --references--> `Answers`  [EXTRACTED]
  src/components/FormRenderer.tsx → shared/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pipeline Offline-First Sinkronisasi** — claude_offline_first, claude_eager_photo_upload, claude_idempotent_submit [INFERRED 0.85]
- **Rantai Sumber Kebenaran Skoring** — claude_xlsx_source_of_truth, claude_form_schema_source_of_truth, claude_scoring_ts_single_impl, claude_java_nonjava_scoring [EXTRACTED 1.00]
- **Siklus Deploy Cloudflare via GitHub Actions** — github_workflows_deploy, github_workflows_run_sql, github_workflows_cleanup, github_workflows_check_subdomain [INFERRED 0.85]

## Communities (26 total, 3 thin omitted)

### Community 0 - "Core Types & App Shell"
Cohesion: 0.06
Nodes (47): FieldOption, FieldType, FormSchema, Outlet, Role, SurveyPhotoRow, SurveyRow, App() (+39 more)

### Community 1 - "Offline DB & Sync Engine"
Cohesion: 0.10
Nodes (46): Answers, PhotoMeta, SyncBadge(), VIDEO_MAX_BYTES, AppDB, cacheSchema(), deleteDraft(), deleteDraftWithPhotos() (+38 more)

### Community 2 - "Form Rendering"
Cohesion: 0.09
Nodes (42): FormField, FormSection, fmtTanggal, NAV, FieldControl(), fieldVisible(), fmtId(), fmtPoin() (+34 more)

### Community 3 - "Scoring & Worker Auth"
Cohesion: 0.11
Nodes (31): computeScore(), FormDef, SurveySubmit, UserInfo, b64decode(), b64encode(), generateToken(), getSessionUser() (+23 more)

### Community 4 - "Runtime Dependencies"
Cohesion: 0.05
Nodes (39): browser-image-compression, fflate, @fontsource/ibm-plex-sans, @fontsource/sora, hono, idb, leaflet, dependencies (+31 more)

### Community 5 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): @cloudflare/workers-types, devDependencies, @cloudflare/workers-types, playwright, tailwindcss, @tailwindcss/vite, @types/leaflet, @types/react (+17 more)

### Community 6 - "App TS Config"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, src, compilerOptions, composite, isolatedModules, jsx, lib (+16 more)

### Community 7 - "Worker TS Config"
Cohesion: 0.09
Nodes (22): @cloudflare/workers-types, worker, compilerOptions, composite, isolatedModules, lib, module, moduleDetection (+14 more)

### Community 8 - "Audit Spec & Scoring Rules"
Cohesion: 0.10
Nodes (21): shared/form-schema.json (sumber kebenaran), Skema Skor Java vs Non-Java, Penalti -10 (MS No.4 & No.26), CLAUDE.md Project Guide, shared/scoring.ts computeScore, Bridgestone_MS_Audit.xlsx (file asli klien), Visual Design System, Check-in GPS + Peringatan Jarak >50m (+13 more)

### Community 9 - "Build & Node Config"
Cohesion: 0.12
Nodes (15): ES2023, vite.config.ts, compilerOptions, composite, isolatedModules, lib, module, moduleDetection (+7 more)

### Community 10 - "Photo Upload & Retry"
Cohesion: 0.44
Nodes (10): bacaError(), denganRetry(), fatal(), JEDA_RETRY, jsonFetch(), sekaliUpload(), tidur(), uploadBlobSmart() (+2 more)

### Community 11 - "Architecture & Deploy Concepts"
Cohesion: 0.22
Nodes (10): Auth PBKDF2 + Session Cookie, Eager Photo Upload (metode 2W Federal), Submit Idempotent (UUID client), Offline-First (IndexedDB + Sync Engine), Single Worker (Hono) API + Static Assets, Export .xlsx (Worker, fflate, 2 sheet), Workflow Cek Subdomain workers.dev, Workflow Bersihkan Resource Lama (+2 more)

### Community 12 - "Database Schema (D1)"
Cohesion: 0.60
Nodes (5): outlets, photos, sessions, surveys, users

### Community 13 - "XLSX to Schema Generator"
Cohesion: 0.40
Nodes (5): clean(), parse_questions(), Kolom: No, Kategori, [Type], Kategori, Sub Kategori, Pertanyaan, lalu triplet…, Satu seksi berisi SEMUA pertanyaan, urut kolom 'No' (permintaan user: jangan…, sections_from()

### Community 14 - "Outlet SQL Generator"
Cohesion: 0.67
Nodes (3): main(), String SQL apa adanya (escape kutip tunggal), atau NULL., sq()

### Community 15 - "App Icon 512"
Cohesion: 0.67
Nodes (3): Activate Asia Tomo App Icon (Letter A Monogram), Circular blue and orange swoosh ring, Letter A Monogram (blue gradient)

### Community 16 - "Activate Asia Logo"
Cohesion: 1.00
Nodes (3): Activate Asia Brand, Activate Asia Logo (logo-aa.png), Letter A Monogram

## Knowledge Gaps
- **141 isolated node(s):** `name`, `version`, `private`, `type`, `description` (+136 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev Dependencies` to `Runtime Dependencies`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _141 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Types & App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.0579476861167002 - nodes in this community are weakly interconnected._
- **Should `Offline DB & Sync Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.10377358490566038 - nodes in this community are weakly interconnected._
- **Should `Form Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.09224489795918367 - nodes in this community are weakly interconnected._
- **Should `Scoring & Worker Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.11265969802555169 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._