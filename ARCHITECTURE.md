# Technical Architecture & Data Flows (Simplified)

## 1. File-Based Storage Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PROJECTS                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ id (UUID) PK                                                   │ │
│  │ title (VARCHAR)                                                │ │
│  │ description (JSONB - EditorJS)                                 │ │
│  │ createdAt (TIMESTAMPTZ)                                        │ │
│  │ dueBy (TIMESTAMPTZ)                                            │ │
│  │ updatedAt (TIMESTAMPTZ)                                        │ │
│  │ deletedAt (TIMESTAMPTZ) - soft delete                          │ │
│  │ version (BIGINT) - for conflict resolution                     │ │
│  │ syncStatus (VARCHAR) - synced|pending|error                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                 │                           │                      │
                 │ 1:N                       │ 1:N                  │ 1:N
                 │                           │                      │
    ┌────────────▼─────────────┐  ┌─────────▼──────────┐  ┌────────▼─────────────┐
    │        TASKS             │  │   ATTACHMENTS      │  │      LABELS         │
    ├──────────────────────────┤  ├────────────────────┤  ├─────────────────────┤
    │ id (UUID) PK             │  │ id (UUID) PK       │  │ id (UUID) PK        │
    │ projectId (FK)           │  │ projectId (FK)     │  │ projectId (FK)      │
    │ parentTaskId (FK) ──┐    │  │ filename           │  │ title               │
    │   ↓ Self-referential     │  │ mimeType           │  │ value (text|date)   │
    │ title                    │  │ fileSize           │  │ color (hex)         │
    │ description (JSONB)      │  │ storageKey         │  │ options (JSONB)     │
    │ createdAt                │  │ uploadedAt         │  │ createdAt           │
    │ dueBy                    │  │ version            │  │ updatedAt           │
    │ completed (BOOLEAN)      │  │ syncStatus         │  │ deletedAt           │
    │ version                  │  └────────────────────┘  └─────────────────────┘
    │ syncStatus               │           │
    └────────────────────────────          │ N:M
                                           │
                          ┌────────────────▼────────────────┐
                          │   TASK_ATTACHMENTS (Junction)   │
                          ├─────────────────────────────────┤
                          │ id (UUID) PK                    │
                          │ taskId (FK) ─┐ UNIQUE(task, att)
                          │ attachmentId (FK) ┘             │
                          │ addedAt (TIMESTAMPTZ)           │
                          └─────────────────────────────────┘

                          ┌─────────────────────────────────┐
                          │    LABEL_VALUES (Assignments)   │
                          ├─────────────────────────────────┤
                          │ id (UUID) PK                    │
                          │ labelId (FK)                    │
                          │ targetId (UUID)                 │
                          │ targetType (project|task)       │
                          │ value (TEXT|DATE|NULL)          │
                          │ assignedAt                      │
                          │ syncStatus                      │
                          └─────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      SYNC_QUEUE (Local Only)                         │
├──────────────────────────────────────────────────────────────────────┤
│ id (UUID) PK                                                         │
│ operationType (CREATE|UPDATE|DELETE)                                 │
│ entityType (project|task|attachment|label)                           │
│ entityId (UUID)                                                      │
│ changes (JSONB - the actual changes)                                 │
│ timestamp (TIMESTAMPTZ)                                              │
│ retries (INT)                                                        │
│ lastError (TEXT)                                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Diagrams

