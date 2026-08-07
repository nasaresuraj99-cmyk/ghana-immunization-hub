import { useState, forwardRef } from "react";
import { Eye, EyeOff, Mail, Lock, User, Building, Hash, MapPin, Plus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { GHANA_REGIONS } from "@/lib/facilityConfig";
import type { FacilitySignupInput } from "@/hooks/useAuth";

interface SignupFormProps {
  onSignup: (name: string, email: string, password: string, facility: FacilitySignupInput) => void;
  onSwitchToLogin: () => void;
}

export const SignupForm = forwardRef<HTMLFormElement, SignupFormProps>(function SignupForm({ onSignup, onSwitchToLogin }, ref) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityCode, setFacilityCode] = useState("");
  const [district, setDistrict] = useState("");
  const [region, setRegion] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 6) strength++;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['', 'bg-destructive', 'bg-warning', 'bg-warning', 'bg-success', 'bg-success'];

  const suggestCode = () => {
    const initials = facilityName
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 6);
    setFacilityCode(initials || Math.random().toString(36).slice(2, 8).toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (mode === 'create' && (!facilityName.trim() || !facilityCode.trim() || !region)) {
      toast({
        title: "Facility details required",
        description: "Enter your facility name, code and region.",
        variant: "destructive",
      });
      return;
    }

    if (mode === 'join' && !facilityCode.trim()) {
      toast({ title: "Facility code required", description: "Enter the code your admin gave you.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await onSignup(name, email, password, {
        mode,
        name: facilityName,
        code: facilityCode,
        district,
        region,
      });
    } catch (error) {
      // errors are surfaced by the caller
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form ref={ref} onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'create' | 'join')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="text-xs sm:text-sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Register facility
          </TabsTrigger>
          <TabsTrigger value="join" className="text-xs sm:text-sm">
            <LogIn className="w-3.5 h-3.5 mr-1.5" /> Join facility
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        {mode === 'create'
          ? "Register your health facility. You become its administrator and can add up to 2 colleagues."
          : "Enter the facility code your facility administrator shared with you."}
      </p>

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      {mode === 'create' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="facility">Health Facility Name</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="facility"
                type="text"
                placeholder="e.g. FIAN URBAN CHPS"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                onBlur={() => { if (!facilityCode) suggestCode(); }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="district"
                  type="text"
                  placeholder="e.g. Daffiama Bussie Issa"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {GHANA_REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="facility-code">Facility Code</Label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="facility-code"
            type="text"
            placeholder={mode === 'create' ? "e.g. FUCHPS" : "Enter facility code"}
            value={facilityCode}
            onChange={(e) => setFacilityCode(e.target.value.toUpperCase())}
            className="pl-10 uppercase"
          />
        </div>
        {mode === 'create' && (
          <p className="text-xs text-muted-foreground">
            Share this code with your colleagues so they can join your facility.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="signup-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {password && (
          <div className="space-y-1">
            <div className="h-1 bg-muted rounded overflow-hidden">
              <div
                className={cn("h-full transition-all", strengthColors[passwordStrength])}
                style={{ width: `${(passwordStrength / 5) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Strength: {strengthLabels[passwordStrength]}</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-10 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Create Account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToLogin} className="text-primary font-medium hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
});

SignupForm.displayName = "SignupForm";
