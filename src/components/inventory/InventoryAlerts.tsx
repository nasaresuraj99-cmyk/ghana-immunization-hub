import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Package, 
  XCircle,
  ChevronRight
} from 'lucide-react';
import type { StockAlert } from '@/types/inventory';
import { format, parseISO } from 'date-fns';

interface InventoryAlertsProps {
  alerts: StockAlert[];
  onViewInventory?: (inventoryId: string) => void;
  maxAlerts?: number;
  compact?: boolean;
}

export function InventoryAlerts({ 
  alerts, 
  onViewInventory,
  maxAlerts = 10,
  compact = false
}: InventoryAlertsProps) {
  const displayAlerts = alerts.slice(0, maxAlerts);

  const getAlertIcon = (type: StockAlert['type']) => {
    switch (type) {
      case 'expired':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'out-of-stock':
        return <Package className="h-4 w-4 text-destructive" />;
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'near-expiry':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertBadge = (type: StockAlert['type']) => {
    switch (type) {
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'out-of-stock':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'critical':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Critical</Badge>;
      case 'near-expiry':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Expiring Soon</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Stock</Badge>;
      default:
        return <Badge variant="outline">Alert</Badge>;
    }
  };

  const getAlertBackground = (type: StockAlert['type']) => {
    switch (type) {
      case 'expired':
      case 'out-of-stock':
        return 'bg-destructive/10 border-destructive/30';
      case 'critical':
        return 'bg-orange-500/10 border-orange-500/30';
      case 'near-expiry':
      case 'low':
        return 'bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'bg-muted';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p>No stock alerts - all inventory levels are healthy!</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {displayAlerts.map((alert, index) => (
          <div
            key={`${alert.inventory_id}-${alert.type}-${index}`}
            className={`flex items-center gap-2 p-2 rounded-lg border ${getAlertBackground(alert.type)}`}
          >
            {getAlertIcon(alert.type)}
            <span className="text-sm flex-1 truncate">{alert.message}</span>
            {getAlertBadge(alert.type)}
          </div>
        ))}
        {alerts.length > maxAlerts && (
          <p className="text-sm text-muted-foreground text-center">
            +{alerts.length - maxAlerts} more alerts
          </p>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Stock Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {displayAlerts.map((alert, index) => (
              <div
                key={`${alert.inventory_id}-${alert.type}-${index}`}
                className={`p-3 rounded-lg border ${getAlertBackground(alert.type)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{alert.vaccine_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Batch: {alert.batch_number}
                      </p>
                      <p className="text-sm">{alert.message}</p>
                      {alert.expiry_date && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {format(parseISO(alert.expiry_date), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getAlertBadge(alert.type)}
                    {onViewInventory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewInventory(alert.inventory_id)}
                        className="h-7 text-xs"
                      >
                        View
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        {alerts.length > maxAlerts && (
          <p className="text-sm text-muted-foreground text-center mt-3">
            Showing {maxAlerts} of {alerts.length} alerts
          </p>
        )}
      </CardContent>
    </Card>
  );
}
