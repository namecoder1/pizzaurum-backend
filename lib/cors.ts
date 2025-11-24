// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:3000',
  'https://pizzaurum--demo.expo.app',
  'https://pizzaurum.store',
  'https://www.pizzaurum.store'
];

// Get CORS headers based on request origin
export function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Helper function to create CORS response
export function createCorsResponse(data: any, status: number = 200, request?: Request) {
  const corsHeaders = request ? getCorsHeaders(request) : {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

// Handle OPTIONS requests for CORS preflight
export function handleCorsOptions(request: Request) {
  const corsHeaders = getCorsHeaders(request);
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}
