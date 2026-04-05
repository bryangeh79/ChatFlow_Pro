# 19 Minimal Collaboration Flow

## Goal
Create the smallest collaboration layer for ChatFlow Pro so a conversation can be owned, manually assigned, handed off to a human, and summarized for the next handler.

## Conversation Owner
- The owner is the staff member currently responsible for a conversation.
- A conversation may have zero or one current owner at a time.
- Owner changes only through manual assignment or handoff flow in this phase.

## Manual Assignment Rules
- Assignment is manual.
- A conversation can be assigned to a selected team member.
- Assignment updates the conversation owner.
- No automatic distribution logic is included in this phase.

## Human Handoff Triggers
- User explicitly requests a human.
- System marks the conversation for handoff using a placeholder rule.

## Conversation Status After Handoff
- Conversation should move into a handoff or pending state.
- The conversation remains trackable for follow-up.
- The previous automation context is preserved in a summary.

## In Scope
- conversation owner
- manual assignment
- human handoff
- handoff summary

## Out of Scope
- automatic assignment algorithms
- complex role and permission systems
- full collaboration dashboard
- notification delivery system internals
- CRM / ERP / sales pipeline features
