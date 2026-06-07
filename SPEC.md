# Grok Organizer — Project Specification v1.0

## 1. Project Overview

**Name:** Grok Organizer
**Description:** A self-hosted AI media management platform for organizing, searching, and analyzing AI-generated images and animations. Built to track the full lifecycle of creative output — from prompt to final render — with relationship mapping, prompt evolution tracking, and workflow analytics.

**Hosted On:** gamehendge (Ubuntu/Debian homelab server)
**Users:** 2 (Ryan, Bella) — authenticated access only
**Scale:** Thousands of existing outputs, growing daily

---

## 2. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React + Tailwind CSS | PWA-ready, responsive (desktop + mobile) |
| **Backend** | Python + FastAPI | Async, high-performance API |
| **Database** | PostgreSQL | Complex relational data, full-text search |
| **Media Storage** | Local filesystem | Files on disk, metadata in Postgres |
| **Containerization** | Docker + Docker Compose | All services containerized |
| **Reverse Proxy** | Nginx | HTTPS, routing, static file serving |
| **CI/CD** | Jenkins on gamehendge | Auto-deploy on push to main |
| **Source Control** | GitHub | Dev work on local dev VM |
| **Thumbnails** | Sharp (Node) or Pillow (Python) | Auto-generated on upload, animated GIF thumbnails for animations |

---

## 3. Core Data Model

### 3.1 Generation Tree

The fundamental organizing structure. Every piece of content exists within a tree.

```
Base Image (root)
├── Edit 1
│   ├── Edit 1a
│   └── Edit 1b
│       └── Animation (3 extension segments)
├── Edit 2
│   └── Animation (2 extension segments)
└── Animation (4 extension segments)
```

**Entity: `OutputNode`**
- `id` (UUID, primary key)
- `parent_id` (UUID, nullable — null = root/base image)
- `tree_id` (UUID — groups all nodes in same generation tree)
- `node_type` (enum: `base_image`, `edit`, `animation`)
- `file_path` (string — relative path to media file on disk)
- `thumbnail_path` (string — path to generated thumbnail / animated GIF)
- `mime_type` (string — image/png, image/jpeg, video/mp4, etc.)
- `file_size` (integer — bytes)
- `width` (integer — pixels)
- `height` (integer — pixels)
- `duration` (float, nullable — seconds, for animations only)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `rating` (integer, nullable — 1 to 10)
- `is_favorite` (boolean — Hall of Fame flag)
- `notes` (text, nullable — freeform notes)
- `moderation_outcome` (enum: `passed`, `blocked`, `not_applicable`)
- `generation_mode` (enum: `speed`, `quality`)

### 3.2 Prompts

Prompts are first-class entities, linked to outputs but independently searchable and trackable.

**Entity: `Prompt`**
- `id` (UUID, primary key)
- `output_node_id` (UUID, foreign key → OutputNode)
- `prompt_text` (text — the full prompt used)
- `prompt_type` (enum: `base`, `edit`, `extension`)
- `extension_order` (integer, nullable — 1, 2, 3 for animation extensions)
- `parent_prompt_id` (UUID, nullable — links to the prompt this evolved from)
- `technique_tags` (array of strings — e.g., `whiteboard_injection`, `caption_as_instruction`, `architect_framework`, `compliance_amplifier`, `edit_workflow`, `keyframe_animation`)
- `includes_spicy_header` (boolean)
- `dodge_phrases_used` (array of strings, nullable)
- `created_at` (timestamp)

### 3.3 Tags

Hybrid system: fixed categories + freeform tags.

**Entity: `Tag`**
- `id` (UUID, primary key)
- `name` (string — tag display name)
- `category` (enum: `technique`, `content_type`, `character`, `setting`, `mood`, `custom`)
- `color` (string, nullable — hex color for UI display)

**Entity: `OutputTag`** (junction table)
- `output_node_id` (UUID, foreign key)
- `tag_id` (UUID, foreign key)

### 3.4 Projects / Collections

**Entity: `Project`**
- `id` (UUID, primary key)
- `name` (string — e.g., "Teddy Bear Bella Series")
- `description` (text, nullable)
- `cover_image_id` (UUID, nullable — foreign key → OutputNode)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Entity: `ProjectNode`** (junction table)
- `project_id` (UUID, foreign key)
- `output_node_id` (UUID, foreign key)
- `sort_order` (integer — manual ordering within project)

### 3.5 Sessions

