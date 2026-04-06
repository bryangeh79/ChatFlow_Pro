#!/usr/bin/env node

/**
 * Handoff daily trend reporting script
 * Reads data/handoff-assignments.jsonl and generates daily trend analysis
 */

import { join } from 'path';
import { fileURLToPath } from 'url';
import {
  getDateRange,
  generateDailyReport,
  calculateTrends,
  formatDailyOutput
} from './lib/handoff-daily-core.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    days: 7,
    tz: 'Asia/Shanghai',
    targetMinutes: 15,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--days' || arg.startsWith('--days=')) {
      let value;
      if (arg.includes('=')) {
        value = arg.split('=')[1];
      } else {
        value = args[++i];
      }
      options.days = parseInt(value, 10);
      if (isNaN(options.days) || options.days <= 0) {
        console.error('Error: --days must be a positive number');
        process.exit(1);
      }
    } else if (arg === '--tz' || arg.startsWith('--tz=')) {
      let value;
      if (arg.includes('=')) {
        value = arg.split('=')[1];
      } else {
        value = args[++i];
      }
      options.tz = value;
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
      console.error('Usage: node report-handoff-daily.mjs [--days N] [--tz TIMEZONE] [--target-minutes M]');
      process.exit(1);
    }
  }

  return options;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    console.log('Handoff Daily Trend Report');
    console.log('');
    console.log('Usage:');
    console.log('  node report-handoff-daily.mjs [options]');
    console.log('');
    console.log('Options:');
    console.log('  --days N               Number of days to analyze (default: 7)');
    console.log('  --tz TIMEZONE          Timezone for date grouping (default: Asia/Shanghai)');
    console.log('  --target-minutes M     SLA target in minutes (default: 15)');
    console.log('  --help, -h             Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node report-handoff-daily.mjs');
    console.log('  node report-handoff-daily.mjs --days=14 --tz=UTC');
    console.log('  node report-handoff-daily.mjs --target-minutes=30');
    return;
  }
  
  const dateRange = getDateRange(options.days, options.tz);
  const filePath = join(process.cwd(), 'data', 'handoff-assignments.jsonl');
  
  try {
    const dailyStats = await generateDailyReport(filePath, dateRange, options.tz, options.targetMinutes);
    const trends = calculateTrends(dailyStats, dateRange, options.targetMinutes);
    const output = formatDailyOutput(dailyStats, dateRange, trends, options.targetMinutes);
    
    console.log(JSON.stringify(output, null, 2));
    
  } catch (error) {
    console.error('Error generating daily report:', error.message);
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

export { parseArgs };