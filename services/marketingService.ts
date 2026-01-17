import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc
} from "firebase/firestore";
import { db, deepClean, serverTimestamp } from "./firebase";

export const marketingService = {
    addCampaign: async (d: any) => (await addDoc(collection(db, "campaigns"), { ...deepClean(d), createdAt: serverTimestamp(), status: 'Ativa' })).id,
    updateCampaign: (c: any) => updateDoc(doc(db, "campaigns", c.id), { ...deepClean(c), updatedAt: serverTimestamp() }),
    deleteCampaign: (id: string) => deleteDoc(doc(db, "campaigns", id)),

    addAdSet: async (d: any) => (await addDoc(collection(db, "adSets"), { ...deepClean(d), createdAt: serverTimestamp(), status: 'Ativo' })).id,
    updateAdSet: (a: any) => updateDoc(doc(db, "adSets", a.id), { ...deepClean(a), updatedAt: serverTimestamp() }),
    deleteAdSet: (id: string) => deleteDoc(doc(db, "adSets", id)),

    addCreative: async (d: any) => (await addDoc(collection(db, "creatives"), { ...deepClean(d), createdAt: serverTimestamp() })).id,
    updateCreative: (c: any) => updateDoc(doc(db, "creatives", c.id), { ...deepClean(c), updatedAt: serverTimestamp() }),
    deleteCreative: (id: string) => deleteDoc(doc(db, "creatives", id)),

    addMetric: (m: any) => addDoc(collection(db, "dailyMetrics"), { ...deepClean(m), createdAt: serverTimestamp() }),
    updateMetric: (m: any) => updateDoc(doc(db, "dailyMetrics", m.id), { ...deepClean(m), updatedAt: serverTimestamp() }),
    deleteMetric: (id: string) => deleteDoc(doc(db, "dailyMetrics", id)),
};
