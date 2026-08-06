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
import {
  setActiveFacility,
  clearActiveFacility,
  getActiveFacility,
  slugifyFacilityId,
  normalizeFacilityCode,
} from "@/lib/facilityConfig";

export const MAX_USERS_PER_FACILITY = 3;

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

export interface FacilitySignupInput {
  mode: 'create' | 'join';
  name?: string;
  code: string;
  district?: string;
  region?: string;
  address?: string;
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

async function countFacilityUsers(facilityId: string): Promise<number> {
  const snapshot = await getDocs(
    query(collection(db, 'userProfiles'), where('facilityId', '==', facilityId))
  );
  return snapshot.size;
}

async function facilityHasAdmin(facilityId: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(
      collection(db, 'userProfiles'),
      where('facilityId', '==', facilityId),
      where('role', '==', 'facility_admin')
    )
  );
  return !snapshot.empty;
}

// Loads a facility document and makes it the active facility for this session
async function activateFacility(facilityId: string, fallbackName?: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'facilities', facilityId));
    if (snap.exists()) {
      const data = snap.data() as any;
      setActiveFacility({
        id: snap.id,
        name: data.name,
        code: data.code,
        address: data.address,
        district: data.district,
        region: data.region,
      });
      return data.name as string;
    }
  } catch (err) {
    console.error('Error loading facility:', err);
  }
  if (fallbackName) {
    setActiveFacility({ ...getActiveFacility(), id: facilityId, name: fallbackName });
  }
  return fallbackName || getActiveFacility().name;
}

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
        const profile = profileSnap.data() as UserProfile & { pendingFacilityName?: string };

        if (!profile.facilityId) {
          // User is not attached to a facility yet
          setNeedsOnboarding(true);
          return {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: profile.displayName || firebaseUser.displayName || "Health Worker",
            facility: "",
            facilityId: "",
            role: profile.role || "staff",
            emailVerified: firebaseUser.emailVerified,
            pendingFacilityName: profile.pendingFacilityName,
          };
        }

        const facilityName = await activateFacility(profile.facilityId, profile.facilityName || undefined);
        setNeedsOnboarding(false);
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: profile.displayName || firebaseUser.displayName || "Health Worker",
          facility: profile.facilityName || facilityName,
          facilityId: profile.facilityId,
          role: profile.role || "staff",
          emailVerified: firebaseUser.emailVerified,
        };
      }

      // No profile document yet - create a shell profile and ask for a facility
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
    } catch (error) {
      console.error('Error loading user profile:', error);
      const cached = getActiveFacility();
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || "Health Worker",
        facility: cached.name,
        facilityId: cached.id,
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

  /**
   * Resolves the facility for a signup: either creates a brand new facility
   * (the signing-up user becomes its admin) or joins an existing one by code.
   */
  const resolveSignupFacility = async (input: FacilitySignupInput) => {
    const code = normalizeFacilityCode(input.code);
    if (!code) throw new Error('Please enter a facility code.');

    const existing = await getDocs(
      query(collection(db, 'facilities'), where('code', '==', code))
    );

    if (input.mode === 'join') {
      if (existing.empty) {
        throw new Error('No facility found with that code. Check with your facility admin.');
      }
      const docSnap = existing.docs[0];
      const data = docSnap.data() as any;

      const userCount = await countFacilityUsers(docSnap.id);
      if (userCount >= MAX_USERS_PER_FACILITY) {
        throw new Error(`${data.name} already has the maximum of ${MAX_USERS_PER_FACILITY} users.`);
      }

      const hasAdmin = await facilityHasAdmin(docSnap.id);
      setActiveFacility({
        id: docSnap.id,
        name: data.name,
        code: data.code,
        address: data.address,
        district: data.district,
        region: data.region,
      });
      return {
        facilityId: docSnap.id,
        facilityName: data.name as string,
        role: (hasAdmin ? 'staff' : 'facility_admin') as AppRole,
      };
    }

    // Create mode
    if (!input.name?.trim()) throw new Error('Please enter your facility name.');
    if (!existing.empty) {
      throw new Error('That facility code is already registered. Use "Join a facility" instead.');
    }

    const id = slugifyFacilityId(code, input.name);
    const now = new Date().toISOString();
    const facilityDoc = {
      id,
      name: input.name.trim().toUpperCase(),
      code,
      address: input.address?.trim() || '',
      district: input.district?.trim() || '',
      region: input.region?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'facilities', id), facilityDoc);
    setActiveFacility(facilityDoc);

    return {
      facilityId: id,
      facilityName: facilityDoc.name,
      role: 'facility_admin' as AppRole,
    };
  };

  const signup = useCallback(async (
    name: string,
    email: string,
    password: string,
    facilityInput: FacilitySignupInput
  ) => {
    try {
      setError(null);
      setLoading(true);

      // Validate / prepare the facility BEFORE creating the account
      const resolved = await resolveSignupFacility(facilityInput);

      const result = await signupWithEmail(email, password, name);

      if (result.user) {
        const profileRef = doc(db, 'userProfiles', result.user.uid);
        await setDoc(profileRef, {
          uid: result.user.uid,
          email,
          displayName: name,
          facilityId: resolved.facilityId,
          facilityName: resolved.facilityName,
          role: resolved.role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setNeedsOnboarding(false);
      }
    } catch (err: any) {
      const message = err?.code ? getAuthErrorMessage(err.code) : (err?.message || 'Signup failed.');
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
      clearActiveFacility();
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
      const nextRole = role || (await facilityHasAdmin(facilityId) ? 'staff' : 'facility_admin');
      const profileRef = doc(db, 'userProfiles', user.uid);
      await setDoc(profileRef, {
        facilityId,
        facilityName,
        role: nextRole,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      await activateFacility(facilityId, facilityName);

      setUser(prev => prev ? { 
        ...prev, 
        facilityId, 
        facility: facilityName,
        role: nextRole,
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

  // Make current user an admin of their own facility
  const makeCurrentUserAdmin = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    try {
      const profileRef = doc(db, 'userProfiles', user.uid);
      await setDoc(profileRef, {
        role: 'facility_admin',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      setUser(prev => prev ? { ...prev, role: 'facility_admin' } : null);
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
    needsOnboarding,
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
