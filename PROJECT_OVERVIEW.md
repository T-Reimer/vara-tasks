# Vara Tasks - Simplified Project Overview

## Executive Summary

Vara Tasks is a cross-platform (Web + Android) project and task management application with offline-first capabilities. The application enables users to organize work hierarchically through projects containing tasks, with rich formatting, attachments, and flexible labeling systems.

**Key Simplifications**:
- File-based storage (no database)
- All users are trusted admins (no permissions/quotas)
- Client-generated UUIDs for easy syncing
- Go backend with disk-based file storage
- Go server runs in a Docker container (`/server`)
- JWT authentication with QR code sharing
- Modified-time based conflict resolution
- Android supports fully local projects (no server required)

---

## Core Principles

- **Offline-First**: Full functionality without internet; automatic sync when online
- **File-Based Storage**: No database; all data persisted as JSON files on disk
- **Modified-Time Sync**: Use file mtime for sync conflicts instead of version numbers
- **Trusted Users**: All users considered admins; no permission enforcement
- **Hierarchical Organization**: Projects → Tasks → Nested Tasks
- **Unlimited Nesting**: No enforced depth limit for nested tasks
- **Project Modes**: Each project can be Local-only or Server-backed
- **Attachment Centralization**: Project-level attachment hub shared across tasks
- **Rich Formatting**: EditorJS-based formatted text for descriptions
- **Flexible Labeling**: Global and project-specific custom label types

---

## 1. Data Storage Structure

All data is stored as JSON files on disk in a hierarchical structure. Clients generate UUIDs locally to ensure consistency across offline changes.
For Android Local-only projects, this structure exists only on device storage and does not require a backend data directory.

### 1.1 Directory Structure

```
backend/
└── data/
    ├── projects/
    │   ├── {projectId}/
    │   │   ├── project.json          # Project metadata
    │   │   ├── tasks/                # All tasks for this project
    │   │   │   ├── {taskId}.json     # Task data (top-level)
    │   │   │   └── {taskId}/
    │   │   │       └── tasks/        # Nested tasks
    │   │   │           └── {taskId}.json
    │   │   ├── attachments/          # All files for this project
    │   │   │   ├── {attachmentId}    # Actual file
    │   │   │   └── {attachmentId}.meta.json
    │   │   ├── labels.json           # Project-specific labels
    │   │   ├── attachments-index.json # Maps attachments to tasks
    │   │   └── labels-index.json      # Maps label assignments
    │   └── .manifest                  # Sync metadata (mtime, hash)
    │
    ├── global/
    │   └── labels.json                # Global labels
    │
    └── users/
        └── {userName}.json            # User info + signed-in devices (JWT validation)

client-data/
└── (local IndexedDB/SQLite mirrors of above)
```

### 1.2 Project Metadata (project.json)

```json
{
  "id": "proj-550e8400-e29b-41d4-a716-446655440000",
  "connectionMode": "server",
  "serverId": "srv-home-lan",
  "title": "Q2 Planning",
  "description": {
    "blocks": [
      {
        "type": "paragraph",
        "data": { "text": "Plan Q2 deliverables" }
      }
    ]
  },
  "createdAt": "2026-05-14T10:00:00Z",
  "dueBy": "2026-06-30T23:59:59Z",
  "updatedAt": "2026-05-14T10:00:00Z"
}
```

For Local-only projects, use:

```json
{
  "connectionMode": "local",
  "serverId": null
}
```

### 1.3 Task (tasks/{taskId}.json)

```json
{
  "id": "task-550e8400-e29b-41d4-a716-446655440001",
  "projectId": "proj-550e8400-e29b-41d4-a716-446655440000",
  "parentTaskId": null,
  "title": "Design homepage",
  "description": { "blocks": [...] },
  "createdAt": "2026-05-14T10:00:00Z",
  "dueBy": "2026-05-20T23:59:59Z",
  "updatedAt": "2026-05-14T10:00:00Z",
  "completed": false
}
```

### 1.4 Attachment Metadata (attachments/{id}.meta.json)

