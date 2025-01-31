import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

export interface NylasEvent {
  id: string;
  title: string;
  description?: string;
  start_time: number;
  end_time: number;
  participants?: Array<{email: string; name?: string}>;
  master_event_id?: string;
  original_start_time?: number;
  recurrence?: string[];
  organizer?: {
    email: string;
    name?: string;
  };
}

interface ProcessedInstance {
  instanceId: string;
  startTime: string;
  isModified: boolean;
}

// Track processed instances to prevent duplicates
const processedInstances = new Map<string, ProcessedInstance>();

export const isRecurringInstance = (event: NylasEvent): boolean => {
  return !event.recurrence && (
    !!event.master_event_id || // Has explicit master ID
    event.id.includes('_')     // Nylas format for instance IDs
  );
};

export const isModifiedInstance = (event: NylasEvent, masterEvent?: NylasEvent): boolean => {
  if (!isRecurringInstance(event)) return false;

  // Always consider events with original_start_time as modified
  if (event.original_start_time) return true;

  // If we have the master event, compare key properties
  if (masterEvent) {
    return (
      event.title !== masterEvent.title ||
      JSON.stringify(event.participants) !== JSON.stringify(masterEvent.participants)
    );
  }

  return false;
};

export const validateRecurringEvent = (event: NylasEvent, masterEvent?: NylasEvent): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (event.recurrence && event.master_event_id) {
    errors.push('Event cannot be both a master and an instance');
  }

  if (event.master_event_id && !event.start_time) {
    errors.push('Instance must have a start time');
  }

  if (masterEvent && !event.original_start_time) {
    // Regular instance should inherit most properties
    if (event.organizer?.email !== masterEvent.organizer?.email) {
      errors.push('Instance organizer does not match master');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const processRecurringEvent = async (
  event: NylasEvent,
  userId: string,
  supabaseUrl: string,
  supabaseKey: string,
  requestId?: string
): Promise<{ success: boolean; message: string }> => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const log = (message: string) => {
    console.log(`🔄 [${requestId || 'recurring'}] ${message}`);
  };

  try {
    // For master events
    if (event.recurrence) {
      log(`Processing master event: ${event.id}`);
      const { error } = await supabase
        .from('events')
        .upsert({
          user_id: userId,
          nylas_event_id: event.id,
          title: event.title,
          start_time: new Date(event.start_time * 1000).toISOString(),
          end_time: new Date(event.end_time * 1000).toISOString(),
          participants: event.participants || [],
          recurrence: event.recurrence,
          organizer: event.organizer || {},
          last_updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return { success: true, message: 'Master event processed' };
    }

    // For instances
    if (isRecurringInstance(event)) {
      const masterId = event.master_event_id || event.id.split('_')[0];
      const instanceKey = `${masterId}_${event.start_time}`;

      // Check if we've already processed this instance
      const existing = processedInstances.get(instanceKey);
      if (existing && !isModifiedInstance(event)) {
        log(`Skipping duplicate instance: ${event.id}`);
        return { success: true, message: 'Duplicate instance skipped' };
      }

      // Get master event if available
      const { data: masterEvent } = await supabase
        .from('events')
        .select('*')
        .eq('nylas_event_id', masterId)
        .single();

      // Validate the instance
      const validation = validateRecurringEvent(event, masterEvent);
      if (!validation.valid) {
        log(`Invalid instance ${event.id}: ${validation.errors.join(', ')}`);
        return { success: false, message: validation.errors.join(', ') };
      }

      // Process the instance
      const instanceData = isModifiedInstance(event, masterEvent) 
        ? {
            // Modified instance gets its own data
            user_id: userId,
            nylas_event_id: event.id,
            title: event.title,
            start_time: new Date(event.start_time * 1000).toISOString(),
            end_time: new Date(event.end_time * 1000).toISOString(),
            participants: event.participants || [],
            master_event_id: masterId,
            original_start_time: event.original_start_time 
              ? new Date(event.original_start_time * 1000).toISOString()
              : null,
            organizer: event.organizer || {},
            last_updated_at: new Date().toISOString()
          }
        : {
            // Regular instance inherits from master
            user_id: userId,
            nylas_event_id: event.id,
            title: masterEvent?.title || event.title,
            start_time: new Date(event.start_time * 1000).toISOString(),
            end_time: new Date(event.end_time * 1000).toISOString(),
            participants: masterEvent?.participants || event.participants || [],
            master_event_id: masterId,
            organizer: masterEvent?.organizer || event.organizer || {},
            last_updated_at: new Date().toISOString()
          };

      const { error } = await supabase
        .from('events')
        .upsert(instanceData);

      if (error) throw error;

      // Track this instance
      processedInstances.set(instanceKey, {
        instanceId: event.id,
        startTime: instanceData.start_time,
        isModified: isModifiedInstance(event, masterEvent)
      });

      return { success: true, message: 'Instance processed successfully' };
    }

    return { success: true, message: 'Not a recurring event' };

  } catch (error) {
    log(`Error processing recurring event: ${error.message}`);
    return { success: false, message: error.message };
  }
};

export const cleanupOrphanedInstances = async (
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ success: boolean; message: string }> => {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Find instances without valid masters
    const { data: orphanedInstances, error: findError } = await supabase
      .from('events')
      .select('id, nylas_event_id, master_event_id')
      .not('master_event_id', 'is', null)
      .not('master_event_id', 'eq', '');

    if (findError) throw findError;

    const orphans = [];
    for (const instance of orphanedInstances || []) {
      const { data: master } = await supabase
        .from('events')
        .select('id')
        .eq('nylas_event_id', instance.master_event_id)
        .single();

      if (!master) {
        orphans.push(instance.id);
      }
    }

    if (orphans.length > 0) {
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .in('id', orphans);

      if (deleteError) throw deleteError;
    }

    return {
      success: true,
      message: `Cleaned up ${orphans.length} orphaned instances`
    };

  } catch (error) {
    return {
      success: false,
      message: `Cleanup failed: ${error.message}`
    };
  }
};