import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader, CheckCircle, XCircle } from "lucide-react";
import type { NotetakerActionsProps } from "./types";

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
      // Reset status after 2 seconds
      setTimeout(() => setKickStatus('idle'), 2000);
    } catch (error) {
      setKickStatus('error');
      // Reset status after 2 seconds
      setTimeout(() => setKickStatus('idle'), 2000);
    }
  };

  const handleRetrieve = async () => {
    try {
      await onRetrieve();
      setRetrieveStatus('success');
      // Reset status after 2 seconds
      setTimeout(() => setRetrieveStatus('idle'), 2000);
    } catch (error) {
      setRetrieveStatus('error');
      // Reset status after 2 seconds
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
        variant={kickStatus === 'success' ? 'success' : kickStatus === 'error' ? 'destructive' : 'outline'}
        size="sm"
        onClick={handleKick}
        disabled={isKicking}
      >
        {getKickButtonContent()}
      </Button>
      <Button
        variant={retrieveStatus === 'success' ? 'success' : retrieveStatus === 'error' ? 'destructive' : 'outline'}
        size="sm"
        onClick={handleRetrieve}
        disabled={isRetrieving}
      >
        {getRetrieveButtonContent()}
      </Button>
    </div>
  );
}