/**
 * Converts a Unix timestamp (in seconds) to an ISO string
 */
export function unixSecondsToISOString(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) {
    return null;
  }
  
  try {
    // Convert Unix seconds to milliseconds
    const milliseconds = unixSeconds * 1000;
    return new Date(milliseconds).toISOString();
  } catch (error) {
    console.error(`Error converting Unix seconds to ISO:`, {
      unixSeconds,
      error: error.message
    });
    return null;
  }
}

/**
 * Validates if a string is a valid ISO date string
 */
export function isValidISOString(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date.toISOString() === dateString;
  } catch {
    return false;
  }
}