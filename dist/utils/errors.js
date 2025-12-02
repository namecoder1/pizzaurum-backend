/**
 * Creates an Error object with an attached HTTP status code and optional detail.
 * @param statusCode The HTTP status code for the error
 * @param message The error message
 * @param detail Optional additional detail about the error
 * @returns An Error object with statusCode and detail properties
 */
export const httpError = (statusCode, message, detail) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    if (detail)
        err.detail = detail;
    return err;
};
/**
 * Throws a 400 error when a required condition is falsey.
 * Useful for compact input validation inside route handlers.
 * @param condition The condition to check
 * @param message The error message if the condition is falsey
 * @param detail Optional additional detail about the error
 * @throws An Error object with statusCode 400 if the condition is falsey
 */
export const requireField = (condition, message, detail) => {
    if (!condition) {
        throw httpError(400, message, detail);
    }
};
/**
 * Re-throws existing HTTP errors or wraps unknown errors with a 500 status.
 * This keeps original status codes from upstream validations intact.
 * @param error The caught error
 * @param message Optional message to expose when wrapping unknown errors
 */
export const propagateError = (error, message) => {
    var _a;
    if (error === null || error === void 0 ? void 0 : error.statusCode) {
        throw error;
    }
    const detail = (_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error;
    throw httpError(500, message || 'Internal Server Error', detail);
};
//# sourceMappingURL=errors.js.map