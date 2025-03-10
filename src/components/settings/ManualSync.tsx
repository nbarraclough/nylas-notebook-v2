
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Play, CheckCircle } from "lucide-react";
import { useProfileData } from "@/components/library/video/useProfileData";

export const ManualSync = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeduplicate, setIsDeduplicate] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState("");
  const { data: profileData, isLoading: isProfileLoading } = useProfileData();

  const syncEvents = async () => {
    if (!userId) return;

    try {
      // Check if user has a Nylas grant ID first
      if (!profileData?.nylas_grant_id) {
        toast({
          title: "Error",
          description: "You need to connect your calendar first.",
          variant: "destructive",
        });
        return;
      }

      setIsSyncing(true);
      setSyncProgress(10);
      setSyncStatus("Initiating calendar sync...");
      console.log('Starting events sync...', {
        userId,
        grantId: profileData.nylas_grant_id
      });
      
      setSyncProgress(25);
      setSyncStatus("Fetching events from Nylas...");
      
      const { data, error } = await supabase.functions.invoke('sync-nylas-events', {
        body: { 
          user_id: userId,
          grant_id: profileData.nylas_grant_id
        }
      });

      if (error) {
        console.error('Error response from function:', error);
        throw new Error(`Sync failed: ${error.message || 'Unknown error'}`);
      }

      // Handle case where function returns success: false
      if (data && data.success === false) {
        throw new Error(data.error || 'Sync operation failed');
      }

      setSyncProgress(90);
      setSyncStatus("Processing complete, finalizing...");
      
      console.log('Sync completed:', data);
      
      setSyncProgress(100);
      setSyncStatus("Sync completed successfully!");

      toast({
        title: "Success",
        description: data?.results?.totalEvents 
          ? `Synced ${data.results.totalEvents} events and removed ${data.results.duplicatesRemoved} duplicates.`
          : "Calendar events synced successfully!",
      });
    } catch (error) {
      console.error('Error syncing events:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync calendar events. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Keep progress bar visible briefly so user can see completion
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
        setSyncStatus("");
      }, 2000);
    }
  };

  const processQueue = async () => {
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('process-notetaker-queue');
      
      if (error) throw error;
      
      toast({
        title: "Queue Processing Started",
        description: "The notetaker queue is being processed. Check back in a few moments.",
      });
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

  const runDeduplication = async () => {
    if (!userId) return;

    try {
      setIsDeduplicate(true);
      setSyncStatus("Running event deduplication...");
      
      console.log('Starting event deduplication for user:', userId);
      
      const { data, error } = await supabase.functions.invoke('deduplicate-events', {
        body: { user_id: userId }
      });
      
      if (error) {
        console.error('Error response from function:', error);
        throw new Error(`Deduplication failed: ${error.message || 'Unknown error'}`);
      }
      
      if (data && data.success === false) {
        throw new Error(data.message || 'Deduplication operation failed');
      }
      
      console.log('Deduplication completed:', data);
      
      toast({
        title: "Success",
        description: `Deduplication completed: ${data.result?.count || 0} duplicate events removed.`,
      });
    } catch (error) {
      console.error('Error deduplicating events:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deduplicate events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeduplicate(false);
      setSyncStatus("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button 
                onClick={syncEvents} 
                disabled={isSyncing}
                className="w-full !bg-[#0F172A] !text-white hover:!bg-[#0F172A]/90"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? "Syncing..." : "Sync Events"}
              </Button>
            </div>
            
            {isSyncing && (
              <div className="space-y-2">
                <Progress value={syncProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {syncStatus || "Syncing your calendar events..."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Queue Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <Button 
              onClick={processQueue} 
              disabled={isProcessing}
              className="w-full !bg-[#0F172A] !text-white hover:!bg-[#0F172A]/90"
            >
              <Play className="mr-2 h-4 w-4" />
              {isProcessing ? "Processing..." : "Process Queue"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fix Duplicate Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This tool safely fixes duplicate non-recurring events while preserving recurring event series.
            </p>
            <div className="flex justify-end">
              <Button 
                onClick={runDeduplication} 
                disabled={isDeduplicate}
                className="w-full !bg-[#0F172A] !text-white hover:!bg-[#0F172A]/90"
              >
                <CheckCircle className={`mr-2 h-4 w-4 ${isDeduplicate ? 'animate-spin' : ''}`} />
                {isDeduplicate ? "Running..." : "Fix Duplicates"}
              </Button>
            </div>
            
            {isDeduplicate && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                {syncStatus || "Processing event deduplication..."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
