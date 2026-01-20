import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  AlertTriangle, 
  Package, 
  Settings, 
  Save,
  RefreshCw,
  Mail,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { GHANA_EPI_VACCINES, type VaccineInventory } from '@/types/inventory';
import { 
  db, 
  doc, 
  getDoc,
  setDoc 
} from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

interface VaccineThreshold {
  vaccine_name: string;
  minimum_stock: number;
  critical_stock: number;
  near_expiry_days: number;
}

interface StockReorderAlertsProps {
  inventory: VaccineInventory[];
  facilityId?: string;
}

const DEFAULT_THRESHOLDS = {
  minimum_stock: 50,
  critical_stock: 20,
  near_expiry_days: 30,
};

export function StockReorderAlerts({ inventory, facilityId }: StockReorderAlertsProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [defaultThresholds, setDefaultThresholds] = useState(DEFAULT_THRESHOLDS);
  const [vaccineThresholds, setVaccineThresholds] = useState<VaccineThreshold[]>([]);

  // Load settings from Firebase
  useEffect(() => {
    if (facilityId && open) {
      loadSettings();
    }
  }, [facilityId, open]);

  const loadSettings = async () => {
    if (!facilityId) return;
    
    setLoading(true);
    try {
      const settingsRef = doc(db, 'inventoryStockSettings', facilityId);
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setDefaultThresholds({
          minimum_stock: data.default_minimum_stock || 50,
          critical_stock: data.default_critical_stock || 20,
          near_expiry_days: data.near_expiry_warning_days || 30,
        });

        // Parse vaccine-specific settings
        if (data.vaccine_specific_settings && typeof data.vaccine_specific_settings === 'object') {
          const specific = data.vaccine_specific_settings as Record<string, VaccineThreshold>;
          setVaccineThresholds(Object.values(specific));
        }
      }

      // Initialize vaccine thresholds with defaults for any missing vaccines
      initializeVaccineThresholds();
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializeVaccineThresholds = useCallback(() => {
    const existingVaccines = new Set(vaccineThresholds.map(v => v.vaccine_name));
    const newThresholds = [...vaccineThresholds];
    
    GHANA_EPI_VACCINES.forEach(vaccine => {
      if (!existingVaccines.has(vaccine)) {
        newThresholds.push({
          vaccine_name: vaccine,
          minimum_stock: defaultThresholds.minimum_stock,
          critical_stock: defaultThresholds.critical_stock,
          near_expiry_days: defaultThresholds.near_expiry_days,
        });
      }
    });

    if (newThresholds.length !== vaccineThresholds.length) {
      setVaccineThresholds(newThresholds);
    }
  }, [vaccineThresholds, defaultThresholds]);

  useEffect(() => {
    if (open && vaccineThresholds.length === 0) {
      initializeVaccineThresholds();
    }
  }, [open, initializeVaccineThresholds, vaccineThresholds.length]);

  // Save settings to Firebase
  const saveSettings = async () => {
    if (!facilityId) {
      toast.error('Facility not found');
      return;
    }

    setSaving(true);
    try {
      // Convert vaccine thresholds to object
      const vaccineSettings: Record<string, VaccineThreshold> = {};
      vaccineThresholds.forEach(v => {
        vaccineSettings[v.vaccine_name] = v;
      });

      const now = new Date().toISOString();
      const settingsRef = doc(db, 'inventoryStockSettings', facilityId);
      
      await setDoc(settingsRef, {
        facility_id: facilityId,
        default_minimum_stock: defaultThresholds.minimum_stock,
        default_critical_stock: defaultThresholds.critical_stock,
        near_expiry_warning_days: defaultThresholds.near_expiry_days,
        critical_expiry_warning_days: 7,
        vaccine_specific_settings: vaccineSettings,
        updated_at: now,
      }, { merge: true });

      toast.success('Alert settings saved successfully');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Update vaccine threshold
  const updateVaccineThreshold = (
    vaccineName: string, 
    field: keyof VaccineThreshold, 
    value: number
  ) => {
    setVaccineThresholds(prev => prev.map(v => 
      v.vaccine_name === vaccineName ? { ...v, [field]: value } : v
    ));
  };

  // Apply defaults to all vaccines
  const applyDefaultsToAll = () => {
    setVaccineThresholds(prev => prev.map(v => ({
      ...v,
      minimum_stock: defaultThresholds.minimum_stock,
      critical_stock: defaultThresholds.critical_stock,
      near_expiry_days: defaultThresholds.near_expiry_days,
    })));
    toast.success('Applied default thresholds to all vaccines');
  };

  // Calculate current alerts
  const calculateAlerts = () => {
    const alerts: { vaccine: string; type: 'critical' | 'low' | 'expiring'; message: string }[] = [];
    const today = new Date();

    // Group inventory by vaccine
    const stockByVaccine: Record<string, number> = {};
    inventory.forEach(item => {
      stockByVaccine[item.vaccine_name] = (stockByVaccine[item.vaccine_name] || 0) + item.quantity;
    });

    // Check each vaccine against thresholds
    vaccineThresholds.forEach(threshold => {
      const currentStock = stockByVaccine[threshold.vaccine_name] || 0;

      if (currentStock <= threshold.critical_stock) {
        alerts.push({
          vaccine: threshold.vaccine_name,
          type: 'critical',
          message: `Critical: ${currentStock} doses (min: ${threshold.critical_stock})`
        });
      } else if (currentStock <= threshold.minimum_stock) {
        alerts.push({
          vaccine: threshold.vaccine_name,
          type: 'low',
          message: `Low stock: ${currentStock} doses (reorder at: ${threshold.minimum_stock})`
        });
      }
    });

    // Check for expiring vaccines
    inventory.forEach(item => {
      const expiryDate = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const threshold = vaccineThresholds.find(t => t.vaccine_name === item.vaccine_name);
      const nearExpiryDays = threshold?.near_expiry_days || defaultThresholds.near_expiry_days;

      if (daysUntilExpiry <= nearExpiryDays && daysUntilExpiry > 0 && item.quantity > 0) {
        alerts.push({
          vaccine: item.vaccine_name,
          type: 'expiring',
          message: `Batch ${item.batch_number}: ${daysUntilExpiry} days until expiry (${item.quantity} doses)`
        });
      }
    });

    return alerts;
  };

  const currentAlerts = calculateAlerts();
  const criticalCount = currentAlerts.filter(a => a.type === 'critical').length;
  const lowCount = currentAlerts.filter(a => a.type === 'low').length;
  const expiringCount = currentAlerts.filter(a => a.type === 'expiring').length;

  // Send test email notification (logs for now - can integrate with email service later)
  const sendTestNotification = async () => {
    if (!notificationEmail) {
      toast.error('Please enter an email address');
      return;
    }

    // Log the alert for now (email service can be added later)
    console.log('Stock alert notification:', {
      email: notificationEmail,
      alerts: currentAlerts,
      facilityName: user?.facility || 'Health Facility',
      testMode: true
    });
    
    toast.success('Test notification logged (email service can be configured later)');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Bell className="h-4 w-4 mr-2" />
          Reorder Alerts
          {(criticalCount > 0 || lowCount > 0) && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
            >
              {criticalCount + lowCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Stock Reorder Alerts
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Alerts Summary */}
            {currentAlerts.length > 0 && (
              <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    Current Alerts ({currentAlerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {criticalCount > 0 && (
                    <Badge variant="destructive">{criticalCount} Critical</Badge>
                  )}
                  {lowCount > 0 && (
                    <Badge className="bg-yellow-500 ml-2">{lowCount} Low Stock</Badge>
                  )}
                  {expiringCount > 0 && (
                    <Badge className="bg-orange-500 ml-2">{expiringCount} Expiring</Badge>
                  )}
                  <div className="mt-2 max-h-32 overflow-y-auto text-sm">
                    {currentAlerts.slice(0, 5).map((alert, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1">
                        {alert.type === 'critical' && <X className="h-3 w-3 text-red-500" />}
                        {alert.type === 'low' && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                        {alert.type === 'expiring' && <Package className="h-3 w-3 text-orange-500" />}
                        <span>{alert.vaccine}: {alert.message}</span>
                      </div>
                    ))}
                    {currentAlerts.length > 5 && (
                      <p className="text-muted-foreground">+{currentAlerts.length - 5} more alerts</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={alertsEnabled} 
                  onCheckedChange={setAlertsEnabled}
                />
                <Label>Enable stock alerts</Label>
              </div>
              <Button variant="outline" size="sm" onClick={applyDefaultsToAll}>
                Apply Defaults to All
              </Button>
            </div>

            {/* Default Thresholds */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Default Thresholds
                </CardTitle>
                <CardDescription>
                  Set default values that apply to all vaccines unless overridden
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Stock (Reorder Point)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={defaultThresholds.minimum_stock}
                      onChange={(e) => setDefaultThresholds(prev => ({
                        ...prev,
                        minimum_stock: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Critical Stock Level</Label>
                    <Input
                      type="number"
                      min="0"
                      value={defaultThresholds.critical_stock}
                      onChange={(e) => setDefaultThresholds(prev => ({
                        ...prev,
                        critical_stock: parseInt(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Near Expiry Warning (Days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={defaultThresholds.near_expiry_days}
                      onChange={(e) => setDefaultThresholds(prev => ({
                        ...prev,
                        near_expiry_days: parseInt(e.target.value) || 30
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Notifications */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Receive email alerts when stock falls below minimum levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={emailNotifications} 
                      onCheckedChange={setEmailNotifications}
                    />
                    <Label>Enable email notifications</Label>
                  </div>
                  {emailNotifications && (
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        placeholder="Enter notification email"
                        className="flex-1"
                      />
                      <Button variant="outline" onClick={sendTestNotification}>
                        Send Test
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Per-Vaccine Thresholds */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Per-Vaccine Thresholds
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vaccine</TableHead>
                    <TableHead className="text-right">Minimum Stock</TableHead>
                    <TableHead className="text-right">Critical Level</TableHead>
                    <TableHead className="text-right">Expiry Warning (Days)</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vaccineThresholds.map((threshold) => {
                    const currentStock = inventory
                      .filter(i => i.vaccine_name === threshold.vaccine_name)
                      .reduce((sum, i) => sum + i.quantity, 0);
                    
                    let status: 'ok' | 'low' | 'critical' = 'ok';
                    if (currentStock <= threshold.critical_stock) status = 'critical';
                    else if (currentStock <= threshold.minimum_stock) status = 'low';

                    return (
                      <TableRow key={threshold.vaccine_name}>
                        <TableCell className="font-medium">{threshold.vaccine_name}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            value={threshold.minimum_stock}
                            onChange={(e) => updateVaccineThreshold(
                              threshold.vaccine_name, 
                              'minimum_stock', 
                              parseInt(e.target.value) || 0
                            )}
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            value={threshold.critical_stock}
                            onChange={(e) => updateVaccineThreshold(
                              threshold.vaccine_name, 
                              'critical_stock', 
                              parseInt(e.target.value) || 0
                            )}
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="1"
                            value={threshold.near_expiry_days}
                            onChange={(e) => updateVaccineThreshold(
                              threshold.vaccine_name, 
                              'near_expiry_days', 
                              parseInt(e.target.value) || 30
                            )}
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {currentStock}
                        </TableCell>
                        <TableCell>
                          {status === 'critical' && <Badge variant="destructive">Critical</Badge>}
                          {status === 'low' && <Badge className="bg-yellow-500">Low</Badge>}
                          {status === 'ok' && <Badge className="bg-green-500"><Check className="h-3 w-3" /></Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
