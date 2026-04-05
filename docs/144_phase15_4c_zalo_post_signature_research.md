# Phase 15.4c — Zalo POST signature research

## Research Findings

Based on Zalo Open API / OA Webhook documentation review:

### Zalo Webhook Security Mechanisms

1. **IP Whitelisting** (Primary):
   - Zalo OA webhook requires configuring server IP addresses in the Zalo OA Console
   - Incoming webhook requests are only accepted from Zalo's known IP ranges
   - This is the standard production security mechanism

2. **OAuth 2.0 Access Tokens**:
   - API calls from server to Zalo require valid access tokens
   - Webhook inbound verification does not use signature headers
   - Authentication is handled at the network/IP level

3. **No Standard POST Body Signature Header**:
   - Unlike Meta (`X-Hub-Signature-256`) or Line (`X-Line-Signature`)
   - Zalo does not provide a documented HMAC signature header for webhook payloads
   - No `X-Zalo-Signature` or equivalent header in official documentation

### Official Documentation References

- **Zalo OA Developer Documentation**: Webhook setup focuses on IP whitelisting
- **Zalo Open API Security Guide**: Emphasizes OAuth 2.0 for outbound API calls
- **No documented signature algorithm** for verifying incoming webhook payload integrity

## Decision

**Do not implement pseudo‑signature validation for Zalo**:

### Reasons
1. **No Official Standard**: Implementing a custom/non‑standard signature would create false security expectations
2. **IP‑Based Security**: Zalo's primary security mechanism is IP whitelisting, which is already a production‑grade control
3. **Risk of Incompatibility**: Custom signature implementation could break future Zalo API changes
4. **Maintenance Burden**: Would require custom key management without official support

### Implementation Status
- **Code**: No `src/config/zalo‑webhook.ts` created
- **Server**: `POST /webhooks/zalo` remains unchanged (no signature validation)
- **Environment**: No Zalo‑specific signature env variables added to `.env.example`
- **Security**: Relies on production IP whitelisting as per Zalo's documented best practices

## Alternative Security Measures

For production Zalo deployments:

1. **Configure IP Whitelisting** in Zalo OA Console
2. **Use HTTPS** for webhook endpoints
3. **Monitor Zalo's IP Ranges** for changes
4. **Implement Application‑Layer Validation** of critical business data

## Version Impact

- **Pro_v1.07.6** (`package.json` 1.7.6) – Version bump reflects research completion
- **Build**: `npm run build` successful (no code changes)
- **Memory**: Updated to reflect Zalo signature status

## Remaining POST Signature Debt

- **Zalo**: No signature implementation (per research findings) – **待官方机制再立项**
- **Website**: Custom `X‑Webhook‑Signature` – **Phase 15.4d** (需要先写设计文档)

## Future Considerations

If Zalo introduces official signature validation in future API versions:

1. Create `src/config/zalo‑webhook.ts` with official algorithm
2. Add env variable (e.g., `ZALO_WEBHOOK_SECRET`)
3. Implement verification in `src/server.ts`
4. Update `.env.example` and documentation

Until then, rely on Zalo's documented IP‑based security model.
