// ──────────────────────────────────────────────────────────────
//  ERP Piratini — AuthContext
// ──────────────────────────────────────────────────────────────
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, COLLECTIONS } from '../services/firebase';
import type { UserProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const ref = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setProfile({ id: snap.id, ...(snap.data() as Omit<UserProfile, 'id'>) });
        } else {
          // Primeiro acesso — cria perfil básico
          const newProfile: Omit<UserProfile, 'id'> = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            displayName: firebaseUser.displayName ?? 'Usuário',
            photoURL: firebaseUser.photoURL ?? undefined,
            role: 'viewer',
            campaign_id: '',          // será atualizado após seleção de campanha
            campaigns: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: firebaseUser.uid,
          };
          await setDoc(ref, { ...newProfile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          setProfile({ id: ref.id, ...newProfile });
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, signInWithGoogle, logout }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
