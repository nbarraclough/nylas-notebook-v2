// Convert Unix timestamp (seconds) to ISO string
export const unixToISO = (timestamp: number): string => {
  // Nylas uses seconds, JavaScript uses milliseconds
  return new Date(timestamp * 1000).toISOString();
};

// Convert ISO string to Unix timestamp (seconds)
export const isoToUnix = (isoString: string): number => {
  return Math.floor(new Date(isoString).getTime() / 1000);
};

// Safely handle timestamp conversion from Nylas API
export const safeTimestampToISO = (timestamp: number | null | undefined): string | null => {
  if (!timestamp) return null;
  try {
    // Basic validation for Unix timestamp (between 2020 and 2030)
    const minTimestamp = 1577836800; // 2020-01-01
    const maxTimestamp = 1893456000; // 2030-01-01
    
    if (timestamp < minTimestamp || timestamp > maxTimestamp) {
      console.error('Invalid Unix timestamp (outside reasonable range):', timestamp);
      return null;
    }
    return unixToISO(timestamp);
  } catch (error) {
    console.error('Error converting Unix timestamp:', timestamp, error);
    return null;
  }
};

// Handle timestamp input from either Nylas API or database
export const ensureValidTimestamp = (input: string | number | null | undefined): string | null => {
  if (!input) return null;
  
  try {
    // If it's a number, treat it as a Unix timestamp from Nylas
    if (typeof input === 'number') {
      return safeTimestampToISO(input);
    }
    
    // If it's a string (from our database), validate it's a proper ISO string
    if (typeof input === 'string') {
      const date = new Date(input);
      if (isNaN(date.getTime())) {
        console.error('Invalid ISO string:', input);
        return null;
      }
      return input;
    }
    
    console.error('Unsupported timestamp format:', input);
    return null;
  } catch (error) {
    console.error('Error processing timestamp:', input, error);
    return null;
  }
};