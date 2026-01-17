import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from '../services/firebase';
import { operationsService } from '../services/operationsService';
import { useAuth } from './AuthContext';
import { Sale, Product, Warehouse, Task, Goal, User, FrustrationReason } from '../types';

interface OperationsContextType {
    sales: Sale[];
    products: Product[];
    warehouses: Warehouse[];
    tasks: Task[];
    goals: Goal[];
    users: User[];
    frustrationReasons: FrustrationReason[];

    // Actions
    addSale: typeof salesService.addSale;
    updateSale: typeof salesService.updateSale;
    deleteSale: typeof salesService.deleteSale;

    addProduct: typeof operationsService.addProduct;
    updateProduct: typeof operationsService.updateProduct;
    deleteProduct: typeof operationsService.deleteProduct;
    addWarehouse: typeof operationsService.addWarehouse;
    updateWarehouse: typeof operationsService.updateWarehouse;
    deleteWarehouse: typeof operationsService.deleteWarehouse;
    addTask: typeof operationsService.addTask;
    updateTask: typeof operationsService.updateTask;
    deleteTask: typeof operationsService.deleteTask;
    toggleTaskStatus: typeof operationsService.toggleTaskStatus;
    addGoal: typeof operationsService.addGoal;
    updateGoal: typeof operationsService.updateGoal;
    deleteGoal: typeof operationsService.deleteGoal;
    addUser: typeof operationsService.addUser;
    updateUser: typeof operationsService.updateUser;
    deleteUser: typeof operationsService.deleteUser;
    addFrustrationReason: typeof operationsService.addFrustrationReason;
    updateFrustrationReason: typeof operationsService.updateFrustrationReason;
    deleteFrustrationReason: typeof operationsService.deleteFrustrationReason;
}

// Need to import salesService to mix it in
import { salesService } from '../services/salesService';

const OperationsContext = createContext<OperationsContextType>({} as OperationsContextType);

export const OperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profileReady } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [frustrationReasons, setFrustrationReasons] = useState<FrustrationReason[]>([]);

    useEffect(() => {
        if (!profileReady) return;

        const unsubscribers: (() => void)[] = [];
        const collections = [
            { name: "sales", setter: (d: any) => setSales(d) },
            { name: "products", setter: (d: any) => setProducts(d) },
            { name: "warehouses", setter: (d: any) => setWarehouses(d) },
            { name: "tasks", setter: (d: any) => setTasks(d) },
            { name: "goals", setter: (d: any) => setGoals(d) },
            { name: "users", setter: (d: any) => setUsers(d) },
            { name: "frustrationReasons", setter: (d: any) => setFrustrationReasons(d) },
        ];

        collections.forEach(col => {
            unsubscribers.push(onSnapshot(collection(db, col.name), s => {
                col.setter(s.docs.map(d => ({ ...d.data(), id: d.id })));
            }, err => console.error(`Sync error on ${col.name}:`, err.message)));
        });

        return () => unsubscribers.forEach(u => u());
    }, [profileReady]);

    const value = {
        sales, products, warehouses, tasks, goals, users, frustrationReasons,
        ...operationsService,
        ...salesService
    };

    return (
        <OperationsContext.Provider value={value}>
            {children}
        </OperationsContext.Provider>
    );
};

export const useOperations = () => useContext(OperationsContext);
