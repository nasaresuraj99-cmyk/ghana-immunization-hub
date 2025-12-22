import { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => void;
  onBack: () => void;
}

export function ForgotPasswordForm({ onSubmit, onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(email);
      toast({
        title: "Success",
        description: "Password reset email sent. Please check your inbox.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold">Reset Password</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your email to receive a password reset link
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="reset-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending..." : "Reset Password"}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onBack}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Login
      </Button>
    </form>
  );
}
