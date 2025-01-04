import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Check, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface PublicLinkShareProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  isPasswordEnabled: boolean;
  onPasswordToggle: (enabled: boolean) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  isExpiryEnabled: boolean;
  onExpiryToggle: (enabled: boolean) => void;
  expiryDate: Date | undefined;
  onExpiryDateChange: (date: Date | undefined) => void;
  publicUrl: string | null;
  onCopyLink: () => void;
  isCopied: boolean;
}

export function PublicLinkShare({
  isEnabled,
  onToggle,
  isPasswordEnabled,
  onPasswordToggle,
  password,
  onPasswordChange,
  isExpiryEnabled,
  onExpiryToggle,
  expiryDate,
  onExpiryDateChange,
  publicUrl,
  onCopyLink,
  isCopied,
}: PublicLinkShareProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between space-x-2">
        <div className="space-y-0.5">
          <Label>Create Public Link</Label>
          <p className="text-sm text-muted-foreground">
            Generate a link that can be shared with anyone
          </p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggle}
        />
      </div>

      {isEnabled && (
        <div className="space-y-4 pl-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label>Password Protection</Label>
              <p className="text-sm text-muted-foreground">
                Require a password to view the recording
              </p>
            </div>
            <Switch
              checked={isPasswordEnabled}
              onCheckedChange={onPasswordToggle}
            />
          </div>

          {isPasswordEnabled && (
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
          )}

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label>Set Expiry Date</Label>
              <p className="text-sm text-muted-foreground">
                Link will expire after this date
              </p>
            </div>
            <Switch
              checked={isExpiryEnabled}
              onCheckedChange={onExpiryToggle}
            />
          </div>

          {isExpiryEnabled && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0" 
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <CalendarComponent
                  mode="single"
                  selected={expiryDate}
                  onSelect={onExpiryDateChange}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      )}

      {publicUrl && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <input
            type="text"
            value={publicUrl}
            readOnly
            className="flex-1 bg-transparent border-none focus:outline-none text-sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyLink}
            className="flex items-center gap-2"
          >
            {isCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {isCopied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      )}
    </div>
  );
}