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
  onSnapshot,
  limit,
  startAfter
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
  productName?: string;
  description: string;
  category: string;
  selectedCategory?: string;
  customCategory?: string;
  price: number;
  rentalPrice?: number;
  location: string;
  city?: string;
  area?: string;
  selectedArea?: string;
  customArea?: string;
  images?: string[];
  productImages?: string[];
  pricingMode?: string;
  priceType?: string;
  priceHour?: number;
  priceDay?: number;
  availability?: string;
  ownerPhone?: string;
  phoneNumber?: string;
  ownerWhatsapp?: string;
  whatsappNumber?: string;
  rentalTerms?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhoto?: string;
  ownerAvatar?: string;
}

export const saveListingToFirestore = async (params: SaveListingParams) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to create a listing.");
  }

  const title = (params.title || params.productName || "").trim();
  const description = (params.description || "").trim();
  const selectedCategory = (params.selectedCategory || "").trim();
  const customCategory = (params.customCategory || "").trim();
  const category = (customCategory || params.category || "").trim();
  
  const selectedArea = (params.selectedArea || "").trim();
  const customArea = (params.customArea || "").trim();
  const area = (customArea || params.area || "").trim();
  const city = (params.city || "Narela, Delhi").trim();
  const location = (params.location || (area ? `${area}, ${city}` : city)).trim();
  const price = Number(params.price || params.rentalPrice);
  const images = Array.isArray(params.images) ? params.images : (Array.isArray(params.productImages) ? params.productImages : []);
  const pricingMode = params.pricingMode || params.priceType || 'day';
  const priceHour = Number(params.priceHour) || price;
  const priceDay = Number(params.priceDay) || price;
  const availability = (params.availability || "Available Now").trim();
  const ownerPhone = (params.ownerPhone || params.phoneNumber || currentUser.phoneNumber || "").trim();
  const ownerWhatsapp = (params.ownerWhatsapp || params.whatsappNumber || ownerPhone).trim();
  const rentalTerms = (params.rentalTerms || "").trim();
  const ownerName = currentUser.displayName || params.ownerName || 'Rentiwa User';
  const ownerEmail = currentUser.email || params.ownerEmail || '';
  const ownerPhoto = currentUser.photoURL || params.ownerPhoto || params.ownerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';

  if (!title) throw new Error("Product title is required.");
  if (!description) throw new Error("Description is required.");
  if (!category) throw new Error("Category is required.");
  if (!location) throw new Error("Location is required.");
  if (!ownerPhone) throw new Error("Phone Number is required.");
  if (isNaN(price) || price <= 0) throw new Error("Valid price is required.");

  const listingDoc = {
    // Save both property names to ensure full field compatibility
    title,
    productName: title,
    description,
    category,
    selectedCategory: selectedCategory || (customCategory ? 'Other' : category),
    customCategory,
    price,
    rentalPrice: price,
    priceHour,
    priceDay,
    pricingMode,
    priceType: pricingMode,
    location,
    city,
    area,
    selectedArea: selectedArea || (customArea ? 'Other' : area),
    customArea,
    availability,
    images,
    productImages: images,
    ownerId: currentUser.uid,
    ownerName,
    ownerEmail,
    ownerPhone,
    phoneNumber: ownerPhone,
    ownerWhatsapp,
    whatsappNumber: ownerWhatsapp,
    ownerPhoto,
    ownerAvatar: ownerPhoto,
    rentalTerms,
    status: 'active',
    listingStatus: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
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
    updatedAt: serverTimestamp(),
    lastUpdated: serverTimestamp()
  };

  if (params.title !== undefined) {
    updateData.title = params.title.trim();
    updateData.productName = params.title.trim();
  }
  if (params.description !== undefined) updateData.description = params.description.trim();
  if (params.category !== undefined) updateData.category = params.category.trim();
  if (params.selectedCategory !== undefined) updateData.selectedCategory = params.selectedCategory.trim();
  if (params.customCategory !== undefined) updateData.customCategory = params.customCategory.trim();
  if (params.location !== undefined) updateData.location = params.location.trim();
  if (params.city !== undefined) updateData.city = params.city.trim();
  if (params.area !== undefined) updateData.area = params.area.trim();
  if (params.selectedArea !== undefined) updateData.selectedArea = params.selectedArea.trim();
  if (params.customArea !== undefined) updateData.customArea = params.customArea.trim();
  if (params.availability !== undefined) updateData.availability = params.availability.trim();
  if (params.price !== undefined) {
    updateData.price = Number(params.price);
    updateData.rentalPrice = Number(params.price);
  }
  if (params.priceHour !== undefined) updateData.priceHour = Number(params.priceHour);
  if (params.priceDay !== undefined) updateData.priceDay = Number(params.priceDay);
  if (params.pricingMode !== undefined) {
    updateData.pricingMode = params.pricingMode;
    updateData.priceType = params.pricingMode;
  }
  if (params.images !== undefined) {
    updateData.images = params.images;
    updateData.productImages = params.images;
  }
  if (params.ownerPhone !== undefined) {
    updateData.ownerPhone = params.ownerPhone.trim();
    updateData.phoneNumber = params.ownerPhone.trim();
  }
  if (params.ownerWhatsapp !== undefined) {
    updateData.ownerWhatsapp = params.ownerWhatsapp.trim();
    updateData.whatsappNumber = params.ownerWhatsapp.trim();
  }
  if (params.rentalTerms !== undefined) updateData.rentalTerms = params.rentalTerms.trim();

  await updateDoc(docRef, updateData);
  return { id, ...existingData, ...updateData };
};

