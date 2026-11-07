import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  Scissors,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  CheckCheck,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import SalonLogo from "./SalonLogo";

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, business, businessId, ownerName, logout, loginDemo, switchBusiness } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const salonTitle = business?.name || (businessId === "fine-look" ? "Fine Look Salon" : (businessId === "test-business-1" ? "Just Look Salon" : "My Salon"));
  const currentOwner = user?.displayName || business?.ownerName || ownerName || (user?.email ? user.email.split("@")[0] : null) || "Salon Owner";
  const userSubtitle = user?.email || salonTitle;

  // Top bar states
  const [timeRange, setTimeRange] = useState("This Week");
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

  // Global Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const searchRef = useRef(null);

  // Notifications states
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState("all"); // "all" | "unread" | "bookings" | "messages"
  const notifRef = useRef(null);
  const [notifications, setNotifications] = useState([
    {
      id: "n1",
      title: "New WhatsApp Inquiry",
      desc: "Client requested Saturday 2:00 PM slot for Haircut & Styling",
      time: "10m ago",
      channel: "whatsapp",
      category: "messages",
      unread: true,
      link: "/conversations",
      actionText: "Reply in Chat",
      tag: "WhatsApp Message",
    },
    {
      id: "n2",
      title: "Booking Confirmed via WhatsApp",
      desc: "Kashyap Makwana confirmed Haircut slot for tomorrow 4:00 PM",
      time: "45m ago",
      channel: "whatsapp",
      category: "bookings",
      unread: true,
      link: "/bookings",
      actionText: "View Booking",
      tag: "WhatsApp Auto-Pilot",
    },
    {
      id: "n3",
      title: "Retention Watchlist Alert",
      desc: "3 regular clients have exceeded 25 days since their last visit",
      time: "2h ago",
      channel: "system",
      category: "alerts",
      unread: true,
      link: "/customers",
      actionText: "Review Clients",
      tag: "AI Retention Agent",
    },
    {
      id: "n4",
      title: "Revenue Gap Opportunity",
      desc: "Thursday 2:00 PM – 5:00 PM slot has 0% booking utilization",
      time: "5h ago",
      channel: "revenue",
      category: "alerts",
      unread: false,
      link: "/dashboard",
      actionText: "Fill Gap Now",
      tag: "Revenue Optimizer",
    },
  ]);

  // Profile Dropdown state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Load searchable data
  useEffect(() => {
    const loadSearchData = async () => {
      try {
        const [cData, bData] = await Promise.all([
          api.get("/api/customers").catch(() => []),
          api.get("/api/bookings").catch(() => []),
        ]);
        setAllCustomers(Array.isArray(cData) ? cData : []);
        setAllBookings(Array.isArray(bData) ? bData : []);
      } catch (err) {
        // silent search cache fallback
      }
    };
    loadSearchData();
  }, [businessId]);

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadNotifsCount = notifications.filter((n) => n.unread).length;

  const markAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Appointments", path: "/bookings", icon: CalendarCheck },
    { name: "Clients", path: "/customers", icon: Users },
    { name: "Messages", path: "/conversations", icon: MessageSquare },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  // Dynamic Page Title
  const getPageTitle = () => {
    if (location.pathname.startsWith("/bookings")) return "Appointments";
    if (location.pathname.startsWith("/customers")) return "Clients Directory";
    if (location.pathname.startsWith("/conversations")) return "Messages";
    if (location.pathname.startsWith("/settings")) return "Settings";
    return "Overview";
  };

  // Filter search results
  const matchingCustomers = searchQuery.trim()
    ? allCustomers.filter(
        (c) =>
          c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone?.includes(searchQuery) ||
          c.lastService?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4)
    : [];

  const matchingBookings = searchQuery.trim()
    ? allBookings.filter(
        (b) =>
          b.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.service?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4)
    : [];

  const hasSearchResults = matchingCustomers.length > 0 || matchingBookings.length > 0;

  return (
    <div className="min-h-screen bg-[#F4F5FA] flex flex-col lg:flex-row font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Mobile Top Header */}
      <header className="lg:hidden bg-[#1E2772] text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <SalonLogo name={salonTitle} size="compact" showSubtitle={false} theme="dark" />

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-indigo-100 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Desktop Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1E2772] text-white p-6 flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand Logo */}
          <div className="mb-10 px-2">
            <SalonLogo name={salonTitle} size="default" showSubtitle={true} theme="dark" />
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-[#1E2772] shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
                      : "text-indigo-200/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-[#1E2772]" : "text-indigo-300"}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Sign out */}
        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF6C52] to-amber-400 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                {(currentOwner || "O")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {currentOwner}
                </p>
                <p className="text-[10px] text-indigo-300 truncate font-semibold">
                  {userSubtitle}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Log out"
              className="p-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="hidden lg:flex items-center justify-between px-10 py-6 relative z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-900">{getPageTitle()}</h1>

            {/* Time Range Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition"
              >
                <span>{timeRange}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isTimeDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                  {["Today", "This Week", "This Month", "All Time"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setTimeRange(opt);
                        setIsTimeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        timeRange === opt
                          ? "bg-indigo-50 text-[#1E2772]"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span>{opt}</span>
                      {timeRange === opt && <Check className="w-3 h-3 text-[#1E2772]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Global Search with Live Popup */}
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search clients, services, phone..."
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  className="w-64 h-10 pl-9 pr-8 bg-white rounded-full border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E2772] shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSearchOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown */}
              {searchOpen && searchQuery.trim() && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-96 overflow-y-auto">
                  {!hasSearchResults ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No clients or bookings matching "{searchQuery}"
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Customers section */}
                      {matchingCustomers.length > 0 && (
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-1">
                            Clients ({matchingCustomers.length})
                          </span>
                          <div className="space-y-1">
                            {matchingCustomers.map((c) => (
                              <div
                                key={c.id}
                                onClick={() => {
                                  setSearchOpen(false);
                                  setSearchQuery("");
                                  navigate("/customers");
                                }}
                                className="p-2.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-xl bg-indigo-50 text-[#1E2772] font-bold text-xs flex items-center justify-center">
                                    {(c.name || "C")[0]}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-800">{c.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{c.phone || c.lastService}</div>
                                  </div>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bookings section */}
                      {matchingBookings.length > 0 && (
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-1">
                            Appointments ({matchingBookings.length})
                          </span>
                          <div className="space-y-1">
                            {matchingBookings.map((b) => (
                              <div
                                key={b.id}
                                onClick={() => {
                                  setSearchOpen(false);
                                  setSearchQuery("");
                                  navigate("/bookings");
                                }}
                                className="p-2.5 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
                              >
                                <div>
                                  <div className="text-xs font-bold text-slate-800">{b.customerName}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {b.service} • {b.date} • ₹{b.price}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                  {b.status || "confirmed"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notification Bell with Redesigned Real-Software Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition active:scale-95 shadow-sm ${
                  notifOpen
                    ? "bg-[#1E2772] text-white border-[#1E2772]"
                    : "bg-white border-slate-200 text-slate-600 hover:text-[#1E2772] hover:border-slate-300"
                }`}
                title="Notifications & Activity"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF6C52] ring-2 ring-white animate-pulse" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2.5 w-[360px] sm:w-[420px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(30,39,114,0.18)] border border-slate-100 p-4 sm:p-5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-extrabold text-slate-900 text-sm">Notifications</h3>
                      {unreadNotifsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#FF6C52]/10 text-[#FF6C52] text-[10px] font-black border border-[#FF6C52]/20">
                          {unreadNotifsCount} New
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                          All caught up
                        </span>
                      )}
                    </div>
                    {unreadNotifsCount > 0 && (
                      <button
                        onClick={markAllNotifsRead}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto border-b border-slate-100/80 [scrollbar-width:none]">
                    {[
                      { id: "all", label: "All", count: notifications.length },
                      { id: "unread", label: "Unread", count: unreadNotifsCount },
                      { id: "bookings", label: "Bookings", count: notifications.filter((n) => n.category === "bookings" || n.channel === "whatsapp").length },
                      { id: "messages", label: "Messages", count: notifications.filter((n) => n.category === "messages").length },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setNotifFilter(tab.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                          notifFilter === tab.id
                            ? "bg-[#1E2772] text-white shadow-xs"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                              notifFilter === tab.id
                                ? "bg-white/20 text-white"
                                : "bg-slate-200/80 text-slate-600"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Notifications Feed */}
                  <div className="py-2.5 space-y-2 max-h-[340px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {notifications
                      .filter((n) => {
                        if (notifFilter === "unread") return n.unread;
                        if (notifFilter === "bookings") return n.category === "bookings" || n.channel === "whatsapp";
                        if (notifFilter === "messages") return n.category === "messages";
                        return true;
                      })
                      .map((n) => {
                        const isWhatsApp = n.channel === "whatsapp";
                        const isRevenue = n.channel === "revenue";

                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              setNotifOpen(false);
                              navigate(n.link);
                            }}
                            className={`p-3 rounded-2xl transition cursor-pointer border flex items-start gap-3 relative group ${
                              n.unread
                                ? "bg-indigo-50/50 hover:bg-indigo-50/80 border-indigo-100/80 shadow-xs"
                                : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            {/* Rich Channel Avatar */}
                            <div className="shrink-0 mt-0.5">
                              {isWhatsApp ? (
                                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                  </svg>
                                </div>
                              ) : isRevenue ? (
                                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                  <TrendingUp className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-xl bg-[#1E2772] text-white flex items-center justify-center shadow-xs">
                                  <Sparkles className="w-4 h-4 text-[#FF6C52]" />
                                </div>
                              )}
                            </div>

                            {/* Body details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  isWhatsApp
                                    ? "bg-emerald-100/80 text-emerald-800"
                                    : isRevenue
                                    ? "bg-amber-100/80 text-amber-800"
                                    : "bg-indigo-100/80 text-indigo-800"
                                }`}>
                                  {n.tag || "Notification"}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-semibold text-slate-400">{n.time}</span>
                                  {n.unread && (
                                    <span className="w-2 h-2 rounded-full bg-[#FF6C52] shrink-0" />
                                  )}
                                </div>
                              </div>

                              <p className="font-bold text-slate-900 text-xs truncate">
                                {n.title}
                              </p>
                              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                                {n.desc}
                              </p>

                              {/* Interactive Action footer */}
                              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 group-hover:text-indigo-800 group-hover:translate-x-0.5 transition-transform">
                                  <span>{n.actionText || "View Details"}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </span>

                                {n.unread && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNotifications((prev) =>
                                        prev.map((item) =>
                                          item.id === n.id ? { ...item, unread: false } : item
                                        )
                                      );
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold px-2 py-0.5 rounded-md hover:bg-slate-100 transition"
                                  >
                                    Mark read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {notifications.filter((n) => {
                      if (notifFilter === "unread") return n.unread;
                      if (notifFilter === "bookings") return n.category === "bookings" || n.channel === "whatsapp";
                      if (notifFilter === "messages") return n.category === "messages" || n.channel === "instagram";
                      return true;
                    }).length === 0 && (
                      <div className="p-8 text-center space-y-2">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-xs text-slate-800">All caught up!</p>
                        <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                          No notifications found in this filter view.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Popover Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">Synced live with WhatsApp & IG</span>
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        navigate("/conversations");
                      }}
                      className="font-bold text-[#1E2772] hover:underline text-[11px]"
                    >
                      View Live Inbox &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Pill with Dropdown */}
            <div className="relative" ref={profileRef}>
              <div
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 pl-2 border-l border-slate-200 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF6C52] to-amber-400 flex items-center justify-center text-white font-bold text-sm shadow-sm transition group-hover:scale-105">
                  {(currentOwner || "O")[0].toUpperCase()}
                </div>
                <div className="max-w-[140px]">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate group-hover:text-[#1E2772]">
                    {currentOwner}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{userSubtitle}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
              </div>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
                  {/* Active Salon Info */}
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Active Salon Account
                    </span>
                    <span className="font-extrabold text-slate-800 text-sm block mt-0.5">{salonTitle}</span>
                    {ownerName && (
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">
                        Owner: {ownerName}
                      </span>
                    )}
                    <span className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1 mt-1.5">
                      <ShieldCheck className="w-3 h-3" />
                      ID: {businessId}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate("/settings");
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-[#1E2772] transition"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Nested Route Content */}
        <main className="p-4 sm:p-6 lg:p-10 pt-2 max-w-[1600px] w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex justify-around p-2 z-40 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center p-2 rounded-xl text-[10px] font-semibold transition ${
                isActive ? "text-[#1E2772]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
