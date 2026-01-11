// src/services/firestoreService.ts

import { db, auth } from '../../app/_lib/firebase';
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    getDocs, 
    query, 
    DocumentData,
    doc, 
    updateDoc,
    deleteDoc,
    orderBy, 
    Timestamp, 
    QueryDocumentSnapshot,
    where 
} from 'firebase/firestore';

// ⭐️ 1. DEFINE SOURCE OF TRUTH FOR TRANSACTION TYPE
export interface Transaction {
    id: string;
    description: string;
    amount: number;
    category: string;
    type: "debit" | "credit";
    date: Date;
    userId: string; 
    source?: string;
    createdAt?: any;
}

// Interface for data passed *into* the service to be added/updated
interface TransactionData {
    amount: number;
    category: string;
    description: string;
    type: 'debit' | 'credit';
    date: Date;
}

// --- Helper Functions for Data Conversion ---

/** Converts a Firestore Document snapshot into the local Transaction interface. */
const docToTransaction = (doc: QueryDocumentSnapshot<DocumentData>): Transaction => {
    const data = doc.data();
    
    // Convert Firestore Timestamp to local Date object
    const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
    
    return {
        id: doc.id,
        description: data.description,
        amount: data.amount,
        category: data.category,
        type: data.type,
        date: date,
        userId: data.userId, 
        source: data.source,
        createdAt: data.createdAt,
    } as Transaction;
};

/**
 * Service object containing reusable Firestore operations.
 */