```json
{
  "id": "attach-550e8400-e29b-41d4-a716-446655440002",
  "projectId": "proj-550e8400-e29b-41d4-a716-446655440000",
  "filename": "screenshot.png",
  "mimeType": "image/png",
  "fileSize": 245832,
  "uploadedAt": "2026-05-14T10:00:00Z"
}
```

### 1.5 Attachment-Task Index (attachments-index.json)

```json
{
  "attach-550e8400-e29b-41d4-a716-446655440002": [
    "task-550e8400-e29b-41d4-a716-446655440001",
    "task-550e8400-e29b-41d4-a716-446655440003"
  ]
}
```

### 1.6 Global Labels (global/labels.json)

```json
{
  "label-uuid-1": {
    "id": "label-uuid-1",
    "title": "Priority",
    "type": "dropdown",
    "color": "#FF5733",
    "options": ["Low", "Medium", "High"]
  },
  "label-uuid-2": {
    "id": "label-uuid-2",
    "title": "Status",
    "type": "dropdown",
    "color": "#3366FF",
    "options": ["Not Started", "In Progress", "Done"]
  }
}
```

### 1.7 Project Labels (projects/{projectId}/labels.json)

```json
{
  "label-uuid-3": {
    "id": "label-uuid-3",
    "title": "ReviewedBy",
    "type": "text",
    "color": "#00AA00"
  }
}
```

### 1.8 Label Assignments (labels-index.json)

```json
{
  "projects": {
    "proj-550e8400-e29b-41d4-a716-446655440000": {
      "label-uuid-1": "High"
    }
  },
  "tasks": {
    "task-550e8400-e29b-41d4-a716-446655440001": {
      "label-uuid-1": "High",
      "label-uuid-3": "John Doe"
    },
    "task-550e8400-e29b-41d4-a716-446655440003": {
      "label-uuid-2": "In Progress"
    }
  }
}
```

### 1.9 Sync Manifest (.manifest)

```json
{
  "projects": {
    "proj-550e8400-e29b-41d4-a716-446655440000": {
      "mtime": 1715680800000,
      "hash": "abc123def456",
      "files": [
        "project.json",
        "tasks/{taskId}.json",
        "attachments/{id}.meta.json"
      ]
    }
  }
}
```

---

## 2. Feature Requirements Matrix

| Feature                                 | Category       | Priority | Web | Android | Notes                            |
| --------------------------------------- | -------------- | -------- | --- | ------- | -------------------------------- |
| Create/Read/Update/Delete Project       | Core           | P0       | ✓   | ✓       | Permanent delete (hard delete)   |
| Create/Read/Update/Delete Task          | Core           | P0       | ✓   | ✓       | Includes nested tasks; hard delete |
| Rich Text Formatting (EditorJS)         | Content        | P0       | ✓   | ✓       | Markdown fallback                |
| Project Attachments Hub                 | Files          | P1       | ✓   | ✓       | Centralized display              |
| Task Attachment Association             | Files          | P1       | ✓   | ✓       | Multi-task attach                |
| Global Labels                           | Organization   | P1       | ✓   | ✓       | Reusable across projects         |
| Project-Specific Labels                 | Organization   | P1       | ✓   | ✓       | Custom per-project               |
| Label Type Support (text/date/dropdown) | Organization   | P1       | ✓   | ✓       | Flexible metadata                |
| Offline-First Sync                      | Infrastructure | P0       | ✓   | ✓       | Core requirement                 |
| Project Connection Mode Selection       | Infrastructure | P0       | ✓   | ✓       | Choose Local-only or configured server |
| Modified-Time Conflict Resolution       | Infrastructure | P1       | ✓   | ✓       | Use file mtime                   |
| Local-First Storage                     | Infrastructure | P0       | ✓   | ✓       | IndexedDB (web), SQLite (mobile) |
| Search & Filter                         | UX             | P2       | ✓   | ✓       | In-project search only           |
| Project Templates                       | Productivity   | P2       | ✓   | ✓       | Future phase                     |
| Task Dependencies                       | Productivity   | P3       | ✓   | ✓       | Future phase                     |
| Team Collaboration                      | Social         | P3       | ✓   | ✓       | Future phase                     |

