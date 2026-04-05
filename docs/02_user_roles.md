# 02 User Roles

## Role 1: Visitor / Customer
### Purpose
Starts a conversation from one of the supported channels.

### Permissions
- Send messages
- Receive automated replies
- Provide lead information
- Request human handoff

### Limits
- Cannot access backend
- Cannot edit system settings
- Cannot view internal customer records

### Multilingual Contact Point
- Sees and interacts with the language selected by the system or channel context
- May switch language if the product later exposes a language selector

## Role 2: Sales / Support Staff
### Purpose
Handles assigned conversations, follows up on leads, and assists with handoff.

### Permissions
- View assigned conversations
- Take over a chat from automation
- Read customer summary before handoff
- Update lead status
- View basic customer history

### Limits
- Cannot change global system configuration unless granted admin rights
- Cannot edit platform-wide language rules unless explicitly allowed

### Multilingual Contact Point
- May review conversation language context
- May use language-specific canned replies if enabled
- Does not define language policy

## Role 3: Administrator
### Purpose
Manages the reception system, team, content, and reporting.

### Permissions
- Edit welcome messages
- Manage FAQ and knowledge base
- Manage auto reply rules
- View all customer and conversation records
- Manage team members and assignments
- View reports
- Adjust operational settings
- Manage language strategy fields and language content structure

### Limits
- Still bound by product scope
- Cannot add unsupported channels or e-commerce integrations

### Multilingual Contact Point
- Primary role for language setup and language content maintenance
- May configure default language behavior and reserve future expansion structure

## Role 4: System
### Purpose
Automates reply, classification, notification, and escalation behavior.

### Permissions
- Read inbound messages
- Detect language context
- Apply default language rules
- Return FAQ answers
- Ask follow-up questions
- Trigger lead capture
- Trigger handoff and notifications
- Produce conversation summaries

### Limits
- Cannot invent unsupported capabilities
- Cannot override configured business rules without policy

### Multilingual Contact Point
- Core runtime actor for language detection and default language fallback
- Uses the four approved Phase 1 languages only

## Permission Boundary Notes
- Only administrators should configure language strategy and language content structure.
- Sales/support staff may interact with language-specific conversations, but not define system-wide language policy.
- Visitors only consume whatever language behavior the system exposes.
- System handles language selection logic, but only within the approved four-language scope.
