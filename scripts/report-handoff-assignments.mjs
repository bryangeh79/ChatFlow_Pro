#!/usr/bin/env node

/**
 * Handoff assignments reporting script
 * Reads data/handoff-assignments.jsonl and generates statistics
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
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      console.error(`Error: Unknown argument ${arg}`);
      console.error('Usage: node report-handoff-assignments.mjs [--since-hours N] [--since ISO_DATE]');
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
 * Process JSONL file and generate statistics
 */
async function generateReport(filePath, timeThreshold) {
  const stats = {
    total_assignments: 0,
    by_owner: {},
    by_reason: {},
    by_mode: {},
    tag_counts: {},
    assignments_by_hour: {}
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
        
        // Apply time filter
        const recordTime = new Date(record.ts_iso).getTime();
        if (recordTime < timeThreshold) {
          continue;
        }
        
        // Update statistics
        stats.total_assignments++;
        
        // Count by owner
        const owner = record.assigned_owner_id;
        stats.by_owner[owner] = (stats.by_owner[owner] || 0) + 1;
        
        // Count by reason
        const reason = record.assign_reason;
        stats.by_reason[reason] = (stats.by_reason[reason] || 0) + 1;
        
        // Count by mode
        const mode = record.assign_mode;
        stats.by_mode[mode] = (stats.by_mode[mode] || 0) + 1;
        
        // Count tags
        if (record.tag_hits && Array.isArray(record.tag_hits)) {
          for (const tag of record.tag_hits) {
            stats.tag_counts[tag] = (stats.tag_counts[tag] || 0) + 1;
          }
        }
        
        // Count by hour for average calculation
        const hourKey = record.ts_iso.slice(0, 13); // YYYY-MM-DDTHH
        stats.assignments_by_hour[hourKey] = (stats.assignments_by_hour[hourKey] || 0) + 1;
        
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

  return stats;
}

/**
 * Calculate average assignments per hour
 */
function calculateAvgPerHour(stats, timeThreshold) {
  const now = Date.now();
  const hoursDiff = Math.max(1, (now - timeThreshold) / (60 * 60 * 1000));
  
  const totalHours = Object.keys(stats.assignments_by_hour).length;
  if (totalHours === 0) {
    return 0;
  }
  
  // Return average per hour in the filtered period
  return stats.total_assignments / hoursDiff;
}

/**
 * Get top 5 tags
 */
function getTopTags(tagCounts) {
  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));
}

/**
 * Format output
 */
function formatOutput(stats, avgPerHour, topTags) {
  return {
    total_assignments: stats.total_assignments,
    by_owner: stats.by_owner,
    by_reason: stats.by_reason,
    by_mode: stats.by_mode,
    avg_assignments_per_hour: parseFloat(avgPerHour.toFixed(2)),
    top_tags: topTags
  };
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    console.log('Handoff Assignments Report');
    console.log('');
    console.log('Usage:');
    console.log('  node report-handoff-assignments.mjs [options]');
    console.log('');
    console.log('Options:');
    console.log('  --since-hours N    Filter assignments from last N hours (default: 24)');
    console.log('  --since ISO_DATE   Filter assignments since ISO date (e.g., 2026-04-06T10:00:00Z)');
    console.log('  --help, -h         Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node report-handoff-assignments.mjs');
    console.log('  node report-handoff-assignments.mjs --since-hours 48');
    console.log('  node report-handoff-assignments.mjs --since 2026-04-05T00:00:00Z');
    return;
  }
  
  const timeThreshold = getTimeThreshold(options);
  const filePath = join(process.cwd(), 'data', 'handoff-assignments.jsonl');
  
  try {
    const stats = await generateReport(filePath, timeThreshold);
    const avgPerHour = calculateAvgPerHour(stats, timeThreshold);
    const topTags = getTopTags(stats.tag_counts);
    
    const output = formatOutput(stats, avgPerHour, topTags);
    
    console.log(JSON.stringify(output, null, 2));
    
  } catch (error) {
    console.error('Error generating report:', error.message);
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

export { generateReport, getTopTags, calculateAvgPerHour };