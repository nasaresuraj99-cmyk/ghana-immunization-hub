import { useState, forwardRef } from "react";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import type { FacilitySignupInput } from "@/hooks/useAuth";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { Wifi, WifiOff, Sparkles, Building, Lock } from "lucide-react";

interface AuthScreenProps {
  onLogin: (email: string, password: string) => void;
  onSignup: (name: string, email: string, password: string, facility: FacilitySignupInput) => void;
  onForgotPassword: (email: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export const AuthScreen = forwardRef<HTMLDivElement, AuthScreenProps>(({ onLogin, onSignup, onForgotPassword }, ref) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const isOnline = navigator.onLine;

  return (
    <div className="min-h-screen gradient-ghs flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-accent rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-primary-foreground/30 rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Online/Offline indicator */}
        <div className={cn(
          "absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all",
          isOnline 
            ? "bg-success/20 text-success-foreground" 
            : "bg-warning/20 text-warning-foreground"
        )}>
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline Mode</span>
            </>
          )}
        </div>

        <div className="bg-card rounded-2xl shadow-elevation-3 p-8 animate-slide-up backdrop-blur-sm border border-border/50">
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <div className="text-6xl mb-4 animate-float">🏥</div>
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-accent animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Immunization Tracker</h1>
            
            {/* Facility Badge */}
            <div className="mt-3 inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full">
              <Building className="w-4 h-4" />
              <span className="text-sm font-semibold">For every health facility in Ghana</span>
            </div>
            
            <p className="text-muted-foreground text-sm mt-3 font-medium">
              Ghana Health Service
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              No Child Left Behind - 2030 EPI Agenda
            </p>
            
            {/* Restricted Access Notice */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <Lock className="w-3 h-3" />
              <span>Authorized Personnel Only</span>
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-1 p-1 mb-5 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={cn(
                  "py-2 text-sm font-medium rounded-md transition-colors",
                  mode === 'login' ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={cn(
                  "py-2 text-sm font-medium rounded-md transition-colors",
                  mode === 'signup' ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                )}
              >
                Create Account
              </button>
            </div>
          )}

          {mode === 'login' && (
            <>
              <LoginForm
                onLogin={onLogin}
                onForgotPassword={() => setMode('forgot')}
              />
              <p className="text-center text-sm text-muted-foreground mt-4">
                New facility?{' '}
                <button type="button" onClick={() => setMode('signup')} className="text-primary font-medium hover:underline">
                  Create an account
                </button>
              </p>
            </>
          )}



          {mode === 'signup' && (
            <SignupForm onSignup={onSignup} onSwitchToLogin={() => setMode('login')} />
          )}

          {mode === 'forgot' && (
            <ForgotPasswordForm
              onSubmit={onForgotPassword}
              onBack={() => setMode('login')}
            />
          )}
        </div>

        <p className="text-center text-primary-foreground/60 text-xs mt-6">
          © {new Date().getFullYear()} Ghana Health Service
        </p>
      </div>
    </div>
  );
});

AuthScreen.displayName = 'AuthScreen';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
