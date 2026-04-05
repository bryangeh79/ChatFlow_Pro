import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';

/**
 * 进程内 Session 存储（单例 Map）
 * 注意：重启丢失，单进程，不支持多实例
 */
class InMemorySessionStore {
  private sessions: Map<string, UnifiedSessionContext> = new Map();
  
  // 配置常量
  private readonly MAX_SESSIONS = 1000; // 最多存储 1000 个 session
  private readonly SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时 TTL

  /**
   * 获取 session（如果存在）
   */
  get(sessionId: string): UnifiedSessionContext | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      // 检查是否过期
      if (this.isSessionExpired(session)) {
        this.sessions.delete(sessionId);
        return undefined;
      }
    }
    return session;
  }

  /**
   * 创建或更新 session，应用上限淘汰
   */
  set(session: UnifiedSessionContext): void {
    // 先清理过期 session（惰性清理）
    this.cleanupExpiredSessions();
    
    // 应用上限淘汰（FIFO 风格）
    if (this.sessions.size >= this.MAX_SESSIONS && !this.sessions.has(session.session_id)) {
      this.evictOldestSession();
    }
    
    this.sessions.set(session.session_id, session);
  }

  /**
   * 检查 session 是否过期
   */
  private isSessionExpired(session: UnifiedSessionContext): boolean {
    const now = Date.now();
    const lastSeen = new Date(session.last_seen_at).getTime();
    return now - lastSeen > this.SESSION_TTL_MS;
  }

  /**
   * 清理所有过期 session
   */
  private cleanupExpiredSessions(): void {
    const expiredKeys: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        expiredKeys.push(sessionId);
      }
    }
    
    // 批量删除过期 session
    for (const sessionId of expiredKeys) {
      this.sessions.delete(sessionId);
    }
    
    // 可选：开发环境日志
    if (process.env.NODE_ENV === 'development' && expiredKeys.length > 0) {
      console.debug(`[SessionStore] Cleaned up ${expiredKeys.length} expired sessions`);
    }
  }

  /**
   * 淘汰最旧的 session（FIFO）
   */
  private evictOldestSession(): void {
    // 简单实现：删除第一个条目（Map 保持插入顺序）
    const firstKey = this.sessions.keys().next().value;
    if (firstKey) {
      this.sessions.delete(firstKey);
    }
  }

  /**
   * 删除 session（可选清理）
   */
  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * 获取所有 session 数量（调试用）
   */
  size(): number {
    return this.sessions.size;
  }

  /**
   * 获取配置的最大 session 数
   */
  getMaxSessions(): number {
    return this.MAX_SESSIONS;
  }

  /**
   * 清理所有 session（调试/测试用）
   */
  clear(): void {
    this.sessions.clear();
  }
}

// 模块级单例
export const sessionStore = new InMemorySessionStore();