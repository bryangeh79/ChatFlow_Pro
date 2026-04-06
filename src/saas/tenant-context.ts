import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantRequestContext {
  tenantId: string;
  tenantSlug: string;
}

const storage = new AsyncLocalStorage<TenantRequestContext>();

export function runWithTenantContext<T>(
  ctx: TenantRequestContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return storage.run(ctx, fn);
}

export function getTenantRequestContext(): TenantRequestContext | undefined {
  return storage.getStore();
}

export function getTenantIdOrNull(): string | null {
  return storage.getStore()?.tenantId ?? null;
}
