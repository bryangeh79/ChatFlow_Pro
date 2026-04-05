# 04 System Flows

## Flow 1: New Visitor Enters
1. Visitor opens Website / Telegram / WhatsApp / Facebook Messenger entry point.
2. System identifies the channel source.
3. System detects or assigns a default language.
4. System loads the channel welcome configuration.
5. System sends the first welcome message.

### Multilingual handling
- If a visitor language is known, reply in that language.
- If not known, use the configured default language.
- Phase 1 only defines the decision logic, not the translation engine.

## Flow 2: Automatic Welcome
1. System sends the welcome message.
2. System may include business hours, service intro, and next-step prompt.
3. If the visitor responds, the chat stays in the same language context unless changed by configuration.

## Flow 3: FAQ / Knowledge Base Answer
1. User asks a question.
2. System tries to match FAQ or knowledge base content.
3. If a match exists, return the answer in the active language.
4. If no confident match exists, continue to follow-up or handoff.

### Multilingual handling
- Search should respect the active language first.
- If multilingual content exists, use the matching language record.
- If no language match exists, fall back to default language content when allowed.

## Flow 4: Information Collection
1. System asks for missing details.
2. Visitor provides name, phone, email, company, region, or need.
3. System stores the response into lead fields.
4. System summarizes collected information.

### Multilingual handling
- Questions and labels should use the active language.
- Collected values stay structured regardless of language.

## Flow 5: Customer Classification
1. System evaluates the conversation progress and lead completeness.
2. System assigns a classification such as new customer, normal inquiry, potential lead, high-intent lead, or follow-up needed.
3. System updates the conversation metadata.

### Multilingual handling
- Classification is language-neutral.
- User-facing labels may be localized later.

## Flow 6: Notify Sales / Admin
1. A new lead or important event is detected.
2. System determines the target recipient.
3. System sends a notification with conversation summary.
4. Staff can open the relevant conversation from the notification.

### Multilingual handling
- Notification content may reflect the conversation language or be system default.
- Summary fields should be stored in a language-aware structure.

## Flow 7: Human Handoff
1. Visitor asks for a human or system detects complexity.
2. System triggers handoff.
3. System prepares a summary for staff.
4. System assigns or queues the conversation.
5. Human staff takes over the chat.

### Multilingual handling
- Summary should preserve the original language context.
- Staff should see the detected language and fallback language if relevant.

## Flow 8: Pending Message / Leave a Message
1. If no staff is available or the issue cannot be resolved immediately, the system invites the visitor to leave a message.
2. System stores the pending request.
3. System notifies the team later.
4. Staff replies when available.

### Multilingual handling
- Leave-a-message prompt must follow the active or default language.
- Stored pending messages should keep their language metadata.

## Flow Summary
The core system flow is:
Channel entry -> language decision -> welcome -> answer or ask -> collect lead data -> classify -> notify -> handoff if needed -> store outcome.