### 2.1 Create Project Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ USER ACTION: Create Project                                             │
└────────────────────────────┬──────────────────────────────────────────────┘
                             │
                             ▼
                   ┌──────────────────────┐
                   │  Form Submission     │
                   │  (title, desc, date) │
                   └──────────────┬───────┘
                                 │
                        ┌────────┴────────┐
                        │ Validation      │
                        │ (client-side)   │
                        └────────┬────────┘
                                 │
                       ┌─────────▼──────────┐
                       │ Generate UUID     │
                       │ Set timestamps    │
                       │ Set syncStatus=   │
                       │  'pending'        │
                       │ Set version=1     │
                       └─────────┬─────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
    ┌─────────┐          ┌─────────────┐          ┌──────────────┐
    │ Insert  │          │  Insert     │          │  Show in UI  │
    │ into    │          │  into       │          │              │
    │ Local   │          │ sync queue  │          │ (immediate)  │
    │ Project │          │ (pending)   │          └──────────────┘
    │ table   │          └─────────────┘
    └────┬────┘
         │
         ▼
    ┌──────────────────┐
    │ Is Device       │
    │ Online?         │
    └──┬───────────┬──┘
       │           │
    NO │           │ YES
       │           │
       ▼           ▼
    ┌──────┐    ┌──────────────────────┐
    │ Wait │    │ POST /api/projects   │
    │ for  │    │ with data + version  │
    │ sync │    └──────────┬───────────┘
    │ later│               │
    └──────┘        ┌──────▼───────────┐
                    │ Server validates │
                    │ & stores         │
                    └──────┬───────────┘
                           │
                    ┌──────▼────────┐
                    │ Return created│
                    │ project with  │
                    │ syncStatus    │
                    │ 'synced'      │
                    └──────┬────────┘
                           │
                    ┌──────▼────────────┐
                    │ Update local DB   │
                    │ Remove from queue │
                    │ Set synced=true   │
                    └───────────────────┘
```

### 2.2 Attach File to Task Flow

```
USER ACTION: Select & Upload File
                 │
                 ▼
        ┌──────────────────┐
        │ File Picker      │
        │ (web/mobile)     │
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │ Validate file:   │
        │ - Size < 100MB   │
        │ - Type allowed   │
        │ - Quota check    │
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │ Read file blob   │
        │ into memory      │
        └────────┬─────────┘
                 │
        ┌────────▼────────────────┐
        │ Create Attachment rec   │
        │ in local DB:            │
        │ - Generate UUID         │
        │ - Calculate hash        │
        │ - Store blob blob       │
        │ - Set syncStatus        │
        │   'pending'             │
        └────────┬────────────────┘
                 │
        ┌────────▼──────────────────────┐
        │ Create TaskAttachment record  │
        │ (junction entry)              │
        └────────┬──────────────────────┘
                 │
        ┌────────▼────────────┐
        │ Add to sync queue   │
        │ (2 entries:         │
        │  attachment +       │
        │  task_attachment)   │
        └────────┬────────────┘
                 │
        ┌────────▼──────────────┐
        │ Show in UI:           │
        │ - Task attachment     │
        │ - Project hub         │
        │ - "Uploading..." icon │
        └────────┬──────────────┘
                 │
        ┌────────▼────────┐
        │ Is online?      │
        └───┬──────────┬──┘
            │          │
         NO │          │ YES
            │          │
            ▼          ▼
        ┌──────┐  ┌────────────────────────┐
        │ Wait │  │ Upload blob to S3      │
        │ for  │  │ (multipart or chunked) │
        │ sync │  │ Show progress bar      │
        │ later│  └────────┬───────────────┘
        └──────┘           │
                  ┌────────▼────────────┐
                  │ Get storage key     │
                  │ from S3             │
                  └────────┬────────────┘
                           │
                  ┌────────▼────────────┐
                  │ Update Attachment   │
                  │ record with         │
                  │ storageKey          │
                  │ Set synced=true     │
                  └────────┬────────────┘
                           │
                  ┌────────▼──────────────┐
                  │ Remove sync queue     │
                  │ entries (mark done)   │
                  └──────────────────────┘
