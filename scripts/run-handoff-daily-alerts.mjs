#!/usr/bin/env node

/**
 * Handoff daily alerts script
 * Runs daily report and sends alerts via webhook if configured
 */

import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import {
  getDateRange,
  generateDailyReport,
  calculateTrends,
  formatDailyOutput
} from './lib/handoff-daily-core.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Configuration from environment
const ALERT_WEBHOOK_URL = process.env.CHATFLOW_OPS_ALERT_WEBHOOK_URL;
const ALERT_SECRET = process.env.CHATFLOW_OPS_ALERT_SECRET;
const ALERT_MIN_INTERVAL_SEC = parseInt(process.env.CHATFLOW_OPS_ALERT_MIN_INTERVAL_SEC || '300', 10);

// Default report parameters (can be overridden by env if needed)
const REPORT_DAYS = 7;
const REPORT_TZ = 'Asia/Shanghai';
const REPORT_TARGET_MINUTES = 15;

// File for tracking last alert (simple throttling)
const LAST_ALERT_FILE = join(process.cwd(), 'data', '.last-handoff-alert.json');

/**
 * Generate hash for alert flags (simple string hash)
 */
function generateFlagsHash(flags) {
  const flagsStr = JSON.stringify(flags.sort());
  let hash = 0;
  for (let i = 0; i < flagsStr.length; i++) {
    const char = flagsStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Load last alert state
 */
function loadLastAlertState() {
  try {
    if (existsSync(LAST_ALERT_FILE)) {
      const content = readFileSync(LAST_ALERT_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    // If file is corrupted, ignore and start fresh
    console.warn(`Warning: Could not load last alert state: ${error.message}`);
  }
  
  return {
    last_sent_ts: 0,
    last_flags_hash: null,
    last_alert_count: 0
  };
}

/**
 * Save last alert state
 */
function saveLastAlertState(state) {
  try {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      // Create data directory if it doesn't exist
      const fs = require('fs');
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    writeFileSync(LAST_ALERT_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error saving alert state: ${error.message}`);
    // Non-fatal error, continue
  }
}

/**
 * Check if we should send alert (throttling logic)
 */
function shouldSendAlert(currentFlags, currentTs) {
  const lastState = loadLastAlertState();
  const currentFlagsHash = generateFlagsHash(currentFlags);
  
  // If no flags, don't send alert
  if (currentFlags.length === 0) {
    return false;
  }
  
  // Check time interval
  const timeSinceLastAlert = currentTs - lastState.last_sent_ts;
  if (timeSinceLastAlert < ALERT_MIN_INTERVAL_SEC * 1000) {
    console.log(`Throttling: Last alert sent ${Math.round(timeSinceLastAlert/1000)}s ago, minimum interval is ${ALERT_MIN_INTERVAL_SEC}s`);
    return false;
  }
  
  // Check if flags are the same as last time
  if (currentFlagsHash === lastState.last_flags_hash) {
    console.log(`Throttling: Same flags hash detected (${currentFlagsHash}), not sending duplicate alert`);
    return false;
  }
  
  return true;
}

/**
 * Send alert via webhook
 */
async function sendAlertWebhook(alertData) {
  if (!ALERT_WEBHOOK_URL) {
    console.log('No webhook URL configured, printing alert to stdout');
    console.log(JSON.stringify(alertData, null, 2));
    return { success: true, method: 'stdout' };
  }
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'ChatFlow-Pro-Alerts/1.0'
    };
    
    // Add secret header if configured
    if (ALERT_SECRET) {
      headers['x-chatflow-ops-alert-secret'] = ALERT_SECRET;
    }
    
    const response = await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(alertData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`Alert sent successfully to ${ALERT_WEBHOOK_URL}`);
    return { success: true, method: 'webhook', status: response.status };
    
  } catch (error) {
    console.error(`Failed to send alert to webhook: ${error.message}`);
    // Fallback to stdout
    console.log('Falling back to stdout output:');
    console.log(JSON.stringify(alertData, null, 2));
    return { success: false, method: 'stdout_fallback', error: error.message };
  }
}

/**
 * Build alert payload
 */
function buildAlertPayload(dailyReport, packageVersion) {
  const { summary } = dailyReport;
  const currentTs = Date.now();
  
  return {
    source: 'chatflow-pro',
    version: packageVersion,
    ts: new Date(currentTs).toISOString(),
    ts_unix: currentTs,
    flags: summary.alert_flags,
    summary: {
      trend_total_cases_pct: summary.trend_total_cases_pct,
      trend_within_sla_rate_delta: summary.trend_within_sla_rate_delta,
      target_minutes: summary.target_minutes,
      report_period_days: summary.report_period_days
    },
    // Include a subset of daily data for context
    recent_performance: {
      days_count: dailyReport.days.length,
      last_day: dailyReport.days[dailyReport.days.length - 1] || null,
      flags_explanation: {
        'sla_significant_decline': 'SLA rate declined more than 10% (recent 3 days vs previous 3 days)',
        'sla_consecutive_decline': 'SLA rate declined for 2 consecutive days',
        'p90_exceeds_double_target': 'P90 response time exceeds double the SLA target',
        'low_volume_warning': 'Low assignment volume (less than 5 cases in recent 3 days)'
      }
    }
  };
}

/**
 * Main function
 */
async function main() {
  console.log('=== ChatFlow Pro Handoff Daily Alerts ===');
  console.log(`Webhook URL: ${ALERT_WEBHOOK_URL ? 'Configured' : 'Not configured (stdout only)'}`);
  console.log(`Minimum interval: ${ALERT_MIN_INTERVAL_SEC} seconds`);
  console.log('');
  
  // Get package version
  let packageVersion = 'unknown';
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    packageVersion = packageJson.version || 'unknown';
  } catch (error) {
    console.warn(`Warning: Could not read package version: ${error.message}`);
  }
  
  // Generate daily report
  const dateRange = getDateRange(REPORT_DAYS, REPORT_TZ);
  const filePath = join(process.cwd(), 'data', 'handoff-assignments.jsonl');
  
  let dailyReport;
  try {
    const dailyStats = await generateDailyReport(filePath, dateRange, REPORT_TZ, REPORT_TARGET_MINUTES);
    const trends = calculateTrends(dailyStats, dateRange, REPORT_TARGET_MINUTES);
    dailyReport = formatDailyOutput(dailyStats, dateRange, trends, REPORT_TARGET_MINUTES);
  } catch (error) {
    console.error(`Error generating daily report: ${error.message}`);
    process.exit(1);
  }
  
  const { summary } = dailyReport;
  const currentTs = Date.now();
  
  console.log('Report Summary:');
  console.log(`- Period: ${REPORT_DAYS} days (${dateRange[0]} to ${dateRange[dateRange.length - 1]})`);
  console.log(`- Total cases: ${dailyReport.days.reduce((sum, day) => sum + day.total_cases, 0)}`);
  console.log(`- SLA rate trend: ${summary.trend_within_sla_rate_delta >= 0 ? '+' : ''}${summary.trend_within_sla_rate_delta}`);
  console.log(`- Alert flags: ${summary.alert_flags.length > 0 ? summary.alert_flags.join(', ') : 'none'}`);
  console.log('');
  
  // Check if we should send alert
  if (!shouldSendAlert(summary.alert_flags, currentTs)) {
    console.log('No alert sent (throttled or no flags)');
    
    // Update state even if not sending (to track last check time)
    const lastState = loadLastAlertState();
    saveLastAlertState({
      ...lastState,
      last_check_ts: currentTs,
      last_flags_count: summary.alert_flags.length
    });
    
    process.exit(0);
  }
  
  // Build and send alert
  const alertPayload = buildAlertPayload(dailyReport, packageVersion);
  const result = await sendAlertWebhook(alertPayload);
  
  // Update last alert state
  const flagsHash = generateFlagsHash(summary.alert_flags);
  const lastState = loadLastAlertState();
  saveLastAlertState({
    last_sent_ts: currentTs,
    last_flags_hash: flagsHash,
    last_alert_count: (lastState.last_alert_count || 0) + 1,
    last_check_ts: currentTs,
    last_flags: summary.alert_flags
  });
  
  console.log('');
  console.log(`Alert ${result.success ? 'processed' : 'failed'}, method: ${result.method}`);
  
  process.exit(result.success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}