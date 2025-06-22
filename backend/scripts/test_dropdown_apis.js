// Test script for dropdown APIs
// Run this to check if the APIs are working

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000/api/assets';
const TEST_TOKEN = 'your_test_token_here'; // Replace with actual token

async function testDropdownAPIs() {
  console.log('🧪 Testing Dropdown APIs...\n');

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    // Test departments API
    console.log('1. Testing /departments API...');
    const departmentsRes = await fetch(`${BASE_URL}/departments`, { headers });
    console.log(`   Status: ${departmentsRes.status}`);
    
    if (departmentsRes.ok) {
      const departments = await departmentsRes.json();
      console.log(`   ✅ Success! Found ${departments.length} departments:`);
      departments.forEach(dept => {
        console.log(`      - ${dept.name_th} (ID: ${dept.id})`);
      });
    } else {
      console.log(`   ❌ Failed: ${departmentsRes.statusText}`);
    }
    console.log('');

    // Test locations API
    console.log('2. Testing /locations API...');
    const locationsRes = await fetch(`${BASE_URL}/locations`, { headers });
    console.log(`   Status: ${locationsRes.status}`);
    
    if (locationsRes.ok) {
      const locations = await locationsRes.json();
      console.log(`   ✅ Success! Found ${locations.length} locations:`);
      locations.forEach(loc => {
        console.log(`      - ${loc.name} (ID: ${loc.id})`);
      });
    } else {
      console.log(`   ❌ Failed: ${locationsRes.statusText}`);
    }
    console.log('');

    // Test users API
    console.log('3. Testing /users API...');
    const usersRes = await fetch(`${BASE_URL}/users`, { headers });
    console.log(`   Status: ${usersRes.status}`);
    
    if (usersRes.ok) {
      const users = await usersRes.json();
      console.log(`   ✅ Success! Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`      - ${user.name} (ID: ${user.id})`);
      });
    } else {
      console.log(`   ❌ Failed: ${usersRes.statusText}`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error testing APIs:', error.message);
  }
}

// Test without authentication
async function testWithoutAuth() {
  console.log('🔓 Testing APIs without authentication...\n');

  try {
    const departmentsRes = await fetch(`${BASE_URL}/departments`);
    console.log(`Departments API (no auth): ${departmentsRes.status}`);
    
    const locationsRes = await fetch(`${BASE_URL}/locations`);
    console.log(`Locations API (no auth): ${locationsRes.status}`);
    
    const usersRes = await fetch(`${BASE_URL}/users`);
    console.log(`Users API (no auth): ${usersRes.status}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting API Tests...\n');
  
  await testWithoutAuth();
  console.log('\n' + '='.repeat(50) + '\n');
  await testDropdownAPIs();
  
  console.log('\n✅ Tests completed!');
}

// Run if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testDropdownAPIs, testWithoutAuth }; 