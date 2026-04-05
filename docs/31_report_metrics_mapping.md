# 31 Report Metrics Mapping

## Metrics
- Total conversations -> conversation records
- New customers -> lead records or new visitor records
- Valid leads -> lead qualification status
- Top questions -> FAQ / knowledge item hit counts or static placeholder in MVP
- Handoff count -> handoff records
- Daily / weekly summary -> aggregated report-summary output

## MVP Mapping Status
- Total conversations: placeholder count or static mapping
- New customers: placeholder count or lead-based mapping
- Valid leads: lead-based mapping
- Top questions: static/placeholder in MVP
- Handoff count: handoff-based mapping or placeholder count
- Daily / weekly summary: static/placeholder in MVP

## Replacement Rule Later
When backend aggregation is added, only the report-summary generation layer should change.
The page shell should keep the same metric names and card layout.

## Object Alignment Rule
Keep metric naming aligned with conversation, lead, handoff, and FAQ item models.
