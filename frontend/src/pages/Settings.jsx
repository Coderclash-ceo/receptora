import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Sparkles,
  Store,
  Clock,
  Scissors,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  FileText,
  IndianRupee,
  Layers,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  SlidersHorizontal,
  Download,
} from "lucide-react";
import SalonLogo from "../components/SalonLogo";
import RecepToraLogo from "../components/logos/RecepToraLogo";
import JustLookLogo from "../components/logos/JustLookLogo";
import FineLookLogo from "../components/logos/FineLookLogo";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { business, businessId, refreshBusiness } = useAuth();

  const [activeTab, setActiveTab] = useState("onboarding"); // "onboarding" | "profile" | "services" | "hours"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Business Profile Form
  const [formData, setFormData] = useState({
    name: "",
    category: "Salon & Spa",
    city: "Mumbai",
    address: "",
    phone: "",
    whatsappNumber: "",
    phoneId: "1171981929341103",
    whatsappToken: "",
    instagram: "",
    instagramAccountId: "17841443859190444",
    instagramToken: "",
    description: "",
    hours: {
      mon: "10:00-21:00",
      tue: "10:00-21:00",
      wed: "10:00-21:00",
      thu: "10:00-21:00",
      fri: "10:00-21:00",
      sat: "10:00-21:00",
      sun: "11:00-19:00",
    },
    services: [],
  });

  // AI Onboarding Agent state
  const [rawText, setRawText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [agentStep, setAgentStep] = useState("");

  const sampleMenuText = `Fine Look Studio & Grooming Lounge
Open Monday to Saturday 10:00 AM - 9:00 PM, Sunday 11:00 AM - 7:00 PM.
Located at Phoenix Marketcity, Kurla West, Mumbai.

Our Service Menu:
1. Executive Haircut & Styling - ₹500 (35 mins)
2. Beard Sculpting & Razor Finish - ₹250 (20 mins)
3. Charcoal Detox Facial with Steam - ₹850 (45 mins)
4. Keratin Smooth Hair Treatment - ₹2,500 (90 mins)
5. Royal Ayurvedic Head Massage - ₹400 (30 mins)
6. Organic Hair Spa & Deep Conditioning - ₹1,200 (50 mins)`;

  // Fetch current business settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/settings");
      if (data) {
        setFormData({
          name: data.name || "",
          category: data.category || "Salon & Spa",
          city: data.city || "Mumbai",
          address: data.address || "",
          phone: data.phone || "",
          whatsappNumber: data.whatsappNumber || "",
          phoneId: data.whatsappPhoneNumberId || data.phoneId || "1171981929341103",
          whatsappToken: data.whatsappToken || "",
          instagram: data.instagram || "",
          instagramAccountId: data.instagramAccountId || "17841443859190444",
          instagramToken: data.instagramToken || "",
          description: data.description || "",
          hours: data.hours || {
            mon: "10:00-21:00",
            tue: "10:00-21:00",
            wed: "10:00-21:00",
            thu: "10:00-21:00",
            fri: "10:00-21:00",
            sat: "10:00-21:00",
            sun: "11:00-19:00",
          },
          services: Array.isArray(data.services) ? data.services : [],
        });
      }
    } catch (err) {
      console.error("[Settings] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [businessId]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await api.put("/api/settings", {
        ...formData,
        whatsappPhoneNumberId: formData.phoneId || formData.whatsappPhoneNumberId,
      });
      if (typeof refreshBusiness === "function") {
        await refreshBusiness();
      }
      showToast("Salon settings saved successfully!");
    } catch (err) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Run Gemini Onboarding Agent
  const handleRunOnboardingAgent = async () => {
    if (!rawText.trim()) {
      alert("Please enter or paste your salon text/menu.");
      return;
    }
    setIsExtracting(true);
    setAgentStep("Calling Gemini AI Onboarding Agent...");

    try {
      const res = await api.post("/api/settings/onboard", { rawText });
      const updatedBusiness = res.business || res;

      setAgentStep("Parsing services and business hours...");
      setExtractedData(updatedBusiness);

      // Also merge into active formData
      setFormData((prev) => ({
        ...prev,
        ...(updatedBusiness.name ? { name: updatedBusiness.name } : {}),
        services: updatedBusiness.services || prev.services,
        hours: updatedBusiness.hours || prev.hours,
      }));

      if (typeof refreshBusiness === "function") {
        await refreshBusiness();
      }

      showToast("AI Agent extracted services & hours successfully!");
    } catch (err) {
      alert("Onboarding Agent error: " + err.message);
    } finally {
      setIsExtracting(false);
      setAgentStep("");
    }
  };

  // Add new blank service
  const handleAddService = () => {
    setFormData((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        { name: "New Service", price: 500, durationMin: 30, category: "Hair" },
      ],
    }));
  };

  // Remove service
  const handleRemoveService = (index) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  // Update service field
  const handleServiceChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.services];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, services: updated };
    });
  };

  // Update hours
  const handleHourChange = (day, value) => {
    setFormData((prev) => ({
      ...prev,
      hours: { ...prev.hours, [day]: value },
    }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-[#1E2772] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-[#1E2772] text-xs font-bold rounded-full uppercase tracking-wider">
              {formData.name || "Salon"} Configuration
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Multi-Tenant Isolated
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mt-2">Settings & AI Onboarding</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure your salon brand, services catalogue, operating hours, or extract automatically via Gemini AI
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1E2772] hover:bg-[#28328c] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-[0_4px_14px_rgba(30,39,114,0.25)] transition transform active:scale-95"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-[#FF6C52]" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-[#FF6C52]" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        {[
          { id: "onboarding", label: "AI Onboarding Agent", icon: Sparkles, badge: "Gemini 3.5" },
          { id: "profile", label: "Salon Profile", icon: Store },
          { id: "channels", label: "Live Channel Connectors", icon: MessageSquare, badge: "WhatsApp & IG" },
          { id: "services", label: "Services & Pricing", icon: Scissors, count: formData.services.length },
          { id: "hours", label: "Operating Hours", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-[#1E2772] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#FF6C52]" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: AI Onboarding Agent */}
      {activeTab === "onboarding" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-gradient-to-br from-[#1E2772] to-[#2D3A96] text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FF6C52]/20 text-[#FF6C52] border border-[#FF6C52]/30 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Autonomous Onboarding Agent
              </span>
              <h2 className="text-2xl font-black leading-tight">
                Instant Salon Setup from Raw Menu Text
              </h2>
              <p className="text-indigo-200 text-sm mt-2 leading-relaxed">
                Paste your salon pamphlet, website text, or WhatsApp rate card. The Gemini AI agent automatically detects service names, duration, prices in INR, and working hours.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Paste Salon Brochure / Price List</label>
              <button
                type="button"
                onClick={() => setRawText(sampleMenuText)}
                className="text-xs font-bold text-[#FF6C52] hover:underline flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Load Sample Salon Menu</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. Haircut - Rs 500 (30 min), Beard Sculpting - Rs 250 (20 min)... Open 10 AM to 9 PM Mon-Sat..."
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E2772] resize-none"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400">
                {agentStep && (
                  <span className="text-[#1E2772] font-semibold flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF6C52]" />
                    {agentStep}
                  </span>
                )}
              </div>

              <button
                onClick={handleRunOnboardingAgent}
                disabled={isExtracting || !rawText.trim()}
                className="flex items-center justify-center gap-2 bg-[#FF6C52] hover:bg-[#e85b42] disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-bold text-xs shadow-[0_4px_14px_rgba(255,108,82,0.3)] transition transform active:scale-95"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract with Gemini AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Extracted Preview */}
          {extractedData && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.06)] space-y-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-800 text-base">
                  Extraction Results ({extractedData.services?.length || 0} Services Extracted)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {extractedData.services?.map((s, idx) => (
                  <div key={idx} className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/80">
                    <div className="font-bold text-slate-800 text-sm">{s.name}</div>
                    <div className="text-xs text-emerald-700 font-extrabold mt-1">₹{s.price}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {s.durationMin} mins • {s.category || "Service"}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  onClick={() => setActiveTab("services")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E2772] hover:underline"
                >
                  <span>Review full service catalogue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Salon Profile */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5 animate-in fade-in duration-150">
          {/* Brand Identity & Official Logos Card */}
          <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/60">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1E2772]" />
                  <span>Brand Identity & Official Logos</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vector-accurate brand marks for RecepTora, Just Look Salon, and Fine Look Salon
                </p>
              </div>
              <div className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Active Emblem:</span>
                <SalonLogo name={formData.name || (businessId === 'fine-look' ? 'Fine Look Salon' : 'Just Look Salon')} size="compact" showSubtitle={false} theme="light" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: RecepTora */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-2">SaaS Platform Logo</div>
                  <div className="py-2 flex justify-center">
                    <RecepToraLogo size="large" showSubtitle={true} theme="light" layout="vertical" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">AI Receptionist</span>
                  <a href="/logos/nudge-os-logo.svg" download="nudge-os-logo.svg" className="font-bold text-[#1E2772] hover:underline flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>SVG</span>
                  </a>
                </div>
              </div>

              {/* Card 2: Just Look Salon */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider mb-2">Flagship Salon 1</div>
                  <div className="py-2 flex justify-center">
                    <JustLookLogo size="large" showSubtitle={true} theme="light" layout="vertical" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Beauty Arch Silhouette</span>
                  <a href="/logos/just-look-logo.svg" download="just-look-logo.svg" className="font-bold text-[#1E2772] hover:underline flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>SVG</span>
                  </a>
                </div>
              </div>

              {/* Card 3: Fine Look Salon */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">Flagship Salon 2</div>
                  <div className="py-2 flex justify-center">
                    <FineLookLogo size="large" showSubtitle={true} theme="light" layout="vertical" />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Crossed Shears & Comb</span>
                  <a href="/logos/fine-look-logo.svg" download="fine-look-logo.svg" className="font-bold text-[#1E2772] hover:underline flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    <span>SVG</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Salon / Business Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E2772]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E2772]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E2772]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Official Salon Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E2772]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp Business Number / ID</label>
              <input
                type="text"
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                placeholder="e.g. +91 98200 11223"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E2772]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Physical Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E2772]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Salon Description / Bio</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E2772] resize-none"
            />
          </div>
        </form>
      )}

      {/* TAB 3: Services & Pricing Menu */}
      {activeTab === "services" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-extrabold text-slate-800 text-lg">Services Catalogue & Rates</h2>
              <p className="text-xs text-slate-400">Used by WhatsApp AI Receptionist to provide exact quotes</p>
            </div>
            <button
              onClick={handleAddService}
              className="flex items-center gap-1.5 bg-[#1E2772] hover:bg-[#28328c] text-white px-4 py-2 rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5 text-[#FF6C52]" />
              <span>Add Service</span>
            </button>
          </div>

          <div className="space-y-3">
            {formData.services.map((s, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 hover:border-slate-200 transition"
              >
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Service Name</label>
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => handleServiceChange(idx, "name", e.target.value)}
                    className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="w-full sm:w-28">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Category</label>
                  <input
                    type="text"
                    value={s.category || "General"}
                    onChange={(e) => handleServiceChange(idx, "category", e.target.value)}
                    className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700"
                  />
                </div>

                <div className="w-full sm:w-28">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Duration (mins)</label>
                  <input
                    type="number"
                    value={s.durationMin || 30}
                    onChange={(e) => handleServiceChange(idx, "durationMin", Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
                  />
                </div>

                <div className="w-full sm:w-28">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Price (₹)</label>
                  <input
                    type="number"
                    value={s.price || 0}
                    onChange={(e) => handleServiceChange(idx, "price", Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-black text-slate-800"
                  />
                </div>

                <div className="sm:self-end pb-1">
                  <button
                    onClick={() => handleRemoveService(idx)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                    title="Delete service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Operating Hours */}
      {activeTab === "hours" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-5 animate-in fade-in duration-150">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-800 text-lg">Weekly Operating Hours</h2>
            <p className="text-xs text-slate-400">
              The AI Receptionist automatically books slots strictly within these hours
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { day: "mon", label: "Monday" },
              { day: "tue", label: "Tuesday" },
              { day: "wed", label: "Wednesday" },
              { day: "thu", label: "Thursday" },
              { day: "fri", label: "Friday" },
              { day: "sat", label: "Saturday" },
              { day: "sun", label: "Sunday" },
            ].map(({ day, label }) => (
              <div key={day} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs w-28">{label}</span>
                <input
                  type="text"
                  value={formData.hours[day] || "10:00-21:00"}
                  onChange={(e) => handleHourChange(day, e.target.value)}
                  placeholder="e.g. 10:00-21:00 or closed"
                  className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 w-36 text-center focus:outline-none focus:ring-2 focus:ring-[#1E2772]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Live Channel Connectors */}
      {activeTab === "channels" && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6 animate-in fade-in duration-150">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-800 text-lg">WhatsApp Business Connector Setup</h2>
              <p className="text-xs text-slate-400">
                • Connect your salon's WhatsApp Business number to the AI Receptionist
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Routing Ready
            </span>
          </div>

          <div className="max-w-2xl">
            {/* WhatsApp Card */}
            <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                    W
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">WhatsApp Business Channel</h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-md border border-emerald-200">
                  Active
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Salon WhatsApp Business Phone Number *
                </label>
                <input
                  type="text"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="+1 (555) 664-1838"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-[#1E2772] outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  • Inbound WhatsApp texts from clients route directly to the AI Reception Agent.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Meta Cloud API Phone Number ID
                </label>
                <input
                  type="text"
                  value={formData.phoneId || "1171981929341103"}
                  onChange={(e) => setFormData({ ...formData, phoneId: e.target.value.trim() })}
                  placeholder="1171981929341103"
                  className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-[#1E2772] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Meta Graph API Access Token (WHATSAPP_TOKEN)
                </label>
                <input
                  type="password"
                  value={formData.whatsappToken || ""}
                  onChange={(e) => setFormData({ ...formData, whatsappToken: e.target.value.trim() })}
                  placeholder="EAAG... (paste your Meta Access Token here)"
                  className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-[#1E2772] outline-none"
                />
                <div className="mt-2 p-3 bg-emerald-100/60 rounded-xl text-[11px] text-emerald-950 space-y-1 border border-emerald-200/60">
                  <p className="font-bold">Required for Live WhatsApp Dispatch:</p>
                  <p>• Copy your token from <b>developers.facebook.com</b> &rarr; App &rarr; WhatsApp &rarr; API Setup.</p>
                  <p>• If using Meta's Cloud API Test Number (+1 555-664-1838), add the client's phone number to your test recipient list.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook Developer Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-700 text-xs block">Meta Cloud API & Webhook Configuration</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Production Webhook Callback URL:</span>
                <input
                  type="text"
                  readOnly
                  value="https://nudge-os-github.onrender.com/webhook"
                  className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 select-all"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Dedicated WhatsApp Business Webhook</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Verification Token:</span>
                <input
                  type="text"
                  readOnly
                  value="receptora123"
                  className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 select-all"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Enter in Meta App Dashboard</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-[#1E2772] hover:bg-[#161D5A] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Channel Credentials</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
