import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageSquare,
  Sparkles,
  Calendar,
  ShieldAlert,
  Award,
  Clock,
  Send,
  X,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Customers() {
  const { business, businessId } = useAuth();
  const salonName = business?.name || (businessId === "fine-look" ? "Fine Look Salon" : "Just Look Salon");

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");

  // Nudge Modal State
  const [nudgeModalClient, setNudgeModalClient] = useState(null);
  const [nudgeMessage, setNudgeMessage] = useState("");
  const [isSendingNudge, setIsSendingNudge] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Add Client Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    phone: "",
    lastService: "Haircut",
    tags: ["regular"],
    notes: "",
  });
  const [isAdding, setIsAdding] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/api/customers");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[Customers] Failed to fetch:", err);
      setError(err.message || "Failed to load clients directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [businessId]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Helper: check if client is at risk (> 25 days since last visit)
  const isClientAtRisk = (customer) => {
    if (!customer.lastVisit) return false;
    const daysSince = Math.floor((new Date() - new Date(customer.lastVisit)) / (1000 * 60 * 60 * 24));
    return daysSince > 25 || (customer.tags && customer.tags.includes("at-risk"));
  };

  const getDaysAgo = (dateStr) => {
    if (!dateStr) return "Never";
    const days = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  // Open Nudge Modal
  const handleOpenNudgeModal = (customer) => {
    setNudgeModalClient(customer);
    const defaultDraft = `Hi ${customer.name}! We've missed having you at ${salonName}. It's been a few weeks since your last ${customer.lastService || "session"} — reply here to book your next slot and enjoy our priority styling.`;
    setNudgeMessage(defaultDraft);
  };

  // Dispatch Retention Nudge
  const handleSendNudge = async () => {
    if (!nudgeModalClient) return;
    setIsSendingNudge(true);
    try {
      const res = await api.post(`/api/customers/${nudgeModalClient.id}/nudge`, {
        customMessage: nudgeMessage,
      });
      showToast(`Retention WhatsApp nudge delivered to ${nudgeModalClient.name}!`);
      setNudgeModalClient(null);
    } catch (err) {
      alert("Failed to dispatch nudge: " + err.message);
    } finally {
      setIsSendingNudge(false);
    }
  };

  // Add new customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newClient.name || !newClient.phone) {
      alert("Please enter customer name and phone.");
      return;
    }
    setIsAdding(true);
    try {
      const res = await api.post("/api/customers", newClient);
      const created = res.customer || res;
      setCustomers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewClient({
        name: "",
        phone: "",
        lastService: "Haircut",
        tags: ["regular"],
        notes: "",
      });
      showToast(`Client ${created.name} added to ${salonName} directory!`);
    } catch (err) {
      alert("Error adding client: " + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  // Filter logic
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.lastService && c.lastService.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedTag === "all") return true;
    if (selectedTag === "at-risk") return isClientAtRisk(c);
    if (selectedTag === "vip") return c.tags && c.tags.includes("vip");
    if (selectedTag === "regular") return c.tags && c.tags.includes("regular");

    return true;
  });

  const totalClients = customers.length;
  const vipCount = customers.filter((c) => c.tags && c.tags.includes("vip")).length;
  const atRiskCount = customers.filter(isClientAtRisk).length;
  const regularCount = customers.filter((c) => c.tags && c.tags.includes("regular")).length;

  return (
    <div className="space-y-6">
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
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-indigo-50 text-[#1E2772] text-xs font-bold rounded-full uppercase tracking-wider">
              {salonName} Clients
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Retention Agent Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mt-2">Client Directory & Retention</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track client visit frequency, churn risk, and trigger 1-click personalized AI WhatsApp nudges
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition border border-slate-200/70"
            title="Refresh clients"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#FF6C52]" : ""}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-[#FF6C52] hover:bg-[#e85b42] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-[0_4px_14px_rgba(255,108,82,0.3)] transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Pill Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Directory</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#1E2772]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">{totalClients}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Enrolled salon clients</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">VIP Members</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 mt-2">{vipCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">High frequency & spend</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Regulars</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{regularCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Visits within 25 days</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">At-Risk Churn</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">{atRiskCount}</div>
          <div className="text-[11px] text-rose-500 font-semibold mt-0.5">Needs win-back nudge</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client, phone, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Clients" },
            { id: "vip", label: "VIP Tier" },
            { id: "regular", label: "Regulars" },
            { id: "at-risk", label: "At-Risk (>25 Days)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTag(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedTag === tab.id
                  ? "bg-[#1E2772] text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Directory Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-[#FF6C52] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading client directory...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-500">
            <p className="font-semibold text-sm">{error}</p>
            <button
              onClick={fetchCustomers}
              className="mt-3 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
            >
              Retry
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4 border border-slate-100">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-700 text-base">No clients found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No clients matching "${searchQuery}".`
                : "No clients enrolled under this filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Client Profile</th>
                  <th className="py-4 px-6">Contact</th>
                  <th className="py-4 px-6">Last Service</th>
                  <th className="py-4 px-6">Last Visit</th>
                  <th className="py-4 px-6">Tier & Health</th>
                  <th className="py-4 px-6 text-right">Retention AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCustomers.map((c) => {
                  const atRisk = isClientAtRisk(c);
                  const isVip = c.tags && c.tags.includes("vip");

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition group">
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isVip
                                ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm"
                                : atRisk
                                ? "bg-rose-50 text-rose-600 border border-rose-100"
                                : "bg-indigo-50 text-[#1E2772] border border-indigo-100"
                            }`}
                          >
                            {(c.name || "C").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {isVip && (
                                <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase">
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">ID: {c.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">{c.phone || "No phone"}</span>
                          {c.phone && (
                            <a
                              href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-1 hover:bg-emerald-50 rounded-lg transition"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Last Service */}
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-700 bg-slate-100/80 px-3 py-1 rounded-xl text-xs">
                          {c.lastService || "Haircut & Grooming"}
                        </span>
                      </td>

                      {/* Last Visit */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">{c.lastVisit || "Recent"}</div>
                        <div
                          className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1 ${
                            atRisk ? "text-rose-500" : "text-slate-400"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{getDaysAgo(c.lastVisit)}</span>
                        </div>
                      </td>

                      {/* Status Tags */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          {atRisk ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <ShieldAlert className="w-3 h-3 text-rose-500" />
                              <span>At-Risk</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleOpenNudgeModal(c)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                            atRisk
                              ? "bg-[#FF6C52] hover:bg-[#e85b42] text-white shadow-[0_2px_8px_rgba(255,108,82,0.3)] animate-pulse"
                              : "bg-slate-100 hover:bg-[#1E2772] hover:text-white text-slate-700"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Send Nudge</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Retention Nudge Composer Modal */}
      {nudgeModalClient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FF6C52]/10 flex items-center justify-center text-[#FF6C52]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Send AI Retention Nudge</h3>
                  <p className="text-xs text-slate-400">Personalized WhatsApp win-back via Gemini AI</p>
                </div>
              </div>
              <button
                onClick={() => setNudgeModalClient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-4">
              {/* Recipient summary */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Client</span>
                  <span className="text-sm font-extrabold text-slate-800">{nudgeModalClient.name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Last Service</span>
                  <span className="text-xs font-bold text-slate-700">{nudgeModalClient.lastService}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold block">Last Visit</span>
                  <span className="text-xs font-bold text-rose-500">{getDaysAgo(nudgeModalClient.lastVisit)}</span>
                </div>
              </div>

              {/* Message Composer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">WhatsApp Message Draft</label>
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Generated by Retention Agent
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={nudgeMessage}
                  onChange={(e) => setNudgeMessage(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800 resize-none"
                />
              </div>

              {/* WhatsApp Live Preview */}
              <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span>WhatsApp Message Preview</span>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-sm max-w-sm ml-auto text-xs text-slate-800 leading-relaxed rounded-tr-none border border-slate-200/50">
                  <p>{nudgeMessage}</p>
                  <div className="text-[10px] text-slate-400 text-right mt-1.5 font-medium">Just now • ✓✓</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNudgeModalClient(null)}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendNudge}
                disabled={isSendingNudge}
                className="px-6 py-2.5 bg-[#FF6C52] hover:bg-[#e85b42] text-white rounded-2xl text-xs font-bold shadow-[0_4px_14px_rgba(255,108,82,0.3)] transition transform active:scale-95 flex items-center gap-2"
              >
                {isSendingNudge ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send WhatsApp Nudge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#1E2772]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Add New Client</h3>
                  <p className="text-xs text-slate-400">Enroll to {salonName} database</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="py-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sameer Kulkarni"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number (with Country Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98200 12345"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Last Service</label>
                  <input
                    type="text"
                    placeholder="e.g. Executive Haircut"
                    value={newClient.lastService}
                    onChange={(e) => setNewClient({ ...newClient, lastService: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Client Tier</label>
                  <select
                    value={newClient.tags[0] || "regular"}
                    onChange={(e) => setNewClient({ ...newClient, tags: [e.target.value] })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800 font-semibold"
                  >
                    <option value="regular">Regular</option>
                    <option value="vip">VIP Member</option>
                    <option value="at-risk">At-Risk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Preferences</label>
                <input
                  type="text"
                  placeholder="e.g. Regular client since 2024"
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-6 py-2.5 bg-[#1E2772] hover:bg-[#28328c] text-white rounded-2xl text-xs font-bold transition flex items-center gap-2"
                >
                  {isAdding ? "Saving..." : "Add to Directory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
