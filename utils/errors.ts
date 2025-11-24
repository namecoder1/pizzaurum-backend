
/**
 * Creates an Error object with an attached HTTP status code and optional detail.
 * @param statusCode The HTTP status code for the error
 * @param message The error message
 * @param detail Optional additional detail about the error 
 * @returns An Error object with statusCode and detail properties
 */
export const httpError = (statusCode: number, message: string, detail?: any) => {
  const err = new Error(message);
  (err as any).statusCode = statusCode;
  if (detail) (err as any).detail = detail;
  return err;
}

/**
 * Throws a 400 error when a required condition is falsey.
 * Useful for compact input validation inside route handlers.
 * @param condition The condition to check
 * @param message The error message if the condition is falsey
 * @param detail Optional additional detail about the error
 * @throws An Error object with statusCode 400 if the condition is falsey
 */
export const requireField = (condition: any, message: string, detail?: any): void => {
  if (!condition) {
    throw httpError(400, message, detail);
  }
};
