import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

import { onAuthStateChanged } from "firebase/auth";

import {
  auth,
  signInWithGoogle,
  signInWithGitHub,
  logout,
} from "../firebase";


// =========================================================
// Context
// =========================================================

const AuthContext = createContext(null);


// =========================================================
// Provider
// =========================================================

export function AuthProvider({ children }) {

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------
  // Listen for auth state changes
  // -------------------------------------------------------

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();

  }, []);

  // -------------------------------------------------------
  // Context value
  // -------------------------------------------------------

  const value = {
    user,
    loading,
    signInWithGoogle,
    signInWithGitHub,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


// =========================================================
// Hook
// =========================================================

export function useAuth() {

  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
}

export default AuthContext;
