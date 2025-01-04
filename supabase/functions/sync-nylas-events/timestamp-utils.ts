// Convert Unix timestamp (seconds) to ISO string with validation
export const safeTimestampToISO = (timestamp: number | null | undefined): string | null => {
  if (!timestamp) return null;
  try {
    // Check if timestamp is within valid range (1970 to 2100)
    if (timestamp < 0 || timestamp > 4102444800) { // 4102444800 is 2100-01-01
      console.error('Invalid timestamp value:', timestamp);
      return null;
    }
    return new Date(timestamp * 1000).toISOString();
  } catch (error) {
    console.error('Error converting timestamp:', timestamp, error);
    return null;
  }
};