---

## 3. Architecture Overview

### 3.1 Technology Stack

#### Web

- **Framework**: Solid.js (already configured)
- **Build**: Vite (already configured)
- **Local DB**: IndexedDB + WatermelonDB or PouchDB
- **Offline Runtime**: Service Worker (asset caching + background sync trigger)
- **UI**: Bootstrap 5 (already installed) + custom components
- **Formatting**: EditorJS with plugins
- **HTTP Client**: Fetch API + AbortController

#### Mobile (Android)

- **Framework**: Capacitor (already configured)
- **Local DB**: SQLite (capacitor-sqlite or react-native-sqlite)
- **UI**: Solid.js + Bootstrap (shared codebase)
- **Formatting**: EditorJS or WebView for rendering
- **File Storage**: Capacitor Filesystem API

#### Backend

- **Runtime**: Go (lightweight, minimal dependencies)
- **Location**: `/server`
- **Deployment**: Docker container
- **Storage**: Disk-based JSON files
- **Authentication**: JWT with QR code/code sharing
- **Sync**: File modification time (mtime) based
- **Transactions**: File locking for consistency

### 3.2 System Architecture

```
┌─────────────────┐
│   Web Browser   │  ┌──────────────────┐
│  (Solid.js)     │  │ Mobile (Android) │
└────────┬────────┘  │  (Capacitor)     │
         │           └────────┬─────────┘
         │                    │
    ┌────▼────────────────────▼──────────┐
    │   Local Storage Layer              │
    │  - IndexedDB (web) / SQLite (mobile)
    │  - Mirrors project/task structure  │
    └────┬─────────────────────────────┬─┘
         │                             │
    ┌────▼────────────────────┐   ┌───▼────────────┐
    │  Offline Changes Queue  │   │ Background Sync│
    │  (pending writes)       │   │ (on connect)   │
    └────┬────────────────────┘   └───┬────────────┘
         │                            │
         └────────────┬───────────────┘
                      │
              ┌───────▼────────┐
              │  HTTP Client   │
              │  (Fetch API)   │
              └───────┬────────┘
                      │
         ┌────────────▼─────────────────┐
         │   Go Backend Container        │
         │   (/server, Port 8080)        │
         │  - Transaction API           │
         │  - File storage ops          │
         │  - JWT validation            │
         │  - Conflict resolution (mtime)│
         └────────────┬─────────────────┘
                      │
         ┌────────────▼──────────────────┐
         │  Disk-Based File Storage     │
         │  /data/projects/{id}/...     │
         │  /data/global/...            │
         └──────────────────────────────┘
```

### 3.3 Sync Strategy

**Modified-Time (mtime) Based Conflict Resolution (including attachments):**

```
When syncing changes:
1. Client reads file mtime locally
2. Client reads file mtime from server
3. Server stores file with new mtime
4. On conflict:
   - If local mtime > server mtime: Local wins
   - If server mtime > local mtime: Server wins
   - If equal: Keep server version (deterministic)
5. Client updates local mtime to match server
```

**Sync Flow:**

```
Local Change (offline)
    ↓
Write to IndexedDB/SQLite
    ↓
Record in sync queue (filename, operation type)
    ↓
Debounce sync trigger for 5 seconds
  ↓
If project is Local-only: stop here (no remote sync)
  ↓
If project is Server-backed: device comes online
    ↓
Batch sync queue (group by 50)
    ↓
POST /api/transactions
    ├─ operation: "update|create|delete"
    ├─ path: "projects/{id}/tasks/{id}.json"
    ├─ content: JSON data
    ├─ mtime: local file timestamp
    └─ clientId: client identifier
    ↓
Server processes with file locking
    ├─ Read server mtime
    ├─ Compare mtimes
    ├─ Apply transaction if valid
    └─ Return new mtime
    ↓
Client receives response
    ├─ Update local mtime
    ├─ Remove from sync queue
    └─ Update UI
```

### 3.4 Web Sync & Loading Strategy (Hybrid)

