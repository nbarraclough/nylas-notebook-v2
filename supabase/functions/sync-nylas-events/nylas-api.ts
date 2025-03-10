
import { getUnixTime, startOfToday, addMonths, formatDate } from "./timestamp-utils.ts";

/**
 * Fetches events from Nylas API using the provided grant ID
 * 
 * @param grantId - The Nylas grant ID to use for authentication
 * @param startDate - Optional start date for events (defaults to today)
 * @param endDate - Optional end date for events (defaults to 3 months from today)
 * @param requestId - UUID for request tracking and logging
 * @returns Array of Nylas event objects
 */
export async function fetchNylasEvents(
  grantId: string, 
  startDate?: string, 
  endDate?: string,
  requestId?: string
) {
  console.log(`🔄 [${requestId}] Fetching events for grant ID: ${grantId}`);
  
  // Use production credentials directly
  const clientId = Deno.env.get('NYLAS_PROD_CLIENT_ID');
  const clientSecret = Deno.env.get('NYLAS_PROD_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing Nylas credentials');
  }
  
  // Calculate date range if not provided
  const start = startDate 
    ? new Date(startDate) 
    : startOfToday();
  
  const end = endDate 
    ? new Date(endDate) 
    : addMonths(startOfToday(), 3);
  
  // Convert to Unix timestamps (seconds)
  const startTimestamp = getUnixTime(start);
  const endTimestamp = getUnixTime(end);
  
  console.log(`🔍 [${requestId}] Fetching events from ${formatDate(start)} to ${formatDate(end)}`);
  
  // Build the Nylas API URL with appropriate parameters
  const apiUrl = `https://api.nylas.com/events`;
  const params = new URLSearchParams({
    start: startTimestamp.toString(),
    end: endTimestamp.toString(),
    calendar_id: 'primary', // Use primary calendar
    expand_recurring: 'true',  // Expand recurring events
    limit: '200', // Reasonable limit for single request
  }).toString();
  
  const url = `${apiUrl}?${params}`;
  
  try {
    // Make the request to Nylas API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'X-Nylas-Account-Key': grantId,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [${requestId}] Nylas API error (${response.status}):`, errorText);
      throw new Error(`Nylas API error: ${response.status} - ${errorText}`);
    }
    
    const events = await response.json();
    
    if (!Array.isArray(events)) {
      console.error(`❌ [${requestId}] Unexpected response format from Nylas:`, events);
      throw new Error('Invalid response format from Nylas API');
    }
    
    console.log(`✅ [${requestId}] Successfully fetched ${events.length} events from Nylas`);
    return events;
  } catch (error) {
    console.error(`❌ [${requestId}] Error fetching events from Nylas:`, error);
    throw error;
  }
}
