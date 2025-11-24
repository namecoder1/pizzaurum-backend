/**
 * Cleans all string properties in an object by removing invisible Unicode characters
 * @param obj - The object to clean
 * @returns The cleaned object
 */
export function cleanObjectStrings(obj: any): any {
  if (typeof obj === "string") {
    // Rimuove caratteri Unicode invisibili
    return obj.replace(/[\u200B-\u200D\uFEFF\u2060-\u206F]/g, "").trim();
  } else if (Array.isArray(obj)) {
    return obj.map(cleanObjectStrings);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, cleanObjectStrings(v)])
    );
  }
  return obj;
}


/**
 * Cleans product names by removing invisible Unicode characters
 * @param name - The product name to clean
 * @returns The cleaned product name
 */
export function cleanProductName(name: string): string {
  if (!name) return name;
  
  // More aggressive cleaning - remove all invisible Unicode characters
  // This includes zero-width spaces, bidirectional marks, and other invisible characters
  const cleaned = name
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F]/g, '') // Standard invisible chars
    .replace(/[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180D\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0]/g, '') // Extended invisible chars
    .replace(/[\u2066\u2067\u2068\u2069]/g, '') // Additional bidirectional marks
    .trim(); // Remove leading/trailing whitespace
  
  return cleaned;
}

/**
 * Alternative cleaning function that removes all non-printable characters
 * @param name - The product name to clean
 * @returns The cleaned product name
 */
export function cleanProductNameAggressive(name: string): string {
  if (!name) return name;
  
  // Remove all characters that are not printable or are control characters
  const cleaned = name
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      // Keep printable characters (32-126) and some extended characters
      return code >= 32 && code <= 126 || 
             code >= 160 && code <= 255 ||
             code >= 0x0100 && code <= 0x017F; // Latin Extended-A
    })
    .join('')
    .trim();
  
  return cleaned;
}