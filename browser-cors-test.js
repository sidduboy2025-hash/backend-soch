// Test CORS from browser console
// Copy and paste this into your browser console on https://www.sochai.store

async function testCORS() {
  const baseURL = 'https://backend-soch-production.up.railway.app';
  
  console.log('Testing CORS configuration...');
  
  try {
    // Test 1: Simple GET request
    console.log('\n1. Testing GET request to /api/cors-test');
    const response1 = await fetch(`${baseURL}/api/cors-test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data1 = await response1.json();
    console.log('✅ GET request successful:', data1);
  } catch (error) {
    console.error('❌ GET request failed:', error);
  }
  
  try {
    // Test 2: POST request (like login)
    console.log('\n2. Testing POST request to /api/hello');
    const response2 = await fetch(`${baseURL}/api/hello`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    });
    const data2 = await response2.json();
    console.log('✅ POST request successful:', data2);
  } catch (error) {
    console.error('❌ POST request failed:', error);
  }
  
  try {
    // Test 3: Using fetch with credentials
    console.log('\n3. Testing POST with credentials to /api/hello');
    const response3 = await fetch(`${baseURL}/api/hello`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: true })
    });
    const data3 = await response3.json();
    console.log('✅ POST with credentials successful:', data3);
  } catch (error) {
    console.error('❌ POST with credentials failed:', error);
  }
  
  console.log('\nCORS testing complete!');
}

// Run the test
testCORS();