# 09 Data Model Draft

## Core Objects

### 1) User / Visitor
Represents a person interacting with the system.

#### Minimum MVP Fields
- `id`
- `displayName`
- `phone`
- `email`
- `companyName`
- `region`
- `preferredLanguage`
- `sourceChannel`
- `createdAt`
- `updatedAt`

#### Notes
- A visitor may become a lead or be associated with a conversation.
- The same person may interact across channels.

### 2) Conversation
Represents a chat thread.

#### Minimum MVP Fields
- `id`
- `visitorId`
- `channel`
- `status`
- `assignedMemberId`
- `languageCode`
- `lastMessageAt`
- `handoffState`
- `createdAt`
- `updatedAt`

#### Notes
- One visitor can have many conversations.
- One conversation can contain many messages.

### 3) Message
Represents an inbound or outbound chat message.

#### Minimum MVP Fields
- `id`
- `conversationId`
- `senderType`
- `content`
- `contentType`
- `languageCode`
- `channelMessageId`
- `createdAt`

#### Notes
- Sender type can be visitor, system, or staff.
- Messages should preserve original language metadata.

### 4) Lead
Represents captured inquiry information.

#### Minimum MVP Fields
- `id`
- `visitorId`
- `conversationId`
- `name`
- `phone`
- `email`
- `companyName`
- `region`
- `needSummary`
- `qualificationStatus`
- `priorityLevel`
- `ownerMemberId`
- `createdAt`
- `updatedAt`

#### Notes
- Lead may be created from one or more messages.

### 5) Team Member
Represents staff using the system.

#### Minimum MVP Fields
- `id`
- `name`
- `email`
- `role`
- `status`
- `languagePreference`
- `createdAt`
- `updatedAt`

### 6) Assignment
Represents ownership of a conversation or lead.

#### Minimum MVP Fields
- `id`
- `conversationId`
- `leadId`
- `memberId`
- `assignedBy`
- `assignedAt`
- `assignmentType`
- `status`

### 7) FAQ / Knowledge Item
Represents an answerable content record.

#### Minimum MVP Fields
- `id`
- `title`
- `question`
- `answer`
- `category`
- `tags`
- `languageCode`
- `sourceType`
- `isActive`
- `createdAt`
- `updatedAt`

#### Notes
- Content should be language-aware.
- One logical FAQ can have multiple language variants.

### 8) Handoff
Represents escalation from automation to human support.

#### Minimum MVP Fields
- `id`
- `conversationId`
- `triggerReason`
- `summary`
- `status`
- `assignedMemberId`
- `createdAt`
- `updatedAt`

### 9) Pending Message / Leave Message
Represents a user message waiting for human follow-up.

#### Minimum MVP Fields
- `id`
- `conversationId`
- `visitorId`
- `content`
- `contactMethod`
- `status`
- `languageCode`
- `createdAt`

### 10) Notification
Represents alerts to staff/admin.

#### Minimum MVP Fields
- `id`
- `type`
- `recipientMemberId`
- `conversationId`
- `leadId`
- `title`
- `body`
- `status`
- `createdAt`

### 11) Report Metric / Daily Stat
Represents aggregated operational counts.

#### Minimum MVP Fields
- `id`
- `date`
- `totalConversations`
- `newVisitors`
- `newLeads`
- `qualifiedLeads`
- `handoffCount`
- `topQuestionKey`
- `createdAt`

## Object Relationships
- Visitor 1:N Conversation
- Conversation 1:N Message
- Visitor 1:N Lead
- Conversation 0:1 Lead
- Conversation 0:1 Handoff
- Conversation 0:N Assignment events or 1 current assignment plus history later
- FAQ / Knowledge Item can have multiple language variants
- Notification may link to Conversation or Lead
- Report Metric aggregates many conversations and leads

## MVP Data Principles
- Store language metadata on conversation, message, FAQ, and pending message records.
- Keep channel metadata separate from core business data.
- Keep the model minimal so Phase 2 can build quickly.
- Reserve extension space for later analytics and more advanced routing.
