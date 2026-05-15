# Development Checklist & Quick Reference

## Pre-Development Setup

### Environment Setup

- [ ] Node.js 24+ installed (for web frontend)
- [ ] Go 1.18+ installed (for backend)
- [ ] Android Studio with emulator configured (for mobile testing)
- [ ] Visual Studio Code with recommended extensions

### Project Initialization

- [ ] Update package.json with all dependencies
- [ ] Configure Vite for both web and Capacitor builds
- [ ] Set up Service Worker for web app shell caching
- [ ] Set up TypeScript strict mode
- [ ] Create environment variables (.env, .env.local)
- [ ] Initialize git with .gitignore

## Phase 1: Foundation - Local Storage & Models

### Local Storage (IndexedDB/SQLite)

- [ ] Install WatermelonDB or PouchDB
- [ ] Create IndexedDB schema definition
- [ ] Implement Project document structure (mirrors server JSON)
- [ ] Implement Task document structure (with nesting support)
- [ ] Create sync queue collection for offline changes
- [ ] Implement offline change tracking (operation type, path, content)
- [ ] Add project connection metadata (`connectionMode`, `serverId`)

### UI Components

- [ ] Project list view
- [x] Project list view (sidebar + main content area with kanban/list toggle)
- [x] Project detail view
- [x] Create/Edit project form
- [x] Add project mode selector (Local or Server-backed)
- [x] Add configured server picker for Server-backed projects
- [x] Task list view (with hierarchy visualization)
- [x] Task kanban view (4 columns: To-Do, In Progress, Review, Done)
- [x] Task auto-save (all fields immediately editable, debounced 800ms)
- [x] EditorJS integration for descriptions
- [x] Bootstrap 5 + custom SCSS + Font Awesome 6 (via CDN)
- [x] Hamburger sidebar navigation (collapsible on mobile)
- [x] Responsive design (sidebar overlay on mobile)
- [x] Search as icon button in project toolbar
- [x] URL auto-fill from `window.location.origin` when adding servers

### Core Logic

- [ ] Project CRUD operations (local)
- [ ] Task CRUD operations (local)
- [ ] Nested task handling
- [ ] Date management (created, dueBy)
- [ ] Permanent delete implementation (hard delete)
- [ ] Implement hybrid web loading (startup metadata sync + on-demand project load)
- [ ] Skip remote sync for Local-only projects

## Phase 2: Backend Setup (Go)

### Backend Project Initialization

- [ ] Create `/server` and initialize Go module (go.mod)
- [ ] Set up project structure (api/, storage/, auth/, middleware/)
- [ ] Create main.go with HTTP server
- [ ] Add Dockerfile and .dockerignore for Go server container
- [ ] Add docker-compose.yml service for `/server`
- [ ] Set up logging (log package or minimal logger)
- [ ] Create error handling middleware
- [ ] Set up CORS middleware for web/mobile

### File-Based Storage System

- [ ] Create storage/filesystem.go for file operations
- [ ] Implement directory structure creation (projects/{id}/, attachments/, labels.json)
- [ ] Create file locking mechanism (storage/locking.go)
- [ ] Implement transaction handler (atomic file operations)
- [ ] Create manifest system for sync tracking (.manifest files)
- [ ] Test with sample data generation

### Transaction API

- [ ] `POST /api/transactions` - Process batched operations
  - [ ] Create operation handler
  - [ ] Implement file locking for each operation (250ms lock timeout)
  - [ ] Keep each transaction to a single file operation
  - [ ] Ensure transaction replay is idempotent
  - [ ] Mtime comparison for conflict detection
  - [ ] Atomic write with rollback on failure
- [ ] `GET /api/sync?since={ts}&paths=[...]` - Get changed files
- [ ] `GET /api/files/{path}` - Download file content
- [ ] Test all endpoints with concurrent requests

### Authentication System

- [ ] Implement JWT generation (auth/jwt.go)
- [ ] Apply JWT middleware to all server API routes
- [ ] Keep `/api/auth/login` as one-time bootstrap endpoint to mint JWT
- [ ] Create code generation utility (cmd/gen-codes/)
- [ ] Store auth codes with 5-minute expiration
- [ ] Implement code validation endpoint
- [ ] Create user directory structure (/data/users/)
- [ ] Test client-side QR rendering from returned auth code (no QR persistence)

