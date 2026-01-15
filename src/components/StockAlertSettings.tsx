import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  BellOff, 
  AlertTriangle, 
  AlertCircle, 
  Trash2, 
  RefreshCw,
  Settings,
  Package,
  Calendar,
  TestTube
} from 'lucide-react';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import { format, parseISO } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function StockAlertSettings() {
  const {
    isSupported,
    permissionStatus,
    settings,
    alerts,
    enableAlerts,
    disableAlerts,
    updateThresholds,
    forceCheck,
    clearAlerts,
    dismissAlert,
    getAlertsSummary,
    sendTestNotification
  } = useStockAlerts();

  const [showSettings, setShowSettings] = useState(false);
  const [lowStock, setLowStock] = useState(settings.lowStockThreshold);
  const [criticalStock, setCriticalStock] = useState(settings.criticalStockThreshold);
  const [nearExpiryDays, setNearExpiryDays] = useState(settings.nearExpiryDays);

  const summary = getAlertsSummary();

  const handleToggle = async () => {
    if (settings.enabled) {
      disableAlerts();
    } else {
      await enableAlerts();
    }
  };

  const handleSaveThresholds = () => {
    updateThresholds(lowStock, criticalStock, nearExpiryDays);
    setShowSettings(false);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical_stock':
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'low_stock':
      case 'near_expiry':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'critical_stock':
        return 'Critical Stock';
      case 'low_stock':
        return 'Low Stock';
      case 'near_expiry':
        return 'Near Expiry';
      case 'expired':
        return 'Expired';
      default:
        return type;
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BellOff className="h-4 w-4" />
            Stock Alerts Not Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in this browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Stock Level Alerts
            {summary.critical > 0 && (
              <Badge variant="destructive" className="ml-2">
                {summary.critical} Critical
              </Badge>
            )}
            {summary.warnings > 0 && (
              <Badge className="bg-yellow-500 ml-1">
                {summary.warnings} Warnings
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.enabled}
              onCheckedChange={handleToggle}
              id="stock-alerts-toggle"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {settings.enabled ? 'Alerts enabled' : 'Alerts disabled'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={forceCheck}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Check Now
            </Button>
            <Button variant="outline" size="sm" onClick={sendTestNotification}>
              <TestTube className="h-3 w-3 mr-1" />
              Test
            </Button>
          </div>
        </div>

        {/* Settings */}
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              {showSettings ? 'Hide Settings' : 'Configure Thresholds'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="low-stock" className="text-xs">Low Stock</Label>
                <Input
                  id="low-stock"
                  type="number"
                  min="1"
                  value={lowStock}
                  onChange={(e) => setLowStock(parseInt(e.target.value) || 50)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="critical-stock" className="text-xs">Critical</Label>
                <Input
                  id="critical-stock"
                  type="number"
                  min="1"
                  value={criticalStock}
                  onChange={(e) => setCriticalStock(parseInt(e.target.value) || 20)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="expiry-days" className="text-xs">Expiry Days</Label>
                <Input
                  id="expiry-days"
                  type="number"
                  min="1"
                  value={nearExpiryDays}
                  onChange={(e) => setNearExpiryDays(parseInt(e.target.value) || 30)}
                  className="h-8"
                />
              </div>
            </div>
            <Button size="sm" onClick={handleSaveThresholds} className="w-full">
              Save Thresholds
            </Button>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Recent Alerts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Recent Alerts ({summary.total})</span>
            {alerts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAlerts}>
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No alerts yet. Stock levels are healthy!
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {summary.recent.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2 rounded-lg border text-sm ${
                      alert.severity === 'critical' 
                        ? 'bg-destructive/10 border-destructive/30' 
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {getAlertIcon(alert.type)}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {alert.vaccine}
                            <Badge variant="outline" className="text-xs">
                              {getAlertTypeLabel(alert.type)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(alert.createdAt), 'dd MMM yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {permissionStatus === 'denied' && (
          <div className="p-2 bg-destructive/10 rounded-lg text-sm text-destructive">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            Notifications are blocked. Please enable them in your browser settings.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
