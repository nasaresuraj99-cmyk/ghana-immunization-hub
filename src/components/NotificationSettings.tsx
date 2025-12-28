import { Bell, BellOff, BellRing, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Child } from "@/types/child";

interface NotificationSettingsProps {
  children: Child[];
}

export function NotificationSettings({ children }: NotificationSettingsProps) {
  const {
    isSupported,
    permissionStatus,
    settings,
    enableNotifications,
    disableNotifications,
    setDaysBefore,
    sendTestNotification,
    getUpcomingVaccines,
  } = usePushNotifications(children);

  const upcomingCount = getUpcomingVaccines().length;

  if (!isSupported) {
    return (
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">Notifications Not Supported</p>
            <p className="text-xs text-muted-foreground">
              Your browser doesn't support push notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings.enabled ? (
            <BellRing className="w-5 h-5 text-primary" />
          ) : (
            <Bell className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <Label htmlFor="notifications" className="font-medium">
              Push Notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Receive vaccine reminders on your device
            </p>
          </div>
        </div>
        <Switch
          id="notifications"
          checked={settings.enabled && permissionStatus === "granted"}
          onCheckedChange={(checked) => {
            if (checked) {
              enableNotifications();
            } else {
              disableNotifications();
            }
          }}
        />
      </div>

      {permissionStatus === "denied" && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          <p className="font-medium">Notifications Blocked</p>
          <p className="text-xs mt-1">
            Please enable notifications in your browser settings to receive vaccine reminders.
          </p>
        </div>
      )}

      {settings.enabled && permissionStatus === "granted" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="reminder-days" className="text-sm">
                Remind me before
              </Label>
              <p className="text-xs text-muted-foreground">
                Days before vaccine is due
              </p>
            </div>
            <Select
              value={settings.daysBefore.toString()}
              onValueChange={(value) => setDaysBefore(parseInt(value))}
            >
              <SelectTrigger id="reminder-days" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="2">2 days</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {upcomingCount > 0 && (
            <div className="bg-primary/10 rounded-lg p-3">
              <p className="text-sm font-medium text-primary">
                {upcomingCount} vaccine{upcomingCount > 1 ? "s" : ""} due within {settings.daysBefore} days
              </p>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={sendTestNotification}
            className="w-full"
          >
            <TestTube className="w-4 h-4 mr-2" />
            Send Test Notification
          </Button>
        </>
      )}
    </div>
  );
}