## Phase 2B: Client-Server Integration

### Sync Engine

- [ ] Implement offline queue manager (track operations locally)
- [ ] Create sync reconciliation logic (mtime-based)
- [ ] Handle mtime conflicts (newer mtime wins)
- [ ] Add network connectivity detection (Capacitor)
- [ ] Implement batching (group 50 operations per transaction)
- [ ] Add 5-second sync debounce
- [ ] Add exponential backoff retry logic (5 retries, starting at 5 seconds)
- [ ] Trigger sync from service worker when web connectivity is restored
- [ ] Route sync by project mode (Local-only: no-op, Server-backed: API sync)

### HTTP Client

- [ ] Create API wrapper service with transaction support
- [ ] Resolve API base URL from selected project server configuration
- [ ] Implement request/response interceptors
- [ ] Add JWT token to Authorization header for all server requests
- [ ] Add error boundary for failed syncs
- [ ] Implement mtime tracking in response handling

### UI Updates

- [ ] Show sync status (synced/pending/error)
- [ ] Display offline indicator
- [ ] Show sync progress (X of Y operations)
- [ ] Add retry button for failed syncs
- [ ] Display conflict indicators (rare with mtime)

## Phase 3: Attachments

### Backend - Disk Storage

- [ ] Implement file upload to /projects/{id}/attachments/
- [ ] Add file validation (size, type, virus scan optional)
- [ ] Create .meta.json files for attachment metadata
- [ ] Implement permanent delete (remove file + .meta.json)
- [ ] Handle attachment indexing (attachments-index.json)

### Client - File Handling

- [ ] Implement file picker (web + mobile)
- [ ] Store file blobs locally (IndexedDB/SQLite)
- [ ] Create file upload queue
- [ ] Show upload progress with chunking
- [ ] Handle upload failures with automatic retry

### UI Components

- [ ] Project attachment hub (list all)
- [ ] Task attachment view (show task-specific)
- [ ] Attachment card with preview
- [ ] Delete/unlink attachment
- [ ] Show attached tasks for each file

### Attachment Relations

- [ ] Implement TaskAttachment junction table
- [ ] Allow multi-task attachment
- [ ] Query attachments by project/task
- [ ] Maintain referential integrity

## Phase 3B: Labels

### Backend - Label File Management

- [ ] Implement global/labels.json storage
- [ ] Implement projects/{id}/labels.json for project-specific labels
- [ ] Implement labels-index.json for label assignments
- [ ] Create label CRUD operations as file transactions
- [ ] Handle label deletion marking in .manifest

### Label Types Implementation

- [ ] Text label type
- [ ] Date label type (with date picker)
- [ ] Dropdown label type (with option management)
- [ ] Color support for all types

### Client - Label UI

- [ ] Label creation form
- [ ] Label assignment interface
- [ ] Label filtering view
- [ ] Multi-label filtering (AND/OR)
- [ ] Label management (global + per-project)

### Label Queries

- [ ] Filter tasks by label value
- [ ] Search by label title
- [ ] Complex multi-label queries
- [ ] Update label assignments locally

## Phase 4: Mobile Integration

### Capacitor Setup

- [ ] Update Capacitor plugins
- [ ] Set up Android build
- [ ] Configure app icon/splash
- [ ] Test web->mobile build process
- [ ] Configure signing for release build

### Mobile-Specific Features

- [ ] Native file picker (Capacitor Filesystem API)
- [ ] Camera access for photo attachments
- [ ] SQLite storage via capacitor-sqlite
- [ ] Network status monitoring (Capacitor Network API)
- [ ] Background sync with device sleep handling
- [ ] Android server configuration management (add/edit/remove/test server)
- [ ] Android local-only project flow (full use without server reachability)

### Testing on Device

- [ ] Build and deploy to emulator/device
- [ ] Test offline functionality
- [ ] Verify sync when online
- [ ] Test file uploads
- [ ] Test nested task navigation

