/**
 * Creates an Error object with an attached HTTP status code and optional detail.
 * @param statusCode The HTTP status code for the error
 * @param message The error message
 * @param detail Optional additional detail about the error
 * @returns An Error object with statusCode and detail properties
 */
export declare const httpError: (statusCode: number, message: string, detail?: any) => Error;
/**
 * Throws a 400 error when a required condition is falsey.
 * Useful for compact input validation inside route handlers.
 * @param condition The condition to check
 * @param message The error message if the condition is falsey
 * @param detail Optional additional detail about the error
 * @throws An Error object with statusCode 400 if the condition is falsey
 */
export declare const requireField: (condition: any, message: string, detail?: any) => void;
/**
 * Re-throws existing HTTP errors or wraps unknown errors with a 500 status.
 * This keeps original status codes from upstream validations intact.
 * @param error The caught error
 * @param message Optional message to expose when wrapping unknown errors
 */
export declare const propagateError: (error: unknown, message?: string) => never;
//# sourceMappingURL=errors.d.ts.map