export const firestoreService = {
    // --- AUTH/PATH HELPERS ---
    getUserId: () => {
        const userId = auth.currentUser?.uid;
        
        // 🚨 ENHANCED LOGGING FOR AUTHENTICATION CHECK 🚨
        if (!userId) {
            console.error("❌ [FS-AUTH] AUTHENTICATION FAILED: auth.currentUser is null or missing UID.");
            throw new Error("User not authenticated. Cannot perform database operation.");
        }
        console.log(`✅ [FS-AUTH] User authenticated. UID: ${userId}`);
        return userId;
    },
    
    // We assume transactions are stored at the root 'transactions'
    getTransactionPath: (transactionId?: string) => {
        const basePath = 'transactions'; 
        return transactionId ? `${basePath}/${transactionId}` : basePath;
    },

    // --- TRANSACTION SPECIFIC CRUD WRAPPERS ---

    /**
     * Fetches all transactions for the specified user ID, ordered by date.
     */
    fetchTransactions: async (userId: string): Promise<Transaction[]> => {
        // NOTE: No need to call getUserId() here as the store ensures it's passed.
        
        try {
            // NEW DEBUG LOG: START FETCH
            console.log(`🟡 [FS-TXN] Starting fetch for user: ${userId}`);
            
            const collectionRef = collection(db, firestoreService.getTransactionPath());
            
            // Query: Filter by user ID AND order by date (descending)
            const q = query(
                collectionRef, 
                where('userId', '==', userId), // Filter by the passed user ID
                orderBy('date', 'desc')        // Order by date
            ); 
            
            const snapshot = await getDocs(q);
            
            // NEW DEBUG LOG: SUCCESS
            console.log(`✅ [FS-TXN] Successfully fetched ${snapshot.docs.length} documents.`);
            
            // Map Firestore documents to your local Transaction interface
            return snapshot.docs.map(docToTransaction);
        } catch (error: any) { // Changed 'error' to 'error: any' to safely access properties
            // NEW DEBUG LOG: ERROR DETAILS
            console.error('🔴 [FS-TXN] FAILED TO FETCH TRANSACTIONS!');
            console.error('🔴 [FS-TXN] Error Code:', error.code);
            console.error('🔴 [FS-TXN] Error Message:', error.message);
            console.error(`Firestore Error: Failed to fetch transactions for user ${userId}:`, error);
            
            throw new Error("Failed to fetch data from the database.");
        }
    },

    /**
     * Saves a new manual transaction to Firestore.
     */
    addTransaction: async (data: TransactionData): Promise<Transaction> => {
        // 1. Get userId and check for authentication
        let userId: string;
        try {
            userId = firestoreService.getUserId();
        } catch (e) {
            // Error already logged by getUserId
            throw e; 
        }

        // 2. Prepare the data payload for Firestore
        const dataToSave: DocumentData = {
            ...data,
            userId: userId,
            date: Timestamp.fromDate(data.date), // CRITICAL: Convert Date object to Timestamp
            createdAt: serverTimestamp(),
            source: 'manual', 
        };
        
        // 🚨 CRITICAL DEBUG: Check the data *before* sending to Firestore
        console.log('🟡 [FS-ADD] Attempting to save transaction with payload:');
        console.log(JSON.stringify(dataToSave, (key, value) => {
            // Custom JSON replacer to handle non-serializable objects for logging
            if (value instanceof Timestamp) return `FirestoreTimestamp(${value.toDate()})`;
            if (value instanceof Date) return `Date(${value.toISOString()})`;
            return value;
        }, 2));
        
        try {
            const docRef = await addDoc(collection(db, firestoreService.getTransactionPath()), dataToSave);

            console.log(`✅ [FS-ADD] Document saved successfully! ID: ${docRef.id}`);

            // Return the full transaction object, including the new Firestore ID
            return {
                id: docRef.id,
                ...data,
                userId: userId,
                // createdAt is handled by serverTimestamp()
            } as Transaction;
        } catch (error: any) {
            // 🚨 FINAL ERROR LOGGING 🚨
            console.error('🔴 [FS-ADD] FAILED TO ADD TRANSACTION!');
            console.error('🔴 [FS-ADD] Error Code:', error.code);
            console.error('🔴 [FS-ADD] Error Message:', error.message);
            console.error(`Firestore Error: Failed to add transaction:`, error);
            
            throw new Error("Failed to save data to the database.");
        }
    },
    
    /**
     * Updates an existing transaction.
     */
    updateTransaction: async (data: Transaction): Promise<Transaction> => {
        // 1. Check authentication
        let userId: string;
        try {
            userId = firestoreService.getUserId();
        } catch (e) {
            throw e;
        }

        const { id, ...updateData } = data;
        
        try {
            const docRef = doc(db, firestoreService.getTransactionPath(id));
            
            // Prepare data for update: convert Date object to Timestamp
            const dataToSave: DocumentData = {
                ...updateData,
                date: Timestamp.fromDate(data.date),
            };
            
            // 🚨 DEBUG: Log the update data
            console.log(`🟡 [FS-UPDATE] Attempting to update document ${id} for user ${userId} with payload:`);
            console.log(JSON.stringify(dataToSave, (key, value) => {
                if (value instanceof Timestamp) return `FirestoreTimestamp(${value.toDate()})`;
                if (value instanceof Date) return `Date(${value.toISOString()})`;
                return value;
            }, 2));
            
            await updateDoc(docRef, dataToSave);
            console.log(`✅ [FS-UPDATE] Document ${id} updated successfully!`);
            return data; // Return original object, which is now saved
        } catch (error: any) {
             console.error('🔴 [FS-UPDATE] FAILED TO UPDATE TRANSACTION!');
             console.error('🔴 [FS-UPDATE] Error Code:', error.code);
             console.error('🔴 [FS-UPDATE] Error Message:', error.message);
             console.error(`Firestore Error: Failed to update transaction:`, error);
             throw new Error("Failed to update document in the database.");
        }
    },

    /**
     * Deletes a transaction by ID.
     */
    deleteTransaction: async (id: string): Promise<void> => {
        // 1. Check authentication
        let userId: string;
        try {
            userId = firestoreService.getUserId();
        } catch (e) {
            throw e;
        }

        try {
            const docRef = doc(db, firestoreService.getTransactionPath(id));
            
            // 🚨 DEBUG: Log the deletion attempt
            console.log(`🟡 [FS-DELETE] Attempting to delete document ${id} for user ${userId}.`);
            
            await deleteDoc(docRef);
            console.log(`✅ [FS-DELETE] Document ${id} deleted successfully!`);

        } catch (error: any) {
            console.error('🔴 [FS-DELETE] FAILED TO DELETE TRANSACTION!');
            console.error('🔴 [FS-DELETE] Error Code:', error.code);
            console.error('🔴 [FS-DELETE] Error Message:', error.message);
            console.error(`Firestore Error: Failed to delete transaction:`, error);
            throw new Error("Failed to delete document from the database.");
        }
    },
    
    // --- Generic Helpers (kept from your original file) ---
    fetchDocuments: async <T extends DocumentData>(path: string): Promise<(T & { id: string })[]> => { 
        try {
            // NEW DEBUG LOG: START FETCH
            console.log(`🟡 [FS-DOC] Starting generic fetch from path: ${path}`);
            
            const collectionRef = collection(db, path);
            const q = query(collectionRef);
            
            const snapshot = await getDocs(q);
            
            // NEW DEBUG LOG: SUCCESS
            console.log(`✅ [FS-DOC] Successfully fetched ${snapshot.docs.length} generic documents.`);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as T)
            }));
        } catch (error: any) { // Changed 'error' to 'error: any' to safely access properties
             // NEW DEBUG LOG: ERROR DETAILS
             console.error('🔴 [FS-DOC] FAILED TO FETCH GENERIC DOCUMENTS!');
             console.error('🔴 [FS-DOC] Error Code:', error.code);
             console.error('🔴 [FS-DOC] Error Message:', error.message);
             console.error(`Firestore Error: Failed to fetch documents from ${path}:`, error);
            
            throw new Error("Failed to fetch data from the database.");
        }
    },
    
    // DEBUG VERSION: Replaced the original addDocument with the debug version
    addDocument: async (path: string, data: DocumentData) => { 
        console.log('🟢 [FirestoreService] addDocument called');
        console.log('🟢 [FirestoreService] Path:', path);
        console.log('🟢 [FirestoreService] Data:', JSON.stringify(data, null, 2));
        
        try {
            console.log('🟢 [FirestoreService] Getting collection reference...');
            const collectionRef = collection(db, path);
            console.log('🟢 [FirestoreService] Collection ref obtained');
            
            console.log('🟢 [FirestoreService] Calling addDoc...');
            const docRef = await addDoc(collectionRef, {
                ...data,
                createdAt: serverTimestamp(),
            });
            
            console.log('✅ [FirestoreService] Document added successfully!');
            console.log('✅ [FirestoreService] Document ID:', docRef.id);
            console.log('✅ [FirestoreService] Document path:', docRef.path);
            
            return docRef;
        } catch (error: any) {
            console.error('🔴 [FirestoreService] Failed to add document:', error);
            console.error('🔴 [FirestoreService] Error code:', error.code);
            console.error('🔴 [FirestoreService] Error message:', error.message);
            console.error('🔴 [FirestoreService] Full error:', JSON.stringify(error, null, 2));
            throw new Error("Failed to save document to the database.");
        }
    },
    
    updateDocument: async (fullPath: string, data: DocumentData) => { 
        try {
            const docRef = doc(db, fullPath);
            await updateDoc(docRef, data);
        } catch (error: any) {
            console.error(`Firestore Error: Failed to update document at ${fullPath}:`, error);
            throw new Error("Failed to update document in the database.");
        }
    },

    deleteDocument: async (fullPath: string) => {
        try {
            const docRef = doc(db, fullPath);
            await deleteDoc(docRef);
        } catch (error: any) {
            console.error(`Firestore Error: Failed to delete document at ${fullPath}:`, error);
            throw new Error("Failed to delete document from the database.");
        }
    }
};