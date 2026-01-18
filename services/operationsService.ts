import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";
import { db, deepClean, serverTimestamp } from "./firebase";
import { getNextOccurrenceDate } from "../constants";
import { TaskStatus } from "../types";
import { authService } from "./authService";

export const operationsService = {
    // PRODUCTS
    addProduct: async (p: any) => (await addDoc(collection(db, "products"), { ...deepClean(p), createdAt: serverTimestamp() })).id,
    updateProduct: (p: any) => updateDoc(doc(db, "products", p.id), { ...deepClean(p), updatedAt: serverTimestamp() }),
    deleteProduct: (id: string) => deleteDoc(doc(db, "products", id)),

    // WAREHOUSES
    addWarehouse: async (w: any) => (await addDoc(collection(db, "warehouses"), { ...deepClean(w), createdAt: serverTimestamp(), active: true })).id,
    updateWarehouse: (w: any) => updateDoc(doc(db, "warehouses", w.id), { ...deepClean(w), updatedAt: serverTimestamp() }),
    deleteWarehouse: (id: string) => deleteDoc(doc(db, "warehouses", id)),

    // FRUSTRATION REASONS
    addFrustrationReason: async (r: any) => (await addDoc(collection(db, "frustrationReasons"), { ...deepClean(r), createdAt: serverTimestamp() })).id,
    updateFrustrationReason: (r: any) => updateDoc(doc(db, "frustrationReasons", r.id), { ...deepClean(r), updatedAt: serverTimestamp() }),
    deleteFrustrationReason: (id: string) => deleteDoc(doc(db, "frustrationReasons", id)),

    // GOALS
    addGoal: (g: any) => addDoc(collection(db, "goals"), { ...deepClean(g), createdAt: serverTimestamp() }),
    updateGoal: (g: any) => updateDoc(doc(db, "goals", g.id), { ...deepClean(g), updatedAt: serverTimestamp() }),
    deleteGoal: (id: string) => deleteDoc(doc(db, "goals", id)),

    // USERS
    addUser: async (u: any) => {
        // Extract password if present to prevent saving it to Firestore
        const { password, ...userData } = u;
        return authService.createUser(userData, password);
    },
    updateUser: (u: any) => updateDoc(doc(db, "users", u.id), { ...deepClean(u), updatedAt: serverTimestamp() }),
    deleteUser: (id: string) => deleteDoc(doc(db, "users", id)),

    // TASKS
    addTask: (t: any) => addDoc(collection(db, "tasks"), { ...deepClean(t), createdAt: serverTimestamp() }),
    updateTask: (t: any) => updateDoc(doc(db, "tasks", t.id), { ...deepClean(t), updatedAt: serverTimestamp() }),
    deleteTask: (id: string) => deleteDoc(doc(db, "tasks", id)),

    // This function has special logic for recurring tasks
    toggleTaskStatus: async (task: any, newStatus: TaskStatus) => {
        // task object is passed in full now, or we fetch it? 
        // In App.tsx it was (taskId, newStatus), but here we should probably pass the full task object or just ID.
        // However, the logic relies on task properties (isRecurring, deadline, recurrence).
        // Let's assume we pass the FULL task object + newStatus.

        // Note: The caller must provide the full task object.
        if (!task || !task.id) return;

        const updates: any = { status: newStatus, updatedAt: serverTimestamp() };

        if (newStatus === 'Concluída') {
            updates.completedAt = serverTimestamp();
        } else {
            updates.completedAt = null;
        }

        await updateDoc(doc(db, "tasks", task.id), updates);

        if (newStatus === 'Concluída' && task.isRecurring) {
            const nextDeadline = getNextOccurrenceDate(task.deadline, task.recurrence!);
            // Ensure the new recurring task doesn't inherit the completedAt
            const newTask = { ...task, deadline: nextDeadline, status: 'A fazer' as TaskStatus };
            delete (newTask as any).completedAt;

            await addDoc(collection(db, "tasks"), { ...deepClean(newTask), createdAt: serverTimestamp() });
        }
    }
};
