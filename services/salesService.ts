import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
} from "firebase/firestore";
import { db, deepClean, serverTimestamp } from "./firebase";
import { Sale } from "../types";

export const salesService = {
    addSale: async (s: any) => {
        // 1. Add Sale
        const saleRef = await addDoc(collection(db, "sales"), { ...deepClean(s), createdAt: serverTimestamp() });

        // 2. Decrement Stock
        if (s.productId) {
            // Fetch current product to get latest stock
            const prodRef = doc(db, "products", s.productId);
            const prodSnap = await getDoc(prodRef);
            if (prodSnap.exists()) {
                const currentStock = prodSnap.data().stock || 0;
                const qtySold = s.quantity || 1;
                await updateDoc(prodRef, { stock: Math.max(0, currentStock - qtySold) });
            }
        }
        return saleRef.id;
    },

    updateSale: (s: any) => updateDoc(doc(db, "sales", s.id), { ...deepClean(s), updatedAt: serverTimestamp() }),

    deleteSale: async (id: string) => {
        // 1. Get Sale to know quantity
        const saleRef = doc(db, "sales", id);
        const saleSnap = await getDoc(saleRef);
        if (saleSnap.exists()) {
            const data = saleSnap.data();
            if (data.productId) {
                // 2. Revert Stock
                const prodRef = doc(db, "products", data.productId);
                const prodSnap = await getDoc(prodRef);
                if (prodSnap.exists()) {
                    const currentStock = prodSnap.data().stock || 0;
                    await updateDoc(prodRef, { stock: currentStock + (data.quantity || 1) });
                }
            }
        }
        // 3. Delete
        await deleteDoc(saleRef);
    }
};
