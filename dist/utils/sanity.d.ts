/**
 * Cleans all string properties in an object by removing invisible Unicode characters
 * @param obj - The object to clean
 * @returns The cleaned object
 */
export declare function cleanObjectStrings(obj: any): any;
/**
 * Cleans product names by removing invisible Unicode characters
 * @param name - The product name to clean
 * @returns The cleaned product name
 */
export declare function cleanProductName(name: string): string;
/**
 * Alternative cleaning function that removes all non-printable characters
 * @param name - The product name to clean
 * @returns The cleaned product name
 */
export declare function cleanProductNameAggressive(name: string): string;
//# sourceMappingURL=sanity.d.ts.map