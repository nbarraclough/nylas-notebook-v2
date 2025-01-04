import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { QueueCard } from "@/components/queue/QueueCard";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { NotetakerQueue } from "@/integrations/supabase/types/notetaker-queue";

export default function Queue() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  const { data: queueItems, isLoading, error, refetch } = useQuery({
    queryKey: ['queue', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('notetaker_queue')
        .select(`
          *,
          event:events (
            title,
            description,
            start_time,
            end_time,
            conference_url,
            participants,
            organizer
          )
        `)
        .eq('user_id', userId)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data as (NotetakerQueue & { event: any })[];
    },
    enabled: !!userId,
  });

  const handleProcessQueue = async () => {
    try {
      setIsProcessing(true);
      const { error } = await supabase.functions.invoke('process-notetaker-queue');
      
      if (error) throw error;
      
      toast({
        title: "Queue Processing Started",
        description: "The notetaker queue is being processed. Check back in a few moments.",
      });
      
      // Refetch the queue items after a short delay to show updated status
      setTimeout(() => {
        refetch();
      }, 2000);
      
    } catch (error) {
      console.error('Error processing queue:', error);
      toast({
        title: "Error Processing Queue",
        description: "There was an error processing the queue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Recording Queue</h1>
            <Button disabled variant="outline">
              <Play className="mr-2 h-4 w-4" />
              Process Queue
            </Button>
          </div>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Recording Queue</h1>
            <Button disabled variant="outline">
              <Play className="mr-2 h-4 w-4" />
              Process Queue
            </Button>
          </div>
          <div className="text-red-500">
            Error loading queue items. Please try again later.
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Recording Queue</h1>
          <Button 
            variant="outline"
            onClick={handleProcessQueue}
            disabled={isProcessing}
          >
            <Play className="mr-2 h-4 w-4" />
            {isProcessing ? "Processing..." : "Process Queue"}
          </Button>
        </div>
        {queueItems && queueItems.length > 0 ? (
          <div className="grid gap-4">
            {queueItems.map((item) => (
              <QueueCard key={item.id} queueItem={item} />
            ))}
          </div>
        ) : (
          <div className="text-gray-500">
            No recordings currently queued.
          </div>
        )}
      </div>
    </PageLayout>
  );
}