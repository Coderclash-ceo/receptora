import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Phone,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Mail,
  Lock,
  User,
  Store,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import OtpInput from "../components/OtpInput";
import SalonLogo from "../components/SalonLogo";
import { api } from "../api/client";
import { auth } from "../firebase";

export default function Login() {
  const navigate = useNavigate();
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPhoneOtp,
    refreshUserClaims,
    setBusinessId,
    ownerName,
    loginAsDemo,
  } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [authMethod, setAuthMethod] = useState("choice"); // "choice" | "phone" | "otp" | "email"
  const [noAccountPrompt, setNoAccountPrompt] = useState(false);
  const [phoneSetupNeeded, setPhoneSetupNeeded] = useState(false);

  // Phone state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [resendCountdown, setResendCountdown] = useState(30);

  // Email & Signup state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupOwnerName, setSignupOwnerName] = useState("");
  const [signupSalonName, setSignupSalonName] = useState("");
  const [signupWhatsApp, setSignupWhatsApp] = useState("");
  const [signupCity, setSignupCity] = useState("");
  const [signupCategory, setSignupCategory] = useState("Hair Studio & Salon");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (authMethod === "otp" && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authMethod, resendCountdown]);

  // Google sign in
  const handleGoogleSignIn = async () => {
    setError("");
    setNoAccountPrompt(false);
    setGoogleLoading(true);
    try {
      const gUser = await signInWithGoogle();
      const tokenResult = await gUser.getIdTokenResult(true);
      let claimBId =
        tokenResult.claims?.businessId && tokenResult.claims.businessId !== "bombay-salon"
          ? tokenResult.claims.businessId
          : null;

      if (!claimBId) {
        try {
          const meRes = await api.get("/api/auth/me");
          if (meRes?.hasBusiness && meRes?.businessId) {
            claimBId = meRes.businessId;
          }
        } catch (_) {}
      }

      if (claimBId) {
        if (setBusinessId) setBusinessId(claimBId);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("receptora_active_business_id", claimBId);
          localStorage.setItem("receptora_active_uid", gUser.uid);
        }
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/setup", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Email & Password login / signup
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setNoAccountPrompt(false);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        if (!signupOwnerName.trim()) {
          setError("Please enter your name as salon owner.");
          setLoading(false);
          return;
        }
        if (!signupSalonName.trim()) {
          setError("Please enter your salon or studio name.");
          setLoading(false);
          return;
        }
        if (!signupWhatsApp.trim()) {
          setError("Please enter your WhatsApp contact number.");
          setLoading(false);
          return;
        }
        if (!signupCity.trim()) {
          setError("Please enter your salon's city/location.");
          setLoading(false);
          return;
        }

        // 1. Create Firebase Auth user
        await signUpWithEmail(email, password, signupOwnerName);

        // 2. Call backend /setup to create business and link custom claim
        const res = await api.post("/api/auth/setup", {
          ownerName: signupOwnerName.trim(),
          businessName: signupSalonName.trim(),
          whatsappNumber: signupWhatsApp.trim(),
          phone: signupWhatsApp.trim(),
          city: signupCity.trim(),
          category: signupCategory,
        });

        const bId = await refreshUserClaims();
        const finalBId = bId || res?.businessId;
        if (finalBId && setBusinessId) {
          setBusinessId(finalBId);
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("receptora_active_business_id", finalBId);
            if (auth.currentUser) {
              localStorage.setItem("receptora_active_uid", auth.currentUser.uid);
            }
          }
        }

        navigate("/dashboard", { replace: true });
      } else {
        // Normal login
        const loggedUser = await signInWithEmail(email, password);
        const tokenResult = await loggedUser.getIdTokenResult(true);
        let bId =
          tokenResult.claims?.businessId && tokenResult.claims.businessId !== "bombay-salon"
            ? tokenResult.claims.businessId
            : null;

        if (!bId) {
          try {
            const meRes = await api.get("/api/auth/me");
            if (meRes?.hasBusiness && meRes?.businessId) {
              bId = meRes.businessId;
            }
          } catch (_) {}
        }

        if (bId) {
          if (setBusinessId) setBusinessId(bId);
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("receptora_active_business_id", bId);
            localStorage.setItem("receptora_active_uid", loggedUser.uid);
          }
          navigate("/dashboard", { replace: true });
        } else {
          // New user who registered without business setup
          navigate("/setup", { replace: true });
        }
      }
    } catch (err) {
      const code = err.code || "";
      const rawMsg = err.message || "";
      if (
        code === "auth/user-not-found" ||
        code === "auth/invalid-credential" ||
        rawMsg.includes("user-not-found") ||
        rawMsg.includes("No account exists with this email")
      ) {
        setNoAccountPrompt(true);
      } else {
        setError(rawMsg || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setNoAccountPrompt(false);
    const cleanNumber = phoneNumber.trim().replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${countryCode}${cleanNumber}`;
      const result = await sendPhoneOtp(fullPhone, "recaptcha-container");
      setConfirmationResult(result);
      setAuthMethod("otp");
      setResendCountdown(30);
    } catch (err) {
      setError(err.message || "Could not send verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP code
  const handleVerifyOtp = async (codeToVerify) => {
    const code = codeToVerify || otpCode;
    if (!code || code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    if (!confirmationResult) {
      setError("Verification session expired. Please request a new code.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const cred = await confirmationResult.confirm(code);
      const user = cred.user;

      const tokenResult = await user.getIdTokenResult(true);
      let bId =
        tokenResult.claims?.businessId && tokenResult.claims.businessId !== "bombay-salon"
          ? tokenResult.claims.businessId
          : null;

      if (!bId) {
        try {
          const meRes = await api.get("/api/auth/me");
          if (meRes?.hasBusiness && meRes?.businessId) {
            bId = meRes.businessId;
          }
        } catch (_) {}
      }

      if (bId) {
        if (setBusinessId) setBusinessId(bId);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("receptora_active_business_id", bId);
          localStorage.setItem("receptora_active_uid", user.uid);
        }
        navigate("/dashboard", { replace: true });
      } else {
        // Brand new phone user -> switch to phone onboarding step
        setPhoneSetupNeeded(true);
        setSignupWhatsApp(`${countryCode}${phoneNumber}`);
      }
    } catch (err) {
      setError(
        err.code === "auth/invalid-verification-code"
          ? "Incorrect 6-digit code. Please double-check and re-enter."
          : err.message || "Code verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Complete phone user onboarding
  const handlePhoneCompleteSetup = async (e) => {
    e.preventDefault();
    if (!signupOwnerName.trim()) {
      setError("Please enter your name as salon owner.");
      return;
    }
    if (!signupSalonName.trim()) {
      setError("Please enter your salon or studio name.");
      return;
    }
    if (!signupCity.trim()) {
      setError("Please enter your salon's city/location.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/setup", {
        ownerName: signupOwnerName.trim(),
        businessName: signupSalonName.trim(),
        whatsappNumber: signupWhatsApp.trim() || `${countryCode}${phoneNumber}`,
        phone: signupWhatsApp.trim() || `${countryCode}${phoneNumber}`,
        city: signupCity.trim(),
        category: signupCategory,
      });

      const bId = await refreshUserClaims();
      const finalBId = bId || res?.businessId;
      if (finalBId && setBusinessId) {
        setBusinessId(finalBId);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("receptora_active_business_id", finalBId);
          if (auth.currentUser) {
            localStorage.setItem("receptora_active_uid", auth.currentUser.uid);
          }
        }
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to initialize salon account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5FA] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-4xl bg-white rounded-[32px] shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Left Branded Panel */}
        <div className="lg:col-span-5 bg-[#1E2772] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF6C52]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="mb-8">
              <SalonLogo name="RecepTora" size="large" showSubtitle={true} theme="dark" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
              {ownerName ? `Welcome back, ${ownerName}` : "Smart salon bookings on autopilot."}
            </h1>
            <p className="text-indigo-200 text-sm leading-relaxed mb-6">
              AI receptionists and client retention agents for modern salons. Manage appointments, revenue targets, and customer queries without lifting a finger.
            </p>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/10 flex items-center gap-3 text-xs text-indigo-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Bank-grade encryption & tenant isolation</span>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            {/* Phone User First-Time Setup Prompt */}
            {phoneSetupNeeded ? (
              <div className="space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Phone Verified Successfully</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Set up your salon
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    You're almost there! Enter your salon details to create your account and launch your dashboard.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-700 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handlePhoneCompleteSetup} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Owner Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Kashyap Makwana"
                        value={signupOwnerName}
                        onChange={(e) => setSignupOwnerName(e.target.value)}
                        required
                        className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 focus:border-[#1E2772] outline-none text-slate-900 font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Salon / Studio Name
                    </label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Luxe Hair Studio"
                        value={signupSalonName}
                        onChange={(e) => setSignupSalonName(e.target.value)}
                        required
                        className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 focus:border-[#1E2772] outline-none text-slate-900 font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        WhatsApp Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={signupWhatsApp}
                          onChange={(e) => setSignupWhatsApp(e.target.value)}
                          required
                          className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 focus:border-[#1E2772] outline-none text-slate-900 font-semibold text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        City / Location
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Mumbai"
                          value={signupCity}
                          onChange={(e) => setSignupCity(e.target.value)}
                          required
                          className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 focus:border-[#1E2772] outline-none text-slate-900 font-semibold text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Salon Category
                    </label>
                    <select
                      value={signupCategory}
                      onChange={(e) => setSignupCategory(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:border-[#1E2772] text-xs"
                    >
                      <option value="Hair Studio & Salon">Hair Studio & Salon</option>
                      <option value="Luxury Spa & Wellness">Luxury Spa & Wellness</option>
                      <option value="Nail & Lash Lounge">Nail & Lash Lounge</option>
                      <option value="Barber & Grooming Lounge">Barber & Grooming Lounge</option>
                      <option value="Skin Clinic & Aesthetics">Skin Clinic & Aesthetics</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 px-5 rounded-xl bg-[#1E2772] hover:bg-[#232B7A] text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 text-xs shadow-sm"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Complete Setup & Launch Dashboard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <>
                {/* Header / Mode Switch */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">
                      {mode === "login" ? "Sign in to your salon" : "Create salon account"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {mode === "login"
                        ? "Welcome back! Choose how you'd like to sign in."
                        : "Get started with your AI-powered salon manager in seconds."}
                    </p>
                  </div>

                  {authMethod === "choice" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === "login" ? "signup" : "login");
                        setError("");
                        setNoAccountPrompt(false);
                      }}
                      className="text-xs font-bold text-[#1E2772] hover:underline"
                    >
                      {mode === "login" ? "Create account" : "Log in"}
                    </button>
                  )}
                </div>

                {/* No Account Prompt (shown when unrecognized user attempts to log in) */}
                {noAccountPrompt && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2.5 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5 text-amber-900 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">No salon account found</p>
                        <p className="text-amber-700 font-normal mt-0.5 leading-relaxed">
                          We couldn't find an existing salon account for <strong>{email}</strong>. Would you like to create your account first?
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setNoAccountPrompt(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNoAccountPrompt(false);
                          setMode("signup");
                          setError("");
                        }}
                        className="px-4 py-1.5 text-xs bg-[#1E2772] hover:bg-[#232B7A] text-white font-bold rounded-xl transition shadow-sm"
                      >
                        Create Salon Account First
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50/80 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-sm animate-shake">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                    <span className="flex-1 leading-relaxed text-xs">{error}</span>
                  </div>
                )}

                {/* STEP 1: Choice of Auth Method */}
                {authMethod === "choice" && (
                  <div className="space-y-3.5">
                    {/* Google Button */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loading}
                      className="w-full h-12 px-4 rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800 font-semibold flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:opacity-50 text-sm"
                    >
                      {googleLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      )}
                      <span>Continue with Google</span>
                    </button>

                    {/* Phone Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod("phone");
                        setError("");
                        setNoAccountPrompt(false);
                      }}
                      className="w-full h-12 px-4 rounded-2xl bg-[#1E2772] hover:bg-[#232B7A] text-white font-semibold flex items-center justify-center gap-2.5 transition-all shadow-sm focus:outline-none focus:ring-4 focus:ring-[#1E2772]/20 text-sm"
                    >
                      <Phone className="w-4 h-4 text-indigo-200" />
                      <span>Continue with Phone Number (SMS OTP)</span>
                    </button>

                    {/* Email & Password Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMethod("email");
                        setError("");
                        setNoAccountPrompt(false);
                      }}
                      className="w-full h-12 px-4 rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800 font-semibold flex items-center justify-center gap-2.5 transition-all focus:outline-none focus:ring-4 focus:ring-slate-100 text-sm"
                    >
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span>Continue with Email & Password</span>
                    </button>
                  </div>
                )}

                {/* STEP 2A: Email & Password Form */}
                {authMethod === "email" && (
                  <form onSubmit={handleEmailAuth} className="space-y-3.5">
                    {mode === "signup" && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Owner Name
                            </label>
                            <div className="relative">
                              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Kashyap Makwana"
                                value={signupOwnerName}
                                onChange={(e) => setSignupOwnerName(e.target.value)}
                                required
                                className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 focus:border-[#1E2772] outline-none text-slate-900 font-semibold text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Salon Name
                            </label>
                            <div className="relative">
                              <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Luxe Hair & Spa"
                                value={signupSalonName}
                                onChange={(e) => setSignupSalonName(e.target.value)}
                                required
                                className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 focus:border-[#1E2772] outline-none text-slate-900 font-semibold text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              WhatsApp Number
                            </label>
                            <div className="relative">
                              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="tel"
                                placeholder="+91 98200 88776"
                                value={signupWhatsApp}
                                onChange={(e) => setSignupWhatsApp(e.target.value)}
                                required
                                className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 focus:border-[#1E2772] outline-none text-slate-900 font-semibold text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              City / Location
                            </label>
                            <div className="relative">
                              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Mumbai, Bandra"
                                value={signupCity}
                                onChange={(e) => setSignupCity(e.target.value)}
                                required
                                className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 focus:border-[#1E2772] outline-none text-slate-900 font-semibold text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Salon Category
                          </label>
                          <select
                            value={signupCategory}
                            onChange={(e) => setSignupCategory(e.target.value)}
                            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:border-[#1E2772] text-xs"
                          >
                            <option value="Hair Studio & Salon">Hair Studio & Salon</option>
                            <option value="Luxury Spa & Wellness">Luxury Spa & Wellness</option>
                            <option value="Nail & Lash Lounge">Nail & Lash Lounge</option>
                            <option value="Barber & Grooming Lounge">Barber & Grooming Lounge</option>
                            <option value="Skin Clinic & Aesthetics">Skin Clinic & Aesthetics</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          placeholder="owner@salon.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 focus:border-[#1E2772] outline-none text-slate-900 font-semibold text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-200 focus:border-[#1E2772] outline-none text-slate-900 font-semibold text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod("choice");
                          setError("");
                          setNoAccountPrompt(false);
                        }}
                        className="h-11 px-4 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition text-xs"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 h-11 px-5 rounded-xl bg-[#1E2772] hover:bg-[#232B7A] text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 text-xs"
                      >
                        {loading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>{mode === "login" ? "Sign In" : "Create Account & Salon"}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2B: Phone Input Form */}
                {authMethod === "phone" && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Mobile Phone Number
                      </label>

                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="h-12 px-3 rounded-2xl border-2 border-slate-200 bg-white font-semibold text-slate-800 text-sm focus:outline-none focus:border-[#1E2772]"
                        >
                          <option value="+91">IN +91</option>
                          <option value="+1">US +1</option>
                          <option value="+44">UK +44</option>
                          <option value="+971">AE +971</option>
                        </select>

                        <input
                          type="tel"
                          placeholder="98765 43210"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          required
                          autoFocus
                          className="flex-1 h-12 px-4 rounded-2xl border-2 border-slate-200 focus:border-[#1E2772] focus:ring-4 focus:ring-[#1E2772]/10 outline-none text-slate-900 font-semibold text-sm transition-all placeholder:text-slate-400"
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        We will send a 6-digit one-time verification code via SMS.
                      </p>
                    </div>

                    {/* Invisible reCAPTCHA container */}
                    <div id="recaptcha-container"></div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod("choice");
                          setError("");
                          setNoAccountPrompt(false);
                        }}
                        className="h-12 px-5 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 h-12 px-6 rounded-2xl bg-[#1E2772] hover:bg-[#232B7A] text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        {loading ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <span>Send OTP</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: OTP Verification */}
                {authMethod === "otp" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        Enter Verification Code
                      </h3>
                      <p className="text-xs text-slate-500">
                        We sent a 6-digit code to{" "}
                        <span className="font-semibold text-slate-800">
                          {countryCode} {phoneNumber}
                        </span>
                      </p>
                    </div>

                    <div className="py-2 flex justify-center">
                      <OtpInput
                        length={6}
                        value={otpCode}
                        onChange={(val) => {
                          setOtpCode(val);
                          if (val.length === 6) {
                            handleVerifyOtp(val);
                          }
                        }}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                      <span>Didn't receive the code?</span>
                      {resendCountdown > 0 ? (
                        <span className="text-slate-400 font-medium">
                          Resend in {resendCountdown}s
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={loading}
                          className="font-bold text-[#1E2772] hover:underline"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod("phone");
                          setOtpCode("");
                          setError("");
                        }}
                        className="h-12 px-5 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
                      >
                        Change Number
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyOtp()}
                        disabled={loading || otpCode.length !== 6}
                        className="flex-1 h-12 px-6 rounded-2xl bg-[#1E2772] hover:bg-[#232B7A] text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        {loading ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <span>Verify & Continue</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
