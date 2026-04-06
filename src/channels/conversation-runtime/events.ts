import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';

export type ConversationEventType =
  | 'LeadCaptured'
  | 'HandoffPending'
  | 'PhaseTransition'
  | 'QualificationTagsUpdated';

export interface ConversationEvent {
  type: ConversationEventType;
  session: UnifiedSessionContext;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface LeadCapturedEvent extends ConversationEvent {
  type: 'LeadCaptured';
  capturedFields: Record<string, string>;
  qualificationTags: string[];
}

export interface HandoffPendingEvent extends ConversationEvent {
  type: 'HandoffPending';
  reason?: string;
}

export interface PhaseTransitionEvent extends ConversationEvent {
  type: 'PhaseTransition';
  fromPhase: string;
  toPhase: string;
  reason?: string;
}

export interface QualificationTagsUpdatedEvent extends ConversationEvent {
  type: 'QualificationTagsUpdated';
  tags: string[];
  previousTags: string[];
}

// 简单的事件发射器（进程内，最小实现）
type EventListener = (event: ConversationEvent) => void;

class ConversationEventEmitter {
  private listeners: Map<ConversationEventType, EventListener[]> = new Map();

  on(eventType: ConversationEventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  off(eventType: ConversationEventType, listener: EventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: ConversationEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          // 避免一个监听器出错影响其他监听器
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      }
    }
  }
}

// 全局事件发射器实例
export const conversationEvents = new ConversationEventEmitter();

// 辅助函数：发射LeadCaptured事件
export function emitLeadCaptured(
  session: UnifiedSessionContext,
  capturedFields: Record<string, string>,
  qualificationTags: string[]
): void {
  const event: LeadCapturedEvent = {
    type: 'LeadCaptured',
    session,
    timestamp: Date.now(),
    capturedFields,
    qualificationTags
  };
  conversationEvents.emit(event);
}

// 辅助函数：发射HandoffPending事件
export function emitHandoffPending(
  session: UnifiedSessionContext,
  reason?: string
): void {
  const event: HandoffPendingEvent = {
    type: 'HandoffPending',
    session,
    timestamp: Date.now(),
    reason
  };
  conversationEvents.emit(event);
}

// 辅助函数：发射PhaseTransition事件
export function emitPhaseTransition(
  session: UnifiedSessionContext,
  fromPhase: string,
  toPhase: string,
  reason?: string
): void {
  const event: PhaseTransitionEvent = {
    type: 'PhaseTransition',
    session,
    timestamp: Date.now(),
    fromPhase,
    toPhase,
    reason
  };
  conversationEvents.emit(event);
}

// 辅助函数：发射QualificationTagsUpdated事件
export function emitQualificationTagsUpdated(
  session: UnifiedSessionContext,
  tags: string[],
  previousTags: string[]
): void {
  const event: QualificationTagsUpdatedEvent = {
    type: 'QualificationTagsUpdated',
    session,
    timestamp: Date.now(),
    tags,
    previousTags
  };
  conversationEvents.emit(event);
}