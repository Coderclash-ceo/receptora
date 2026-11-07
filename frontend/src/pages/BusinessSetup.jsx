import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, ArrowRight, User, Phone, MapPin, Sparkles, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { auth } from "../firebase";
import SalonLogo from "../components/SalonLogo";

export default function BusinessSetup() {
  const navigate = useNavigate();
  const { user, refreshUserClaims, setBusinessId, logout } = useAuth();

  const [ownerName, setOwnerName] = useState(user?.displayName || "");
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState(user?.phoneNumber || "");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Hair Studio & Salon");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      setError("Please enter your full name as salon owner.");
      return;
    }
    if (!businessName.trim()) {
      setError("Please enter your salon or studio name.");
      return;
    }
    if (!whatsappNumber.trim()) {
      setError("Please enter your WhatsApp contact number.");
      return;
    }
    if (!city.trim()) {
      setError("Please enter your salon's city or location.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Call backend to create business, save details, and attach businessId claim to user
      const res = await api.post("/api/auth/setup", {
        ownerName: ownerName.trim(),
        businessName: businessName.trim(),
        whatsappNumber: whatsappNumber.trim(),
        phone: whatsappNumber.trim(),
        city: city.trim(),
        category,
      });

      // Force refresh user claims to acquire businessId in token
      if (auth?.currentUser) {
        try {
          await auth.currentUser.getIdToken(true);
        } catch (_) {}
      }
      const chosenId = res?.businessId || (await refreshUserClaims());
      if (chosenId && setBusinessId) {
        setBusinessId(chosenId);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("receptora_active_business_id", chosenId);
        }
      }

      // Proceed into dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("[Setup] Creation error:", err);
      setError(
        err.message ||
          "Could not initialize business profile. If backend setup route is pending, please contact your admin."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5FA] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl w-full bg-white rounded-[32px] p-8 sm:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.04)] border border-slate-100">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
          <div>
            <SalonLogo name="RecepTora" size="default" showSubtitle={true} theme="light" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Salon Setup</span>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Configure your salon
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Welcome to RecepTora. Enter your salon details to configure your AI receptionist and booking system.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50/80 border border-red-200 rounded-2xl text-red-700 text-xs font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Owner Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Owner Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Kashyap Makwana"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-slate-200 focus:border-[#1E2772] focus:ring-4 focus:ring-[#1E2772]/10 outline-none text-slate-900 font-semibold text-sm transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Salon / Business Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Salon / Studio Name
            </label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Luxe Hair & Spa"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-slate-200 focus:border-[#1E2772] focus:ring-4 focus:ring-[#1E2772]/10 outline-none text-slate-900 font-semibold text-sm transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp / Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                WhatsApp Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+91 83692 97980"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-slate-200 focus:border-[#1E2772] focus:ring-4 focus:ring-[#1E2772]/10 outline-none text-slate-900 font-semibold text-sm transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* City / Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                City / Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Mumbai, Kurla"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-slate-200 focus:border-[#1E2772] focus:ring-4 focus:ring-[#1E2772]/10 outline-none text-slate-900 font-semibold text-sm transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Salon Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category / Studio Type
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl border-2 border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:border-[#1E2772] text-sm"
            >
              <option value="Hair Studio & Salon">Hair Studio & Salon</option>
              <option value="Luxury Spa & Wellness">Luxury Spa & Wellness</option>
              <option value="Nail & Lash Lounge">Nail & Lash Lounge</option>
              <option value="Barber & Grooming Lounge">Barber & Grooming Lounge</option>
              <option value="Skin Clinic & Aesthetics">Skin Clinic & Aesthetics</option>
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 rounded-2xl bg-[#1E2772] hover:bg-[#232B7A] text-white font-semibold flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50 text-sm"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Create Salon Account & Open Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={logout}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition"
            >
              Sign out and return to login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
