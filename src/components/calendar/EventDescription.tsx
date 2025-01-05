import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import DOMPurify from "dompurify";

interface EventDescriptionProps {
  description: string | null;
}

export const EventDescription = ({ description }: EventDescriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDescription = (text: string | null) => {
    if (!text) return '';
    
    // First, clean up any malformed URLs or duplicate content
    let cleanText = text.replace(/"\s*target="_blank".*?>/g, '">')
                       .replace(/(?:https?:\/\/[^\s]+)">(?:https?:\/\/[^\s]+)/g, (match) => {
                         // Extract just the first URL
                         const url = match.split('">')[0];
                         return `${url}">`;
                       });

    // Convert plain URLs to anchor tags
    const urlRegex = /(?<!["'])(https?:\/\/[^\s<]+)(?![^<]*>|[^<>]*<\/)/g;
    cleanText = cleanText.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Handle line breaks and preserve spacing
    const textWithBreaks = cleanText
      .replace(/\n/g, '<br>')
      .replace(/\s{2,}/g, match => '&nbsp;'.repeat(match.length));

    // Sanitize the HTML while allowing specific tags and attributes
    return DOMPurify.sanitize(textWithBreaks, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
    });
  };

  const sanitizedDescription = formatDescription(description);

  if (!sanitizedDescription) return null;

  return (
    <div className="relative">
      <div 
        className={`text-sm text-[#222222] prose prose-sm max-w-none 
          [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 
          [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800 
          [&_a]:transition-colors [&_br]:mb-2
          whitespace-pre-line ${!isExpanded ? 'line-clamp-3 sm:line-clamp-5' : ''}`}
        dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
      />
      {sanitizedDescription.split('<br>').length > 3 && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full sm:w-auto hover:bg-accent"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
};