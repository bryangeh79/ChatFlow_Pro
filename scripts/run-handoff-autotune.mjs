#!/usr/bin/env node

/**
 * Handoff autotune script
 * Analyzes daily performance and suggests parameter adjustments
 */

import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import {
  getDateRange,
  generateDailyReport,
  calculateTrends
} from './lib/handoff-daily-core.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Configuration from environment
const AUTOTUNE_ENABLED = process.env.CHATFLOW_OPS_AUTOTUNE === '1';
const STATE_PATH = process.env.CHATFLOW_OPS_AUTOTUNE_STATE_PATH || 
                   join(process.cwd(), 'data', '.handoff-autotune-state.json');
const COOLDOWN_MIN = parseInt(process.env.CHATFLOW_OPS_AUTOTUNE_COOLDOWN_MIN || '1440', 10);
const RULES_MODE = process.env.CHATFLOW_OPS_AUTOTUNE_RULES || 'conservative';

// Default report parameters
const REPORT_DAYS = 7;
const REPORT_TZ = 'Asia/Shanghai';
const REPORT_TARGET_MINUTES = 15;

// Current configuration (read from environment)
const CURRENT_CONFIG = {
  assign_balance: process.env.CHATFLOW_HANDOFF_ASSIGN_BALANCE || 'least_recent',
  target_minutes: parseInt(process.env.CHATFLOW_OPS_ALERT_TARGET_MINUTES || REPORT_TARGET_MINUTES, 10),
  owner_pool: process.env.CHATFLOW_HANDOFF_OWNER_POOL ? 
              process.env.CHATFLOW_HANDOFF_OWNER_POOL.split(',') : [],
  assign_mode: process.env.CHATFLOW_HANDOFF_ASSIGN_MODE || 'single'
};

/**
 * Load autotune state
 */
