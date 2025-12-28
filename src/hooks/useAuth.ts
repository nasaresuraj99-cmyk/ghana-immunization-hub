import { useState, useEffect, useCallback } from "react";
import { 
  loginWithEmail, 
  signupWithEmail, 
  logout as firebaseLogout, 
  resetPassword,
  onAuthChange,
  auth,
  User
} from "@/lib/firebase";

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  facility: string;
  emailVerified: boolean;
}

const FACILITY_KEY = 'user_facility';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser: User | null) => {
      if (firebaseUser) {
        const facility = localStorage.getItem(`${FACILITY_KEY}_${firebaseUser.uid}`) || "Health Facility";
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: firebaseUser.displayName || "Health Worker",
          facility,
          emailVerified: firebaseUser.emailVerified,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      const facility = localStorage.getItem(`${FACILITY_KEY}_${currentUser.uid}`) || "Health Facility";
      setUser({
        uid: currentUser.uid,
        email: currentUser.email || "",
        name: currentUser.displayName || "Health Worker",
        facility,
        emailVerified: currentUser.emailVerified,
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await loginWithEmail(email, password);
    } catch (err: any) {
      const message = getAuthErrorMessage(err.code);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (name: string, facility: string, email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const result = await signupWithEmail(email, password, name);
      if (result.user) {
        localStorage.setItem(`${FACILITY_KEY}_${result.user.uid}`, facility);
      }
    } catch (err: any) {
      const message = getAuthErrorMessage(err.code);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setError(null);
      await firebaseLogout();
    } catch (err: any) {
      setError("Failed to logout");
      throw err;
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      setError(null);
      await resetPassword(email);
    } catch (err: any) {
      const message = getAuthErrorMessage(err.code);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const updateFacility = useCallback((facility: string) => {
    if (user) {
      localStorage.setItem(`${FACILITY_KEY}_${user.uid}`, facility);
      setUser(prev => prev ? { ...prev, facility } : null);
    }
  }, [user]);

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    forgotPassword,
    updateFacility,
    refreshUser,
    isAuthenticated: !!user,
  };
}

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    default:
      return 'Authentication failed. Please try again.';
  }
}