```

### 2.3 Sync Changes Flow (When Coming Online)

```
EVENT: Device comes online
             │
             ▼
    ┌────────────────────┐
    │ Detect connection  │
    │ (Capacitor API)    │
    └────────┬───────────┘
             │
    ┌────────▼──────────────────┐
    │ Fetch pending changes     │
    │ from sync queue (local)   │
    └────────┬──────────────────┘
             │
    ┌────────▼────────────┐
    │ Is queue empty?     │
    └──┬────────────┬─────┘
       │ YES        │ NO
       │            │
       ▼            ▼
    ┌──────┐    ┌──────────────────┐
    │ Exit │    │ Batch changes    │
    └──────┘    │ (group by 50)    │
               │ Skip conflicts   │
               └────────┬─────────┘
                        │
               ┌────────▼─────────┐
               │ POST /api/sync/  │
               │ changes          │
               │ {               │
               │  changes: [],   │
               │  since: ts      │
               │ }               │
               └────────┬────────┘
                        │
               ┌────────▼──────────┐
               │ Receive response  │
               │ with conflicts?   │
               └───┬──────────┬────┘
                   │          │
                NO │          │ YES
                   │          │
                   │          ▼
                   │     ┌────────────────────────┐
                   │     │ Conflict Resolution    │
                   │     │ Last-Write-Wins:       │
                   │     │ Local version >        │
                   │     │ remote? Keep local     │
                   │     │ else: Use remote       │
                   │     └────────┬───────────────┘
                   │              │
                   └──────┬───────┘
                          │
                   ┌──────▼────────────┐
                   │ Mark as synced    │
                   │ Remove from queue │
                   │ Update versions   │
                   │ Update timestamps │
                   └──────┬────────────┘
                          │
                   ┌──────▼──────────────┐
                   │ GET /api/sync/      │
                   │ changes?since=ts    │
                   │ (fetch remote       │
                   │  changes from       │
                   │  other devices)     │
                   └──────┬──────────────┘
                          │
                   ┌──────▼──────────────┐
                   │ Merge received      │
                   │ changes into        │
                   │ local DB            │
                   │ (with versioning    │
                   │  conflict check)    │
                   └──────┬──────────────┘
                          │
                   ┌──────▼──────────────┐
                   │ Update UI with      │
                   │ new remote data     │
                   │ Show toast: "Synced"│
                   └────────────────────┘
```

---

## 3. Offline Capability Matrix

| Feature           | Offline Available | Details                    |
| ----------------- | ----------------- | -------------------------- |
| View Projects     | ✓                 | Cached in IndexedDB/SQLite |
| Create Project    | ✓                 | Queued, syncs when online  |
| Edit Project      | ✓                 | Changes queued locally     |
| Delete Project    | ✓                 | Soft delete queued         |
| View Tasks        | ✓                 | Cached, includes subtasks  |
| Create Task       | ✓                 | Queued with parent ref     |
| Edit Task         | ✓                 | Changes queued             |
| Complete Task     | ✓                 | Flag changed offline       |
| View Attachments  | ✓                 | If downloaded locally      |
| Upload Attachment | ✓                 | Queued, uploaded later     |
| Link Attachment   | ✓                 | Junction entry queued      |
| View Labels       | ✓                 | Cached in local DB         |
| Assign Labels     | ✓                 | Assignment queued          |
| Search            | ✓                 | Full-text in local DB      |
| Nested Tasks      | ✓                 | Complete hierarchy cached  |

---

## 4. Conflict Resolution Strategy

### Last-Write-Wins with Versioning

```javascript
// When merging remote change:
function resolveConflict(localChange, remoteChange) {
  if (localChange.version > remoteChange.version) {
    // Local is newer, keep it
    return localChange;
  } else if (remoteChange.version > localChange.version) {
    // Remote is newer, use it
    return remoteChange;
  } else if (localChange.timestamp > remoteChange.timestamp) {
    // Same version, use most recent by time
    return localChange;
  } else {
    // True tie, use remote (deterministic)
    return remoteChange;
  }
}

// Example:
const local = {
  id: "task-123",
  title: "Buy groceries",
  version: 3,
  timestamp: 1684103400000,
};

const remote = {
  id: "task-123",
  title: "Buy groceries and cook",
  version: 4,
  timestamp: 1684103300000,
};

// Result: Use local (version 3 < 4, but actually remote wins)
// Actually remote wins because 4 > 3
const resolved = remote;
```

### Conflict Detection

```
When local version < remote version:
  - Remote change happened after local
  - Possible conflict (both changed since sync point)

When local version = remote version:
  - Both changed since last sync
  - Check timestamps for tie-breaking

