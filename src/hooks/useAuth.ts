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
import { FACILITY_CONFIG } from "@/lib/facilityConfig";

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  facility: string;
  facilityId: string;
  role: AppRole;
  emailVerified: boolean;
  pendingFacilityName?: string;
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

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Ensure FIAN URBAN CHPS facility exists in Firebase
  const ensureFacilityExists = async () => {
    try {
      const facilityRef = doc(db, 'facilities', FACILITY_CONFIG.id);
      const facilitySnap = await getDoc(facilityRef);
      
      if (!facilitySnap.exists()) {
        // Create the facility if it doesn't exist
        await setDoc(facilityRef, {
          id: FACILITY_CONFIG.id,
          name: FACILITY_CONFIG.name,
          code: FACILITY_CONFIG.code,
          address: FACILITY_CONFIG.address,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log('FIAN URBAN CHPS facility created');
      }
    } catch (error) {
      console.error('Error ensuring facility exists:', error);
    }
  };

  // Check if user is the first/only admin for the facility
  const checkAndAssignAdminRole = async (userId: string): Promise<AppRole> => {
    try {
      const usersRef = collection(db, 'userProfiles');
      const adminQuery = query(
        usersRef, 
        where('facilityId', '==', FACILITY_CONFIG.id),
        where('role', '==', 'facility_admin')
      );
      const snapshot = await getDocs(adminQuery);
      
      // If no admins exist, make this user the admin
      if (snapshot.empty) {
        return 'facility_admin';
      }
      
      // Check if current user is already an admin
      const currentUserDoc = snapshot.docs.find(d => d.id === userId);
      if (currentUserDoc) {
        return 'facility_admin';
      }
      
      return 'staff';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return 'staff';
    }
  };

  const loadUserProfile = async (firebaseUser: User): Promise<AuthUser | null> => {
    try {
      // Ensure facility exists first
      await ensureFacilityExists();
      
      const profileRef = doc(db, 'userProfiles', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const profile = profileSnap.data() as UserProfile & { pendingFacilityName?: string };
        
        // If user has no facility or wrong facility, auto-assign to FIAN URBAN CHPS
        if (!profile.facilityId || profile.facilityId !== FACILITY_CONFIG.id) {
          // Determine role - first user becomes admin
          const role = await checkAndAssignAdminRole(firebaseUser.uid);
          
          // Update profile with correct facility
          await setDoc(profileRef, {
            ...profile,
            facilityId: FACILITY_CONFIG.id,
            facilityName: FACILITY_CONFIG.name,
            role: role,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          
          setNeedsOnboarding(false);
          return {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: profile.displayName || firebaseUser.displayName || "Health Worker",
            facility: FACILITY_CONFIG.name,
            facilityId: FACILITY_CONFIG.id,
            role: role,
            emailVerified: firebaseUser.emailVerified,
          };
        }
        
        setNeedsOnboarding(false);
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: profile.displayName || firebaseUser.displayName || "Health Worker",
          facility: profile.facilityName || FACILITY_CONFIG.name,
          facilityId: profile.facilityId,
          role: profile.role || "staff",
          emailVerified: firebaseUser.emailVerified,
        };
      } else {
        // No profile exists - create one with FIAN URBAN CHPS auto-assigned
        const role = await checkAndAssignAdminRole(firebaseUser.uid);
        
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "Health Worker",
          facilityId: FACILITY_CONFIG.id,
          facilityName: FACILITY_CONFIG.name,
          role: role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await setDoc(profileRef, newProfile);
        setNeedsOnboarding(false);
        
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: newProfile.displayName,
          facility: FACILITY_CONFIG.name,
          facilityId: FACILITY_CONFIG.id,
          role: role,
          emailVerified: firebaseUser.emailVerified,
        };
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Fallback to basic user info with FIAN URBAN CHPS
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "Health Worker",
        facility: FACILITY_CONFIG.name,
        facilityId: FACILITY_CONFIG.id,
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
        // Ensure facility exists
        await ensureFacilityExists();
        
        // Check if this should be admin
        const role = await checkAndAssignAdminRole(result.user.uid);
        
        // Create user profile with FIAN URBAN CHPS auto-assigned
        const profileRef = doc(db, 'userProfiles', result.user.uid);
        await setDoc(profileRef, {
          uid: result.user.uid,
          email: email,
          displayName: name,
          facilityId: FACILITY_CONFIG.id,
          facilityName: FACILITY_CONFIG.name,
          role: role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        // No onboarding needed - auto-assigned to FIAN URBAN CHPS
        setNeedsOnboarding(false);
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
        facilityId: FACILITY_CONFIG.id, // Always use FIAN URBAN CHPS
        facilityName: FACILITY_CONFIG.name,
        role: role || user.role,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      setUser(prev => prev ? { 
        ...prev, 
        facilityId: FACILITY_CONFIG.id, 
        facility: FACILITY_CONFIG.name,
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
      
      // If updating current user's role, refresh
      if (user && user.uid === userId) {
        setUser(prev => prev ? { ...prev, role: newRole } : null);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }, [user]);

  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
  }, []);

  // Make current user an admin (for existing users)
  const makeCurrentUserAdmin = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    try {
      const profileRef = doc(db, 'userProfiles', user.uid);
      await setDoc(profileRef, {
        role: 'facility_admin',
        facilityId: FACILITY_CONFIG.id,
        facilityName: FACILITY_CONFIG.name,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      setUser(prev => prev ? { 
        ...prev, 
        role: 'facility_admin',
        facilityId: FACILITY_CONFIG.id,
        facility: FACILITY_CONFIG.name
      } : null);
    } catch (error) {
      console.error('Error making user admin:', error);
      throw error;
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
    updateRole,
    refreshUser,
    isAuthenticated: !!user,
    needsOnboarding: false, // Never need onboarding - auto-assigned to FIAN URBAN CHPS
    completeOnboarding,
    makeCurrentUserAdmin,
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
