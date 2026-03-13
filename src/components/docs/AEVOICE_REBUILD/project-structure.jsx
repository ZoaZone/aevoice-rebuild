# AEVOICE Full Project Structure

```
aevoice/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── clients.js
│   │   │   ├── entities.js
│   │   │   └── proxy.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── errorHandler.js
│   │   ├── lib/
│   │   │   └── base44Client.js
│   │   └── index.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── base44Client.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── DashboardLayout.tsx
│   │   │   └── ui/
│   │   ├── pages/
│   │   │   ├── App.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/
│   │   │   └── useSession.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── desktop/
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── lib.rs
│   │   │   └── commands.rs
│   │   ├── capabilities/
│   │   │   └── default.json
│   │   ├── icons/          ← generate with: npx tauri icon logo.png
│   │   ├── Cargo.toml
│   │   ├── build.rs
│   │   ├── tauri.conf.json
│   │   └── entitlements.plist
│   └── package.json        ← symlinks/copies to frontend for Tauri CLI
│
├── shared/
│   └── types.ts            ← Shared TypeScript types (Agent, KnowledgeBase, etc.)
│
├── scripts/
│   ├── dev-all.sh
│   └── build-all.sh
│
├── .env                    ← Root shared env
├── package.json            ← Root workspace package.json
└── README.md
``