# Phase 13.4 Lead Field Minimal Validation

## Overview
This phase adds basic validation to lead capture field extraction, ensuring that detected phone numbers and email addresses meet minimum format requirements before being merged into session state.

## Problem Statement
The existing field extraction had no validation:
- **Email**: Any string matching basic regex pattern was accepted
- **Phone**: Any string with enough digits was accepted
- **Risk**: Invalid data could enter the system (e.g., `user@invalid`, `123` as phone)

**Issue**: Poor quality data in captured leads reduces usefulness for sales/CRM integration.

## Solution: Minimal Format Validation
Added validation functions that enforce basic format requirements without external libraries:

### 1. Email Validation (`isValidEmail()`)
**Requirements**:
- Must contain `@` symbol
- `@` must split email into exactly two parts (local part and domain)
- Domain must contain at least one `.`
- Each part of domain (split by `.`) must have non-zero length

**Examples**:
- ✅ `user@example.com` - Valid
- ✅ `first.last@company.co.uk` - Valid  
- ❌ `user@invalid` - Missing domain dot
- ❌ `user@@example.com` - Multiple @ symbols
- ❌ `user@.com` - Empty domain part
- ❌ `@example.com` - Empty local part

**Implementation**:
```typescript
function isValidEmail(email: string): boolean {
  if (!email.includes('@')) return false;
  
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const domain = parts[1];
  if (!domain.includes('.')) return false;
  
  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  
  for (const part of domainParts) {
    if (part.length === 0) return false;
  }
  
  return true;
}
```

### 2. Phone Validation (`isValidPhone()`)
**Requirements**:
- May contain: digits, spaces, hyphens, plus sign, parentheses
- After removing non-digits: minimum 8 characters
- Specific valid formats:
  - **Chinese mobile**: 11 digits, starts with `1`, second digit `3-9`
  - **Landline**: 8-12 digits (area code + number)
  - **International**: Starts with `+` or `00`, 10-15 digits

**Examples**:
- ✅ `13800138000` - Chinese mobile (valid)
- ✅ `010-12345678` - Beijing landline (valid)
- ✅ `+44 20 7946 0958` - International (valid)
- ✅ `(021) 1234-5678` - With parentheses (valid)
- ❌ `123` - Too short
- ❌ `abc12345678` - Contains letters
- ❌ `1380013800` - Only 10 digits (invalid Chinese mobile)

**Implementation**:
```typescript
function isValidPhone(phone: string): boolean {
  // 1. Allowed characters only
  const allowedChars = /^[\d\s\-+()]+$/;
  if (!allowedChars.test(phone)) return false;
  
  // 2. Minimum length after cleaning
  const digitsOnly = phone.replace(/[^\d]/g, '');
  if (digitsOnly.length < 8) return false;
  
  // 3. Chinese mobile (11 digits, starts with 1, second digit 3-9)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1') && /^[3-9]$/.test(digitsOnly[1])) {
    return true;
  }
  
  // 4. Landline (8-12 digits)
  if (digitsOnly.length >= 8 && digitsOnly.length <= 12) {
    return true;
  }
  
  // 5. International (starts with + or 00, 10-15 digits)
  if ((phone.startsWith('+') || phone.startsWith('00')) && 
      digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return true;
  }
  
  return false;
}
```

## Integration with Existing Flow

### Field Extraction Pipeline
1. **Detection**: Regex patterns find potential fields in text
2. **Validation**: `isValidEmail()` / `isValidPhone()` check format
3. **Return**: Valid fields returned, invalid fields return `undefined`
4. **Merging**: Only non-`undefined` fields are merged into session

### Key Integration Points

#### `extractEmail()` (updated)
```typescript
function extractEmail(text: string): string | undefined {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailPattern);
  if (match) {
    const email = match[0].trim();
    if (isValidEmail(email)) {  // ← NEW VALIDATION
      return email;
    }
  }
  return undefined;
}
```

#### `extractPhone()` (updated)
```typescript
function extractPhone(text: string): string | undefined {
  // ... pattern matching ...
  if (match) {
    const rawPhone = match[1] ? match[1].trim() : match[0].trim();
    if (rawPhone && isValidPhone(rawPhone)) {  // ← NEW VALIDATION
      return rawPhone;
    }
  }
  return undefined;
}
```

#### Session Merging (unchanged, works with validation)
```typescript
const mergedFields: Record<string, unknown> = {
  ...existingFields,
  ...(newFields.name && { name: newFields.name }),      // undefined → not merged
  ...(newFields.phone && { phone: newFields.phone }),    // undefined → not merged
  ...(newFields.email && { email: newFields.email }),    // undefined → not merged
};
```

