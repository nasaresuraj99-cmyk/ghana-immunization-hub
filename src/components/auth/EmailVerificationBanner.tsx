import { useState } from "react";
import { Mail, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "@/lib/firebase";
import { toast } from "sonner";

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
      // Start 60 second cooldown
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
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-warning" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-warning">Verify Your Email</h4>
          <p className="text-sm text-muted-foreground mt-1">
            We've sent a verification link to <strong>{email}</strong>. 
            Please check your inbox and click the link to verify your account.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={isSending || cooldown > 0}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Email
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              I've Verified
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
