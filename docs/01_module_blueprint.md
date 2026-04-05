# 01 Module Blueprint

## Product Boundary
ChatFlow Pro is a customer reception and support automation system for SMEs.
It only covers standard communication channels and internal automation.
It does not cover e-commerce platform integrations, payment flows, ERP, or full sales conversion pipelines.
Anything deeper belongs to ChatFlow Enterprise and is out of scope here.

## Supported Channels
- Website chat
- Telegram
- WhatsApp
- Facebook Messenger

## Core Modules

### 1) Channel Integration
- Responsibility: receive and send messages from supported channels.
- Input: external user messages, channel metadata, user identity signals.
- Output: normalized conversation events, delivery status, channel tags.
- Boundary: no e-commerce platform connectors.

### 2) Welcome & Auto Reply
- Responsibility: send welcome messages and rule-based auto replies.
- Input: first contact events, keywords, business hours, language context.
- Output: greeting, FAQ answers, fallback prompts, handoff triggers.
- Boundary: no complex sales automation or payment logic.

### 3) FAQ / Knowledge Base
- Responsibility: store and answer from company knowledge.
- Input: FAQ items, product info, service info, company intro, uploaded content.
- Output: matched answers, citations/trace references, unresolved intents.
- Boundary: focused on support and reception content only.

### 4) Lead Capture
- Responsibility: collect contact and needs information.
- Input: name, phone, email, company, region, inquiry details.
- Output: lead record, structured summary, qualification tags.
- Boundary: no CRM replacement, no downstream deal closing workflow.

### 5) Customer Classification
- Responsibility: tag conversations and leads by service intent and priority.
- Input: conversation signals, lead completeness, handoff state.
- Output: new customer, normal inquiry, potential lead, high-intent lead, follow-up needed.
- Boundary: lightweight classification only.

### 6) Multi-User Collaboration
- Responsibility: support multiple sales/support members working together.
- Input: team members, assignment rules, handoff actions.
- Output: owner assignment, team visibility, collaboration status.
- Boundary: at least 4 members supported; no enterprise workflow engine.

### 7) Human Handoff
- Responsibility: transfer conversation from system to a human.
- Input: user request, complex question, low-confidence response, escalation rule.
- Output: handoff summary, assigned staff, pending message queue.
- Boundary: no SLA orchestration or call-center routing.

### 8) Notifications
- Responsibility: notify staff/admin of important events.
- Input: new leads, high-intent leads, handoff requests, admin rules.
- Output: alerts to assigned team members or admin.
- Boundary: lightweight alerts only.

### 9) Reports
- Responsibility: show basic operational metrics.
- Input: conversation count, lead count, FAQ hits, handoff count.
- Output: daily/weekly summaries, top questions, lead volume.
- Boundary: no BI warehouse, no advanced analytics suite.

### 10) Admin Console
- Responsibility: manage the system configuration.
- Input: business settings, welcome text, FAQ content, team members, rules.
- Output: saved config, content updates, admin visibility.
- Boundary: basic backend only.

### 11) Multilingual Strategy
- Responsibility: define and reserve language-aware behavior.
- Supported languages in Phase 1:
  - Chinese
  - English
  - Vietnamese
  - Malay (Malaysia)
- Phase 1 scope:
  - define language strategy
  - reserve language fields and config points
  - plan content layering by language
  - avoid implementing full translation packs in Phase 1
- Boundary: no full i18n runtime implementation in this phase.

## Module Interaction Summary
- Channel Integration receives inbound messages.
- Welcome & Auto Reply and FAQ / Knowledge Base produce answers.
- Lead Capture and Customer Classification structure conversation outcomes.
- Human Handoff and Notifications handle escalation.
- Reports and Admin Console provide visibility and control.
- Multilingual Strategy sits across all modules as a shared planning layer.
