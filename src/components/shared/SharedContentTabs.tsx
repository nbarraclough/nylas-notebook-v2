import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SharedContentTabsProps {
  description: string | null;
}

export function SharedContentTabs({ description }: SharedContentTabsProps) {
  return (
    <Tabs defaultValue="summary" className="w-full">
      <TabsList>
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="transcript">Transcript</TabsTrigger>
        <TabsTrigger value="action-items">Action Items</TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="mt-4">
        <div className="prose prose-sm max-w-none">
          {description || 'No summary available.'}
        </div>
      </TabsContent>
      <TabsContent value="transcript" className="mt-4">
        <div className="text-muted-foreground">
          Transcript will be available soon.
        </div>
      </TabsContent>
      <TabsContent value="action-items" className="mt-4">
        <div className="text-muted-foreground">
          No action items have been identified yet.
        </div>
      </TabsContent>
    </Tabs>
  );
}