For web clients, use sync plus lazy project loading:

- Sync global/index metadata at app startup (project list, per-project mtime, labels)
- Do not load all project files on startup
- When a project opens, load that project's files on demand
- Trigger background sync for the opened project after load
- Optionally prefetch 1-2 recently used projects during idle time

Service worker responsibilities on web:

- Cache static assets for reliable offline boot
- Keep app shell available offline
- Trigger sync checks when connectivity returns
- Avoid caching mutable project JSON as source-of-truth (IndexedDB remains primary local state)

### 3.5 Project Connection Modes

At project creation, user selects one mode:

- Local-only project: stored and used fully on device; no server calls required
- Server-backed project: linked to one configured server endpoint and participates in sync

Server configuration model:

- App maintains a list of configured servers (`name`, `baseUrl`, optional `auth` metadata)
- New projects can target any configured server or Local-only mode
- Project metadata stores `connectionMode` and, when server-backed, `serverId`
- Sync engine and API client resolve behavior from project connection mode

---

## 4. Backend Transaction API

The backend exposes a simple transaction-based API. No complex REST semantics required.

Note: These endpoints are used only for Server-backed projects. Local-only projects do not call backend APIs.
All server API calls require JWT authentication via `Authorization: Bearer <token>`.
Bootstrap exception: `/api/auth/login` exchanges a short-lived code for the first JWT.

### 4.1 Core Endpoints

```
POST /api/transactions
  Headers: Authorization: Bearer <token>
  Request: {
    operations: [
      {
        type: "create" | "update" | "delete"
        path: "projects/{id}/project.json"
        content: {...}          // only for create/update
        mtime: 1715680800000
        clientId: "client-uuid"
      }
    ]
  }
  Response: {
    results: [
      {
        path: "projects/{id}/project.json"
        success: true
        mtime: 1715680800001
        conflict: false
      }
    ]
  }

GET /api/sync?since={timestamp}&paths=[...]
  Headers: Authorization: Bearer <token>
  Get files modified since timestamp
  Response: {
    files: [
      {
        path: "projects/{id}/project.json"
        mtime: 1715680800001
        size: 2048
        hash: "abc123"
      }
    ]
  }

GET /api/files/{path}
  Headers: Authorization: Bearer <token>
  Download file content
  Response: file binary data

POST /api/auth/login
  Headers: none (bootstrap using one-time code)
  Request: { code: "ABC123" }
  Response: { token: "jwt-token", expiresIn: 3600 }

GET /api/auth/qrcode
  Headers: Authorization: Bearer <token>
  Generate QR code for new device login
  Response: { code: "ABC123", expiresAt: "2026-05-14T10:05:00Z" }
  Note: Client renders QR from returned code; server does not persist QR images
```

### 4.2 File Locking Strategy

```go
// Pseudo-code for server transaction handling
func processTransaction(tx Transaction) {
  for each operation in tx.operations {
    lock := acquireLockWithTimeout(operation.path, 250*time.Millisecond)
    if !lock.acquired {
      result.success = false
      result.error = "lock_timeout"
      continue
    }
    
    serverMtime := getFileMtime(operation.path)
    
    if operation.mtime < serverMtime {
      // Server is newer, client loses
      result.conflict = true
      result.mtime = serverMtime
      continue
    }
    
    // Apply operation
    writeFile(operation.path, operation.content)
    result.mtime = getCurrentTime()
    result.success = true
    releaseLock(operation.path)

    // Transactions are single-file operations and idempotent.
    // Replaying the same operation does not corrupt state.
  }
}
```

---

## 5. Authentication Flow

### 5.1 First-Time Setup

```
1. Server admin generates auth codes:
  $ cd /server
  $ go run ./cmd/gen-codes --count 5
   
   Output:
   CODE: ABC123DEF456
   EXPIRES: 2026-05-14T10:05:00Z
   
   CODE: XYZ789QWE123
   EXPIRES: 2026-05-14T10:05:00Z

  All auth codes expire in exactly 5 minutes.

2. Share code with user (email, SMS, QR)

3. User enters code in web/mobile app:
   POST /api/auth/login { code: "ABC123DEF456" }
   
   Response: {
     token: "eyJhbGciOiJIUzI1NiIs...",
     expiresIn: 86400,
     userId: "trevor"
   }

4. Token stored in IndexedDB/SQLite

5. All subsequent requests include token in header:
   Authorization: Bearer <token>
```

