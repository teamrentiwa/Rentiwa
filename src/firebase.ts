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
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
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
  images?: string[];
  pricingMode?: string;
  priceHour?: number;
  priceDay?: number;
  ownerPhone?: string;
  ownerWhatsapp?: string;
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
  const images = Array.isArray(params.images) ? params.images : [];
  const pricingMode = params.pricingMode || 'day';
  const priceHour = Number(params.priceHour) || price;
  const priceDay = Number(params.priceDay) || price;
  const ownerPhone = params.ownerPhone || currentUser.phoneNumber || '+91 98765 00112';
  const ownerWhatsapp = params.ownerWhatsapp || ownerPhone;

  if (!title) throw new Error("Title is required.");
  if (!description) throw new Error("Description is required.");
  if (!category) throw new Error("Category is required.");
  if (!location) throw new Error("Location is required.");
  if (isNaN(price) || price <= 0) throw new Error("Valid price is required.");

  const listingDoc = {
    title,
    description,
    category,
    price,
    priceHour,
    priceDay,
    pricingMode,
    location,
    images,
    ownerId: currentUser.uid,
    ownerName: currentUser.displayName || 'Rentiwa User',
    ownerEmail: currentUser.email || '',
    ownerPhone,
    ownerWhatsapp,
    createdAt: serverTimestamp(),
    status: 'active'
  };

  const docRef = await addDoc(collection(db, "listings"), listingDoc);
  return { id: docRef.id, ...listingDoc };
};

export const updateListingInFirestore = async (id: string, params: Partial<SaveListingParams>) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Unauthorized: You must be logged in to edit a listing.");
  }

  const docRef = doc(db, "listings", id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Listing not found.");
  }

  const existingData = docSnap.data();
  if (existingData.ownerId !== currentUser.uid) {
    throw new Error("Unauthorized: You can only edit your own listings.");
  }

  const updateData: Record<string, any> = {
    lastUpdated: serverTimestamp()
  };

  if (params.title !== undefined) updateData.title = params.title.trim();
  if (params.description !== undefined) updateData.description = params.description.trim();
  if (params.category !== undefined) updateData.category = params.category.trim();
  if (params.location !== undefined) updateData.location = params.location.trim();
  if (params.price !== undefined) updateData.price = Number(params.price);
  if (params.priceHour !== undefined) updateData.priceHour = Number(params.priceHour);
  if (params.priceDay !== undefined) updateData.priceDay = Number(params.priceDay);
  if (params.pricingMode !== undefined) updateData.pricingMode = params.pricingMode;
  if (params.images !== undefined) updateData.images = params.images;

  await updateDoc(docRef, updateData);
  return { id, ...existingData, ...updateData };
};

export const onListingsSnapshot = (callback: (listings: any[]) => void) => {
  const listingsRef = collection(db, "listings");
  const q = query(listingsRef, where("status", "==", "active"));
  
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
      };
    });
    // Sort descending by createdAt
    docs.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      return timeB - timeA;
    });
    callback(docs);
  }, (err) => {
    console.warn("Real-time listings snapshot error:", err);
  });
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

export const fetchActiveListingsFromFirestore = async () => {
  const listingsRef = collection(db, "listings");
  try {
    const q = query(
      listingsRef,
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
      };
    });
  } catch (err) {
    console.warn("Firestore query with orderBy failed, attempting fallback query without orderBy:", err);
    try {
      const qFallback = query(listingsRef, where("status", "==", "active"));
      const snapshot = await getDocs(qFallback);
      const docs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
        };
      });
      docs.sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
        return timeB - timeA;
      });
      return docs;
    } catch (fallbackErr) {
      console.warn("Firestore fallback query failed:", fallbackErr);
      return [];
    }
  }
};

export const getListingByIdFromFirestore = async (id: string) => {
  try {
    const docRef = doc(db, "listings", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
      };
    }
    return null;
  } catch (err) {
    console.error("Error getting listing by ID from Firestore:", err);
    return null;
  }
};

export const deleteListingFromFirestore = async (id: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Unauthorized: You must be logged in to delete a listing.");
  }

  const docRef = doc(db, "listings", id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Listing not found.");
  }

  const data = docSnap.data();
  if (data.ownerId !== currentUser.uid) {
    throw new Error("Unauthorized: You can only delete your own listings.");
  }

  await deleteDoc(docRef);
  return true;
};

export interface UpgradeRequestParams {
  name: string;
  phone: string;
  location: string;
  occupation?: string;
  helpfulAnswer: string;
  feedback?: string;
}

export const submitUpgradeRequestToFirestore = async (params: UpgradeRequestParams) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to submit an upgrade request.");
  }

  const name = (params.name || "").trim();
  const phone = (params.phone || "").trim();
  const location = (params.location || "").trim();
  const occupation = (params.occupation || "").trim();
  const helpfulAnswer = (params.helpfulAnswer || "Yes").trim();
  const feedback = (params.feedback || "").trim();

  if (!name) throw new Error("Full Name is required.");
  if (!phone) throw new Error("Phone Number is required.");
  if (!location) throw new Error("Location / Area is required.");

  const requestDoc = {
    userId: currentUser.uid,
    userEmail: currentUser.email || '',
    name,
    phone,
    location,
    occupation,
    helpfulAnswer,
    feedback,
    currentPlan: "Free User",
    requestDate: serverTimestamp(),
    status: "Waiting"
  };

  const docRef = await addDoc(collection(db, "upgrade_requests"), requestDoc);

  // Grant +5 free listings to user profile document in Firestore
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, {
      userId: currentUser.uid,
      email: currentUser.email || '',
      name,
      phone,
      extraFreeListings: 5, // Grant +5 free listings
      hasUpgradeRequest: true,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (userErr) {
    console.warn("Could not write user extra listings to Firestore users collection:", userErr);
  }

  return { id: docRef.id, ...requestDoc };
};

export const getUserProfileFromFirestore = async (uid: string) => {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return userDocSnap.data();
    }
    return null;
  } catch (err) {
    console.warn("Error fetching user profile from Firestore:", err);
    return null;
  }
};