export const onListingsSnapshot = (callback: (listings: any[]) => void, limitCount: number = 8) => {
  const listingsRef = collection(db, "listings");
  const q = query(
    listingsRef,
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
      };
    });
    // Ensure sorted descending by createdAt
    docs.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      return timeB - timeA;
    });
    callback(docs);
  }, (err) => {
    console.warn("Real-time listings snapshot with orderBy failed, fallback query without orderBy:", err);
    try {
      const qFallback = query(listingsRef, where("status", "==", "active"), limit(limitCount));
      return onSnapshot(qFallback, (snapshotFallback) => {
        const docs = snapshotFallback.docs.map(docSnap => {
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
        callback(docs);
      });
    } catch (e) {
      console.warn("Snapshot fallback failed:", e);
    }
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

export const fetchActiveListingsFromFirestore = async (limitCount: number = 8) => {
  const listingsRef = collection(db, "listings");
  try {
    const q = query(
      listingsRef,
      where("status", "==", "active"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
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
      const qFallback = query(listingsRef, where("status", "==", "active"), limit(limitCount));
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

export interface FetchPaginatedParams {
  pageSize?: number;
  lastDocSnap?: any;
}

export const fetchPaginatedListingsFromFirestore = async ({ pageSize = 20, lastDocSnap = null }: FetchPaginatedParams = {}) => {
  const listingsRef = collection(db, "listings");
  try {
    const constraints: any[] = [
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    ];

    if (lastDocSnap) {
      constraints.push(startAfter(lastDocSnap));
    }
    constraints.push(limit(pageSize));

    const q = query(listingsRef, ...constraints);
    const snapshot = await getDocs(q);

    const docs = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        _docSnap: docSnap,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
      };
    });

    const hasMore = snapshot.docs.length === pageSize;
    const newLastDocSnap = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

    return {
      docs,
      hasMore,
      lastDocSnap: newLastDocSnap
    };
  } catch (err) {
    console.warn("Paginated query with orderBy failed, using fallback without orderBy:", err);
    try {
      const fallbackConstraints: any[] = [where("status", "==", "active")];
      if (lastDocSnap) {
        fallbackConstraints.push(startAfter(lastDocSnap));
      }
      fallbackConstraints.push(limit(pageSize));

      const qFallback = query(listingsRef, ...fallbackConstraints);
      const snapshot = await getDocs(qFallback);
      const docs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          _docSnap: docSnap,
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
        };
      });

      const hasMore = snapshot.docs.length === pageSize;
      const newLastDocSnap = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

      return {
        docs,
        hasMore,
        lastDocSnap: newLastDocSnap
      };
    } catch (fallbackErr) {
      console.error("Fallback paginated query failed:", fallbackErr);
      return { docs: [], hasMore: false, lastDocSnap: null };
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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const ensureUserDocumentInFirestore = async (user: User) => {
  if (!user) return null;
  const userDocRef = doc(db, "users", user.uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      const newUserDoc = {
        uid: user.uid,
        userId: user.uid,
        name: user.displayName || 'Rentiwa User',
        email: user.email || '',
        photoURL: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        role: 'user', // Default role = "user" (Never automatically create an admin)
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      };
      await setDoc(userDocRef, newUserDoc);
      return newUserDoc;
    } else {
      const existingData = userDocSnap.data();
      await updateDoc(userDocRef, {
        lastLoginAt: serverTimestamp(),
        photoURL: user.photoURL || existingData.photoURL || ''
      });
      return { id: userDocSnap.id, ...existingData };
    }
  } catch (err) {
    console.error("Error ensuring user document in Firestore:", err);
    return null;
  }
};

export const getUserRoleFromFirestore = async (uid: string): Promise<string> => {
  if (auth.currentUser && auth.currentUser.email === 'teamrentiwa@gmail.com') {
    return "admin";
  }
  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      if (data.role === "admin") return "admin";
    }
    return "user";
  } catch (err) {
    console.warn("Error fetching user role:", err);
    if (auth.currentUser && auth.currentUser.email === 'teamrentiwa@gmail.com') {
      return "admin";
    }
    return "user";
  }
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

/* ====================================================
   ADMIN PANEL FIRESTORE HELPER FUNCTIONS
   ==================================================== */

export const adminFetchAllListings = async (limitCount: number = 100) => {
  try {
    const listingsRef = collection(db, "listings");
    const q = query(listingsRef, orderBy("createdAt", "desc"), limit(limitCount));
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
    console.warn("Admin fetch with orderBy failed, fallback to standard query:", err);
    try {
      const listingsRef = collection(db, "listings");
      const qFallback = query(listingsRef, limit(limitCount));
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
    } catch (e) {
      console.error("Admin fetch all listings error:", e);
      return [];
    }
  }
};

export const adminUpdateListingStatus = async (id: string, status: string) => {
  const docRef = doc(db, "listings", id);
  await updateDoc(docRef, {
    status: status,
    listingStatus: status,
    updatedAt: serverTimestamp()
  });
  return true;
};

export const adminUpdateListing = async (id: string, updates: Record<string, any>) => {
  const docRef = doc(db, "listings", id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  return true;
};

export const adminDeleteListing = async (id: string) => {
  const docRef = doc(db, "listings", id);
  await deleteDoc(docRef);
  return true;
};

export const adminFetchAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const docs = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        uid: data.uid || docSnap.id,
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
  } catch (err) {
    console.error("Admin fetch all users error:", err);
    return [];
  }
};

export const adminUpdateUser = async (uid: string, updates: Record<string, any>) => {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, {
    ...updates,
    lastUpdated: serverTimestamp()
  });
  return true;
};

