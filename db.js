/**
 * Database Service using Google Firebase (Firestore)
 * Solves the issue of data not syncing across devices (Mobile/Laptop)
 */

// =============================================================
//  🔴  IMPORTANT: PASTE YOUR FIREBASE CONFIGURATION HERE  🔴
// =============================================================
// 1. Go to console.firebase.google.com
// 2. Create a New Project (e.g., "MathMaster")
// 3. Register a Web App (</> icon)
// 4. Copy the "firebaseConfig" object and paste it below replacing the empty one.
// =============================================================

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCwAchAnqPi1oLVDnKuLwxwkcK2kI7HLyA",
    authDomain: "web-app-7aa90.firebaseapp.com",
    projectId: "web-app-7aa90",
    storageBucket: "web-app-7aa90.firebasestorage.app",
    messagingSenderId: "881866933845",
    appId: "1:881866933845:web:55b69fc224c14584adf6dc",
    measurementId: "G-Y2Y1WNTBEJ"
};

// Initialize Firebase
// Check if firebase is available (loaded via script tags in HTML)
if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not loaded! Make sure to include Firebase scripts in your HTML.");
} else {
    // Initialize only if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        // Analytics is optional and might require separate compat library if needed, 
        // but for now we focus on Firestore which is what drives the app.
    }
}


const dbRef = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// Helper to handle local session
const SESSION_KEY = 'mathmaster_user_session';

class Database {
    constructor() {
        if (!dbRef) {
            console.warn("Database not connected to Firebase. Check config.");
        }
    }

    // --- Authentication (using Firestore as User DB) ---

    // Login with Email or Phone
    async loginWithGoogle(emailOrPhone) {
        if (!dbRef) return { success: false, message: "Database Error" };

        try {
            // Check in 'users' collection
            const usersRef = dbRef.collection('users');
            // Allow login by email OR phone (searching 'contact' field)
            const snapshot = await usersRef.where('contact', '==', emailOrPhone).get();

            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                const user = { id: userDoc.id, ...userDoc.data() };

                // Save to local session (so you stay logged in on this device)
                localStorage.setItem(SESSION_KEY, JSON.stringify(user));
                return { success: true, user };
            }

            // Also check 'phone' field if different
            const phoneSnapshot = await usersRef.where('phone', '==', emailOrPhone).get();
            if (!phoneSnapshot.empty) {
                const userDoc = phoneSnapshot.docs[0];
                const user = { id: userDoc.id, ...userDoc.data() };
                localStorage.setItem(SESSION_KEY, JSON.stringify(user));
                return { success: true, user };
            }

            return { success: false, status: 'new_user', email: emailOrPhone };

        } catch (error) {
            console.error(error);
            return { success: false, message: error.message };
        }
    }

    async register(userData) {
        try {
            const usersRef = dbRef.collection('users');

            // Check if exists
            const check = await usersRef.where('contact', '==', userData.contact).get();
            if (!check.empty) {
                return { success: false, message: 'User already registered!' };
            }

            // Prepare Data
            const newUser = {
                role: 'student',
                payments: [],
                createdAt: new Date().toISOString(),
                ...userData
            };

            // Add to Firestore
            const docRef = await usersRef.add(newUser);

            // Save Session
            const userWithId = { id: docRef.id, ...newUser };
            localStorage.setItem(SESSION_KEY, JSON.stringify(userWithId));

            return { success: true, user: userWithId };

        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async completeGoogleRegistration(details) {
        return this.register(details);
    }

    // Get current logged-in user from LocalStorage (Fast access)
    // We still use LocalStorage to "remember" who is logged in on this device
    getCurrentUser() {
        const json = localStorage.getItem(SESSION_KEY);
        return json ? JSON.parse(json) : null;
    }

    // Sync session with latest data from Firestore
    async refreshSession() {
        const localUser = this.getCurrentUser();
        if (!localUser) return null;

        try {
            const doc = await dbRef.collection('users').doc(localUser.id).get();
            if (doc.exists) {
                const freshUser = { id: doc.id, ...doc.data() };
                localStorage.setItem(SESSION_KEY, JSON.stringify(freshUser)); // Update local
                return freshUser;
            }
        } catch (e) {
            console.warn("Offline or Sync Error", e);
        }
        return localUser; // Fallback
    }

    logout() {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
    }

    // --- Student Features ---

    async getContent(grade) {
        try {
            const snapshot = await dbRef.collection('content')
                .where('grade', '==', grade)
                .orderBy('date', 'desc') // Requires an index in Firebase eventually, or sort in JS
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error(e);
            return []; // Return empty if error
        }
    }

    // --- Admin/Teacher Features ---

    async getAllStudents() {
        try {
            const snapshot = await dbRef.collection('users')
                .where('role', '==', 'student')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async addPayment(studentId, month) {
        try {
            const userRef = dbRef.collection('users').doc(studentId);
            const doc = await userRef.get();

            if (doc.exists) {
                const userData = doc.data();
                let payments = userData.payments || [];

                if (!payments.includes(month)) {
                    payments.push(month);
                    // Update Firestore
                    await userRef.update({ payments });
                    return { success: true };
                }
                return { success: false, message: 'Already paid' };
            }
            return { success: false, message: 'Student not found' };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    async removePayment(studentId, month) {
        try {
            const userRef = dbRef.collection('users').doc(studentId);
            const doc = await userRef.get();

            if (doc.exists) {
                const userData = doc.data();
                let payments = userData.payments || [];

                if (payments.includes(month)) {
                    payments = payments.filter(p => p !== month);
                    await userRef.update({ payments });
                    return { success: true };
                }
            }
            return { success: false, message: 'Payment record not found' };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    async removeUser(userId) {
        try {
            await dbRef.collection('users').doc(userId).delete();
            return { success: true };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    async addContent(contentItem) {
        try {
            contentItem.date = new Date().toISOString();
            await dbRef.collection('content').add(contentItem);
            return { success: true };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    async getAllContent() {
        try {
            const snapshot = await dbRef.collection('content').orderBy('date', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            // Firestore might complain about missing index for sorting, fallback
            const snapshot = await dbRef.collection('content').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    }

    async deleteContent(id) {
        try {
            await dbRef.collection('content').doc(id).delete();
            return { success: true };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    // --- Marks ---
    async addMark(markData) {
        try {
            markData.date = new Date().toISOString();
            await dbRef.collection('marks').add(markData);
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false };
        }
    }

    async getStudentMarks(studentId) {
        try {
            const snapshot = await dbRef.collection('marks')
                .where('studentId', '==', studentId)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            return [];
        }
    }

    // --- Settings ---
    async getSettings() {
        try {
            const doc = await dbRef.collection('settings').doc('global').get();
            if (doc.exists) return doc.data();
            return {};
        } catch (e) {
            return {};
        }
    }

    async updateSettings(newSettings) {
        try {
            // merge: true allows updating specific fields
            await dbRef.collection('settings').doc('global').set(newSettings, { merge: true });
            return { success: true };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    // Check payment (Synchronous-ish helper for UI State usually requires async data, 
    // but we will use the cached session or async check)
    // In this new Async DB, this method is tricky if we want instant 'true/false'.
    // Better to use data from 'refreshSession' or pass the user object.
    checkPaymentStatus(user, monthKey) {
        if (!user || !user.payments) return false;
        return user.payments.includes(monthKey);
    }
}

const db = new Database();
