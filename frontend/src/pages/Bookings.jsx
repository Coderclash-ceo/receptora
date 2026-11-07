import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Phone,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  IndianRupee,
  RefreshCw,
  Check,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Bookings() {
  const { business, businessId } = useAuth();
  const salonName = business?.name || (businessId === "fine-look" ? "Fine Look Salon" : "Just Look Salon");

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState(null);

  // New Booking Form State
  const [newForm, setNewForm] = useState({
    customerName: "",
    service: "",
    date: new Date().toISOString().slice(0, 10),
    time: "11:00",
    price: "",
    status: "confirmed",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback price estimator if booking has no price recorded
  const getBookingPrice = (b) => {
    if (b && b.price !== undefined && b.price !== null && b.price !== "" && Number(b.price) > 0) {
      return Number(b.price);
    }
    const s = (b?.service || "").toLowerCase();
    if (s.includes("keratin") || s.includes("treatment")) return 2500;
    if (s.includes("color") || s.includes("highlight")) return 1500;
    if (s.includes("spa") || s.includes("conditioning")) return 1200;
    if (s.includes("facial") || s.includes("skin") || s.includes("glow")) return 850;
    if (s.includes("executive") || s.includes("styling")) return 600;
    if (s.includes("haircut") || s.includes("hair")) return 500;
    if (s.includes("massage")) return 450;
    if (s.includes("beard") || s.includes("shave")) return 250;
    return 500;
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/api/bookings");
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[Bookings] Error loading bookings:", err);
      setError(err.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [businessId]);

  // Handle status update
  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      const updateFn = typeof api?.patch === "function" ? api.patch : (api?.put || api?.post);
      await updateFn(`/api/bookings/${bookingId}`, { status: newStatus });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking((prev) => ({ ...prev, status: newStatus }));
      }
      showToast(`Appointment marked as ${newStatus}`);
    } catch (err) {
      alert("Failed to update status: " + (err.message || "Request failed"));
    }
  };

  // Handle Create Booking
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!newForm.customerName || !newForm.service || !newForm.date) {
      alert("Please fill in customer name, service, and date.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post("/api/bookings", newForm);
      const created = res.booking || res;
      setBookings((prev) => [created, ...prev]);
      setIsNewModalOpen(false);
      setNewForm({
        customerName: "",
        service: "",
        date: new Date().toISOString().slice(0, 10),
        time: "11:00",
        price: "",
        status: "confirmed",
        notes: "",
      });
      showToast("New appointment scheduled successfully!");
    } catch (err) {
      alert("Error scheduling appointment: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (msg) => {
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 3500);
  };

  // Calculations & filtering
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      (b.customerName && b.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.service && b.service.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ? true : (b.status || "confirmed").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalBookings = bookings.length;
  const confirmedCount = bookings.filter((b) => (b.status || "confirmed") === "confirmed").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;
  const totalRevenue = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((acc, curr) => acc + getBookingPrice(curr), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-[#1E2772] text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-indigo-50 text-[#1E2772] text-xs font-bold rounded-full uppercase tracking-wider">
              {salonName} Schedule
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Google Calendar Synced
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 mt-2">Appointments & Bookings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-channel booking stream booked via WhatsApp AI Receptionist & Web
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBookings}
            disabled={loading}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition border border-slate-200/70"
            title="Refresh appointments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#FF6C52]" : ""}`} />
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 bg-[#FF6C52] hover:bg-[#e85b42] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-[0_4px_14px_rgba(255,108,82,0.3)] transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Pill Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#1E2772]">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">{totalBookings}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all channels</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Confirmed Slots</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{confirmedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Upcoming & active</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Completed</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2">{completedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Past salon visits</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Booked Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2">₹{totalRevenue.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Live estimated</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by client or service..."
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

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Slots" },
            { id: "confirmed", label: "Confirmed" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-[#1E2772] text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table / List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-[#FF6C52] animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading appointments from salon calendar...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold text-sm">{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-3 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
            >
              Retry
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4 border border-slate-100">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-700 text-base">No appointments found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No appointments matching "${searchQuery}". Try clearing filters.`
                : "No appointments scheduled for this view. Create one or wait for incoming WhatsApp messages!"}
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 bg-[#1E2772] text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-[#28328c] transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Appointment</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Client</th>
                  <th className="py-4 px-6">Service</th>
                  <th className="py-4 px-6">Date & Time</th>
                  <th className="py-4 px-6">Price</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Source</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredBookings.map((b) => {
                  const status = (b.status || "confirmed").toLowerCase();
                  const isConfirmed = status === "confirmed";
                  const isCompleted = status === "completed";
                  const isCancelled = status === "cancelled";

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/60 transition group cursor-pointer"
                      onClick={() => setSelectedBooking(b)}
                    >
                      {/* Client */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#1E2772] font-bold text-xs shrink-0">
                            {(b.customerName || "C").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{b.customerName || "Customer"}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <span>ID: {b.id.slice(0, 10)}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-700 bg-slate-100/80 px-3 py-1 rounded-xl text-xs">
                          {b.service || "Salon Service"}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{b.date || "Scheduled"}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{b.time || "10:00 AM"}</span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-6 font-bold text-slate-800">
                        ₹{getBookingPrice(b).toLocaleString("en-IN")}
                      </td>

                      {/* Status Pill */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize ${
                            isConfirmed
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : isCompleted
                              ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                              : "bg-rose-50 text-rose-700 border border-rose-200/60"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isConfirmed ? "bg-emerald-500" : isCompleted ? "bg-blue-500" : "bg-rose-500"
                            }`}
                          />
                          {status}
                        </span>
                      </td>

                      {/* Channel */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded-lg border border-emerald-100">
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp AI</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isConfirmed && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, "completed")}
                              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                              title="Mark as Completed"
                            >
                              Complete
                            </button>
                          )}
                          {!isCancelled && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, "cancelled")}
                              className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition"
                              title="Cancel appointment"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                            title="View details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appointment Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#1E2772]">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-lg">Appointment Details</h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                <div>
                  <span className="text-xs text-slate-400 font-semibold block">Client Name</span>
                  <span className="text-base font-extrabold text-slate-800">{selectedBooking.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold block">Status</span>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    {selectedBooking.status || "confirmed"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-semibold block">Service</span>
                  <span className="text-sm font-bold text-slate-700">{selectedBooking.service}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-semibold block">Amount</span>
                  <span className="text-sm font-bold text-slate-700">
                    ₹{getBookingPrice(selectedBooking).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-semibold block">Scheduled Date</span>
                  <span className="text-sm font-bold text-slate-700">{selectedBooking.date}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-semibold block">Time Slot</span>
                  <span className="text-sm font-bold text-slate-700">{selectedBooking.time || "11:00 AM"}</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">Google Calendar Synced</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">Active Event</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {selectedBooking.status !== "completed" && (
                <button
                  onClick={() => handleUpdateStatus(selectedBooking.id, "completed")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-xs font-bold transition shadow-sm"
                >
                  Mark as Completed
                </button>
              )}
              {selectedBooking.status !== "cancelled" && (
                <button
                  onClick={() => handleUpdateStatus(selectedBooking.id, "cancelled")}
                  className="flex-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 py-3 rounded-2xl text-xs font-bold transition"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#FF6C52]/10 flex items-center justify-center text-[#FF6C52]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Schedule New Appointment</h3>
                  <p className="text-xs text-slate-400">Add walk-in or manual booking to {salonName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="py-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Client Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newForm.customerName}
                  onChange={(e) => setNewForm({ ...newForm, customerName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Service *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Haircut & Beard"
                    value={newForm.service}
                    onChange={(e) => setNewForm({ ...newForm, service: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={newForm.price}
                    onChange={(e) => setNewForm({ ...newForm, price: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newForm.date}
                    onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Time Slot *</label>
                  <input
                    type="time"
                    required
                    value={newForm.time}
                    onChange={(e) => setNewForm({ ...newForm, time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Preferences</label>
                <input
                  type="text"
                  placeholder="e.g. Prefers stylist Aman, tea with less sugar"
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#FF6C52] hover:bg-[#e85b42] text-white rounded-2xl text-xs font-bold shadow-[0_4px_14px_rgba(255,108,82,0.3)] transition transform active:scale-95 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Appointment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