**Entity: `Session`**
- `id` (UUID, primary key)
- `title` (string, nullable — e.g., "Teddy Bear Experiments June 1")
- `started_at` (timestamp)
- `ended_at` (timestamp, nullable)
- `journal` (text, nullable — session notes, discoveries, observations)

**Entity: `SessionNode`** (junction table)
- `session_id` (UUID, foreign key)
- `output_node_id` (UUID, foreign key)

### 3.6 Prompt Templates

**Entity: `PromptTemplate`**
- `id` (UUID, primary key)
- `name` (string — e.g., "Whiteboard Injection Base", "Architect Framework Portrait")
- `category` (string — e.g., "base_template", "extension", "header", "dodge_phrase_set")
- `template_text` (text — the reusable prompt text, may contain `{{placeholders}}`)
- `placeholders` (JSON, nullable — describes available placeholder variables)
- `notes` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### 3.7 Users

**Entity: `User`**
- `id` (UUID, primary key)
- `username` (string, unique)
- `password_hash` (string)
- `display_name` (string)
- `role` (enum: `admin`, `user`)
- `created_at` (timestamp)

---

## 4. Feature Specifications

### 4.1 Upload & Ingest Pipeline

**Upload Flow:**
1. User selects file(s) or drags and drops onto the UI
2. App stores file to local filesystem in organized directory structure: `/media/{year}/{month}/{day}/{uuid}.{ext}`
3. Auto-generates thumbnail (static for images, animated GIF for animations)
4. Extracts available metadata (dimensions, file size, duration)
5. Prompts user for: prompt text, parent node (if edit/extension), tags, rating
6. Creates OutputNode + Prompt records in database

**Bulk Upload:**
- Support batch upload of multiple files
- Allow batch-tagging and batch-assignment to projects/sessions
- Queue-based processing for thumbnail generation

### 4.2 Gallery View

**Main Gallery:**
- Responsive grid layout — adapts from desktop (4-6 columns) to mobile (2 columns)
- Animated thumbnails for animations (auto-playing GIF on hover for desktop, static with play icon on mobile)
- Quick-actions on hover/tap: rate, favorite, add to project, open detail view
- Infinite scroll or paginated (user preference)
- Sort by: date created, rating, date modified, file size
- Filter by: tags, technique, project, session, moderation outcome, rating range, favorites only, node type (base/edit/animation)

**Generation Tree View:**
- Visual tree diagram showing parent-child relationships
- Click any node to see its full detail + prompt
- Highlight the currently selected branch
- Collapse/expand branches
- Show prompt diffs between parent and child nodes

### 4.3 Detail View

**Single Output View:**
- Full-size media display (zoomable for images, playable for animations)
- Animation timeline showing base + extension segments with markers
- Prompt text displayed below with syntax highlighting for technique elements
- Prompt evolution chain: show the full lineage of prompts that led to this output
- Metadata panel: dimensions, file size, duration, generation mode, moderation outcome
- Rating widget (1-10 clickable stars or slider)
- Tags (display, add, remove)
- Notes editor (rich text)
- Navigation: previous/next within current gallery filter or project
- "Related outputs" section: same tree, same tags, same prompt template

### 4.4 A/B Comparison View

- Side-by-side panels
- Drag any two outputs into the comparison
- Prompts displayed below each output with **diff highlighting** showing exactly what changed
- Both ratings visible for quick comparison
- Notes field for comparison observations
- Save comparisons as named references within a project

### 4.5 Prompt Management

**Prompt Library:**
- Searchable list of all prompts used
- Filter by technique, moderation outcome, associated rating
- Sort by date, rating of associated output, prompt length

**Prompt Evolution Tracker:**
- Select any prompt and see its evolution chain
- Visual diff between versions (highlighted additions/removals)
- Linked output for each version so you see prompt → result side by side
- Branching visualization when one prompt evolved into multiple variants

**Prompt Workbench:**
- Build new prompts by combining templates
- Pull in reusable components: spicy header, dodge phrases, architect framework sections
- Placeholder system: `{{subject}}`, `{{lighting}}`, `{{theme}}` variables that get filled in
- Save new combinations as templates for future use
- Copy-to-clipboard for pasting into Grok

### 4.6 Search & Discovery

**Full-Text Search:**
- Search across prompt text, notes, tags, project names, session journals
- Results ranked by relevance with highlighted matches
- Filter search results by any metadata field

**Advanced Query Builder:**
- Combine multiple filters with AND/OR logic
- Example queries:
  - "All outputs using whiteboard injection with rating >= 8"
  - "All edits branching from output X"
  - "Caption-as-instruction + compliance amplifier, passed moderation"
  - "Everything from June 1 session tagged 'teddy bear'"
