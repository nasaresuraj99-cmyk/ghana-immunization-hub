import { useState } from "react";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

interface AuthScreenProps {
  onLogin: (email: string, password: string) => void;
  onSignup: (name: string, facility: string, email: string, password: string) => void;
  onForgotPassword: (email: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthScreen({ onLogin, onSignup, onForgotPassword }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <div className="min-h-screen gradient-ghs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-elevation-3 p-8 animate-slide-up">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-pulse-slow">🏥</div>
          <h1 className="text-2xl font-bold text-primary">Immunization Tracker</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Ghana Health Service - No Child Left Behind
          </p>
        </div>

        {mode === 'login' && (
          <LoginForm
            onLogin={onLogin}
            onSwitchToSignup={() => setMode('signup')}
            onForgotPassword={() => setMode('forgot')}
          />
        )}

        {mode === 'signup' && (
          <SignupForm
            onSignup={onSignup}
            onSwitchToLogin={() => setMode('login')}
          />
        )}

        {mode === 'forgot' && (
          <ForgotPasswordForm
            onSubmit={onForgotPassword}
            onBack={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
}