export const adminDeleteUser = async (uid: string) => {
  const docRef = doc(db, "users", uid);
  await deleteDoc(docRef);
  return true;
};

export const adminFetchUpgradeRequests = async () => {
  try {
    const reqRef = collection(db, "upgrade_requests");
    const snapshot = await getDocs(reqRef);
    const docs = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        requestDate: data.requestDate?.toMillis ? data.requestDate.toMillis() : (data.requestDate || Date.now())
      };
    });
    docs.sort((a, b) => {
      const timeA = typeof a.requestDate === 'number' ? a.requestDate : 0;
      const timeB = typeof b.requestDate === 'number' ? b.requestDate : 0;
      return timeB - timeA;
    });
    return docs;
  } catch (err) {
    console.error("Admin fetch upgrade requests error:", err);
    return [];
  }
};

export const adminApproveUpgradeRequest = async (requestId: string, userId: string) => {
  const reqRef = doc(db, "upgrade_requests", requestId);
  await updateDoc(reqRef, {
    status: "Approved",
    approvedAt: serverTimestamp()
  });

  if (userId) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        plan: "Pro",
        extraFreeListings: 10,
        hasUpgradeRequest: false,
        isPro: true,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn("Could not update user doc on upgrade approval:", err);
    }
  }
  return true;
};

