# 29 Admin Data View Mapping

## FAQ Page
### Maps To
- FAQ item
- languageCode
- keywords
- tags
- active status

### View / Edit Bias
- Mostly edit
- Also list and view

## Customer / Lead Page
### Maps To
- lead
- conversation
- assignment
- languageCode

### View / Edit Bias
- Mostly view
- Light editing later if needed

## Conversation Record Page
### Maps To
- conversation
- message
- handoff
- handoff summary
- assignment

### View / Edit Bias
- Mostly view

## Basic Reports Page
### Maps To
- report summary
- conversation counts
- lead counts
- handoff counts

### View / Edit Bias
- View only

## System Settings Page
### Maps To
- system settings
- welcome message
- default language
- basic rules

### View / Edit Bias
- Mostly edit

## View Scope Rule
All admin pages should use only the minimal fields needed for display.
No heavy aggregation or deep query behavior is required in this phase.
