# Graph Report - ABB-App  (2026-08-26)

## Corpus Check
- 76 files · ~30,833 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 454 nodes · 720 edges · 35 communities (29 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `63835cad`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useAuth
- GpsButton.tsx
- Visit.tsx
- types.ts
- dependencies
- devDependencies
- compilerOptions
- UpdateVisits.tsx
- index.html SPA Entry
- Dashboard.tsx
- AdminRoutes.tsx
- Workflow Deploy ke Cloudflare
- backup-foto.mjs
- migrate-photos-to-r2.mjs
- bersihkan-foto-r2.mjs
- setup_fresh.sql
- backup.mjs
- pindah-supabase.mjs
- Panduan Setup ABB Star Reward (dari nol)
- manifest.json
- Backup Database Supabase — ABB Star Reward
- restore.mjs
- atur-folder-jadwal.mjs
- 0001_final_status_yes_active.sql
- vite-env.d.ts
- index.ts
- 0002_unique_store_name.sql
- public.schema_migrations

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 21 edges
2. `supabase` - 20 edges
3. `compilerOptions` - 18 edges
4. `Panduan Setup ABB Star Reward (dari nol)` - 10 edges
5. `registerStatusLabel()` - 9 edges
6. `visitResultLabel()` - 9 edges
7. `StoreField()` - 8 edges
8. `registerStatusFromResult()` - 8 edges
9. `submitVisit()` - 8 edges
10. `AdminAddStorePage()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `applyUpdate()` --calls--> `registerStatusFromResult()`  [EXTRACTED]
  src/pages/admin/UpdateVisits.tsx → src/lib/types.ts
- `MS Audit Bridgestone Surveyor PWA` --references--> `Workflow Deploy ke Cloudflare`  [EXTRACTED]
  README.md → .github/workflows/deploy.yml
- `fotoUrl()` --calls--> `photoUrl()`  [EXTRACTED]
  src/components/VisitAdminPanel.tsx → src/lib/photo.ts
- `saveFields()` --calls--> `registerStatusFromResult()`  [EXTRACTED]
  src/components/VisitAdminPanel.tsx → src/lib/types.ts
- `deleteVisit()` --calls--> `registerStatusFromResult()`  [EXTRACTED]
  src/components/VisitAdminPanel.tsx → src/lib/types.ts

## Import Cycles
- None detected.

## Communities (35 total, 6 thin omitted)

### Community 0 - "useAuth"
Cohesion: 0.14
Nodes (15): App(), AppLayout(), Logo(), LogoutButton(), ProtectedRoute(), AuthCtx, AuthProvider(), AuthState (+7 more)

### Community 1 - "GpsButton.tsx"
Cohesion: 0.22
Nodes (9): GpsButton(), takeLocation(), Props, LeafletMap(), markerIcon, MiniMap(), Props, getCurrentPosition() (+1 more)

### Community 2 - "Visit.tsx"
Cohesion: 0.06
Nodes (41): AlertDialog(), PATH, Tone, MultiPhotoInput(), Props, OfflineSync(), PhotoInput(), Props (+33 more)

### Community 3 - "types.ts"
Cohesion: 0.08
Nodes (36): StatusBadge(), STYLES, StoreEditModal(), fotoUrl(), STYLES, VisitResultBadge(), exportXlsx(), photoUrl() (+28 more)

### Community 4 - "dependencies"
Cohesion: 0.07
Nodes (28): browser-image-compression, leaflet, lucide-react, dependencies, browser-image-compression, exceljs, leaflet, lucide-react (+20 more)

### Community 5 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, devDependencies, autoprefixer, postcss, tailwindcss, @types/leaflet, @types/react, @types/react-dom (+13 more)

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules (+15 more)

### Community 7 - "UpdateVisits.tsx"
Cohesion: 0.10
Nodes (24): Button(), Props, FormField, Props, Cell, cellToString(), readAllSheets(), readXlsx() (+16 more)

### Community 9 - "Dashboard.tsx"
Cohesion: 0.10
Nodes (13): Bar, BarChart(), niceScale(), DonutChart(), DonutSlice, HBar, HBarChart(), DashboardPage() (+5 more)

### Community 10 - "AdminRoutes.tsx"
Cohesion: 0.11
Nodes (8): AdminNav(), LINKS, CoverageMap(), CoveragePoint, MapsPage(), AdminStoresPage(), roleLabel(), UsersPage()

### Community 12 - "backup-foto.mjs"
Cohesion: 0.11
Nodes (12): db, __dirname, failures, foto, JENIS, missing, objects, plan (+4 more)

### Community 13 - "migrate-photos-to-r2.mjs"
Cohesion: 0.14
Nodes (12): BUCKETS, cfg, cfgPath, dest, __dirname, dryRun, failures, missing (+4 more)

### Community 14 - "bersihkan-foto-r2.mjs"
Cohesion: 0.17
Nodes (9): db, __dirname, doDelete, foto, mb, orphans, referenced, s3 (+1 more)

### Community 15 - "setup_fresh.sql"
Cohesion: 0.27
Nodes (9): auth.users, public, public.handle_new_user, on_auth_user_created, public.is_admin(), public.is_superadmin(), public.profiles, public.stores (+1 more)

### Community 16 - "backup.mjs"
Cohesion: 0.18
Nodes (7): cfg, cfgPath, __dirname, dumpDirs, logFile, supabase, TABLES

### Community 17 - "pindah-supabase.mjs"
Cohesion: 0.22
Nodes (10): cfg, cfgPath, dest, __dirname, dryRun, mapUid(), payload, storeRows (+2 more)

### Community 18 - "Panduan Setup ABB Star Reward (dari nol)"
Cohesion: 0.18
Nodes (10): 1. Backup data lama (WAJIB — jaring pengaman), 2. Cloudflare R2, 3. Project Supabase baru, 4. Pindahkan data lama → Supabase baru, 5. Setup R2 + Edge Function upload, 6. Migrasi foto lama → R2, 7. Deploy ke Cloudflare Pages, Panduan Setup ABB Star Reward (dari nol) (+2 more)

### Community 19 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 20 - "Backup Database Supabase — ABB Star Reward"
Cohesion: 0.29
Nodes (6): Backup Database Supabase — ABB Star Reward, Cara manual (via perintah), Cara TERCEPAT (Windows, 1 klik) 🖱️, Mau backup OTOMATIS tiap hari (tanpa klik)?, Restore (memulihkan data), Yang di-backup

### Community 21 - "restore.mjs"
Cohesion: 0.29
Nodes (6): cfg, __dirname, dryRun, onlyArg, payload, supabase

### Community 22 - "atur-folder-jadwal.mjs"
Cohesion: 0.40
Nodes (4): dataCfg, dataCfgPath, __dirname, fotoCfgPath

### Community 26 - "index.ts"
Cohesion: 0.40
Nodes (3): ALLOWED_FOLDERS, ALLOWED_TYPES, cors

## Knowledge Gaps
- **179 isolated node(s):** `__dirname`, `dataCfgPath`, `dataCfg`, `fotoCfgPath`, `__dirname` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase` connect `types.ts` to `useAuth`, `Visit.tsx`, `UpdateVisits.tsx`, `Dashboard.tsx`, `AdminRoutes.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `useAuth` to `AdminRoutes.tsx`, `types.ts`, `UpdateVisits.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `__dirname`, `dataCfgPath`, `dataCfg` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._
- **Should `Visit.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.059395801331285206 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07518796992481203 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._