export const adminRejectUpgradeRequest = async (requestId: string) => {
  const reqRef = doc(db, "upgrade_requests", requestId);
  await updateDoc(reqRef, {
    status: "Rejected",
    rejectedAt: serverTimestamp()
  });
  return true;
};

export const adminGetSettings = async () => {
  try {
    const settingsRef = doc(db, "settings", "general");
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return snap.data();
    }
    return {
      defaultFreeListings: 2,
      maintenanceMode: false,
      supportEmail: "teamrentiwa@gmail.com",
      maxImagesPerListing: 2
    };
  } catch (err) {
    console.warn("Admin get settings error:", err);
    return {
      defaultFreeListings: 2,
      maintenanceMode: false,
      supportEmail: "teamrentiwa@gmail.com",
      maxImagesPerListing: 2
    };
  }
};

export const adminSaveSettings = async (settings: Record<string, any>) => {
  const settingsRef = doc(db, "settings", "general");
  await setDoc(settingsRef, {
    ...settings,
    lastUpdated: serverTimestamp()
  }, { merge: true });
  return true;
};

/* ====================================================
   FEATURED PROMOTIONS FIRESTORE HELPER FUNCTIONS
   ==================================================== */

export interface PromotionRequestParams {
  productId: string;
  productName: string;
  productImage?: string;
  planRequested: string;
  phone?: string;
  email?: string;
  ownerName?: string;
}

export const submitPromotionRequestToFirestore = async (params: PromotionRequestParams) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to request promotion.");
  }

  const reqDoc = {
    userId: currentUser.uid,
    productId: params.productId,
    productName: params.productName,
    productImage: params.productImage || '',
    ownerName: params.ownerName || currentUser.displayName || 'Rentiwa User',
    phone: params.phone || currentUser.phoneNumber || '',
    email: params.email || currentUser.email || '',
    planRequested: params.planRequested || '⭐ Featured Listing (₹49 / 24 Hours)',
    status: 'Pending',
    requestedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "promotionRequests"), reqDoc);
  return { requestId: docRef.id, id: docRef.id, ...reqDoc };
};

export const fetchActiveFeaturedListingsFromFirestore = async () => {
  try {
    const ref = collection(db, "featuredListings");
    const q = query(ref, where("status", "==", "Active"), limit(10));
    const snapshot = await getDocs(q);
    const now = Date.now();
    const activeListings: any[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const featuredId = docSnap.id;
      
      let endMs = 0;
      if (data.endDate) {
        if (typeof data.endDate === 'number') endMs = data.endDate;
        else if (data.endDate.toMillis) endMs = data.endDate.toMillis();
        else endMs = new Date(data.endDate).getTime();
      }

      // If expired, update status to Expired in background
      if (endMs > 0 && endMs < now) {
        try {
          await updateDoc(doc(db, "featuredListings", featuredId), {
            status: "Expired",
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.warn("Error marking featured listing as expired:", e);
        }
      } else {
        activeListings.push({
          featuredId,
          id: featuredId,
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || now)
        });
      }
    }
    return activeListings;
  } catch (err) {
    console.warn("Fetch active featured listings error:", err);
    return [];
  }
};

export const adminFetchPromotionRequests = async () => {
  try {
    const ref = collection(db, "promotionRequests");
    const snapshot = await getDocs(ref);
    const docs = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        requestId: docSnap.id,
        id: docSnap.id,
        ...data,
        requestedAt: data.requestedAt?.toMillis ? data.requestedAt.toMillis() : (data.requestedAt || Date.now())
      };
    });
    docs.sort((a, b) => {
      const timeA = typeof a.requestedAt === 'number' ? a.requestedAt : 0;
      const timeB = typeof b.requestedAt === 'number' ? b.requestedAt : 0;
      return timeB - timeA;
    });
    return docs;
  } catch (err) {
    console.error("Admin fetch promotion requests error:", err);
    return [];
  }
};

