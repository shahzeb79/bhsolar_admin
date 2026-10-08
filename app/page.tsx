"use client";

import { useEffect, useState, useMemo } from "react";

const DEFAULT_PROMO_IMAGE = process.env.NEXT_PUBLIC_PROMO_MEDIA_URL || "";

// Static data defaults based on shoe product schema
const STATIC_FEATURES = [
  "Engineered double-layer breathable mesh for zero hot spots",
  "Dual-density SouleFoam™ hollow tubular cushioning elements",
  "Full-length SpeedBoard™ carbon-infused propulsion plate",
  "Hands-free rapid speed lacing with standard spares in box",
];

const STATIC_TECHNOLOGIES = [
  {
    name: "SouleFoam™ Dual Core",
    description: "Zero-gravity foam pods that collapse horizontally and vertically for multidirectional absorption.",
  },
  {
    name: "SpeedBoard™ Plate",
    description: "Converts kinetic downward energy from foot-strike into forward momentum.",
  },
  {
    name: "Bio-Aero Upper",
    description: "Crafted from 100% recycled polyester yarn engineered for maximum airflow.",
  },
];

const STATIC_SUSTAINABILITY = {
  recycledContent: "44% Total Recycled Content",
  details: "100% recycled upper textile. Zero toxic dyes in manufacturing.",
};

const STATIC_SIZES = [
  { size: "US 8", us: "US 8", eu: "EU 41.5", inStock: true },
  { size: "US 8.5", us: "US 8.5", eu: "EU 42", inStock: true },
  { size: "US 9", us: "US 9", eu: "EU 42.5", inStock: true },
  { size: "US 9.5", us: "US 9.5", eu: "EU 43", inStock: true, stockCount: 3 },
  { size: "US 10", us: "US 10", eu: "EU 44", inStock: true },
  { size: "US 10.5", us: "US 10.5", eu: "EU 44.5", inStock: true },
  { size: "US 11", us: "US 11", eu: "EU 45", inStock: true },
  { size: "US 11.5", us: "US 11.5", eu: "EU 45.5", inStock: false },
  { size: "US 12", us: "US 12", eu: "EU 46", inStock: true, stockCount: 2 },
];

