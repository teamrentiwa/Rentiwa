import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

// Web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyC48csk9fIl5UBFYlnq-Nn9y4yTbirXsQo",
  authDomain: "ai-studio-applet-webapp-b688e.firebaseapp.com",
  projectId: "ai-studio-applet-webapp-b688e",
  storageBucket: "ai-studio-applet-webapp-b688e.firebasestorage.app",
  messagingSenderId: "584939238257",
  appId: "1:584939238257:web:eb8bc8838fec158d223cd0",
  firestoreDatabaseId: "ai-studio-rentiwa-9a6f4d28-52d5-4546-9c51-91fab7262e28"
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Google Login
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-closed-by-user'
    ) {
      console.log("Google sign-in popup was cancelled or closed by user.");
      return null;
    }
    console.error("Firebase Google Auth Error:", error);
    throw error;
  }
}

// Google Logout
export async function logoutGoogle(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase Logout Error:", error);
    throw error;
  }
}

// Persist login after refresh
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Storage Helper: Upload File
export async function uploadListingImage(file: File): Promise<string> {
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `listings/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${safeName}`;
    const storageRef = ref(storage, filename);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (err) {
    console.warn("Firebase Storage upload warning, using base64 fallback:", err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80");
      reader.readAsDataURL(file);
    });
  }
}

// Firestore Helper: Fetch All Listings
export async function fetchListingsFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    const listings: any[] = [];
    querySnapshot.forEach((docSnap) => {
      listings.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    // Sort newest first
    listings.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return listings;
  } catch (err) {
    console.warn("Firestore fetch notice (using local storage fallback if needed):", err);
    return null;
  }
}

// Firestore Helper: Save New Listing
export async function saveListingToFirestore(productData: any) {
  try {
    const docData = {
      ...productData,
      createdAt: productData.createdAt || Date.now()
    };
    if (productData.id && !productData.id.startsWith('p_')) {
      await setDoc(doc(db, "products", productData.id), docData);
      return { id: productData.id, ...docData };
    } else {
      const docRef = await addDoc(collection(db, "products"), docData);
      return { id: docRef.id, ...docData };
    }
  } catch (err) {
    console.error("Error saving listing to Firestore:", err);
    throw err;
  }
}

// Firestore Helper: Delete Listing
export async function deleteListingFromFirestore(productId: string) {
  try {
    await deleteDoc(doc(db, "products", productId));
    return true;
  } catch (err) {
    console.error("Error deleting listing from Firestore:", err);
    throw err;
  }
}
