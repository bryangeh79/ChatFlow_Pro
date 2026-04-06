/**
 * In-memory assignment tracker for load balancing
 */

interface AssignmentRecord {
  owner_id: string;
  assigned_at: number; // timestamp
  session_id: string;
}

class AssignmentTracker {
  private assignments: AssignmentRecord[] = [];
  private readonly maxRecords = 1000; // Prevent memory leak
  
  /**
   * Record an assignment
   */
  recordAssignment(ownerId: string, sessionId: string): void {
    const now = Date.now();
    
    // Remove old records to prevent memory growth
    if (this.assignments.length >= this.maxRecords) {
      this.assignments = this.assignments.slice(-500); // Keep last 500
    }
    
    this.assignments.push({
      owner_id: ownerId,
      assigned_at: now,
      session_id: sessionId,
    });
  }
  
  /**
   * Get last assignment time for each owner
   */
  getLastAssignmentTimes(): Map<string, number> {
    const lastTimes = new Map<string, number>();
    
    for (const record of this.assignments) {
      const currentLast = lastTimes.get(record.owner_id);
      if (!currentLast || record.assigned_at > currentLast) {
        lastTimes.set(record.owner_id, record.assigned_at);
      }
    }
    
    return lastTimes;
  }
  
  /**
   * Get assignment count per owner (recent assignments)
   */
  getAssignmentCounts(timeWindowMs: number = 3600000): Map<string, number> { // Default 1 hour
    const cutoff = Date.now() - timeWindowMs;
    const counts = new Map<string, number>();
    
    for (const record of this.assignments) {
      if (record.assigned_at >= cutoff) {
        counts.set(record.owner_id, (counts.get(record.owner_id) || 0) + 1);
      }
    }
    
    return counts;
  }
  
  /**
   * Clear old records (optional cleanup)
   */
  clearOldRecords(maxAgeMs: number = 86400000): void { // Default 24 hours
    const cutoff = Date.now() - maxAgeMs;
    this.assignments = this.assignments.filter(record => record.assigned_at >= cutoff);
  }
}

// Singleton instance
export const assignmentTracker = new AssignmentTracker();