interface VideoDescriptionProps {
  description?: string | null;
}

export function VideoDescription({ description }: VideoDescriptionProps) {
  if (!description) return null;
  
  return (
    <div className="prose prose-sm max-w-none">
      <h3 className="text-lg font-medium">Description</h3>
      <p className="whitespace-pre-line">{description}</p>
    </div>
  );
}