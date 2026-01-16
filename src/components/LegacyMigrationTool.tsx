import { useState } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Building2,
  ArrowRight,
  Loader2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { db, collection, getDocs, doc, setDoc } from '@/lib/firebase';
import { isUuid } from '@/lib/validation';
import { useRolesSync } from '@/hooks/useRolesSync';
import { cn } from '@/lib/utils';

interface LegacyUser {
  id: string;
  displayName: string;
  email: string;
  facilityId: string;
  role: string;
  isLegacy: boolean;
}

interface LegacyFacility {
  id: string;
  name: string;
  code: string;
  isLegacy: boolean;
  userCount: number;
}

interface MigrationResult {
  type: 'facility' | 'user' | 'role';
  id: string;
  name: string;
  success: boolean;
  error?: string;
  newId?: string;
}

export function LegacyMigrationTool() {
  const { toast } = useToast();
  const { syncUserRole, syncUserProfile } = useRolesSync();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [legacyFacilities, setLegacyFacilities] = useState<LegacyFacility[]>([]);
  const [legacyUsers, setLegacyUsers] = useState<LegacyUser[]>([]);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);

  // Scan for legacy data
  const scanForLegacyData = async () => {
    setIsScanning(true);
    setScanComplete(false);
    setLegacyFacilities([]);
    setLegacyUsers([]);
    setMigrationResults([]);

    try {
      // Scan facilities in Firebase
      const facilitiesRef = collection(db, 'facilities');
      const facilitiesSnap = await getDocs(facilitiesRef);
      
      const facilities: LegacyFacility[] = [];
      const facilityUserCounts: Record<string, number> = {};

      // Count users per facility
      const usersRef = collection(db, 'userProfiles');
      const usersSnap = await getDocs(usersRef);
      
      usersSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.facilityId) {
          facilityUserCounts[data.facilityId] = (facilityUserCounts[data.facilityId] || 0) + 1;
        }
      });

      facilitiesSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const isLegacy = !isUuid(docSnap.id);
        facilities.push({
          id: docSnap.id,
          name: data.name || 'Unknown',
          code: data.code || '',
          isLegacy,
          userCount: facilityUserCounts[docSnap.id] || 0,
        });
      });

      setLegacyFacilities(facilities);

      // Scan users
      const users: LegacyUser[] = [];
      usersSnap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const facilityId = data.facilityId || '';
        const isLegacy = facilityId && !isUuid(facilityId);
        
        users.push({
          id: docSnap.id,
          displayName: data.displayName || 'Unknown',
          email: data.email || '',
          facilityId,
          role: data.role || 'staff',
          isLegacy,
        });
      });

      setLegacyUsers(users);
      setScanComplete(true);

      const legacyFacilityCount = facilities.filter(f => f.isLegacy).length;
      const legacyUserCount = users.filter(u => u.isLegacy).length;

      toast({
        title: 'Scan Complete',
        description: `Found ${legacyFacilityCount} legacy facilities and ${legacyUserCount} users with legacy facility IDs.`,
      });
    } catch (err: any) {
      console.error('Error scanning for legacy data:', err);
      toast({
        title: 'Scan Failed',
        description: err?.message || 'Failed to scan for legacy data.',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Migrate all legacy data
  const migrateAllLegacyData = async () => {
    setIsMigrating(true);
    setProgress(0);
    setMigrationResults([]);

    const results: MigrationResult[] = [];
    const legacyFacilitiesOnly = legacyFacilities.filter(f => f.isLegacy);
    const legacyUsersOnly = legacyUsers.filter(u => u.isLegacy);
    
    const totalItems = legacyFacilitiesOnly.length + legacyUsersOnly.length + legacyUsers.length;
    let completedItems = 0;

    try {
      // Mapping of old facility ID -> new facility ID
      const facilityIdMap: Record<string, string> = {};

      // Step 1: Migrate legacy facilities
      for (const facility of legacyFacilitiesOnly) {
        try {
          // Check if facility already exists in backend by code
          const { data: existing } = await supabase
            .from('facilities')
            .select('id')
            .eq('code', facility.code)
            .maybeSingle();

          let newFacilityId: string;

          if (existing) {
            newFacilityId = existing.id;
          } else {
            // Create new facility in backend
            const { data: created, error: createError } = await supabase
              .from('facilities')
              .insert({
                name: facility.name,
                code: facility.code || `LEGACY-${Date.now()}`,
                address: '',
              })
              .select('id')
              .single();

            if (createError) throw createError;
            newFacilityId = created.id;
          }

          facilityIdMap[facility.id] = newFacilityId;

          // Update Firebase facility with new UUID
          await setDoc(doc(db, 'facilities', newFacilityId), {
            id: newFacilityId,
            name: facility.name,
            code: facility.code,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          results.push({
            type: 'facility',
            id: facility.id,
            name: facility.name,
            success: true,
            newId: newFacilityId,
          });
        } catch (err: any) {
          results.push({
            type: 'facility',
            id: facility.id,
            name: facility.name,
            success: false,
            error: err?.message || 'Migration failed',
          });
        }

        completedItems++;
        setProgress(Math.round((completedItems / totalItems) * 100));
      }

      // Step 2: Update users with legacy facility IDs
      for (const user of legacyUsersOnly) {
        try {
          const newFacilityId = facilityIdMap[user.facilityId];
          
          if (newFacilityId) {
            // Update user profile in Firebase
            const profileRef = doc(db, 'userProfiles', user.id);
            await setDoc(profileRef, {
              facilityId: newFacilityId,
              updatedAt: new Date().toISOString(),
            }, { merge: true });

            results.push({
              type: 'user',
              id: user.id,
              name: user.displayName,
              success: true,
              newId: newFacilityId,
            });
          } else {
            results.push({
              type: 'user',
              id: user.id,
              name: user.displayName,
              success: false,
              error: 'No matching migrated facility found',
            });
          }
        } catch (err: any) {
          results.push({
            type: 'user',
            id: user.id,
            name: user.displayName,
            success: false,
            error: err?.message || 'Update failed',
          });
        }

        completedItems++;
        setProgress(Math.round((completedItems / totalItems) * 100));
      }

      // Step 3: Sync all user roles to backend
      for (const user of legacyUsers) {
        try {
          const facilityId = facilityIdMap[user.facilityId] || user.facilityId;
          
          if (facilityId && isUuid(facilityId)) {
            // Sync profile
            await syncUserProfile(
              user.id,
              user.displayName,
              user.email,
              facilityId
            );

            // Sync role
            await syncUserRole(
              user.id,
              facilityId,
              user.role as any
            );

            results.push({
              type: 'role',
              id: user.id,
              name: `${user.displayName} (${user.role})`,
              success: true,
            });
          }
        } catch (err: any) {
          results.push({
            type: 'role',
            id: user.id,
            name: `${user.displayName} (${user.role})`,
            success: false,
            error: err?.message || 'Role sync failed',
          });
        }

        completedItems++;
        setProgress(Math.round((completedItems / totalItems) * 100));
      }

      setMigrationResults(results);

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      toast({
        title: 'Migration Complete',
        description: `Successfully migrated ${successCount} items. ${failCount} failures.`,
        variant: failCount > 0 ? 'destructive' : 'default',
      });

      // Rescan after migration
      await scanForLegacyData();
    } catch (err: any) {
      console.error('Migration error:', err);
      toast({
        title: 'Migration Failed',
        description: err?.message || 'An error occurred during migration.',
        variant: 'destructive',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const legacyFacilityCount = legacyFacilities.filter(f => f.isLegacy).length;
  const legacyUserCount = legacyUsers.filter(u => u.isLegacy).length;
  const hasLegacyData = legacyFacilityCount > 0 || legacyUserCount > 0;

  return (
    <Card className="border shadow-elevation-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg gradient-ghs text-primary-foreground">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">Legacy Data Migration</CardTitle>
              <CardDescription className="text-xs">
                Migrate legacy facility IDs and sync roles to backend
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={scanForLegacyData}
            disabled={isScanning || isMigrating}
            className="gap-2"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isScanning ? 'Scanning...' : 'Scan'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!scanComplete && !isScanning && (
          <Alert>
            <AlertDescription className="text-sm">
              Click "Scan" to detect legacy facility IDs and users that need migration.
            </AlertDescription>
          </Alert>
        )}

        {scanComplete && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                "p-3 rounded-lg border",
                legacyFacilityCount > 0 ? "bg-warning/10 border-warning/30" : "bg-success/10 border-success/30"
              )}>
                <div className="flex items-center gap-2">
                  <Building2 className={cn(
                    "w-4 h-4",
                    legacyFacilityCount > 0 ? "text-warning" : "text-success"
                  )} />
                  <span className="text-sm font-medium">Facilities</span>
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{legacyFacilities.length}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({legacyFacilityCount} legacy)
                  </span>
                </div>
              </div>

              <div className={cn(
                "p-3 rounded-lg border",
                legacyUserCount > 0 ? "bg-warning/10 border-warning/30" : "bg-success/10 border-success/30"
              )}>
                <div className="flex items-center gap-2">
                  <Users className={cn(
                    "w-4 h-4",
                    legacyUserCount > 0 ? "text-warning" : "text-success"
                  )} />
                  <span className="text-sm font-medium">Users</span>
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{legacyUsers.length}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({legacyUserCount} legacy)
                  </span>
                </div>
              </div>
            </div>

            {/* Migration Button */}
            {hasLegacyData && (
              <div className="space-y-3">
                <Button
                  onClick={migrateAllLegacyData}
                  disabled={isMigrating}
                  className="w-full gap-2 gradient-ghs text-primary-foreground"
                >
                  {isMigrating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {isMigrating ? 'Migrating...' : 'Migrate All Legacy Data'}
                </Button>

                {isMigrating && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {progress}% complete
                    </p>
                  </div>
                )}
              </div>
            )}

            {!hasLegacyData && (
              <Alert className="bg-success/10 border-success/30">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-sm text-success">
                  All data is up to date. No legacy IDs found.
                </AlertDescription>
              </Alert>
            )}

            {/* Migration Results */}
            {migrationResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Migration Results
                </h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-1">
                    {migrationResults.map((result, idx) => (
                      <div
                        key={`${result.type}-${result.id}-${idx}`}
                        className={cn(
                          "flex items-center justify-between p-2 rounded text-xs",
                          result.success ? "bg-success/10" : "bg-destructive/10"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle className="w-3 h-3 text-success" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {result.type}
                          </Badge>
                          <span className="truncate max-w-[150px]">{result.name}</span>
                        </div>
                        {result.error && (
                          <span className="text-destructive truncate max-w-[100px]">
                            {result.error}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
