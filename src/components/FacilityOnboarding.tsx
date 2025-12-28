import { useState } from "react";
import { Building, Plus, UserPlus, Loader2, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useFacility } from "@/hooks/useFacility";
import { AppRole } from "@/types/facility";

interface FacilityOnboardingProps {
  userId: string;
  userName: string;
  pendingFacilityName?: string;
  onComplete: (facilityId: string, facilityName: string, role: AppRole) => void;
}

export function FacilityOnboarding({ userId, userName, pendingFacilityName, onComplete }: FacilityOnboardingProps) {
  const [facilityName, setFacilityName] = useState(pendingFacilityName || "");
  const [facilityCode, setFacilityCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const { createFacility, joinFacility } = useFacility(userId);

  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFacilityCode(code);
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!facilityName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a facility name",
        variant: "destructive",
      });
      return;
    }

    if (!facilityCode.trim()) {
      toast({
        title: "Error",
        description: "Please generate or enter a facility code",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const facilityId = await createFacility(facilityName, facilityCode);
      toast({
        title: "Facility Created!",
        description: `Your facility "${facilityName}" has been created. Share the code ${facilityCode} with your team.`,
      });
      onComplete(facilityId, facilityName, 'facility_admin');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create facility",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a facility code",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinFacility(joinCode);
      if (result) {
        toast({
          title: "Joined Facility!",
          description: `You have joined "${result.facilityName}".`,
        });
        onComplete(result.facilityId, result.facilityName, 'staff');
      } else {
        toast({
          title: "Error",
          description: "No facility found with this code. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join facility",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen gradient-ghs flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏥</div>
          <h1 className="text-2xl font-bold text-primary-foreground">Welcome, {userName}!</h1>
          <p className="text-primary-foreground/80 mt-2">
            Set up or join a health facility to get started
          </p>
        </div>

        <Card className="shadow-elevation-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Facility Setup
            </CardTitle>
            <CardDescription>
              Create a new facility or join an existing one with a code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create New
                </TabsTrigger>
                <TabsTrigger value="join" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Join Existing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-4 mt-4">
                <form onSubmit={handleCreateFacility} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="facility-name">Facility Name</Label>
                    <Input
                      id="facility-name"
                      placeholder="e.g., Korle Bu Teaching Hospital"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facility-code">Facility Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="facility-code"
                        placeholder="e.g., KBTH01"
                        value={facilityCode}
                        onChange={(e) => setFacilityCode(e.target.value.toUpperCase())}
                        className="uppercase"
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={generateCode}
                      >
                        Generate
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share this code with team members to let them join
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Facility
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    You will be the facility admin
                  </p>
                  <p className="text-muted-foreground">
                    As admin, you can manage users, delete records, and view activity logs.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="join" className="space-y-4 mt-4">
                <form onSubmit={handleJoinFacility} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="join-code">Facility Code</Label>
                    <Input
                      id="join-code"
                      placeholder="Enter the code from your admin"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="uppercase text-center text-lg tracking-widest"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ask your facility administrator for the code
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isJoining}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        Join Facility
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    You will join as staff
                  </p>
                  <p className="text-muted-foreground">
                    As staff, you can register children and record vaccinations.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-primary-foreground/60 text-xs mt-6">
          © {new Date().getFullYear()} Ghana Health Service
        </p>
      </div>
    </div>
  );
}