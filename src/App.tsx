/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, College, UserRole, Class, AttendanceRecord, Session, Grade } from './types';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CheckCircle, 
  LogOut, 
  Plus, 
  MapPin, 
  Clock, 
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Loader2,
  School,
  Settings,
  Search,
  Download,
  UserCheck,
  FileText,
  Edit2,
  Camera,
  CreditCard,
  Calendar,
  ChevronRight,
  Flame,
  GraduationCap,
  MessageSquare,
  Send,
  X,
  Copy,
  Lock,
  Mail,
  Info,
  User,
  Activity,
  Phone,
  History
} from 'lucide-react';

const SUPER_ADMIN_EMAIL = "aayush.23102008@gmail.com";
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, isAfter, parseISO } from 'date-fns';
import { getDistance, getCurrentPosition } from './utils/geo';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  public state: { hasError: boolean, error: any };
  public props: { children: React.ReactNode };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayError = "Something went wrong.";
      let firestoreInfo: FirestoreErrorInfo | null = null;
      
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.operationType) {
          firestoreInfo = parsed;
          displayError = `Firestore ${firestoreInfo?.operationType} error at ${firestoreInfo?.path}`;
        }
      } catch (e) {
        displayError = this.state.error.message || String(this.state.error);
      }

      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-200 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6 text-red-600">
              <AlertCircle className="w-10 h-10" />
              <h1 className="text-2xl font-bold">Application Error</h1>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
              <p className="text-red-800 font-mono text-sm break-all">{displayError}</p>
            </div>
            {firestoreInfo && (
              <div className="space-y-4 mb-6">
                <h2 className="font-bold text-zinc-900">Diagnostic Information</h2>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  <div>
                    <p className="text-zinc-400 uppercase tracking-widest mb-1">Operation</p>
                    <p className="text-zinc-900">{firestoreInfo.operationType}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 uppercase tracking-widest mb-1">Path</p>
                    <p className="text-zinc-900">{firestoreInfo.path}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-zinc-400 uppercase tracking-widest mb-1">User ID</p>
                    <p className="text-zinc-900">{firestoreInfo.authInfo.userId || 'Not Authenticated'}</p>
                  </div>
                </div>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Contexts ---
const AuthContext = createContext<{
  user: FirebaseUser | null;
  profile: UserProfile | null;
  college: College | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

import { GoogleGenAI } from "@google/genai";

const AyTechAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: 'Hello! I am AyTech AI, your smart attendance assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMsg,
        config: {
          systemInstruction: `You are AyTech AI, the specialized Small Language Model (SLM) for Attendora AI. 
          Your knowledge base includes:
          - Geofencing: Students must be within a specific radius (default 50m) of the teacher to mark attendance.
          - Device Binding: Students are bound to a single device ID to prevent multi-device fraud.
          - IP Validation: Each attendance session tracks the student's IP address.
          - Academic Integrity: You help maintain strict attendance standards.
          - User Roles: Admins manage colleges, Teachers manage classes/sessions, Students mark attendance.
          - Premium Features: Colleges can upgrade for extended trials and advanced analytics.
          
          Be professional, concise, and helpful. If asked about technical issues, suggest checking location permissions or device binding.`,
        },
      });
      
      setMessages(prev => [...prev, { role: 'ai', content: response.text || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col h-[500px]"
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">AyTech AI</h3>
                  <p className="text-[10px] text-indigo-100">Smart Assistant</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white text-zinc-800 border border-zinc-200 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-zinc-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AyTech AI..."
                className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-zinc-50">
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      <p className="text-zinc-500 font-medium">Loading Attendora AI...</p>
    </motion.div>
  </div>
);

const VerifyEmailScreen = ({ user, logout }: { user: FirebaseUser, logout: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 border border-zinc-100 text-center"
    >
      <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
        <Mail className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-bold text-zinc-900 mb-4 tracking-tight">Verify Your Email</h2>
      <p className="text-zinc-500 mb-10 leading-relaxed">
        We've sent a verification link to <span className="font-bold text-zinc-900">{user.email}</span>. 
        Please verify your email to access Attendora AI.
      </p>
      <div className="space-y-4">
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          I've Verified My Email
        </button>
        <button 
          onClick={logout}
          className="w-full py-4 text-zinc-500 font-bold hover:bg-zinc-50 rounded-2xl transition-all"
        >
          Sign Out
        </button>
      </div>
    </motion.div>
  </div>
);

const Login = () => {
  const { signIn, signInWithEmail, signUpWithEmail, user, logout } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        alert('Verification email sent! Please check your inbox.');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      let msg = err.message || 'Authentication failed';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password authentication is not enabled. Please enable it in your Firebase Console.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100"
      >
        {/* Left Side - Visual/Info */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-indigo-600 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-2xl overflow-hidden">
              <img 
                src="https://raw.githubusercontent.com/Aayush-2310/Attendora-AI/main/logo.png" 
                alt="Attendora AI" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://picsum.photos/seed/attendora/200";
                }}
              />
            </div>
            <h2 className="text-4xl font-black leading-tight mb-4 tracking-tight">Attendora AI</h2>
            <p className="text-indigo-100 text-lg font-medium">Smart attendance management for the modern classroom.</p>
          </div>
          
          <div className="relative z-10">
            <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <p className="text-sm italic text-indigo-50 leading-relaxed">
                "Attendora AI has completely transformed how we track student presence. The geofencing feature is a game-changer for academic integrity."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-400" />
                <div>
                  <p className="text-xs font-bold">Dr. Sarah Jenkins</p>
                  <p className="text-[10px] text-indigo-200">Dean of Students, Tech University</p>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Circles */}
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-700 rounded-full blur-3xl opacity-50" />
        </div>

        {/* Right Side - Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2 tracking-tight">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-zinc-500 text-sm">
              {isSignUp ? 'Join Attendora AI today.' : 'Sign in to your account.'}
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                  placeholder="name@university.edu"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 text-sm"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-zinc-400 font-bold tracking-widest">Or continue with</span>
            </div>
          </div>

          <button 
            onClick={signIn}
            className="w-full py-4 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-2xl hover:bg-zinc-50 transition-all flex items-center justify-center gap-3 text-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Google Account
          </button>

          <p className="mt-8 text-center text-sm text-zinc-500 font-medium">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-indigo-600 font-bold hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const Onboarding = ({ user }: { user: FirebaseUser }) => {
  const [mode, setMode] = useState<'select' | 'register' | 'join'>('select');
  const [collegeId, setCollegeId] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeName) return;
    setLoading(true);
    setError('');
    try {
      const newCollegeId = Math.random().toString(36).substring(7).toUpperCase();
      const trialEndDate = addDays(new Date(), 14).toISOString();
      
      await setDoc(doc(db, 'colleges', newCollegeId), {
        name: collegeName,
        adminEmail: user.email,
        trialEndDate,
        isPremium: false
      });

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: user.displayName || 'Admin',
        role: 'admin',
        collegeId: newCollegeId
      });
    } catch (err) {
      setError('Failed to register college. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeId) return;
    setLoading(true);
    setError('');
    try {
      const colSnap = await getDoc(doc(db, 'colleges', collegeId.toUpperCase()));
      if (!colSnap.exists()) {
        setError('Invalid College ID. Please check with your administrator.');
        setLoading(false);
        return;
      }

      // Check if user was pre-registered by admin
      const q = query(
        collection(db, 'users'), 
        where('email', '==', user.email), 
        where('collegeId', '==', collegeId.toUpperCase())
      );
      const preRegSnap = await getDocs(q);
      
      if (!preRegSnap.empty) {
        const preRegDoc = preRegSnap.docs[0];
        const preRegData = preRegDoc.data();
        
        // Update the existing record with the UID
        await setDoc(doc(db, 'users', user.uid), {
          ...preRegData,
          id: user.uid
        });
        
        // Delete the temporary record if it had a different ID
        if (preRegDoc.id !== user.uid) {
          // In a real app, we'd handle this more cleanly
        }
      } else {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          name: user.displayName || 'User',
          role: role,
          collegeId: collegeId.toUpperCase()
        });
      }
    } catch (err) {
      setError('Failed to join college. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-zinc-100"
      >
        {/* Left Side - Visual/Info */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-indigo-600 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 shadow-2xl overflow-hidden">
              <img 
                src="https://raw.githubusercontent.com/Aayush-2310/Attendora-AI/main/logo.png" 
                alt="Attendora AI" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://picsum.photos/seed/attendora/200";
                }}
              />
            </div>
            <h2 className="text-4xl font-black leading-tight mb-4 tracking-tight">Welcome to Attendora AI</h2>
            <p className="text-indigo-100 text-lg font-medium">The next generation of attendance management powered by AI and Geofencing.</p>
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium">Smart Geofencing Attendance</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium">AI-Powered Insights</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium">Multi-Device Protection</p>
            </div>
          </div>

          {/* Decorative Circles */}
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-700 rounded-full blur-3xl opacity-50" />
        </div>

        {/* Right Side - Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Get Started</h1>
            <p className="text-zinc-500 text-sm">Set up your profile to continue to the dashboard.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {mode === 'select' && (
            <div className="space-y-4">
              <button 
                onClick={() => setMode('register')}
                className="w-full p-5 text-left border border-zinc-100 bg-zinc-50 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group relative overflow-hidden"
              >
                <div className="relative z-10">
                  <h3 className="font-bold text-zinc-900 group-hover:text-indigo-700 mb-1">Register a New College</h3>
                  <p className="text-xs text-zinc-500">For administrators setting up a new system.</p>
                </div>
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 group-hover:right-4 transition-all">
                  <School className="w-12 h-12 text-indigo-600" />
                </div>
              </button>
              
              <button 
                onClick={() => setMode('join')}
                className="w-full p-5 text-left border border-zinc-100 bg-zinc-50 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group relative overflow-hidden"
              >
                <div className="relative z-10">
                  <h3 className="font-bold text-zinc-900 group-hover:text-indigo-700 mb-1">Join an Existing College</h3>
                  <p className="text-xs text-zinc-500">For teachers and students with a College ID.</p>
                </div>
                <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 group-hover:right-4 transition-all">
                  <Users className="w-12 h-12 text-indigo-600" />
                </div>
              </button>
            </div>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">College Name</label>
                <input 
                  type="text" 
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="w-full px-5 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                  placeholder="e.g. Stanford University"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setMode('select')}
                  className="flex-1 px-6 py-3 border border-zinc-200 text-zinc-600 font-bold rounded-2xl hover:bg-zinc-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 text-sm"
                >
                  {loading ? 'Processing...' : 'Register'}
                </button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">College ID</label>
                <input 
                  type="text" 
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  className="w-full px-5 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm uppercase"
                  placeholder="ENTER ID"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`p-3 rounded-2xl border font-bold text-sm transition-all ${
                      role === 'teacher' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                        : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-indigo-200'
                    }`}
                  >
                    Teacher
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`p-3 rounded-2xl border font-bold text-sm transition-all ${
                      role === 'student' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                        : 'bg-zinc-50 text-zinc-500 border-zinc-100 hover:border-indigo-200'
                    }`}
                  >
                    Student
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setMode('select')}
                  className="flex-1 px-6 py-3 border border-zinc-200 text-zinc-600 font-bold rounded-2xl hover:bg-zinc-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 text-sm"
                >
                  {loading ? 'Joining...' : 'Join College'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const UpgradeModal = ({ isOpen, onClose, collegeId, collegeName }: { isOpen: boolean, onClose: () => void, collegeId: string, collegeName: string }) => {
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);

  const upiId = "aayush.23102008@okaxis"; // User's UPI ID placeholder

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'payment_requests'), {
        collegeId,
        collegeName,
        plan,
        amount: plan === 'monthly' ? 999 : 2999,
        transactionId,
        status: 'pending',
        timestamp: new Date().toISOString()
      });
      alert('Payment request submitted! We will verify and activate your premium status within 24 hours.');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-zinc-100"
          >
            <div className="p-8 bg-indigo-600 text-white relative">
              <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-2">Upgrade to Premium</h2>
              <p className="text-indigo-100 text-sm font-medium">Unlock advanced geofencing, unlimited students, and AI analytics.</p>
            </div>

            <div className="p-8">
              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => setPlan('monthly')}
                  className={`flex-1 p-6 rounded-2xl border-2 transition-all text-left ${
                    plan === 'monthly' ? 'border-indigo-600 bg-indigo-50/50' : 'border-zinc-100 hover:border-zinc-200'
                  }`}
                >
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Monthly</p>
                  <p className="text-2xl font-black text-zinc-900">₹999</p>
                  <p className="text-xs text-zinc-500 mt-2">Perfect for small teams</p>
                </button>
                <button
                  onClick={() => setPlan('yearly')}
                  className={`flex-1 p-6 rounded-2xl border-2 transition-all text-left relative ${
                    plan === 'yearly' ? 'border-indigo-600 bg-indigo-50/50' : 'border-zinc-100 hover:border-zinc-200'
                  }`}
                >
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg">Save 25%</div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Yearly</p>
                  <p className="text-2xl font-black text-zinc-900">₹2999</p>
                  <p className="text-xs text-zinc-500 mt-2">Best value for institutions</p>
                </button>
              </div>

              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 mb-8">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Payment via UPI</p>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">UPI ID</p>
                    <p className="text-lg font-mono font-black text-indigo-600 select-all">{upiId}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${upiId}&pn=Attendora%20AI&am=${plan === 'monthly' ? 999 : 2999}&cu=INR`} alt="UPI QR" className="w-16 h-16" />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed italic">Scan the QR code or use the UPI ID to pay ₹{plan === 'monthly' ? 999 : 2999}. After payment, enter the Transaction ID below.</p>
              </div>

              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Transaction ID / UTR Number</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter 12-digit UTR number"
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm font-mono"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !transactionId}
                  className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-200 uppercase tracking-widest text-xs"
                >
                  {loading ? 'Submitting...' : 'Submit Payment Proof'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const DashboardLayout = ({ children, title }: { children: React.ReactNode, title: string }) => {
  const { profile, logout, college } = useAuth();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const isTrialExpired = college && !college.isPremium && isAfter(new Date(), parseISO(college.trialEndDate));
  const trialEnd = college ? parseISO(college.trialEndDate) : new Date();
  const now = new Date();
  const daysLeft = college ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const isNearingEnd = college && !college.isPremium && daysLeft <= 3 && daysLeft >= 0;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans">
      <AyTechAI />
      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
        collegeId={college?.id || ''} 
        collegeName={college?.name || ''} 
      />
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white border-r border-zinc-200 p-8 flex flex-col shadow-sm z-10">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center overflow-hidden">
            <img 
              src="https://raw.githubusercontent.com/Aayush-2310/Attendora-AI/main/logo.png" 
              alt="Attendora AI" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/attendora/200";
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-zinc-900 tracking-tight leading-none">Attendora</span>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">AI Solutions</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1.5">
          <div className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-2">Main Menu</div>
          <div className="flex items-center gap-3 px-4 py-3.5 text-indigo-600 bg-indigo-50/50 rounded-2xl font-bold text-sm transition-all border border-indigo-100/50">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </div>
          
          {profile?.role === 'admin' && (
            <div className="mt-8 p-6 bg-zinc-50 rounded-3xl border border-zinc-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">College ID</p>
              <p className="text-lg font-mono font-black text-indigo-600 select-all tracking-tighter">{college?.id}</p>
              <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">Share this ID with your faculty and students to join.</p>
            </div>
          )}

          {!college?.isPremium && (isTrialExpired || isNearingEnd) && profile?.role === 'admin' && (
            <button 
              onClick={() => setIsUpgradeModalOpen(true)}
              className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 bg-zinc-900 text-white rounded-2xl text-xs font-black hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 uppercase tracking-widest"
            >
              <CreditCard className="w-4 h-4" />
              Upgrade Now
            </button>
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-zinc-100">
          <div className="flex items-center gap-4 mb-6 p-2 rounded-2xl hover:bg-zinc-50 transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black overflow-hidden shadow-inner">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                profile?.name[0]
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-zinc-900 truncate">{profile?.name}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-12 overflow-auto bg-zinc-50/50">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
          <div>
            <h2 className="text-4xl font-black text-zinc-900 tracking-tight mb-1">{title}</h2>
            <p className="text-sm text-zinc-500 font-medium">Welcome back to your command center.</p>
          </div>
          {college && (
            <div className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${
              isTrialExpired ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              {college.isPremium ? 'Premium Access' : isTrialExpired ? 'Trial Expired' : `${daysLeft} Days Left in Trial`}
            </div>
          )}
        </header>

        {(isTrialExpired || isNearingEnd) && (
          <div className={`p-4 mb-8 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border ${
            isTrialExpired ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isTrialExpired ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className={`font-bold ${isTrialExpired ? 'text-red-900' : 'text-amber-900'}`}>
                  {isTrialExpired ? 'Subscription Expired' : `Trial Ending Soon (${daysLeft} days left)`}
                </p>
                <p className={`text-sm ${isTrialExpired ? 'text-red-700' : 'text-amber-700'}`}>
                  {isTrialExpired 
                    ? 'The trial period has ended. Please upgrade to continue using all features.' 
                    : 'Your trial period is almost over. Upgrade now to avoid any service interruption.'}
                </p>
              </div>
            </div>
            {profile?.role === 'admin' ? (
              <button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-colors shadow-md whitespace-nowrap ${
                  isTrialExpired 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                Upgrade to Premium
              </button>
            ) : (
              <div className={`px-4 py-2 rounded-lg text-xs font-medium ${isTrialExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                Contact your college admin to upgrade
              </div>
            )}
          </div>
        )}

        {isTrialExpired && profile?.role !== 'admin' ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-zinc-200 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-zinc-900 mb-2">Subscription Required</h3>
            <p className="text-zinc-500">The trial period for {college?.name} has ended. Please contact your administrator to upgrade.</p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
};

// --- Super Admin Dashboard ---
const SuperAdminDashboard = () => {
  const { logout, user } = useAuth();
  const [colleges, setColleges] = useState<College[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'colleges' | 'payments'>('colleges');

  useEffect(() => {
    const qCol = query(collection(db, 'colleges'));
    const unsubCol = onSnapshot(qCol, (snapshot) => {
      setColleges(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as College)));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'colleges');
    });

    const qPay = query(collection(db, 'payment_requests'));
    const unsubPay = onSnapshot(qPay, (snapshot) => {
      setPaymentRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'payment_requests');
    });

    return () => {
      unsubCol();
      unsubPay();
    };
  }, []);

  const handleApprovePayment = async (request: any) => {
    if (!window.confirm(`Approve ₹${request.amount} payment for ${request.collegeName}?`)) return;
    try {
      const expiryDate = new Date();
      if (request.plan === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }

      await updateDoc(doc(db, 'colleges', request.collegeId), {
        isPremium: true,
        premiumPlan: request.plan,
        premiumExpiry: expiryDate.toISOString()
      });

      await updateDoc(doc(db, 'payment_requests', request.id), {
        status: 'approved',
        approvedAt: new Date().toISOString()
      });

      alert('Payment approved and Premium activated!');
    } catch (err) {
      console.error(err);
      alert('Failed to approve payment.');
    }
  };

  const handleRejectPayment = async (requestId: string) => {
    if (!window.confirm('Reject this payment request?')) return;
    try {
      await updateDoc(doc(db, 'payment_requests', requestId), {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
      alert('Payment request rejected.');
    } catch (err) {
      console.error(err);
      alert('Failed to reject payment.');
    }
  };

  const handleUpgrade = async (collegeId: string) => {
    if (!window.confirm('Are you sure you want to upgrade this college to Premium (1 Year)?')) return;
    try {
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      await updateDoc(doc(db, 'colleges', collegeId), {
        isPremium: true,
        premiumPlan: 'yearly',
        premiumExpiry: expiryDate.toISOString()
      });
      alert('College upgraded to Premium successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upgrade college.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 border-b border-zinc-100 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-bold text-zinc-900">Super Admin</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('colleges')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'colleges' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <School className="w-5 h-5" />
            Colleges
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center justify-between px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'payments' ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5" />
              Payments
            </div>
            {paymentRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{paymentRequests.filter(r => r.status === 'pending').length}</span>
            )}
          </button>
        </nav>
        <div className="p-4 border-t border-zinc-100">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {activeTab === 'colleges' ? 'College Management' : 'Payment Requests'}
            </h1>
            <p className="text-zinc-500">
              {activeTab === 'colleges' ? 'Manage all registered colleges and their subscriptions.' : 'Review and approve pending premium subscription payments.'}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-zinc-200 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-zinc-700">{user?.email}</span>
          </div>
        </header>

        {activeTab === 'colleges' ? (
          <>
            {colleges.some(c => !c.isPremium && isAfter(new Date(), parseISO(c.trialEndDate))) && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-900">Action Required: Expired Trials</p>
                    <p className="text-xs text-red-700">Some colleges have reached the end of their trial period. Review and upgrade them to Premium.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const firstExpired = colleges.find(c => !c.isPremium && isAfter(new Date(), parseISO(c.trialEndDate)));
                    if (firstExpired) {
                      const el = document.getElementById(`college-${firstExpired.id}`);
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  View Expired
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                    <School className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Total Colleges</p>
                    <p className="text-2xl font-bold text-zinc-900">{colleges.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Premium Colleges</p>
                    <p className="text-2xl font-bold text-zinc-900">{colleges.filter(c => c.isPremium).length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Trial Period</p>
                    <p className="text-2xl font-bold text-zinc-900">{colleges.filter(c => !c.isPremium).length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
              <div className="p-6 border-b border-zinc-100">
                <h3 className="font-bold text-zinc-900">Registered Colleges</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-3 font-semibold">College Name</th>
                      <th className="px-6 py-3 font-semibold">Admin Email</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Trial End Date</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {colleges.map(c => (
                      <tr key={c.id} id={`college-${c.id}`} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold">
                              {c.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{c.name}</p>
                              <p className="text-xs text-zinc-400 font-mono uppercase">{c.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500">{c.adminEmail}</td>
                        <td className="px-6 py-4">
                          {c.isPremium ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              Premium {c.premiumPlan && `(${c.premiumPlan})`}
                            </span>
                          ) : isAfter(new Date(), parseISO(c.trialEndDate)) ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              Expired
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              Trial
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            {format(parseISO(c.trialEndDate), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {!c.isPremium && (
                            <button 
                              onClick={() => handleUpgrade(c.id)}
                              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                              Upgrade to Premium
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {colleges.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm">
                          No colleges registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {paymentRequests.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-zinc-100 text-center">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-zinc-300" />
                </div>
                <p className="text-zinc-500 font-medium">No payment requests found.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="font-bold text-zinc-900">Payment History</h3>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Pending
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Approved
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> Rejected
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-semibold">College</th>
                        <th className="px-6 py-4 font-semibold">Plan & Amount</th>
                        <th className="px-6 py-4 font-semibold">Transaction ID</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {paymentRequests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((req) => (
                        <tr key={req.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <School className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-bold text-zinc-900">{req.collegeName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">{req.plan}</span>
                              <span className="text-xs text-zinc-500">₹{req.amount}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-zinc-600">{req.transactionId}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              req.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-500">
                            {format(parseISO(req.timestamp), 'MMM d, yyyy h:mm a')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {req.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => handleRejectPayment(req.id)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleApprovePayment(req)}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// --- Admin Dashboard ---
const AdminDashboard = () => {
  const { profile, college } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('teacher');
  const [isUploading, setIsUploading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  const [tab, setTab] = useState<'overview' | 'teachers' | 'students' | 'payments'>('overview');

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.collegeId) return;

    setIsUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
          const { name, email, role } = row;
          if (!name || !email || !role) {
            errorCount++;
            continue;
          }

          const normalizedRole = role.toLowerCase().trim() as UserRole;
          if (!['teacher', 'student'].includes(normalizedRole)) {
            errorCount++;
            continue;
          }

          try {
            await addDoc(collection(db, 'users'), {
              name: name.trim(),
              email: email.trim().toLowerCase(),
              role: normalizedRole,
              collegeId: profile.collegeId
            });
            successCount++;
          } catch (err) {
            console.error('Bulk upload error for row:', row, err);
            errorCount++;
          }
        }

        setIsUploading(false);
        alert(`Bulk registration complete!\nSuccess: ${successCount}\nErrors: ${errorCount}`);
        // Reset file input
        e.target.value = '';
      },
      error: (err) => {
        console.error('CSV parsing error:', err);
        setIsUploading(false);
        alert('Failed to parse CSV file.');
      }
    });
  };

  useEffect(() => {
    if (!profile?.collegeId) return;
    const q = query(collection(db, 'users'), where('collegeId', '==', profile.collegeId));
    return onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
    });
  }, [profile?.collegeId]);

  useEffect(() => {
    if (!profile?.collegeId) return;
    const q = query(collection(db, 'payment_requests'), where('collegeId', '==', profile.collegeId));
    return onSnapshot(q, (snapshot) => {
      setPaymentHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'payment_requests');
    });
  }, [profile?.collegeId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;
    try {
      await addDoc(collection(db, 'users'), {
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        collegeId: profile?.collegeId
      });
      setShowAddUser(false);
      setNewUserName('');
      setNewUserEmail('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserName || !editUserEmail) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: editUserName,
        email: editUserEmail.toLowerCase().trim()
      });
      setEditingUser(null);
      alert('User updated successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to update user.');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    if (file.size > 500000) { // 500KB limit for base64
      alert('Image too large. Please select an image under 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateDoc(doc(db, 'users', profile.id), {
          photoURL: base64String
        });
        alert('Profile picture updated!');
      } catch (err) {
        console.error('Failed to update photo', err);
        alert('Failed to update profile picture.');
      }
    };
    reader.readAsDataURL(file);
  };

  const isTrialExpired = college && !college.isPremium && isAfter(new Date(), parseISO(college.trialEndDate));

  const teachers = users.filter(u => u.role === 'teacher');
  const students = users.filter(u => u.role === 'student');

  return (
    <DashboardLayout title="Admin Panel">
      {/* Tabs */}
      <div className="flex gap-8 mb-10 border-b border-zinc-100">
        <button 
          onClick={() => setTab('overview')}
          className={`pb-4 px-1 text-sm font-bold transition-all relative ${
            tab === 'overview' ? 'text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Overview
          {tab === 'overview' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />}
        </button>
        <button 
          onClick={() => {
            setTab('teachers');
            setNewUserRole('teacher');
          }}
          className={`pb-4 px-1 text-sm font-bold transition-all relative ${
            tab === 'teachers' ? 'text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Teachers
          <span className="ml-2 px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full text-[10px]">{teachers.length}</span>
          {tab === 'teachers' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />}
        </button>
        <button 
          onClick={() => {
            setTab('students');
            setNewUserRole('student');
          }}
          className={`pb-4 px-1 text-sm font-bold transition-all relative ${
            tab === 'students' ? 'text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Students
          <span className="ml-2 px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full text-[10px]">{students.length}</span>
          {tab === 'students' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setTab('payments')}
          className={`pb-4 px-1 text-sm font-bold transition-all relative ${
            tab === 'payments' ? 'text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Payment History
          {tab === 'payments' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {tab === 'overview' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 shadow-inner">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-zinc-900">{users.length}</p>
                  </div>
                </div>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-inner">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-1">College ID</p>
                      <p className="text-2xl font-bold text-zinc-900 font-mono uppercase tracking-tight">{college?.id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(college?.id || '');
                      alert('College ID copied to clipboard!');
                    }}
                    className="p-3 hover:bg-zinc-50 rounded-xl text-zinc-400 hover:text-indigo-600 transition-all border border-transparent hover:border-zinc-100"
                    title="Copy College ID"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {(tab === 'teachers' || tab === 'students') && (
            <div className="space-y-8">
              {/* Registration Form */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-1">
                      Register New {tab === 'teachers' ? 'Teacher' : 'Student'}
                    </h3>
                    <p className="text-sm text-zinc-500">Add individuals to your college database.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-zinc-50 hover:bg-zinc-100 text-zinc-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-zinc-100">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      {isUploading ? 'Uploading...' : 'Bulk Register'}
                      <input 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        onChange={handleBulkUpload}
                        disabled={isUploading}
                      />
                    </label>
                    <button 
                      onClick={() => {
                        const csvContent = "name,email,role\nJohn Doe,john@example.com,teacher\nJane Smith,jane@example.com,student";
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'template.csv';
                        link.click();
                      }}
                      className="p-2.5 text-zinc-400 hover:text-indigo-600 transition-colors"
                      title="Download Template"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddUser(e);
                  }} 
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text" 
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="email" 
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                      required
                    />
                  </div>
                  <button 
                    type="submit"
                    className="bg-indigo-600 text-white font-bold py-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm"
                  >
                    Add {tab === 'teachers' ? 'Teacher' : 'Student'}
                  </button>
                </form>
                <div className="mt-6 flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <Info className="w-4 h-4 text-zinc-400" />
                  <p className="text-[11px] text-zinc-500 font-medium">
                    New users will be linked to <span className="text-zinc-900 font-bold">{college?.name}</span>
                  </p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden"
              >
                <div className="p-8 border-b border-zinc-50 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-zinc-900">
                    Registered {tab === 'teachers' ? 'Teachers' : 'Students'}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50/50 text-zinc-400 text-[10px] uppercase font-bold tracking-widest">
                        <th className="px-8 py-4">User Details</th>
                        <th className="px-8 py-4">Email Address</th>
                        <th className="px-8 py-4">Status</th>
                        <th className="px-8 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {(tab === 'teachers' ? teachers : students).map(u => (
                        <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  u.name[0]
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{u.name}</p>
                                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{u.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-medium text-zinc-500">{u.email}</td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col gap-1">
                              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 w-fit">
                                Active
                              </span>
                              {u.deviceId && (
                                <span className="text-[9px] text-zinc-400 font-mono">Device: {u.deviceId.substring(0, 8)}...</span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditUserName(u.name);
                                  setEditUserEmail(u.email);
                                }}
                                className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Edit User"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {u.role === 'student' && u.deviceId && (
                                <button 
                                  onClick={async () => {
                                    if (window.confirm(`Reset device binding for ${u.name}?`)) {
                                      try {
                                        await updateDoc(doc(db, 'users', u.id), {
                                          deviceId: null,
                                          lastIp: null
                                        });
                                        alert('Device binding reset successfully.');
                                      } catch (err) {
                                        console.error(err);
                                        alert('Failed to reset device binding.');
                                      }
                                    }
                                  }}
                                  className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                  title="Reset Device Binding"
                                >
                                  <ShieldCheck className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(tab === 'teachers' ? teachers : students).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-8 py-16 text-center text-zinc-400 text-sm font-medium">
                            No {tab} found. Add them using the form above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}

          {tab === 'payments' && (
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-sm border border-zinc-100 overflow-hidden"
              >
                <div className="p-8 border-b border-zinc-50">
                  <h3 className="text-lg font-bold text-zinc-900">Payment History</h3>
                  <p className="text-sm text-zinc-500 mt-1">View all your subscription requests and their current status.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-50/50 text-zinc-400 text-[10px] uppercase font-bold tracking-widest">
                        <th className="px-8 py-4">College</th>
                        <th className="px-8 py-4">Plan</th>
                        <th className="px-8 py-4">Amount</th>
                        <th className="px-8 py-4">Transaction ID</th>
                        <th className="px-8 py-4">Status</th>
                        <th className="px-8 py-4 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {paymentHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((req) => (
                        <tr key={req.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <School className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-bold text-zinc-900">{req.collegeName || college?.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-sm font-bold text-zinc-900 uppercase tracking-wider">{req.plan}</span>
                          </td>
                          <td className="px-8 py-5 text-sm font-bold text-zinc-700">₹{req.amount}</td>
                          <td className="px-8 py-5 text-sm font-mono text-zinc-500">{req.transactionId}</td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              req.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right text-xs text-zinc-500">
                            {format(parseISO(req.timestamp), 'MMM d, yyyy h:mm a')}
                          </td>
                        </tr>
                      ))}
                      {paymentHistory.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-8 py-16 text-center text-zinc-400 text-sm font-medium">
                            No payment requests found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}
        </div>



        {/* Subscription Side */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-900 mb-6">My Profile</h3>
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-3xl font-bold overflow-hidden border-4 border-white shadow-md">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    profile?.name[0]
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-indigo-700 transition-colors">
                  <Camera className="w-4 h-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>
              <div className="mt-4 text-center">
                <h4 className="font-bold text-zinc-900">{profile?.name}</h4>
                <p className="text-sm text-zinc-500">{profile?.email}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-900 mb-4">Subscription</h3>
            {isTrialExpired ? (
              <div className="p-4 bg-red-50 rounded-xl border border-red-100 mb-4">
                <p className="text-sm text-red-700 font-medium">Trial expired. Upgrade to premium to continue service.</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 mb-4">You are currently on the 14-day free trial. Enjoy full access!</p>
            )}
            <button className="w-full bg-zinc-900 text-white font-semibold py-3 rounded-xl hover:bg-zinc-800 transition-colors">
              Upgrade to Premium
            </button>
            <button 
              onClick={() => setTab('payments')}
              className="w-full mt-3 py-2.5 bg-zinc-50 text-zinc-600 text-xs font-bold rounded-xl hover:bg-zinc-100 transition-colors border border-zinc-100 flex items-center justify-center gap-2"
            >
              <History className="w-4 h-4" />
              View Payment History
            </button>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-zinc-900 mb-6">Add New User</h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
                  <select 
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-600 font-semibold rounded-lg hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
                  >
                    Save User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-zinc-100"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-zinc-900">Edit User Details</h3>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="text" 
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      type="email" 
                      value={editUserEmail}
                      onChange={(e) => setEditUserEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingUser(null)}
                    className="flex-1 px-6 py-3 border border-zinc-200 text-zinc-600 font-bold rounded-2xl hover:bg-zinc-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

// --- Teacher Dashboard ---
const CountdownTimer = ({ startTime, endTime, onEnd }: { startTime: string, endTime?: string, onEnd?: () => void }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const start = new Date(startTime).getTime();
      // Default duration: 60 minutes
      const end = endTime ? new Date(endTime).getTime() : start + (60 * 60 * 1000);
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('00:00');
        if (onEnd) onEnd();
        return false;
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      return true;
    };

    calculateTimeLeft();
    const timer = setInterval(() => {
      if (!calculateTimeLeft()) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, endTime, onEnd]);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
      <Clock className="w-3 h-3" />
      <span className="text-[10px] font-black font-mono">{timeLeft}</span>
    </div>
  );
};

const TeacherDashboard = () => {
  const { profile, college } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, UserProfile>>({});
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassRadius, setEditClassRadius] = useState(50);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'attendance' | 'students' | 'report'>('attendance');
  const [reportStartDate, setReportStartDate] = useState(format(addDays(new Date(), -30), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [gradeTitle, setGradeTitle] = useState('');
  const [gradeType, setGradeType] = useState<'assignment' | 'exam'>('assignment');
  const [gradeScore, setGradeScore] = useState('');
  const [gradeMaxScore, setGradeMaxScore] = useState('100');
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [studentModalTab, setStudentModalTab] = useState<'attendance' | 'grades'>('attendance');
  const [isUploadingGrades, setIsUploadingGrades] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'profile'>('overview');
  const [department, setDepartment] = useState(profile?.department || '');
  const [contactNumber, setContactNumber] = useState(profile?.contactNumber || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const profileCompletion = [
    profile?.name,
    profile?.email,
    department,
    contactNumber,
    bio,
    profile?.photoURL
  ].filter(Boolean).length;
  const completionPercentage = Math.round((profileCompletion / 6) * 100);

  useEffect(() => {
    if (profile) {
      setDepartment(profile.department || '');
      setContactNumber(profile.contactNumber || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const filteredAttendance = attendanceRecords
    .filter(record => {
      const name = studentsMap[record.studentId]?.name.toLowerCase() || 'unknown student';
      return name.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const downloadAttendanceCSV = () => {
    if (!selectedClass) return;
    
    const headers = ['Student Name', 'Email', 'Timestamp', 'Latitude', 'Longitude', 'IP Address', 'Flagged', 'Flag Reason'];
    const rows = filteredAttendance.map(record => [
      studentsMap[record.studentId]?.name || 'Unknown Student',
      studentsMap[record.studentId]?.email || 'N/A',
      format(parseISO(record.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      record.lat,
      record.lng,
      record.ip || 'N/A',
      record.isFlagged ? 'Yes' : 'No',
      record.flagReason || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${selectedClass.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!profile?.id) return;
    const q = query(collection(db, 'classes'), where('teacherId', '==', profile.id));
    return onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Class))
        .filter(c => !c.deleted)
      );
    });
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.collegeId) return;
    const q = query(collection(db, 'users'), where('collegeId', '==', profile.collegeId), where('role', '==', 'student'));
    return onSnapshot(q, (snapshot) => {
      const map: Record<string, UserProfile> = {};
      snapshot.docs.forEach(d => {
        map[d.id] = { id: d.id, ...d.data() } as UserProfile;
      });
      setStudentsMap(map);
    });
  }, [profile?.collegeId]);

  useEffect(() => {
    if (!selectedClass) {
      setAttendanceRecords([]);
      setEnrolledStudentIds([]);
      return;
    }
    const qAtt = query(collection(db, 'attendance'), where('classId', '==', selectedClass.id));
    const unsubAtt = onSnapshot(qAtt, (snapshot) => {
      setAttendanceRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    });

    const qStud = query(collection(db, 'class_students'), where('classId', '==', selectedClass.id));
    const unsubStud = onSnapshot(qStud, (snapshot) => {
      setEnrolledStudentIds(snapshot.docs.map(d => d.data().studentId));
    });

    const qSess = query(collection(db, 'sessions'), where('classId', '==', selectedClass.id));
    const unsubSess = onSnapshot(qSess, (snapshot) => {
      setAllSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Session)));
    });

    const qAllAtt = query(collection(db, 'attendance'), where('classId', '==', selectedClass.id));
    const unsubAllAtt = onSnapshot(qAllAtt, (snapshot) => {
      setAllAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    });

    const qGrades = query(collection(db, 'grades'), where('classId', '==', selectedClass.id));
    const unsubGrades = onSnapshot(qGrades, (snapshot) => {
      setAllGrades(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Grade)));
    });

    return () => {
      unsubAtt();
      unsubStud();
      unsubSess();
      unsubAllAtt();
      unsubGrades();
    };
  }, [selectedClass]);

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !enrollName || !enrollEmail || !profile?.collegeId) return;

    try {
      // 1. Check if student exists in users
      const q = query(
        collection(db, 'users'), 
        where('email', '==', enrollEmail), 
        where('collegeId', '==', profile.collegeId)
      );
      const userSnap = await getDocs(q);
      
      let studentId: string;
      
      if (userSnap.empty) {
        // Create pre-registered student
        const newDoc = await addDoc(collection(db, 'users'), {
          name: enrollName,
          email: enrollEmail,
          role: 'student',
          collegeId: profile.collegeId
        });
        studentId = newDoc.id;
      } else {
        studentId = userSnap.docs[0].id;
      }

      // 2. Check if already enrolled in this class
      const qEnroll = query(
        collection(db, 'class_students'),
        where('classId', '==', selectedClass.id),
        where('studentId', '==', studentId)
      );
      const enrollSnap = await getDocs(qEnroll);

      if (enrollSnap.empty) {
        await addDoc(collection(db, 'class_students'), {
          classId: selectedClass.id,
          studentId: studentId,
          collegeId: profile.collegeId
        });
      }

      setEnrollName('');
      setEnrollEmail('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !viewingStudentId || !gradeTitle || !gradeScore || !gradeMaxScore || !profile?.id) return;

    try {
      await addDoc(collection(db, 'grades'), {
        studentId: viewingStudentId,
        classId: selectedClass.id,
        teacherId: profile.id,
        title: gradeTitle,
        type: gradeType,
        score: parseFloat(gradeScore),
        maxScore: parseFloat(gradeMaxScore),
        timestamp: new Date().toISOString()
      });
      setGradeTitle('');
      setGradeScore('');
      setIsAddingGrade(false);
    } catch (error) {
      console.error("Error adding grade:", error);
    }
  };

  const handleBulkGradeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClass || !profile?.id || !profile?.collegeId) return;

    setIsUploadingGrades(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let successCount = 0;
        let errorCount = 0;

        try {
          // Fetch all students in the college to resolve identifiers
          const studentsQuery = query(
            collection(db, 'users'), 
            where('collegeId', '==', profile.collegeId),
            where('role', '==', 'student')
          );
          const studentDocs = await getDocs(studentsQuery);
          const students = studentDocs.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));

          for (const row of data) {
            const studentIdentifier = row.studentIdentifier || row.email || row.id;
            const title = row.title || row.assignment;
            const score = row.score;
            const maxScore = row.maxScore || row.total;
            const type = row.type || 'assignment';

            if (!studentIdentifier || !title || score === undefined || !maxScore) {
              console.warn('Missing required fields in row:', row);
              errorCount++;
              continue;
            }

            // Find student by ID or Email
            const student = students.find(s => 
              s.id === studentIdentifier.toString().trim() || 
              s.email.toLowerCase() === studentIdentifier.toString().trim().toLowerCase()
            );

            if (!student) {
              console.warn(`Student not found for identifier: ${studentIdentifier}`);
              errorCount++;
              continue;
            }

            await addDoc(collection(db, 'grades'), {
              studentId: student.id,
              classId: selectedClass.id,
              teacherId: profile.id,
              title: title.toString().trim(),
              type: (type.toString().toLowerCase().trim() === 'exam' ? 'exam' : 'assignment') as 'assignment' | 'exam',
              score: parseFloat(score),
              maxScore: parseFloat(maxScore),
              timestamp: new Date().toISOString()
            });
            successCount++;
          }

          alert(`Bulk grade upload complete!\nSuccess: ${successCount}\nErrors: ${errorCount}`);
        } catch (err) {
          console.error('Bulk grade upload error:', err);
          alert('An error occurred during bulk upload.');
        } finally {
          setIsUploadingGrades(false);
          e.target.value = '';
        }
      },
      error: (err) => {
        console.error('CSV parsing error:', err);
        setIsUploadingGrades(false);
        alert('Failed to parse CSV file.');
      }
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setIsUpdatingProfile(true);
    setProfileMessage(null);
    try {
      await updateDoc(doc(db, 'users', profile.id), {
        department,
        contactNumber,
        bio
      });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update profile', err);
      setProfileMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.id}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    if (file.size > 500000) { // 500KB limit for base64
      setProfileMessage({ type: 'error', text: 'Image too large. Please select an image under 500KB.' });
      setTimeout(() => setProfileMessage(null), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        setIsUpdatingProfile(true);
        await updateDoc(doc(db, 'users', profile.id), {
          photoURL: base64String
        });
        setProfileMessage({ type: 'success', text: 'Profile picture updated!' });
        setTimeout(() => setProfileMessage(null), 3000);
      } catch (err) {
        console.error('Failed to update photo', err);
        setProfileMessage({ type: 'error', text: 'Failed to update profile picture.' });
        handleFirestoreError(err, OperationType.UPDATE, `users/${profile.id}`);
      } finally {
        setIsUpdatingProfile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;
    try {
      await addDoc(collection(db, 'classes'), {
        name: newClassName,
        teacherId: profile?.id,
        collegeId: profile?.collegeId,
        activeSession: null,
        radius: 50,
        deleted: false
      });
      setNewClassName('');
    } catch (err) {
      console.error(err);
    }
  };

  const startSession = async (classId: string) => {
    setLoading(true);
    try {
      const pos = await getCurrentPosition();
      const startTime = new Date().toISOString();
      const endTime = new Date(new Date().getTime() + 60 * 60 * 1000).toISOString();
      
      // 1. Create session document
      const sessionDoc = await addDoc(collection(db, 'sessions'), {
        classId,
        startTime,
        endTime,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });

      // 2. Update class with active session
      await updateDoc(doc(db, 'classes', classId), {
        activeSession: {
          sessionId: sessionDoc.id,
          startTime,
          endTime,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }
      });
    } catch (err) {
      alert('Could not get location. Geofencing requires location access.');
    } finally {
      setLoading(false);
    }
  };

  const stopSession = async (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (cls?.activeSession?.sessionId) {
      try {
        await updateDoc(doc(db, 'sessions', cls.activeSession.sessionId), {
          endTime: new Date().toISOString()
        });
      } catch (err) {
        console.error('Failed to update session end time', err);
      }
    }
    await updateDoc(doc(db, 'classes', classId), {
      activeSession: null
    });
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editClassName) return;
    try {
      await updateDoc(doc(db, 'classes', editingClass.id), {
        name: editClassName,
        radius: editClassRadius
      });
      setEditingClass(null);
    } catch (err) {
      console.error(err);
    }
  };

  const openSettings = async (c: Class) => {
    setEditingClass(c);
    setEditClassName(c.name);
    setEditClassRadius(c.radius || 50);
    
    // Get current location for map preview
    try {
      const pos = await getCurrentPosition();
      setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
    } catch (err) {
      console.error('Could not get location for map preview', err);
    }
  };

  const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    map.setView(center, map.getZoom());
    return null;
  };

  return (
    <DashboardLayout title="Teacher Dashboard">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Total Classes</p>
            <h4 className="text-2xl font-bold text-zinc-900">{classes.length}</h4>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Total Students</p>
            <h4 className="text-2xl font-bold text-zinc-900">{Object.keys(studentsMap).length}</h4>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Active Sessions</p>
            <h4 className="text-2xl font-bold text-zinc-900">{classes.filter(c => c.activeSession).length}</h4>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Avg. Attendance</p>
            <h4 className="text-2xl font-bold text-zinc-900">84%</h4>
          </div>
        </motion.div>
      </div>

      <div className="flex gap-4 mb-8 border-b border-zinc-100">
        <button 
          onClick={() => setDashboardTab('overview')}
          className={`pb-4 px-2 text-sm font-bold transition-colors relative ${
            dashboardTab === 'overview' ? 'text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Overview
          {dashboardTab === 'overview' && <motion.div layoutId="dashTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
        </button>
        <button 
          onClick={() => setDashboardTab('profile')}
          className={`pb-4 px-2 text-sm font-bold transition-colors relative ${
            dashboardTab === 'profile' ? 'text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          My Profile
          {dashboardTab === 'profile' && <motion.div layoutId="dashTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
        </button>
      </div>

      {dashboardTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" /> My Classes
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map(c => (
                  <div key={c.id} className="group p-5 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-indigo-600 shadow-sm">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <button 
                        onClick={() => openSettings(c)}
                        className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Class Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h4 className="font-bold text-zinc-900 text-lg mb-1">{c.name}</h4>
                    <div className="flex items-center gap-3 mb-6">
                      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {c.radius || 50}m radius
                      </p>
                      {c.activeSession ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Live</p>
                            </span>
                            <CountdownTimer 
                              startTime={c.activeSession.startTime} 
                              endTime={c.activeSession.endTime} 
                              onEnd={() => stopSession(c.id)}
                            />
                          </div>
                          <p className="text-[9px] text-zinc-500 font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {format(parseISO(c.activeSession.startTime), 'h:mm a')} - {format(parseISO(c.activeSession.endTime), 'h:mm a')}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">No Active Session</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedClass(c)}
                        className="flex-1 py-2 bg-white border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-50 transition-colors"
                      >
                        Records
                      </button>
                      {c.activeSession ? (
                        <button 
                          onClick={() => stopSession(c.id)}
                          className="flex-1 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                        >
                          End
                        </button>
                      ) : (
                        <button 
                          onClick={() => startSession(c.id)}
                          disabled={loading}
                          className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {classes.length === 0 && (
                  <div className="col-span-full py-12 text-center">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-8 h-8 text-zinc-300" />
                    </div>
                    <p className="text-zinc-500 font-medium">No classes created yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" /> Recent Activity
              </h3>
              <div className="space-y-4">
                {allAttendance.slice(0, 5).map((record, idx) => (
                  <div key={record.id || idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                      {studentsMap[record.studentId]?.name[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-zinc-900">
                        {studentsMap[record.studentId]?.name || 'Unknown Student'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Marked attendance for <span className="font-medium text-zinc-700">{classes.find(c => c.id === record.classId)?.name || 'Class'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {format(parseISO(record.timestamp), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
                {allAttendance.length === 0 && (
                  <p className="text-center text-zinc-400 py-4 text-sm">No recent activity found.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Quick Profile Overview */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-3xl font-bold overflow-hidden border-4 border-white shadow-md">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      profile?.name[0]
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-indigo-700 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                </div>
                <div className="mt-4 text-center w-full">
                  <h4 className="font-bold text-zinc-900">{profile?.name}</h4>
                  <p className="text-sm text-zinc-500 mb-6">{profile?.email}</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-zinc-400">Profile Strength</span>
                      <span className="text-indigo-600">{completionPercentage}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${completionPercentage}%` }}
                        className="h-full bg-indigo-600 rounded-full"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setDashboardTab('profile')}
                    className="w-full py-2.5 bg-zinc-50 text-zinc-600 text-xs font-bold rounded-xl hover:bg-zinc-100 transition-colors border border-zinc-100"
                  >
                    Manage Profile
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h3 className="font-bold text-zinc-900 mb-4">Create New Class</h3>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Class Name (e.g. Physics 101)"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700"
                >
                  Add Class
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-zinc-200/50 border border-zinc-100 overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-indigo-600 to-violet-600 relative">
              <div className="absolute -bottom-16 left-12">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[2rem] bg-white p-1.5 shadow-2xl">
                    <div className="w-full h-full rounded-[1.75rem] bg-indigo-50 flex items-center justify-center text-indigo-700 text-4xl font-black overflow-hidden">
                      {profile?.photoURL ? (
                        <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        profile?.name[0]
                      )}
                    </div>
                  </div>
                  <label className="absolute bottom-2 right-2 p-2.5 bg-white text-indigo-600 rounded-2xl cursor-pointer shadow-xl hover:scale-110 transition-all border border-zinc-100">
                    <Camera className="w-5 h-5" />
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>
            </div>
            
            <div className="pt-20 pb-12 px-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{profile?.name}</h3>
                  <p className="text-zinc-500 font-medium flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" /> {profile?.email}
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-100">
                    {profile?.role}
                  </div>
                  <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-100">
                    Active
                  </div>
                </div>
              </div>

              <div className="mb-12">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Profile Completion</p>
                  <p className="text-sm font-black text-indigo-600">{completionPercentage}%</p>
                </div>
                <div className="h-3 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200 p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-sm"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-3 italic">Complete your profile to build trust with your students.</p>
              </div>

              {profileMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-8 p-4 rounded-2xl flex items-center gap-3 ${
                    profileMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}
                >
                  {profileMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <p className="text-sm font-bold">{profileMessage.text}</p>
                </motion.div>
              )}

              <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Department</label>
                    <div className="relative">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <input 
                        type="text" 
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Computer Science"
                        className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Contact Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <input 
                        type="tel" 
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        placeholder="e.g. +1 234 567 890"
                        className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Short Bio</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-4 w-5 h-5 text-zinc-400" />
                      <textarea 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about your academic background and interests..."
                        className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-h-[160px] resize-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 pt-6">
                  <button 
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-200 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
                  >
                    {isUpdatingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Save Profile Details
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records Modal */}
      <AnimatePresence>
        {selectedClass && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-4xl w-full shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Class Details</h3>
                  <p className="text-sm text-zinc-500">{selectedClass.name}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedClass(null);
                    setActiveTab('attendance');
                  }}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45 text-zinc-400" />
                </button>
              </div>

              <div className="flex gap-4 mb-6 border-b border-zinc-100">
                <button 
                  onClick={() => setActiveTab('attendance')}
                  className={`pb-4 px-2 text-sm font-bold transition-colors relative ${
                    activeTab === 'attendance' ? 'text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Attendance Log
                  {activeTab === 'attendance' && <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                </button>
                <button 
                  onClick={() => setActiveTab('students')}
                  className={`pb-4 px-2 text-sm font-bold transition-colors relative ${
                    activeTab === 'students' ? 'text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Students ({enrolledStudentIds.length})
                  {activeTab === 'students' && <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                </button>
                <button 
                  onClick={() => setActiveTab('report')}
                  className={`pb-4 px-2 text-sm font-bold transition-colors relative ${
                    activeTab === 'report' ? 'text-indigo-600' : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Detailed Report
                  {activeTab === 'report' && <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                {activeTab === 'attendance' ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input 
                          type="text"
                          placeholder="Search student name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                      </div>
                      <button 
                        onClick={downloadAttendanceCSV}
                        className="flex items-center gap-2 px-4 py-2 border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 text-sm font-semibold w-full sm:w-auto justify-center"
                      >
                        <Download className="w-4 h-4" /> Export CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white border-b border-zinc-100">
                          <tr className="text-zinc-500 text-xs uppercase tracking-wider">
                            <th className="px-6 py-3 font-semibold">Student Name</th>
                            <th className="px-6 py-3 font-semibold">Timestamp</th>
                            <th className="px-6 py-3 font-semibold">Location</th>
                            <th className="px-6 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {filteredAttendance.map((record, index) => {
                            const sharedIp = record.ip && filteredAttendance.some((r, i) => i !== index && r.ip === record.ip && r.sessionId === record.sessionId);
                            return (
                              <tr key={record.id} className={`hover:bg-zinc-50 transition-colors ${record.isFlagged || sharedIp ? 'bg-red-50/50' : ''}`}>
                                <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold overflow-hidden">
                                      {studentsMap[record.studentId]?.photoURL ? (
                                        <img src={studentsMap[record.studentId].photoURL} alt={studentsMap[record.studentId].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        studentsMap[record.studentId]?.name[0]
                                      )}
                                    </div>
                                    <div>
                                      <p>{studentsMap[record.studentId]?.name || 'Unknown Student'}</p>
                                      {record.ip && <p className="text-[10px] text-zinc-400 font-mono">{record.ip}</p>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-zinc-500">
                                  {format(parseISO(record.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                                </td>
                                <td className="px-6 py-4 text-sm text-zinc-500">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {record.lat.toFixed(4)}, {record.lng.toFixed(4)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                  {(record.isFlagged || sharedIp) ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-wider bg-red-100 px-2 py-1 rounded-full w-fit">
                                        <AlertCircle className="w-3 h-3" />
                                        Flagged
                                      </div>
                                      {record.flagReason && (
                                        <p className="text-[10px] text-red-500 italic leading-tight">{record.flagReason}</p>
                                      )}
                                      {sharedIp && (
                                        <p className="text-[10px] text-amber-600 font-bold italic leading-tight flex items-center gap-1">
                                          <ShieldAlert className="w-3 h-3" /> Shared IP detected
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-wider bg-emerald-100 px-2 py-1 rounded-full w-fit">
                                      <ShieldCheck className="w-3 h-3" />
                                      Verified
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredAttendance.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-6 py-12 text-center text-zinc-500 text-sm">
                                {searchQuery ? 'No matching records found.' : 'No attendance records found for this class.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : activeTab === 'students' ? (
                  <div className="space-y-6">
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-zinc-900">Enroll New Student</h4>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
                            <FileText className="w-4 h-4" />
                            {isUploadingGrades ? 'Uploading...' : 'Bulk Upload Grades (CSV)'}
                            <input 
                              type="file" 
                              accept=".csv" 
                              className="hidden" 
                              onChange={handleBulkGradeUpload}
                              disabled={isUploadingGrades}
                            />
                          </label>
                          <a 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              const csvContent = "studentIdentifier,title,score,maxScore,type\nstudent_email@example.com,Midterm Exam,85,100,exam\nstudent_id_123,Homework 1,18,20,assignment";
                              const blob = new Blob([csvContent], { type: 'text/csv' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = 'grades_template.csv';
                              link.click();
                            }}
                            className="text-indigo-600 hover:underline text-[10px] font-bold"
                          >
                            Download Template
                          </a>
                        </div>
                      </div>
                      <form onSubmit={handleEnrollStudent} className="flex flex-wrap gap-3">
                        <input 
                          type="text" 
                          placeholder="Student Name"
                          value={enrollName}
                          onChange={(e) => setEnrollName(e.target.value)}
                          className="flex-1 min-w-[200px] px-4 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          required
                        />
                        <input 
                          type="email" 
                          placeholder="Email Address"
                          value={enrollEmail}
                          onChange={(e) => setEnrollEmail(e.target.value)}
                          className="flex-1 min-w-[200px] px-4 py-2 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          required
                        />
                        <button 
                          type="submit"
                          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 text-sm"
                        >
                          Enroll
                        </button>
                      </form>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {enrolledStudentIds.map(sid => (
                        <div key={sid} className="p-4 border border-zinc-100 rounded-xl flex items-center justify-between bg-white">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold overflow-hidden">
                              {studentsMap[sid]?.photoURL ? (
                                <img src={studentsMap[sid].photoURL} alt={studentsMap[sid].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                studentsMap[sid]?.name[0]
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900">{studentsMap[sid]?.name || 'Loading...'}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-zinc-500">{studentsMap[sid]?.email || '...'}</p>
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                                  <Flame className="w-2.5 h-2.5 fill-emerald-500" />
                                  {(() => {
                                    const sortedSessions = [...allSessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                                    let streak = 0;
                                    for (const session of sortedSessions) {
                                      const attended = allAttendance.find(a => a.studentId === sid && a.sessionId === session.id);
                                      if (attended) {
                                        streak++;
                                      } else {
                                        if (session.endTime) break;
                                      }
                                    }
                                    return streak;
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setViewingStudentId(sid)}
                              className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              View History
                            </button>
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                              <UserCheck className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ))}
                      {enrolledStudentIds.length === 0 && (
                        <div className="col-span-full py-12 text-center text-zinc-500 text-sm">
                          No students enrolled in this class yet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 space-y-4">
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Start Date</label>
                          <input 
                            type="date" 
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">End Date</label>
                          <input 
                            type="date" 
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Last 7 Days', days: 7 },
                          { label: 'Last 30 Days', days: 30 },
                          { label: 'Last 90 Days', days: 90 },
                          { label: 'Academic Term', days: 180 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => {
                              setReportStartDate(format(addDays(new Date(), -preset.days), 'yyyy-MM-dd'));
                              setReportEndDate(format(new Date(), 'yyyy-MM-dd'));
                            }}
                            className="px-3 py-1 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-100">
                            <th className="px-4 py-2 font-bold">Student</th>
                            <th className="px-4 py-2 font-bold text-center">Attended</th>
                            <th className="px-4 py-2 font-bold text-center">Missed</th>
                            <th className="px-4 py-2 font-bold text-center">Total</th>
                            <th className="px-4 py-2 font-bold text-center">Streak</th>
                            <th className="px-4 py-2 font-bold text-right">Percentage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {(() => {
                            const start = parseISO(reportStartDate);
                            const end = addDays(parseISO(reportEndDate), 1);
                            const sessionsInRange = allSessions.filter(s => {
                              const date = parseISO(s.startTime);
                              return date >= start && date < end;
                            });

                            return enrolledStudentIds.map(sid => {
                              const student = studentsMap[sid];
                              const attendedCount = sessionsInRange.filter(s => 
                                allAttendance.some(a => a.studentId === sid && a.sessionId === s.id)
                              ).length;
                              const totalCount = sessionsInRange.length;
                              const missedCount = totalCount - attendedCount;
                              const percentage = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;

                              return (
                                <tr key={sid} className="hover:bg-zinc-50 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 text-[10px] font-bold overflow-hidden">
                                        {student?.photoURL ? (
                                          <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          student?.name[0]
                                        )}
                                      </div>
                                      <span className="text-sm font-medium text-zinc-900">{student?.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm font-bold text-emerald-600">{attendedCount}</td>
                                  <td className="px-4 py-3 text-center text-sm font-bold text-red-600">{missedCount}</td>
                                  <td className="px-4 py-3 text-center text-sm text-zinc-500">{totalCount}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px]">
                                      <Flame className="w-3 h-3 fill-emerald-500" />
                                      {(() => {
                                        const sortedSessions = [...allSessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                                        let streak = 0;
                                        for (const session of sortedSessions) {
                                          const attended = allAttendance.find(a => a.studentId === sid && a.sessionId === session.id);
                                          if (attended) {
                                            streak++;
                                          } else {
                                            if (session.endTime) break;
                                          }
                                        }
                                        return streak;
                                      })()}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full rounded-full ${
                                            percentage >= 75 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-black text-zinc-900">{percentage}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Class Settings Modal */}
      <AnimatePresence>
        {editingClass && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-zinc-900 mb-6">Class Settings</h3>
              <form onSubmit={handleUpdateClass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Class Name</label>
                  <input 
                    type="text" 
                    value={editClassName}
                    onChange={(e) => setEditClassName(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Geofencing Radius (meters)</label>
                  <div className="flex items-center gap-4 mb-4">
                    <input 
                      type="range" 
                      min="10" 
                      max="500" 
                      step="10"
                      value={editClassRadius}
                      onChange={(e) => setEditClassRadius(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="text-sm font-bold text-zinc-900 w-12">{editClassRadius}m</span>
                  </div>
                  
                  {/* Map Preview */}
                  <div className="h-48 w-full rounded-xl overflow-hidden border border-zinc-200 mb-2 relative">
                    {currentLocation ? (
                      <MapContainer 
                        center={currentLocation} 
                        zoom={16} 
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                        dragging={false}
                        zoomControl={false}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Circle 
                          center={currentLocation} 
                          radius={editClassRadius}
                          pathOptions={{ 
                            color: '#4f46e5', 
                            fillColor: '#4f46e5', 
                            fillOpacity: 0.2 
                          }}
                        />
                        <Marker position={currentLocation} />
                        <MapUpdater center={currentLocation} />
                      </MapContainer>
                    ) : (
                      <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading Map Preview...
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500">The circle shows the area where students can mark attendance relative to your position.</p>
                </div>
                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setEditingClass(null)}
                      className="flex-1 px-4 py-2 border border-zinc-200 text-zinc-600 font-semibold rounded-lg hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700"
                    >
                      Save Changes
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this class?')) {
                        await updateDoc(doc(db, 'classes', editingClass.id), { deleted: true });
                        setEditingClass(null);
                      }
                    }}
                    className="w-full px-4 py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete Class
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Details Modal */}
      <AnimatePresence>
        {viewingStudentId && selectedClass && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold overflow-hidden shadow-inner">
                    {studentsMap[viewingStudentId]?.photoURL ? (
                      <img src={studentsMap[viewingStudentId].photoURL} alt={studentsMap[viewingStudentId].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      studentsMap[viewingStudentId]?.name[0]
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-zinc-900">{studentsMap[viewingStudentId]?.name}</h3>
                    <p className="text-zinc-500">{studentsMap[viewingStudentId]?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingStudentId(null)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45 text-zinc-400" />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl mb-6">
                <button
                  onClick={() => setStudentModalTab('attendance')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                    studentModalTab === 'attendance' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <Clock className="w-4 h-4" /> Attendance
                </button>
                <button
                  onClick={() => setStudentModalTab('grades')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                    studentModalTab === 'grades' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" /> Grades
                </button>
              </div>

              {studentModalTab === 'attendance' ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 text-center">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Attendance</p>
                  <p className="text-xl font-black text-indigo-600">
                    {(() => {
                      const stats = allSessions.length > 0 ? (allAttendance.filter(a => a.studentId === viewingStudentId).length / allSessions.length) * 100 : 0;
                      return Math.round(stats);
                    })()}%
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center relative overflow-hidden">
                  <Flame className="absolute -right-2 -bottom-2 w-12 h-12 text-emerald-100 rotate-12" />
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1 relative z-10">Streak</p>
                  <div className="flex items-center justify-center gap-1 relative z-10">
                    <Flame className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                    <p className="text-xl font-black text-emerald-600">
                      {(() => {
                        const sortedSessions = [...allSessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                        let streak = 0;
                        for (const session of sortedSessions) {
                          const attended = allAttendance.find(a => a.studentId === viewingStudentId && a.sessionId === session.id);
                          if (attended) {
                            streak++;
                          } else {
                            if (session.endTime) break;
                          }
                        }
                        return streak;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Last Date</p>
                  <p className="text-sm font-black text-amber-600 truncate">
                    {(() => {
                      const studentAtt = allAttendance
                        .filter(a => a.studentId === viewingStudentId)
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                      return studentAtt.length > 0 ? format(parseISO(studentAtt[0].timestamp), 'MMM dd') : 'Never';
                    })()}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-center">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Missed</p>
                  <p className="text-xl font-black text-red-600">
                    {allSessions.length - allAttendance.filter(a => a.studentId === viewingStudentId).length}
                  </p>
                </div>
              </div>

              {/* Attendance Trend Chart */}
              {allSessions.length > 0 && (
                <div className="mb-8 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <LayoutDashboard className="w-3 h-3" /> Attendance Trend
                  </h4>
                  <div className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={allSessions
                          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                          .map((session, index, arr) => {
                            const sessionsUpToNow = arr.slice(0, index + 1);
                            const attendedCount = sessionsUpToNow.filter(s => 
                              allAttendance.some(a => a.studentId === viewingStudentId && a.sessionId === s.id)
                            ).length;
                            return {
                              date: format(parseISO(session.startTime), 'MMM dd'),
                              percentage: Math.round((attendedCount / sessionsUpToNow.length) * 100)
                            };
                          })}
                      >
                        <defs>
                          <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          hide={allSessions.length > 10} 
                          tick={{ fontSize: 10, fill: '#94a3b8' }} 
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          hide 
                          domain={[0, 100]} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}
                          formatter={(value: number) => [`${value}%`, 'Cumulative Attendance']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="percentage" 
                          stroke="#6366f1" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorAttendance)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto pr-2">
                <h4 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" /> Session History
                </h4>
                <div className="space-y-3">
                  {allSessions
                    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                    .map(session => {
                      const attended = allAttendance.find(a => a.studentId === viewingStudentId && a.sessionId === session.id);
                      return (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                          <div>
                            <p className="font-bold text-zinc-900 text-sm">
                              {format(parseISO(session.startTime), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {format(parseISO(session.startTime), 'HH:mm')} - {session.endTime ? format(parseISO(session.endTime), 'HH:mm') : 'Ongoing'}
                            </p>
                          </div>
                          {attended ? (
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold">
                              <CheckCircle className="w-3 h-3" /> Present
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600 bg-red-100 px-3 py-1 rounded-full text-xs font-bold">
                              <AlertCircle className="w-3 h-3" /> Absent
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {allSessions.length === 0 && (
                      <div className="text-center py-12 text-zinc-400 text-sm">
                        No sessions recorded for this class yet.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" /> Gradebook
                    </h4>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Overall Grade</p>
                      <p className="text-xl font-black text-indigo-600">
                        {(() => {
                          const studentGrades = allGrades.filter(g => g.studentId === viewingStudentId);
                          if (studentGrades.length === 0) return 'N/A';
                          const totalScore = studentGrades.reduce((acc, g) => acc + g.score, 0);
                          const totalMax = studentGrades.reduce((acc, g) => acc + g.maxScore, 0);
                          return `${Math.round((totalScore / totalMax) * 100)}%`;
                        })()}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto pr-2 space-y-4">
                    {/* Add Grade Form */}
                    {isAddingGrade ? (
                      <motion.form 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleAddGrade}
                        className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Title</label>
                            <input 
                              type="text"
                              value={gradeTitle}
                              onChange={(e) => setGradeTitle(e.target.value)}
                              placeholder="e.g. Midterm Exam"
                              className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Type</label>
                            <select
                              value={gradeType}
                              onChange={(e) => setGradeType(e.target.value as 'assignment' | 'exam')}
                              className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm outline-none"
                            >
                              <option value="assignment">Assignment</option>
                              <option value="exam">Exam</option>
                            </select>
                          </div>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Score</label>
                              <input 
                                type="number"
                                step="0.1"
                                value={gradeScore}
                                onChange={(e) => setGradeScore(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm outline-none"
                                required
                              />
                            </div>
                            <span className="mb-2 text-zinc-400">/</span>
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Max</label>
                              <input 
                                type="number"
                                step="0.1"
                                value={gradeMaxScore}
                                onChange={(e) => setGradeMaxScore(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm outline-none"
                                required
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setIsAddingGrade(false)}
                            className="flex-1 py-2 text-sm font-bold text-zinc-500 hover:bg-white/50 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="flex-1 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                            Save Grade
                          </button>
                        </div>
                      </motion.form>
                    ) : (
                      <button 
                        onClick={() => setIsAddingGrade(true)}
                        className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add New Grade
                      </button>
                    )}

                    {/* Grades List */}
                    <div className="space-y-3">
                      {allGrades
                        .filter(g => g.studentId === viewingStudentId)
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map(grade => (
                          <div key={grade.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${grade.type === 'exam' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                {grade.type === 'exam' ? <ShieldCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="font-bold text-zinc-900 text-sm">{grade.title}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{grade.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-zinc-900">{grade.score}<span className="text-zinc-400 text-xs font-normal">/{grade.maxScore}</span></p>
                              <p className="text-[10px] text-zinc-400 font-bold">{Math.round((grade.score / grade.maxScore) * 100)}%</p>
                            </div>
                          </div>
                        ))}
                      {allGrades.filter(g => g.studentId === viewingStudentId).length === 0 && (
                        <div className="text-center py-12 text-zinc-400 text-sm">
                          No grades recorded for this student yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

// --- Student Dashboard ---
const StudentDashboard = () => {
  const { profile, college } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.collegeId) return;
    const q = query(collection(db, 'classes'), where('collegeId', '==', profile.collegeId));
    return onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Class))
        .filter(c => !c.deleted)
      );
    });
  }, [profile?.collegeId]);

  useEffect(() => {
    if (!profile?.id) return;
    const q = query(collection(db, 'attendance'), where('studentId', '==', profile.id));
    return onSnapshot(q, (snapshot) => {
      setAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    });
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const q = query(collection(db, 'grades'), where('studentId', '==', profile.id));
    return onSnapshot(q, (snapshot) => {
      setGrades(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Grade)));
    });
  }, [profile?.id]);

  const markAttendance = async (cls: Class) => {
    if (!cls.activeSession) return;
    setMarking(cls.id);
    try {
      // 1. Get or create local device ID
      let deviceId = localStorage.getItem('attendora_device_id');
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(7) + Date.now();
        localStorage.setItem('attendora_device_id', deviceId);
      }

      // 2. Fetch current IP address
      let currentIp = 'Unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        currentIp = ipData.ip;
      } catch (ipErr) {
        console.warn('Failed to fetch IP address', ipErr);
      }

      // 3. Device Binding Check (Persistent)
      if (profile?.deviceId && profile.deviceId !== deviceId) {
        alert('Error: This account is bound to another device. Please use your registered device or contact an admin to reset it.');
        return;
      }

      // 4. Geolocation Check
      const pos = await getCurrentPosition();
      const dist = getDistance(
        pos.coords.latitude, 
        pos.coords.longitude, 
        cls.activeSession.lat, 
        cls.activeSession.lng
      );

      const radius = cls.radius || 50;
      if (dist > radius) {
        alert(`You are too far from the teacher (${Math.round(dist)}m). Range is ${radius}m.`);
        return;
      }

      // 5. Session Time Check (Implicitly handled by activeSession presence, but we can add more)
      const now = new Date();
      const sessionStart = new Date(cls.activeSession.startTime);
      // Assuming sessions last 1 hour if not specified, or just checking if activeSession exists
      if (now.getTime() < sessionStart.getTime()) {
        alert('Error: Session has not started yet.');
        return;
      }

      const sessionId = cls.activeSession.sessionId;
      
      // 6. Session-Level Device/IP Consistency Check
      const alreadyMarked = attendance.find(a => a.classId === cls.id && a.sessionId === sessionId);
      
      if (alreadyMarked) {
        if (alreadyMarked.deviceId && alreadyMarked.deviceId !== deviceId) {
          alert('Error: This account was already marked for attendance from another device for this session.');
          return;
        }
        alert('Attendance already marked for this session.');
        return;
      }

      // 7. IP Verification Logic
      let isFlagged = false;
      let flagReason = '';

      if (profile?.lastIp && currentIp !== 'Unknown' && profile.lastIp !== currentIp) {
        // Simple "significant" change check: if the first two octets are different
        const oldOctets = profile.lastIp.split('.');
        const newOctets = currentIp.split('.');
        
        if (oldOctets[0] !== newOctets[0] || oldOctets[1] !== newOctets[1]) {
          isFlagged = true;
          flagReason = `Significant IP change from ${profile.lastIp} to ${currentIp}`;
        }
      }

      // 8. Bind device and update last IP
      if (profile?.id) {
        await updateDoc(doc(db, 'users', profile.id), {
          deviceId: profile.deviceId || deviceId,
          lastIp: currentIp
        });
      }

      // 9. Record Attendance
      await addDoc(collection(db, 'attendance'), {
        studentId: profile?.id,
        classId: cls.id,
        timestamp: new Date().toISOString(),
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        sessionId,
        deviceId,
        ip: currentIp,
        isFlagged,
        flagReason
      });
      
      if (isFlagged) {
        alert('Attendance marked, but flagged for review due to IP change.');
      } else {
        alert('Attendance marked successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Error marking attendance. Please ensure location is enabled and try again.');
    } finally {
      setMarking(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    if (file.size > 500000) { // 500KB limit for base64
      alert('Image too large. Please select an image under 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateDoc(doc(db, 'users', profile.id), {
          photoURL: base64String
        });
        alert('Profile picture updated!');
      } catch (err) {
        console.error('Failed to update photo', err);
        alert('Failed to update profile picture.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <DashboardLayout title="Student Portal">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Analytics */}
          {grades.length > 0 && (
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-zinc-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-black text-zinc-900 text-lg tracking-tight">Academic Performance</h3>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Grade Distribution</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-2xl">
                  <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={classes
                      .map(cls => {
                        const classGrades = grades.filter(g => g.classId === cls.id);
                        if (classGrades.length === 0) return null;
                        const totalScore = classGrades.reduce((acc, g) => acc + g.score, 0);
                        const totalMax = classGrades.reduce((acc, g) => acc + g.maxScore, 0);
                        return {
                          name: cls.name,
                          percentage: Math.round((totalScore / totalMax) * 100)
                        };
                      })
                      .filter((item): item is { name: string; percentage: number } => item !== null)
                    }
                    margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        fontSize: '12px',
                        fontWeight: '800'
                      }}
                      formatter={(value: number) => [`${value}%`, 'Overall Grade']}
                    />
                    <Bar dataKey="percentage" radius={[8, 8, 8, 8]} barSize={32}>
                      {classes.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'][index % 5]} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-zinc-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-zinc-900 text-lg tracking-tight">Active Sessions</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Real-time Attendance</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="space-y-4">
              {classes.filter(c => c.activeSession).map(c => {
                const isMarked = attendance.some(a => a.classId === c.id && a.sessionId === c.activeSession?.startTime);
                return (
                  <div key={c.id} className="p-6 bg-zinc-50/50 rounded-3xl border border-zinc-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                    <div>
                      <h4 className="font-black text-zinc-900 tracking-tight">{c.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live Session</p>
                      </div>
                    </div>
                    {isMarked ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl">
                        <CheckCircle className="w-4 h-4" /> Present
                      </div>
                    ) : (
                      <button 
                        onClick={() => markAttendance(c)}
                        disabled={marking === c.id}
                        className="px-8 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all"
                      >
                        {marking === c.id ? 'Verifying...' : 'Mark Present'}
                      </button>
                    )}
                  </div>
                );
              })}
              {classes.filter(c => c.activeSession).length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-zinc-200" />
                  </div>
                  <p className="text-zinc-400 font-bold text-sm">No active sessions at the moment.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" /> My Grades
            </h3>
            <div className="space-y-6">
              {classes.map(cls => {
                const classGrades = grades.filter(g => g.classId === cls.id);
                if (classGrades.length === 0) return null;

                const totalScore = classGrades.reduce((acc, g) => acc + g.score, 0);
                const totalMax = classGrades.reduce((acc, g) => acc + g.maxScore, 0);
                const overallPercentage = Math.round((totalScore / totalMax) * 100);

                return (
                  <div key={cls.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-zinc-900">{cls.name}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        overallPercentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        overallPercentage >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        Overall: {overallPercentage}%
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {classGrades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(grade => (
                        <div key={grade.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${grade.type === 'exam' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                              {grade.type === 'exam' ? <ShieldCheck className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900 text-xs">{grade.title}</p>
                              <p className="text-[9px] text-zinc-400 uppercase font-bold">{grade.type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-zinc-900 text-xs">{grade.score}/{grade.maxScore}</p>
                            <p className="text-[9px] text-zinc-400 font-bold">{Math.round((grade.score / grade.maxScore) * 100)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {grades.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <GraduationCap className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-zinc-500 text-sm">No grades have been posted yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-900 mb-6">My Profile</h3>
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-3xl font-bold overflow-hidden border-4 border-white shadow-md">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    profile?.name[0]
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-indigo-700 transition-colors">
                  <Camera className="w-4 h-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              </div>
              <div className="mt-4 text-center">
                <h4 className="font-bold text-zinc-900">{profile?.name}</h4>
                <p className="text-sm text-zinc-500">{profile?.email}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h3 className="font-bold text-zinc-900 mb-4">My Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">Total Classes</span>
                <span className="font-bold text-zinc-900">{classes.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">Attendance Marked</span>
                <span className="font-bold text-zinc-900">{attendance.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// --- Auth Provider ---
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [college, setCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubCollege: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      
      if (unsubProfile) unsubProfile();
      if (unsubCollege) unsubCollege();

      if (u) {
        // Start listening to profile immediately if user exists
        unsubProfile = onSnapshot(doc(db, 'users', u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const p = { id: docSnap.id, ...docSnap.data() } as UserProfile;
            setProfile(p);
            
            // Once we have profile, listen to college
            if (unsubCollege) unsubCollege();
            unsubCollege = onSnapshot(doc(db, 'colleges', p.collegeId), (colSnap) => {
              if (colSnap.exists()) {
                setCollege({ id: colSnap.id, ...colSnap.data() } as College);
              }
              setLoading(false);
            }, (err) => {
              console.error("College listen error:", err);
              setLoading(false);
            });
          } else {
            setProfile(null);
            setLoading(false);
          }
        }, (err) => {
          console.error("Profile listen error:", err);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setCollege(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubCollege) unsubCollege();
    };
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await sendEmailVerification(cred.user);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, profile, college, loading, signIn, signInWithEmail, signUpWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Main App ---
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const AppContent = () => {
  const { user, profile, loading, logout } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;
  
  // Super Admin Check
  if (user.email === SUPER_ADMIN_EMAIL) {
    return <SuperAdminDashboard />;
  }

  // Email Verification Check (Skip for Super Admin)
  if (!user.emailVerified) {
    return <VerifyEmailScreen user={user} logout={logout} />;
  }

  if (!profile) return <Onboarding user={user} />;

  switch (profile.role) {
    case 'admin': return <AdminDashboard />;
    case 'teacher': return <TeacherDashboard />;
    case 'student': return <StudentDashboard />;
    default: return <Login />;
  }
}