### 5.2 Adding New Devices

```
Existing Device:
1. User requests "Add Device"
2. POST /api/auth/qrcode
   Response: {
     code: "NEW456ABC",
     expiresAt: "2026-05-14T10:05:00Z"
   }
3. Existing client renders QR code from `code` and also shows a copy-code button
4. Show 6-digit code for manual entry

New Device:
1. Scan QR code or enter 6-digit code
2. POST /api/auth/login { code: "NEW456ABC" }
3. Receive JWT token
4. Full sync begins
```

### 5.3 JWT Token Storage

```
File: /data/users/{userName}.json
{
  "username": "trevor",
  "createdAt": "2026-05-14T10:00:00Z",
  "devices": [
    {
      "clientId": "client-abc123",
      "name": "Desktop",
      "tokenCreatedAt": "2026-05-14T10:00:00Z",
      "lastSeen": "2026-05-14T15:30:00Z"
    },
    {
      "clientId": "client-def456",
      "name": "Mobile",
      "tokenCreatedAt": "2026-05-14T14:20:00Z",
      "lastSeen": "2026-05-14T16:45:00Z"
    }
  ]
}

Secret: /data/jwt-secret.key (stored server-only)

**Device Management:**
- Remove a device entry to immediately invalidate that device's JWT
- Delete entire user file to revoke all JWTs for all devices
- tokenCreatedAt tracks when the JWT was created for audit purposes
```

---

## 6. Offline Capability

Everything works offline. When online:

- ✓ View/create/edit all projects and tasks
- ✓ Add attachments (stored locally)
- ✓ Assign labels
- ✓ In-project full-text search (in-memory)
- ✓ All edits queued for later sync

When coming online:

- Sync queue processes automatically
- Conflicts resolved by mtime comparison
- Remote changes fetched and merged
- UI updates with latest data

---

## 7. Label System

### 7.1 Label Types

#### Text Label

```
{
  title: "Priority",
  value: "text",
  color: "#FF5733"
}

// Assigned as
{
  value: "High Priority Task"
}
```

#### Date Label

```
{
  title: "Review Date",
  value: "date",
  color: "#3366FF"
}

// Assigned as
{
  value: "2026-06-15"
}
```

#### Dropdown Label

```
{
  title: "Status",
  value: "dropdown",
  color: "#33FF99",
  options: ["Not Started", "In Progress", "Completed", "On Hold"]
}

// Assigned as
{
  value: "In Progress"
}
```

### 7.2 Label Hierarchy

- **Global Labels**: Accessible across all projects (default set)
- **Project Labels**: Available only within specific project
- **Sharing**: Copy project labels to another project (future)

### 7.3 Label Querying

- **Filter by label**: List all tasks/projects with specific label value
- **Multi-label filter**: AND/OR logic for complex queries
- **Full-text search**: Search label titles and values

---

## 8. Formatted Text (EditorJS) Integration

### 8.1 EditorJS Setup

```typescript
// Core blocks to support:
- Paragraph
- Heading (H1-H3)
- UnorderedList
- OrderedList
- Quote
- Code
- Embed (image, video, etc.)
- Table
- LinkTool
- Checklist (future)
```

### 8.2 Storage & Rendering

- **Storage**: Save as EditorJS JSON files on disk
- **Rendering**: Use EditorJS Viewer component
- **Markdown Fallback**: Convert EditorJS → Markdown if needed
- **Data Validation**: Validate on client before saving

### 8.3 Rich Text Features

- **Mentions**: @user tags (future - when teams added)
- **Attachments**: Inline file references
- **Collaborative Editing**: Baseline support with versioning

---

## 9. Performance Considerations

### 9.1 Local Storage Optimization

