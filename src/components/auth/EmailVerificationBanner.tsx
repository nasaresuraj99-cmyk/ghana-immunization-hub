import { useState } from "react";
import { Mail, RefreshCw, CheckCircle, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EmailVerificationBannerProps {
  email: string;
  onRefresh: () => void;
}

export function EmailVerificationBanner({ email, onRefresh }: EmailVerificationBannerProps) {
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    if (cooldown > 0) return;
    
    setIsSending(true);
    try {
      await resendVerificationEmail();
      toast.success("Verification email sent! Please check your inbox.");
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        toast.error("Too many requests. Please wait before trying again.");
      } else {
        toast.error("Failed to send verification email. Please try again.");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-6 mb-6 shadow-elevation-2">
      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-accent/10 blur-2xl" />
      <div className="absolute -left-4 -bottom-4 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
      
      {/* GHS-inspired accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 gradient-ghs" />
      
      <div className="relative flex flex-col sm:flex-row items-start gap-4">
        {/* Icon with Ghana colors */}
        <div className="flex-shrink-0">
          <div className="relative">
            <div className="w-14 h-14 rounded-xl gradient-ghs flex items-center justify-center shadow-glow animate-pulse-slow">
              <Mail className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full gradient-gold flex items-center justify-center shadow-lg">
              <Sparkles className="w-3 h-3 text-accent-foreground" />
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="text-lg font-bold text-primary font-display flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Please verify your email address to secure your account
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              We've sent a verification link to <strong className="text-foreground">{email}</strong>. 
              Check your inbox and click the link to activate your account.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleResend}
              disabled={isSending || cooldown > 0}
              className={cn(
                "gap-2 transition-all duration-300",
                "gradient-ghs hover:shadow-glow text-primary-foreground border-0",
                (isSending || cooldown > 0) && "opacity-70"
              )}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                <>
                  <Mail className="w-4 h-4" />
                  Resend in {cooldown}s
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Resend Email
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={onRefresh}
              className="gap-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300"
            >
              <CheckCircle className="w-4 h-4 text-success" />
              I've Verified
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Shield className="w-3 h-3 text-primary" />
            Ghana Health Service - Secure Immunization Registry
          </p>
        </div>
      </div>
    </div>
  );
}
