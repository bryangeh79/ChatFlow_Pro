import type { UnifiedSessionContext } from '../../../shared/types/unified-session-context';
import {
  getHandoffAssignMode,
  getHandoffAutoAssignOwner,
  getHandoffOwnerPool,
  getHandoffTagMap,
  getHandoffAgentStatus,
  getHandoffBalanceStrategy,
  type AssignMode,
  type BalanceStrategy,
} from '../../config/handoff-assign';
import { assignmentTracker } from './assignment-tracker';

export interface AssignmentResult {
  assigned_owner_id: string | null;
  assign_mode: AssignMode;
  assign_reason: 'single' | 'round_robin' | 'by_tag' | 'fallback' | 'fallback_no_online' | 'tag_offline_fallback' | 'none';
  online_agents?: string[];
  balance_strategy?: BalanceStrategy;
}

/**
 * Filter online agents from a list based on agent status configuration
 */
function filterOnlineAgents(agentIds: string[]): string[] {
  const agentStatus = getHandoffAgentStatus();
  if (agentStatus.size === 0) {
    return agentIds; // No status config, all agents considered online
  }
  
  return agentIds.filter(agentId => {
    const status = agentStatus.get(agentId);
    return status === 'on' || status === undefined; // Undefined means not in status config
  });
}

/**
 * Get available online agents based on mode and configuration
 */
function getAvailableOnlineAgents(mode: AssignMode): string[] {
  let candidateAgents: string[] = [];
  
  switch (mode) {
    case 'single': {
      const ownerId = getHandoffAutoAssignOwner();
      if (ownerId) candidateAgents = [ownerId];
      break;
    }
    
    case 'round_robin':
    case 'by_tag': {
      const pool = getHandoffOwnerPool();
      candidateAgents = pool;
      break;
    }
  }
  
  return filterOnlineAgents(candidateAgents);
}

/**
 * Select agent using balance strategy
 */
function selectAgentWithBalance(
  onlineAgents: string[],
  strategy: BalanceStrategy,
  sessionId: string
): string | null {
  if (onlineAgents.length === 0) {
    return null;
  }
  
  if (onlineAgents.length === 1) {
    return onlineAgents[0];
  }
  
  switch (strategy) {
    case 'round_robin': {
      // Stable round-robin based on session_id
      const hash = simpleStringHash(sessionId);
      const index = hash % onlineAgents.length;
      return onlineAgents[index];
    }
    
    case 'least_recent': {
      const lastAssignmentTimes = assignmentTracker.getLastAssignmentTimes();
      
      // Find agent with oldest assignment time (or never assigned)
      let selectedAgent = onlineAgents[0];
      let oldestTime = lastAssignmentTimes.get(selectedAgent) || 0;
      
      for (let i = 1; i < onlineAgents.length; i++) {
        const agent = onlineAgents[i];
        const agentTime = lastAssignmentTimes.get(agent) || 0;
        
        if (agentTime < oldestTime) {
          selectedAgent = agent;
          oldestTime = agentTime;
        }
      }
      
      return selectedAgent;
    }
  }
}

/**
 * Determine owner assignment based on session and configuration
 */
export function determineOwnerAssignment(
  session: UnifiedSessionContext,
): AssignmentResult {
  const mode = getHandoffAssignMode();
  const balanceStrategy = getHandoffBalanceStrategy();
  
  // If already assigned, don't reassign
  if (session.handoff_state.assigned_owner_id) {
    return {
      assigned_owner_id: session.handoff_state.assigned_owner_id,
      assign_mode: mode,
      assign_reason: 'none', // Already assigned
      balance_strategy: balanceStrategy,
    };
  }
  
  // If not in pending state, don't assign
  if (session.handoff_state.status !== 'pending') {
    return {
      assigned_owner_id: null,
      assign_mode: mode,
      assign_reason: 'none',
      balance_strategy: balanceStrategy,
    };
  }
  
  let assignedOwnerId: string | null = null;
  let assignReason: AssignmentResult['assign_reason'] = 'none';
  const onlineAgents = getAvailableOnlineAgents(mode);
  
  switch (mode) {
    case 'single': {
      if (onlineAgents.length > 0) {
        assignedOwnerId = onlineAgents[0]; // Single mode only has one agent
        assignReason = 'single';
      }
      break;
    }
    
    case 'round_robin': {
      if (onlineAgents.length > 0) {
        assignedOwnerId = selectAgentWithBalance(onlineAgents, balanceStrategy, session.session_id);
        assignReason = 'round_robin';
      } else {
        // No online agents, fallback to original pool
        const allAgents = getHandoffOwnerPool();
        if (allAgents.length > 0) {
          assignedOwnerId = selectAgentWithBalance(allAgents, balanceStrategy, session.session_id);
          assignReason = 'fallback_no_online';
        }
      }
      break;
    }
    
    case 'by_tag': {
      // Try tag-based assignment first
      const tagMap = getHandoffTagMap();
      const qualificationTags = session.metadata?.qualification_tags as string[] || [];
      let tagMatchedAgent: string | null = null;
      
      for (const tag of qualificationTags) {
        if (tagMap.has(tag)) {
          tagMatchedAgent = tagMap.get(tag) || null;
          break;
        }
      }
      
      if (tagMatchedAgent) {
        // Check if tag-matched agent is online
        const isOnline = filterOnlineAgents([tagMatchedAgent]).length > 0;
        
        if (isOnline) {
          assignedOwnerId = tagMatchedAgent;
          assignReason = 'by_tag';
        } else {
          // Tag-matched agent is offline, fallback to online pool
          if (onlineAgents.length > 0) {
            assignedOwnerId = selectAgentWithBalance(onlineAgents, balanceStrategy, session.session_id);
            assignReason = 'tag_offline_fallback';
          } else {
            // No online agents at all
            assignReason = 'fallback_no_online';
          }
        }
      } else {
        // No tag match, fallback to single mode or pool
        if (onlineAgents.length > 0) {
          assignedOwnerId = selectAgentWithBalance(onlineAgents, balanceStrategy, session.session_id);
          assignReason = 'fallback';
        } else {
          // No online agents, try original single owner
          const fallbackOwner = getHandoffAutoAssignOwner();
          if (fallbackOwner) {
            assignedOwnerId = fallbackOwner;
            assignReason = 'fallback_no_online';
          }
        }
      }
      break;
    }
  }
  
  // Record assignment if one was made
  if (assignedOwnerId) {
    assignmentTracker.recordAssignment(assignedOwnerId, session.session_id);
  }
  
  return {
    assigned_owner_id: assignedOwnerId,
    assign_mode: mode,
    assign_reason: assignReason,
    online_agents: onlineAgents,
    balance_strategy: balanceStrategy,
  };
}

/**
 * Simple string hash function for stable round-robin assignment
 */
function simpleStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}