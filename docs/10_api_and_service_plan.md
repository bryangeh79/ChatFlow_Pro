# 10 API and Service Plan

## MVP Core API Groups

### 1) Auth / Admin Access
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### 2) Conversations
- `GET /conversations`
- `GET /conversations/:id`
- `POST /conversations/:id/assign`
- `POST /conversations/:id/handoff`
- `POST /conversations/:id/close`

### 3) Messages
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages`

### 4) Leads
- `GET /leads`
- `GET /leads/:id`
- `POST /leads`
- `PATCH /leads/:id`

### 5) FAQ / Knowledge Base
- `GET /faqs`
- `POST /faqs`
- `PATCH /faqs/:id`
- `DELETE /faqs/:id`
- `GET /knowledge-items`
- `POST /knowledge-items`
- `PATCH /knowledge-items/:id`

### 6) Team Members / Permissions
- `GET /team-members`
- `POST /team-members`
- `PATCH /team-members/:id`
- `GET /roles`
- `PATCH /roles/:id`

### 7) Channels
- `GET /channels`
- `PATCH /channels/:id`
- `GET /channels/:id/settings`

### 8) Reports
- `GET /reports/summary`
- `GET /reports/daily`
- `GET /reports/weekly`

### 9) Notifications
- `GET /notifications`
- `PATCH /notifications/:id/read`

### 10) System Settings
- `GET /settings`
- `PATCH /settings`
- `GET /settings/language`
- `PATCH /settings/language`

## Chat / Widget / Channel Side API
- `POST /chat/entry`
- `POST /chat/message`
- `GET /chat/session/:id`
- `POST /channel/webhook/:channel`
- `GET /channel/status`

## Service Layer Split

### Core Services
- `ConversationService`
- `MessageService`
- `LeadService`
- `KnowledgeBaseService`
- `FaqService`
- `AssignmentService`
- `HandoffService`
- `NotificationService`
- `ReportService`
- `ChannelRoutingService`
- `LanguageResolutionService`
- `AdminSettingsService`
- `AuthService`

### Service Responsibilities
- `ConversationService`: manage conversation state and lifecycle
- `MessageService`: store and retrieve messages
- `LeadService`: create and update captured lead data
- `KnowledgeBaseService`: retrieve support content
- `FaqService`: maintain FAQ content records
- `AssignmentService`: assign staff to conversations and leads
- `HandoffService`: create handoff records and summaries
- `NotificationService`: emit alerts to staff/admin
- `ReportService`: aggregate operational metrics
- `ChannelRoutingService`: normalize incoming channel payloads
- `LanguageResolutionService`: detect, select, and fall back between languages
- `AdminSettingsService`: load/update admin configuration
- `AuthService`: handle login and session or token logic

## Phase Boundaries
### Phase 2 should include
- API skeleton
- service interfaces
- DTOs and shared types
- data model draft
- channel adapter interfaces
- admin settings structures

### Phase 3 should include
- chat reply logic
- FAQ matching implementation
- basic lead capture workflow
- initial language-aware response flow

### Later phases should include
- advanced reporting enrichment
- notification automation refinement
- more advanced retrieval and classification
- further channel-specific hardening

## Planning Notes
This is a service-oriented MVP plan, not implementation code.
It provides the minimal interface map needed to begin the project skeleton without drifting into business logic expansion.
