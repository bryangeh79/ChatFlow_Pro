/**
 * Handoff daily report core logic (shared between report and alert modules)
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

/**
 * Calculate response time in minutes
 * Returns null if timestamps are missing or invalid
 */
export function calculateResponseMinutes(record) {
  try {
    // Use assigned_at if available, otherwise fall back to ts_iso
    const assignedAt = record.assigned_at || record.ts_iso;
    const firstPendingAt = record.first_pending_at;
    
    if (!assignedAt || !firstPendingAt) {
      return null;
    }
    
    const assignedTime = new Date(assignedAt).getTime();
    const pendingTime = new Date(firstPendingAt).getTime();
    
    if (isNaN(assignedTime) || isNaN(pendingTime)) {
      return null;
    }
    
    // Response time in minutes
    return (assignedTime - pendingTime) / (60 * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Calculate percentile from sorted array
 */
export function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return null;
  
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Format date to YYYY-MM-DD in specified timezone
 * Note: Simple implementation - for production use a proper timezone library
 */
export function formatDateToLocal(dateStr, timezone) {
  try {
    const date = new Date(dateStr);
    
    // Simple timezone offset handling for common timezones
    const timezoneOffsets = {
      'Asia/Shanghai': 8,
      'Asia/Tokyo': 9,
      'Asia/Kuala_Lumpur': 8,
      'UTC': 0,
      'America/New_York': -5,
      'America/Los_Angeles': -8,
      'Europe/London': 0,
      'Europe/Paris': 1
    };
    
    const offsetHours = timezoneOffsets[timezone] || 8; // Default to Shanghai
    const localDate = new Date(date.getTime() + offsetHours * 60 * 60 * 1000);
    
    const year = localDate.getUTCFullYear();
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localDate.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    // Fallback to UTC if parsing fails
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
}

/**
 * Get date range for analysis
 */
export function getDateRange(days, timezone) {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1);
  
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = formatDateToLocal(currentDate.toISOString(), timezone);
    dates.push(dateStr);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * Process JSONL file and generate daily statistics
 */
export async function generateDailyReport(filePath, dateRange, timezone, targetMinutes) {
  // Initialize daily stats
  const dailyStats = {};
  for (const date of dateRange) {
    dailyStats[date] = {
      total_cases: 0,
      within_sla_count: 0,
      within_sla_rate: 0,
      response_times: [],
      by_owner: {},
      dropped_missing_timestamps: 0,
      session_first_assignments: new Set()
    };
  }

  if (!filePath) {
    return dailyStats;
  }

  try {
    const fileStream = createReadStream(filePath, { encoding: 'utf8' });
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      
      try {
        const record = JSON.parse(line);
        
        // Skip if no assigned owner
        if (!record.assigned_owner_id) {
          continue;
        }
        
        // Get assigned date for grouping
        const assignedAt = record.assigned_at || record.ts_iso;
        if (!assignedAt) continue;
        
        const dateKey = formatDateToLocal(assignedAt, timezone);
        
        // Skip if date not in range
        if (!dailyStats[dateKey]) {
          continue;
        }
        
        const dayStats = dailyStats[dateKey];
        
        // Track first assignment per session (avoid duplicates)
        if (dayStats.session_first_assignments.has(record.session_id)) {
          continue; // Skip duplicate assignment for same session
        }
        dayStats.session_first_assignments.add(record.session_id);
        
        dayStats.total_cases++;
        
        // Calculate response time
        const responseMinutes = calculateResponseMinutes(record);
        
        if (responseMinutes === null) {
          dayStats.dropped_missing_timestamps++;
          continue;
        }
        
        // Add to response times for percentile calculation
        dayStats.response_times.push(responseMinutes);
        
        // Check if within SLA
        const withinSla = responseMinutes <= targetMinutes;
        if (withinSla) {
          dayStats.within_sla_count++;
        }
        
        // Update owner statistics
        const owner = record.assigned_owner_id;
        if (!dayStats.by_owner[owner]) {
          dayStats.by_owner[owner] = {
            count: 0,
            within_sla_count: 0,
            response_times: []
          };
        }
        
        const ownerStats = dayStats.by_owner[owner];
        ownerStats.count++;
        if (withinSla) {
          ownerStats.within_sla_count++;
        }
        ownerStats.response_times.push(responseMinutes);
        
      } catch (parseError) {
        // Skip invalid JSON lines
        console.warn(`Warning: Skipping invalid JSON line: ${line.substring(0, 100)}...`);
      }
    }
    
    rl.close();
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, return empty stats
      return dailyStats;
    }
    throw error;
  }

  // Calculate final metrics for each day
  for (const [date, dayStats] of Object.entries(dailyStats)) {
    if (dayStats.response_times.length > 0) {
      // Sort response times for percentile calculation
      dayStats.response_times.sort((a, b) => a - b);
      dayStats.p50_minutes = calculatePercentile(dayStats.response_times, 50);
      dayStats.p90_minutes = calculatePercentile(dayStats.response_times, 90);
      
      // Calculate overall SLA rate
      dayStats.within_sla_rate = dayStats.within_sla_count / dayStats.response_times.length;
      
      // Calculate owner-specific metrics and get top 3
      const ownerEntries = [];
      for (const [owner, ownerStats] of Object.entries(dayStats.by_owner)) {
        if (ownerStats.response_times.length > 0) {
          ownerStats.within_sla_rate = ownerStats.within_sla_count / ownerStats.response_times.length;
          // Remove raw response times to keep output clean
          delete ownerStats.response_times;
        } else {
          ownerStats.within_sla_rate = 0;
        }
        
        ownerEntries.push({
          owner,
          count: ownerStats.count,
          within_sla_rate: ownerStats.within_sla_rate
        });
      }
      
      // Get top 3 owners by count
      dayStats.by_owner_top3 = ownerEntries
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      // Remove raw data
      delete dayStats.response_times;
    } else {
      dayStats.p50_minutes = null;
      dayStats.p90_minutes = null;
      dayStats.within_sla_rate = 0;
      dayStats.by_owner_top3 = [];
    }
    
    // Clean up temporary data
    delete dayStats.session_first_assignments;
    delete dayStats.by_owner;
  }

  return dailyStats;
}

/**
 * Calculate trend analysis
 */
export function calculateTrends(dailyStats, dateRange, targetMinutes) {
  if (dateRange.length < 6) {
    return {
      trend_total_cases_pct: null,
      trend_within_sla_rate_delta: null,
      alert_flags: []
    };
  }
  
  // Split into recent 3 days and previous 3 days
  const recentDays = dateRange.slice(-3);
  const previousDays = dateRange.slice(-6, -3);
  
  // Calculate averages for recent period
  let recentTotal = 0;
  let recentSlaSum = 0;
  let recentSlaCount = 0;
  
  for (const date of recentDays) {
    const stats = dailyStats[date];
    recentTotal += stats.total_cases;
    if (stats.within_sla_rate > 0) {
      recentSlaSum += stats.within_sla_rate;
      recentSlaCount++;
    }
  }
  
  const recentAvgSla = recentSlaCount > 0 ? recentSlaSum / recentSlaCount : 0;
  
  // Calculate averages for previous period
  let previousTotal = 0;
  let previousSlaSum = 0;
  let previousSlaCount = 0;
  
  for (const date of previousDays) {
    const stats = dailyStats[date];
    previousTotal += stats.total_cases;
    if (stats.within_sla_rate > 0) {
      previousSlaSum += stats.within_sla_rate;
      previousSlaCount++;
    }
  }
  
  const previousAvgSla = previousSlaCount > 0 ? previousSlaSum / previousSlaCount : 0;
  
  // Calculate trends
  let trendTotalPct = null;
  if (previousTotal > 0) {
    trendTotalPct = ((recentTotal - previousTotal) / previousTotal) * 100;
  }
  
  const trendSlaDelta = recentAvgSla - previousAvgSla;
  
  // Generate alert flags
  const alertFlags = [];
  
  // Check for SLA decline
  if (trendSlaDelta < -0.1) { // More than 10% decline
    alertFlags.push('sla_significant_decline');
  }
  
  // Check for consecutive SLA decline (last 2 days)
  const lastTwoDays = dateRange.slice(-2);
  if (lastTwoDays.length === 2) {
    const day1 = dailyStats[lastTwoDays[0]];
    const day2 = dailyStats[lastTwoDays[1]];
    
    if (day1.within_sla_rate > 0 && day2.within_sla_rate > 0 && 
        day2.within_sla_rate < day1.within_sla_rate) {
      alertFlags.push('sla_consecutive_decline');
    }
  }
  
  // Check for high p90
  const recentP90s = recentDays
    .map(date => dailyStats[date].p90_minutes)
    .filter(p90 => p90 !== null);
  
  if (recentP90s.length > 0) {
    const maxP90 = Math.max(...recentP90s);
    if (maxP90 > targetMinutes * 2) {
      alertFlags.push('p90_exceeds_double_target');
    }
  }
  
  // Check for low volume
  if (recentTotal < 5) {
    alertFlags.push('low_volume_warning');
  }
  
  return {
    trend_total_cases_pct: trendTotalPct ? parseFloat(trendTotalPct.toFixed(1)) : null,
    trend_within_sla_rate_delta: parseFloat(trendSlaDelta.toFixed(3)),
    alert_flags: alertFlags
  };
}

/**
 * Format daily output
 */
export function formatDailyOutput(dailyStats, dateRange, trends, targetMinutes) {
  const days = dateRange.map(date => {
    const stats = dailyStats[date];
    return {
      date,
      total_cases: stats.total_cases,
      within_sla_rate: stats.within_sla_rate ? parseFloat(stats.within_sla_rate.toFixed(3)) : 0,
      p50_minutes: stats.p50_minutes ? parseFloat(stats.p50_minutes.toFixed(2)) : null,
      p90_minutes: stats.p90_minutes ? parseFloat(stats.p90_minutes.toFixed(2)) : null,
      by_owner_top3: (stats.by_owner_top3 || []).map(owner => ({
        owner: owner.owner,
        count: owner.count,
        within_sla_rate: parseFloat(owner.within_sla_rate.toFixed(3))
      })),
      dropped_missing_timestamps: stats.dropped_missing_timestamps
    };
  });
  
  return {
    days,
    summary: {
      ...trends,
      target_minutes: targetMinutes,
      report_period_days: dateRange.length
    }
  };
}