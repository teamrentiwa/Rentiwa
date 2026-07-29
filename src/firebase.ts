import { initializeApp, getApps, getApp } from "firebase/app";
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
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdYbZ2s5hAkhBeuDQVwGVlcXV5dvb-550",
  authDomain: "rentiwa.firebaseapp.com",
  projectId: "rentiwa",
  storageBucket: "rentiwa.firebasestorage.app",
  messagingSenderId: "103098186691",
  appId: "1:103098186691:web:67520b9eb3a05d8bfb9b76"
};

// Singleton Firebase App initialization
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export interface SaveListingParams {
  title: string;
  description: string;
  category: string;
  price: number;
  location: string;
  images: string[];
}

export const saveListingToFirestore = async (params: SaveListingParams) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to create a listing.");
  }

  const title = (params.title || "").trim();
  const description = (params.description || "").trim();
  const category = (params.category || "").trim();
  const location = (params.location || "").trim();
  const price = Number(params.price);
  const images = Array.isArray(params.images) && params.images.length > 0 ? params.images : [];

  if (!title) throw new Error("Title is required.");
  if (!description) throw new Error("Description is required.");
  if (!category) throw new Error("Category is required.");
  if (!location) throw new Error("Location is required.");
  if (isNaN(price) || price <= 0) throw new Error("Valid price is required.");
  if (images.length === 0) throw new Error("At least one image is required.");

  const listingDoc = {
    title,
    description,
    category,
    price,
    location,
    images,
    ownerId: currentUser.uid,
    ownerName: currentUser.displayName || 'Rentiwa User',
    ownerEmail: currentUser.email || '',
    createdAt: serverTimestamp(),
    status: 'active'
  };

  const docRef = await addDoc(collection(db, "listings"), listingDoc);
  return { id: docRef.id, ...listingDoc };
};

export const signInWithGoogle = async (): Promise<User | null> => {
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
    if (error?.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname;
      console.warn(`Firebase Unauthorized Domain Error. Domain "${currentDomain}" is not authorized in Firebase Console.`);
      const domainError = new Error(`Unauthorized Domain: ${currentDomain}. Please add "${currentDomain}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`);
      (domainError as any).code = 'auth/unauthorized-domain';
      (domainError as any).domain = currentDomain;
      throw domainError;
    }
    console.error("Firebase Google Auth Error:", error);
    throw error;
  }
};

export const logoutGoogle = async (): Promise<void> => {
  return await signOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
