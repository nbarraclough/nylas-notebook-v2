
import { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function ExternalLink({ className, children, ...props }: ComponentPropsWithoutRef<"a">) {
  return (
    <a 
      target="_blank"
      rel="noopener noreferrer"
      className={cn("text-primary hover:underline", className)}
      {...props}
    >
      {children}
    </a>
  );
}
