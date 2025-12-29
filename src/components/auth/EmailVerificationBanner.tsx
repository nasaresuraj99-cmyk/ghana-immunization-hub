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
    <div className="relative overflow-hidden rounded-xl border-2 border-ghs-gold/50 bg-gradient-to-br from-ghs-green/10 via-ghs-gold/5 to-ghs-red/5 p-6 mb-6 shadow-elevation-2">
      {/* Decorative elements */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-ghs-gold/20 blur-3xl" />
      <div className="absolute -left-8 -bottom-8 w-40 h-40 rounded-full bg-ghs-green/15 blur-3xl" />
      
      {/* GHS-inspired accent bar with Ghana flag colors */}
      <div className="absolute top-0 left-0 right-0 h-2 flex">
        <div className="flex-1 bg-ghs-red" />
        <div className="flex-1 bg-ghs-gold" />
        <div className="flex-1 bg-ghs-green" />
      </div>
      
      <div className="relative flex flex-col sm:flex-row items-start gap-5 pt-2">
        {/* Icon with Ghana colors */}
        <div className="flex-shrink-0">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-ghs-green via-ghs-green/90 to-ghs-green/80 flex items-center justify-center shadow-lg animate-pulse-slow">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-ghs-gold to-ghs-gold/80 flex items-center justify-center shadow-lg border-2 border-white">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-4">
          <div>
            <h4 className="text-xl font-bold text-ghs-green font-display flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Please verify your email address to secure your account
            </h4>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              We've sent a verification link to <strong className="text-foreground font-semibold">{email}</strong>. 
              Check your inbox (and spam folder) and click the link to activate your account.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleResend}
              disabled={isSending || cooldown > 0}
              size="lg"
              className={cn(
                "gap-2 transition-all duration-300 font-semibold",
                "bg-gradient-to-r from-ghs-green to-ghs-green/90 hover:from-ghs-green/90 hover:to-ghs-green text-white shadow-lg hover:shadow-xl",
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
              size="lg"
              onClick={onRefresh}
              className="gap-2 border-2 border-ghs-gold/50 hover:border-ghs-gold hover:bg-ghs-gold/10 transition-all duration-300 font-semibold"
            >
              <CheckCircle className="w-4 h-4 text-ghs-green" />
              I've Verified
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
            <Shield className="w-4 h-4 text-ghs-green" />
            <span className="font-medium">Ghana Health Service</span> - Secure Immunization Registry
          </p>
        </div>
      </div>
    </div>
  );
}
