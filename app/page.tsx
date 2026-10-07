"use client";

import { useEffect, useState, useMemo } from "react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"products" | "menu" | "netmetering" | "errors" | "messages">("products");
  const [loading, setLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  // Search & Filter
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [errorSearch, setErrorSearch] = useState("");

  // Drawer / Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [menu, setMenu] = useState<{ body: string; button: string; rows: any[] }>({ body: "", button: "", rows: [] });
  const [netMetering, setNetMetering] = useState<string>("");
  const [errorCodes, setErrorCodes] = useState<any[]>([]);

  // Image Upload States
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  // Send Message States (UPDATED: recipients field supports multiple numbers)
  const [messageForm, setMessageForm] = useState({
    recipients: "",
    message: "",
    media_url: "",
  });
  const [selectedMsgImageFile, setSelectedMsgImageFile] = useState<File | null>(null);
  const [msgImagePreview, setMsgImagePreview] = useState<string>("");
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // Form states
  const [productForm, setProductForm] = useState({
    id: "",
    category: "ongrid",
    product_url: "",
    active: true,
    brand: "",
    model: "",
    desc: "",
    specs: "",
    image_url: ""
  });

  const [errorForm, setErrorForm] = useState({
    doc_id: "", category: "inverter", brand: "", error_code: "", title: "", solution_text: "", video_url: ""
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const showNotification = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [prodRes, menuRes, netRes, errRes] = await Promise.all([
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/menu").then((r) => r.json()),
        fetch("/api/net-metering").then((r) => r.json()),
        fetch("/api/errors").then((r) => r.json()),
      ]);

      setProducts(Array.isArray(prodRes) ? prodRes : []);
      setMenu(menuRes && typeof menuRes === "object" ? menuRes : { body: "", button: "", rows: [] });
      setNetMetering(netRes?.content || "");
      setErrorCodes(Array.isArray(errRes) ? errRes : []);
    } catch (e) {
      console.error(e);
      showNotification("Failed to connect to backend", "error");
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    setClearingCache(true);
    try {
      const res = await fetch("/api/clear-cache", { method: "POST" });
      const data = await res.json();
      showNotification(data.message, res.ok ? "success" : "error");
    } catch {
      showNotification("Failed to trigger cache clear", "error");
    } finally {
      setClearingCache(false);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        (p.brand || "").toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.model || "").toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.id || "").toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = productCategoryFilter === "all" || p.category === productCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearch, productCategoryFilter]);

  // Filtered Error Codes
  const filteredErrorCodes = useMemo(() => {
    return errorCodes.filter((err) => {
      return (
        (err.brand || "").toLowerCase().includes(errorSearch.toLowerCase()) ||
        (err.error_code || "").toLowerCase().includes(errorSearch.toLowerCase()) ||
        (err.title || "").toLowerCase().includes(errorSearch.toLowerCase())
      );
    });
  }, [errorCodes, errorSearch]);

  // Upload image file to /api/upload
  const uploadImageFile = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload request failed");
      }

      const data = await res.json();
      return data.url;
    } catch (error) {
      console.error("Image upload error:", error);
      return null;
    }
  };

  // Send Message Handler (UPDATED to support multiple phone numbers)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageForm.recipients.trim() || !messageForm.message.trim()) {
      showNotification("Please provide recipient number(s) and a message", "error");
      return;
    }

    // Process and format recipient phone numbers (supports commas, newlines, spaces)
    const phoneNumbers = messageForm.recipients
      .split(/[\n,]+/)
      .map((p) => p.replace(/\+/g, "").replace(/\s+/g, "").trim())
      .filter((p) => p.length > 0);

    if (phoneNumbers.length === 0) {
      showNotification("Please provide at least one valid recipient number", "error");
      return;
    }

    setSendingMessage(true);

    try {
      let finalMediaUrl = messageForm.media_url;

      if (selectedMsgImageFile) {
        const uploadedUrl = await uploadImageFile(selectedMsgImageFile);
        if (!uploadedUrl) {
          showNotification("Failed to upload image media", "error");
          setSendingMessage(false);
          return;
        }
        finalMediaUrl = uploadedUrl;
      }

      const res = await fetch("/api/send-promo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumbers,
          templateName: "bhsolar_promo",
          mediaUrl: finalMediaUrl.trim() || undefined,
          bodyParameters: [
            messageForm.message.trim(), // Dynamically maps to {{1}} in template
          ],
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showNotification(`✅ Message sent successfully to ${phoneNumbers.length} recipient(s)!`);
        setMessageForm({ recipients: "", message: "", media_url: "" });
        setSelectedMsgImageFile(null);
        setMsgImagePreview("");
      } else {
        showNotification(data.message || data.error || "Failed to send message", "error");
      }
    } catch (error) {
      console.error(error);
      showNotification("Failed to send message due to network error", "error");
    } finally {
      setSendingMessage(false);
    }
  };

  // Product Handlers
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingImage(true);

    let finalImageUrl = productForm.image_url;

    // Upload selected file first if available
    if (selectedImageFile) {
      const uploadedUrl = await uploadImageFile(selectedImageFile);
      if (!uploadedUrl) {
        showNotification("Failed to upload image. Product not saved.", "error");
        setUploadingImage(false);
        return;
      }
      finalImageUrl = uploadedUrl;
    }

    const updatedPayload = {
      ...productForm,
      image_url: finalImageUrl,
    };

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPayload),
    });

    setUploadingImage(false);

    if (res.ok) {
      showNotification("✅ Product saved successfully!");
      setIsProductModalOpen(false);
      resetProductForm();
      fetchAllData();
    } else {
      showNotification("Failed to save product", "error");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm(`Are you sure you want to delete product ${id}?`)) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      showNotification("Product removed");
      fetchAllData();
    }
  };

  const editProduct = (item: any) => {
    setProductForm({
      id: item.id || "",
      category: item.category || "ongrid",
      product_url: item.product_url || "",
      active: item.active !== false,
      brand: item.brand || "",
      model: item.model || "",
      desc: item.desc || "",
      specs: item.specs || "",
      image_url: item.image_url || "",
    });
    setSelectedImageFile(null);
    setImagePreview(item.image_url || "");
    setIsProductModalOpen(true);
  };

  const resetProductForm = () => {
    setProductForm({
      id: "",
      category: "ongrid",
      product_url: "",
      active: true,
      brand: "",
      model: "",
      desc: "",
      specs: "",
      image_url: ""
    });
    setSelectedImageFile(null);
    setImagePreview("");
  };

  // Menu Handlers
  const handleAddMenuRow = () => {
    setMenu((prev) => ({
      ...prev,
      rows: [...(prev.rows || []), { id: `${(prev.rows || []).length + 1}`, title: "", description: "" }],
    }));
  };

  const handleUpdateMenuRow = (index: number, field: string, val: string) => {
    const updated = [...menu.rows];
    updated[index][field] = val;
    setMenu((prev) => ({ ...prev, rows: updated }));
  };

  const handleDeleteMenuRow = (index: number) => {
    setMenu((prev) => ({ ...prev, rows: prev.rows.filter((_, i) => i !== index) }));
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menu),
    });
    if (res.ok) showNotification("✅ Main Menu config updated!");
  };

  // Net Metering Handlers
  const handleSaveNetMetering = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/net-metering", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: netMetering }),
    });
    if (res.ok) showNotification("✅ Net Metering Guide saved!");
  };

  // Fault Knowledgebase Handlers
  const handleSaveError = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorForm),
    });
    if (res.ok) {
      showNotification("✅ Fault Error Code saved!");
      setIsErrorModalOpen(false);
      resetErrorForm();
      fetchAllData();
    }
  };

  const editError = (item: any) => {
    setErrorForm({ ...item });
    setIsErrorModalOpen(true);
  };

  const handleDeleteError = async (docId: string) => {
    if (!confirm(`Delete fault record ${docId}?`)) return;
    const res = await fetch(`/api/errors/${docId}`, { method: "DELETE" });
    if (res.ok) {
      showNotification("Fault record deleted");
      fetchAllData();
    }
  };

  const resetErrorForm = () => {
    setErrorForm({ doc_id: "", category: "inverter", brand: "", error_code: "", title: "", solution_text: "", video_url: "" });
  };

  const formatWhatsAppText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium animate-pulse">Loading BHSolar Suite...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/70 text-slate-800 font-sans antialiased">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 px-4 py-3 rounded-xl shadow-lg z-50 text-sm font-semibold flex items-center gap-2.5 border backdrop-blur-sm transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : toast.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
          }`}
        >
          {toast.type === "success" ? "⚡" : "⚠"} {toast.msg}
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-slate-200/80 bg-white p-5 flex flex-col justify-between hidden md:flex shrink-0 shadow-xs">
        <div className="space-y-8">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-500/20">
              ⚡
            </div>
            <div>
              <h1 className="font-bold text-slate-900 tracking-tight leading-none text-base">BHSolar</h1>
              <span className="text-[11px] font-semibold text-blue-600 tracking-wider uppercase">WhatsApp Suite</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: "products", label: "Catalog Products", icon: "📦", count: products.length },
              { id: "menu", label: "Main Menu Config", icon: "📋" },
              { id: "netmetering", label: "Net Metering Guide", icon: "☀️" },
              { id: "errors", label: "Fault Knowledgebase", icon: "🛠", count: errorCodes.length },
              { id: "messages", label: "Send Message", icon: "💬" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700 font-bold border border-blue-100"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === tab.id ? "bg-blue-200/60 text-blue-800" : "bg-slate-100 text-slate-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Bot Status</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">Connected to Cloud Functions & Firestore.</p>
          <button
            onClick={clearCache}
            disabled={clearingCache}
            className="w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-2xs"
          >
            {clearingCache ? <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div> : "🔄 Clear Cache"}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6 bg-slate-100/70">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {activeTab === "products" && "📦 Catalog Management"}
              {activeTab === "menu" && "📋 WhatsApp Interactive Menu"}
              {activeTab === "netmetering" && "☀ Net Metering Guide Editor"}
              {activeTab === "errors" && "🛠️ Error Fault Knowledgebase"}
              {activeTab === "messages" && "💬 Send WhatsApp Message"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Changes saved here update the WhatsApp Bot instantly after cache clear.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white border border-slate-200/80 px-4 py-2 rounded-xl shadow-2xs">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Products</span>
              <span className="text-base font-black text-slate-900">{products.filter((p) => p.active !== false).length}</span>
            </div>
            <div className="bg-white border border-slate-200/80 px-4 py-2 rounded-xl shadow-2xs">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Menu Rows</span>
              <span className="text-base font-black text-slate-900">{menu.rows?.length || 0}</span>
            </div>
            <div className="bg-white border border-slate-200/80 px-4 py-2 rounded-xl shadow-2xs">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fault Codes</span>
              <span className="text-base font-black text-slate-900">{errorCodes.length}</span>
            </div>
          </div>
        </header>

        {/* MOBILE NAVIGATION PILLS */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {[
            { id: "products", label: "Products" },
            { id: "menu", label: "Menu" },
            { id: "netmetering", label: "Guide" },
            { id: "errors", label: "Faults" },
            { id: "messages", label: "Send Msg" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                activeTab === tab.id ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ==================== TAB 1: PRODUCTS ==================== */}
        {activeTab === "products" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search brand, model, or ID..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors shadow-2xs"
                  />
                </div>

                <div className="relative w-full sm:w-52">
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors cursor-pointer shadow-2xs"
                  >
                    <option value="all">All Categories</option>
                    <option value="ongrid">On-Grid</option>
                    <option value="offgrid">Hybrid / Off-Grid</option>
                    <option value="lithium">Lithium Batteries</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  resetProductForm();
                  setIsProductModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10 active:scale-95"
              >
                <span>➕ Add Product</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Product & Image</th>
                      <th className="p-3.5">Product Link</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400">
                          No products found matching your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                item.active !== false
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}
                            >
                              {item.active !== false ? "● Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-500">{item.id}</td>
                          <td className="p-3.5">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.model}
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-50"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 text-xs shrink-0 font-medium">
                                  📷
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900">
                                  <span className="text-blue-600 mr-1.5">{item.brand}</span>
                                  <span>{item.model}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">{item.desc}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {item.product_url ? (
                              <a
                                href={item.product_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold hover:underline border border-blue-100"
                              >
                                🔗 Visit Product
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">No link</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => editProduct(item)}
                              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(item.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: MAIN MENU CONFIG ==================== */}
        {activeTab === "menu" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <form onSubmit={handleSaveMenu} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Greeting Header Body</label>
                  <textarea
                    rows={4}
                    value={menu.body}
                    onChange={(e) => setMenu({ ...menu, body: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  ></textarea>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Interactive Button Title</label>
                  <input
                    type="text"
                    value={menu.button}
                    onChange={(e) => setMenu({ ...menu, button: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-900 text-xs">WhatsApp Interactive List Items</h3>
                    <button
                      type="button"
                      onClick={handleAddMenuRow}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-200/60 transition-all flex items-center gap-1"
                    >
                      ➕ Add Option
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(menu.rows || []).map((row, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                        <input
                          type="text"
                          placeholder="ID"
                          value={row.id}
                          onChange={(e) => handleUpdateMenuRow(idx, "id", e.target.value)}
                          className="w-12 bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-mono text-center font-bold text-blue-600"
                        />
                        <input
                          type="text"
                          placeholder="Title (Max 24)"
                          maxLength={24}
                          value={row.title}
                          onChange={(e) => handleUpdateMenuRow(idx, "title", e.target.value)}
                          className="w-1/3 bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-900"
                        />
                        <input
                          type="text"
                          placeholder="Description (Max 72)"
                          maxLength={72}
                          value={row.description}
                          onChange={(e) => handleUpdateMenuRow(idx, "description", e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteMenuRow(idx)}
                          className="text-rose-600 hover:text-rose-700 text-xs font-bold p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm shadow-blue-500/10 active:scale-95"
                >
                  💾 Save Main Menu Config
                </button>
              </form>
            </div>

            {/* LIVE WHATSAPP PHONE PREVIEW */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 h-fit space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>📱</span> Live WhatsApp Preview
              </h3>
              <div className="bg-[#efeae2] rounded-2xl p-4 border border-slate-200 font-sans shadow-inner relative overflow-hidden">
                <div className="bg-white text-slate-900 text-xs p-3.5 rounded-2xl rounded-tl-none space-y-2.5 max-w-[92%] shadow-xs border border-slate-100">
                  <div
                    className="leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatWhatsAppText(menu.body) }}
                  ></div>
                  <div className="pt-2 border-t border-slate-100 text-center text-teal-600 font-bold py-1">
                    📋 {menu.button || "Explore Services"}
                  </div>
                </div>

                <div className="mt-3 bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-slate-200 text-xs space-y-2 shadow-xs">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 pb-1">
                    User Menu Options
                  </div>
                  {(menu.rows || []).map((r, i) => (
                    <div key={i} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="font-bold text-slate-900 text-xs">{r.title || "Untitled Option"}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{r.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: NET METERING ==================== */}
        {activeTab === "netmetering" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <form onSubmit={handleSaveNetMetering} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Guide Body Text (WhatsApp Formatted)</label>
                <textarea
                  rows={14}
                  value={netMetering}
                  onChange={(e) => setNetMetering(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                ></textarea>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm shadow-blue-500/10 active:scale-95">
                  💾 Save Net Metering Guide
                </button>
              </form>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 h-fit space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>📱</span> Live Guide Preview
              </h3>
              <div className="bg-[#efeae2] rounded-2xl p-4 border border-slate-200 text-xs shadow-inner">
                <div
                  className="bg-white text-slate-800 p-3.5 rounded-2xl rounded-tl-none leading-relaxed space-y-2 max-w-[95%] shadow-xs border border-slate-100"
                  dangerouslySetInnerHTML={{ __html: formatWhatsAppText(netMetering) }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: FAULT KNOWLEDGEBASE ==================== */}
        {activeTab === "errors" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search fault codes..."
                  value={errorSearch}
                  onChange={(e) => setErrorSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors shadow-2xs"
                />
              </div>

              <button
                onClick={() => {
                  resetErrorForm();
                  setIsErrorModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10 active:scale-95"
              >
                <span>➕ Add Fault Error Code</span>
              </button>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Brand</th>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Title & Solution</th>
                      <th className="p-3.5">Video Link</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredErrorCodes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400">
                          No fault records found.
                        </td>
                      </tr>
                    ) : (
                      filteredErrorCodes.map((err) => (
                        <tr key={err.doc_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5">
                            <span className="bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                              {err.category}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">{err.brand}</td>
                          <td className="p-3.5 font-mono font-bold text-blue-600 text-xs">{err.error_code}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{err.title}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-2 max-w-md mt-0.5">{err.solution_text}</div>
                          </td>
                          <td className="p-3.5">
                            {err.video_url ? (
                              <a
                                href={err.video_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold hover:underline border border-blue-100"
                              >
                                ▶ Video Link
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">None</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => editError(err)}
                              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteError(err.doc_id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: SEND MESSAGE ==================== */}
        {activeTab === "messages" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <form onSubmit={handleSendMessage} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Recipient Phone Numbers
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder={"e.g. 923001234567, 923007654321\nor separate by new line:\n923001234567\n923007654321"}
                    value={messageForm.recipients}
                    onChange={(e) => setMessageForm({ ...messageForm, recipients: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  ></textarea>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter numbers separated by commas or new lines. Include country codes without '+' or spaces (e.g. 923001234567).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Message Body (WhatsApp Formatted)
                  </label>
                  <textarea
                    rows={8}
                    required
                    placeholder="Type your message here... Use *bold*, _italics_, or ~strikethrough~ for formatting."
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  ></textarea>
                </div>

                {/* Media Attachment */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Media Attachment (Optional)
                  </label>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {msgImagePreview ? (
                        <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 shadow-2xs">
                          <img src={msgImagePreview} alt="Media Attachment" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMsgImageFile(null);
                              setMsgImagePreview("");
                              setMessageForm({ ...messageForm, media_url: "" });
                            }}
                            className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 text-[10px] w-4 h-4 flex items-center justify-center opacity-90 hover:opacity-100 shadow-sm"
                            title="Remove Image"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 bg-slate-50/50 shrink-0">
                          <span className="text-xl">🖼️</span>
                        </div>
                      )}

                      <div className="flex-1">
                        <label className="cursor-pointer inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors border border-slate-200">
                          <span>📁 Select Image File</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedMsgImageFile(file);
                                setMsgImagePreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1">Uploads media attachment directly to Cloud Storage</p>
                      </div>
                    </div>

                    <input
                      type="url"
                      placeholder="Or paste direct media URL (https://...)"
                      value={messageForm.media_url}
                      onChange={(e) => {
                        setMessageForm({ ...messageForm, media_url: e.target.value });
                        if (!selectedMsgImageFile) setMsgImagePreview(e.target.value);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendingMessage}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-xs transition-all shadow-sm shadow-blue-500/10 active:scale-95 flex items-center justify-center gap-2"
                >
                  {sendingMessage ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <span>🚀 Send WhatsApp Message</span>
                  )}
                </button>
              </form>
            </div>

            {/* LIVE WHATSAPP MESSAGE PREVIEW */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 h-fit space-y-3 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>📱</span> Outbound Message Preview
              </h3>
              
              <div className="bg-[#efeae2] rounded-2xl p-4 border border-slate-200 text-xs shadow-inner min-h-[220px]">
                {messageForm.recipients && (
                  <div className="text-[10px] font-bold text-slate-500 mb-2 px-1">
                    To ({messageForm.recipients.split(/[\n,]+/).filter((p) => p.trim()).length}):{" "}
                    <span className="font-mono text-slate-700 truncate block">
                      {messageForm.recipients.split(/[\n,]+/).filter((p) => p.trim()).join(", ")}
                    </span>
                  </div>
                )}
                <div className="bg-white text-slate-800 p-3 rounded-2xl rounded-tl-none leading-relaxed space-y-2 max-w-[95%] shadow-xs border border-slate-100">
                  {msgImagePreview && (
                    <img
                      src={msgImagePreview}
                      alt="Attachment Preview"
                      className="w-full max-h-48 object-cover rounded-lg border border-slate-100"
                    />
                  )}
                  {messageForm.message ? (
                    <div
                      className="whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: formatWhatsAppText(messageForm.message) }}
                    ></div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">Your message content will appear here...</span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
                <span className="font-bold text-slate-700 block">Formatting Tips:</span>
                <div>• <code className="bg-slate-200/60 px-1 rounded">*bold text*</code></div>
                <div>• <code className="bg-slate-200/60 px-1 rounded">_italic text_</code></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================== SLIDE-OVER MODAL: ADD/EDIT PRODUCT ==================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white border-l border-slate-200 h-full p-6 overflow-y-auto space-y-5 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {productForm.id ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Product ID (Auto/Locked)</label>
                <input
                  type="text"
                  value={productForm.id}
                  disabled
                  placeholder="Auto-generated on save"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-400 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Category</label>
                <div className="relative w-full">
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="ongrid">On-Grid Inverters</option>
                    <option value="offgrid">Hybrid / Off-Grid</option>
                    <option value="lithium">Lithium Batteries</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Huawei, Knox, Growatt"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nitrox 5KW, SUN2000"
                    value={productForm.model}
                    onChange={(e) => setProductForm({ ...productForm, model: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* IMAGE UPLOADER FIELD */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Product Image
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {imagePreview ? (
                      <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 group shadow-2xs">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImageFile(null);
                            setImagePreview("");
                            setProductForm({ ...productForm, image_url: "" });
                          }}
                          className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 text-[10px] w-4 h-4 flex items-center justify-center opacity-90 hover:opacity-100 shadow-sm"
                          title="Remove Image"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 bg-slate-50/50 shrink-0">
                        <span className="text-xl">📷</span>
                      </div>
                    )}

                    <div className="flex-1">
                      <label className="cursor-pointer inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-colors border border-slate-200">
                        <span>📁 Choose Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedImageFile(file);
                              setImagePreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">Uploads automatically to Firebase Storage (`products/` folder)</p>
                    </div>
                  </div>

                  <input
                    type="url"
                    placeholder="Or paste direct image URL (https://...)"
                    value={productForm.image_url}
                    onChange={(e) => {
                      setProductForm({ ...productForm, image_url: e.target.value });
                      if (!selectedImageFile) setImagePreview(e.target.value);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Product Web URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/product"
                  value={productForm.product_url}
                  onChange={(e) => setProductForm({ ...productForm, product_url: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Short Description (Max 72 chars)</label>
                <input
                  type="text"
                  maxLength={72}
                  value={productForm.desc}
                  onChange={(e) => setProductForm({ ...productForm, desc: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Full Specifications</label>
                <textarea
                  rows={4}
                  value={productForm.specs}
                  onChange={(e) => setProductForm({ ...productForm, specs: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                ></textarea>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={productForm.active}
                  onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
                <label htmlFor="activeCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Visible on WhatsApp Bot
                </label>
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-sm shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-2"
                >
                  {uploadingImage ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading & Saving...</span>
                    </>
                  ) : (
                    <span>💾 Save Product</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== SLIDE-OVER MODAL: ADD/EDIT FAULT CODE ==================== */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white border-l border-slate-200 h-full p-6 overflow-y-auto space-y-5 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {errorForm.doc_id ? "Edit Fault Code" : "Add Fault Error Code"}
              </h3>
              <button onClick={() => setIsErrorModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveError} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Equipment Category</label>
                  <div className="relative w-full">
                    <select
                      value={errorForm.category}
                      onChange={(e) => setErrorForm({ ...errorForm, category: e.target.value })}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="inverter">Inverter</option>
                      <option value="battery">Battery</option>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Brand</label>
                  <input
                    type="text"
                    required
                    placeholder="Growatt, Sunways, Nitux"
                    value={errorForm.brand}
                    onChange={(e) => setErrorForm({ ...errorForm, brand: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Error Code</label>
                  <input
                    type="text"
                    required
                    placeholder="F56, E02, 04"
                    value={errorForm.error_code}
                    onChange={(e) => setErrorForm({ ...errorForm, error_code: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="F56: Bus Voltage High"
                    value={errorForm.title}
                    onChange={(e) => setErrorForm({ ...errorForm, title: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Solution Text</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe step-by-step resolution instructions..."
                  value={errorForm.solution_text}
                  onChange={(e) => setErrorForm({ ...errorForm, solution_text: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                ></textarea>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Video URL (YouTube / MP4)</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={errorForm.video_url}
                  onChange={(e) => setErrorForm({ ...errorForm, video_url: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-sm shadow-emerald-500/10 active:scale-95"
                >
                  💾 Save Fault Code
                </button>
                <button
                  type="button"
                  onClick={() => setIsErrorModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs text-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}