- IndexedDB: Uncompressed (~50MB limit)
- SQLite: Can compress blobs (~100MB limit)
- Lazy load tasks (100 at time, infinite scroll)
- Cache last 50 accessed projects in memory
- Debounce sync operations (max 1 every 5 seconds)

### 9.2 Backend Performance

- Go runtime: Minimal memory footprint
- File operations: Use OS-level caching
- Transaction queue: In-memory queue with disk persistence
- No database = no query overhead
- Direct file I/O with mmap for large files

### 9.3 Network Optimization

- Batch operations (group 50 changes)
- Compress JSON payloads (gzip)
- Delta sync (only changed files)
- Resume on interrupted uploads
- Exponential backoff on server errors

---

## 10. Development Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Set up Capacitor + Solid.js
- [ ] Implement IndexedDB/SQLite schema
- [ ] Create basic project/task CRUD UI
- [ ] EditorJS integration
- [ ] Offline change queue
**Deliverable**: Functional offline app (no backend)

### Phase 2: Backend & Sync (Week 3)
- [ ] Create Go backend project
- [ ] Implement transaction API
- [ ] File locking mechanism
- [ ] JWT auth with code generation
- [ ] Basic sync engine
**Deliverable**: Server-client sync working

### Phase 3: Attachments & Labels (Week 4)
- [ ] File upload/download endpoints
- [ ] Attachment index management
- [ ] Global label system
- [ ] Project label system
- [ ] Label assignment UI
**Deliverable**: Full attachment + label system

### Phase 4: Advanced Features (Week 5)
- [ ] Nested tasks refinement
- [ ] Search & filtering
- [ ] QR code auth UI
- [ ] Multi-device sync
- [ ] Mobile testing
**Deliverable**: Production-ready beta

### Phase 5: Polish & Deployment (Week 6+)
- [ ] Performance optimization
- [ ] Error handling & recovery
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Deployment setup
**Deliverable**: Ready for production

---

## 11. Backend Folder Structure

```
/server (Go project)
├── main.go
├── go.mod
├── go.sum
├── Dockerfile
├── .dockerignore
├── config/
│   └── config.go
├── api/
│   ├── transactions.go
│   ├── auth.go
│   └── sync.go
├── storage/
│   ├── filesystem.go     # File operations
│   ├── locking.go        # Transaction locking
│   └── manifest.go       # Sync metadata
├── auth/
│   ├── jwt.go            # JWT generation/validation
│   └── codes.go          # Auth code generation
├── middleware/
│   ├── auth.go
│   └── logging.go
├── cmd/
│   └── gen-codes/        # Code generation utility
│       └── main.go
└── data/                 # Generated at runtime
    ├── projects/
    ├── global/
    └── users/
```

---

## 12. Considerations & Risks

### Simplified Approach Benefits
- ✓ No database to manage/backup
- ✓ Simple file-based replication (just copy directory)
- ✓ Easy to understand data structure
- ✓ Go backend extremely lightweight
- ✓ Can version control with git (excluding attachments)
- ✓ Simple conflict resolution (last-write-wins)

### Potential Challenges
- ⚠ File I/O performance at scale (millions of files)
- ⚠ Need robust file locking across platforms
- ⚠ Backups more manual (but simple - just copy data/)
- ⚠ Search requires in-memory index

### Mitigation Strategies
1. Monitor file system limits; archive old projects
2. Test on target hardware early
3. Document backup procedure; automate if needed
4. Implement in-memory cache for frequently searched items

---

## 13. Success Metrics

- **Startup**: App loads in < 2 seconds
- **Sync**: 1000 changes sync in < 5 seconds
- **Storage**: Handle 10,000+ tasks without degradation
- **Offline**: All core features work without network
- **Attachments**: Support files up to 100MB
- **Users**: Support 100+ concurrent client connections

---

## 14. Next Steps

1. Review & approve architecture
2. Initialize Go backend project
3. Create Solid.js component library
4. Design/implement auth code generation utility
5. Begin Phase 1 development

---

**Document Version**: 2.0 (Simplified)  
**Last Updated**: 2026-05-14  
**Owner**: Team Lead
