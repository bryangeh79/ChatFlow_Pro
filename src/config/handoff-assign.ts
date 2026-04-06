/**
 * Handoff auto-assignment configuration
 */

export type AssignMode = 'single' | 'round_robin' | 'by_tag';
export type BalanceStrategy = 'least_recent' | 'round_robin';

/**
 * Runtime configuration overlay from JSON file
 * Only whitelisted keys are allowed
 */
interface HandoffRuntimeConfig {
  assign_mode?: AssignMode;
  auto_assign_owner?: string;
  owner_pool?: string[] | string;
  tag_map?: Record<string, string> | string;
  agent_status?: Record<string, 'on' | 'off'> | string;
  assign_balance?: BalanceStrategy;
  assign_sticky_ttl_min?: number;
}

// In-memory overlay from JSON file
let runtimeConfigOverlay: Partial<HandoffRuntimeConfig> = {};
let configFilePath: string | null = null;

/**
 * Initialize runtime config from environment variable
 * Called once at startup
 */
export function initHandoffRuntimeConfig(): void {
  const path = process.env.CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH;
  if (!path?.trim()) {
    // No runtime config path configured, keep default behavior
    return;
  }
  
  configFilePath = path.trim();
  console.log(`[handoff-config] Runtime config path: ${configFilePath}`);
  
  try {
    loadRuntimeConfig();
    console.log('[handoff-config] Initial runtime config loaded');
    
    // Setup SIGHUP handler for Unix systems
    if (process.platform !== 'win32') {
      process.on('SIGHUP', () => {
        console.log('[handoff-config] Received SIGHUP, reloading runtime config');
        try {
          loadRuntimeConfig();
          console.log('[handoff-config] Runtime config reloaded');
        } catch (err) {
          console.error('[handoff-config] Failed to reload runtime config:', err);
        }
      });
      console.log('[handoff-config] SIGHUP handler registered (Unix)');
    } else {
      console.log('[handoff-config] Windows detected: SIGHUP not available, restart process to reload config');
    }
  } catch (err) {
    console.error('[handoff-config] Failed to load initial runtime config:', err);
    // Keep empty overlay, fallback to env only
  }
}

/**
 * Load runtime config from JSON file
 * File not found -> treat as empty overlay (no error)
 * Invalid JSON -> throw error (keep previous overlay)
 */
function loadRuntimeConfig(): void {
  if (!configFilePath) {
    return;
  }
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const fullPath = path.resolve(configFilePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`[handoff-config] Config file not found: ${fullPath}, using env only`);
      runtimeConfigOverlay = {};
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const parsed = JSON.parse(content) as HandoffRuntimeConfig;
    
    // Validate and filter whitelisted keys
    const filtered: Partial<HandoffRuntimeConfig> = {};
    const allowedKeys = new Set([
      'assign_mode', 'auto_assign_owner', 'owner_pool', 'tag_map',
      'agent_status', 'assign_balance', 'assign_sticky_ttl_min'
    ]);
    
    for (const [key, value] of Object.entries(parsed)) {
      if (allowedKeys.has(key)) {
        (filtered as any)[key] = value;
      } else {
        console.warn(`[handoff-config] Ignoring non-whitelisted key in runtime config: ${key}`);
      }
    }
    
    runtimeConfigOverlay = filtered;
    
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // File not found is OK, treat as empty overlay
      runtimeConfigOverlay = {};
      return;
    }
    
    // JSON parse error or other serious error
    console.error(`[handoff-config] Failed to parse runtime config:`, err);
    throw err; // Let caller handle
  }
}

/**
 * Get value with priority: runtime config overlay -> environment variable
 */
function getConfigValue<T>(
  envKey: string,
  overlayKey: keyof HandoffRuntimeConfig,
  transformEnv: (value: string) => T,
  transformOverlay: (value: any) => T
): T {
  // Check runtime config overlay first
  const overlayValue = runtimeConfigOverlay[overlayKey];
  if (overlayValue !== undefined) {
    try {
      return transformOverlay(overlayValue);
    } catch (err) {
      console.warn(`[handoff-config] Invalid overlay value for ${overlayKey}:`, overlayValue, err);
      // Fall through to env
    }
  }
  
  // Fallback to environment variable
  const envValue = process.env[envKey];
  return transformEnv(envValue || '');
}

/**
 * Get the assignment mode from environment variable
 * Defaults to 'single' if not configured or invalid
 */
export function getHandoffAssignMode(): AssignMode {
  return getConfigValue(
    'CHATFLOW_HANDOFF_ASSIGN_MODE',
    'assign_mode',
    (envValue) => {
      if (envValue === 'round_robin' || envValue === 'by_tag') {
        return envValue;
      }
      return 'single'; // default
    },
    (overlayValue) => {
      if (overlayValue === 'round_robin' || overlayValue === 'by_tag' || overlayValue === 'single') {
        return overlayValue;
      }
      // Invalid value in overlay, fallback to env logic
      const envValue = process.env.CHATFLOW_HANDOFF_ASSIGN_MODE;
      if (envValue === 'round_robin' || envValue === 'by_tag') {
        return envValue;
      }
      return 'single';
    }
  );
}

/**
 * Get the single owner ID from environment variable
 * Returns null if not configured or empty
 */
export function getHandoffAutoAssignOwner(): string | null {
  return getConfigValue(
    'CHATFLOW_HANDOFF_AUTO_ASSIGN_OWNER',
    'auto_assign_owner',
    (envValue) => envValue?.trim() || null,
    (overlayValue) => {
      if (typeof overlayValue === 'string') {
        return overlayValue.trim() || null;
      }
      return null;
    }
  );
}

/**
 * Get the owner pool for round-robin assignment
 * Returns array of owner IDs, or empty array if not configured
 */
