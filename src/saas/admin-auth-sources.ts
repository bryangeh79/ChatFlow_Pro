/**
 * Phase 24 / 1J — Auth source registry: cutline between break-glass, temporary bridges, and future product auth.
 * No secrets; metadata for docs, verify, and read-only introspection.
 */

/** Break-glass ops token vs env/DB bridges vs reserved future product sources (not wired yet). */
export type AuthSourceStability = 'break_glass' | 'bridge' | 'future';

/** Live `SaasAdminAuthContext.auth_source` values (Phase 24 1A–1I). */
export const SAAS_ADMIN_AUTH_SOURCE_IDS = [
  'break_glass_env',
  'tenant_bridge_db',
  'tenant_bridge_env',
  'tenant_readonly_bridge_env',
] as const;

export type SaasAdminAuthSource = (typeof SAAS_ADMIN_AUTH_SOURCE_IDS)[number];

export interface SaasAdminAuthSourceMetadata {
  id: SaasAdminAuthSource;
  stability: AuthSourceStability;
  /** Coarse scope label for ADR / introspection (not a runtime permission). */
  intended_scope: string;
  /** True when productized tenant auth should eventually replace this path. */
  deprecation_candidate: boolean;
}

export const SAAS_ADMIN_AUTH_SOURCE_REGISTRY: Record<SaasAdminAuthSource, SaasAdminAuthSourceMetadata> = {
  break_glass_env: {
    id: 'break_glass_env',
    stability: 'break_glass',
    intended_scope: 'platform_admin_break_glass',
    deprecation_candidate: false,
  },
  tenant_bridge_db: {
    id: 'tenant_bridge_db',
    stability: 'bridge',
    intended_scope: 'tenant_scoped_bridge_db',
    deprecation_candidate: true,
  },
  tenant_bridge_env: {
    id: 'tenant_bridge_env',
    stability: 'bridge',
    intended_scope: 'tenant_scoped_bridge_env_map',
    deprecation_candidate: true,
  },
  tenant_readonly_bridge_env: {
    id: 'tenant_readonly_bridge_env',
    stability: 'bridge',
    intended_scope: 'tenant_scoped_readonly_bridge_env_map',
    deprecation_candidate: true,
  },
};

/** Subset marked `stability: bridge` — candidates to disable after real tenant auth cutover. */
export const BRIDGE_SAAS_ADMIN_AUTH_SOURCE_IDS: readonly SaasAdminAuthSource[] =
  SAAS_ADMIN_AUTH_SOURCE_IDS.filter((id) => SAAS_ADMIN_AUTH_SOURCE_REGISTRY[id].stability === 'bridge');