## Phase 5: Advanced & Polish

### Search & Filtering

- [ ] Implement in-project full-text search (current project only)
- [ ] Filter by date range
- [ ] Filter by labels (multi-select)
- [ ] Filter by completion status
- [ ] Save search queries

### Performance Optimization

- [ ] Lazy load tasks
- [ ] Virtualize large lists
- [ ] Optimize EditorJS rendering
- [ ] Compress attachments
- [ ] Implement data pagination

### Testing

- [ ] Unit tests (models, utils)
- [ ] Integration tests (API endpoints)
- [ ] Sync conflict scenarios
- [ ] Offline/online transitions
- [ ] End-to-end tests (critical paths)

### Documentation

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Developer setup guide
- [ ] Architecture decision records (ADRs)
- [ ] Troubleshooting guide

## Deployment

### Before Production

- [ ] Security audit
- [ ] Performance testing
- [ ] Load testing on backend
- [ ] Continuous backup/recovery plan (file-level snapshots + restore drill)
- [ ] Monitoring setup (errors, performance)

### Deployment Steps

- [ ] Set up staging environment
- [ ] Deploy backend to hosting
- [ ] Deploy web app to CDN
- [ ] Build and publish Android app
- [ ] Set up SSL certificates
- [ ] Configure domain/DNS

## Quick Reference: File Structure

```
vara-tasks/
├── src/                     # Frontend (Solid.js)
│   ├── components/          # Reusable UI components
│   ├── pages/               # Page components
│   ├── services/
│   │   ├── api.ts           # Transaction API client
│   │   ├── sync.ts          # Sync engine (mtime-based)
│   │   └── db.ts            # Local IndexedDB/SQLite
│   ├── models/              # Type definitions
│   ├── utils/               # Utility functions
│   └── App.tsx
├── server/                  # Backend (Go, Dockerized)
│   ├── main.go
│   ├── go.mod
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── api/
│   │   ├── transactions.go
│   │   ├── auth.go
│   │   └── sync.go
│   ├── storage/
│   │   ├── filesystem.go
│   │   ├── locking.go
│   │   └── manifest.go
│   ├── auth/
│   │   ├── jwt.go
│   │   └── codes.go
│   └── cmd/
│       └── gen-codes/main.go
├── PROJECT_OVERVIEW.md
└── ARCHITECTURE.md
```

## Key Dependencies to Install

### Web/Mobile (Solid.js)

```json
{
  "@watermelondb/core": "^0.25",
  "@editorjs/editorjs": "^2.26",
  "@editorjs/header": "^2.6",
  "@editorjs/list": "^1.8",
  "@editorjs/quote": "^2.4",
  "@editorjs/code": "^2.8",
  "@editorjs/link": "^2.3",
  "@editorjs/embed": "^2.5",
  "@editorjs/table": "^2.2",
  "axios": "^1.3",
  "uuid": "^9.0"
}
```

### Backend (Go)

```json
{
  "github.com/gorilla/mux": "v1.8.1",
  "github.com/golang-jwt/jwt/v5": "v5.2.1"
}
```

## Common Commands

```bash
# Frontend Development
npm run dev              # Start Solid.js dev server on port 3000
npm run build            # Build web app for production

# Mobile
npm run cap build android  # Build Android APK
npm run cap run android    # Run on Android emulator

# Backend (Go, Docker)
cd server
go run main.go           # Start server on port 8080
go build                 # Compile binary
go run ./cmd/gen-codes   # Generate auth codes

# Backend (Docker)
docker compose up --build

# Testing
cd server
go test ./...            # Run all tests
go test -v ./api         # Verbose test output
```

## Environment Variables Template

```bash
# Frontend .env.local
VITE_DEFAULT_SERVER_URL=http://localhost:8080  # optional fallback/default
VITE_ENV=development

# Backend (.env or hardcoded in Go)
PORT=8080
DATA_DIR=./data
JWT_SECRET=dev-secret-key-change-in-production
LOG_LEVEL=debug
MAX_FILE_SIZE=104857600  # 100MB
```

---

**Version**: 2.0 (Simplified)  
**Last Updated**: 2026-05-14
