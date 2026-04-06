/**
 * Handoff auto-assignment configuration
 */

export type AssignMode = 'single' | 'round_robin' | 'by_tag';
export type BalanceStrategy = 'least_recent' | 'round_robin';

/**
 * Get the assignment mode from environment variable
 * Defaults to 'single' if not configured or invalid
 */
export function getHandoffAssignMode(): AssignMode {
  const value = process.env.CHATFLOW_HANDOFF_ASSIGN_MODE;
  if (value === 'round_robin' || value === 'by_tag') {
    return value;
  }
  return 'single'; // default
}

/**
 * Get the single owner ID from environment variable
 * Returns null if not configured or empty
 */
export function getHandoffAutoAssignOwner(): string | null {
  const value = process.env.CHATFLOW_HANDOFF_AUTO_ASSIGN_OWNER;
  return value?.trim() || null;
}

/**
 * Get the owner pool for round-robin assignment
 * Returns array of owner IDs, or empty array if not configured
 */
export function getHandoffOwnerPool(): string[] {
  const value = process.env.CHATFLOW_HANDOFF_OWNER_POOL;
  if (!value?.trim()) {
    return [];
  }
  return value.split(',').map(id => id.trim()).filter(id => id.length > 0);
}

/**
 * Parse tag mapping for by_tag assignment mode
 * Format: "tag1:owner1,tag2:owner2"
 * Returns Map<tag, owner>
 */
export function getHandoffTagMap(): Map<string, string> {
  const value = process.env.CHATFLOW_HANDOFF_TAG_MAP;
  const map = new Map<string, string>();
  
  if (!value?.trim()) {
    return map;
  }
  
  const pairs = value.split(',').map(pair => pair.trim()).filter(pair => pair.length > 0);
  
  for (const pair of pairs) {
    const [tag, owner] = pair.split(':').map(part => part.trim());
    if (tag && owner) {
      map.set(tag, owner);
    }
  }
  
  return map;
}

/**
 * Parse agent status from environment variable
 * Format: "alice:on,bob:off,charlie:on"
 * Returns Map<agent_id, 'on'|'off'>
 */
export function getHandoffAgentStatus(): Map<string, 'on' | 'off'> {
  const value = process.env.CHATFLOW_HANDOFF_AGENT_STATUS;
  const map = new Map<string, 'on' | 'off'>();
  
  if (!value?.trim()) {
    return map;
  }
  
  const pairs = value.split(',').map(pair => pair.trim()).filter(pair => pair.length > 0);
  
  for (const pair of pairs) {
    const [agentId, status] = pair.split(':').map(part => part.trim());
    if (agentId && (status === 'on' || status === 'off')) {
      map.set(agentId, status);
    }
  }
  
  return map;
}

/**
 * Get sticky TTL minutes from environment variable
 * Default: 120 minutes
 */
export function getHandoffStickyTtlMinutes(): number {
  const value = process.env.CHATFLOW_HANDOFF_ASSIGN_STICKY_TTL_MIN;
  const parsed = parseInt(value || '', 10);
  return isNaN(parsed) || parsed <= 0 ? 120 : parsed;
}

/**
 * Get balance strategy from environment variable
 * Default: 'least_recent'
 */
export function getHandoffBalanceStrategy(): BalanceStrategy {
  const value = process.env.CHATFLOW_HANDOFF_ASSIGN_BALANCE;
  return value === 'round_robin' ? 'round_robin' : 'least_recent';
}

/**
 * Check if auto-assignment is enabled
 */
export function isHandoffAutoAssignEnabled(): boolean {
  const mode = getHandoffAssignMode();
  if (mode === 'single') {
    return !!getHandoffAutoAssignOwner();
  } else if (mode === 'round_robin') {
    return getHandoffOwnerPool().length > 0;
  } else if (mode === 'by_tag') {
    return getHandoffTagMap().size > 0 || !!getHandoffAutoAssignOwner();
  }
  return false;
}