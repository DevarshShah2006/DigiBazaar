import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  MapPin,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
  Phone,
  ArrowRight,
  ShoppingBag,
  Store,
  Bike,
  CheckCircle,
  ChevronDown,
  Flame,
  RotateCcw,
  Navigation,
  Instagram,
  Twitter,
  Facebook,
  Mail,
  ShoppingCart,
  LogOut,
  Package,
  Heart,
  MapPinned,
  CreditCard,
  HelpCircle,
  User,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const CAROUSEL_ITEMS = [
  {
    id: 1,
    name: "Fresh Organic Vegetables",
    subtitle: "Farm-to-door in 30 mins",
    tag: "Trending Today",
    color: "#d8ebf9",
    accent: "#513229",
    items: ["🥦 Broccoli", "🥕 Carrots", "🍅 Tomatoes", "🥬 Spinach"],
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&h=700&fit=crop&auto=format",
    stats: [{ val: "120+", label: "Varieties" }, { val: "₹29", label: "Starts at" }, { val: "30 min", label: "Delivery" }],
    offer: "Up to 35% off on seasonal vegetables",
    shopCount: 14,
    featured: { name: "Organic Spinach 500g", price: 35, mrp: 48, shop: "Green Basket Mart" },
  },
  {
    id: 2,
    name: "Dairy & Breakfast Essentials",
    subtitle: "Start your morning right",
    tag: "Best Sellers",
    color: "#fce6b7",
    accent: "#3d2520",
    items: ["🥛 Full Cream Milk", "🧀 Paneer", "🧈 Butter", "🥚 Eggs"],
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1200&h=700&fit=crop&auto=format",
    stats: [{ val: "8+", label: "Brands" }, { val: "₹18", label: "Starts at" }, { val: "12 min", label: "Fastest" }],
    offer: "Free delivery on dairy orders above ₹150",
    shopCount: 9,
    featured: { name: "Amul Full Cream Milk 1L", price: 68, mrp: 72, shop: "Krishna Dairy Store" },
  },
  {
    id: 3,
    name: "Seasonal Fruits",
    subtitle: "Handpicked from local orchards",
    tag: "Limited Stock",
    color: "#d7d4b1",
    accent: "#513229",
    items: ["🍓 Strawberries", "🥭 Alphonso Mango", "🍇 Grapes", "🍑 Peach"],
    image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1200&h=700&fit=crop&auto=format",
    stats: [{ val: "60+", label: "Varieties" }, { val: "₹49", label: "Starts at" }, { val: "15 min", label: "Delivery" }],
    offer: "Buy 1 kg, get 200g free on Alphonso Mangoes",
    shopCount: 6,
    featured: { name: "Alphonso Mango 1kg", price: 180, mrp: 210, shop: "Fresh Fruits Corner" },
  },
  {
    id: 4,
    name: "Grains, Pulses & Staples",
    subtitle: "Premium quality, nearby stores",
    tag: "Price Drop ↓",
    color: "#f4f1e2",
    accent: "#3d2520",
    items: ["🌾 Basmati Rice", "🫘 Toor Dal", "🫙 Atta", "🧂 Rock Salt"],
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200&h=700&fit=crop&auto=format",
    stats: [{ val: "200+", label: "Products" }, { val: "₹39", label: "Starts at" }, { val: "22 min", label: "Avg. ETA" }],
    offer: "Save ₹60 on 5 kg Basmati Rice today",
    shopCount: 11,
    featured: { name: "Basmati Rice 5kg", price: 389, mrp: 450, shop: "Sharma General Store" },
  },
];