const DEFAULT_COLORWAYS = [
  {
    id: "cr-white-slate",
    name: "Chalk White / Slate Grey",
    primaryColorHex: "#E2E8F0",
    accentColorHex: "#1E293B",
    image: "",
  },
  {
    id: "cr-all-black",
    name: "Monolith Phantom Black",
    primaryColorHex: "#1E293B",
    accentColorHex: "#0F172A",
    image: "",
  },
  {
    id: "cr-alpine-ice",
    name: "Alpine Ice / Glacier Cyan",
    primaryColorHex: "#E0F2FE",
    accentColorHex: "#0284C7",
    image: "",
  },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"products" | "shoes" | "menu" | "netmetering" | "errors" | "messages">("products");
  const [loading, setLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);

  // Search & Filters
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [shoeSearch, setShoeSearch] = useState("");
  const [shoeGenderFilter, setShoeGenderFilter] = useState("all");
  const [errorSearch, setErrorSearch] = useState("");

  // Drawer / Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isShoeModalOpen, setIsShoeModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [shoes, setShoes] = useState<any[]>([]);
  const [menu, setMenu] = useState<{ body: string; button: string; rows: any[] }>({ body: "", button: "", rows: [] });
  const [netMetering, setNetMetering] = useState<string>("");
  const [errorCodes, setErrorCodes] = useState<any[]>([]);

  // Product Image Upload States
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  // Shoe Image Upload States (per colorway index)
  const [selectedShoeFiles, setSelectedShoeFiles] = useState<{ [key: number]: File | null }>({});
  const [shoeImagePreviews, setShoeImagePreviews] = useState<{ [key: number]: string }>({});
  const [uploadingShoe, setUploadingShoe] = useState<boolean>(false);

  // Send Message States
  const [messageForm, setMessageForm] = useState({
    recipients: "",
    message: "",
    media_url: DEFAULT_PROMO_IMAGE,
  });
  const [selectedMsgImageFile, setSelectedMsgImageFile] = useState<File | null>(null);
  const [msgImagePreview, setMsgImagePreview] = useState<string>(DEFAULT_PROMO_IMAGE);
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
    image_url: "",
  });

  const [shoeForm, setShoeForm] = useState({
    id: "",
    slug: "",
    name: "",
    subCategory: "Road Running",
    gender: "men",
    activity: "Road Running",
    cushioning: "Max",
    priceCHF: 199.90,
    isNew: true,
    isBestSeller: true,
    badge: "Flagship Edition",
    weight: "248 g / 8.7 oz",
    heelDrop: "7 mm",
    stability: "Neutral Balanced",
    lacing: "Speed Lacing System",
    description: "",
    rating: 4.9,
    reviewCount: 312,
    colorways: JSON.parse(JSON.stringify(DEFAULT_COLORWAYS)),
  });

  const [errorForm, setErrorForm] = useState({
    doc_id: "",
    category: "inverter",
    brand: "",
    error_code: "",
    title: "",
    solution_text: "",
    video_url: "",
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
      const [prodRes, shoeRes, menuRes, netRes, errRes] = await Promise.all([
        fetch("/api/products").then((r) => r.json()).catch(() => []),
        fetch("/api/shoes").then((r) => r.json()).catch(() => []),
        fetch("/api/menu").then((r) => r.json()).catch(() => null),
        fetch("/api/net-metering").then((r) => r.json()).catch(() => null),
        fetch("/api/errors").then((r) => r.json()).catch(() => []),
      ]);

      setProducts(Array.isArray(prodRes) ? prodRes : []);
      setShoes(Array.isArray(shoeRes) ? shoeRes : []);
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

  // Filtered Shoes
  const filteredShoes = useMemo(() => {
    return shoes.filter((s) => {
      const matchesSearch =
        (s.name || "").toLowerCase().includes(shoeSearch.toLowerCase()) ||
        (s.slug || "").toLowerCase().includes(shoeSearch.toLowerCase()) ||
        (s.id || "").toLowerCase().includes(shoeSearch.toLowerCase()) ||
        (s.activity || "").toLowerCase().includes(shoeSearch.toLowerCase());
      const matchesGender = shoeGenderFilter === "all" || s.gender === shoeGenderFilter;
      return matchesSearch && matchesGender;
    });
  }, [shoes, shoeSearch, shoeGenderFilter]);

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

  // Universal image upload helper function
  const uploadImageFile = async (file: File, folder = "products"): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

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

  // Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageForm.recipients.trim() || !messageForm.message.trim()) {
      showNotification("Please provide recipient number(s) and a message", "error");
      return;
    }

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
        const uploadedUrl = await uploadImageFile(selectedMsgImageFile, "promotions");
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
          bodyParameters: [messageForm.message.trim()],
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showNotification(`✅ Message sent successfully to ${phoneNumbers.length} recipient(s)!`);
        setMessageForm({ recipients: "", message: "", media_url: DEFAULT_PROMO_IMAGE });
        setSelectedMsgImageFile(null);
        setMsgImagePreview(DEFAULT_PROMO_IMAGE);
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

    if (selectedImageFile) {
      const uploadedUrl = await uploadImageFile(selectedImageFile, "products");
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
      image_url: "",
    });
    setSelectedImageFile(null);
    setImagePreview("");
  };

  // Shoe Handlers
  const handleShoeColorwayImageSelect = (index: number, file: File | null) => {
    setSelectedShoeFiles((prev) => ({ ...prev, [index]: file }));
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setShoeImagePreviews((prev) => ({ ...prev, [index]: previewUrl }));
    }
  };

  const handleSaveShoe = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingShoe(true);

    try {
      const updatedColorways = await Promise.all(
        shoeForm.colorways.map(async (colorway: any, idx: number) => {
          const file = selectedShoeFiles[idx];
          let imageUrl = colorway.image || "";

          if (file) {
            // Uploads image file specifically to shoes_product bucket folder
            const uploadedUrl = await uploadImageFile(file, "shoes_product");
            if (uploadedUrl) {
              imageUrl = uploadedUrl;
            } else {
              showNotification(`Warning: Failed to upload image for colorway ${colorway.name}`, "info");
            }
          }

          return {
            ...colorway,
            image: imageUrl,
          };
        })
      );

      const generatedSlug = shoeForm.slug || shoeForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const generatedId = shoeForm.id || `${shoeForm.gender}-${generatedSlug}`;

      const shoePayload = {
        ...shoeForm,
        id: generatedId,
        slug: generatedSlug,
        priceCHF: Number(shoeForm.priceCHF),
        rating: Number(shoeForm.rating),
        reviewCount: Number(shoeForm.reviewCount),
        features: STATIC_FEATURES,
        technologies: STATIC_TECHNOLOGIES,
        sustainability: STATIC_SUSTAINABILITY,
        sizes: STATIC_SIZES,
        colorways: updatedColorways,
      };

      const res = await fetch("/api/shoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shoePayload),
      });

      if (res.ok) {
        showNotification("✅ Shoe product saved to Firebase successfully!");
        setIsShoeModalOpen(false);
        resetShoeForm();
        fetchAllData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        showNotification(errorData.error || "Failed to save shoe product", "error");
      }
    } catch (error) {
      console.error(error);
      showNotification("Error occurred while saving shoe product", "error");
    } finally {
      setUploadingShoe(false);
    }
  };

  const handleDeleteShoe = async (id: string) => {
    if (!confirm(`Are you sure you want to delete shoe item ${id}?`)) return;
    const res = await fetch(`/api/shoes/${id}`, { method: "DELETE" });
    if (res.ok) {
      showNotification("Shoe product removed");
      fetchAllData();
    }
  };

  const editShoe = (item: any) => {
    setShoeForm({
      id: item.id || "",
      slug: item.slug || "",
      name: item.name || "",
      subCategory: item.subCategory || "Road Running",
      gender: item.gender || "men",
      activity: item.activity || "Road Running",
      cushioning: item.cushioning || "Max",
      priceCHF: item.priceCHF || 199.90,
      isNew: item.isNew !== false,
      isBestSeller: item.isBestSeller !== false,
      badge: item.badge || "Flagship Edition",
      weight: item.weight || "248 g / 8.7 oz",
      heelDrop: item.heelDrop || "7 mm",
      stability: item.stability || "Neutral Balanced",
      lacing: item.lacing || "Speed Lacing System",
      description: item.description || "",
      rating: item.rating || 4.9,
      reviewCount: item.reviewCount || 312,
      colorways: item.colorways && item.colorways.length > 0 ? item.colorways : JSON.parse(JSON.stringify(DEFAULT_COLORWAYS)),
    });

    const initialPreviews: { [key: number]: string } = {};
    if (item.colorways) {
      item.colorways.forEach((cw: any, idx: number) => {
        if (cw.image) initialPreviews[idx] = cw.image;
      });
    }
    setShoeImagePreviews(initialPreviews);
    setSelectedShoeFiles({});
    setIsShoeModalOpen(true);
  };

  const resetShoeForm = () => {
    setShoeForm({
      id: "",
      slug: "",
      name: "",
      subCategory: "Road Running",
      gender: "men",
      activity: "Road Running",
      cushioning: "Max",
      priceCHF: 199.90,
      isNew: true,
      isBestSeller: true,
      badge: "Flagship Edition",
      weight: "248 g / 8.7 oz",
      heelDrop: "7 mm",
      stability: "Neutral Balanced",
      lacing: "Speed Lacing System",
      description: "The definitive daily running shoe, engineered in Zurich.",
      rating: 4.9,
      reviewCount: 312,
      colorways: JSON.parse(JSON.stringify(DEFAULT_COLORWAYS)),
    });
    setSelectedShoeFiles({});
    setShoeImagePreviews({});
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
              { id: "shoes", label: "Shoe Products", icon: "👟", count: shoes.length },
              { id: "menu", label: "Main Menu Config", icon: "📋" },
              { id: "netmetering", label: "Net Metering Guide", icon: "☀️" },
              { id: "errors", label: "Fault Knowledgebase", icon: "🛠", count: errorCodes.length },
              { id: "messages", label: "Run Promotion", icon: "💬" },
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
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      activeTab === tab.id ? "bg-blue-200/60 text-blue-800" : "bg-slate-100 text-slate-500"
                    }`}
                  >
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
              {activeTab === "shoes" && "👟 Shoe Products Management"}
              {activeTab === "menu" && "📋 WhatsApp Interactive Menu"}
              {activeTab === "netmetering" && "☀ Net Metering Guide Editor"}
              {activeTab === "errors" && "🛠️ Error Fault Knowledgebase"}
              {activeTab === "messages" && "💬 Send WhatsApp Message"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Changes saved here update the database and store fronts instantly after sync.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white border border-slate-200/80 px-4 py-2 rounded-xl shadow-2xs">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Catalog</span>
              <span className="text-base font-black text-slate-900">{products.filter((p) => p.active !== false).length}</span>
            </div>
            <div className="bg-white border border-slate-200/80 px-4 py-2 rounded-xl shadow-2xs">
              <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Shoes</span>
              <span className="text-base font-black text-slate-900">{shoes.length}</span>
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
            { id: "shoes", label: "Shoes" },
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

        {/* ==================== TAB 2: SHOE PRODUCTS ==================== */}
        {activeTab === "shoes" && (
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
                    placeholder="Search shoe name, slug, activity, ID..."
                    value={shoeSearch}
                    onChange={(e) => setShoeSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors shadow-2xs"
                  />
                </div>

                <div className="relative w-full sm:w-52">
                  <select
                    value={shoeGenderFilter}
                    onChange={(e) => setShoeGenderFilter(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors cursor-pointer shadow-2xs"
                  >
                    <option value="all">All Genders</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
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
                  resetShoeForm();
                  setIsShoeModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10 active:scale-95"
              >
                <span>👟 Add Shoe Product</span>
              </button>
            </div>

            {/* Shoes Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">ID / Slug</th>
                      <th className="p-3.5">Shoe Name & Category</th>
                      <th className="p-3.5">Gender / Cushioning</th>
                      <th className="p-3.5">Price (CHF)</th>
                      <th className="p-3.5">Colorways</th>
                      <th className="p-3.5">Badges</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredShoes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400">
                          No shoe products found. Click "Add Shoe Product" to create one.
                        </td>
                      </tr>
                    ) : (
                      filteredShoes.map((shoe) => (
                        <tr key={shoe.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5">
                            <div className="font-mono text-[11px] font-bold text-slate-800">{shoe.id}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{shoe.slug}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 text-sm">{shoe.name}</div>
                            <div className="text-[11px] text-blue-600 font-medium">{shoe.subCategory} • {shoe.activity}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="capitalize bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-700 mr-1.5">
                              {shoe.gender}
                            </span>
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {shoe.cushioning} Cushion
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 text-xs">CHF {shoe.priceCHF?.toFixed(2)}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              {shoe.colorways?.map((cw: any, i: number) => (
                                <div
                                  key={i}
                                  className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs relative overflow-hidden"
                                  title={cw.name}
                                  style={{
                                    background: `linear-gradient(135deg, ${cw.primaryColorHex || '#eee'} 50%, ${cw.accentColorHex || '#333'} 50%)`,
                                  }}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              {shoe.badge && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200/80 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                  {shoe.badge}
                                </span>
                              )}
                              {shoe.isNew && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                  NEW
                                </span>
                              )}
                              {shoe.isBestSeller && (
                                <span className="bg-purple-50 text-purple-700 border border-purple-200/80 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                  Best Seller
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <button
                              onClick={() => editShoe(shoe)}
                              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteShoe(shoe.id)}
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

        {/* ==================== TAB 3: MAIN MENU CONFIG ==================== */}
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

        {/* ==================== TAB 4: NET METERING ==================== */}
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

        {/* ==================== TAB 5: FAULT KNOWLEDGEBASE ==================== */}
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

        {/* ==================== TAB 6: SEND MESSAGE ==================== */}
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
                    Enter numbers separated by commas or new lines. Include country codes without '+' or spaces.
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
                {productForm.id ? "Edit Catalog Product" : "Add New Catalog Product"}
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
                    placeholder="e.g. Huawei, Knox"
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
                    placeholder="e.g. Nitrox 5KW"
                    value={productForm.model}
                    onChange={(e) => setProductForm({ ...productForm, model: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

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
                  Visible on Bot
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

      {/* ==================== SLIDE-OVER MODAL: ADD/EDIT SHOE PRODUCT ==================== */}
      {isShoeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white border-l border-slate-200 h-full p-6 overflow-y-auto space-y-5 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {shoeForm.id ? "Edit Shoe Product" : "Add New Shoe Product"}
              </h3>
              <button onClick={() => setIsShoeModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveShoe} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Shoe Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CloudRush 2"
                    value={shoeForm.name}
                    onChange={(e) => setShoeForm({ ...shoeForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Slug</label>
                  <input
                    type="text"
                    placeholder="soule-cloudrush-2"
                    value={shoeForm.slug}
                    onChange={(e) => setShoeForm({ ...shoeForm, slug: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Gender</label>
                  <select
                    value={shoeForm.gender}
                    onChange={(e) => setShoeForm({ ...shoeForm, gender: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">SubCategory</label>
                  <input
                    type="text"
                    value={shoeForm.subCategory}
                    onChange={(e) => setShoeForm({ ...shoeForm, subCategory: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Activity</label>
                  <input
                    type="text"
                    value={shoeForm.activity}
                    onChange={(e) => setShoeForm({ ...shoeForm, activity: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Price (CHF)</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={shoeForm.priceCHF}
                    onChange={(e) => setShoeForm({ ...shoeForm, priceCHF: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cushioning</label>
                  <input
                    type="text"
                    value={shoeForm.cushioning}
                    onChange={(e) => setShoeForm({ ...shoeForm, cushioning: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Badge</label>
                  <input
                    type="text"
                    placeholder="e.g. Flagship Edition"
                    value={shoeForm.badge}
                    onChange={(e) => setShoeForm({ ...shoeForm, badge: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Weight</label>
                  <input
                    type="text"
                    value={shoeForm.weight}
                    onChange={(e) => setShoeForm({ ...shoeForm, weight: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Heel Drop</label>
                  <input
                    type="text"
                    value={shoeForm.heelDrop}
                    onChange={(e) => setShoeForm({ ...shoeForm, heelDrop: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Stability</label>
                  <input
                    type="text"
                    value={shoeForm.stability}
                    onChange={(e) => setShoeForm({ ...shoeForm, stability: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Lacing System</label>
                  <input
                    type="text"
                    value={shoeForm.lacing}
                    onChange={(e) => setShoeForm({ ...shoeForm, lacing: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800"
                  />
                </div>
                <div className="flex gap-4 items-center pt-5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shoeForm.isNew}
                      onChange={(e) => setShoeForm({ ...shoeForm, isNew: e.target.checked })}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                    />
                    <span>Is New</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shoeForm.isBestSeller}
                      onChange={(e) => setShoeForm({ ...shoeForm, isBestSeller: e.target.checked })}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                    />
                    <span>Is Best Seller</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={shoeForm.description}
                  onChange={(e) => setShoeForm({ ...shoeForm, description: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              {/* COLORWAY IMAGES SECTION */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Colorways & Image Uploads (Saved to `shoes_product` bucket)
                </label>

                <div className="space-y-3">
                  {shoeForm.colorways.map((cw: any, idx: number) => (
                    <div key={cw.id || idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">{cw.name}</span>
                        <div className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: cw.primaryColorHex }} />
                          <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: cw.accentColorHex }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {shoeImagePreviews[idx] ? (
                          <div className="relative w-14 h-14 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                            <img src={shoeImagePreviews[idx]} alt={cw.name} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                handleShoeColorwayImageSelect(idx, null);
                                const updatedCw = [...shoeForm.colorways];
                                updatedCw[idx].image = "";
                                setShoeForm({ ...shoeForm, colorways: updatedCw });
                                setShoeImagePreviews((prev) => ({ ...prev, [idx]: "" }));
                              }}
                              className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full text-[9px] w-3.5 h-3.5 flex items-center justify-center"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 bg-white shrink-0 text-xs">
                            👟
                          </div>
                        )}

                        <div className="flex-1 space-y-1">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">
                            <span>📁 Upload Color Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleShoeColorwayImageSelect(idx, file);
                              }}
                            />
                          </label>
                          <input
                            type="text"
                            placeholder="Or paste direct image URL"
                            value={cw.image || ""}
                            onChange={(e) => {
                              const updatedCw = [...shoeForm.colorways];
                              updatedCw[idx].image = e.target.value;
                              setShoeForm({ ...shoeForm, colorways: updatedCw });
                              if (!selectedShoeFiles[idx]) {
                                setShoeImagePreviews((prev) => ({ ...prev, [idx]: e.target.value }));
                              }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STATIC DATA INFORMATIONAL BOX */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800 space-y-1">
                <span className="font-bold block">⚡ Auto-Appended Standard Fields:</span>
                <p>• 4 Standard Propulsion Features, 3 Tech Pod Descriptions, Recycled Content Info & 9 Standard US/EU Sizes will automatically be attached on save.</p>
              </div>

              <div className="pt-3 flex gap-2.5">
                <button
                  type="submit"
                  disabled={uploadingShoe}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-sm shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-2"
                >
                  {uploadingShoe ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading Images & Saving...</span>
                    </>
                  ) : (
                    <span>💾 Save Shoe Product</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsShoeModalOpen(false)}
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