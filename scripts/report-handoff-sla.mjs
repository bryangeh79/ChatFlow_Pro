#!/usr/bin/env node

/**
 * Handoff SLA reporting script
 * Reads data/handoff-assignments.jsonl and calculates SLA metrics
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    sinceHours: 24,
    since: null,
    targetMinutes: 15,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--since-hours' || arg.startsWith('--since-hours=')) {
      let value;
      if (arg.includes('=')) {
        value = arg.split('=')[1];
      } else {
        value = args[++i];
      }
      options.sinceHours = parseInt(value, 10);
      if (isNaN(options.sinceHours) || options.sinceHours <= 0) {
        console.error('Error: --since-hours must be a positive number');
        process.exit(1);
      }
    } else if (arg === '--since' || arg.startsWith('--since=')) {
      let value;
      if (arg.includes('=')) {
        value = arg.split('=')[1];
      } else {
        value = args[++i];
      }
      options.since = new Date(value);
      if (isNaN(options.since.getTime())) {
        console.error('Error: --since must be a valid ISO date string');
        process.exit(1);
      }
    } else if (arg === '--target-minutes' || arg.startsWith('--target-minutes=')) {
      let value;
      if (arg.includes('=')) {
        value = arg.split('=')[1];
      } else {
        value = args[++i];
      }
      options.targetMinutes = parseInt(value, 10);
      if (isNaN(options.targetMinutes) || options.targetMinutes <= 0) {
        console.error('Error: --target-minutes must be a positive number');
        process.exit(1);
      }
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      console.error(`Error: Unknown argument ${arg}`);
      console.error('Usage: node report-handoff-sla.mjs [--since-hours N] [--since ISO_DATE] [--target-minutes M]');
      process.exit(1);
    }
  }

  return options;
}

/**
 * Calculate time filter threshold
 */
function getTimeThreshold(options) {
  if (options.since) {
    return options.since.getTime();
  }
  
  const now = Date.now();
  const hoursMs = options.sinceHours * 60 * 60 * 1000;
  return now - hoursMs;
}

/**
 * Calculate response time in minutes
 * Returns null if timestamps are missing or invalid
 */
function calculateResponseMinutes(record) {
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
function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return null;
  
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

/**
 * Process JSONL file and calculate SLA metrics
 */
async function generateSlaReport(filePath, timeThreshold, targetMinutes) {
  const stats = {
    total_cases: 0,
    within_sla_count: 0,
    within_sla_rate: 0,
    p50_minutes: null,
    p90_minutes: null,
    by_owner: {},
    dropped_missing_timestamps: 0,
    // Track first assignment per session (to avoid duplicates)
    session_first_assignments: new Set(),
    response_times: []
  };

  if (!filePath) {
    return stats;
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
        
        // Apply time filter (use assigned_at or ts_iso)
        const recordTimeStr = record.assigned_at || record.ts_iso;
        if (!recordTimeStr) continue;
        
        const recordTime = new Date(recordTimeStr).getTime();
        if (recordTime < timeThreshold) {
          continue;
        }
        
        // Skip if no assigned owner
        if (!record.assigned_owner_id) {
          continue;
        }
        
        // Track first assignment per session (avoid duplicates)
        if (stats.session_first_assignments.has(record.session_id)) {
          continue; // Skip duplicate assignment for same session
        }
        stats.session_first_assignments.add(record.session_id);
        
        stats.total_cases++;
        
        // Calculate response time
        const responseMinutes = calculateResponseMinutes(record);
        
        if (responseMinutes === null) {
          stats.dropped_missing_timestamps++;
          continue;
        }
        
        // Add to response times for percentile calculation
        stats.response_times.push(responseMinutes);
        
        // Check if within SLA
        const withinSla = responseMinutes <= targetMinutes;
        if (withinSla) {
          stats.within_sla_count++;
        }
        
        // Update owner statistics
        const owner = record.assigned_owner_id;
        if (!stats.by_owner[owner]) {
          stats.by_owner[owner] = {
            count: 0,
            within_sla_count: 0,
            response_times: []
          };
        }
        
        const ownerStats = stats.by_owner[owner];
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
      return stats;
    }
    throw error;
  }

  // Calculate final metrics
  if (stats.response_times.length > 0) {
    // Sort response times for percentile calculation
    stats.response_times.sort((a, b) => a - b);
    stats.p50_minutes = calculatePercentile(stats.response_times, 50);
    stats.p90_minutes = calculatePercentile(stats.response_times, 90);
    
    // Calculate overall SLA rate
    stats.within_sla_rate = stats.within_sla_count / stats.response_times.length;
    
    // Calculate owner-specific metrics
    for (const [owner, ownerStats] of Object.entries(stats.by_owner)) {
      if (ownerStats.response_times.length > 0) {
        ownerStats.response_times.sort((a, b) => a - b);
        ownerStats.within_sla_rate = ownerStats.within_sla_count / ownerStats.response_times.length;
        ownerStats.avg_minutes = ownerStats.response_times.reduce((sum, val) => sum + val, 0) / ownerStats.response_times.length;
        ownerStats.p90_minutes = calculatePercentile(ownerStats.response_times, 90);
        
        // Remove raw response times to keep output clean
        delete ownerStats.response_times;
      } else {
        ownerStats.within_sla_rate = 0;
        ownerStats.avg_minutes = null;
        ownerStats.p90_minutes = null;
      }
    }
  }

  // Clean up temporary data
  delete stats.session_first_assignments;
  delete stats.response_times;

  return stats;
}