const CATEGORIES = [
  { name: "Vegetables", emoji: "🥦", image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop&auto=format", color: "#d8ebf9" },
  { name: "Fruits", emoji: "🍎", image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop&auto=format", color: "#fce6b7" },
  { name: "Dairy", emoji: "🥛", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&h=200&fit=crop&auto=format", color: "#f4f1e2" },
  { name: "Cold Drinks", emoji: "🥤", image: "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=200&h=200&fit=crop&auto=format", color: "#d8ebf9" },
  { name: "Snacks", emoji: "🍿", image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=200&h=200&fit=crop&auto=format", color: "#fce6b7" },
  { name: "Bakery", emoji: "🍞", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop&auto=format", color: "#d7d4b1" },
  { name: "Staples", emoji: "🌾", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop&auto=format", color: "#f4f1e2" },
  { name: "Meat & Fish", emoji: "🍗", image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=200&h=200&fit=crop&auto=format", color: "#fce6b7" },
  { name: "Frozen", emoji: "🧊", image: "https://images.unsplash.com/photo-1535400255456-984e7e8b5f23?w=200&h=200&fit=crop&auto=format", color: "#d8ebf9" },
  { name: "Personal Care", emoji: "🧴", image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&h=200&fit=crop&auto=format", color: "#d7d4b1" },
  { name: "Electronics", emoji: "📱", image: "https://images.unsplash.com/photo-1526406915894-7bcd65f60845?w=200&h=200&fit=crop&auto=format", color: "#d8ebf9" },
  { name: "Medicines", emoji: "💊", image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop&auto=format", color: "#fce6b7" },
];

const BESTSELLERS = [
  { id: 1, name: "Amul Full Cream Milk 1L", shop: "Krishna Dairy", price: 68, mrp: 72, rating: 4.8, tag: "🔥 Top Seller", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&h=200&fit=crop&auto=format" },
  { id: 2, name: "Alphonso Mango 1kg", shop: "Fresh Fruits Co.", price: 180, mrp: 210, rating: 4.9, tag: "🏆 #1 This Week", image: "https://images.unsplash.com/photo-1601493700631-2851bdff962a?w=300&h=200&fit=crop&auto=format" },
  { id: 3, name: "Sourdough Bread Loaf", shop: "Neighbourhood Bakery", price: 120, mrp: 140, rating: 4.7, tag: "⭐ Fan Favourite", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=200&fit=crop&auto=format" },
  { id: 4, name: "Farm Eggs Tray (30)", shop: "Daily Needs Hub", price: 210, mrp: 240, rating: 4.5, tag: "🔥 Hot Deal", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&h=200&fit=crop&auto=format" },
  { id: 5, name: "Organic Spinach 500g", shop: "Green Basket Mart", price: 35, mrp: 45, rating: 4.6, tag: "🌿 Organic Pick", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300&h=200&fit=crop&auto=format" },
  { id: 6, name: "Basmati Rice 5kg", shop: "Sharma General Store", price: 389, mrp: 450, rating: 4.5, tag: "💰 Best Price", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=200&fit=crop&auto=format" },
];

const ORDER_AGAIN = [
  { id: 1, name: "Amul Full Cream Milk 1L", shop: "Krishna Dairy", price: 68, lastOrdered: "2 days ago", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&h=200&fit=crop&auto=format" },
  { id: 2, name: "Sourdough Bread Loaf", shop: "Neighbourhood Bakery", price: 120, lastOrdered: "5 days ago", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=200&fit=crop&auto=format" },
  { id: 3, name: "Basmati Rice 5kg", shop: "Sharma General Store", price: 389, lastOrdered: "1 week ago", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=200&fit=crop&auto=format" },
  { id: 4, name: "Farm Eggs (12 pcs)", shop: "Daily Needs Hub", price: 95, lastOrdered: "1 week ago", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&h=200&fit=crop&auto=format" },
];

const NEARBY_SHOPS = [
  { id: 1, name: "Krishna Dairy Store", owner: "Ramesh Krishna", category: "Dairy & Groceries", distance: "0.3 km", rating: 4.8, reviews: 312, eta: "12 min", tier: "premium", open: true, image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&h=260&fit=crop&auto=format" },
  { id: 2, name: "Green Basket Mart", owner: "Sunita Devi", category: "Fresh Produce", distance: "0.7 km", rating: 4.6, reviews: 89, eta: "18 min", tier: "standard", open: true, image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=260&fit=crop&auto=format" },
  { id: 3, name: "Sharma General Store", owner: "Anil Sharma", category: "Groceries & Staples", distance: "1.1 km", rating: 4.5, reviews: 204, eta: "22 min", tier: "standard", open: true, image: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=260&fit=crop&auto=format" },
  { id: 4, name: "The Neighbourhood Bakery", owner: "Priya Menon", category: "Bakery & Café", distance: "1.4 km", rating: 4.7, reviews: 398, eta: "25 min", tier: "premium", open: true, image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=260&fit=crop&auto=format" },
  { id: 5, name: "Raju Pan & General", owner: "Raju Yadav", category: "Pan Parlour & Misc", distance: "0.2 km", rating: 4.3, reviews: 156, eta: "8 min", tier: "standard", open: false, image: "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=400&h=260&fit=crop&auto=format" },
  { id: 6, name: "TechZone Electronics", owner: "Vijay Nair", category: "Electronics & Mobiles", distance: "1.8 km", rating: 4.4, reviews: 73, eta: "30 min", tier: "premium", open: true, image: "https://images.unsplash.com/photo-1526406915894-7bcd65f60845?w=400&h=260&fit=crop&auto=format" },
];

// ─── Login Modal ──────────────────────────────────────────────────────────────

const USER_TYPES = [
  { id: "customer", label: "Customer", desc: "Browse & order from nearby shops", icon: ShoppingBag, color: "#d8ebf9" },
  { id: "shopowner", label: "Shop Owner", desc: "List your store & manage inventory", icon: Store, color: "#fce6b7" },
  { id: "delivery", label: "Delivery Partner", desc: "Deliver orders, earn daily", icon: Bike, color: "#d7d4b1" },
];

function LoginModal({ onClose, onLogin }: { onClose: () => void; onLogin: (type: string, phone: string) => void }) {
  const [step, setStep] = useState<"type" | "phone" | "otp" | "done">("type");
  const [userType, setUserType] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleVerify = () => {
    setStep("done");
    setTimeout(() => { onLogin(userType, phone); onClose(); }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(42,26,21,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: "#fefcf5", border: "1px solid rgba(81,50,41,0.12)", boxShadow: "0 24px 60px rgba(42,26,21,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between"
          style={{ borderBottom: "1px solid rgba(81,50,41,0.08)" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🛍️</span>
              <span className="font-bold text-base" style={{ fontFamily: "'Playfair Display', serif", color: "#513229" }}>DigiBazaar</span>
            </div>
            <p className="text-xs" style={{ color: "#6b5c50" }}>
              {step === "type" && "Who are you signing in as?"}
              {step === "phone" && "Enter your mobile number"}
              {step === "otp" && "Verify with OTP"}
              {step === "done" && "You're all set!"}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "#d7d4b1", color: "#513229" }}>
            <X size={14} />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex gap-1.5 px-6 pt-4">
            {["type", "phone", "otp"].map((s, i) => (
              <div key={s} className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: ["type", "phone", "otp"].indexOf(step) >= i ? "#513229" : "#d7d4b1" }} />
            ))}
          </div>
        )}

        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {/* Step 1 — User type */}
            {step === "type" && (
              <motion.div key="type"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col gap-3"
              >
                <p className="text-sm font-medium mb-1" style={{ color: "#2a1a15" }}>I am a…</p>
                {USER_TYPES.map(({ id, label, desc, icon: Icon, color }) => (
                  <button key={id} onClick={() => setUserType(id)}
                    className="flex items-center gap-4 p-3.5 rounded-2xl text-left transition-all"
                    style={{
                      background: userType === id ? color : "#f4f1e2",
                      border: `1.5px solid ${userType === id ? "#513229" : "rgba(81,50,41,0.1)"}`,
                      transform: userType === id ? "scale(1.01)" : "scale(1)",
                    }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: color, border: "1px solid rgba(81,50,41,0.1)" }}>
                      <Icon size={18} style={{ color: "#513229" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#2a1a15" }}>{label}</p>
                      <p className="text-xs" style={{ color: "#6b5c50" }}>{desc}</p>
                    </div>
                    {userType === id && <CheckCircle size={16} className="ml-auto flex-shrink-0" style={{ color: "#513229" }} />}
                  </button>
                ))}
                <button
                  onClick={() => userType && setStep("phone")}
                  disabled={!userType}
                  className="mt-2 w-full py-3 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: userType ? "#513229" : "#d7d4b1",
                    color: userType ? "#f4f1e2" : "#a0907e",
                    cursor: userType ? "pointer" : "not-allowed",
                  }}>
                  Continue <ArrowRight size={15} />
                </button>
              </motion.div>
            )}

            {/* Step 2 — Phone */}
            {step === "phone" && (
              <motion.div key="phone"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <p className="text-sm font-medium mb-3" style={{ color: "#2a1a15" }}>Mobile number</p>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                    style={{ background: "#f4f1e2", border: "1.5px solid rgba(81,50,41,0.2)" }}>
                    <Phone size={15} style={{ color: "#513229" }} />
                    <span className="text-sm font-mono font-medium" style={{ color: "#513229" }}>+91</span>
                    <div className="w-px h-4" style={{ background: "rgba(81,50,41,0.2)" }} />
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="98765 43210"
                      autoFocus
                      className="flex-1 bg-transparent outline-none text-sm font-mono"
                      style={{ color: "#2a1a15" }}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: "#6b5c50" }}>We'll send a 6-digit OTP to verify your number.</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep("type")}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
                    style={{ background: "#f4f1e2", color: "#6b5c50", border: "1px solid rgba(81,50,41,0.1)" }}>
                    ← Back
                  </button>
                  <button
                    onClick={() => phone.length === 10 && setStep("otp")}
                    disabled={phone.length !== 10}
                    className="flex-[2] py-3 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    style={{
                      background: phone.length === 10 ? "#513229" : "#d7d4b1",
                      color: phone.length === 10 ? "#f4f1e2" : "#a0907e",
                      cursor: phone.length === 10 ? "pointer" : "not-allowed",
                    }}>
                    Send OTP <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — OTP */}
            {step === "otp" && (
              <motion.div key="otp"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "#2a1a15" }}>Enter OTP</p>
                  <p className="text-xs mb-4" style={{ color: "#6b5c50" }}>Sent to +91 {phone.slice(0, 5)} {phone.slice(5)}</p>
                  <div className="flex gap-2 justify-between">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKey(i, e)}
                        className="w-10 h-12 text-center text-lg font-bold rounded-xl outline-none transition-all"
                        style={{
                          background: "#f4f1e2",
                          border: `1.5px solid ${digit ? "#513229" : "rgba(81,50,41,0.2)"}`,
                          color: "#2a1a15",
                          fontFamily: "'DM Mono', monospace",
                        }}
                      />
                    ))}
                  </div>
                  <button className="text-xs mt-3" style={{ color: "#513229" }}>Resend OTP in 0:45</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep("phone")}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium"
                    style={{ background: "#f4f1e2", color: "#6b5c50", border: "1px solid rgba(81,50,41,0.1)" }}>
                    ← Back
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={otp.join("").length !== 6}
                    className="flex-[2] py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: otp.join("").length === 6 ? "#513229" : "#d7d4b1",
                      color: otp.join("").length === 6 ? "#f4f1e2" : "#a0907e",
                    }}>
                    Verify & Login <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Done */}
            {step === "done" && (
              <motion.div key="done"
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3 py-6"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 14 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "#fce6b7" }}>
                  <CheckCircle size={32} style={{ color: "#513229" }} />
                </motion.div>
                <p className="font-bold text-base" style={{ fontFamily: "'Playfair Display', serif", color: "#2a1a15" }}>
                  Welcome to DigiBazaar!
                </p>
                <p className="text-xs text-center" style={{ color: "#6b5c50" }}>
                  Logged in as {USER_TYPES.find(u => u.id === userType)?.label}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({
  isLoggedIn, userType, cartCount, onLoginClick, onCartClick, onProfileClick,
}: {
  isLoggedIn: boolean; userType: string; cartCount: number;
  onLoginClick: () => void; onCartClick: () => void; onProfileClick: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(244,241,226,0.97)" : "rgba(244,241,226,0.8)",
        backdropFilter: "blur(14px)",
        borderBottom: scrolled ? "1px solid rgba(81,50,41,0.1)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-lg">🛍️</span>
          <span className="font-bold text-base hidden sm:block"
            style={{ fontFamily: "'Playfair Display', serif", color: "#513229" }}>
            DigiBazaar
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full"
          style={{ background: "#fefcf5", border: "1.5px solid rgba(81,50,41,0.15)" }}>
          <Search size={15} style={{ color: "#513229", flexShrink: 0 }} />
          <input
            placeholder="Search products, shops, brands…"
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
            style={{ color: "#2a1a15", fontFamily: "'DM Sans', sans-serif" }}
          />
          <div className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full flex-shrink-0"
            style={{ background: "#d8ebf9", color: "#2a1a15" }}>
            <MapPin size={10} />
            <span>Koramangala</span>
            <ChevronDown size={10} />
          </div>
        </div>

        {/* View Cart */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onCartClick}
          className="relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full flex-shrink-0 transition-all hover:opacity-90"
          style={{ background: "#513229", color: "#f4f1e2" }}
        >
          <ShoppingCart size={15} />
          <span className="text-sm font-semibold hidden sm:inline">Cart</span>
          {cartCount > 0 && (
            <motion.span
              key={cartCount}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: "#fce6b7", color: "#513229" }}
            >
              {cartCount}
            </motion.span>
          )}
        </motion.button>

        {/* Login / Avatar */}
        {isLoggedIn ? (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onProfileClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 transition-all hover:opacity-90"
            style={{ background: "#fce6b7", border: "1px solid rgba(81,50,41,0.2)" }}
          >
            <div className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center"
              style={{ background: "#513229", color: "#f4f1e2" }}>
              A
            </div>
            <span className="text-xs font-semibold hidden sm:block" style={{ color: "#2a1a15" }}>Aryan</span>
          </motion.button>
        ) : (
          <button
            onClick={onLoginClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0 transition-all hover:opacity-90 active:scale-95"
            style={{ background: "#fce6b7", color: "#513229", border: "1px solid rgba(81,50,41,0.15)" }}
          >
            <User size={14} /> Login
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Cart Off-Canvas ──────────────────────────────────────────────────────────

const CART_ITEMS = [
  { id: 1, name: "Amul Full Cream Milk 1L", shop: "Krishna Dairy", price: 68, qty: 2, image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=120&h=80&fit=crop&auto=format" },
  { id: 2, name: "Alphonso Mango 1kg", shop: "Fresh Fruits Co.", price: 180, qty: 1, image: "https://images.unsplash.com/photo-1601493700631-2851bdff962a?w=120&h=80&fit=crop&auto=format" },
  { id: 3, name: "Sourdough Bread Loaf", shop: "Neighbourhood Bakery", price: 120, qty: 1, image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=120&h=80&fit=crop&auto=format" },
];

function CartOffCanvas({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState(CART_ITEMS);

  const updateQty = (id: number, delta: number) => {
    setItems(prev => prev
      .map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      .filter(i => i.qty > 0)
    );
  };

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = 25;
  const total = subtotal + delivery;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(42,26,21,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-[380px] h-full flex flex-col"
        style={{ background: "#fefcf5", borderLeft: "1px solid rgba(81,50,41,0.1)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(81,50,41,0.08)" }}>
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} style={{ color: "#513229" }} />
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#2a1a15" }}>
              Your Cart
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full"
              style={{ background: "#fce6b7", color: "#513229" }}>
              {items.length} shops
            </span>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-70"
            style={{ background: "#f4f1e2", color: "#513229" }}>
            <X size={14} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
              <span className="text-5xl">🛒</span>
              <p className="text-sm font-medium" style={{ color: "#6b5c50" }}>Your cart is empty</p>
              <button onClick={onClose}
                className="text-xs px-4 py-2 rounded-full font-semibold mt-2"
                style={{ background: "#513229", color: "#f4f1e2" }}>
                Start Shopping →
              </button>
            </div>
          ) : items.map(item => (
            <motion.div
              key={item.id}
              layout
              exit={{ opacity: 0, x: 40 }}
              className="flex gap-3 p-3 rounded-2xl"
              style={{ background: "#f4f1e2", border: "1px solid rgba(81,50,41,0.07)" }}
            >
              <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ width: 64, height: 64, background: "#d7d4b1" }}>
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-snug mb-0.5 line-clamp-2" style={{ color: "#2a1a15" }}>{item.name}</p>
                <p className="text-[10px] mb-2" style={{ color: "#6b5c50" }}>{item.shop}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ fontFamily: "'DM Sans', sans-serif", color: "#513229" }}>
                    ₹{item.price * item.qty}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.id, -1)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:opacity-70"
                      style={{ background: "#d7d4b1", color: "#513229" }}>−</button>
                    <span className="text-xs font-mono font-bold w-4 text-center" style={{ color: "#2a1a15" }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:opacity-70"
                      style={{ background: "#513229", color: "#f4f1e2" }}>+</button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bill summary + checkout */}
        {items.length > 0 && (
          <div className="px-5 pb-6 pt-3" style={{ borderTop: "1px solid rgba(81,50,41,0.08)" }}>
            <div className="rounded-2xl p-4 mb-4 flex flex-col gap-2"
              style={{ background: "#f4f1e2", border: "1px solid rgba(81,50,41,0.07)" }}>
              <p className="text-xs font-mono font-bold tracking-widest uppercase mb-1" style={{ color: "#6b5c50" }}>Bill Summary</p>
              {[
                { label: "Subtotal", val: `₹${subtotal}` },
                { label: "Delivery fee", val: `₹${delivery}` },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between text-xs" style={{ color: "#6b5c50" }}>
                  <span>{label}</span><span>{val}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2"
                style={{ borderTop: "1px solid rgba(81,50,41,0.1)", color: "#2a1a15" }}>
                <span>Total</span><span style={{ color: "#513229" }}>₹{total}</span>
              </div>
            </div>
            <button className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-98"
              style={{ background: "#513229", color: "#f4f1e2" }}>
              Proceed to Checkout · ₹{total} <ArrowRight size={15} />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Profile Off-Canvas ───────────────────────────────────────────────────────

const PROFILE_MENU = [
  { icon: Package, label: "My Orders", sub: "3 active orders" },
  { icon: Heart, label: "Saved Items", sub: "8 items" },
  { icon: MapPinned, label: "Addresses", sub: "2 saved" },
  { icon: CreditCard, label: "Payment Methods", sub: "UPI, Card" },
  { icon: HelpCircle, label: "Help & Support", sub: null },
];

function ProfileOffCanvas({ userType, phone, onClose, onLogout }: {
  userType: string; phone: string; onClose: () => void; onLogout: () => void;
}) {
  const typeLabel = USER_TYPES.find(u => u.id === userType)?.label ?? "Customer";
  const typeColor = USER_TYPES.find(u => u.id === userType)?.color ?? "#d8ebf9";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(42,26,21,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-[340px] h-full flex flex-col overflow-y-auto"
        style={{ background: "#fefcf5", borderLeft: "1px solid rgba(81,50,41,0.1)", scrollbarWidth: "none" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top close */}
        <div className="flex justify-end px-5 pt-5">
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "#f4f1e2", color: "#513229" }}>
            <X size={14} />
          </button>
        </div>

        {/* Avatar + info */}
        <div className="px-6 pt-2 pb-6" style={{ borderBottom: "1px solid rgba(81,50,41,0.08)" }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: "#d8ebf9", color: "#513229", border: "3px solid #fce6b7" }}>
                AR
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "#fce6b7", border: "2px solid #fefcf5" }}>
                <span className="text-[9px]">✏️</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ fontFamily: "'Playfair Display', serif", color: "#2a1a15" }}>
                Aryan Rao
              </h3>
              <p className="text-xs font-mono mt-0.5" style={{ color: "#6b5c50" }}>
                +91 {phone || "98765 43210"}
              </p>
              <span className="inline-block mt-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{ background: typeColor, color: "#2a1a15" }}>
                {typeLabel}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Orders", val: "24" }, { label: "Saved", val: "8" }, { label: "Reviews", val: "11" }].map(({ label, val }) => (
              <div key={label} className="rounded-xl py-3 text-center"
                style={{ background: "#f4f1e2", border: "1px solid rgba(81,50,41,0.08)" }}>
                <p className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#513229" }}>{val}</p>
                <p className="text-[10px]" style={{ color: "#6b5c50" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="mx-5 mt-4 px-4 py-3 rounded-2xl flex items-center gap-3"
          style={{ background: "#d8ebf9", border: "1px solid rgba(81,50,41,0.06)" }}>
          <MapPin size={15} style={{ color: "#513229", flexShrink: 0 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "#2a1a15" }}>Koramangala, Bengaluru</p>
            <p className="text-[10px]" style={{ color: "#6b5c50" }}>560034 · Default address</p>
          </div>
          <button className="ml-auto text-[10px] font-mono" style={{ color: "#513229" }}>Change</button>
        </div>

        {/* Menu items */}
        <div className="flex flex-col gap-1.5 px-5 mt-5">
          {PROFILE_MENU.map(({ icon: Icon, label, sub }) => (
            <button key={label}
              className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left transition-all hover:opacity-80 group"
              style={{ background: "#f4f1e2", border: "1px solid rgba(81,50,41,0.06)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#fce6b7" }}>
                <Icon size={15} style={{ color: "#513229" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#2a1a15" }}>{label}</p>
                {sub && <p className="text-[10px]" style={{ color: "#6b5c50" }}>{sub}</p>}
              </div>
              <ArrowRight size={14} style={{ color: "#d7d4b1" }} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <div className="px-5 mt-4 mb-8">
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 active:scale-98"
            style={{ background: "#513229", color: "#f4f1e2" }}>
            <LogOut size={15} /> Log Out
          </button>
          <p className="text-center text-[10px] mt-3" style={{ color: "#a0907e" }}>
            DigiBazaar v1.0 · Django REST + React
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Hero Carousel ────────────────────────────────────────────────────────────

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    const t = setInterval(() => { setDir(1); setCurrent(c => (c + 1) % CAROUSEL_ITEMS.length); }, 4200);
    return () => clearInterval(t);
  }, []);

  const go = (i: number) => { setDir(i > current ? 1 : -1); setCurrent(i); };
  const prev = () => { setDir(-1); setCurrent(c => (c - 1 + CAROUSEL_ITEMS.length) % CAROUSEL_ITEMS.length); };
  const next = () => { setDir(1); setCurrent(c => (c + 1) % CAROUSEL_ITEMS.length); };
  const slide = CAROUSEL_ITEMS[current];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "88vh", minHeight: 500 }}>
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={current}
          custom={dir}
          initial={{ opacity: 0, x: dir * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -60 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <img src={slide.image} alt={slide.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0"
            style={{ background: `linear-gradient(115deg, ${slide.color}f5 40%, ${slide.color}a0 62%, transparent 100%)` }} />

          <div className="relative z-10 h-full max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-16">
            {/* Left — text content */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45 }}
            >
              <span className="inline-block text-[10px] font-mono font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4"
                style={{ background: slide.accent, color: slide.color }}>
                {slide.tag}
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-2"
                style={{ fontFamily: "'Playfair Display', serif", color: slide.accent }}>
                {slide.name}
              </h1>
              <p className="text-base mb-4 font-light" style={{ color: slide.accent + "cc" }}>{slide.subtitle}</p>

              {/* Offer strip */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl mb-5"
                style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(8px)", border: `1px solid ${slide.accent}22` }}>
                <span className="text-sm">🏷️</span>
                <span className="text-xs font-semibold" style={{ color: slide.accent }}>{slide.offer}</span>
              </div>

              {/* Item pills */}
              <div className="flex flex-wrap gap-2 mb-5">
                {slide.items.map(item => (
                  <span key={item} className="text-xs px-3 py-1.5 rounded-full font-medium"
                    style={{ background: "rgba(255,255,255,0.48)", color: slide.accent, backdropFilter: "blur(6px)" }}>
                    {item}
                  </span>
                ))}
              </div>

              {/* Stats row */}
              <div className="flex gap-4 mb-6">
                {slide.stats.map(s => (
                  <div key={s.label}>
                    <p className="text-xl font-bold leading-none" style={{ fontFamily: "'DM Sans', sans-serif", color: slide.accent }}>{s.val}</p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color: slide.accent + "99" }}>{s.label}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xl font-bold leading-none" style={{ fontFamily: "'DM Sans', sans-serif", color: slide.accent }}>{slide.shopCount}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: slide.accent + "99" }}>Shops nearby</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                  style={{ background: slide.accent, color: slide.color }}>
                  Shop Now →
                </button>
                <button className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
                  style={{ background: "rgba(255,255,255,0.38)", color: slide.accent, backdropFilter: "blur(8px)", border: `1px solid ${slide.accent}33` }}>
                  Explore Shops
                </button>
              </div>
            </motion.div>

            {/* Right — featured product card */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="hidden md:flex justify-center"
            >
              <div className="rounded-3xl p-5 flex flex-col gap-4 w-full max-w-xs"
                style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(18px)", border: `1px solid ${slide.accent}18`, boxShadow: `0 8px 32px ${slide.accent}18` }}>
                {/* "Today's pick" label */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: slide.accent }}>Today's Pick</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: slide.accent + "18", color: slide.accent }}>
                    ✦ Featured
                  </span>
                </div>

                {/* Product name + shop */}
                <div>
                  <p className="font-bold text-base leading-snug" style={{ fontFamily: "'Playfair Display', serif", color: slide.accent }}>
                    {slide.featured.name}
                  </p>
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: slide.accent + "99" }}>
                    <MapPin size={10} /> {slide.featured.shop}
                  </p>
                </div>

                {/* Price + discount */}
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black" style={{ fontFamily: "'DM Sans', sans-serif", color: slide.accent }}>
                    ₹{slide.featured.price}
                  </span>
                  <span className="text-sm line-through mb-0.5" style={{ color: slide.accent + "66" }}>₹{slide.featured.mrp}</span>
                  <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full"
                    style={{ background: slide.accent, color: slide.color }}>
                    -{Math.round(((slide.featured.mrp - slide.featured.price) / slide.featured.mrp) * 100)}%
                  </span>
                </div>

                {/* Delivery info */}
                <div className="flex items-center gap-3 py-2.5 px-3 rounded-2xl"
                  style={{ background: slide.accent + "10", border: `1px dashed ${slide.accent}33` }}>
                  <Clock size={13} style={{ color: slide.accent }} />
                  <span className="text-xs font-medium" style={{ color: slide.accent }}>Delivered in {slide.stats[2]?.val}</span>
                  <span className="ml-auto text-[10px] font-mono" style={{ color: slide.accent + "88" }}>Free delivery</span>
                </div>

                {/* CTA */}
                <button className="w-full py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-90 active:scale-97"
                  style={{ background: slide.accent, color: slide.color }}>
                  Add to Cart →
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20">
        <button onClick={prev} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(6px)", color: "#513229" }}>
          <ChevronLeft size={16} />
        </button>
        {CAROUSEL_ITEMS.map((_, i) => (
          <button key={i} onClick={() => go(i)} className="rounded-full transition-all duration-300"
            style={{ width: i === current ? 24 : 7, height: 7, background: i === current ? "#513229" : "rgba(81,50,41,0.3)" }} />
        ))}
        <button onClick={next} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(6px)", color: "#513229" }}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

const VISIBLE_CATS = 7;

function CategorySection() {
  const [active, setActive] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(CATEGORIES.length / VISIBLE_CATS);
  const start = page * VISIBLE_CATS;
  const visible = CATEGORIES.slice(start, start + VISIBLE_CATS);

  const prev = () => setPage(p => Math.max(0, p - 1));
  const next = () => setPage(p => Math.min(totalPages - 1, p + 1));

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#2a1a15" }}>
          Shop by Category
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono mr-1" style={{ color: "#a0907e" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={prev}
            disabled={page === 0}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{
              background: page === 0 ? "#ece9d5" : "#513229",
              color: page === 0 ? "#c0b098" : "#f4f1e2",
              cursor: page === 0 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={next}
            disabled={page === totalPages - 1}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{
              background: page === totalPages - 1 ? "#ece9d5" : "#513229",
              color: page === totalPages - 1 ? "#c0b098" : "#f4f1e2",
              cursor: page === totalPages - 1 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex gap-3"
          >
            {visible.map((cat) => (
              <motion.button
                key={cat.name}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setActive(active === cat.name ? null : cat.name)}
                className="flex-1 flex flex-col items-center rounded-2xl overflow-hidden transition-all"
                style={{
                  minWidth: 72,
                  border: `2px solid ${active === cat.name ? "#513229" : "rgba(81,50,41,0.1)"}`,
                  background: active === cat.name ? "#fce6b7" : "#fefcf5",
                  boxShadow: active === cat.name ? "0 4px 14px rgba(81,50,41,0.18)" : "0 1px 4px rgba(81,50,41,0.06)",
                }}
              >
                <div className="w-full overflow-hidden" style={{ height: 64, background: cat.color }}>
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] font-semibold text-center px-1 py-2 leading-tight"
                  style={{ color: active === cat.name ? "#513229" : "#2a1a15" }}>
                  {cat.name}
                </p>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Page dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button key={i} onClick={() => setPage(i)}
            className="rounded-full transition-all duration-300"
            style={{ width: i === page ? 20 : 6, height: 6, background: i === page ? "#513229" : "#d7d4b1" }} />
        ))}
      </div>
    </section>
  );
}

// ─── Best Sellers ─────────────────────────────────────────────────────────────

function BestSellersSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
      <div className="flex items-center gap-2 mb-5">
        <Flame size={18} style={{ color: "#513229" }} />
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#2a1a15" }}>
          Best Sellers
        </h2>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full ml-1"
          style={{ background: "#fce6b7", color: "#513229" }}>
          Today's Picks
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {BESTSELLERS.map((item, idx) => {
          const disc = Math.round(((item.mrp - item.price) / item.mrp) * 100);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
              whileHover={{ y: -3 }}
              className="rounded-2xl overflow-hidden cursor-pointer group"
              style={{ background: "#fefcf5", border: "1px solid rgba(81,50,41,0.09)", boxShadow: "0 1px 8px rgba(81,50,41,0.06)" }}
            >
              <div className="relative overflow-hidden" style={{ height: 100, background: "#f4f1e2" }}>
                <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108" />
                <span className="absolute top-2 left-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(254,252,245,0.92)", color: "#513229" }}>
                  {item.tag}
                </span>
                {disc > 0 && (
                  <span className="absolute top-2 right-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#513229", color: "#fce6b7" }}>
                    -{disc}%
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-[11px] font-semibold leading-snug mb-0.5 line-clamp-2" style={{ color: "#2a1a15" }}>{item.name}</p>
                <p className="text-[10px] mb-1.5" style={{ color: "#6b5c50" }}>{item.shop}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ fontFamily: "'DM Sans', sans-serif", color: "#513229" }}>₹{item.price}</span>
                  <button className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "#513229", color: "#f4f1e2" }}>+</button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Order Again ──────────────────────────────────────────────────────────────

function OrderAgainSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
      <div className="flex items-center gap-2 mb-5">
        <RotateCcw size={17} style={{ color: "#513229" }} />
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#2a1a15" }}>
          Order Again
        </h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {ORDER_AGAIN.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.08 }}
            className="flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer group"
            style={{ width: 160, background: "#fefcf5", border: "1px solid rgba(81,50,41,0.09)" }}
          >
            <div className="relative overflow-hidden" style={{ height: 100, background: "#f4f1e2" }}>
              <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1"
                style={{ background: "linear-gradient(to top, rgba(42,26,21,0.55), transparent)" }}>
                <p className="text-[10px] font-mono" style={{ color: "#fce6b7" }}>{item.lastOrdered}</p>
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-[11px] font-semibold leading-snug mb-0.5 line-clamp-2" style={{ color: "#2a1a15" }}>{item.name}</p>
              <p className="text-[10px] mb-2" style={{ color: "#6b5c50" }}>{item.shop}</p>
              <button className="w-full py-1.5 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1"
                style={{ background: "#fce6b7", color: "#513229" }}>
                <RotateCcw size={9} /> Reorder · ₹{item.price}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Shops Near You ───────────────────────────────────────────────────────────

function ShopsNearYou() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Navigation size={17} style={{ color: "#513229" }} />
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "#2a1a15" }}>
          Shops Near You
        </h2>
      </div>
      <p className="text-xs mb-5 flex items-center gap-1" style={{ color: "#6b5c50" }}>
        <MapPin size={11} /> Within 2 km of Koramangala, Bengaluru
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NEARBY_SHOPS.map((shop, idx) => (
          <motion.div
            key={shop.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.07, duration: 0.35 }}
            whileHover={{ y: -3 }}
            className="rounded-2xl overflow-hidden cursor-pointer group"
            style={{ background: "#fefcf5", border: "1px solid rgba(81,50,41,0.1)", boxShadow: "0 2px 12px rgba(81,50,41,0.06)" }}
          >
            {/* Image */}
            <div className="relative overflow-hidden" style={{ height: 140, background: "#f4f1e2" }}>
              <img src={shop.image} alt={shop.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(42,26,21,0.45) 0%, transparent 55%)" }} />

              {/* Tier badge */}
              {shop.tier === "premium" && (
                <div className="absolute top-3 left-3 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                  style={{ background: "#fce6b7", color: "#513229" }}>
                  <Zap size={9} fill="#513229" /> PRO
                </div>
              )}

              {/* Open/Closed */}
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                style={{ background: shop.open ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)", color: shop.open ? "#16a34a" : "#dc2626" }}>
                {shop.open ? "● Open" : "● Closed"}
              </div>

              {/* ETA + distance */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono"
                  style={{ background: "rgba(244,241,226,0.9)", color: "#513229" }}>
                  <Clock size={9} /> {shop.eta}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono"
                  style={{ background: "rgba(244,241,226,0.9)", color: "#513229" }}>
                  <MapPin size={9} /> {shop.distance}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-sm leading-snug mb-0.5 truncate"
                  style={{ fontFamily: "'Playfair Display', serif", color: "#2a1a15" }}>
                  {shop.name}
                </h3>
                <p className="text-[11px] mb-1 truncate" style={{ color: "#6b5c50" }}>
                  by {shop.owner}
                </p>
                <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "#d8ebf9", color: "#2a1a15" }}>
                  {shop.category}
                </span>
              </div>
              <div className="flex flex-col items-end flex-shrink-0 gap-1">
                <div className="flex items-center gap-0.5">
                  <Star size={11} fill="#fce6b7" stroke="#d4a017" strokeWidth={1.5} />
                  <span className="text-xs font-semibold" style={{ color: "#2a1a15" }}>{shop.rating}</span>
                </div>
                <span className="text-[10px]" style={{ color: "#6b5c50" }}>({shop.reviews})</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: "#3d2520" }}>
      <div className="max-w-7xl mx-auto px-6 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 pb-10"
          style={{ borderBottom: "1px solid rgba(244,241,226,0.1)" }}>
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🛍️</span>
              <span className="font-bold text-xl" style={{ fontFamily: "'Playfair Display', serif", color: "#f4f1e2" }}>DigiBazaar</span>
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: "rgba(244,241,226,0.55)" }}>
              Hyperlocal shop discovery & delivery platform. Find what you need, from stores around the corner.
            </p>
            <div className="flex gap-3">
              {[Instagram, Twitter, Facebook].map((Icon, i) => (
                <button key={i} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: "rgba(244,241,226,0.1)", color: "rgba(244,241,226,0.7)" }}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          {/* For Customers */}
          <div>
            <p className="text-xs font-mono font-bold tracking-widest uppercase mb-4" style={{ color: "#fce6b7" }}>For Customers</p>
            {["How It Works", "Browse Categories", "Track Order", "Refer & Earn", "Help Centre"].map(link => (
              <button key={link} className="block text-sm mb-2 text-left transition-opacity hover:opacity-80"
                style={{ color: "rgba(244,241,226,0.6)" }}>
                {link}
              </button>
            ))}
          </div>

          {/* For Businesses */}
          <div>
            <p className="text-xs font-mono font-bold tracking-widest uppercase mb-4" style={{ color: "#fce6b7" }}>For Businesses</p>
            {["List Your Shop", "Shopkeeper Dashboard", "Pricing & Tiers", "Demand Analytics", "Partner with Us"].map(link => (
              <button key={link} className="block text-sm mb-2 text-left transition-opacity hover:opacity-80"
                style={{ color: "rgba(244,241,226,0.6)" }}>
                {link}
              </button>
            ))}
          </div>

          {/* Contact + App */}
          <div>
            <p className="text-xs font-mono font-bold tracking-widest uppercase mb-4" style={{ color: "#fce6b7" }}>Get the App</p>
            <div className="flex flex-col gap-2 mb-6">
              {["App Store", "Google Play"].map(store => (
                <button key={store} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                  style={{ background: "rgba(244,241,226,0.08)", color: "rgba(244,241,226,0.8)", border: "1px solid rgba(244,241,226,0.1)" }}>
                  <span>{store === "App Store" ? "🍎" : "🤖"}</span> {store}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(244,241,226,0.5)" }}>
              <Mail size={12} />
              <span>support@digibazaar.in</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
          <p className="text-[11px] font-mono" style={{ color: "rgba(244,241,226,0.35)" }}>
            © 2025 DigiBazaar Technologies Pvt. Ltd. · Django REST + React · Made in India 🇮🇳
          </p>
          <div className="flex gap-4">
            {["Privacy Policy", "Terms of Use", "Cookie Policy"].map(t => (
              <button key={t} className="text-[11px] transition-opacity hover:opacity-80"
                style={{ color: "rgba(244,241,226,0.4)" }}>{t}</button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [cartCount, setCartCount] = useState(3);

  const handleLogin = (type: string, phone: string) => {
    setIsLoggedIn(true);
    setUserType(type);
    setUserPhone(phone);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserType("");
    setUserPhone("");
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f4f1e2", minHeight: "100vh" }}>
      <TopBar
        isLoggedIn={isLoggedIn}
        userType={userType}
        cartCount={cartCount}
        onLoginClick={() => setShowLogin(true)}
        onCartClick={() => setShowCart(true)}
        onProfileClick={() => setShowProfile(true)}
      />

      <div className="pt-14">
        <HeroCarousel />
        <CategorySection />
        {isLoggedIn ? <OrderAgainSection /> : <BestSellersSection />}
        <ShopsNearYou />
        <Footer />
      </div>

      <AnimatePresence>
        {showLogin && (
          <LoginModal
            onClose={() => setShowLogin(false)}
            onLogin={handleLogin}
          />
        )}
        {showCart && (
          <CartOffCanvas onClose={() => setShowCart(false)} />
        )}
        {showProfile && isLoggedIn && (
          <ProfileOffCanvas
            userType={userType}
            phone={userPhone}
            onClose={() => setShowProfile(false)}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
