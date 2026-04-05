# 28 Admin Page Shell Structure

## Goal
Create the smallest admin shell structure for ChatFlow Pro.
The admin side is a management and viewing layer only.

## Module Division
### `pages/`
- Holds page-level shells for FAQ, leads, conversations, reports, and system settings.
- Each page shell defines the main page layout sections.

### `components/`
- Holds reusable admin UI parts.
- Shared sections, cards, badges, and page blocks live here.

### `types/`
- Holds page scope, action scope, and data view types.

## Minimum Page Shell Sections
- Header/title block
- Summary or status block
- Main content block
- Action block or placeholder
- Empty state / note block when needed

## Page-Level vs Component-Level
### Page-level
- FAQ list region
- lead detail region
- conversation timeline region
- report metric cards region
- system settings form region

### Component-level
- section wrapper
- data card
- status badge
- small reusable row or block elements

## Real vs Placeholder
### Real Skeleton
- Folder structure
- Page shell files
- Page scope typing
- Shared component placeholders

### Placeholder
- Actual filtering logic
- Save operations
- Table interaction logic
- Reporting calculations
