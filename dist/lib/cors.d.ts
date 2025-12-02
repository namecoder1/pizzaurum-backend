export declare function getCorsHeaders(request: Request): {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Allow-Credentials': string;
};
export declare function createCorsResponse(data: any, status?: number, request?: Request): Response;
export declare function handleCorsOptions(request: Request): Response;
//# sourceMappingURL=cors.d.ts.map