import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from '../services/firebase';
import { User, UserAccess } from '../types';

interface AuthContextType {
    currentUser: User | null;
    profileReady: boolean;
    logout: () => void;
    can: (key: keyof UserAccess) => boolean;
}

const FULL_ACCESS: UserAccess = {
    dashboard: true,
    sales: true,
    marketing: true,
    finance: true,
    team: true,
    goals: true,
};

const RESTRICTED_ACCESS: UserAccess = {
    dashboard: true,
    sales: true,
    marketing: false,
    finance: false,
    team: false,
    goals: false,
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [profileReady, setProfileReady] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        return onAuthStateChanged(auth, (fUser) => {
            setFirebaseUser(fUser);
            if (!fUser) {
                setProfileReady(false);
                setAuthLoading(false);
                setCurrentUser(null);
            }
        });
    }, []);

    useEffect(() => {
        if (!firebaseUser) return;
        const initProfile = async () => {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userEmail = firebaseUser.email?.toLowerCase();
            const owners = ['mateus@ekoanatural.com'];
            const isOwner = owners.includes(userEmail || '');
            const docSnap = await getDoc(userDocRef);
            let userData: User;
            if (docSnap.exists()) {
                userData = { ...docSnap.data() as User, id: firebaseUser.uid };
            } else {
                userData = {
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || userEmail?.split('@')[0] || 'Novo Usuário',
                    email: userEmail || '',
                    role: isOwner ? 'admin' : 'staff',
                    isActive: true,
                    profile: isOwner ? 'ADMIN' : 'COLABORADOR',
                    access: isOwner ? FULL_ACCESS : RESTRICTED_ACCESS,
                    createdAt: serverTimestamp()
                };
                await setDoc(userDocRef, userData);
            }
            setCurrentUser(userData);
            setProfileReady(true);
            setAuthLoading(false);
        };
        initProfile();
    }, [firebaseUser]);

    const can = (key: keyof UserAccess): boolean => {
        if (!currentUser) return false;
        if (currentUser.profile === 'ADMIN') return true;
        return !!(currentUser.access && currentUser.access[key]);
    };

    const logout = () => signOut(auth);

    if (authLoading) return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
    );

    return (
        <AuthContext.Provider value={{ currentUser, profileReady, logout, can }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
