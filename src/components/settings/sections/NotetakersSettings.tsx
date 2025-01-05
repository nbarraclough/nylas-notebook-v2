import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react"; // Added this import
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader } from "lucide-react";

interface NotetakerRecord {
  id: string;
  notetaker_id: string;
  event: {
    title: string;
    start_time: string;
  };
}

export function NotetakersSettings({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [isKicking, setIsKicking] = useState<{ [key: string]: boolean }>({});
  const [isRetrieving, setIsRetrieving] = useState<{ [key: string]: boolean }>({});

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['notetakers', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          id,
          notetaker_id,
          event:events (
            title,
            start_time
          )
        `)
        .eq('user_id', userId)
        .not('notetaker_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as NotetakerRecord[];
    },
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Notetakers</h2>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Notetaker ID</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recordings?.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-mono text-sm">
                  {record.notetaker_id}
                </TableCell>
                <TableCell>{record.event.title}</TableCell>
                <TableCell>
                  {format(new Date(record.event.start_time), "MMM d, yyyy 'at' h:mm a")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManualKick(record.notetaker_id, record.id)}
                      disabled={isKicking[record.id]}
                    >
                      {isKicking[record.id] ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin mr-2" />
                          Kicking...
                        </>
                      ) : (
                        'Manual Kick'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetrieveMedia(record.id, record.notetaker_id)}
                      disabled={isRetrieving[record.id]}
                    >
                      {isRetrieving[record.id] ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin mr-2" />
                          Retrieving...
                        </>
                      ) : (
                        'Retrieve Media'
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {recordings?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No notetakers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}