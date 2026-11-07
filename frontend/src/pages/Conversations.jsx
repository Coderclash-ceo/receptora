import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Send,
  Bot,
  User,
  Sparkles,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Check,
  RefreshCw,
  SlidersHorizontal,
  X,
  Camera,
  Mic,
  Play,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Conversations() {
  const { business, businessId, refreshBusiness } = useAuth();
  const salonName = business?.name || (businessId === "fine-look" ? "Fine Look Salon" : "Just Look Salon");

  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [savingChannels, setSavingChannels] = useState(false);
  const [channelToast, setChannelToast] = useState(null);
  const [deliveryNotice, setDeliveryNotice] = useState(null);
  const [channelForm, setChannelForm] = useState({
    whatsappNumber: "",
    whatsappPhoneNumberId: "1171981929341103",
    whatsappToken: "",
  });

  useEffect(() => {
    setChannelForm({
      whatsappNumber: business?.whatsappNumber || business?.phone || "+1 (555) 664-1838",
      whatsappPhoneNumberId: business?.whatsappPhoneNumberId || business?.phoneId || "1171981929341103",
      whatsappToken: business?.whatsappToken || "",
    });
  }, [business, businessId]);

  const handleSaveChannels = async () => {
    setSavingChannels(true);
    try {
      await api.put("/api/settings", {
        whatsappNumber: channelForm.whatsappNumber,
        phone: channelForm.whatsappNumber,
        whatsappPhoneNumberId: channelForm.whatsappPhoneNumberId,
        phoneId: channelForm.whatsappPhoneNumberId,
        whatsappToken: channelForm.whatsappToken,
      });
      if (typeof refreshBusiness === "function") {
        await refreshBusiness();
      }
      setDeliveryNotice(null);
      setChannelToast("WhatsApp credentials & Meta Access Token saved successfully!");
      setTimeout(() => setChannelToast(null), 3500);
      setChannelModalOpen(false);
    } catch (err) {
      alert("Failed to save channels: " + err.message);
    } finally {
      setSavingChannels(false);
    }
  };

  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState(null);

  const [filterMode, setFilterMode] = useState("all"); // "all" | "unread"
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [aiMode, setAiMode] = useState("auto"); // "auto" | "manual"

  // Contextual AI Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const messagesEndRef = useRef(null);

  // Fetch all conversation list items
  const fetchConversations = async (silent = false) => {
    if (!silent) setLoadingList(true);
    setError(null);
    try {
      const data = await api.get("/api/conversations");
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      // Strictly exclude any Instagram or legacy items
      const whatsappItems = items.filter(
        (c) => !c.id?.startsWith("ig_") && c.channel !== "instagram"
      );
      setConversations(whatsappItems);

      if (whatsappItems.length > 0 && !selectedConvId) {
        setSelectedConvId(whatsappItems[0].id);
      }
    } catch (err) {
      console.error("[Conversations] List fetch error:", err);
      if (!silent) setError(err.message || "Failed to load conversations");
    } finally {
      if (!silent) setLoadingList(false);
    }
  };

  // Fetch full details of the active conversation and its contextual AI suggestions
  const fetchActiveConversation = async (convId, silent = false) => {
    if (!convId) return;
    if (!silent) setLoadingChat(true);
    try {
      const data = await api.get(`/api/conversations/${convId}`);
      setActiveConversation((prev) => {
        const prevCount = prev?.messages?.length || 0;
        const newCount = data?.messages?.length || 0;
        if (prevCount !== newCount || prev?.id !== data?.id) {
          return data;
        }
        return prev;
      });
      // Fetch dynamic suggestions
      if (!silent) {
        fetchDynamicSuggestions(convId, data?.messages || []);
      }
    } catch (err) {
      console.error("[Conversations] Detail fetch error:", err);
    } finally {
      if (!silent) setLoadingChat(false);
    }
  };

  // Fetch dynamic contextual suggestions from backend
  const fetchDynamicSuggestions = async (convId, messages = []) => {
    setLoadingSuggestions(true);
    try {
      const res = await api.post(`/api/conversations/${convId}/suggestions`, {});
      if (res?.suggestions && Array.isArray(res.suggestions) && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
      } else {
        generateLocalContextualSuggestions(messages);
      }
    } catch (err) {
      generateLocalContextualSuggestions(messages);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Local fallback heuristic for instant contextual suggestions based on actual last message
  const generateLocalContextualSuggestions = (messages) => {
    const userMsgs = messages.filter((m) => m.role === "user");
    const lastUserText = userMsgs[userMsgs.length - 1]?.text || "";
    const lower = lastUserText.toLowerCase();

    if (lower.includes("saturday") || lower.includes("tomorrow") || lower.includes("pm") || lower.includes("2:00") || lower.includes("4:00") || lower.includes("slot")) {
      setSuggestions([
        "Yes, Saturday at 2:00 PM is reserved for you!",
        "Checking our stylists for Saturday 2:00 PM right now...",
        "Confirmed! Would you like to add a hair wash to your booking?",
      ]);
    } else if (lower.includes("keratin") || lower.includes("facial") || lower.includes("haircut") || lower.includes("service")) {
      setSuggestions([
        "That service takes approx 45-90 mins with senior stylist.",
        "Yes! We offer a 15% discount for weekday slots on this.",
        "Shall I reserve your chair for tomorrow or this weekend?",
      ]);
    } else if (lower.includes("price") || lower.includes("cost") || lower.includes("how much") || lower.includes("rate")) {
      setSuggestions([
        "Our pricing includes deep conditioning & styling.",
        "Our standard rate is ₹500, and combo is ₹850.",
        "Would you like me to book a complimentary consultation?",
      ]);
    } else {
      setSuggestions([
        "I'd love to help you with that! Which time works best?",
        "We have slots open today and this weekend! Shall I book?",
        "Let me check our senior stylist's availability for you.",
      ]);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [businessId]);

  useEffect(() => {
    if (selectedConvId) {
      fetchActiveConversation(selectedConvId);
    }
  }, [selectedConvId]);

  // Real-time synchronization polling (every 3.5 seconds) for instant WhatsApp delivery updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchConversations(true);
      if (selectedConvId) {
        fetchActiveConversation(selectedConvId, true);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [businessId, selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !selectedConvId || isSending) return;

    const textToSend = replyText.trim();
    setReplyText("");
    setIsSending(true);

    const optimisticMsg = {
      role: "assistant",
      text: textToSend,
      timestamp: new Date().toISOString(),
      optimistic: true,
    };

    setActiveConversation((prev) => ({
      ...prev,
      messages: [...(prev?.messages || []), optimisticMsg],
    }));

    try {
      const res = await api.post(`/api/conversations/${selectedConvId}/messages`, {
        text: textToSend,
        role: "assistant",
      });

      // Handle real Meta WhatsApp Cloud API delivery response
      if (res?.liveDelivery) {
        if (res.liveDelivery.ok) {
          setDeliveryNotice(null);
          setChannelToast("✓ Sent & delivered directly to client's phone via Meta WhatsApp API!");
          setTimeout(() => setChannelToast(null), 4000);
        } else if (res.liveDelivery.error === "missing_whatsapp_token") {
          setDeliveryNotice({
            type: "warning",
            title: "Meta Access Token Required for Live Phone Delivery",
            message: "This message was stored in the software, but was NOT sent to the client's phone because no Meta WhatsApp Access Token is configured.",
            action: "Add Meta Token",
          });
        } else {
          const detail =
            res.liveDelivery.error?.error?.message ||
            res.liveDelivery.error?.message ||
            (typeof res.liveDelivery.error === "string" ? res.liveDelivery.error : JSON.stringify(res.liveDelivery.error));
          setDeliveryNotice({
            type: "error",
            title: "Meta WhatsApp API Delivery Notice",
            message: `Delivery failed: ${detail}`,
            action: "Check Credentials",
          });
        }
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvId
            ? { ...c, lastMessage: { role: "assistant", text: textToSend } }
            : c
        )
      );

      // Refresh suggestions after sending
      fetchDynamicSuggestions(selectedConvId, [...(activeConversation?.messages || []), optimisticMsg]);
    } catch (err) {
      console.error("[Conversations] Send failed:", err);
      alert("Failed to send message: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = (text) => {
    setReplyText(text);
  };

  const filteredConversations = conversations.filter((c) => {
    if (filterMode === "unread" && !c.unread) return false;

    const matchesSearch =
      (c.customerName && c.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-3xl px-6 py-4 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-[#1E2772] text-[11px] font-bold rounded-full uppercase tracking-wider">
              {salonName} Live Inbox
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              WhatsApp Business Live
            </span>
            <button
              type="button"
              onClick={() => setChannelModalOpen(true)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-[#1E2772] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-0.5 rounded-full transition active:scale-95 cursor-pointer"
              title="Click to edit salon WhatsApp number and Meta API token"
            >
              <SlidersHorizontal className="w-3 h-3 text-[#FF6C52]" />
              <span>{channelForm.whatsappNumber || "Set WhatsApp Number"}</span>
              <span className="text-[10px] text-slate-400 font-semibold underline ml-0.5">Edit</span>
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
            WhatsApp Customer Conversations
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* AI Auto-Pilot Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold border border-slate-200/70">
            <button
              onClick={() => setAiMode("auto")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                aiMode === "auto"
                  ? "bg-white text-[#1E2772] shadow-sm font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-[#FF6C52]" />
              <span>AI Auto-Pilot</span>
            </button>
            <button
              onClick={() => setAiMode("manual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                aiMode === "manual"
                  ? "bg-white text-[#1E2772] shadow-sm font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Manual Takeover</span>
            </button>
          </div>

          <button
            onClick={() => fetchConversations()}
            disabled={loadingList}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition border border-slate-200/70"
            title="Refresh conversations"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? "animate-spin text-[#FF6C52]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Split Inbox Grid */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col md:flex-row min-h-0">
        {/* Left Sidebar (Conversations List) */}
        <div className="w-full md:w-80 lg:w-96 min-w-[280px] shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/50">
          {/* Search & Channel Tabs */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search chats, clients, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E2772]"
              />
            </div>

            {/* Filter Buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setFilterMode("all")}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                  filterMode === "all"
                    ? "bg-[#1E2772] text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                <MessageSquare className={`w-3.5 h-3.5 ${filterMode === "all" ? "text-emerald-300" : "text-emerald-600"}`} />
                <span>All WhatsApp ({conversations.length})</span>
              </button>
              <button
                onClick={() => setFilterMode("unread")}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition ${
                  filterMode === "unread"
                    ? "bg-[#1E2772] text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#FF6C52]" />
                <span>Unread ({conversations.filter((c) => c.unread).length})</span>
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingList ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-6 h-6 text-[#FF6C52] animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading salon chats...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No conversations match this search.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                const clientName = c.customerName || (c.phone ? c.phone : `Client ${c.id.slice(0, 8)}`);
                let lastText = c.lastMessage?.text || "Conversation started";
                if (c.lastMessage?.mediaType === "image" || /\[(photo|image).*\]/i.test(lastText)) {
                  lastText = "📷 Style Reference Photo";
                } else if (c.lastMessage?.mediaType === "audio" || /\[(voice|audio).*\]/i.test(lastText)) {
                  lastText = "🎙️ Voice Audio Note";
                }

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={`p-4 flex items-start gap-3 cursor-pointer transition relative ${
                      isSelected
                        ? "bg-white border-l-4 border-l-[#1E2772] shadow-sm"
                        : "hover:bg-slate-100/70"
                    }`}
                  >
                    {/* Avatar with WhatsApp Overlay */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#1E2772] font-black text-sm">
                        {clientName.replace(/^\+/, "").slice(0, 2).toUpperCase()}
                      </div>
                      <div
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm bg-emerald-500 text-white"
                        title="WhatsApp Business"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                      </div>
                    </div>

                    {/* Chat Summary */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-slate-800 text-xs truncate max-w-[150px]">
                          {clientName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {c.lastMessage?.timestamp
                            ? new Date(c.lastMessage.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Recent"}
                        </span>
                      </div>

                      {/* Phone Pill */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          WhatsApp
                        </span>
                        {c.phone && (
                          <span className="text-[10px] text-slate-400 truncate font-mono">
                            {c.phone}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate line-clamp-1 leading-relaxed">
                        {lastText}
                      </p>
                    </div>

                    {c.unread && (
                      <span className="w-2 h-2 rounded-full bg-[#FF6C52] shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat History & Composer */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          {selectedConvId && activeConversation ? (
            <>
              {/* Active Conversation Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#1E2772] font-bold text-sm">
                    {(activeConversation.customerName || selectedConvId).replace(/^\+/, "").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                      <span>{activeConversation.customerName || selectedConvId}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        WhatsApp Business
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Phone: {activeConversation.phone || `+${selectedConvId}`}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {aiMode === "auto" ? "AI Auto-Pilot Handling" : "Manual Staff Takeover"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 hidden sm:flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Live WhatsApp Sync
                  </span>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                {loadingChat ? (
                  <div className="p-12 text-center">
                    <RefreshCw className="w-6 h-6 text-[#FF6C52] animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Loading conversation history...</p>
                  </div>
                ) : !activeConversation.messages || activeConversation.messages.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    No messages in this chat yet. Send an opening greeting below!
                  </div>
                ) : (
                  activeConversation.messages.map((m, idx) => {
                    const isOutbound = m.role === "assistant" || m.role === "owner" || m.role === "admin";
                    const isNudge = m.text?.startsWith("[Retention") || m.text?.startsWith("[Revenue");
                    const isImage = m.mediaType === "image" || /\[(photo|image|picture).*\]/i.test(m.text || "");
                    const isAudio = m.mediaType === "audio" || /\[(voice|audio|recording).*\]/i.test(m.text || "");

                    let displayText = m.text || "";
                    if (/^\[Photo.*: "(.*)"\]$/i.test(displayText)) {
                      displayText = displayText.replace(/^\[Photo.*: "(.*)"\]$/i, "$1");
                    } else if (/^\[(Photo|Voice|Video|Document).*\]$/i.test(displayText.trim())) {
                      displayText = "";
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-3xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                            isOutbound
                              ? isNudge
                                ? "bg-gradient-to-r from-[#1E2772] to-[#2D3A96] text-white rounded-br-sm border border-indigo-400/30"
                                : "bg-[#1E2772] text-white rounded-br-sm"
                              : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm"
                          }`}
                        >
                          {/* Role identifier badge */}
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span
                              className={`text-[10px] font-bold flex items-center gap-1 ${
                                isOutbound ? "text-[#FF6C52]" : "text-slate-400"
                              }`}
                            >
                              {isOutbound ? (
                                <>
                                  <Sparkles className="w-3 h-3" />
                                  <span>
                                    {m.role === "owner" || m.role === "admin"
                                      ? "Salon Staff"
                                      : isNudge
                                      ? "Automated Campaign Nudge"
                                      : "AI Receptionist"}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <User className="w-3 h-3" />
                                  <span>{activeConversation.customerName || "Customer"}</span>
                                </>
                              )}
                            </span>
                            <span
                              className={`text-[10px] ${
                                isOutbound ? "text-indigo-200" : "text-slate-400"
                              }`}
                            >
                              {m.timestamp
                                ? new Date(m.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>
                          </div>

                          {/* Media: Image / Style Reference */}
                          {isImage && (
                            <div className="my-2 rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100/70 p-2 text-slate-800">
                              <div className="flex items-center gap-1.5 mb-1.5 px-1 text-[11px] font-bold text-slate-700">
                                <Camera className="w-3.5 h-3.5 text-[#FF6C52]" />
                                <span>Photo Style Reference</span>
                              </div>
                              {m.mediaUrl ? (
                                <img
                                  src={m.mediaUrl}
                                  alt="Style Reference"
                                  className="w-full max-h-56 object-cover rounded-xl border border-slate-200 shadow-inner"
                                />
                              ) : (
                                <div className="w-full h-24 rounded-xl bg-gradient-to-br from-indigo-100/70 to-rose-100/70 border border-indigo-200/50 flex flex-col items-center justify-center text-center p-2">
                                  <Camera className="w-6 h-6 text-indigo-500 mb-1" />
                                  <span className="text-[11px] font-bold text-slate-700">Style Inspiration Photo</span>
                                  <span className="text-[9px] text-slate-400">Attached to client consultation record</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Media: Voice Audio Note */}
                          {isAudio && (
                            <div className={`my-2 p-2.5 rounded-2xl border flex items-center gap-2.5 ${
                              isOutbound
                                ? "bg-indigo-900/40 border-indigo-400/30 text-white"
                                : "bg-gradient-to-r from-indigo-50 to-pink-50 border-indigo-200/60 text-slate-800"
                            }`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                isOutbound ? "bg-[#FF6C52] text-white" : "bg-[#1E2772] text-white"
                              }`}>
                                <Play className="w-3 h-3 fill-current ml-0.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                                  <span className="flex items-center gap-1">
                                    <Mic className={`w-3 h-3 ${isOutbound ? "text-[#FF6C52]" : "text-[#1E2772]"}`} />
                                    <span>Voice Audio Note</span>
                                  </span>
                                  <span className={`text-[9px] font-mono ${isOutbound ? "text-indigo-200" : "text-slate-400"}`}>0:18</span>
                                </div>
                                <div className="flex items-center gap-1 h-2">
                                  {[40, 75, 55, 90, 60, 100, 45, 80, 65, 95, 50, 70, 85, 40, 60, 30].map((h, i) => (
                                    <span
                                      key={i}
                                      className={`w-0.5 rounded-full ${isOutbound ? "bg-white" : "bg-[#1E2772]"}`}
                                      style={{ height: `${h}%`, opacity: i < 7 ? 0.95 : 0.4 }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Message Body */}
                          {displayText ? (
                            <p className="whitespace-pre-wrap">{displayText}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Contextual AI Suggestions (Tailored to THIS Exact Chat Scenario) */}
              <div className="px-6 py-2.5 bg-indigo-50/50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-black text-[#1E2772] shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6C52]" />
                  <span>AI Suggestions for this chat:</span>
                </span>

                {loadingSuggestions ? (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Generating contextual suggestions...
                  </span>
                ) : (
                  suggestions.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuickReply(chip)}
                      className="px-3 py-1 bg-white hover:bg-[#1E2772] hover:text-white text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap transition border border-indigo-200/70 shadow-sm active:scale-95"
                    >
                      {chip}
                    </button>
                  ))
                )}
              </div>

              {/* Delivery Notice Alert Banner */}
              {deliveryNotice && (
                <div
                  className={`mx-4 mb-2 p-3.5 rounded-2xl flex items-start justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 ${
                    deliveryNotice.type === "warning"
                      ? "bg-amber-50 border border-amber-200/80 text-amber-900"
                      : "bg-rose-50 border border-rose-200/80 text-rose-900"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        deliveryNotice.type === "warning" ? "text-amber-600" : "text-rose-600"
                      }`}
                    />
                    <div>
                      <p className="font-bold text-xs">{deliveryNotice.title}</p>
                      <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
                        {deliveryNotice.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setChannelModalOpen(true)}
                      className="px-3 py-1 bg-white hover:bg-slate-50 border border-amber-300 rounded-xl text-slate-800 font-bold text-[11px] shadow-sm transition active:scale-95"
                    >
                      {deliveryNotice.action || "Configure"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryNotice(null)}
                      className="p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-600"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Reply Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 bg-white border-t border-slate-100 flex items-center gap-3"
              >
                <input
                  type="text"
                  placeholder="Type a message or click an AI suggestion above..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2772] text-slate-800"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="p-3 bg-[#FF6C52] hover:bg-[#e85b42] disabled:opacity-50 text-white rounded-2xl transition shadow-[0_4px_12px_rgba(255,108,82,0.3)] transform active:scale-95"
                  title="Send message via WhatsApp"
                >
                  {isSending ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 mb-3 border border-slate-100">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-700 text-base">Select a customer conversation</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Choose a customer conversation from the left to view real-time WhatsApp message history and send replies.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {channelToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1E2772] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-indigo-700/50 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{channelToast}</span>
        </div>
      )}

      {/* WhatsApp Configuration Modal */}
      {channelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Salon WhatsApp Configuration</h3>
                  <p className="text-xs text-slate-400">• Meta WhatsApp Business Cloud API Settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChannelModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* WhatsApp Input Card */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                      W
                    </div>
                    <span className="font-bold text-emerald-950">WhatsApp Business Cloud API</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    Live Channel
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Salon WhatsApp Number *</span>
                    <span className="text-[10px] font-normal text-slate-400">Customer Facing</span>
                  </label>
                  <input
                    type="text"
                    value={channelForm.whatsappNumber}
                    onChange={(e) => setChannelForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                    placeholder="+1 (555) 664-1838"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-xs text-slate-800 focus:ring-2 focus:ring-[#1E2772] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Meta Cloud API Phone Number ID *</span>
                    <span className="text-[10px] font-normal text-slate-400">developers.facebook.com</span>
                  </label>
                  <input
                    type="text"
                    value={channelForm.whatsappPhoneNumberId}
                    onChange={(e) => setChannelForm((prev) => ({ ...prev, whatsappPhoneNumberId: e.target.value.trim() }))}
                    placeholder="1171981929341103"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:ring-2 focus:ring-[#1E2772] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Meta Access Token (Bearer Token) *</span>
                    <span className="text-[10px] font-normal text-slate-400">Permanent or System Token</span>
                  </label>
                  <input
                    type="password"
                    value={channelForm.whatsappToken}
                    onChange={(e) => setChannelForm((prev) => ({ ...prev, whatsappToken: e.target.value.trim() }))}
                    placeholder="EAAG... (paste your Meta Graph API token)"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:ring-2 focus:ring-[#1E2772] outline-none"
                  />
                  <div className="p-2.5 bg-emerald-100/60 rounded-xl text-[10px] text-emerald-950 space-y-1 mt-1 border border-emerald-200/60">
                    <p className="font-bold">Required for Live Phone Delivery:</p>
                    <p>
                      1. Copy token from <b>developers.facebook.com</b> &rarr; App &rarr; WhatsApp &rarr; API Setup.
                    </p>
                    <p>
                      2. If using Meta's Test Number (+1 555-664-1838), add client numbers (e.g. +91 83692 97980) to the <b>"To" recipient list</b> in Meta Portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setChannelModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveChannels}
                disabled={savingChannels}
                className="px-4 py-2 bg-[#1E2772] hover:bg-[#161D5A] text-white font-semibold rounded-xl text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingChannels ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save WhatsApp Credentials</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