export const adminFetchFeaturedListings = async () => {
  try {
    const ref = collection(db, "featuredListings");
    const snapshot = await getDocs(ref);
    const now = Date.now();
    const docs = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      let endMs = 0;
      if (data.endDate) {
        if (typeof data.endDate === 'number') endMs = data.endDate;
        else if (data.endDate.toMillis) endMs = data.endDate.toMillis();
        else endMs = new Date(data.endDate).getTime();
      }

      let currentStatus = data.status || 'Active';
      if (currentStatus === 'Active' && endMs > 0 && endMs < now) {
        currentStatus = 'Expired';
      }

      return {
        featuredId: docSnap.id,
        id: docSnap.id,
        ...data,
        status: currentStatus,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || now)
      };
    });
    docs.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      return timeB - timeA;
    });
    return docs;
  } catch (err) {
    console.error("Admin fetch featured listings error:", err);
    return [];
  }
};

export interface ApprovePromotionParams {
  planName: string; // e.g. "Featured Listing", "Featured Plus", "Business Spotlight"
  durationDays: number; // e.g. 1, 5, 30
}

export const adminApprovePromotionRequest = async (requestId: string, reqData: any, planParams: ApprovePromotionParams) => {
  // 1. Update request status
  const reqRef = doc(db, "promotionRequests", requestId);
  await updateDoc(reqRef, {
    status: "Approved",
    approvedAt: serverTimestamp()
  });

  // 2. Calculate duration
  const now = new Date();
  const days = planParams.durationDays || 1;
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // 3. Create featured listing doc
  const featuredDoc = {
    productId: reqData.productId,
    userId: reqData.userId || '',
    title: reqData.productName || reqData.title || 'Featured Product',
    image: reqData.productImage || reqData.image || '',
    category: reqData.category || 'General',
    price: reqData.price || 0,
    location: reqData.location || 'Narela, Delhi',
    ownerName: reqData.ownerName || 'Rentiwa User',
    featuredPlan: planParams.planName || reqData.planRequested || 'Featured Listing',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'Active',
    createdBy: auth.currentUser?.email || 'teamrentiwa@gmail.com',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const featRef = await addDoc(collection(db, "featuredListings"), featuredDoc);
  return { featuredId: featRef.id, ...featuredDoc };
};

export const adminRejectPromotionRequest = async (requestId: string) => {
  const reqRef = doc(db, "promotionRequests", requestId);
  await updateDoc(reqRef, {
    status: "Rejected",
    rejectedAt: serverTimestamp()
  });
  return true;
};

export const adminCreateFeaturedListing = async (productData: any, planParams: { planName: string; durationDays: number }) => {
  const now = new Date();
  const days = planParams.durationDays || 1;
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const images = productData.images || productData.productImages || [];
  const image = images[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80';

  const featuredDoc = {
    productId: productData.id,
    userId: productData.ownerId || '',
    title: productData.title || productData.productName || 'Featured Listing',
    image,
    category: productData.category || 'General',
    price: Number(productData.price || productData.rentalPrice || 0),
    location: productData.area || productData.location || 'Narela, Delhi',
    ownerName: productData.ownerName || 'Verified Member',
    featuredPlan: planParams.planName || '⭐ Featured Listing',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'Active',
    createdBy: auth.currentUser?.email || 'teamrentiwa@gmail.com',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, "featuredListings"), featuredDoc);
  return { featuredId: docRef.id, ...featuredDoc };
};

export const adminUpdateFeaturedListing = async (featuredId: string, updates: Record<string, any>) => {
  const docRef = doc(db, "featuredListings", featuredId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  return true;
};

export const adminDeleteFeaturedListing = async (featuredId: string) => {
  const docRef = doc(db, "featuredListings", featuredId);
  await deleteDoc(docRef);
  return true;
};



