interface LibraryHeaderProps {
  recordingsCount: number;
}

export function LibraryHeader({ recordingsCount }: LibraryHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-sm text-muted-foreground">
          {recordingsCount} {recordingsCount === 1 ? 'recording' : 'recordings'} available
        </p>
      </div>
    </div>
  );
}