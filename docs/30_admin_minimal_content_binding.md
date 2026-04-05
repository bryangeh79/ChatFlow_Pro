# 30 Admin Minimal Content Binding

## FAQ Page
- Source objects: faq-item
- Bound fields: question, languageCode, isActive, keywords, tags
- Mock/static binding: yes, minimal list data can be static
- Placeholder elements: add/edit/disable buttons
- Future stability rule: keep the page bound to the same FAQ item model when API/database arrives

## Leads Page
- Source objects: lead, conversation
- Bound fields: name, phone, email, companyName, region, languageCode, needSummary, source/channel mapping
- Mock/static binding: yes, minimal data can be static
- Placeholder elements: detail display only
- Future stability rule: preserve the same lead and conversation model

## Conversations Page
- Source objects: conversation, message, handoff, handoff summary, assignment
- Bound fields: id, channel, languageCode, assignmentStatus, handoffStatus, ownerMemberId, recent messages, summary snippet
- Mock/static binding: yes, minimal data can be static
- Placeholder elements: view-only timeline and summary
- Future stability rule: keep the page reading the same runtime objects

## Reports Page
- Source objects: report-summary, conversation, lead, handoff, FAQ item
- Bound fields: total conversations, new customers, valid leads, top questions, handoff count, daily/weekly summary
- Mock/static binding: yes, minimal cards can be static
- Placeholder elements: metric cards and trend blocks
- Future stability rule: keep report-summary as the primary output shape

## System Settings Page
- Source objects: system-settings
- Bound fields: welcome message, default language, basic rules, operating hours placeholder
- Mock/static binding: yes, minimal settings can be static
- Placeholder elements: edit/save buttons
- Future stability rule: keep the same settings object shape if persistence is added later