When local version > remote version:
  - Local change happened after remote
  - Keep local (user's latest action)
```

---

## 5. Attachment Storage Strategy

### Client-Side Storage

```
File Storage Locations:
├── IndexedDB (Web)
│   ├── Blobs up to 50MB
│   ├── Attachment metadata
│   └── Task attachment relations
│
└── SQLite (Mobile - Capacitor)
    ├── Compressed blobs
    ├── Attachment metadata
    └── Task attachment relations

Local Cache Structure:
/attachments/
  ├── {projectId}/
  │   ├── {attachmentId}.blob
  │   ├── {attachmentId}.meta.json
  │   └── index.json (hash for dedup)
```

### Server-Side Storage

```
S3 Bucket Structure:
s3://vara-tasks/
├── projects/{projectId}/
│   ├── attachments/
│   │   ├── {attachmentId}
│   │   ├── {attachmentId}.meta.json
│   └── backup/
```

### Sync Strategy for Attachments

```
1. Store file locally (IndexedDB/SQLite)
2. Add to sync queue with "pending-upload" status
3. When online, upload to S3
4. Get back storageKey
5. Update local record with storageKey
6. Mark as "synced"
7. Other devices fetch attachmentId → download from S3
```

---

## 6. Label Query Examples

### Query 1: Get all "High Priority" tasks in project

```sql
SELECT t.* FROM tasks t
JOIN label_values lv ON lv.target_id = t.id AND lv.target_type = 'task'
JOIN labels l ON l.id = lv.label_id
WHERE t.project_id = 'proj-123'
  AND l.title = 'Priority'
  AND lv.value = 'High Priority'
  AND t.deleted_at IS NULL;
```

### Query 2: Multi-label filtering (tasks that are "High Priority" AND "In Progress")

```sql
SELECT t.* FROM tasks t
WHERE t.project_id = 'proj-123'
  AND t.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM label_values lv1
    JOIN labels l1 ON l1.id = lv1.label_id
    WHERE lv1.target_id = t.id
      AND lv1.target_type = 'task'
      AND l1.title = 'Priority'
      AND lv1.value = 'High Priority'
  )
  AND EXISTS (
    SELECT 1 FROM label_values lv2
    JOIN labels l2 ON l2.id = lv2.label_id
    WHERE lv2.target_id = t.id
      AND lv2.target_type = 'task'
      AND l2.title = 'Status'
      AND lv2.value = 'In Progress'
  );
```

### Query 3: Find tasks due in next 7 days with specific label

```sql
SELECT DISTINCT t.* FROM tasks t
LEFT JOIN label_values lv ON lv.target_id = t.id AND lv.target_type = 'task'
LEFT JOIN labels l ON l.id = lv.label_id
WHERE t.project_id = 'proj-123'
  AND t.due_by BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND t.deleted_at IS NULL
  AND (l.title = 'Urgent' OR l.id IS NULL);
```

---

## 7. Performance Optimization Tips

### Database Indexing

```sql
-- Add indexes for common queries
CREATE INDEX idx_tasks_project_due ON tasks(project_id, due_by);
CREATE INDEX idx_tasks_completed ON tasks(project_id, completed);
CREATE INDEX idx_label_values_query ON label_values(target_id, label_id);
```

### Client-Side Optimization

- Lazy load tasks (100 at a time, infinite scroll)
- Virtualize task list (render only visible items)
- Cache project/label data for 5 minutes
- Debounce sync operations (max 1 per second)
- Compress images before upload

### Server-Side Optimization

- Use connection pooling (10-20 connections)
- Query optimization with EXPLAIN ANALYZE
- Cache frequently accessed projects (Redis)
- Archive soft-deleted items after 30 days
- Regular VACUUM ANALYZE on PostgreSQL

---

## 8. Security Considerations

### Data Validation

- Sanitize all user inputs on backend
- Validate EditorJS blocks (whitelist safe blocks)
- Limit file types and sizes
- Validate label options (prevent injection)

### Authentication

- JWT tokens with 1-hour expiration
- Refresh token rotation
- HTTPS only in production
- CSRF protection for state-changing operations

### Authorization

- User owns their projects (user_id field needed)
- Verify project ownership before task operations
- Sanitize attachment access (check ownership)

### Encryption

- At-rest: Database encryption
- In-transit: TLS/SSL
- Attachments: S3 server-side encryption

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-14
