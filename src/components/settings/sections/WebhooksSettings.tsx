
import { useState } from "react";
import { PaginationControls } from "@/components/recurring/PaginationControls";
import { WebhookFilters } from "./webhooks/WebhookFilters";
import { WebhookLogsTable } from "./webhooks/WebhookLogsTable";
import { useWebhookLogs } from "./webhooks/useWebhookLogs";
import { ITEMS_PER_PAGE } from "./webhooks/types";

export function WebhooksSettings({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [webhookType, setWebhookType] = useState("all");
  const [status, setStatus] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: webhookLogs, isLoading } = useWebhookLogs({
    userId,
    search,
    currentPage,
    webhookType,
    status,
  });

  const toggleRow = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  const totalPages = webhookLogs ? Math.ceil(webhookLogs.totalCount / ITEMS_PER_PAGE) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Webhook Logs</h3>
        <p className="text-sm text-muted-foreground">
          View and search through webhook logs. Filter by type, status, and search across all fields.
        </p>
      </div>

      <WebhookFilters
        search={search}
        setSearch={setSearch}
        webhookType={webhookType}
        setWebhookType={setWebhookType}
        status={status}
        setStatus={setStatus}
      />

      <div className="border rounded-lg">
        <WebhookLogsTable
          logs={webhookLogs?.logs || []}
          isLoading={isLoading}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
        />

        {webhookLogs?.logs.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}