- Save frequently used queries as bookmarks

**Duplicate / Variant Detection:**
- Prompt-text similarity matching (flag prompts >80% similar)
- Surface potential duplicates during upload
- "Similar outputs" recommendations on detail view

### 4.7 Project & Collection Management

**Projects:**
- Create, rename, delete projects
- Add/remove outputs to projects
- Manual sort order within projects
- Project cover image (selectable from project contents)
- Project-level notes and description
- Project timeline view: all outputs in chronological order
- Project statistics: output count, average rating, techniques used

**Export:**
- Export project as ZIP with organized folder structure
- Include prompt text files alongside media files
- Optional: include metadata JSON for each output
- Optional: include session journal and project notes

### 4.8 Session Journaling

**Session Workflow:**
- "Start Session" button — begins tracking
- All uploads during active session auto-tagged to that session
- Live journal editor — write notes as you work
- "End Session" button — closes session with timestamp
- Sessions viewable as a timeline with outputs interspersed with journal entries

### 4.9 Moderation Tracking

- Tag each output: passed / blocked / not applicable
- Track moderation strategy used (from prompt technique tags)
- Aggregate statistics: pass rate by technique, by time period, by dodge phrase combination

### 4.10 Analytics Dashboard

**Generation Statistics:**
- Outputs per day/week/month (bar chart)
- Cumulative output growth (line chart)

**Quality Metrics:**
- Average rating over time
- Rating distribution (histogram)
- Top-rated outputs gallery
- Hall of Fame (favorites collection)

**Technique Analysis:**
- Pass/fail rates by technique (bar chart)
- Most-used techniques (pie chart)
- Technique effectiveness: average rating by technique
- Dodge phrase effectiveness: pass rate by dodge phrase combination

**Prompt Analytics:**
- Average prompt length vs output rating (scatter plot)
- Most reused templates
- Prompt evolution depth (how many iterations before hitting high ratings)

**Storage:**
- Total disk usage
- Usage by media type (image vs animation)
- Growth trend

---

## 5. UI/UX Design Guidelines

### Layout
- **Desktop:** Sidebar navigation (collapsible) + main content area
- **Mobile:** Bottom tab navigation + full-width content
- **Dark mode default** (with light mode toggle) — Bella edits in dim light, so dark UI is essential
- Color scheme: deep charcoal backgrounds, accent colors for tags and actions

### Navigation Structure
```
├── Gallery (main view — filterable grid of all outputs)
├── Trees (generation tree browser)
├── Projects (collection management)
├── Prompts (library, evolution tracker, workbench)
├── Sessions (journal timeline)
├── Compare (A/B comparison tool)
├── Analytics (dashboard)
└── Settings (user preferences, storage info, import/export)
```

### Interaction Patterns
- Drag-and-drop for: uploading, adding to projects, A/B comparison
- Right-click context menus on gallery items (desktop)
- Long-press context menus on gallery items (mobile)
- Keyboard shortcuts for power users (rate, navigate, favorite, tag)
- Toast notifications for async operations (upload complete, thumbnail generated)

---

## 6. API Structure

RESTful API with the following resource endpoints:

```
# Authentication
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

# Outputs
GET    /api/outputs                    # List/search/filter
POST   /api/outputs                    # Upload new output
GET    /api/outputs/{id}               # Get single output detail
PUT    /api/outputs/{id}               # Update metadata (rating, notes, tags)
DELETE /api/outputs/{id}               # Delete output + file

# Generation Trees
GET    /api/trees                      # List all trees
GET    /api/trees/{tree_id}            # Get full tree structure
GET    /api/trees/{tree_id}/nodes      # Get all nodes in tree

# Prompts
GET    /api/prompts                    # List/search prompts
GET    /api/prompts/{id}               # Get prompt detail
GET    /api/prompts/{id}/evolution     # Get evolution chain
GET    /api/prompts/{id}/diff/{other}  # Diff two prompts

# Tags
GET    /api/tags                       # List all tags
POST   /api/tags                       # Create tag
PUT    /api/tags/{id}                  # Update tag
DELETE /api/tags/{id}                  # Delete tag

# Projects
GET    /api/projects                   # List projects
POST   /api/projects                   # Create project
GET    /api/projects/{id}              # Get project with outputs
PUT    /api/projects/{id}              # Update project
DELETE /api/projects/{id}              # Delete project
POST   /api/projects/{id}/outputs      # Add outputs to project
DELETE /api/projects/{id}/outputs/{oid}# Remove output from project

# Sessions
GET    /api/sessions                   # List sessions
POST   /api/sessions                   # Start session
PUT    /api/sessions/{id}              # Update session (journal, end)
GET    /api/sessions/{id}              # Get session with outputs

# Templates
GET    /api/templates                  # List templates
POST   /api/templates                  # Create template
PUT    /api/templates/{id}             # Update template
DELETE /api/templates/{id}             # Delete template

# Analytics
GET    /api/analytics/generation-stats # Output counts over time
GET    /api/analytics/quality-metrics  # Rating distributions
GET    /api/analytics/technique-stats  # Technique effectiveness
GET    /api/analytics/storage          # Disk usage stats

# Compare
POST   /api/compare                    # Compare two outputs (returns diff)
```