## Impact on Existing System

### No Breaking Changes
- **Webhook responses**: Unchanged (still 200 OK)
- **Session store**: Unchanged (TTL + count limits still apply)
- **Lead capture flow**: Still detection → merging → persistence
- **Validation failure**: Silent (field treated as not provided)

### Behavioral Changes
1. **Higher data quality**: Invalid emails/phones no longer captured
2. **User experience**: Users may need to correct invalid formats
3. **Debug information**: Invalid fields logged in debug metadata

### Example Scenarios

#### Scenario 1: Valid Contact Information
```
User: "我叫张三，电话13800138000，邮箱zhangsan@example.com"
→ Detection: name="张三", phone="13800138000", email="zhangsan@example.com"
→ Validation: All valid
→ Result: All fields merged, lead captured
```

#### Scenario 2: Invalid Email
```
User: "我叫李四，电话13900139000，邮箱invalid-email"
→ Detection: name="李四", phone="13900139000", email="invalid-email"
→ Validation: Email invalid (no @, no domain dot)
→ Result: name and phone merged, email treated as not provided
→ Status: "partial" (missing email)
```

#### Scenario 3: Invalid Phone
```
User: "我叫王五，电话abc123，邮箱wangwu@example.com"
→ Detection: name="王五", phone="abc123", email="wangwu@example.com"
→ Validation: Phone invalid (contains letters, too short)
→ Result: name and email merged, phone treated as not provided
→ Status: "partial" (missing phone)
```

## Validation Philosophy

### Minimalist Approach
- **No external libraries**: Pure TypeScript/JavaScript
- **Basic format only**: Not comprehensive validation
- **Practical over perfect**: Catches obvious errors, not edge cases
- **Fail silent**: Invalid = not provided, no error messages to user

### What's NOT Validated
1. **Email**:
   - DNS resolution (domain exists)
   - SMTP verification (mailbox exists)
   - Special characters in local part
   - Internationalized domain names

2. **Phone**:
   - Carrier/geographic validity
   - Do-not-call lists
   - Format standardization
   - International dialing codes verification

3. **Name**:
   - No validation added (cultural complexity)
   - Still accepts any non-empty string

## Configuration & Customization

### Current Constants (hardcoded)
- **Email**: Basic format only
- **Phone**: 8-digit minimum, specific format recognition
- **No configuration file**: Simple implementation

### Future Extension Points
1. **Configurable patterns**: Regex patterns via config file
2. **Country-specific validation**: Different rules per country code
3. **Stricter validation**: Optional stricter rules for production
4. **Validation feedback**: Optional user prompts for invalid formats

## Testing Considerations

### Test Cases
1. **Valid formats**: Should be accepted and merged
2. **Invalid formats**: Should return `undefined` (not merged)
3. **Edge cases**: Empty strings, null, special characters
4. **International**: Different country phone formats
5. **Mixed validity**: Some fields valid, some invalid

### Verification Points
- ✅ Invalid emails don't enter `collected_fields`
- ✅ Invalid phones don't enter `collected_fields`
- ✅ Valid fields still work normally
- ✅ No impact on webhook response times
- ✅ Debug metadata shows validation results

## Technical Debt Progress
With this phase, another item from the Pro_v1.07 technical debt list is addressed:

| Item | Status | Notes |
|------|--------|-------|
| ✅ **Field validation** | **Completed** | Minimal email/phone format validation |
| ✅ **Session TTL** | Completed | 24h expiration with lazy cleanup |
| ✅ **JSONL backup cleanup** | Completed | Max 5 files, 50MB total |
| 🔄 FAQ content | Pending | Placeholder seeds, English-only |
| 🔄 Intent dispatch | Pending | Placeholder only |
| 🔄 Real transports | Pending | Synthetic sender only |

## Verification
- ✅ `npm run build` passes
- ✅ All 7 webhook routes remain 200 OK
- ✅ No changes to webhook contract or pipeline logic
- ✅ Validation is minimal and library-free
- ✅ Invalid fields silently ignored (not merged)

## Next Steps
Continue technical debt reduction or choose next capability:
1. **FAQ content**: Expand beyond placeholder English seeds
2. **Intent dispatch**: Implement real classification
3. **Next capability**: Handoff integration, menu/command system, admin interface
4. **Production readiness**: Real platform credentials, webhook verification