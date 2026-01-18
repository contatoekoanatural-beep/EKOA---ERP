import { initializeApp, getApp, getApps } from "firebase/app";
import {
    getAuth,
    createUserWithEmailAndPassword,
    updatePassword,
    sendPasswordResetEmail,
    updateProfile
} from "firebase/auth";
import {
    doc,
    setDoc,
    serverTimestamp,
    collection,
    getDocs,
    query,
    where
} from "firebase/firestore";
import { db, firebaseConfig, deepClean } from "./firebase";
import { User } from "../types";

// Secondary App for Admin operations (Create User without logging out)
const SECONDARY_APP_NAME = "SecondaryApp";

const getSecondaryAuth = () => {
    let secondaryApp;
    if (getApps().some(app => app.name === SECONDARY_APP_NAME)) {
        secondaryApp = getApp(SECONDARY_APP_NAME);
    } else {
        secondaryApp = initializeApp(firebaseConfig, SECONDARY_APP_NAME);
    }
    return getAuth(secondaryApp);
};

export const authService = {
    // Create new user (Admin function)
    createUser: async (userData: any, password?: string) => {
        try {
            // If password is provided, create Auth User first
            // If no password, we can't create Auth User yet (legacy or invite flow?)
            // For now, we enforce password for new users or generate a temp one? 
            // The constraint is strict: Create Auth User.

            const tempPassword = password || Math.random().toString(36).slice(-8) + "Aa1!";

            // 1. Create User in Auth using Secondary App
            const secondaryAuth = getSecondaryAuth();
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userData.email, tempPassword);
            const firebaseUser = userCredential.user;

            // 2. Set Display Name
            await updateProfile(firebaseUser, {
                displayName: userData.name
            });

            // 3. Create User Document in Firestore with SAME ID
            const newUserData = {
                ...deepClean(userData),
                id: firebaseUser.uid,
                createdAt: serverTimestamp(),
                // Ensure critical fields match
                email: userData.email,
                role: userData.role || 'staff',
                isActive: true
            };

            await setDoc(doc(db, "users", firebaseUser.uid), newUserData);

            // 4. Sign out from secondary app to prevent context leak (optional, but good practice)
            await secondaryAuth.signOut();

            return firebaseUser.uid;

        } catch (error: any) {
            console.error("Error creating user:", error);
            throw new Error(error.message || "Falha ao criar usuário.");
        }
    },

    // Change Current User's Password
    changeCurrentPassword: async (currentUser: any, newPassword: string) => {
        const auth = getAuth(); // Main app auth
        if (!auth.currentUser) throw new Error("Usuário não autenticado.");

        await updatePassword(auth.currentUser, newPassword);
    },

    // Send Password Reset Email (for other users)
    sendResetEmail: async (email: string) => {
        const auth = getAuth();
        await sendPasswordResetEmail(auth, email);
    },

    // Update existing user data (Firestore only)
    updateUser: async (userData: Partial<User>) => {
        // This delegates to standard firestore update, but kept here for consistency if needed
        // For now, operationsService handles simple updates.
    }
};
