import { useState, useEffect, useCallback } from "react";
import { 
  loginWithEmail, 
  signupWithEmail, 
  logout as firebaseLogout, 
  resetPassword,
  onAuthChange,
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  User
} from "@/lib/firebase";
import { AppRole } from "@/types/facility";

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  facility: string;
  facilityId: string;
  role: AppRole;
  emailVerified: boolean;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  facilityId: string | null;
  facilityName: string | null;
  role: AppRole;
  createdAt: string;
  updatedAt: string;
}

const ONBOARDING_KEY = 'facility_onboarding_required';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const loadUserProfile = async (firebaseUser: User): Promise<AuthUser | null> => {
    try {
      const profileRef = doc(db, 'userProfiles', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profile = profileSnap.data() as UserProfile;
        
        if (!profile.facilityId) {
          // User exists but has no facility - needs onboarding
          setNeedsOnboarding(true);
          return {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: profile.displayName || firebaseUser.displayName || "Health Worker",
            facility: "",
            facilityId: "",
            role: "staff",
            emailVerified: firebaseUser.emailVerified,
          };
        }
        
        setNeedsOnboarding(false);
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: profile.displayName || firebaseUser.displayName || "Health Worker",
          facility: profile.facilityName || "Health Facility",
          facilityId: profile.facilityId,
          role: profile.role || "staff",
          emailVerified: firebaseUser.emailVerified,
        };
      } else {
        // No profile exists - create one and mark for onboarding
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "Health Worker",
          facilityId: null,
          facilityName: null,
          role: "staff",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await setDoc(profileRef, newProfile);
        setNeedsOnboarding(true);
        
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: newProfile.displayName,
          facility: "",
          facilityId: "",
          role: "staff",
          emailVerified: firebaseUser.emailVerified,
        };
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Fallback to basic user info
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "Health Worker",
        facility: "",
        facilityId: "",
        role: "staff",
        emailVerified: firebaseUser.emailVerified,
      };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const authUser = await loadUserProfile(firebaseUser);
        setUser(authUser);
      } else {
        setUser(null);
        setNeedsOnboarding(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      const authUser = await loadUserProfile(currentUser);
      setUser(authUser);
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
        // Create user profile (without facility - will be set during onboarding)
        const profileRef = doc(db, 'userProfiles', result.user.uid);
        await setDoc(profileRef, {
          uid: result.user.uid,
          email: email,
          displayName: name,
          facilityId: null,
          facilityName: null,
          role: "staff" as AppRole,
          pendingFacilityName: facility, // Store for onboarding
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        setNeedsOnboarding(true);
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
      setNeedsOnboarding(false);
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

  const updateFacility = useCallback(async (facilityId: string, facilityName: string, role?: AppRole) => {
    if (!user) return;
    
    try {
      const profileRef = doc(db, 'userProfiles', user.uid);
      await setDoc(profileRef, {
        facilityId,
        facilityName,
        role: role || user.role,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      setUser(prev => prev ? { 
        ...prev, 
        facilityId, 
        facility: facilityName,
        role: role || prev.role
      } : null);
      setNeedsOnboarding(false);
    } catch (error) {
      console.error('Error updating facility:', error);
      throw error;
    }
  }, [user]);

  const updateRole = useCallback(async (userId: string, newRole: AppRole) => {
    try {
      const profileRef = doc(db, 'userProfiles', userId);
      await setDoc(profileRef, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }, []);

  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
  }, []);

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    forgotPassword,
    updateFacility,
    updateRole,
    refreshUser,
    isAuthenticated: !!user,
    needsOnboarding,
    completeOnboarding,
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