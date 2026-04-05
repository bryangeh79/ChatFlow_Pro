# Risks and Issues

## Existing Risks
- Do not mistake the current minimal real webhook entrypoints for a fully completed product.
- Do not expand into menu / command / state systems just because the webhook baselines are now alive.
- Do not let channel-specific changes pollute shared core behavior without a hard reason.
- Continue protecting the **seven-route baseline**: All 7 channels must remain independently verifiable and non-breaking.
- The current version is **Pro_v1.07.38** (package.json **1.7.38**; Phase **17.2** + **17.1** + Docker / **docs/155**; **158** 单通道 Telegram 交付收口清单). Truth → **`memory/01_project_status.md`**.
- The biggest recurring error to avoid is confusing stable minimal entrypoints with full platform completion.
- Regression risk remains live whenever shared contracts or routing paths are touched.
- **Pause Status**: **Not blocked** — default gate **T0 build + T1 `docker-smoke`** (incl. `smoke:webhooks` + `verify:lead-capture-states`); read-only agent env → **docs/155** *T1 equivalence* + **`npm run report:github-ci`**. No public staging URL does **not** block dev; **docs/157** Phase 0 waits on **HTTPS** staging.

## New Risks from Phase 11.40 Lead Capture Implementation
- **Field extraction accuracy**: Simple regex-based extraction may have false positives/negatives
- **Intent detection limitations**: Keyword-based detection may miss nuanced contact requests
- **Session state persistence**: Lead capture state is stored in session but not persisted to database
- **Validation gaps**: No validation of email format, phone number format, or name sanity
- **Performance impact**: Additional processing in pipeline could affect response time (minimal)

## New Risks from Phase 11.41
- **Cross-turn state management**: Session must be passed correctly between turns for merging to work
- **Outbound prompt consistency**: lead_capture_prompt logic must not interfere with other response flows
- **FAQ priority enforcement**: Captured confirmation must only show when FAQ truly misses

## New Risks from Phase 11.42
- **File system permissions**: data/ directory may not be writable in some deployments
- **Disk space**: Unbounded JSONL growth without rotation/cleanup
- **Concurrent writes**: Multiple webhook instances could cause file corruption (append-only mitigates)
- **Data security**: Plain-text JSONL files contain contact info (git-ignore helps)

## New Risks from Phase 11.43
- **Memory growth**: In-memory Map grows unbounded without session expiration
- **Restart loss**: All session state lost on process restart
- **Single-process limitation**: No multi-instance coordination (sticky sessions required)
- **Concurrency races**: Last-writer-wins with concurrent requests to same session
- **No persistence**: Pure runtime state (complements but doesn't replace file persistence)

## New Risks from Phase 11.44
- **Prompt formatting**: Double newline (`\n\n`) may not render well on all platforms
- **Message length**: Combined text (original + prompt) could exceed channel limits
- **Localization**: Prompts still English-only (needs four-language support)
- **Edge cases**: Empty replyText with prompt (currently not merged)

## New Risks from Phase 11.45
- **Translation quality**: Machine-translated strings may need human review
- **Field name mapping**: Field translations (phone→电话) may not cover all variations
- **Language detection**: Relies on session.current_language which may be inaccurate
- **Fallback chains**: English fallback may not be appropriate for all regions

## New Risks from Phase 11.46
- **FAQ over-matching**: With gate removed, FAQ may match too aggressively
- **Intent placeholder**: Real intent dispatch needed for proper FAQ gating
- **Seed content quality**: Current FAQ seeds are placeholder English-only

## Pro_v1.06 Known Limitations
- **Session store**: In-memory only, single-process, no TTL expiration
- **JSONL persistence**: Backup accumulation, no automatic cleanup
- **Field extraction**: Regex-based, limited validation (edge cases)
- **FAQ content**: Placeholder seeds, English-only, minimal coverage
- **Intent dispatch**: Placeholder only, no real classification
- **Concurrency**: Single-writer JSONL, session store last-writer-wins

## Mitigation Status (Pro_v1.06)
- ✅ Dual webhook baseline verified intact after changes
- ✅ Compilation passes (npm run build successful)
- ✅ Minimal scope maintained (no state machine, no assignment logic, no handoff integration)
- ✅ Shared pipeline integration (Telegram & Website use same logic)
- ✅ Cross-turn merging tested and working (now across requests!)
- ✅ Evidence alignment verified (session ↔ debug_metadata)
- ✅ Outbound logic tested (partial prompts, captured confirmation)
- ✅ Captured persistence implemented (file-based, failure-safe)
- ✅ Git-ignore prevents real leads in repository
- ✅ In-memory session store enables cross-request continuity (1000 cap)
- ✅ User-visible prompt merge implemented and tested
- ✅ Four-language i18n implemented (zh/en/vi/ms-MY)
- ✅ Empty-reply fallback implemented
- ✅ FAQ matching restored (gate fixed)
- ✅ JSONL rotation implemented (5MB/10k lines)
- ⚠️ Field extraction needs improvement for edge cases
- ⚠️ Session TTL expiration not implemented
- ⚠️ Backup cleanup not implemented
- ⚠️ No validation of extracted/persisted data
- ⚠️ Prompt formatting may need channel-specific adjustments
- ⚠️ i18n translations may need refinement
- ⚠️ FAQ seeds need real content and multilingual support
