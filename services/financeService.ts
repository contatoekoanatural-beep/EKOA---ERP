import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
} from "firebase/firestore";
import { db, deepClean, serverTimestamp } from "./firebase";

export const financeService = {
    // Ledgers
    addLedger: async (d: any) => (await addDoc(collection(db, "ledgers"), { ...deepClean(d), createdAt: serverTimestamp() })).id,
    updateLedger: (d: any) => updateDoc(doc(db, "ledgers", d.id), { ...deepClean(d), updatedAt: serverTimestamp() }),

    // Transactions
    addTransaction: async (t: any) => {
        // 1. Add Transaction
        const ref = await addDoc(collection(db, "transactions"), { ...deepClean(t), createdAt: serverTimestamp() });

        // 2. Increment Stock if Inventory purchase
        if (t.category === 'Estoque' && t.productId && t.productQuantity) {
            const prodRef = doc(db, "products", t.productId);
            const prodSnap = await getDoc(prodRef);
            if (prodSnap.exists()) {
                const pData = prodSnap.data();
                const currentStock = pData.stock || 0;
                const qty = Number(t.productQuantity);

                const updateData: any = { stock: currentStock + qty };

                // Handle Warehouse specific stock
                if (t.warehouseId) {
                    const currentMap = pData.stockByWarehouse || {};
                    updateData.stockByWarehouse = {
                        ...currentMap,
                        [t.warehouseId]: (currentMap[t.warehouseId] || 0) + qty
                    };
                }

                await updateDoc(prodRef, updateData);
            }
        }
        return ref.id;
    },

    updateTransaction: async (t: any) => {
        // 1. Fetch old transaction to calculate stock impact
        const txRef = doc(db, "transactions", t.id);
        const txSnap = await getDoc(txRef);
        const oldData = txSnap.exists() ? txSnap.data() : null;

        // 2. Update Transaction
        // Force productQuantity to be a number if it exists
        const sanitizedT = { ...deepClean(t), updatedAt: serverTimestamp() };
        if (sanitizedT.productQuantity) sanitizedT.productQuantity = Number(sanitizedT.productQuantity);

        await updateDoc(txRef, sanitizedT);

        // 3. Handle Stock Logic
        // Helper to safely get quantity
        const getQty = (d: any) => (d?.productQuantity && !isNaN(Number(d.productQuantity))) ? Number(d.productQuantity) : 0;
        const hasProd = (d: any) => !!d?.productId && d?.productId !== '';
        const isEstoque = (d: any) => d?.category === 'Estoque';

        const wasStock = isEstoque(oldData) && hasProd(oldData) && getQty(oldData) > 0;
        const isStock = isEstoque(t) && hasProd(t) && getQty(t) > 0;

        // Log for debugging
        console.log('Stock Update Debug:', {
            id: t.id,
            wasStock, isStock,
            oldQty: getQty(oldData), newQty: getQty(t),
            oldProd: oldData?.productId, newProd: t.productId
        });

        if (!wasStock && !isStock) return;

        // Case 1: Same Product, Update Check
        // Block removed to force full recalculation (Revert + Apply) 
        // This ensures stock syncs even if previously inconsistent.

        // Case 2: Product Changed or Category Toggled
        // Revert Old
        if (wasStock) {
            const oldProdRef = doc(db, "products", oldData.productId);
            const oldProdSnap = await getDoc(oldProdRef);
            if (oldProdSnap.exists()) {
                const pData = oldProdSnap.data();
                const currentStock = pData.stock || 0;
                const revertQty = getQty(oldData);
                console.log(`Reverting stock for ${oldData.productId}: -${revertQty}`);

                const updateData: any = { stock: Math.max(0, currentStock - revertQty) };
                if (oldData.warehouseId) {
                    const currentMap = pData.stockByWarehouse || {};
                    const currentWhStock = currentMap[oldData.warehouseId] || 0;
                    updateData.stockByWarehouse = {
                        ...currentMap,
                        [oldData.warehouseId]: Math.max(0, currentWhStock - revertQty)
                    };
                }
                await updateDoc(oldProdRef, updateData);
            }
        }

        // Apply New
        if (isStock) {
            const newProdRef = doc(db, "products", t.productId);
            const newProdSnap = await getDoc(newProdRef);
            if (newProdSnap.exists()) {
                const pData = newProdSnap.data();
                const currentStock = pData.stock || 0;
                const addQty = getQty(t);
                console.log(`Applying stock for ${t.productId}: +${addQty}`);

                const updateData: any = { stock: currentStock + addQty };
                if (t.warehouseId) {
                    const currentMap = pData.stockByWarehouse || {};
                    updateData.stockByWarehouse = {
                        ...currentMap,
                        [t.warehouseId]: (currentMap[t.warehouseId] || 0) + addQty
                    };
                }
                await updateDoc(newProdRef, updateData);
            }
        }
    },

    deleteTransaction: async (id: string) => {
        // 1. Get Transaction to check for stock impact
        const txRef = doc(db, "transactions", id);
        const txSnap = await getDoc(txRef);
        if (txSnap.exists()) {
            const data = txSnap.data();
            // 2. Revert Stock if it was an Inventory purchase
            if (data.category === 'Estoque' && data.productId && data.productQuantity) {
                const prodRef = doc(db, "products", data.productId);
                const prodSnap = await getDoc(prodRef);
                if (prodSnap.exists()) {
                    const pData = prodSnap.data();
                    const currentStock = pData.stock || 0;
                    const qty = Number(data.productQuantity);

                    const updateData: any = { stock: Math.max(0, currentStock - qty) };

                    if (data.warehouseId) {
                        const currentMap = pData.stockByWarehouse || {};
                        const currentWhStock = currentMap[data.warehouseId] || 0;
                        updateData.stockByWarehouse = {
                            ...currentMap,
                            [data.warehouseId]: Math.max(0, currentWhStock - qty)
                        };
                    }

                    await updateDoc(prodRef, updateData);
                }
            }
        }
        // 3. Delete
        await deleteDoc(txRef);
    },

    // New optimized status update
    updateFinanceStatus: async (id: string, newStatus: string) => {
        // Only update status and dates, NEVER touch stock
        const updateData: any = {
            status: newStatus,
            updatedAt: serverTimestamp()
        };

        if (newStatus === 'pago') {
            updateData.paidDate = new Date().toISOString().split('T')[0];
        }

        await updateDoc(doc(db, "transactions", id), updateData);
    },

    // Recurrences
    addRecurrence: async (r: any) => (await addDoc(collection(db, "recurrences"), { ...deepClean(r), createdAt: serverTimestamp() })).id,
    updateRecurrence: (r: any) => updateDoc(doc(db, "recurrences", r.id), { ...deepClean(r), updatedAt: serverTimestamp() }),
    deleteRecurrence: (id: string) => deleteDoc(doc(db, "recurrences", id)),

    // Cards
    addCard: async (d: any) => (await addDoc(collection(db, "cards"), { ...deepClean(d), createdAt: serverTimestamp() })).id,
    updateCard: (d: any) => updateDoc(doc(db, "cards", d.id), { ...deepClean(d), updatedAt: serverTimestamp() }),
    deleteCard: (id: string) => deleteDoc(doc(db, "cards", id)),

    // Transfer Logic (Strict Scope Bridge)
    addTransfer: async (data: {
        fromLedgerId: string;
        toLedgerId: string;
        amount: number;
        date: string;
        description: string;
    }) => {
        const transferGroupId = crypto.randomUUID();

        // 1. Outgoing Transaction (Source)
        const debitTx = {
            ledgerId: data.fromLedgerId,
            type: 'expense', // Money leaving
            origin: 'transfer',
            description: `Transf. para ${data.toLedgerId} - ${data.description}`,
            amount: data.amount,
            status: 'pago', // Transfers are immediate
            date: data.date,
            paidDate: data.date,
            referenceMonth: data.date.slice(0, 7),
            category: 'Transferência',
            transferGroupId,
            createdAt: serverTimestamp()
        };

        // 2. Incoming Transaction (Destination)
        const creditTx = {
            ledgerId: data.toLedgerId,
            type: 'income', // Money entering
            origin: 'transfer',
            description: `Transf. de ${data.fromLedgerId} - ${data.description}`,
            amount: data.amount,
            status: 'pago', // Transfers are immediate
            date: data.date,
            paidDate: data.date,
            referenceMonth: data.date.slice(0, 7),
            category: 'Transferência',
            transferGroupId,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "transactions"), deepClean(debitTx));
        await addDoc(collection(db, "transactions"), deepClean(creditTx));
    },

    // Debts
    addDebt: async (d: any) => (await addDoc(collection(db, "debts"), { ...deepClean(d), createdAt: serverTimestamp() })).id,
    updateDebt: (d: any) => updateDoc(doc(db, "debts", d.id), { ...deepClean(d), updatedAt: serverTimestamp() }),
    deleteDebt: (id: string) => deleteDoc(doc(db, "debts", id)),

    // Legacy aliases
    addDebtContract: async (d: any) => (await addDoc(collection(db, "debtContracts"), { ...deepClean(d), createdAt: serverTimestamp() })).id,
    updateDebtContract: (d: any) => updateDoc(doc(db, "debtContracts", d.id), { ...deepClean(d), updatedAt: serverTimestamp() }),
    deleteDebtContract: (id: string) => deleteDoc(doc(db, "debtContracts", id)),

    // Bank Accounts
    addBankAccount: async (a: any) => (await addDoc(collection(db, "bankAccounts"), { ...deepClean(a), createdAt: serverTimestamp() })).id,
    updateBankAccount: (a: any) => updateDoc(doc(db, "bankAccounts", a.id), { ...deepClean(a), updatedAt: serverTimestamp() }),
    deleteBankAccount: (id: string) => deleteDoc(doc(db, "bankAccounts", id)),

    // Opening Balances
    addOpeningBalance: async (d: any) => (await addDoc(collection(db, "openingBalances"), { ...deepClean(d), createdAt: serverTimestamp() })).id,
    updateOpeningBalance: (d: any) => updateDoc(doc(db, "openingBalances", d.id), { ...deepClean(d), updatedAt: serverTimestamp() }),

    // Fee Types
    addFeeType: async (f: any) => (await addDoc(collection(db, "feeTypes"), { ...deepClean(f), createdAt: serverTimestamp() })).id,
    updateFeeType: (f: any) => updateDoc(doc(db, "feeTypes", f.id), { ...deepClean(f), updatedAt: serverTimestamp() }),
    deleteFeeType: (id: string) => deleteDoc(doc(db, "feeTypes", id)),
};
