// Test script for handoff runtime config reload
const fs = require('fs');
const path = require('path');

// Create test config file
const testConfig = {
  assign_mode: "round_robin",
  owner_pool: ["agent-1", "agent-2", "agent-3"],
  agent_status: {
    "agent-1": "on",
    "agent-2": "off",
    "agent-3": "on"
  },
  assign_balance: "least_recent",
  assign_sticky_ttl_min: 60
};

const configPath = path.join(__dirname, 'data', 'handoff-assign-runtime.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Write config file
fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
console.log(`Test config written to: ${configPath}`);

// Test the config loading
console.log('\n=== Testing Handoff Runtime Config ===');
console.log('1. Set environment variable:');
console.log('   export CHATFLOW_HANDOFF_RUNTIME_CONFIG_PATH="' + configPath + '"');
console.log('\n2. Start the server:');
console.log('   npm start');
console.log('\n3. Send SIGHUP to reload config (Unix):');
console.log('   kill -HUP <pid>');
console.log('\n4. Expected behavior:');
console.log('   - Server logs: "[handoff-config] Runtime config path: ..."');
console.log('   - Server logs: "[handoff-config] Initial runtime config loaded"');
console.log('   - Server logs: "[handoff-config] SIGHUP handler registered (Unix)"');
console.log('   - On SIGHUP: "[handoff-config] Received SIGHUP, reloading runtime config"');
console.log('\n5. Test config values:');
console.log('   - assign_mode should be "round_robin" (overrides env default "single")');
console.log('   - owner_pool should be ["agent-1", "agent-2", "agent-3"]');
console.log('   - agent_status should map agent-1/3 to "on", agent-2 to "off"');
console.log('   - assign_balance should be "least_recent"');
console.log('   - assign_sticky_ttl_min should be 60 (overrides default 120)');
console.log('\n6. Priority test:');
console.log('   - Remove "assign_mode" from JSON file');
console.log('   - Send SIGHUP');
console.log('   - assign_mode should fallback to env CHATFLOW_HANDOFF_ASSIGN_MODE or default "single"');
console.log('\n7. File not found test:');
console.log('   - Delete config file');
console.log('   - Send SIGHUP');
console.log('   - Should log: "[handoff-config] Config file not found: ..., using env only"');
console.log('\n=== Cleanup ===');
console.log('rm -f ' + configPath);