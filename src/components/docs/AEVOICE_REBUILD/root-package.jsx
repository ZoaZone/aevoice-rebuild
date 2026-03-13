{
  "name": "aevoice",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "backend",
    "frontend",
    "desktop"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend",
    "dev:all": "npm-run-all --parallel dev:backend dev:frontend",
    "build:frontend": "npm run build --workspace=frontend",
    "build:desktop": "cd desktop && npm run tauri:build",
    "build:all": "npm run build:frontend && npm run build:desktop",
    "tauri": "cd desktop && npm run tauri",
    "install:all": "npm install"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5"
  }
}