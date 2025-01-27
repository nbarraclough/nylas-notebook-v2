import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader, CheckCircle, XCircle } from "lucide-react";
import type { NotetakerActionsProps } from "./types";
import { cn } from "@/lib/utils";

export function NotetakerActions({ 
  notetakerId, 
  recordingId, 
  isKicking, 
  isRetrieving, 
  onKick, 
  onRetrieve 
}: NotetakerActionsProps) {
  const [kickStatus, setKickStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [retrieveStatus, setRetrieveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleKick = async () => {
    try {
      await onKick();
      setKickStatus('success');
      setTimeout(() => setKickStatus('idle'), 2000);
    } catch (error) {
      setKickStatus('error');
      setTimeout(() => setKickStatus('idle'), 2000);
    }
  };

  const handleRetrieve = async () => {
    try {
      await onRetrieve();
      setRetrieveStatus('success');
      setTimeout(() => setRetrieveStatus('idle'), 2000);
    } catch (error) {
      setRetrieveStatus('error');
      setTimeout(() => setRetrieveStatus('idle'), 2000);
    }
  };

  const getKickButtonContent = () => {
    if (isKicking) {
      return (
        <>
          <Loader className="h-4 w-4 animate-spin mr-2" />
          Kicking...
        </>
      );
    }

    if (kickStatus === 'success') {
      return (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Success
        </>
      );
    }

    if (kickStatus === 'error') {
      return (
        <>
          <XCircle className="h-4 w-4 mr-2" />
          Failed
        </>
      );
    }

    return 'Manual Kick';
  };

  const getRetrieveButtonContent = () => {
    if (isRetrieving) {
      return (
        <>
          <Loader className="h-4 w-4 animate-spin mr-2" />
          Retrieving...
        </>
      );
    }

    if (retrieveStatus === 'success') {
      return (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Success
        </>
      );
    }

    if (retrieveStatus === 'error') {
      return (
        <>
          <XCircle className="h-4 w-4 mr-2" />
          Failed
        </>
      );
    }

    return 'Retrieve Media';
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={kickStatus === 'error' ? 'destructive' : 'outline'}
        className={cn(
          kickStatus === 'success' && "bg-green-600 text-white hover:bg-green-700"
        )}
        size="sm"
        onClick={handleKick}
        disabled={isKicking}
      >
        {getKickButtonContent()}
      </Button>
      <Button
        variant={retrieveStatus === 'error' ? 'destructive' : 'outline'}
        className={cn(
          retrieveStatus === 'success' && "bg-green-600 text-white hover:bg-green-700"
        )}
        size="sm"
        onClick={handleRetrieve}
        disabled={isRetrieving}
      >
        {getRetrieveButtonContent()}
      </Button>
    </div>
  );
}