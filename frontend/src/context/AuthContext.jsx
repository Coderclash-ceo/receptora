import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [businessId, setBusinessId] = useState(() => {
    return (
      (typeof localStorage !== "undefined" && localStorage.getItem("nudgeos_active_business_id")) ||
      null
    );
  });
  const [business, setBusiness] = useState(null);
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch business profile whenever businessId changes
  const fetchBusinessProfile = async (id = businessId) => {
    const targetId = id || businessId;
    if (!targetId) {
      setBusiness(null);
      return null;
    }
    try {
      const res = await api.get("/api/settings", { businessId: targetId });
      if (res && res.business) {
        setBusiness(res.business);
        return res.business;
      }
      if (res) {
        setBusiness(res);
        return res;
      }
    } catch (err) {
      console.warn("[auth] Failed to fetch business profile:", err);
      // Fallback default name based on businessId
      const isFineLook = targetId === "fine-look";
      const isJustLook = targetId === "test-business-1";
      const fallback = {
        id: targetId,
        name: isFineLook ? "Fine Look Salon" : (isJustLook ? "Just Look Salon & Spa" : "My Salon"),
        ownerName: ownerName || "Salon Owner",
        whatsappNumber: isFineLook ? "+91 98200 88776" : "+1 (555) 664-1838",
        phone: isFineLook ? "+91 98200 88776" : "+1 (555) 664-1838",
      };
      setBusiness(fallback);
      return fallback;
    }
    return null;
  };

  useEffect(() => {
    if (businessId) {
      fetchBusinessProfile(businessId);
    } else {
      setBusiness(null);
    }
  }, [businessId]);

  const refreshBusiness = async () => {
    return await fetchBusinessProfile(businessId);
  };

  // Switch active business (sets active business in local cache and backend)
  const switchBusiness = async (targetId) => {
    if (!targetId) return;
    const cleanId = targetId === "just-look" ? "test-business-1" : targetId;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nudgeos_active_business_id", cleanId);
    }
    setBusinessId(cleanId);

    try {
      await api.post("/api/auth/switch-business", { businessId: cleanId });
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
    } catch (e) {
      console.warn("[auth] switch-business backend sync warning:", e);
    }

    await fetchBusinessProfile(cleanId);
  };

  // Listen to auth state changes and extract businessId custom claims
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          const claimId =
            tokenResult.claims?.businessId && tokenResult.claims.businessId !== "bombay-salon"
              ? tokenResult.claims.businessId
              : null;

          const savedUid =
            (typeof localStorage !== "undefined" && localStorage.getItem("nudgeos_active_uid")) || null;
          const savedActiveId =
            (typeof localStorage !== "undefined" &&
              savedUid === currentUser.uid &&
              localStorage.getItem("nudgeos_active_business_id")) ||
            null;

          let finalBId = claimId || savedActiveId || null;

          // If not in token claim or cached storage, check backend /api/auth/me
          if (!finalBId) {
            try {
              const meRes = await api.get("/api/auth/me");
              if (meRes?.hasBusiness && meRes?.businessId) {
                finalBId = meRes.businessId;
              }
            } catch (_) {}
          }

          setBusinessId(finalBId);
          if (finalBId && typeof localStorage !== "undefined") {
            localStorage.setItem("nudgeos_active_business_id", finalBId);
            localStorage.setItem("nudgeos_active_uid", currentUser.uid);
          } else if (!finalBId && typeof localStorage !== "undefined") {
            localStorage.removeItem("nudgeos_active_business_id");
            localStorage.removeItem("nudgeos_active_uid");
          }

          const computedName =
            currentUser.displayName ||
            (currentUser.email ? currentUser.email.split("@")[0] : null) ||
            currentUser.phoneNumber ||
            "";
          setOwnerName(computedName);
          setUser(currentUser);
        } catch (err) {
          console.error("[auth] Failed to parse token claims:", err);
          setUser(currentUser);
          const savedUid =
            (typeof localStorage !== "undefined" && localStorage.getItem("nudgeos_active_uid")) || null;
          const fallbackId =
            (typeof localStorage !== "undefined" &&
              savedUid === currentUser.uid &&
              localStorage.getItem("nudgeos_active_business_id")) ||
            null;
          setBusinessId(fallbackId);
        }
      } else {
        // If demo user is in localStorage or sessionStorage, retain session
        const demoRaw =
          (typeof localStorage !== "undefined" && localStorage.getItem("nudgeos_demo_user")) ||
          (typeof sessionStorage !== "undefined" && sessionStorage.getItem("nudgeos_demo_user")) ||
          null;
        if (demoRaw) {
          try {
            const demo = JSON.parse(demoRaw);
            setUser({
              uid: demo.businessId === "fine-look" ? "yTIDlJ2I8dZhKVEM72q9iPeUwPf2" : "WpSwjV15sFX1pIxfHYnVKP1M2GZ2",
              displayName: demo.name,
              email: demo.email,
              getIdToken: async () => demo.token,
            });
            setBusinessId(demo.businessId || "test-business-1");
            setOwnerName(demo.name);
          } catch (_) {
            setUser(null);
            setBusinessId(null);
            setOwnerName("");
          }
        } else {
          setUser(null);
          setBusinessId(null);
          setOwnerName("");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Force refresh token to pick up newly assigned claims (e.g. after setup)
  const refreshUserClaims = async () => {
    if (!auth.currentUser) return null;
    const tokenResult = await auth.currentUser.getIdTokenResult(true);
    let bId = tokenResult.claims?.businessId || null;
    if (!bId) {
      try {
        const meRes = await api.get("/api/auth/me");
        if (meRes?.hasBusiness && meRes?.businessId) {
          bId = meRes.businessId;
        }
      } catch (_) {}
    }
    if (bId) {
      setBusinessId(bId);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("nudgeos_active_business_id", bId);
        if (auth.currentUser) {
          localStorage.setItem("nudgeos_active_uid", auth.currentUser.uid);
        }
      }
    }
    return bId;
  };

  // Google sign in with popup + fallback to redirect
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const result = await signInWithPopup(auth, provider);
      const tokenResult = await result.user.getIdTokenResult();
      let bId = tokenResult.claims?.businessId || null;
      if (!bId) {
        try {
          const meRes = await api.get("/api/auth/me");
          if (meRes?.hasBusiness && meRes?.businessId) {
            bId = meRes.businessId;
          }
        } catch (_) {}
      }
      setBusinessId(bId);
      if (bId && typeof localStorage !== "undefined") {
        localStorage.setItem("nudgeos_active_business_id", bId);
        localStorage.setItem("nudgeos_active_uid", result.user.uid);
      }
      return result.user;
    } catch (error) {
      if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
        try {
          return await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          throw new Error(getFriendlyErrorMessage(redirectErr.code));
        }
      }
      throw new Error(getFriendlyErrorMessage(error.code));
    }
  };

  // Email and password sign in
  const signInWithEmail = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const tokenResult = await result.user.getIdTokenResult(true);
      let bId = tokenResult.claims?.businessId || null;
      if (!bId) {
        try {
          const meRes = await api.get("/api/auth/me");
          if (meRes?.hasBusiness && meRes?.businessId) {
            bId = meRes.businessId;
          }
        } catch (_) {}
      }
      setBusinessId(bId);
      if (bId && typeof localStorage !== "undefined") {
        localStorage.setItem("nudgeos_active_business_id", bId);
        localStorage.setItem("nudgeos_active_uid", result.user.uid);
      }
      return result.user;
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error.code, error.message));
    }
  };

  // Email and password account registration
  const signUpWithEmail = async (email, password, displayName = "") => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(result.user, { displayName: displayName.trim() });
      }
      setBusinessId(null);
      return result.user;
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error.code, error.message));
    }
  };

  // Phone sign in setup
  const setupRecaptcha = (containerId) => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (_) {}
      window.recaptchaVerifier = null;
    }
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = "";
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (_) {}
          window.recaptchaVerifier = null;
        }
      },
    });
    return window.recaptchaVerifier;
  };

  const sendPhoneOtp = async (phoneNumber, containerId = "recaptcha-container") => {
    try {
      const verifier = setupRecaptcha(containerId);
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      return confirmationResult;
    } catch (error) {
      console.error("[auth] sendPhoneOtp error:", error);
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (_) {}
        window.recaptchaVerifier = null;
      }
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = "";
      }
      throw new Error(getFriendlyErrorMessage(error.code, error.message));
    }
  };

  // Instant demo mode for presentation and inspection
  const loginAsDemo = (demoBusinessId = "test-business-1", name = null) => {
    const targetBusinessId = demoBusinessId === "just-look" ? "test-business-1" : demoBusinessId;
    const isFineLook = targetBusinessId === "fine-look";
    const displayName = name || (isFineLook ? "Fine Look Owner" : "Just Look Owner");
    const email = isFineLook ? "finelook@salon.com" : "studypurpose896@gmail.com";
    const demoToken = isFineLook ? "demo-token-fine-look" : "demo-token";
    const demoUser = {
      uid: isFineLook ? "yTIDlJ2I8dZhKVEM72q9iPeUwPf2" : "WpSwjV15sFX1pIxfHYnVKP1M2GZ2",
      displayName,
      email,
      getIdToken: async () => demoToken,
    };
    const sessionPayload = JSON.stringify({ businessId: targetBusinessId, name: displayName, email, token: demoToken });
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("nudgeos_demo_user", sessionPayload);
      localStorage.setItem("nudgeos_active_business_id", targetBusinessId);
      localStorage.setItem("nudgeos_active_uid", demoUser.uid);
    }
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("nudgeos_demo_user", sessionPayload);
    }
    setUser(demoUser);
    setBusinessId(targetBusinessId);
    setOwnerName(displayName);
    fetchBusinessProfile(targetBusinessId);
  };

  const logout = async () => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("nudgeos_active_business_id");
        localStorage.removeItem("nudgeos_active_uid");
        localStorage.removeItem("nudgeos_demo_user");
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("nudgeos_demo_user");
      }
      await firebaseSignOut(auth);
      setUser(null);
      setBusinessId(null);
      setBusiness(null);
      setOwnerName("");
    } catch (err) {
      console.error("[auth] Logout error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        businessId,
        business,
        setBusiness,
        refreshBusiness,
        switchBusiness,
        ownerName,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPhoneOtp,
        refreshUserClaims,
        setBusinessId,
        loginAsDemo,
        loginDemo: loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getFriendlyErrorMessage(code, rawMessage = "") {
  const msg = (rawMessage || "").toLowerCase();

  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return "Incorrect email or password. Please double check and try again.";
  }
  if (code === "auth/user-not-found") {
    return "No account exists with this email address. Please create an account first.";
  }
  if (code === "auth/email-already-in-use") {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (code === "auth/weak-password") {
    return "Password must be at least 6 characters long.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please wait a minute before trying again.";
  }
  if (code === "auth/quota-exceeded" || msg.includes("quota")) {
    return "SMS quota reached. Please use our instant Google Sign-In or Demo Mode to access your salon dashboard immediately.";
  }
  if (code === "auth/invalid-phone-number") {
    return "Invalid mobile number format. Please check the digits and try again.";
  }
  if (code === "auth/network-request-failed") {
    return "Network connection issue. Please check your internet connection.";
  }

  return rawMessage || "An error occurred during authentication. Please try again.";
}
