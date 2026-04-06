// Test script for autotune runtime config write
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Testing Autotune Runtime Config Write ===\n');

// Create test directories
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create test runtime config file
const runtimeConfigPath = path.join(dataDir, 'handoff-assign-runtime-test.json');
const initialConfig = {
  assign_mode: "round_robin",
  owner_pool: ["agent-1", "agent-2"],
  assign_balance: "round_robin"
};

fs.writeFileSync(runtimeConfigPath, JSON.stringify(initialConfig, null, 2));
console.log(`1. Created test runtime config at: ${runtimeConfigPath}`);
console.log('   Initial config:', JSON.stringify(initialConfig, null, 2));

// Create test handoff assignments file (empty for now)
const assignmentsPath = path.join(dataDir, 'handoff-assignments.jsonl');
if (!fs.existsSync(assignmentsPath)) {
  fs.writeFileSync(assignmentsPath, '');
  console.log(`2. Created empty assignments file at: ${assignmentsPath}`);
}

// Create test autotune state file
const statePath = path.join(dataDir, '.handoff-autotune-state-test.json');
const initialState = {
  last_run_ts: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago (outside cooldown)
  last_action: "noop",
  last_reason: "no_changes_needed",
  cooldown_until: Date.now() - (23 * 60 * 60 * 1000), // 23 hours ago
  actions_history: []
};

fs.writeFileSync(statePath, JSON.stringify(initialState, null, 2));
console.log(`3. Created test autotune state at: ${statePath}`);

// Test command
console.log('\n4. Test command to run autotune with runtime write enabled:');
console.log('   cd ' + __dirname);
console.log('   export CHATFLOW_OPS_AUTOTUNE=1');
console.log('   export CHATFLOW_OPS_AUTOTUNE_WRITE_RUNTIME=1');
console.log('   export CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH="' + runtimeConfigPath + '"');
console.log('   export CHATFLOW_OPS_AUTOTUNE_STATE_PATH="' + statePath + '"');
console.log('   export CHATFLOW_HANDOFF_ASSIGN_BALANCE="round_robin"');
console.log('   node scripts/run-handoff-autotune.mjs');

console.log('\n5. Expected behavior:');
console.log('   - Script runs without errors');
console.log('   - Logs: "Write runtime: YES (path: ...)"');
console.log('   - Since assignments file is empty, should suggest "no changes"');
console.log('   - Should NOT write to runtime config (no changes to apply)');

console.log('\n6. To test actual write, you would need:');
console.log('   - Real handoff-assignments.jsonl with data showing poor performance');
console.log('   - Conditions that trigger autotune suggestions (p90 > target*2 for 2+ days)');
console.log('   - Then autotune would suggest switching assign_balance to "least_recent"');
console.log('   - And write that change to runtime config if WRITE_RUNTIME=1');

console.log('\n7. Cleanup:');
console.log('   rm -f ' + runtimeConfigPath);
console.log('   rm -f ' + statePath);
console.log('   # Note: assignments file kept for future tests');

console.log('\n=== Manual Verification Steps ===');
console.log('1. Run autotune with WRITE_RUNTIME=0 (default) to see suggestions');
console.log('2. If suggestions appear, enable WRITE_RUNTIME=1 and run again');
console.log('3. Check that runtime config file is updated with only whitelisted keys');
console.log('4. Verify existing keys not being changed are preserved');
console.log('5. Send SIGHUP to running process: kill -HUP <pid>');
console.log('6. Verify handoff assignment behavior changes accordingly');