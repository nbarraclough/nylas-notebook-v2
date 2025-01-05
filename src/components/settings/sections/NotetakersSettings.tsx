import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NotetakersTable } from "./notetakers/NotetakersTable";
import { useNotetakers } from "./notetakers/useNotetakers";

export function NotetakersSettings({ userId }: { userId: string }) {
  console.log('NotetakersSettings rendering with userId:', userId);
  
  const { toast } = useToast();
  const [isKicking, setIsKicking] = useState<{ [key: string]: boolean }>({});
  const [isRetrieving, setIsRetrieving] = useState<{ [key: string]: boolean }>({});
  const { data: recordings, isLoading, error } = useNotetakers(userId);

  console.log('NotetakersSettings state:', { 
    userId,
    recordings,
    isLoading,
    error,
    isKicking,
    isRetrieving
  });

  const handleManualKick = async (notetakerId: string, recordingId: string) => {
    try {
      setIsKicking(prev => ({ ...prev, [recordingId]: true }));
      
      const { error } = await supabase.functions.invoke('kick-notetaker', {
        body: { notetakerId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manual kick initiated successfully",
      });
    } catch (error) {
      console.error('Error kicking notetaker:', error);
      toast({
        title: "Error",
        description: "Failed to kick notetaker. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsKicking(prev => ({ ...prev, [recordingId]: false }));
    }
  };

  const handleRetrieveMedia = async (recordingId: string, notetakerId: string) => {
    try {
      setIsRetrieving(prev => ({ ...prev, [recordingId]: true }));

      const { data, error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId,
          notetakerId
        },
      });

      if (error) {
        const errorBody = JSON.parse(error.message);
        if (errorBody?.error === 'MEDIA_NOT_READY') {
          toast({
            title: "Media Not Ready",
            description: "The recording is still being processed. Please try again in a few moments.",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Success",
        description: "Media retrieved successfully",
      });
    } catch (error: any) {
      console.error('Error retrieving media:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to retrieve media. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRetrieving(prev => ({ ...prev, [recordingId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-100 rounded w-full" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error) {
    console.error('Error in NotetakersSettings:', error);
    return (
      <div className="text-red-500">
        Error loading notetakers: {error.message}
      </div>
    );
  }

  if (!recordings || recordings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Notetakers</h2>
        </div>
        <div className="text-muted-foreground">
          No notetakers found. This could mean either:
          <ul className="list-disc list-inside mt-2">
            <li>You haven't sent any notetakers to meetings yet</li>
            <li>Your notetakers haven't joined any meetings yet</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Notetakers</h2>
      </div>

      <NotetakersTable
        recordings={recordings}
        isKicking={isKicking}
        isRetrieving={isRetrieving}
        onKick={handleManualKick}
        onRetrieve={handleRetrieveMedia}
      />
    </div>
  );
}
