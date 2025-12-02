// Allowed origins for CORS
const allowedOrigins = [
    'http://localhost:8081',
    'http://localhost:3000',
    'https://pizzaurum--demo.expo.app',
    'https://pizzaurum.store',
    'https://www.pizzaurum.store'
];
// Get CORS headers based on request origin
export function getCorsHeaders(request) {
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
export function createCorsResponse(data, status = 200, request) {
    const corsHeaders = request ? getCorsHeaders(request) : {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    return new Response(JSON.stringify(data), {
        status,
        headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders)
    });
}
// Handle OPTIONS requests for CORS preflight
export function handleCorsOptions(request) {
    const corsHeaders = getCorsHeaders(request);
    return new Response(null, {
        status: 200,
        headers: corsHeaders
    });
}
//# sourceMappingURL=cors.js.map