/**
 * Format output with rounding
 */
function formatOutput(stats, targetMinutes) {
  const formatted = {
    total_cases: stats.total_cases,
    within_sla_count: stats.within_sla_count,
    within_sla_rate: stats.within_sla_rate ? parseFloat(stats.within_sla_rate.toFixed(3)) : 0,
    p50_minutes: stats.p50_minutes ? parseFloat(stats.p50_minutes.toFixed(2)) : null,
    p90_minutes: stats.p90_minutes ? parseFloat(stats.p90_minutes.toFixed(2)) : null,
    by_owner: {},
    dropped_missing_timestamps: stats.dropped_missing_timestamps,
    target_minutes: targetMinutes
  };

  // Format owner statistics
  for (const [owner, ownerStats] of Object.entries(stats.by_owner)) {
    formatted.by_owner[owner] = {
      count: ownerStats.count,
      within_sla_rate: ownerStats.within_sla_rate ? parseFloat(ownerStats.within_sla_rate.toFixed(3)) : 0,
      avg_minutes: ownerStats.avg_minutes ? parseFloat(ownerStats.avg_minutes.toFixed(2)) : null,
      p90_minutes: ownerStats.p90_minutes ? parseFloat(ownerStats.p90_minutes.toFixed(2)) : null
    };
  }

  return formatted;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    console.log('Handoff SLA Report');
    console.log('');
    console.log('Usage:');
    console.log('  node report-handoff-sla.mjs [options]');
    console.log('');
    console.log('Options:');
    console.log('  --since-hours N        Filter assignments from last N hours (default: 24)');
    console.log('  --since ISO_DATE       Filter assignments since ISO date (e.g., 2026-04-06T10:00:00Z)');
    console.log('  --target-minutes M     SLA target in minutes (default: 15)');
    console.log('  --help, -h             Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node report-handoff-sla.mjs');
    console.log('  node report-handoff-sla.mjs --since-hours 48 --target-minutes 30');
    console.log('  node report-handoff-sla.mjs --since 2026-04-05T00:00:00Z');
    return;
  }
  
  const timeThreshold = getTimeThreshold(options);
  const filePath = join(process.cwd(), 'data', 'handoff-assignments.jsonl');
  
  try {
    const stats = await generateSlaReport(filePath, timeThreshold, options.targetMinutes);
    const output = formatOutput(stats, options.targetMinutes);
    
    console.log(JSON.stringify(output, null, 2));
    
  } catch (error) {
    console.error('Error generating SLA report:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { generateSlaReport, calculateResponseMinutes, calculatePercentile };