function loadAutotuneState() {
  try {
    if (existsSync(STATE_PATH)) {
      const content = readFileSync(STATE_PATH, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Warning: Could not load autotune state: ${error.message}`);
  }
  
  return {
    last_run_ts: 0,
    last_action: 'noop',
    last_reason: 'initial_state',
    cooldown_until: 0,
    actions_history: [],
    current_config: { ...CURRENT_CONFIG }
  };
}

/**
 * Save autotune state
 */
function saveAutotuneState(state) {
  try {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      const fs = require('fs');
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
    console.log(`Autotune state saved to ${STATE_PATH}`);
  } catch (error) {
    console.error(`Error saving autotune state: ${error.message}`);
  }
}

/**
 * Check if cooldown is active
 */
function isInCooldown(lastRunTs, currentTs) {
  const cooldownMs = COOLDOWN_MIN * 60 * 1000;
  return (currentTs - lastRunTs) < cooldownMs;
}

/**
 * Analyze performance and generate tuning suggestions
 */
function analyzePerformance(dailyStats, dateRange, targetMinutes) {
  const suggestions = [];
  const recentDays = dateRange.slice(-3);
  const previousDays = dateRange.slice(-6, -3);
  
  // Calculate metrics for recent period
  let recentTotalCases = 0;
  let recentSlaSum = 0;
  let recentSlaCount = 0;
  const recentP90s = [];
  const recentFlags = [];
  
  for (const date of recentDays) {
    const stats = dailyStats[date];
    recentTotalCases += stats.total_cases;
    
    if (stats.within_sla_rate > 0) {
      recentSlaSum += stats.within_sla_rate;
      recentSlaCount++;
    }
    
    if (stats.p90_minutes !== null) {
      recentP90s.push(stats.p90_minutes);
    }
    
    // Check for consecutive low SLA
    if (stats.within_sla_rate > 0 && stats.within_sla_rate < 0.6) {
      recentFlags.push('low_sla_day');
    }
  }
  
  const recentAvgSla = recentSlaCount > 0 ? recentSlaSum / recentSlaCount : 0;
  const recentMaxP90 = recentP90s.length > 0 ? Math.max(...recentP90s) : null;
  
  // Check for consecutive low SLA (2+ days)
  const lowSlaDays = recentDays.filter(date => {
    const stats = dailyStats[date];
    return stats.within_sla_rate > 0 && stats.within_sla_rate < 0.6;
  });
  
  if (lowSlaDays.length >= 2) {
    suggestions.push({
      type: 'increase_target_minutes',
      reason: `SLA rate below 0.6 for ${lowSlaDays.length} consecutive days (avg: ${recentAvgSla.toFixed(2)})`,
      severity: 'high',
      current_value: targetMinutes,
      suggested_value: Math.min(targetMinutes + 5, 30),
      constraint: 'max_30_minutes'
    });
  }
  
  // Check for high P90 (exceeds 2x target)
  if (recentMaxP90 !== null && recentMaxP90 > targetMinutes * 2) {
    // Check if this happened for 2+ days
    const highP90Days = recentDays.filter(date => {
      const stats = dailyStats[date];
      return stats.p90_minutes !== null && stats.p90_minutes > targetMinutes * 2;
    });
    
    if (highP90Days.length >= 2) {
      suggestions.push({
        type: 'switch_to_least_recent',
        reason: `P90 exceeds 2x target (${recentMaxP90.toFixed(1)} > ${targetMinutes * 2}) for ${highP90Days.length} consecutive days`,
        severity: 'medium',
        current_value: CURRENT_CONFIG.assign_balance,
        suggested_value: 'least_recent',
        condition: CURRENT_CONFIG.assign_balance === 'round_robin'
      });
    }
  }
  
  // Check for low volume
  if (recentTotalCases < 5) {
    suggestions.push({
      type: 'no_change_low_volume',
      reason: `Low assignment volume (${recentTotalCases} cases in recent 3 days)`,
      severity: 'info',
      action: 'monitor_only'
    });
  }
  
  // Aggressive rules (if enabled)
  if (RULES_MODE === 'aggressive' && CURRENT_CONFIG.owner_pool.length > 1) {
    // Check if we should suggest owner pool rotation
    if (recentAvgSla < 0.5 && recentTotalCases >= 10) {
      suggestions.push({
        type: 'suggest_owner_rotation',
        reason: `Low SLA rate (${recentAvgSla.toFixed(2)}) with sufficient volume, consider rotating owner pool`,
        severity: 'low',
        current_pool: CURRENT_CONFIG.owner_pool,
        suggested_rotation: 'rotate_first_to_last',
        note: 'Manual review recommended'
      });
    }
  }
  
  return suggestions;
}

/**
 * Apply conservative tuning rules
 */
function applyConservativeTuning(suggestions, currentConfig) {
  const actions = [];
  const newConfig = { ...currentConfig };
  
  for (const suggestion of suggestions) {
    switch (suggestion.type) {
      case 'increase_target_minutes':
        if (suggestion.condition !== false) {
          newConfig.target_minutes = suggestion.suggested_value;
          actions.push({
            action: 'increase_target_minutes',
            from: suggestion.current_value,
            to: suggestion.suggested_value,
            reason: suggestion.reason
          });
        }
        break;
        
      case 'switch_to_least_recent':
        if (suggestion.condition && currentConfig.assign_balance === 'round_robin') {
          newConfig.assign_balance = 'least_recent';
          actions.push({
            action: 'switch_balance_strategy',
            from: 'round_robin',
            to: 'least_recent',
            reason: suggestion.reason
          });
        }
        break;
        
      case 'no_change_low_volume':
        // Just log, no change
        actions.push({
          action: 'monitor_only',
          reason: suggestion.reason
        });
        break;
    }
  }
  
  return { newConfig, actions };
}

/**
 * Generate export commands for suggested changes
 */
function generateExportCommands(currentConfig, newConfig) {
  const commands = [];
  
  if (newConfig.target_minutes !== currentConfig.target_minutes) {
    commands.push(`export CHATFLOW_OPS_ALERT_TARGET_MINUTES=${newConfig.target_minutes}`);
  }
  
  if (newConfig.assign_balance !== currentConfig.assign_balance) {
    commands.push(`export CHATFLOW_HANDOFF_ASSIGN_BALANCE=${newConfig.assign_balance}`);
  }
  
  return commands;
}

/**
 * Print unified diff style comparison
 */
function printDiff(currentConfig, newConfig) {
  console.log('\n=== Configuration Comparison ===');
  console.log('Current configuration:');
  console.log(JSON.stringify(currentConfig, null, 2));
  
  console.log('\nSuggested configuration:');
  console.log(JSON.stringify(newConfig, null, 2));
  
  console.log('\nChanges:');
  if (newConfig.target_minutes !== currentConfig.target_minutes) {
    console.log(`  target_minutes: ${currentConfig.target_minutes} -> ${newConfig.target_minutes}`);
  }
  if (newConfig.assign_balance !== currentConfig.assign_balance) {
    console.log(`  assign_balance: ${currentConfig.assign_balance} -> ${newConfig.assign_balance}`);
  }
  if (JSON.stringify(newConfig) === JSON.stringify(currentConfig)) {
    console.log('  (no changes suggested)');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== ChatFlow Pro Handoff Autotune ===');
  console.log(`Mode: ${RULES_MODE}`);
  console.log(`Enabled: ${AUTOTUNE_ENABLED ? 'YES (will write state)' : 'NO (dry run only)'}`);
  console.log(`Cooldown: ${COOLDOWN_MIN} minutes`);
  console.log(`State path: ${STATE_PATH}`);
  console.log('');
  
  // Load current state
  const state = loadAutotuneState();
  const currentTs = Date.now();
  
  // Check cooldown
  if (isInCooldown(state.last_run_ts, currentTs) && AUTOTUNE_ENABLED) {
    const minutesSinceLastRun = Math.round((currentTs - state.last_run_ts) / (60 * 1000));
    console.log(`Cooldown active: last run ${minutesSinceLastRun} minutes ago, cooldown is ${COOLDOWN_MIN} minutes`);
    console.log('Skipping analysis due to cooldown.');
    process.exit(0);
  }
  
  // Generate daily report
  const dateRange = getDateRange(REPORT_DAYS, REPORT_TZ);
  const filePath = join(process.cwd(), 'data', 'handoff-assignments.jsonl');
  
  let dailyStats;
  try {
    dailyStats = await generateDailyReport(filePath, dateRange, REPORT_TZ, REPORT_TARGET_MINUTES);
  } catch (error) {
    console.error(`Error generating daily report: ${error.message}`);
    process.exit(1);
  }
  
  // Analyze performance
  const suggestions = analyzePerformance(dailyStats, dateRange, REPORT_TARGET_MINUTES);
  
  console.log('Performance Analysis:');
  console.log(`- Period: ${REPORT_DAYS} days (${dateRange[0]} to ${dateRange[dateRange.length - 1]})`);
  console.log(`- Total cases: ${Object.values(dailyStats).reduce((sum, day) => sum + day.total_cases, 0)}`);
  
  if (suggestions.length === 0) {
    console.log('- No tuning suggestions (performance within acceptable range)');
  } else {
    console.log(`- Suggestions: ${suggestions.length}`);
    suggestions.forEach((suggestion, i) => {
      console.log(`  ${i + 1}. ${suggestion.type}: ${suggestion.reason}`);
    });
  }
  console.log('');
  
  // Apply tuning rules
  const { newConfig, actions } = applyConservativeTuning(suggestions, CURRENT_CONFIG);
  
  // Print diff
  printDiff(CURRENT_CONFIG, newConfig);
  
  // Generate export commands
  const exportCommands = generateExportCommands(CURRENT_CONFIG, newConfig);
  if (exportCommands.length > 0) {
    console.log('\n=== Suggested Export Commands ===');
    console.log('# Apply these changes in your environment:');
    exportCommands.forEach(cmd => console.log(cmd));
  }
  
  // Update state
  const newState = {
    last_run_ts: currentTs,
    last_action: actions.length > 0 ? actions[0].action : 'noop',
    last_reason: actions.length > 0 ? actions[0].reason : 'no_changes_needed',
    cooldown_until: currentTs + (COOLDOWN_MIN * 60 * 1000),
    actions_history: [
      ...(state.actions_history || []).slice(-9), // Keep last 10 entries
      {
        timestamp: currentTs,
        actions,
        suggestions_count: suggestions.length,
        config_before: { ...CURRENT_CONFIG },
        config_after: { ...newConfig }
      }
    ],
    current_config: AUTOTUNE_ENABLED ? newConfig : CURRENT_CONFIG
  };
  
  // Save state if enabled
  if (AUTOTUNE_ENABLED) {
    saveAutotuneState(newState);
    console.log(`\nAutotune state updated. Next run allowed after: ${new Date(newState.cooldown_until).toISOString()}`);
  } else {
    console.log('\nDry run complete. Set CHATFLOW_OPS_AUTOTUNE=1 to apply changes.');
  }
  
  // Summary
  console.log('\n=== Summary ===');
  if (actions.length === 0) {
    console.log('No configuration changes suggested.');
  } else {
    console.log(`Suggested ${actions.length} change(s):`);
    actions.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action.action}: ${action.reason}`);
    });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}