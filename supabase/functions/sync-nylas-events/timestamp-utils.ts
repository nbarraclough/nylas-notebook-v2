// Convert Unix timestamp (seconds) to ISO string with validation
export const safeTimestampToISO = (timestamp: number | null | undefined): string | null => {
  if (!timestamp) return null;
  try {
    // Check if timestamp is within valid range (1970 to 2100)
    if (timestamp < 0 || timestamp > 4102444800) { // 4102444800 is 2100-01-01
      console.error('Invalid timestamp value:', timestamp);
      return null;
    }
    // Convert seconds to milliseconds for Date constructor
    return new Date(timestamp * 1000).toISOString();
  } catch (error) {
    console.error('Error converting timestamp:', timestamp, error);
    return null;
  }
};

// Safely handle ISO string or timestamp input
export const ensureValidTimestamp = (input: string | number | null | undefined): string | null => {
  if (!input) return null;
  
  try {
    // If it's already an ISO string, validate it
    if (typeof input === 'string') {
      const date = new Date(input);
      if (isNaN(date.getTime())) {
        console.error('Invalid ISO string:', input);
        return null;
      }
      return input;
    }
    
    // If it's a number, treat it as a Unix timestamp
    return safeTimestampToISO(input);
  } catch (error) {
    console.error('Error processing timestamp:', input, error);
    return null;
  }
};