export function getHandoffOwnerPool(): string[] {
  return getConfigValue(
    'CHATFLOW_HANDOFF_OWNER_POOL',
    'owner_pool',
    (envValue) => {
      if (!envValue?.trim()) {
        return [];
      }
      return envValue.split(',').map(id => id.trim()).filter(id => id.length > 0);
    },
    (overlayValue) => {
      if (Array.isArray(overlayValue)) {
        return overlayValue.filter(id => typeof id === 'string' && id.trim().length > 0);
      } else if (typeof overlayValue === 'string') {
        return overlayValue.split(',').map(id => id.trim()).filter(id => id.length > 0);
      }
      return [];
    }
  );
}

/**
 * Parse tag mapping for by_tag assignment mode
 * Format: "tag1:owner1,tag2:owner2"
 * Returns Map<tag, owner>
 */
export function getHandoffTagMap(): Map<string, string> {
  return getConfigValue(
    'CHATFLOW_HANDOFF_TAG_MAP',
    'tag_map',
    (envValue) => {
      const map = new Map<string, string>();
      if (!envValue?.trim()) {
        return map;
      }
      
      const pairs = envValue.split(',').map(pair => pair.trim()).filter(pair => pair.length > 0);
      for (const pair of pairs) {
        const [tag, owner] = pair.split(':').map(part => part.trim());
        if (tag && owner) {
          map.set(tag, owner);
        }
      }
      return map;
    },
    (overlayValue) => {
      const map = new Map<string, string>();
      
      if (typeof overlayValue === 'string') {
        // String format: "tag1:owner1,tag2:owner2"
        const pairs = overlayValue.split(',').map(pair => pair.trim()).filter(pair => pair.length > 0);
        for (const pair of pairs) {
          const [tag, owner] = pair.split(':').map(part => part.trim());
          if (tag && owner) {
            map.set(tag, owner);
          }
        }
      } else if (overlayValue && typeof overlayValue === 'object') {
        // Object format: { "tag1": "owner1", "tag2": "owner2" }
        for (const [tag, owner] of Object.entries(overlayValue)) {
          if (typeof owner === 'string' && owner.trim()) {
            map.set(tag.trim(), owner.trim());
          }
        }
      }
      
      return map;
    }
  );
}

/**
 * Parse agent status from environment variable
 * Format: "alice:on,bob:off,charlie:on"
 * Returns Map<agent_id, 'on'|'off'>
 */
export function getHandoffAgentStatus(): Map<string, 'on' | 'off'> {
  return getConfigValue(
    'CHATFLOW_HANDOFF_AGENT_STATUS',
    'agent_status',
    (envValue) => {
      const map = new Map<string, 'on' | 'off'>();
      if (!envValue?.trim()) {
        return map;
      }
      
      const pairs = envValue.split(',').map(pair => pair.trim()).filter(pair => pair.length > 0);
      for (const pair of pairs) {
        const [agentId, status] = pair.split(':').map(part => part.trim());
        if (agentId && (status === 'on' || status === 'off')) {
          map.set(agentId, status);
        }
      }
      return map;
    },
    (overlayValue) => {
      const map = new Map<string, 'on' | 'off'>();
      
      if (typeof overlayValue === 'string') {
        // String format: "alice:on,bob:off"
        const pairs = overlayValue.split(',').map(pair => pair.trim()).filter(pair => pair.length > 0);
        for (const pair of pairs) {
          const [agentId, status] = pair.split(':').map(part => part.trim());
          if (agentId && (status === 'on' || status === 'off')) {
            map.set(agentId, status);
          }
        }
      } else if (overlayValue && typeof overlayValue === 'object') {
        // Object format: { "alice": "on", "bob": "off" }
        for (const [agentId, status] of Object.entries(overlayValue)) {
          if (typeof status === 'string' && (status === 'on' || status === 'off')) {
            map.set(agentId.trim(), status);
          }
        }
      }
      
      return map;
    }
  );
}

/**
 * Get sticky TTL minutes from environment variable
 * Default: 120 minutes
 */
export function getHandoffStickyTtlMinutes(): number {
  return getConfigValue(
    'CHATFLOW_HANDOFF_ASSIGN_STICKY_TTL_MIN',
    'assign_sticky_ttl_min',
    (envValue) => {
      const parsed = parseInt(envValue || '', 10);
      return isNaN(parsed) || parsed <= 0 ? 120 : parsed;
    },
    (overlayValue) => {
      if (typeof overlayValue === 'number') {
        return overlayValue > 0 ? overlayValue : 120;
      } else if (typeof overlayValue === 'string') {
        const parsed = parseInt(overlayValue, 10);
        return isNaN(parsed) || parsed <= 0 ? 120 : parsed;
      }
      // Fallback to env
      const envValue = process.env.CHATFLOW_HANDOFF_ASSIGN_STICKY_TTL_MIN;
      const parsed = parseInt(envValue || '', 10);
      return isNaN(parsed) || parsed <= 0 ? 120 : parsed;
    }
  );
}

/**
 * Get balance strategy from environment variable
 * Default: 'least_recent'
 */
export function getHandoffBalanceStrategy(): BalanceStrategy {
  return getConfigValue(
    'CHATFLOW_HANDOFF_ASSIGN_BALANCE',
    'assign_balance',
    (envValue) => envValue === 'round_robin' ? 'round_robin' : 'least_recent',
    (overlayValue) => {
      if (overlayValue === 'round_robin' || overlayValue === 'least_recent') {
        return overlayValue;
      }
      // Fallback to env
      const envValue = process.env.CHATFLOW_HANDOFF_ASSIGN_BALANCE;
      return envValue === 'round_robin' ? 'round_robin' : 'least_recent';
    }
  );
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