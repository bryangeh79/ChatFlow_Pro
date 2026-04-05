# Phase 11.15 FAQ Seed Registry Structure

## 1. Status

A minimal shared FAQ seed registry structure has been added.

It is structural only and does not perform matching.

## 2. Seed Shape

The seed registry uses the following minimal fields:

- `id`
- `topic`
- `question`
- `answer`
- `language?`
- `keywords?`

Registry shape:

- `version: 'seed-v1'`
- `entries: UnifiedFaqSeedEntry[]`

## 3. Current Content State

The registry exists as a shared lightweight container with a very small number of neutral seed entries.

That means:

- content structure exists
- a tiny shared seed set exists
- real match logic is not yet implemented
- the registry remains intentionally small

## 4. Resolver Relationship

The FAQ resolver skeleton can reference this registry later, but in the current phase it remains no-op and returns fixed no-match output.

## 5. Shared Baseline

Telegram and Website share the same registry shape and the same shared module.

No channel fork is introduced.

## 6. Explicit Non-Goals

This phase does not implement:

- real FAQ entries
- content loading from external sources
- matching
- scoring
- retrieval
- lead capture
- handoff
- menu / command / state systems
- webhook contract changes