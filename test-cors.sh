#!/bin/bash

echo "Testing CORS configuration..."
echo "================================"

# Test 1: Simple GET request from the production frontend domain
echo "Test 1: GET request to /api/health"
curl -H "Origin: https://www.sochai.store" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://backend-soch-production.up.railway.app/api/health \
     -v

echo -e "\n\nTest 2: POST request to /api/auth/google-signin (preflight)"
curl -H "Origin: https://www.sochai.store" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type, Authorization" \
     -X OPTIONS \
     https://backend-soch-production.up.railway.app/api/auth/google-signin \
     -v

echo -e "\n\nTest 3: Actual GET request to /api/cors-test"
curl -H "Origin: https://www.sochai.store" \
     -X GET \
     https://backend-soch-production.up.railway.app/api/cors-test \
     -v

echo -e "\n\nTesting complete!"