import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from '../services/firebase';
import { marketingService } from '../services/marketingService';
import { useAuth } from './AuthContext';
import { Campaign, AdSet, Creative, DailyMetric } from '../types';

interface MarketingContextType {
    campaigns: Campaign[];
    adSets: AdSet[];
    creatives: Creative[];
    dailyMetrics: DailyMetric[];

    // Actions
    addCampaign: typeof marketingService.addCampaign;
    updateCampaign: typeof marketingService.updateCampaign;
    deleteCampaign: typeof marketingService.deleteCampaign;
    addAdSet: typeof marketingService.addAdSet;
    updateAdSet: typeof marketingService.updateAdSet;
    deleteAdSet: typeof marketingService.deleteAdSet;
    addCreative: typeof marketingService.addCreative;
    updateCreative: typeof marketingService.updateCreative;
    deleteCreative: typeof marketingService.deleteCreative;
    addMetric: typeof marketingService.addMetric;
    updateMetric: typeof marketingService.updateMetric;
    deleteMetric: typeof marketingService.deleteMetric;
}

const MarketingContext = createContext<MarketingContextType>({} as MarketingContextType);

export const MarketingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profileReady, can } = useAuth();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [adSets, setAdSets] = useState<AdSet[]>([]);
    const [creatives, setCreatives] = useState<Creative[]>([]);
    const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);

    useEffect(() => {
        // Only load if user has access to marketing or is admin
        // Optimization: Don't load if user can't see it (though 'can' isn't fully ready inside this hook logic without care)
        // For now, load if profile is ready.
        if (!profileReady) return;

        const unsubscribers: (() => void)[] = [];
        const collections = [
            { name: "campaigns", setter: (d: any) => setCampaigns(d) },
            { name: "adSets", setter: (d: any) => setAdSets(d) },
            { name: "creatives", setter: (d: any) => setCreatives(d) },
            { name: "dailyMetrics", setter: (d: any) => setDailyMetrics(d) },
        ];

        collections.forEach(col => {
            unsubscribers.push(onSnapshot(collection(db, col.name), s => {
                col.setter(s.docs.map(d => ({ ...d.data(), id: d.id })));
            }, err => console.error(`Sync error on ${col.name}:`, err.message)));
        });

        return () => unsubscribers.forEach(u => u());
    }, [profileReady]);

    const value = {
        campaigns, adSets, creatives, dailyMetrics,
        ...marketingService
    };

    return (
        <MarketingContext.Provider value={value}>
            {children}
        </MarketingContext.Provider>
    );
};

export const useMarketing = () => useContext(MarketingContext);