---

## 7. Infrastructure & Deployment

### Docker Compose Services
```yaml
services:
  frontend:    # React app served by Nginx
  backend:     # FastAPI application
  db:          # PostgreSQL
  nginx:       # Reverse proxy, SSL termination
```

### Directory Structure on gamehendge
```
/opt/grok-organizer/
├── docker-compose.yml
├── frontend/
├── backend/
├── nginx/
├── media/              # Uploaded files
│   └── {year}/{month}/{day}/{uuid}.{ext}
├── thumbnails/         # Auto-generated thumbnails
│   └── {uuid}_thumb.{ext}
└── backups/            # Database backup dumps
```

### Jenkins Pipeline Stages
1. **Checkout** — Pull latest from GitHub main branch
2. **Test** — Run backend unit tests + linting
3. **Build** — Build Docker images for frontend and backend
4. **Deploy** — Docker Compose down → up with new images
5. **Health Check** — Verify API responds, frontend loads
6. **Notify** — Success/failure notification

### Backup Strategy
- Daily PostgreSQL dump via cron → `/opt/grok-organizer/backups/`
- Retain 30 days of daily backups
- Media files backed up separately (rsync to secondary drive or NAS if available)

---

## 8. Development Phases

### Phase 1 — Foundation (MVP)
- [ ] Database schema + migrations
- [ ] File upload pipeline + thumbnail generation
- [ ] Basic gallery view with grid layout
- [ ] Output detail view with prompt display
- [ ] Basic tagging system
- [ ] Rating system
- [ ] Simple search (full-text on prompts and notes)
- [ ] User authentication (2 users)
- [ ] Docker Compose setup
- [ ] Jenkins pipeline

### Phase 2 — Relationships & Organization
- [ ] Generation tree data structure + API
- [ ] Tree visualization UI
- [ ] Project/collection management
- [ ] Session journaling
- [ ] Bulk upload + batch operations
- [ ] Animated thumbnails for animations

### Phase 3 — Prompt Intelligence
- [ ] Prompt evolution tracking + chain visualization
- [ ] Prompt diff engine (highlighted changes between versions)
- [ ] Prompt template library + workbench
- [ ] Technique tagging system
- [ ] Moderation outcome tracking

### Phase 4 — Discovery & Analysis
- [ ] Advanced query builder with AND/OR logic
- [ ] A/B comparison view with prompt diffs
- [ ] Duplicate/variant detection
- [ ] Analytics dashboard (generation stats, quality metrics, technique analysis)
- [ ] Prompt analytics (length vs rating, evolution depth)

### Phase 5 — Polish & Power Features
- [ ] Keyboard shortcuts
- [ ] Dark/light mode toggle
- [ ] Export projects as ZIP packages
- [ ] Mobile-optimized touch interactions
- [ ] Storage analytics
- [ ] Saved query bookmarks
- [ ] Hall of Fame / favorites curation

---

## 9. Non-Functional Requirements

- **Performance:** Gallery loads <2 seconds with 1000+ items (lazy loading, pagination)
- **Storage:** Efficient thumbnail generation, no duplicate file storage
- **Security:** Password-protected access, no public exposure (LAN-only or VPN)
- **Reliability:** Graceful error handling, no data loss on crash, daily backups
- **Responsiveness:** Fully functional on mobile screens (375px+) through desktop (1920px+)
- **Maintainability:** Clean code structure, documented API, modular architecture

---

## 10. Future Considerations (Post-v1)

- AI-powered auto-tagging (analyze image content, suggest tags)
- Prompt similarity search using embeddings
- Multi-user collaboration features (if scope expands beyond 2 users)
- Grok API integration (if/when available — generate directly from the app)
- Version control for prompt templates (git-like history)
- Mobile app wrapper (Capacitor or similar PWA enhancement)
- Webhook integrations (notify on upload, session complete)
