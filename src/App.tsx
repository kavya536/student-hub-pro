import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  LayoutDashboard, 
  BookOpen,
  Book, 
  Settings,
  Bell,
  Search,
  Mail,
  Lock,
  User,
  Users,
  ArrowLeft,
  GraduationCap,
  MessageSquare,
  Star,
  MoreVertical,
  Send,
  Paperclip,
  XCircle,
  DollarSign,
  Award,
  RefreshCw,
  LogOut,
  FileText,
  Image as ImageIcon,
  Camera,
  Mic,
  UserCircle,
  BarChart2,
  BarChart3,
  Edit2,
  Check,
  CheckCheck,
  Plus,
  Smile,
  ChevronRight,
  TrendingUp,
  Target,
  CheckCircle2,
  CheckCircle,
  Circle,
  Menu,
  X,
  Monitor,
  Eye,
  EyeOff,
  Video,
  Trash2,
  Download,
  Quote,
  Save,
  AlertTriangle,
  Minus,
  RotateCcw,
  Briefcase,
  FileCheck,
  ShieldCheck,
  CreditCard,
  Wallet,
  AlertCircle,
  MousePointer2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';
import { auth, db, messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { onSnapshot, collection, query, where, doc, setDoc, addDoc, getDoc, updateDoc, serverTimestamp, getDocs, deleteDoc, orderBy, increment, arrayUnion, limit } from 'firebase/firestore';

// Helper to format Firestore timestamp safely
const formatTime = (ts: any) => {
  if (!ts) return 'Just now';
  // If it's a simple formatted time string (e.g. "10:30 AM"), return it.
  // If it's an ISO string (contains T and Z), we want to format it properly below.
  if (typeof ts === 'string' && ts.includes(':') && !ts.includes('T')) return ts;
  
  let date: Date;
  if (ts?.seconds) date = new Date(ts.seconds * 1000);
  else date = new Date(ts);
  
  if (isNaN(date.getTime())) return 'Just now';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const parseTime = (t: string) => {
  if (!t) return 0;
  // Try AM/PM format (e.g. "10:00 AM")
  const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    let [_, h, m, ampm] = match;
    let hours = parseInt(h);
    if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + parseInt(m);
  }
  // Fallback to 24h format (e.g. "14:30")
  const parts = t.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  }
  return 0;
};

const formatMins = (m: number) => {
  let h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mm.toString().padStart(2, '0')} ${ampm}`;
};

const formatDateLabel = (d: any) => {
  if (!d) return 'TODAY';
  if (d === 'TODAY' || d === 'YESTERDAY') return d;
  
  let date: Date;
  if (d?.seconds) date = new Date(d.seconds * 1000);
  else date = new Date(d);

  if (isNaN(date.getTime())) return 'TODAY';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (msgDate.getTime() === today.getTime()) return 'TODAY';
  if (msgDate.getTime() === yesterday.getTime()) return 'YESTERDAY';
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const notifIconMap = {
  booking: <BookOpen className="w-4 h-4 text-primary" />,
  message: <MessageSquare className="w-4 h-4 text-sky-500" />,
  review:  <Star className="w-4 h-4 text-amber-500" />,
  Enrollment: <BookOpen className="w-4 h-4 text-primary" />,
  payment: <DollarSign className="w-4 h-4 text-emerald-500" />
};

const notifBgMap = {
  booking: 'bg-primary/10',
  message: 'bg-sky-50',
  review:  'bg-amber-50',
  Enrollment: 'bg-primary/10',
  payment: 'bg-emerald-50'
};

const getPlanDefaults = (tier: 'free' | 'standard' | 'premium', category: StudentProfile['studentType'] = 'school'): SubscriptionPlan => {
  const startDate = new Date();
  const expiresAt = new Date();
  expiresAt.setMonth(startDate.getMonth() + 3); // 3-month duration

  let allowedSubjects = 1;
  if (tier === 'standard') allowedSubjects = 3;
  if (tier === 'premium') allowedSubjects = 8;

  let cat: SubscriptionPlan['category'] = 'schools';
  if (category === 'inter') cat = 'intermediate';
  if (category === 'btech' || category === 'degree') cat = 'graduates';

  return {
    tier,
    category: cat,
    startDate: startDate.toISOString(),
    expiresAt: expiresAt.toISOString(),
    allowedSubjects,
    status: 'active'
  };
};

import { sendPlatformEmail } from './services/emailService';
import { ShieldCheck as ShieldCheckIcon } from 'lucide-react';

// Centralized Subject Master System
const SUBJECT_MASTER: Record<string, { name: string, aliases: string[] }> = {
  'mathematics': {
    name: 'Mathematics',
    aliases: ['maths', 'math', 'mathemathics', 'calculus', 'algebra', 'maths 1a', 'maths 1b', 'maths 2a', 'maths 2b', 'discrete mathematics', 'mathematics (b.tech/b.sc)']
  },
  'physics': {
    name: 'Physics',
    aliases: ['phisics', 'phys']
  },
  'chemistry': {
    name: 'Chemistry',
    aliases: ['chemestry', 'chem']
  },
  'biology': {
    name: 'Biology',
    aliases: ['bio', 'biological sciences']
  },
  'computer_science': {
    name: 'Computer Science',
    aliases: ['cs', 'computer', 'programming', 'it', 'java', 'python', 'c programming', 'html/css', 'javascript', 'react.js', 'node.js', 'sql/mysql', 'postgresql', 'artificial intelligence', 'machine learning']
  },
  'english': {
    name: 'English',
    aliases: ['english language', 'literature']
  },
  'social_studies': {
    name: 'Social Studies',
    aliases: ['sst', 'social science', 'history', 'geography', 'civics']
  },
  'hindi': {
    name: 'Hindi',
    aliases: []
  },
  'sanskrit': {
    name: 'Sanskrit',
    aliases: []
  },
  'telugu': {
    name: 'Telugu',
    aliases: []
  },
  'business_studies': {
    name: 'Business Studies',
    aliases: ['business', 'bst']
  },
  'accountancy': {
    name: 'Accountancy',
    aliases: ['accounts', 'accounting']
  },
  'economics': {
    name: 'Economics',
    aliases: ['eco']
  },
  'science': {
    name: 'Science',
    aliases: ['general science']
  },
  'evs': {
    name: 'EVS',
    aliases: ['environmental science']
  }
};

const normalizeSubject = (input: string): string => {
  if (!input) return '';
  const normalized = input.trim().toLowerCase();
  
  // 1. Direct match with ID
  if (SUBJECT_MASTER[normalized]) return normalized;
  
  // 2. Match with Name
  for (const [id, data] of Object.entries(SUBJECT_MASTER)) {
    if (data.name.toLowerCase() === normalized) return id;
  }
  
  // 3. Match with Aliases
  for (const [id, data] of Object.entries(SUBJECT_MASTER)) {
    if (data.aliases.some(alias => alias.toLowerCase() === normalized)) return id;
  }
  
  // 4. Partial match as fallback (optional, but good for UX)
  for (const [id, data] of Object.entries(SUBJECT_MASTER)) {
    if (normalized.includes(data.name.toLowerCase()) || data.name.toLowerCase().includes(normalized)) return id;
  }

  return normalized; // Return as-is if no match found (though master list should be comprehensive)
};

const getSubjectName = (id: string): string => {
  if (!id || typeof id !== 'string') return 'General Session';
  return SUBJECT_MASTER[id]?.name || id.charAt(0).toUpperCase() + id.slice(1);
};

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper for pricing
const getEffectivePrice = (tutor: any) => {
  if (!tutor) return "0";
  
  // 1. Priority: Base hourly rate (this is what students should see as 'starting at')
  const baseRate = parseFloat(String(tutor.price || tutor.classPricing || '0')) || 0;
  if (baseRate > 0) {
    return Math.ceil(baseRate * 1.17).toString();
  }

  // 2. Fallback: First non-course subject pricing
  if (Array.isArray(tutor.subjectsPricing) && tutor.subjectsPricing.length > 0) {
    const hourlyPlan = tutor.subjectsPricing.find((sp: any) => sp.type !== 'course');
    const firstPrice = parseFloat(String((hourlyPlan || tutor.subjectsPricing[0]).price || '0')) || 0;
    return Math.ceil(firstPrice * 1.17).toString();
  }

  return "188"; // Final safety fallback
};

// Helper to notify tutors when a student changes plans
const notifyTutorsOfPlanUpdate = async (studentName: string, tier: string, bookings: Booking[]) => {
  const activeTutorIds = Array.from(new Set(
    bookings
      .filter(b => ['confirmed', 'pending', 'live', 'rescheduled'].includes(b.status))
      .map(b => b.tutorId)
  ));

  const planName = tier === 'free' ? 'Explorer (Free)' : tier === 'standard' ? 'Scholar (Standard)' : 'Elite (Premium)';
  const subjectLimit = tier === 'free' ? 1 : tier === 'standard' ? 3 : 8;

  // Feature descriptions for each tier
  const featureInfo = tier === 'free' 
    ? 'Features: Single subject, One-on-One sessions, Platform fee applicable. No extra classes or refunds.'
    : tier === 'standard'
    ? 'Features: Up to 3 subjects, Extra doubt classes, Tutor notes, 20% refund policy, No platform fee.'
    : 'Features: Up to 8 subjects, Extra classes, Premium tutor notes, Assignments & mock tests, Projects, 40% refund policy, No platform fee.';

  for (const tutorId of activeTutorIds) {
    try {
      await addDoc(collection(db, 'tutor_notifications'), {
        tutorId,
        type: 'update',
        title: 'Student Plan Updated',
        description: `${studentName} has switched to the ${planName} Plan (${subjectLimit} subjects). ${featureInfo} Please ensure you cover these features for correct payment.`,
        time: 'Just now',
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(`Failed to notify tutor ${tutorId}:`, e);
    }
  }
};

// --- Types ---

const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

type View = 'dashboard' | 'find-tutors' | 'tutor-profile' | 'my-bookings' | 'payments' | 'chat' | 'reviews' | 'progress' | 'notes' | 'settings' | 'login' | 'register' | 'forgot-password' | 'live-class' | 'blocked' | 'projects' | 'assignments' | 'verify-email';

interface LearningGoal {
  id: string;
  title: string;
  category: 'Module' | 'Skill' | 'Project';
  progress: number; // 0 to 100
  totalTasks: number;
  completedTasks: number;
  dueDate: string;
  color: string;
}

interface Grade {
  subject: string;
  score: number;
  total: number;
  date: string;
}

interface SubscriptionPlan {
  tier: 'free' | 'standard' | 'premium';
  category?: 'schools' | 'intermediate' | 'graduates';
  startDate: any;
  expiresAt: any;
  allowedSubjects: number;
  status: 'active' | 'expired' | 'pending';
}

interface StudentProfile {
  id?: string;
  name: string;
  email: string;
  password?: string;
  mobile: string;
  class: string;
  board: string;
  studentType?: 'school' | 'inter' | 'btech' | 'degree';
  category?: 'schools' | 'intermediate' | 'graduates';
  notifications: {
    reminders: boolean;
    messages: boolean;
    updates: boolean;
    push: boolean;
  };
  subscription?: SubscriptionPlan;
  totalSessions?: number;
  displayName?: string;
  photoURL?: string;
  fcmTokens?: string[];
  email_verified?: boolean;
  first_login_completed?: boolean;
  upiId?: string;
  registrationDate?: string;
  status?: string;
  walletBalance?: number;
}


interface Tutor {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  subjects: string[];
  experience: string;
  rating: number;
  price: number | string;
  monthlyPrice?: number;
  upiId?: string;
  bio: string;
  reviews: Review[];
  availability: any[];
  subjectsPricing?: { subject: string, price: number, type?: 'monthly' | 'course', durationDays?: number }[];
  targetClasses?: string;
  autoAvailability?: boolean;
  qualification?: string;
}

interface Review {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  date: string;
}

interface Booking {
  id: string;
  tutorId: string;
  tutorName: string;
  studentName: string;
  studentEmail?: string;
  studentType?: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' | 'unpaid' | 'live' | 'pending_cancellation';
  isRescheduled?: boolean;
  attendance_status?: 'attended' | 'not_attended' | 'pending';
  studentPresent?: boolean;
  studentJoinTime?: any;
  studentLeaveTime?: any;
  topic?: string;
  tutorJoined?: boolean;
  studentJoined?: boolean;
  tutorPresent?: boolean;
  tutorJoinTime?: any;
  tutorLeaveTime?: any;
  durationConducted?: number; // in minutes
  completedAt?: any;
  plan?: string;
  reviewSubmitted?: boolean;
  reviewedAt?: any;
  reviewRating?: number;
  reviewComment?: string;
  paymentDeadline?: any;
  studentClass?: string;
  class?: string;
  paymentId?: string;
  orderId?: string;
  amount?: number;
  paidAt?: any;
  type?: 'demo' | 'paid';
  createdAt?: any;
  isGroup?: boolean;
  maxParticipants?: number;
  participantCount?: number;
  participants?: string[];
  participantData?: {
    [email: string]: {
      joinTime: any;
      leaveTime: any;
      status: 'attended' | 'not_attended' | 'pending';
    }
  };
  startedAt?: any;
  isSubscription?: boolean;
  subscriptionStatus?: 'active' | 'expired' | 'cancelled';
  nextBillingDate?: any;
  talkingTime?: number; // in seconds
  cancellationReason?: string;
  wantsNewTutor?: boolean;
  tierAtBooking?: string;
  attendedCount?: number;
}

interface Poll {
  id: string;
  tutorId: string;
  tutorName?: string;
  question: string;
  topic?: string;
  targetClass: string;
  options: { text: string; votes: string[] }[];
  allowMultiple: boolean;
  status: 'active' | 'closed';
  createdAt: any;
}

interface Message {
  id: string;
  senderId: string;
  sender?: 'me' | 'tutor';
  text: string;
  timestamp: any;
  edited?: boolean;
  date?: string;
}

interface Chat {
  id?: string;
  tutorId: string;
  tutorName: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  messages: Message[];
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'booking' | 'message' | 'update';
  read: boolean;
  link: View;
}

// --- Mock Data ---

const MOCK_GOALS: LearningGoal[] = [
  {
    id: 'g1',
    title: 'Advanced Calculus',
    category: 'Module',
    progress: 75,
    totalTasks: 12,
    completedTasks: 9,
    dueDate: '2024-04-15',
    color: 'bg-primary'
  },
  {
    id: 'g2',
    title: 'Quantum Mechanics Basics',
    category: 'Module',
    progress: 40,
    totalTasks: 10,
    completedTasks: 4,
    dueDate: '2024-05-01',
    color: 'bg-accent'
  },
  {
    id: 'g3',
    title: 'Python Data Science',
    category: 'Skill',
    progress: 90,
    totalTasks: 20,
    completedTasks: 18,
    dueDate: '2024-04-10',
    color: 'bg-primary'
  }
];

const MOCK_GRADES: Grade[] = [
  { subject: 'Mathematics', score: 92, total: 100, date: '2024-03-10' },
  { subject: 'Physics', score: 88, total: 100, date: '2024-03-12' },
  { subject: 'Computer Science', score: 95, total: 100, date: '2024-03-15' },
  { subject: 'Spanish', score: 82, total: 100, date: '2024-03-18' }
];
const MOCK_TUTORS: Tutor[] = [
  {
    id: '1',
    name: 'Dr. Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    subjects: ['Mathematics', 'Physics'],
    experience: '10+ Years',
    rating: 4.9,
    price: 45,
    monthlyPrice: 12000,
    bio: 'I specialize in making complex mathematical concepts easy to understand. With a PhD in Physics, I bring a practical approach to learning.',
    reviews: [
      { id: 'r1', studentName: 'Alex J.', rating: 5, comment: 'Amazing tutor! Helped me ace my finals.', date: '2024-03-15' }
    ],
    availability: []
  },
  {
    id: '2',
    name: 'James Wilson',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    subjects: ['Computer Science', 'Web Dev'],
    experience: '6 Years',
    rating: 4.8,
    price: 35,
    monthlyPrice: 8500,
    bio: 'Full-stack developer turned educator. I love teaching React, Node.js, and Python. Let\'s build something cool together!',
    reviews: [
      { id: 'r2', studentName: 'Emma S.', rating: 4, comment: 'Very patient and knowledgeable.', date: '2024-03-10' }
    ],
    availability: []
  },
  {
    id: '3',
    name: 'Maria Garcia',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    subjects: ['Spanish', 'Literature'],
    experience: '8 Years',
    rating: 5.0,
    price: 30,
    monthlyPrice: 6000,
    bio: 'Native Spanish speaker with a passion for literature. I focus on conversational skills and cultural immersion.',
    reviews: [
      { id: 'r3', studentName: 'Lucas M.', rating: 5, comment: 'Excellent focus on grammar.', date: '2024-03-05' }
    ],
    availability: []
  },
  {
    id: '4',
    name: 'Anjali Rao',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    subjects: ['Telugu', 'Hindi'],
    experience: '12 Years',
    rating: 4.9,
    price: 25,
    monthlyPrice: 5500,
    bio: 'Expert in Telugu and Hindi literature. I make language learning fun and engaging for students of all ages.',
    reviews: [
      { id: 'r4', studentName: 'Priya K.', rating: 5, comment: 'Very helpful with Hindi basics.', date: '2024-03-02' }
    ],
    availability: []
  },
  {
    id: '5',
    name: 'Robert Smith',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    subjects: ['English', 'Literature'],
    experience: '15 Years',
    rating: 4.7,
    price: 40,
    monthlyPrice: 9000,
    bio: 'Native English speaker with a focus on grammar, vocabulary, and creative writing. Let\'s improve your communication skills.',
    reviews: [
      { id: 'r5', studentName: 'Tom H.', rating: 4, comment: 'Great English sessions.', date: '2024-03-01' }
    ],
    availability: []
  },
  {
    id: '6',
    name: 'Dr. Vikram Reddy',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    subjects: ['JEE', 'Physics', 'Mathematics'],
    experience: '20 Years',
    rating: 5.0,
    price: 60,
    monthlyPrice: 25000,
    bio: 'Specialist in JEE preparation. I have helped hundreds of students get into top engineering colleges.',
    reviews: [],
    availability: []
  },
  {
    id: '7',
    name: 'Srinivas Murthy',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    subjects: ['EAMCET', 'Chemistry'],
    experience: '10 Years',
    rating: 4.6,
    price: 35,
    monthlyPrice: 7500,
    bio: 'Dedicated EAMCET coach focusing on Chemistry. I provide clear explanations and effective shortcut methods.',
    reviews: [],
    availability: []
  }
];

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'b1',
    tutorId: '1',
    tutorName: 'Dr. Sarah Jenkins',
    studentName: 'Scholar Tester',
    subject: 'Calculus II',
    date: '2024-03-30',
    time: '11:00 AM',
    duration: '1 Hour',
    status: 'confirmed',
    studentJoined: false,
    tutorJoined: false
  },
  {
    id: 'b2',
    tutorId: '2',
    tutorName: 'James Wilson',
    studentName: 'Scholar Tester',
    subject: 'React Basics',
    date: '2024-04-02',
    time: '03:00 PM',
    duration: '1.5 Hours',
    status: 'pending'
  },
  {
    id: 'b3',
    tutorId: '1',
    tutorName: 'Dr. Sarah Jenkins',
    studentName: 'Scholar Tester',
    subject: 'Physics I',
    date: '2024-03-20',
    time: '10:00 AM',
    duration: '1 Hour',
    status: 'completed',
    attendance_status: 'attended',
    studentJoined: true,
    tutorJoined: true,
    topic: 'Introduction to Mechanics',
    durationConducted: 60
  }
];

const MOCK_CHATS: Chat[] = [
  {
    id: 'mock_chat_1',
    tutorId: '1',
    tutorName: 'Dr. Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    lastMessage: 'See you in our next session!',
    time: '10:30 AM',
    unreadCount: 0,
    messages: [
      { id: 'm1', senderId: '1', text: 'Hi Alex, are you ready for our session?', timestamp: '09:00 AM', date: 'TODAY' },
      { id: 'm2', senderId: 'user', text: 'Yes, I have my notes ready!', timestamp: '09:05 AM', date: 'TODAY' },
      { id: 'm3', senderId: '1', text: 'Great! See you in our next session!', timestamp: '10:30 AM', date: 'TODAY' },
    ]
  },
  {
    id: 'mock_chat_2',
    tutorId: '2',
    tutorName: 'James Wilson',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    lastMessage: 'I can help with that project.',
    time: '04:37 PM',
    unreadCount: 0,
    messages: [
      { id: 'm4', senderId: '2', text: 'I can help with that project.', timestamp: '04:37 PM', date: 'YESTERDAY' },
    ]
  }
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'Booking Confirmed', message: 'Your session with Dr. Sarah Jenkins is confirmed.', time: '2 mins ago', type: 'booking', read: false, link: 'my-bookings' },
  { id: 'n2', title: 'New Message', message: 'James Wilson sent you a message.', time: '1 hour ago', type: 'message', read: false, link: 'chat' },
  { id: 'n3', title: 'Session Reminder', message: 'Your session starts in 30 minutes.', time: '3 hours ago', type: 'update', read: true, link: 'dashboard' },
  { id: 'n4', title: 'Class Rescheduled', message: 'Your class has been rescheduled by tutor. Check your bookings for the new time.', time: 'Just now', type: 'update', read: false, link: 'my-bookings' },
];

const BOARDS = ['CBSE', 'ICSE', 'IGCSE', 'IB', 'State Board', 'Other'];

// --- Reusable Components ---

const Button = ({ children, onClick, className = '', disabled = false, variant = 'primary' }: { children: React.ReactNode, onClick?: () => void, className?: string, disabled?: boolean, variant?: 'primary' | 'secondary' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "inline-flex items-center justify-center font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
      variant === 'primary' ? "bg-primary text-white hover:bg-black/90" : "bg-white/10 text-primary hover:bg-white/20",
      className
    )}
  >
    {children}
  </button>
);

const Badge = ({ children, variant }: { children: React.ReactNode, variant: Booking['status'] }) => {
  const classes = {
    pending: 'badge-pending',
    confirmed: 'badge-confirmed',
    cancelled: 'badge-cancelled',
    completed: 'bg-primary/10 text-primary/70',
    live: 'bg-emerald-500 text-white animate-pulse shadow-lg shadow-emerald-500/20',
    rescheduled: 'bg-blue-50 text-blue-600',
    unpaid: 'bg-rose-50 text-rose-600'
  };
  return <span className={`pill-tag ${classes[variant] || 'bg-slate-100'}`}>{children}</span>;
};

const Avatar = ({ src, size = 'md', mdSize, className = '', initials = '' }: { src?: string, size?: 'sm' | 'md' | 'lg' | 'xl', mdSize?: 'sm' | 'md' | 'lg' | 'xl', className?: string, initials?: string }) => {
  const sizes = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl'
  };
  const mdSizes = {
    sm: 'md:w-8 md:h-8',
    md: 'md:w-10 md:h-10',
    lg: 'md:w-16 md:h-16',
    xl: 'md:w-24 md:h-24'
  };

  const hasImage = src && src.trim() !== '';

  return (
    <div className={`${sizes[size]} ${mdSize ? mdSizes[mdSize] : ''} rounded-full overflow-hidden border-2 border-background shadow-sm flex-shrink-0 bg-primary/5 flex items-center justify-center ${className}`}>
      {hasImage ? (
        <img src={src} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as any).style.display = 'none'; }} />
      ) : (
        <span className="text-primary font-black uppercase tracking-tighter select-none">{initials}</span>
      )}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto pt-10 md:pt-20">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] md:rounded-[2.5rem] w-full max-w-lg shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 mb-20"
      >
        <div className="p-6 md:p-8 border-b border-black/5 flex items-center justify-between bg-white/50 backdrop-blur-xl sticky top-0 z-10">
          <h3 className="text-lg md:text-xl font-serif font-black italic text-on-surface">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-all active:scale-90">
            <XCircle className="text-primary/20 hover:text-primary transition-colors" size={24} />
          </button>
        </div>
        <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50/30">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App Component ---

const getMockRating = (id: string | number) => {
  if (!id) return 4.5;
  const sId = String(id);
  const hash = sId.split('').reduce((a, b: string) => { 
    const val = ((a << 5) - a) + b.charCodeAt(0); 
    return val & val; 
  }, 0);
  const random = Math.abs(hash % 7);
  return +(4.2 + (random * 0.1)).toFixed(1);
};

const getMockCount = (id: string | number) => {
  if (!id) return 100;
  const sId = String(id);
  const hash = sId.split('').reduce((a, b: string) => { 
    const val = ((a << 5) - a) + b.charCodeAt(0); 
    return val & val; 
  }, 0);
  return 100 + (Math.abs(hash) % 50);
};

const getReputation = (id: string | number, realReviews: any[] = []) => {
  const mockR = getMockRating(id);
  const mockC = getMockCount(id);
  const realC = realReviews.length;
  const realSum = realReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  
  const totalC = mockC + realC;
  const totalAvg = ((mockR * mockC) + realSum) / totalC;
  
  return {
    rating: totalAvg,
    count: totalC
  };
};

const MyBookingsView = ({ bookings, setBookings, openChat, onReschedule, setView, setSelectedTutor, tutors, startSession, parseTime, currentUser, setCancelBooking, setIsCancelModalOpen, calculateRefund }: { 
  bookings: Booking[], 
  setBookings: (bookings: Booking[]) => void,
  openChat: (tutorId: string) => void, 
  onReschedule: (booking: Booking) => void,
  setView: (view: View) => void,
  setSelectedTutor: (tutor: Tutor | null) => void,
  tutors: Tutor[],
  startSession: (id: string) => void,
  parseTime: (time: string) => number,
  currentUser: StudentProfile | null,
  setCancelBooking: (booking: Booking | null) => void,
  setIsCancelModalOpen: (open: boolean) => void,
  calculateRefund: (booking: Booking) => any
}) => {
    const [tab, setTab] = useState<'all' | 'confirmed' | 'pending' | 'completed' | 'cancel'>('all');
    
    const filteredBookings = bookings.filter(b => {
      // Default 'all' view now only shows ACTIVE bookings (not cancelled or completed)
      if (tab === 'all') return ['pending', 'confirmed', 'live', 'rescheduled'].includes(b.status) && b.attendance_status !== 'attended';
      if (tab === 'confirmed') return (b.status === 'confirmed' || b.status === 'rescheduled') && b.attendance_status !== 'attended';
      if (tab === 'pending') return b.status === 'pending';
      if (tab === 'completed') return (b.status === 'completed' || b.attendance_status === 'attended');
      if (tab === 'cancel') return b.status === 'cancelled';
      return true;
    });

    return (
      <div className="space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 md:gap-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex bg-primary/5 p-1 rounded-xl md:p-1.5 md:rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar"
          >
            {['all', 'confirmed', 'pending', 'completed', 'cancel'].map(t => (
              <button 
                key={t}
                onClick={() => setTab(t as any)}
                className={`flex-1 sm:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-primary text-background shadow-xl' : 'text-primary/40 hover:bg-primary/5'}`}
              >
                {t === 'cancel' ? 'Cancelled' : t}
              </button>
            ))}
          </motion.div>
        </div>

        {tab === 'completed' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border border-primary/10 rounded-2xl p-6 md:p-8 flex items-center justify-between gap-6"
          >
            <div>
              <h3 className="text-lg md:text-xl font-bold font-serif italic mb-1">Course Progress</h3>
              <p className="text-[10px] md:text-xs text-primary/50 font-bold uppercase tracking-widest">Attendance Tracking</p>
            </div>
            <div className="flex items-end gap-3 text-primary">
              <span className="text-3xl md:text-5xl font-black">{bookings.filter(b => (b.attendance_status === 'attended' || b.status === 'completed') && b.tutorJoined && b.studentJoined && b.topic && (b.durationConducted === undefined || b.durationConducted >= 10)).length}</span>
              <span className="text-lg md:text-xl font-bold mb-1 md:mb-2 opacity-50">/ {currentUser?.totalSessions || 30}</span>
              <span className="text-[10px] md:text-xs font-bold mb-2 md:mb-3 opacity-50 uppercase tracking-widest ml-2">Sessions Ended</span>
            </div>
          </motion.div>
        )}

        <div className="space-y-4 md:space-y-6">
          {filteredBookings.length > 0 ? filteredBookings.map((booking, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={booking.id} 
              className="course-card p-4 md:p-6 flex flex-col md:flex-row items-stretch md:items-center gap-6 md:gap-10"
            >
              <div className="flex items-center gap-4 md:gap-8 min-w-[240px]">
                <Avatar 
                  src={((tutors || []).find(t => t.id === booking.tutorId) || MOCK_TUTORS.find(t => t.id === booking.tutorId))?.avatar || ''} 
                  size="md" 
                  mdSize="lg" 
                  initials={(booking.tutorName || 'Tutor').charAt(0).toUpperCase()}
                />
                <div>
                  <h4 className="font-bold text-lg md:text-xl truncate max-w-[160px]">{booking.tutorName}</h4>
                  <p className="text-[9px] md:text-[10px] font-bold text-primary/40 uppercase tracking-widest">{getSubjectName(booking.subject)}</p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-4 md:gap-12 border-t md:border-t-0 md:border-l border-primary/5 pt-4 md:pt-0 md:pl-10">
                <div className="flex items-center gap-3 text-primary/60">
                  <div className="p-2 rounded-lg bg-accent/5 text-accent shrink-0"><Calendar size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest opacity-40 mb-0.5">Date</p>
                    <p className="text-xs md:text-sm font-bold text-on-surface truncate">{booking.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-primary/60">
                  <div className="p-2 rounded-lg bg-primary/5 text-primary shrink-0"><Clock size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest opacity-40 mb-0.5">Time & Duration</p>
                    <p className="text-xs md:text-sm font-bold text-on-surface whitespace-nowrap">
                      {booking.status === 'completed' || booking.attendance_status === 'attended' ? (
                        <span className="text-slate-500 italic opacity-60">Session Ended</span>
                      ) : (
                        (() => {
                          const startMins = parseTime(booking.time);
                          const durationStr = booking.duration ? booking.duration.toString().replace(/ Hours?| Hr/i, '') : '1';
                          const duration = parseFloat(durationStr);
                          const endMins = startMins + (duration * 60);
                          
                          const formatMinsLocal = (m: number) => {
                            let h = Math.floor(m / 60);
                            const mm = m % 60;
                            const ampm = h >= 12 ? 'pm' : 'am';
                            h = h % 12 || 12;
                            return `${h}:${mm.toString().padStart(2, '0')}${ampm}`;
                          };
                          
                          return `${formatMinsLocal(startMins)} - ${formatMinsLocal(endMins)}`;
                        })()
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 md:min-w-[220px] border-t md:border-t-0 border-primary/5 pt-4 md:pt-0">
                <div className="flex items-center gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                    booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                    booking.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                    booking.status === 'completed' ? 'bg-primary/5 text-primary/40' :
                    booking.isRescheduled || booking.status === 'rescheduled' ? 'bg-blue-50 text-blue-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    {booking.isRescheduled || booking.status === 'rescheduled' ? 'Rescheduled' : booking.status}
                  </span>
                  
                    {((booking.status === 'completed' || booking.status === 'confirmed') && booking.attendance_status && booking.tutorJoined && booking.studentJoined && booking.topic) ? (
                      <span className="px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5">
                        <CheckCircle size={10} /> Attended
                      </span>
                    ) : (booking.status === 'completed' || booking.status === 'confirmed') && booking.attendance_status && (
                      <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                        booking.attendance_status === 'attended' || booking.attendance_status === 'pending'
                          ? 'bg-blue-50 text-blue-600' 
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {booking.attendance_status === 'not_attended' ? 'Not Attended' : 'Attended'}
                      </span>
                    )}
                  </div>

                  {booking.topic && (
                    <div className="mt-2 text-[10px] font-bold text-on-surface/60 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/5 italic truncate max-w-[200px]">
                      Topic: {booking.topic}
                    </div>
                  )}
                  
                  {booking.status === 'completed' && booking.durationConducted && (
                    <div className="mt-1 flex items-center gap-3 text-[9px] font-black uppercase tracking-tighter opacity-50">
                       <Clock size={10} /> {booking.durationConducted} mins conducted
                       {booking.talkingTime && <span>• {Math.round(booking.talkingTime / 60)} mins interaction</span>}
                    </div>
                  )}

                  {booking.isSubscription && (
                    <div className="w-full flex flex-col gap-2">
                      <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 w-full">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <RefreshCw size={12} className={cn("text-primary", booking.subscriptionStatus === 'active' ? "animate-spin-slow" : "")} />
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Subscription Active</span>
                             </div>
                          </div>
                          {booking.nextBillingDate && (
                             <div className="flex items-center justify-between border-t border-primary/5 mt-2 pt-2">
                               <span className="text-[8px] font-bold text-primary/30 uppercase">Next Bill</span>
                               <span className="text-[9px] font-black text-accent uppercase">{
                                 booking.nextBillingDate.seconds 
                                   ? new Date(booking.nextBillingDate.seconds * 1000).toLocaleDateString()
                                   : new Date(booking.nextBillingDate).toLocaleDateString()
                               }</span>
                             </div>
                          )}
                        </div>
                      </div>
                      {(() => {
                        const paidAt = (booking as any).paidAt?.toDate ? (booking as any).paidAt.toDate() : (booking.paidAt ? new Date(booking.paidAt) : null);
                        if (!paidAt) return null;

                        const now = new Date();
                        const startDay = paidAt.getDate();
                        const currentDay = now.getDate();
                        
                        const daysUntilRenewal = (startDay - currentDay + 31) % 31;
                        const isDue = daysUntilRenewal >= 1 && daysUntilRenewal <= 3;
                        const isExpired = booking.subscriptionStatus === 'expired';

                        if (booking.subscriptionStatus === 'active' && isDue) {
                          return (
                            <div className="flex flex-col gap-1 px-3 py-2 border-l-2 border-amber-500 bg-amber-50 rounded-r-lg">
                              <div className="flex items-center gap-2">
                                <Bell size={10} className="text-amber-600 animate-bounce" />
                                <span className="text-[8px] font-black text-amber-700 uppercase leading-tight">Renewal Due: {new Date(now.getFullYear(), now.getMonth(), startDay).toLocaleDateString()}</span>
                              </div>
                            </div>
                          );
                        }
                        
                        if (isExpired) {
                          return (
                            <div className="flex items-center gap-2 px-3 py-2 border-l-2 border-rose-500 bg-rose-50 rounded-r-lg">
                              <XCircle size={10} className="text-rose-600" />
                              <span className="text-[8px] font-black text-rose-700 uppercase">Payment Pending</span>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center gap-2 px-3 py-1.5 border-l-2 border-emerald-500 bg-emerald-50 rounded-r-lg opacity-80">
                            <CheckCircle size={10} className="text-emerald-500" />
                            <span className="text-[8px] font-black text-emerald-700 uppercase">Verified</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                <div className="flex items-center gap-2">
                  {booking.status === 'pending' && (
                    <button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled' });
                          alert('Session cancelled successfully');
                        } catch (e) {
                          console.error("Error cancelling booking:", e);
                        }
                      }}
                      className="px-4 py-2 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                    >
                      Cancel
                    </button>
                  )}

                  {booking.status === 'pending_cancellation' && (
                    <span className="px-6 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-2">
                       <RefreshCw size={14} className="animate-spin-slow" /> Cancellation Pending
                    </span>
                  )}

                  {booking.type === 'paid' && 
                   (booking.status === 'confirmed' || booking.status === 'rescheduled') && 
                   (booking as any).paidAt && 
                   (() => {
                      const refund = calculateRefund(booking);
                      return refund.eligible || booking.isSubscription;
                   })() && (
                    <button 
                      onClick={() => { setCancelBooking(booking); setIsCancelModalOpen(true); }}
                      className="px-6 py-2 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm"
                    >
                      Request Booking Cancellation
                    </button>
                  )}

                  {(booking.status === 'confirmed' || booking.status === 'live') && (() => {
                    const now = new Date();
                    const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const isoToday = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                    const isToday = booking.date === todayStr || booking.date === isoToday;
                    
                    // If not today, don't show Join button at all — past/future dates
                    if (!isToday) {
                      return (
                        <span className="px-6 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100">
                          {booking.date} · {booking.time}
                        </span>
                      );
                    }
                    
                    const sessionMins = parseTime(booking.time);
                    const nowMins = now.getHours() * 60 + now.getMinutes();
                    const diffMins = sessionMins - nowMins;
                    
                    const durationHrs = parseFloat(booking.duration || '1');
                    const durationMins = durationHrs * 60;
                    
                    const isInJoinWindow = diffMins <= 10 && nowMins <= (sessionMins + durationMins);
                    const isCompleted = nowMins > (sessionMins + durationMins);
                    const gracePeriodMins = 0; // Strictly active per end time for rejoin only
                    const isWayPastEnd = nowMins > (sessionMins + durationMins + gracePeriodMins);
                    const isSubscriptionExpired = booking.isSubscription && booking.subscriptionStatus === 'expired';
                    
                    if ((isInJoinWindow || booking.status === 'live') && !isWayPastEnd) {
                      if (isSubscriptionExpired) {
                        return (
                          <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <button disabled className="px-6 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed border border-slate-200 opacity-70">
                              <Lock size={14} className="mr-1.5 inline" /> Payment Pending
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm('Are you sure you want to permanently cancel this expired subscription?')) {
                                  try {
                                    await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled' });
                                    alert('Subscription permanently cancelled.');
                                  } catch (e) { console.error(e); }
                                }
                              }}
                              className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <XCircle size={12} /> Permanently Cancel
                            </button>
                          </div>
                        );
                      }
                      return (
                        <button 
                          onClick={() => startSession(booking.id)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-blue-500/20 animate-pulse flex items-center justify-center gap-2"
                        >
                          <Video size={14} /> Join Now
                        </button>
                      );
                    }
                    if (isCompleted) {
                      return (
                        <button disabled className="px-6 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed border border-slate-200 flex items-center justify-center gap-1.5 opacity-70">
                          <CheckCircle size={14} /> Session Ended
                        </button>
                      );
                    }
                    // Before the 10 min window — show scheduled time
                    return (
                      <button disabled className="px-6 py-2 bg-primary/5 text-primary/30 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-not-allowed opacity-50">
                        Starts at {booking.time}
                      </button>
                    );
                  })()}

                   {(booking.status === 'confirmed' || booking.status === 'pending') && (() => {
                    const now = new Date();
                    const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const isoToday = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                    const isToday = booking.date === todayStr || booking.date === isoToday;
                    const sessionMins = parseTime(booking.time);
                    const nowMins = now.getHours() * 60 + now.getMinutes();

                    const hasStarted = isToday && nowMins >= sessionMins;
                    const isPast = !isToday && new Date(booking.date) < new Date(isoToday);

                    if (hasStarted || isPast) return null;
                    
                    return (
                      <button 
                        onClick={() => onReschedule(booking)}
                        className="w-10 h-10 rounded-full bg-primary/5 text-primary/60 flex items-center justify-center hover:bg-primary hover:text-background transition-all"
                        title="Reschedule"
                      >
                        <Calendar size={16} />
                      </button>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-20 bg-white/20 rounded-[3rem] border border-dashed border-primary/10">
              <p className="text-primary/30 font-bold uppercase tracking-widest text-xs">No sessions found in {tab} view</p>
            </div>
          )}
        </div>
      </div>
    );
  };

const LoginView = ({ setView, setCurrentUser }: { 
  setView: (view: View) => void, 
  setCurrentUser: (user: StudentProfile | null) => void 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError('');

    try {
      if (!email || !password) {
        setError("⚠️ All fields are mandatory.");
        setIsLoggingIn(false);
        return;
      }

      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      if (!emailRegex.test(email)) {
        setError("Please enter a valid academic email address.");
        setIsLoggingIn(false);
        return;
      }

      // 🔐 SECURE BYPASS CHECK REMOVED


      // 1. Try to sign in via Firebase
      console.log("📡 Attempting Firebase Sign In for:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update password in Firestore to keep it in sync
      const uid = userCredential.user.uid;
      try {
        await updateDoc(doc(db, 'students', uid), { password: password });
        await updateDoc(doc(db, 'users', uid), { password: password });
      } catch (e) {
        console.warn("Failed to sync password to Firestore:", e);
      }
      
      // View transition is handled by onAuthStateChanged listener at the top of the file
    } catch (err: any) {
      console.error("⛔ Student Auth Failure:", err.code || err.message);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "An unexpected error occurred during login.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Using redirect instead of popup to bypass COOP (Cross-Origin-Opener-Policy) issues
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error("Google Login Error:", err.code, err.message);
      setIsGoogleLoading(false);
      alert("Google Sign-In failed: " + err.message);
    }
  };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-primary/5"
        >
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold italic text-on-surface mb-2">Scholar</h1>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-40">Welcome Back</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                <input 
                  type="email" 
                  className="input-field pl-12"
                  value={email}
                  autoComplete="off"
                  onChange={(e) => setEmail(e.target.value)} required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="input-field pl-12 pr-12"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)} required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary transition-colors">
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                type="button"
                onClick={() => setView('forgot-password')} 
                className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-rose-500 font-bold text-[10px] text-center uppercase tracking-widest"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-primary text-background py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg mt-4 disabled:opacity-50"
            >
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
              <span className="px-4 bg-white text-primary/30">Or continue with</span>
            </div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full mt-6 flex items-center justify-center gap-3 bg-white border border-primary/10 py-4 rounded-2xl font-bold hover:bg-primary/5 transition-all shadow-sm disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            <span className="text-sm">{isGoogleLoading ? 'Authenticating...' : 'Sign in with Google'}</span>
          </button>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">
              Don't have an account? <button onClick={() => setView('register')} className="text-accent hover:underline">Register Now</button>
            </p>
          </div>
        </motion.div>
      </div>
    );
  };

const RegisterView = ({ setView, setCurrentUser }: { 
  setView: (view: View) => void, 
  setCurrentUser: (user: StudentProfile | null) => void 
}) => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', mobile: '', class: '', board: '', studentType: '' as 'school' | 'inter' | 'btech' | 'degree' | ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // ⚡ STRICT VALIDATION ⚡
    if (!formData.name || !formData.email || !formData.password || !formData.mobile || !formData.class || !formData.board || !formData.studentType) {
      setError("⚠️ All fields are mandatory.");
      setIsSubmitting(false);
      return;
    }

    if (!/^[A-Za-z\s]+$/.test(formData.name)) {
      setError("❌ Name must contain alphabets only.");
      setIsSubmitting(false);
      return;
    }

    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(formData.email)) {
      setError("❌ Invalid academic email format.");
      setIsSubmitting(false);
      return;
    }

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passRegex.test(formData.password)) {
      setError("Incorrect password format.");
      setIsSubmitting(false);
      return;
    }

    if (formData.mobile.length < 10) {
      setError("❌ Please enter a valid 10-digit number.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCredential.user.uid;

      // 2. Save to Firestore (Students "Table")
      const studentData = {
        id: uid,
        name: formData.name,
        email: formData.email,
        phone: formData.mobile,
        class: formData.class,
        board: formData.board,
        studentType: formData.studentType,
        status: 'EMAIL_NOT_VERIFIED',
        email_verified: false,
        createdAt: serverTimestamp(),
        notifications: { reminders: true, messages: true, updates: true }
      };

      await setDoc(doc(db, 'students', uid), studentData);

      setCurrentUser({
        ...studentData,
        password: formData.password,
        mobile: formData.mobile
      } as any);

      setView('dashboard');
      
      // Notify Backend to send Welcome Email
      try {
        sendPlatformEmail(
          { name: formData.name, email: formData.email }, 
          'student_register'
        );
      } catch(e) { console.warn("Welcome email error:", e) }
    } catch (err: any) {
      console.error("Student Registration Error:", err);
      if (err.code === 'permission-denied') {
        setError("Database Access Denied. Please ensure Firestore Security Rules allow writes to the 'students' collection (check your Firebase Console).");
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl bg-white rounded-3xl p-6 md:p-10 shadow-2xl border border-primary/5"
        >
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold italic text-on-surface mb-2">Scholar</h1>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-primary/40">Create Your Account</p>
          </div>
          
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4" autoComplete="off">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Full Name</label>
              <input type="text" required className="input-field" autoComplete="off" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value.replace(/[^A-Za-z\s]/g, "")})} placeholder="Alphabets only" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Email</label>
              <input type="email" required className="input-field" autoComplete="off" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="example@email.com" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required className="input-field pr-12" autoComplete="new-password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Min 8 chars, 1 Symbol, 1 Num" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary transition-colors">
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Mobile Number</label>
              <input type="tel" required className="input-field" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value.replace(/\D/g, "").slice(0, 10)})} placeholder="10 Digits" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Class</label>
              <input type="text" required className="input-field" value={formData.class} onChange={(e) => setFormData({...formData, class: e.target.value})} placeholder="Current Class/Grade" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Board</label>
              <select 
                className="input-field" 
                value={formData.board} 
                onChange={(e) => setFormData({...formData, board: e.target.value})}
                required
              >
                <option value="">Select Board</option>
                {BOARDS.map(board => (
                  <option key={board} value={board}>{board}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Student Type</label>
              <select 
                className="input-field" 
                value={formData.studentType} 
                onChange={(e) => setFormData({...formData, studentType: e.target.value as any})}
                required
              >
                <option value="">Select Category</option>
                <option value="school">School (1-10)</option>
                <option value="inter">Intermediate / +2</option>
                <option value="btech">B.Tech / Engineering</option>
                <option value="degree">Degree / UG</option>
              </select>
            </div>
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="md:col-span-2 text-rose-500 font-bold text-xs text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="md:col-span-2 bg-primary text-background py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-lg mt-4 disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-primary/40 font-bold">
              Already have an account? <button onClick={() => setView('login')} className="text-accent hover:underline">Login</button>
            </p>
          </div>
        </motion.div>
      </div>
    );
  };

  const NotesView = ({ currentUser, bookings, currentTier, setView }: { currentUser: StudentProfile | null, bookings: Booking[], currentTier: string, setView: (view: View) => void }) => {
    const tierToUse = currentTier || 'free';
  const [notes, setNotes] = useState<any[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [voterNames, setVoterNames] = useState<Record<string, string>>({});
  const [selectedVoters, setSelectedVoters] = useState<{ pollId: string, optionIndex: number } | null>(null);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [zoomScale, setZoomScale] = useState(1);


  // Enrolled subjects for filtering (confirmed, completed, or pending)
  const enrolledSubjects = Array.from(new Set(bookings.filter(b => ['confirmed', 'completed', 'pending'].includes(b.status)).map(b => b.subject.toLowerCase())));
  const studentEmailKey = currentUser?.email?.replace(/\./g, '_') || '';

  useEffect(() => {
    if (!currentUser) return;

    // Listen to Notes - targets specific class & subject
    const qNotes = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribeNotes = onSnapshot(qNotes, (snapshot) => {
      const allNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const normalize = (s: string = '') => s.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const bookingClasses = Array.from(new Set(bookings.map(b => normalize(b.studentClass || b.class || ''))));
      const profileClass = normalize(currentUser.class);
      const studentClasses = Array.from(new Set([profileClass, ...bookingClasses].filter(Boolean)));
      
      const normalizedEnrolled = enrolledSubjects.map(normalize);

      const filtered = allNotes.filter((n: any) => {
        const target = n.targetClass || n.class || '';
        const normTarget = normalize(target);
        
        const extractNumber = (s: string) => { const m = s.match(/\d+/); return m ? m[0] : null; };
        const targetNum = extractNumber(normTarget);

        // Match logic: If note has no specific target class or targets 'All', show to all.
        // Otherwise, match against the student's known classes (profile + bookings).
        const matchesClass = !target || normTarget === 'all' || normTarget === 'any' || 
                           studentClasses.some(c => c === normTarget) ||
                           (studentClasses.some(c => c.includes('btech')) && normTarget.includes('graduate')) ||
                           (studentClasses.some(c => c.includes('graduate')) && normTarget.includes('btech')) ||
                           // Add logic for numbered classes (e.g. "10th" vs "10")
                           studentClasses.some(c => normTarget.includes(c) || c.includes(normTarget)) ||
                           // robust number matching (e.g. "5th cls" vs "Class 5")
                           (targetNum && studentClasses.some(c => extractNumber(c) === targetNum));
        
        // Subject filter: Restrict by subject according to user request
        const matchesSubject = enrolledSubjects.length === 0 || 
                             !n.subject || normalize(n.subject) === 'all' || normalize(n.subject) === 'any' ||
                             normalizedEnrolled.includes(normalize(n.subject)) ||
                             normalizedEnrolled.some(enrolled => normalize(n.subject).includes(enrolled) || enrolled.includes(normalize(n.subject)));
        
        return matchesClass && matchesSubject;
      });
      setNotes(filtered);
      setNotesLoading(false);
    });

    // Listen to Polls - targets specific class
    const qPolls = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    const unsubscribePolls = onSnapshot(qPolls, (snapshot) => {
      const allPolls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poll));
      
      const normalize = (s: string = '') => s.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const bookingClasses = Array.from(new Set(bookings.map(b => normalize(b.studentClass || b.class || ''))));
      const profileClass = normalize(currentUser.class);
      const studentClasses = Array.from(new Set([profileClass, ...bookingClasses].filter(Boolean)));
      const normalizedEnrolled = enrolledSubjects.map(normalize);

      const filtered = allPolls.filter((p) => {
        const target = p.targetClass || '';
        const normTarget = normalize(target);
        
        const extractNumber = (s: string) => { const m = s.match(/\d+/); return m ? m[0] : null; };
        const targetNum = extractNumber(normTarget);
        
        const matchesClass = !target || normTarget === 'all' || normTarget === 'any' || 
                           studentClasses.some(c => c === normTarget) ||
                           (studentClasses.some(c => c.includes('btech')) && normTarget.includes('graduate')) ||
                           (studentClasses.some(c => c.includes('graduate')) && normTarget.includes('btech')) ||
                           studentClasses.some(c => normTarget.includes(c) || c.includes(normTarget)) ||
                           (targetNum && studentClasses.some(c => extractNumber(c) === targetNum));
                           
        const matchesSubject = enrolledSubjects.length === 0 || 
                             !p.topic || normalize(p.topic) === 'all' || normalize(p.topic) === 'any' ||
                             normalizedEnrolled.includes(normalize(p.topic)) ||
                             normalizedEnrolled.some(enrolled => normalize(p.topic).includes(enrolled) || enrolled.includes(normalize(p.topic)));
                             
        return matchesClass && matchesSubject;
      });
      setPolls(filtered);
    });

    return () => {
      unsubscribeNotes();
      unsubscribePolls();
    };
  }, [currentUser?.id, currentUser?.class, enrolledSubjects.join(',')]);

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!currentUser?.email) return;
    const pollRef = doc(db, 'polls', pollId);
    const pollSnap = await getDoc(pollRef);
    if (!pollSnap.exists()) return;

    const data = pollSnap.data() as Poll;
    const newOptions = [...data.options.map(o => ({ ...o, votes: [...o.votes] }))];
    const voterId = currentUser.id || studentEmailKey; // Prefer student UID

    const isAlreadyVoted = newOptions[optionIndex].votes.includes(voterId);
    const userSelections = newOptions.filter(o => o.votes.includes(voterId)).length;

    if (data.allowMultiple) {
      if (isAlreadyVoted) {
        // Prevent unselecting last option
        if (userSelections > 1) {
          newOptions[optionIndex].votes = newOptions[optionIndex].votes.filter(id => id !== voterId);
        }
      } else {
        newOptions[optionIndex].votes.push(voterId);
      }
    } else {
      if (isAlreadyVoted) return; 
      newOptions.forEach(opt => {
        opt.votes = opt.votes.filter(id => id !== voterId);
      });
      newOptions[optionIndex].votes.push(voterId);
    }

    await updateDoc(pollRef, { options: newOptions });

    // Notify Tutor via tutor_notifications
    try {
      await addDoc(collection(db, 'tutor_notifications'), {
        tutorId: data.tutorId,
        type: 'update',
        title: 'New Poll Reaction 📊',
        message: `${currentUser.name || 'A student'} reacted to your poll: "${data.question.substring(0, 30)}..."`,
        createdAt: serverTimestamp(),
        read: false,
        link: 'notes',
        pollId: pollId
      });
    } catch (e) {
      console.error("Failed to notify tutor:", e);
    }
  };

  const openVotersModal = async (pollId: string, optionIndex: number, voters: string[]) => {
    setSelectedVoters({ pollId, optionIndex });
    const missing = voters.filter(id => !voterNames[id]);
    if (missing.length > 0) {
      const newNames = { ...voterNames };
      for (const id of missing) {
        try {
          // Priority 1: Check students/users collections by ID
          let sDoc = await getDoc(doc(db, 'students', id));
          if (!sDoc.exists()) sDoc = await getDoc(doc(db, 'users', id));
          
          if (sDoc.exists()) {
             const data = sDoc.data() || {};
             newNames[id] = data.name || data.fullName || 'Student Participant';
          } else if (id.includes('_') || id.includes('@')) {
             // Priority 2: Deep Query by email if ID is an email-key or raw email
             const email = id.includes('@') ? id : id.replace(/_/g, '.');
             const q = query(collection(db, 'students'), where('email', '==', email));
             const snap = await getDocs(q);
             if (!snap.empty) {
                newNames[id] = snap.docs[0].data().name || 'Student Participant';
             } else {
                newNames[id] = 'Student Participant';
             }
          } else {
             newNames[id] = 'Student Participant';
          }
        } catch (e) {
          newNames[id] = 'Student';
        }
      }
      setVoterNames(newNames);
    }
  };

  if (notesLoading) return <div className="p-20 text-center"><RefreshCw className="animate-spin inline text-primary" size={32} /></div>;

  const allItems = [...notes.map(n => ({ ...n, itemType: 'note' })), ...polls.map(p => ({ ...p, itemType: 'poll' }))];
  const uniqueDates = Array.from(new Set(allItems.map(i => formatDateLabel(i.createdAt)).filter(Boolean)));
  const uniqueTopics = Array.from(new Set(allItems.map(i => i.topic).filter(Boolean)));

  const filteredNotes = notes.filter(n => {
    const dMatch = !selectedDate || formatDateLabel(n.createdAt) === selectedDate;
    const tMatch = !selectedTopic || n.topic === selectedTopic;
    return dMatch && tMatch;
  });

  const filteredPolls = polls.filter(p => {
    const dMatch = !selectedDate || formatDateLabel(p.createdAt) === selectedDate;
    const tMatch = !selectedTopic || p.topic === selectedTopic;
    return dMatch && tMatch;
  });

  const ItemsContainer = () => (
    <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12 pb-20 overflow-x-hidden">
      {/* Date Filter Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-6 scrollbar-hide">
        <button 
          onClick={() => setSelectedDate(null)}
          className={cn(
            "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
            selectedDate === null ? "bg-primary text-white" : "bg-white border border-black/5 text-primary/40 hover:border-primary/20 shadow-sm"
          )}
        >
          All Timeline
        </button>
        {uniqueDates.map(date => (
          <button 
            key={date}
            onClick={() => setSelectedDate(date)}
            className={cn(
              "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
              selectedDate === date ? "bg-primary text-white" : "bg-white border border-black/5 text-primary/40 hover:border-primary/20 shadow-sm"
            )}
          >
            {date}
          </button>
        ))}
      </div>

      {uniqueTopics.length > 0 && (
         <div className="flex items-center gap-2 overflow-x-auto pb-4">
            {uniqueTopics.map(topic => (
              <button 
                key={topic}
                onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap border",
                  selectedTopic === topic ? "bg-secondary text-white border-secondary" : "bg-secondary/5 text-secondary border-secondary/10"
                )}
              >
                {topic}
              </button>
            ))}
         </div>
      )}
      <section className="space-y-8">
        <h3 className="text-xl font-serif font-black italic flex items-center gap-3">
          <Book className="text-primary" size={24} /> Subject Materials
        </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white/40 rounded-[3rem] border border-dashed border-primary/10">
              <FileText size={32} className="mx-auto text-primary/10 mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30">No materials matched for this selection</p>
            </div>
          ) : filteredNotes.map(note => (
            <motion.div 
              key={note.id} 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-white rounded-[2.5rem] border border-black/5 hover:shadow-2xl transition-all group flex flex-col h-full"
            >
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 bg-primary/5 rounded-[1.5rem] flex items-center justify-center text-primary group-hover:scale-110 transition-transform overflow-hidden border border-primary/10">
                   {note.fileType?.startsWith('image/') ? (
                     <img src={note.fileData} className="w-full h-full object-cover" alt="" />
                   ) : (
                     <FileText size={28} />
                   )}
                </div>
                <div className="flex flex-col items-end gap-1">
                   <div className="px-3 py-1 bg-slate-50 rounded-full border border-black/5">
                      <span className="text-[8px] font-black uppercase text-primary/40 tracking-tighter">
                         {note.fileType?.split('/')[1]?.toUpperCase() || 'DOC'}
                      </span>
                   </div>
                </div>
              </div>

              <div className="mt-8 flex-1">
                <h4 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">{note.fileName}</h4>
                <div className="flex items-center gap-2 mt-2">
                   {note.topic && <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-emerald-100">{note.topic}</span>}
                   <span className="text-[10px] font-black uppercase tracking-[0.15em] text-primary/30">{note.subject}</span>
                   <span className="w-1 h-1 bg-primary/20 rounded-full" />
                   <span className="text-[10px] font-bold text-primary/40">Shared by {note.tutorName}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-black/5 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setViewingDoc(note)}
                      className="py-4 bg-primary/5 hover:bg-primary text-primary hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-primary/10"
                    >
                       <Eye size={16} /> View
                    </button>
                    <a 
                      href={note.fileData} 
                      download={note.fileName}
                      className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 hover:scale-[1.02]"
                    >
                       <Download size={16} /> Save
                    </a>
                  </div>
                  
                  <div className="flex items-center justify-between px-2 pt-2">
                     <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold border border-white">{note.tutorName?.charAt(0)}</div>
                        <span className="text-[9px] font-black text-primary/20 uppercase">{formatTime(note.createdAt)}</span>
                     </div>
                     <span className="text-[7px] font-black text-primary/40 uppercase tracking-tighter px-1.5 py-0.5 border border-primary/5 rounded-sm">
                        Secured Document
                     </span>
                  </div>
               </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <h3 className="text-xl font-serif font-black italic flex items-center gap-3">
          <BarChart3 className="text-secondary" size={24} /> Active Polls
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPolls.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white/40 rounded-[3rem] border border-dashed border-primary/10">
              <Smile size={32} className="mx-auto text-primary/10 mb-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30">No polls matched for this selection</p>
            </div>
          ) : filteredPolls.map(poll => {
            const allVotesArray = poll.options?.flatMap(o => o.votes || []) || [];
            const uniqueVoters = Array.from(new Set(allVotesArray));
            const totalUniqueVoters = uniqueVoters.length;
            const hasVoted = uniqueVoters.includes(currentUser?.id || '') || uniqueVoters.includes(studentEmailKey);

            return (
              <motion.div 
                key={poll.id} 
                className="p-5 bg-white rounded-[1.5rem] border border-black/5 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                     <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-secondary uppercase tracking-widest bg-secondary/5 px-3 py-1 rounded-full border border-secondary/10">Active Poll</span>
                        {poll.topic && <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest border border-black/5 px-2 py-1 rounded-full">{poll.topic}</span>}
                     </div>
                     <span className="text-[8px] font-bold text-primary/20 uppercase tracking-widest">{formatTime(poll.createdAt)}</span>
                  </div>
                  <h4 className="text-base font-bold text-on-surface leading-tight">{poll.question}</h4>
                </div>

                <div className="space-y-3">
                  {poll.options.map((option, idx: number) => {
                    const optionVoters = option.votes || [];
                    const percentage = totalUniqueVoters > 0 ? Math.round((optionVoters.length / totalUniqueVoters) * 100) : 0;
                    const isSelected = optionVoters.includes(currentUser?.id || studentEmailKey);

                    return (
                      <div key={idx} className="space-y-2">
                        <button 
                          onClick={() => handleVote(poll.id, idx)}
                          className={cn(
                            "w-full p-2.5 px-4 rounded-xl border transition-all relative overflow-hidden group text-left",
                            isSelected ? "bg-primary border-primary text-background shadow-lg shadow-primary/20 scale-[1.01]" : "bg-white border-black/5 hover:border-primary/20 hover:bg-primary/5"
                          )}
                        >
                          <div className="relative z-10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isSelected ? <CheckCircle size={18} /> : <Circle size={18} className="text-primary/10 group-hover:text-primary/30" />}
                              <span className="text-sm font-bold">{option.text}</span>
                            </div>
                            <span className={cn("text-sm font-black italic", isSelected ? "opacity-80" : "text-primary/30")}>{percentage}%</span>
                          </div>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={cn("absolute left-0 top-0 bottom-0 opacity-10", isSelected ? "bg-white" : "bg-primary")} />
                        </button>
                      
                        <div className="flex items-center justify-between px-2">
                           <div className="flex -space-x-1.5">
                              {optionVoters.slice(0, 5).map((vUid, i) => (
                                <div 
                                  key={i} 
                                  onClick={() => openVotersModal(poll.id, idx, optionVoters)}
                                  className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-primary cursor-pointer hover:z-10 hover:scale-110 transition-all"
                                >
                                  {voterNames[vUid]?.charAt(0) || 'S'}
                                </div>
                              ))}
                              {optionVoters.length > 5 && (
                                <button onClick={() => openVotersModal(poll.id, idx, optionVoters)} className="w-6 h-6 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-primary/30">+{optionVoters.length - 5}</button>
                              )}
                           </div>
                           <span className="text-[9px] font-black text-primary/20 uppercase tracking-tighter">{optionVoters.length} responses</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-black/5 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[8px] font-black text-primary/40 uppercase tracking-widest">
                     <Users size={12} /> {totalUniqueVoters} Students Participated
                   </div>
                   <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">
                     <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                     <span className="text-[8px] font-black uppercase tracking-tighter">Live Result</span>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <Modal isOpen={!!selectedVoters} onClose={() => setSelectedVoters(null)} title="Voter Profiles">
        {selectedVoters && (() => {
          const poll = polls.find(p => p.id === selectedVoters.pollId);
          if (!poll) return null;
          const optionVoters = poll.options[selectedVoters.optionIndex].votes || [];
          return (
            <div className="space-y-4">
              <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                <p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] mb-2">Option Selected</p>
                <p className="text-xl font-bold italic text-primary">"{poll.options[selectedVoters.optionIndex].text}"</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {optionVoters.map((vUid, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-black/5 hover:border-primary/20 transition-all">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary">{voterNames[vUid]?.charAt(0) || 'S'}</div>
                       <span className="font-bold text-on-surface">{voterNames[vUid] || 'Scholar User'}</span>
                     </div>
                     {(vUid === currentUser?.id || vUid === studentEmailKey) && <span className="bg-primary text-background text-[8px] font-black uppercase px-2 py-1 rounded-md">You</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* FULL SCREEN VIEWER - TRUE FULLSCREEN */}
      <AnimatePresence>
        {viewingDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="relative w-full h-full flex flex-col items-center justify-center"
             >
                {/* Compact Exit Button */}
                <button 
                  onClick={() => { setViewingDoc(null); setZoomScale(0.9); }} 
                  className="fixed top-4 right-4 z-[110] bg-white/5 hover:bg-white/10 backdrop-blur-md p-2.5 rounded-full text-white/70 hover:text-white transition-all border border-white/10"
                >
                   <X size={20} />
                </button>

                {/* ZOOM CONTROLS - COMPACT */}
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
                   <button 
                     onClick={() => setZoomScale(prev => Math.max(0.1, prev - 0.1))}
                     className="p-2 text-white hover:bg-white/20 rounded-xl transition-all"
                   >
                      <Minus size={20} />
                   </button>
                   <div className="w-12 text-center">
                      <span className="text-white font-black text-[10px] uppercase tracking-widest">{Math.round(zoomScale * 100)}%</span>
                   </div>
                   <button 
                     onClick={() => setZoomScale(prev => Math.min(3, prev + 0.1))}
                     className="p-2 text-white hover:bg-white/20 rounded-xl transition-all"
                   >
                      <Plus size={20} />
                   </button>
                </div>

                {/* Content Area - Occupies Entire Screen */}
                <div className="flex-1 w-full h-full bg-[#0a0a0b] overflow-auto custom-scrollbar flex items-center justify-center p-2">
                   <motion.div 
                     animate={{ scale: zoomScale }}
                     transition={{ type: "spring", stiffness: 300, damping: 30 }}
                     className="origin-center flex items-center justify-center"
                   >
                      {viewingDoc.fileType?.startsWith('image/') ? (
                        <img 
                          src={viewingDoc.fileData} 
                          className="max-w-[96vw] max-h-[96vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 rounded-md" 
                          alt={viewingDoc.fileName} 
                        />
                      ) : (
                        <div className="w-[96vw] h-[96vh] bg-white rounded-md shadow-2xl overflow-hidden border border-white/10">
                           <iframe 
                             src={`${viewingDoc.fileData}#toolbar=0&view=FitH`} 
                             className="w-full h-full border-none"
                             title="PDF Viewer"
                           />
                        </div>
                      )}
                   </motion.div>
                </div>
                
                {/* Discrete Security Watermark */}
                <div className="fixed bottom-6 right-6 opacity-10 pointer-events-none select-none z-[110]">
                   <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">SCHOLAR PRIVATE CONTENT • {viewingDoc.fileName}</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  // 🔒 Feature Gating Logic (Plan-based Access)
  const isGated = currentTier === 'free' || currentTier === 'scholarship';
  
  if (isGated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-10 text-center animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center mb-8 relative">
           <FileText size={40} className="text-primary/20" />
           <Lock size={20} className="absolute -top-1 -right-1 text-rose-500" />
        </div>
        <h2 className="text-3xl font-serif font-black italic text-slate-800 mb-4 tracking-tight">Academic Notes Locked</h2>
        <p className="max-w-md text-slate-500 font-medium leading-relaxed mb-10">
          Get unlimited access to premium tutor notes, subject materials, and curriculum guides by upgrading to Scholar Standard or Elite.
        </p>
        <button 
          onClick={() => setView('settings')}
          className="px-10 py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          Explore Pricing Plans
        </button>
      </div>
    );
  }

  return <ItemsContainer />;
};

function ForgotPasswordView({ setView }: { setView: (view: View) => void }) {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleEmailSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);
      
      try {
        const hostname = window.location.hostname;
        const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || `http://${hostname}:5001`;
        const response = await fetch(`${backendBaseUrl}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
          setSuccess("✅ Reset link sent! Check your inbox.");
          setTimeout(() => setStep('reset'), 2000);
        } else {
          setError(data.message || "Failed to send reset link.");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const handleReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      
      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
      if (!passRegex.test(newPassword)) {
        setError("Invalid format.");
        return;
      }

      setIsLoading(true);
      try {
        // Here we would normally call confirmPasswordReset(auth, oobCode, newPassword)
        // Since we are simulating a custom flow for the user's demo:
        setSuccess("✅ Password updated successfully! Redirecting to login...");
        setTimeout(() => setView('login'), 2000);
      } catch (err: any) {
        setError(err.message || "Failed to update password.");
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl p-6 md:p-10 shadow-2xl border border-primary/5"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif font-bold italic text-on-surface mb-2">Scholar</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-primary/40">Secure Recovery</p>
          </div>
          
          <AnimatePresence mode="wait">
            {error && <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-rose-500 text-[10px] font-bold text-center uppercase mb-4 tracking-widest">{error}</motion.p>}
            {success && <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-emerald-500 text-[10px] font-bold text-center uppercase mb-4 tracking-widest">{success}</motion.p>}
          </AnimatePresence>

          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <p className="text-xs text-primary/60 text-center font-medium leading-relaxed">Enter your registered email address to receive a secure recovery link.</p>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                  <input type="email" required className="input-field pl-12" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <button disabled={isLoading} type="submit" className="w-full bg-primary text-background py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">
                {isLoading ? 'Verifying...' : 'Send Recovery Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
               <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                  <input type="password" required className="input-field pl-12" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                  <input type="password" required className="input-field pl-12" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isLoading || !newPassword || newPassword !== confirmPassword}
                className="w-full bg-primary text-background py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all bg-primary disabled:opacity-50 disabled:grayscale disabled:scale-100 shadow-lg shadow-primary/20"
              >
                {isLoading ? 'Updating...' : 'Update & Sign In'}
              </button>
            </form>
          )}
          
          <div className="mt-8 text-center">
            <button onClick={() => setView('login')} className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline">Back to Identification</button>
          </div>
        </motion.div>
      </div>
    );
  };

const Sidebar = ({ view, setView, isMobileSidebarOpen, setIsMobileSidebarOpen, handleLogout, currentUser, chats, currentTier, effectiveSubscription }: { 
  view: View, 
  setView: (view: View) => void, 
  isMobileSidebarOpen: boolean, 
  setIsMobileSidebarOpen: (open: boolean) => void, 
  handleLogout: () => void, 
  currentUser: StudentProfile | null, 
  chats: Chat[],
  currentTier: string,
  effectiveSubscription: { isExpired: boolean }
}) => (
  <>
    {/* Mobile Overlay */}
    <AnimatePresence>
      {isMobileSidebarOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-primary/40 backdrop-blur-sm z-[60] md:hidden"
        />
      )}
    </AnimatePresence>

    <aside className={cn(
      "planner-sidebar w-64 lg:w-72 fixed top-0 left-0 h-screen z-[70] transition-transform duration-300 ease-in-out",
      isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      view === 'chat' ? 'md:hidden' : ''
    )}>
      <div className="flex items-center justify-between mb-6">
        <a href="http://localhost:5173" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
            <GraduationCap className="text-primary" size={24} />
          </div>
          <span className="font-serif text-2xl font-bold italic group-hover:text-white transition-colors">Scholar</span>
        </a>
        <button 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden p-2 text-background/60 hover:text-background"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav-container overflow-visible">
        {[
          { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
          { id: 'find-tutors', name: 'Find Tutors', icon: Search },
          { id: 'my-bookings', name: 'My Bookings', icon: Calendar },
          { id: 'payments', name: 'Payments', icon: DollarSign },
          { id: 'progress', name: 'Progress', icon: BarChart2 },
          ...(currentTier !== 'free' ? [
            { id: 'notes', name: 'Notes', icon: FileText },
          ] : []),
          ...(currentTier === 'premium' ? [
            { id: 'assignments', name: 'Assignments', icon: FileCheck },
            { id: 'projects', name: 'Projects', icon: Briefcase },
          ] : []),
          { id: 'chat', name: 'Chat', icon: MessageSquare, badge: chats.filter(c => c.unreadCount > 0).length },
          { id: 'reviews', name: 'Reviews', icon: Star },
          { id: 'settings', name: 'My Profile', icon: Settings },
          { id: 'logout', name: 'Logout', icon: LogOut },
        ].map((item) => (
          <motion.button 
            key={item.id}
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (item.id === 'logout') {
                handleLogout();
              } else {
                setView(item.id as View);
                setIsMobileSidebarOpen(false);
              }
            }}
            className={cn(
              "sidebar-item w-full",
              view === item.id ? "sidebar-item-active" : ""
            )}
          >
            <item.icon size={20} className={cn(view === item.id ? "text-primary" : "text-on-surface/50")} />
            <span className="flex-1 text-left">{item.name}</span>
            {item.badge && item.badge > 0 && (
              <span className="bg-primary text-background text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-primary/20">{item.badge}</span>
            )}
          </motion.button>
        ))}
      </nav>

      <div className="mt-auto px-4 py-6 border-t border-gray-100">
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] text-on-surface-variant font-black uppercase tracking-widest">Active Plan</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm",
              currentTier === 'premium' ? "bg-amber-400 text-white shadow-amber-200" :
              currentTier === 'standard' ? "bg-blue-500 text-white shadow-blue-200" :
              "bg-slate-300 text-on-surface/60"
            )}>
              {currentTier === 'free' ? (effectiveSubscription.isExpired ? 'Trial Ended' : 'Free') : currentTier.toUpperCase()}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
             <div 
               className={cn(
                 "h-full transition-all duration-1000",
                 currentTier === 'premium' ? "bg-amber-400 w-full" :
                 currentTier === 'standard' ? "bg-blue-500 w-2/3" :
                 "bg-slate-300 w-1/3"
               )}
             />
          </div>
        </div>
      </div>

    </aside>
  </>
);

const Topbar = ({ view, setIsMobileSidebarOpen, isNotifOpen, setIsNotifOpen, notifications, markNotifRead, setView, currentUser, handleLogout, notifBgMap, notifIconMap, formatTime }: {
  view: View,
  setIsMobileSidebarOpen: (open: boolean) => void,
  isNotifOpen: boolean,
  setIsNotifOpen: (open: boolean) => void,
  notifications: Notification[],
  markNotifRead: (id: string) => void,
  setView: (view: View) => void,
  currentUser: StudentProfile | null,
  handleLogout: () => void,
  notifBgMap: any,
  notifIconMap: any,
  formatTime: any
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  return (
    <header className="flex items-center justify-between mb-4 md:mb-6">
    <div className="flex items-center gap-4">
      <button 
        onClick={() => setIsMobileSidebarOpen(true)}
        className="md:hidden w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center text-primary"
      >
        <Menu size={20} />
      </button>
      <h2 className="text-[10px] md:text-sm font-bold uppercase tracking-[0.2em] text-primary/30">{view.replace('-', ' ')}</h2>
    </div>
    
    <div className="flex items-center gap-3 md:gap-6">
      <div className="relative">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          className="p-2 md:p-2.5 bg-primary/5 text-primary hover:bg-primary/10 rounded-xl transition-all relative border border-primary/5"
        >
          <Bell size={18} />
          {notifications.some(n => !n.read) && <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-background"></span>}
        </motion.button>

        <AnimatePresence>
          {isNotifOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-[2rem] shadow-2xl border border-primary/5 overflow-hidden z-50"
            >
              <div className="p-6 border-b border-primary/5 flex items-center justify-between">
                <h4 className="font-bold text-on-surface">Notifications</h4>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? notifications.map(n => (
                  <button 
                    key={n.id}
                    onClick={() => {
                      markNotifRead(n.id);
                      setView(n.link as View);
                      setIsNotifOpen(false);
                    }}
                    className={`w-full p-4 md:p-6 text-left hover:bg-primary/5 transition-colors border-b border-primary/5 last:border-0 flex items-start gap-3 ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${notifBgMap[n.type as keyof typeof notifBgMap] || 'bg-primary/10'}`}>
                      {notifIconMap[n.type as keyof typeof notifIconMap] || <Bell size={14} className="text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-bold text-on-surface">{n.title}</p>
                      <p className="text-[10px] md:text-xs text-on-surface-variant mt-1">{n.message}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock size={10} className="text-on-surface-variant opacity-40" />
                        <p className="text-[9px] md:text-[10px] text-on-surface-variant opacity-40 font-bold uppercase tracking-widest">{formatTime(n.time)}</p>
                      </div>
                    </div>
                  </button>
                )) : (
                  <div className="p-8 text-center text-primary/30 font-bold uppercase tracking-widest text-xs">No notifications</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex items-center gap-3 pl-6 border-l border-primary/10">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center gap-3 hover:bg-primary/5 p-2 rounded-2xl transition-all"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold">{currentUser?.name || 'Alex Johnson'}</p>
            <p className="text-[9px] font-black text-primary/30 uppercase tracking-[0.15em]">{currentUser?.class ? `Grade ${currentUser.class}` : 'Scholar Student'}</p>
          </div>
          <Avatar src="" initials={currentUser?.name?.charAt(0) || 'S'} />
        </motion.button>

        <AnimatePresence>
          {isProfileOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 top-full mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-primary/5 overflow-hidden z-50"
            >
              <button 
                onClick={() => { setView('settings'); setIsProfileOpen(false); }}
                className="w-full px-6 py-4 text-left text-sm font-bold hover:bg-primary/5 flex items-center gap-3"
              >
                <User size={16} /> My Profile
              </button>
              <button 
                onClick={handleLogout}
                className="w-full px-6 py-4 text-left text-sm font-bold hover:bg-primary/5 flex items-center gap-3 text-rose-500 border-t border-primary/5"
              >
                <LogOut size={16} /> Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </header>
);
};

function ProgressTrackerView({ setView, bookings }: { setView: (view: View) => void, bookings: Booking[] }) {
    const activeBookings = bookings.filter(b => b.status !== 'cancelled');
    const bookedSubjects = Array.from(new Set(activeBookings.map(b => b.subject)));
    const attendedSessions = bookings.filter(b => b.attendance_status === 'attended');
    
    const courseCount = bookedSubjects.length;
    const tutorCount = Array.from(new Set(activeBookings.map(b => b.tutorId))).length;
    const studyHours = attendedSessions.length * 1; // Assuming 1hr avg
    const totalHours = studyHours;
    const gpa = (Math.min(3.0 + (studyHours * 0.05), 4.0)).toFixed(1);
    
    const subjectsData = bookedSubjects.map(sub => {
      const subSessions = bookings.filter(b => b.subject === sub);
      const attended = subSessions.filter(b => b.attendance_status === 'attended').length;
      const latest = subSessions.length > 0 ? subSessions[0] : null;
      const limit = latest?.plan === 'course_45' ? 45 : 
                    latest?.plan === 'course_60' ? 60 : 
                    latest?.plan === 'monthly' ? 26 : 
                    (latest?.plan === 'subscription' || latest?.plan === 'course') ? 78 : 12;
      const progress = Math.min(Math.round((attended / limit) * 100), 100);
      
      return {
        id: sub,
        title: sub,
        category: latest?.plan?.startsWith('course') ? 'Technical Course' : 'Academic Class',
        progress: progress,
        totalTasks: limit,
        completedTasks: attended,
        dueDate: 'Flexible',
        color: progress > 80 ? 'bg-emerald-500' : progress > 50 ? 'bg-primary' : 'bg-accent'
      };
    });

    const gradesData = bookedSubjects.length > 0 ? bookedSubjects.map(sub => {
      const subAttended = attendedSessions.filter(b => b.subject === sub).length;
      return {
        subject: sub,
        score: Math.min(75 + (subAttended * 3), 98)
      };
    }) : [{ subject: 'Join a Course', score: 0 }];

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 md:space-y-12"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
          {[
            { label: 'Ongoing Courses', value: courseCount.toString(), icon: Book, color: 'text-primary' },
            { label: 'Tutors Information', value: tutorCount.toString(), icon: Users, color: 'text-accent' },
            { label: 'Total Study Hours', value: studyHours.toString(), icon: Clock, color: 'text-primary' }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 md:p-8 bg-white/40 backdrop-blur-md rounded-[2rem] shadow-sm flex items-center gap-4"
            >
              <div className={`p-3 rounded-2xl bg-primary/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40">{stat.label}</p>
                <h4 className="text-2xl font-bold">{stat.value}</h4>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 p-6 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] shadow-sm"
          >
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div>
                <h3 className="text-xl md:text-2xl font-serif font-bold italic">Learning Progress</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mt-1">Your active goals and modules</p>
              </div>
              <div className="flex items-center gap-2 text-primary/40">
                <Target size={18} />
              </div>
            </div>

            <div className="space-y-6 md:space-y-8">
              {subjectsData.map((goal, i) => (
                <motion.div 
                  key={goal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${goal.color.replace('bg-', 'bg-')}`} />
                      <span className="font-bold text-base md:text-lg">{goal.title}</span>
                      <span className="pill-tag text-[8px] md:text-[9px]">{goal.category}</span>
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-primary/40">{goal.progress}%</span>
                  </div>
                  <div className="h-2 md:h-3 bg-primary/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                      className={`h-full ${goal.color}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-primary/30">
                    <span>{goal.completedTasks} / {goal.totalTasks} Tasks Completed</span>
                    <span>Due: {goal.dueDate}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 md:p-10 bg-primary text-background rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col justify-between"
          >
            <div>
              <TrendingUp size={24} className="mb-4 md:mb-6 opacity-50" />
              <h3 className="text-2xl md:text-3xl font-serif font-bold italic mb-2">Academic Standing</h3>
              <p className="text-background/50 text-[10px] font-bold uppercase tracking-widest">Current Semester Performance</p>
            </div>
            <div className="mt-8 md:mt-12 space-y-4 md:space-y-6">
              <div className="flex items-end gap-3 md:gap-4">
                <span className="text-5xl md:text-7xl font-serif font-black tracking-tighter">{gpa}</span>
                <span className="text-lg md:text-xl font-bold mb-2 md:mb-3 opacity-40">/ 4.0</span>
              </div>
              <p className="text-xs md:text-sm text-background/60 leading-relaxed">
                You're showing consistent improvement in {bookedSubjects.length > 0 ? bookedSubjects.join(' and ') : 'your studies'}. {totalHours > 0 ? `You've already spent ${totalHours} hours mastering your subjects!` : 'Start your first session to begin tracking your progress!'}
              </p>
              <div className="pt-4 md:pt-6 border-t border-background/10">
                <div className="flex items-center justify-between text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">
                  <span>Sessions Completed</span>
                  <span>{attendedSessions.length} / 50</span>
                </div>
                <div className="h-1 bg-background/10 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-accent w-3/4" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] shadow-sm border-none"
          >
            <h3 className="text-xl md:text-2xl font-serif font-bold italic mb-6 md:mb-8">Grade Distribution</h3>
            <div className="h-48 md:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(20, 43, 35, 0.05)" />
                  <XAxis 
                    dataKey="subject" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: 'rgba(20, 43, 35, 0.4)' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: 'rgba(20, 43, 35, 0.4)' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(20, 43, 35, 0.02)' }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '1rem', 
                      border: '1px solid rgba(20, 43, 35, 0.05)',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                      padding: '1rem'
                    }}
                  />
                  <Bar dataKey="score" radius={[10, 10, 0, 0]}>
                    {gradesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#142B23' : '#F27D26'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-10 bg-white/40 backdrop-blur-md rounded-[3rem] shadow-sm"
          >
            <h3 className="text-2xl font-serif font-bold italic mb-8">Recent Sessions</h3>
            <div className="space-y-4">
              {bookedSubjects.length > 0 ? attendedSessions.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-6 bg-white/40 rounded-2xl hover:bg-white/60 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/5 text-primary">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Completed {item.subject} Session</p>
                      <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest mt-0.5">{item.date} at {item.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary">Excellent</p>
                    <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Progress</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">No recent sessions</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  };

function ReviewsView({ bookings, tutors, currentUser, setBookings, getReputation }: { bookings: Booking[], tutors: Tutor[], currentUser: StudentProfile | null, setBookings: any, getReputation: any }) {
    const [reviewedIds, setReviewedIds] = useState<string[]>(() => {
      const saved = localStorage.getItem('scholar_reviewed_ids');
      return saved ? JSON.parse(saved) : [];
    });

    const [activeHistoryTutor, setActiveHistoryTutor] = useState<string | null>(null);

    const pendingReviews = (bookings || []).filter(b => b.status === 'completed' && !b.reviewSubmitted);
    const pastReviews = (bookings || []).filter(b => b.reviewSubmitted);

    const allBookings = bookings.filter(b => b.status !== 'cancelled');
    const bookedTutorIds = Array.from(new Set(allBookings.map(b => b.tutorId)));
    
    const interactionTutorIds = bookedTutorIds.length === 0 
      ? tutors.map(t => t.id) 
      : bookedTutorIds;

    const [reviewForm, setReviewForm] = useState<{bookingId: string | null, rating: number, comment: string}>({
      bookingId: null,
      rating: 0,
      comment: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
      <div className="max-w-7xl mx-auto pb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 px-4 gap-6">
          <div>
            <h1 className="page-title !text-3xl mb-2">My Tutors</h1>
            <p className="text-primary/40 text-xs font-bold uppercase tracking-[0.2em]">Manage reputation & feedback for your educators</p>
          </div>
          <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-primary/5">
             <div className="px-4 py-2 bg-primary text-background rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default">
               Active Tutors: {interactionTutorIds.length}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
          {interactionTutorIds.map(tId => {
            const tutor = tutors.find(t => t.id === tId) || { id: tId, name: 'Tutor', avatar: '', subjects: [] } as any;
            const tutorPending = pendingReviews.filter(b => b.tutorId === tId);
            const tutorPast = pastReviews.filter(b => b.tutorId === tId);
            const rep = getReputation(tId, tutor.reviews || []);

            return (
              <motion.div 
                key={tId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative"
              >
                {/* Tutor Reputation Card */}
                <div className="bg-white/60 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/40 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 flex flex-col items-center text-center">
                   {/* Avatar & Badge */}
                   <div className="relative mb-4">
                      <Avatar src={tutor.avatar} initials={tutor.name[0]} size="lg" className="border-4 border-white shadow-xl group-hover:scale-105 transition-transform duration-500" />
                      {tutorPending.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-[10px] font-black animate-pulse shadow-lg border-2 border-white">
                           {tutorPending.length}
                        </div>
                      )}
                   </div>

                   <h3 className="text-xl font-serif font-black italic tracking-tight text-on-surface mb-0.5">{tutor.name}</h3>
                   <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] mb-4">{(tutor.subjects || []).slice(0, 1).map((s: string) => getSubjectName(s)).join(' • ')}</p>

                   {/* Stats Area - Compacter */}
                   <div className="w-full bg-primary/5 rounded-[1.5rem] p-4 mb-6 flex items-center justify-around border border-primary/5">
                      <div className="flex flex-col items-center">
                         <span className="text-[7px] font-black text-primary/30 uppercase tracking-widest mb-0.5">Reputation</span>
                         <span className="text-lg font-serif font-black italic text-primary">{rep.rating.toFixed(1)}</span>
                      </div>
                      <div className="w-px h-6 bg-primary/10" />
                      <div className="flex flex-col items-center">
                         <span className="text-[7px] font-black text-primary/30 uppercase tracking-widest mb-0.5">Total Students</span>
                         <span className="text-lg font-serif font-black italic text-primary">{rep.count}</span>
                      </div>
                   </div>

                   {/* Actions */}
                   <div className="w-full space-y-2.5">
                        {(() => {
                          const hasActiveBookings = bookedTutorIds.includes(tId);
                          
                          if (!hasActiveBookings) {
                            return (
                              <div className="w-full bg-primary/5 text-primary/40 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest border border-primary/10 flex items-center justify-center gap-2">
                                 <Eye size={12} />
                                 Preview Only
                              </div>
                            );
                          }

                          const lastReview = bookings
                            .filter(b => b.tutorId === tId && b.reviewSubmitted)
                            .sort((a, b) => {
                              const dateA = a.reviewedAt?.toDate?.()?.getTime() || 0;
                              const dateB = b.reviewedAt?.toDate?.()?.getTime() || 0;
                              return dateB - dateA;
                            })[0];

                          const nowTime = new Date().getTime();
                          const lastReviewTime = lastReview?.reviewedAt?.toDate?.()?.getTime() || 0;
                          const fourteenDays = 14 * 24 * 60 * 60 * 1000;
                          
                          const isReviewDue = (nowTime - lastReviewTime) > fourteenDays;

                          const latestAttended = bookings.find(b => 
                            b.tutorId === tId && 
                            (b.status === 'completed' || b.attendance_status === 'attended')
                          );

                          const studentUpcoming = bookings.find(b => 
                            b.tutorId === tId && 
                            b.status === 'confirmed' && 
                            b.attendance_status !== 'attended'
                          );

                          if (latestAttended && isReviewDue) {
                            return (
                              <button 
                                onClick={() => setReviewForm({ bookingId: latestAttended.id, rating: 0, comment: '' })}
                                className="w-full bg-accent text-white py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all flex items-center justify-center gap-2 group/btn"
                              >
                                 <Star size={12} className="group-hover/btn:animate-spin-slow" />
                                 Pending Feedback
                              </button>
                            );
                          }

                          if (studentUpcoming) {
                            return (
                              <div className="w-full bg-primary/5 text-primary/40 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest border border-primary/10 flex items-center justify-center gap-2">
                                 <Clock size={12} />
                                 Scheduled Class
                              </div>
                            );
                          }

                          return (
                            <div className="w-full bg-emerald-50 text-emerald-600 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest border border-emerald-100/50 flex items-center justify-center gap-2">
                               <CheckCircle2 size={12} />
                               Updated
                            </div>
                          );
                        })()}

                       <button 
                         onClick={() => setActiveHistoryTutor(tId)}
                         className="w-full bg-white border border-primary/10 text-primary py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-primary/5 transition-all shadow-sm"
                       >
                          Full History
                       </button>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* --- REVIEW MODAL --- */}
        <AnimatePresence>
          {reviewForm.bookingId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setReviewForm({ bookingId: null, rating: 0, comment: '' })}
                 className="absolute inset-0 bg-primary/40 backdrop-blur-md"
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className="relative w-full max-w-xl bg-white rounded-[4rem] p-10 md:p-14 shadow-2xl overflow-hidden"
               >
                 <div className="absolute top-0 left-0 w-full h-2 bg-accent" />
                 <h2 className="text-3xl font-serif font-black italic tracking-tighter text-on-surface mb-2">Write Review</h2>
                 <p className="text-primary/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-12">Session: {bookings.find(b => b.id === reviewForm.bookingId)?.subject}</p>

                 <div className="space-y-8">
                    <div className="flex flex-col items-center gap-4">
                       <p className="text-[10px] font-black text-primary/30 uppercase tracking-widest">Rate your experience</p>
                       <div className="flex gap-2 text-amber-400">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star 
                              key={star} 
                              size={44} 
                              fill={star <= reviewForm.rating ? "currentColor" : "none"} 
                              strokeWidth={1.5}
                              className="cursor-pointer hover:scale-110 transition-transform active:scale-95"
                              onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            />
                          ))}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-primary/30 uppercase tracking-widest ml-4">Detailed Comment</p>
                       <textarea 
                         placeholder="How did this lesson help you? Was the tutor patient?..."
                         className="w-full bg-slate-50 rounded-[2.5rem] p-8 text-sm font-medium border-none focus:ring-2 ring-primary/20 min-h-[180px] outline-none leading-relaxed"
                         value={reviewForm.comment}
                         onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                       />
                    </div>

                    <div className="flex gap-4">
                       <button 
                         onClick={() => setReviewForm({ bookingId: null, rating: 0, comment: '' })}
                         className="flex-1 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest text-primary/40 hover:bg-slate-50 transition-all"
                       >
                          Cancel
                       </button>
                       <button 
                         disabled={isSubmitting || reviewForm.rating === 0}
                         onClick={async () => {
                            setIsSubmitting(true);
                            try {
                              const bId = reviewForm.bookingId!;
                              if (bId.startsWith('b')) {
                                setBookings(prev => prev.map(b => b.id === bId ? { ...b, reviewSubmitted: true, reviewRating: reviewForm.rating, reviewComment: reviewForm.comment } : b));
                                setReviewedIds(prev => [...prev, bId]);
                                localStorage.setItem('scholar_reviewed_ids', JSON.stringify([...reviewedIds, bId]));
                              }

                              // Notify Admin and Tutor about the new review
                              const booking = bookings.find(b => b.id === bId);
                              if (booking) {
                                await addDoc(collection(db, 'admin_notifications'), {
                                  type: 'Review Received',
                                  title: 'New Tutor Review',
                                  message: `${currentUser?.name} rated ${booking.tutorName} ${reviewForm.rating}/5 stars.`,
                                  time: serverTimestamp(),
                                  read: false
                                });

                                await addDoc(collection(db, 'tutor_notifications'), {
                                  tutorId: booking.tutorId,
                                  type: 'update',
                                  title: 'New Feedback Received',
                                  description: `You received a ${reviewForm.rating}-star review from ${currentUser?.name}.`,
                                  time: 'Just now',
                                  read: false,
                                  createdAt: serverTimestamp()
                                });
                              }

                              setReviewForm({ bookingId: null, rating: 0, comment: '' });
                            } catch (e) {
                               console.error(e);
                            } finally {
                               setIsSubmitting(false);
                            }
                         }}
                         className="flex-[2] btn-primary py-5 rounded-3xl disabled:opacity-50 shadow-xl"
                       >
                          {isSubmitting ? 'Submitting...' : 'Save Review'}
                       </button>
                    </div>
                 </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* --- HISTORY DRAWER/MODAL --- */}
        <AnimatePresence>
          {activeHistoryTutor && (
            <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setActiveHistoryTutor(null)}
                 className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ opacity: 0, y: 100 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 100 }}
                 className="relative w-full max-w-2xl bg-white rounded-t-[4rem] md:rounded-[4rem] p-8 md:p-14 shadow-2xl h-[80vh] md:h-auto overflow-hidden flex flex-col"
               >
                  <div className="flex items-center justify-between mb-8 md:mb-12 shrink-0">
                     <div>
                        <h2 className="text-2xl font-serif font-black italic text-on-surface">Feedback History</h2>
                        <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{tutors.find(t => t.id === activeHistoryTutor)?.name} • Your Reviews</p>
                     </div>
                     <button onClick={() => setActiveHistoryTutor(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-primary/40 hover:bg-slate-100 transition-all">
                        <X size={20} />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2 custom-scrollbar">
                     {(() => {
                        const targetTutor = tutors.find(t => t.id === activeHistoryTutor);
                        // Merge tutor's historic reviews with student's personal feedback for this tutor
                        const allRelatedReviews = [
                          ...(targetTutor?.reviews || []).map(r => ({ ...r, studentName: r.studentName || 'Student', isPrivate: false })),
                          ...pastReviews.filter(b => b.tutorId === activeHistoryTutor).map(b => ({
                             id: b.id,
                             studentName: currentUser?.name || 'You',
                             rating: b.reviewRating || 5,
                             comment: b.reviewComment,
                             date: b.date,
                             isPrivate: true
                          }))
                        ];
                        // Sort by date descending
                        allRelatedReviews.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        return allRelatedReviews.length > 0 ? (
                          allRelatedReviews.map((rev, i) => (
                            <motion.div 
                              key={rev.id || i}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className={cn(
                                "p-6 rounded-[2rem] border transition-all group",
                                rev.isPrivate ? "bg-primary/5 border-primary/10 shadow-sm" : "bg-slate-50/50 border-slate-100"
                              )}
                            >
                               <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                     <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary uppercase">{rev.studentName?.charAt(0) || 'S'}</div>
                                     <span className="text-[10px] font-bold text-on-surface">{rev.studentName}</span>
                                     {rev.isPrivate && <span className="text-[7px] bg-primary text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tight">Your Review</span>}
                                  </div>
                                  <span className="text-[9px] font-black text-primary/30 uppercase tracking-widest">{rev.date}</span>
                               </div>
                               <div className="flex gap-0.5 text-amber-400 mb-2">
                                  {[1, 2, 3, 4, 5].map(st => <Star key={st} size={12} fill={st <= (rev.rating || 0) ? "currentColor" : "none"} />) }
                               </div>
                               <p className="text-xs font-medium italic text-on-surface leading-relaxed pl-3 border-l-2 border-primary/10">"{rev.comment || 'Excellent session!'}"</p>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-20 opacity-30">
                             <p className="font-black uppercase tracking-widest text-[10px]">No history available</p>
                          </div>
                        );
                     })()}
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

function SettingsView({ setView, currentUser, setCurrentUser, currentTier, bookings, notifyTutorsOfPlanUpdate, effectiveSubscription, onUpgrade }: { 
  setView: (view: View) => void, 
  currentUser: StudentProfile | null, 
  setCurrentUser: (user: StudentProfile | null) => void, 
  currentTier: string, 
  bookings: Booking[], 
  notifyTutorsOfPlanUpdate: any, 
  effectiveSubscription: any,
  onUpgrade: (plan: any) => Promise<void>
}) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    mobile: currentUser?.mobile || '',
    class: currentUser?.class || '',
    board: currentUser?.board || '',
    email: currentUser?.email || '',
    photoURL: currentUser?.photoURL || '',
    upiId: currentUser?.upiId || ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [prefState, setPrefState] = useState({
    reminders: currentUser?.notifications?.reminders ?? true,
    messages: currentUser?.notifications?.messages ?? true,
    updates: currentUser?.notifications?.updates ?? true,
    push: currentUser?.notifications?.push ?? true
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sync state when currentUser changes (e.g. on load)
  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        mobile: currentUser.mobile || '',
        class: currentUser.class || '',
        board: currentUser.board || '',
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || '',
        upiId: currentUser.upiId || ''
      });
      setPrefState({
        reminders: currentUser.notifications?.reminders ?? true,
        messages: currentUser.notifications?.messages ?? true,
        updates: currentUser.notifications?.updates ?? true,
        push: currentUser.notifications?.push ?? true
      });
    }
  }, [currentUser?.email]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewUrl(base64String);
        setFormData(prev => ({ ...prev, photoURL: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    // Determine the ID to use (Real UID or test email as ID)
    const userId = auth.currentUser?.uid || currentUser?.id || null;
    
    if (!userId) {
      alert("Session expired. Please log in again.");
      setView('login');
      return;
    }

    if (!formData.name.trim() || !formData.mobile.trim()) {
      setStatus('error');
      alert("please fill in your name and mobile number");
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setStatus('saving');
    setIsSaving(true);
    
    try {
      const updatedData = {
        name: formData.name,
        mobile: formData.mobile,
        class: formData.class,
        board: formData.board,
        photoURL: formData.photoURL,
        upiId: formData.upiId
      };

      // Only attempt Firestore write if NOT a mock user without a real UID
      if (userId && userId !== 'test_user_id') {
        const userRef = doc(db, 'students', userId);
        await setDoc(userRef, updatedData, { merge: true });

        // CASCADE NAME UPDATE SO TUTOR DASHBOARD SEES IT INSTANTLY
        try {
          if (currentUser?.email && formData.name) {
            // Update Bookings
            const { query, collection, where, getDocs } = await import('firebase/firestore');
            const bQuery = query(collection(db, 'bookings'), where('studentEmail', '==', currentUser.email));
            const bSnap = await getDocs(bQuery);
            bSnap.docs.forEach(d => updateDoc(doc(db, 'bookings', d.id), { studentName: formData.name, name: formData.name }));
            
            // Update WhatsApp Chats
            const cQuery = query(collection(db, 'whatsapp'), where('studentEmail', '==', currentUser.email));
            const cSnap = await getDocs(cQuery);
            cSnap.docs.forEach(d => updateDoc(doc(db, 'whatsapp', d.id), { studentName: formData.name }));
          }
        } catch (cascadeError) {
          console.error("Error cascading name update:", cascadeError);
        }

      } else {
        console.log("Mock User Update: Changes applied locally.");
      }

      // Always update local state
      setCurrentUser({ ...currentUser, ...updatedData } as any);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error('Save failed:', e);
      setStatus('error');
      alert("Failed to save changes. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrefs = async () => {
    const uid = auth.currentUser?.uid || currentUser?.id;
    if (!uid) {
      alert("You must be logged in to save preferences.");
      return;
    }
    
    setStatus('saving');
    
    try {
      const userRef = doc(db, 'students', uid);
      await setDoc(userRef, { notifications: prefState }, { merge: true });
      setCurrentUser({ ...currentUser!, notifications: prefState });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error('Error updating preferences:', e);
      setStatus('error');
      alert("Failed to save preferences. Please try again.");
    }
  };

  const handleUpdatePassword = async () => {
    const { updatePassword, EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
    if (!auth.currentUser || !auth.currentUser.email) return;

    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setErrorMessage("All fields are required");
      setPwdStatus('error');
      return;
    }

    if (passwords.new !== passwords.confirm) {
      setErrorMessage("Passwords do not match");
      setPwdStatus('error');
      return;
    }

    if (passwords.new.length < 6) {
      setErrorMessage("Password should be at least 6 characters");
      setPwdStatus('error');
      return;
    }

    setPwdStatus('saving');
    setErrorMessage('');

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passwords.current);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwords.new);
      setPwdStatus('success');
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setPwdStatus('idle'), 3000);
    } catch (e: any) {
      console.error('Password update failed:', e);
      const msg = e.code === 'auth/wrong-password' ? "Current password is incorrect" : (e.message || "Failed to update password");
      setErrorMessage(msg);
      setPwdStatus('error');
      setTimeout(() => {
        setPwdStatus('idle');
        setErrorMessage('');
      }, 5000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto space-y-6"
    >
      {/* Profile Section */}
      <section className="p-5 md:p-8 bg-white/40 backdrop-blur-md rounded-[2rem] border border-primary/5 space-y-6 md:space-y-7 shadow-2xl">
        <h3 className="text-xl md:text-2xl font-serif font-bold italic">My Profile</h3>
        <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8 pb-6 md:pb-8 border-b border-primary/5">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <Avatar 
            src={previewUrl || currentUser?.photoURL} 
            initials={currentUser?.name?.charAt(0) || 'S'} 
            size="md" mdSize="lg" 
            className="w-20 h-20 md:w-24 md:h-24" 
          />
          <button 
            type="button"
            onClick={handlePhotoClick}
            className="text-[10px] font-bold uppercase tracking-widest text-accent hover:underline"
          >
            Change Photo
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Full Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="input-field text-sm md:text-base text-black bg-white/50" 
            />
          </div>
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Mobile</label>
            <input 
              type="tel" 
              value={formData.mobile}
              onChange={(e) => handleInputChange('mobile', e.target.value)}
              className="input-field text-sm md:text-base text-black bg-white/50" 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Class</label>
            <input 
              type="text" 
              value={formData.class}
              onChange={(e) => handleInputChange('class', e.target.value)}
              className="input-field text-sm md:text-base text-black bg-white/50" 
            />
          </div>
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Board</label>
            <select 
              className="input-field text-sm md:text-base text-black bg-white/50" 
              value={formData.board}
              onChange={(e) => handleInputChange('board', e.target.value)}
            >
              <option value="">Select Board</option>
              {BOARDS.map(board => (
                <option key={board} value={board}>{board}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="space-y-3">
          <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Email Address</label>
          <input 
            type="email" 
            value={formData.email}
            disabled
            className="input-field text-sm md:text-base text-black/50 bg-slate-100/50 cursor-not-allowed" 
          />
        </div>

        <div className="space-y-3">
          <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">UPI ID (Required for Transactions)</label>
          <div className="relative">
            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
            <input 
              type="text" 
              value={formData.upiId}
              onChange={(e) => handleInputChange('upiId', e.target.value)}
              placeholder="e.g. username@bank"
              className="input-field pl-12 text-sm md:text-base text-black bg-white/50 border-accent/20 focus:border-accent"
              required
            />
          </div>
          <p className="text-[9px] text-primary/40 font-medium ml-1">This ID will be used for all academic payment verifications.</p>
        </div>

        <div className="pt-6 border-t border-primary/5 flex items-center gap-4">
          <Button 
             className={`rounded-full px-12 py-4 shadow-xl transition-all duration-300 flex items-center gap-2 ${status === 'success' ? 'bg-green-500 hover:bg-green-600' : 'shadow-primary/20'}`}
             onClick={handleSaveProfile}
             disabled={isSaving || status === 'success'}
          >
            {status === 'saving' ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : status === 'success' ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}
            {status === 'saving' ? 'Updating...' : status === 'success' ? 'Profile Updated' : 'Update Profile'}
          </Button>
          {status === 'error' && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">Update Failed!</span>}
        </div>
      </section>

      {/* Notifications Section */}
      <section className="p-5 md:p-8 bg-white/40 backdrop-blur-md rounded-[2rem] border border-primary/5 space-y-5 md:space-y-6 shadow-xl">
        <h3 className="text-xl md:text-2xl font-serif font-bold italic">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { id: 'reminders', label: 'Booking Reminders', desc: 'Get notified about upcoming sessions' },
            { id: 'messages', label: 'New Messages', desc: 'Receive alerts when tutors message you' },
            { id: 'updates', label: 'Platform Updates', desc: 'Stay informed about new features and tutors' },
            { id: 'push', label: 'Push Notifications', desc: 'Receive background alerts in browser' }
          ].map((pref) => (
            <div key={pref.id} className="flex items-center justify-between p-4 md:p-6 bg-white/40 rounded-xl md:rounded-2xl border border-primary/5">
              <div className="pr-4">
                <p className="text-xs md:text-sm font-bold">{pref.label}</p>
                <p className="text-[10px] md:text-xs text-primary/40">{pref.desc}</p>
              </div>
              <button 
                onClick={() => setPrefState(prev => ({ ...prev, [pref.id]: !prev[pref.id as keyof typeof prefState] }))}
                className={`w-12 h-6 md:w-14 md:h-7 rounded-full transition-all duration-300 relative shrink-0 ${prefState[pref.id as keyof typeof prefState] ? 'bg-primary' : 'bg-[#D1D5DB]'}`}
              >
                <motion.div 
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  animate={{ 
                    x: prefState[pref.id as keyof typeof prefState] ? (window.innerWidth < 768 ? '1.5rem' : '1.75rem') : '0.25rem' 
                  }}
                  className="absolute top-1 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
          ))}
        </div>
        <div className="pt-4 flex items-center gap-4">
          <Button 
            className="rounded-full px-8 py-3.5 text-xs shadow-lg shadow-primary/10"
            onClick={handleSavePrefs}
            disabled={status === 'saving'}
          >
            <Save size={14} className="mr-2" />
            Save Button
          </Button>
          {status === 'success' && <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Saved!</span>}
        </div>
      </section>

      {/* Security Section */}
      <section className="p-5 md:p-8 bg-white/40 backdrop-blur-md rounded-[2rem] border border-primary/5 space-y-5 md:space-y-6 shadow-xl">
        <h3 className="text-xl md:text-2xl font-serif font-bold italic">Security & Password</h3>
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Current Password</label>
            <div className="relative">
              <input 
                type={showCurrentPassword ? "text" : "password"} 
                value={passwords.current}
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                placeholder="Enter current password" 
                className="input-field pr-12 text-sm md:text-base bg-white/50" 
              />
              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary transition-colors">
                {showCurrentPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">New Password</label>
              <div className="relative">
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  placeholder="Enter new password" 
                  className="input-field pr-12 text-sm md:text-base bg-white/50" 
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary transition-colors">
                  {showNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Confirm New Password</label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  placeholder="Confirm new password" 
                  className="input-field pr-12 text-sm md:text-base bg-white/50" 
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary transition-colors">
                  {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {errorMessage && (
          <p className="text-red-500 text-[11px] font-medium ml-1 animate-in fade-in slide-in-from-top-1">{errorMessage}</p>
        )}

        <div className="pt-4 flex items-center gap-4">
          <Button 
            className={`w-full sm:w-auto px-12 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all duration-300 ${pwdStatus === 'success' ? 'bg-green-500 hover:bg-green-600' : 'shadow-primary/10'}`}
            onClick={handleUpdatePassword}
            disabled={pwdStatus === 'saving' || pwdStatus === 'success'}
          >
            {pwdStatus === 'saving' ? (
              <span className="opacity-70 animate-pulse">Updating...</span>
            ) : pwdStatus === 'success' ? (
              <>
                <Check size={14} className="mr-2" />
                Password Updated
              </>
            ) : (
              <>
                <Lock size={14} className="mr-2" />
                Update Password
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Subscription Section */}
      <section id="subscription-plans" className="p-5 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] space-y-8 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
         
         <div className="relative z-10">
            <h3 className="text-xl md:text-2xl font-serif font-bold italic text-white flex items-center gap-3">
               <ShieldCheck className="text-primary" /> Select Your Plan
            </h3>
            <p className="text-xs text-slate-400 mt-2">Choose the right academic tier for your goals. All paid plans are valid for 3 months.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {(() => {
               const cat = currentUser?.category || 'schools';
               const plans = cat === 'schools' ? [
                 { 
                   tier: 'free', name: 'Basic', price: '0', 
                   desc: 'Perfect for getting started with a single focal subject.',
                   features: ['Single Subject Access', 'One-on-One Sessions', 'Monthly Payment Cycle', 'Platform Fee Applicable', 'No Added Extra Classes', 'Assignment Support']
                 },
                 { 
                   tier: 'standard', name: 'Scholar', price: '9/-', 
                   desc: 'Comprehensive support for multiple core subjects.',
                   features: ['Up to 3 Subjects', 'One-on-One Sessions', '20% Refund Policy (10 days prior)*', 'Extra Doubt Classes', 'Tutor Notes Available', 'No Platform Fee', 'Assignments & Mock Tests']
                 },
                 { 
                   tier: 'premium', name: 'Elite', price: '899', 
                   desc: 'The ultimate academic package for complete mastery.',
                   features: ['One-on-One Sessions', 'Up to 8 Subjects', '40% Refund Policy (10 days prior)*', 'Extra Classes Available', 'Premium Tutor Notes', 'Assignments & Mock Tests', 'No Platform Fee']
                 }
               ] : [
                 { 
                   tier: 'free', name: 'Explorer', price: '0', 
                   desc: 'Foundational support for a specific subject.',
                   features: ['1 Tutor Only', 'Limited Notes', 'Standard Doubt Portal Access', 'Assignments & Mock Tests (X)', 'Projects (X)']
                 },
                 { 
                   tier: 'standard', name: 'Achiever', price: '9/-', 
                   desc: 'Balanced support with projects and strategies.',
                   features: ['Up to 3 Subjects', 'Projects (Coming Soon)', 'Entrance Exam Strategy (X)', 'Tutor Notes (Limited)', 'Advanced Doubt Portal']
                 },
                 { 
                   tier: 'premium', name: 'Grandmaster', price: '899', 
                   desc: 'Full-scale academic and project excellence.',
                   features: ['Up to 8 Subjects', 'Extra Doubt Classes', 'Projects Assistance', 'Premium Tutor Notes', 'Entrance Exam Strategy Access']
                 }
               ];

               return plans.map((p) => {
                 const isCurrent = currentTier === p.tier;
                 return (
                   <div key={p.tier} className={cn(
                     "p-6 rounded-[2rem] border transition-all flex flex-col h-full",
                     isCurrent ? "bg-white border-primary shadow-xl scale-[1.02]" : "bg-white/5 border-white/10 hover:border-white/20"
                   )}>
                      <div className="mb-6">
                         <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", isCurrent ? "text-primary" : "text-white/40")}>{p.name}</p>
                         <div className="flex items-baseline gap-1">
                            <span className={cn("text-2xl font-black", isCurrent ? "text-slate-900" : "text-white")}>₹{p.price}</span>
                            <span className={cn("text-[10px] font-bold", isCurrent ? "text-slate-400" : "text-white/20")}>/ 3 months</span>
                         </div>
                         <p className={cn("text-[10px] font-medium leading-relaxed mt-4", isCurrent ? "text-slate-500" : "text-white/40")}>{p.desc}</p>
                      </div>

                      <div className="space-y-3 flex-1">
                         {p.features.map((f, idx) => (
                           <div key={idx} className="flex items-start gap-2">
                              {f.includes('(X)') ? <X size={12} className="text-rose-400 shrink-0 mt-0.5" /> : <CheckCircle2 size={12} className={cn("shrink-0 mt-0.5", isCurrent ? "text-primary" : "text-emerald-400")} />}
                              <span className={cn("text-[10px] font-bold", isCurrent ? "text-slate-600" : "text-white/60")}>{f.replace(' (X)', '')}</span>
                           </div>
                         ))}
                      </div>

                      <button 
                        disabled={isCurrent}
                        onClick={() => onUpgrade(p)}
                        className={cn(
                          "w-full py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all mt-8",
                          isCurrent ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-primary text-white hover:scale-105"
                        )}
                      >
                         {isCurrent ? 'Current Plan' : p.tier === 'free' ? 'Start for Free' : `Get ${p.name}`}
                      </button>
                   </div>
                 );
               });
            })()}
          </div>
       </section>
     </motion.div>
   );
 };

const DashboardView = ({ setView, bookings, setSelectedTutor, openChat, onReschedule, tutors, currentUser, parseTime, currentTier, openBookingModal }: { 
  setView: (view: View) => void, 
  bookings: Booking[], 
  setSelectedTutor: (tutor: Tutor | null) => void, 
  openChat: (tutorId: string, tutorName: string, avatar: string) => void, 
  onReschedule: (booking: Booking) => void,
  tutors: Tutor[],
  currentUser: StudentProfile | null,
  parseTime: (time: string) => number,
  currentTier: 'free' | 'standard' | 'premium',
  openBookingModal: (type: 'demo' | 'paid') => void
}) => {
  const tier = currentTier;
  const category = currentUser?.category || (currentUser?.class === 'B.Tech' ? 'graduates' : 'schools');

  const getFeatures = () => {
    const list: { name: string; status: 'v' | 'x' }[] = [];

    if (category === 'graduates') {
      // Graduates & Colleges
      if (tier === 'free') {
        list.push({ name: 'Single Subject Only', status: 'v' });
        list.push({ name: 'One-on-One Sessions', status: 'v' });
        list.push({ name: 'Platform Fee Applies', status: 'v' });
        list.push({ name: 'Tutor Notes Vault', status: 'x' });
        list.push({ name: 'Refunds', status: 'x' });
        list.push({ name: 'Group Sessions', status: 'v' });
        list.push({ name: 'Polls & Assignments', status: 'x' });
      } else if (tier === 'standard') {
        list.push({ name: 'Up to 3 Specialized Subjects', status: 'v' });
        list.push({ name: 'One-on-One Mentoring', status: 'v' });
        list.push({ name: 'Notes & Doubt Classes', status: 'v' });
        list.push({ name: 'Extra Lab Sessions', status: 'v' });
        list.push({ name: 'No Platform Fee', status: 'v' });
        list.push({ name: 'Group Sessions', status: 'v' });
        list.push({ name: 'Refund Policy (20%)', status: 'v' });
        list.push({ name: 'Assignments & Mock Tests', status: 'x' });
        list.push({ name: 'Placement Prep', status: 'x' });
        list.push({ name: 'Projects', status: 'x' });
      } else if (tier === 'premium') {
        list.push({ name: 'Up to 8 Subjects', status: 'v' });
        list.push({ name: 'Full Project Guidance', status: 'v' });
        list.push({ name: 'Group Sessions Included', status: 'v' });
        list.push({ name: 'Extra Classes + Projects', status: 'v' });
        list.push({ name: 'Placement Prep', status: 'v' });
        list.push({ name: 'Premium Tutor Notes', status: 'v' });
        list.push({ name: 'Assignments & Mock Tests', status: 'v' });
        list.push({ name: 'Polls & Topic wise tests', status: 'v' });
        list.push({ name: 'Doubt Sessions', status: 'v' });
        list.push({ name: 'Priority Support', status: 'v' });
      }
    } else if (category === 'intermediate') {
      // Intermediate (11-12)
      if (tier === 'free') {
        list.push({ name: 'Single Subject Only', status: 'v' });
        list.push({ name: 'One-on-One Sessions', status: 'v' });
        list.push({ name: 'Platform Fee Applicable', status: 'v' });
        list.push({ name: 'Tutor Notes', status: 'x' });
        list.push({ name: 'Refund Policy', status: 'x' });
        list.push({ name: 'Extra Classes', status: 'x' });
        list.push({ name: 'Polls & Mock Tests', status: 'x' });
      } else if (tier === 'standard') {
        list.push({ name: 'Up to 3 Subjects', status: 'v' });
        list.push({ name: 'One-on-One Sessions', status: 'v' });
        list.push({ name: 'Doubt Classes & Notes', status: 'v' });
        list.push({ name: 'Refund Policy (20%)', status: 'v' });
        list.push({ name: 'No Platform Fee', status: 'v' });
        list.push({ name: 'Group Sessions', status: 'v' });
        list.push({ name: 'Limited Tutor Notes', status: 'v' });
        list.push({ name: 'Assignments & Mock Tests', status: 'x' });
        list.push({ name: 'Projects', status: 'x' });
        list.push({ name: 'Entrance Strategy', status: 'x' });
      } else if (tier === 'premium') {
        list.push({ name: 'Up to 8 Subjects', status: 'v' });
        list.push({ name: 'Premium Notes & Polls', status: 'v' });
        list.push({ name: 'Mock Tests & Assignments', status: 'v' });
        list.push({ name: 'Entrance Exam Strategy', status: 'v' });
        list.push({ name: 'Extra Classes (Unlimited)', status: 'v' });
        list.push({ name: 'No Platform Fee', status: 'v' });
        list.push({ name: 'Topic-wise Analysis', status: 'v' });
        list.push({ name: 'Scholarship Guidance', status: 'v' });
      }
    } else {
      // Schools
      if (tier === 'free') {
        list.push({ name: 'Single Subject Only', status: 'v' });
        list.push({ name: 'Tutor Notes', status: 'x' });
        list.push({ name: 'Doubt Classes', status: 'x' });
        list.push({ name: 'Mock Tests', status: 'x' });
        list.push({ name: 'Polls', status: 'x' });
      } else if (tier === 'standard') {
        list.push({ name: 'Up to 3 Subjects', status: 'v' });
        list.push({ name: 'Tutor Notes & Doubt Classes', status: 'v' });
        list.push({ name: 'Group Sessions', status: 'v' });
        list.push({ name: 'Assignments', status: 'x' });
        list.push({ name: 'Mock Tests', status: 'x' });
      } else if (tier === 'premium') {
        list.push({ name: 'Up to 8 Subjects', status: 'v' });
        list.push({ name: 'All Features Unlocked', status: 'v' });
        list.push({ name: 'Premium Notes & Polls', status: 'v' });
        list.push({ name: 'Mock Tests & Reports', status: 'v' });
        list.push({ name: 'Extra Classes', status: 'v' });
      }
    }
    return list;
  };

  const features = getFeatures();

  return (
    <div className="space-y-10 md:space-y-12">
      <div className="grid grid-cols-3 gap-4 md:gap-8">
        {[
          { label: 'Upcoming Sessions', value: bookings.filter(b => b.status === 'confirmed' && b.attendance_status !== 'attended').length, color: 'text-on-surface', span: 'col-span-1' },
          { label: 'Completed Classes', value: bookings.filter(b => (b.status === 'completed' || b.attendance_status === 'attended')).length, color: 'text-on-surface', span: 'col-span-1' },
          { label: 'Tutors Enrolled', value: new Set(bookings.map(b => b.tutorId)).size, color: 'text-on-surface', span: 'col-span-1' }
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-4 sm:p-6 lg:p-8 bg-white/40 backdrop-blur-md rounded-3xl shadow-sm transition-all cursor-default ${stat.span}`}
          >
            <p className="text-[7px] md:text-[10px] font-extrabold uppercase tracking-widest text-on-surface mb-1 md:mb-2">{stat.label}</p>
            <p className={`text-2xl md:text-5xl font-serif font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h3 className="text-xl md:text-2xl font-serif font-bold italic">Upcoming Sessions</h3>
          <button onClick={() => setView('my-bookings')} className="px-3 py-1 bg-accent/10 text-accent text-[9px] font-extrabold uppercase tracking-widest rounded-lg hover:bg-accent hover:text-white transition-all shadow-sm">View All</button>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {(() => {
            const now = new Date();
            const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const isoToday = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const isoTomorrow = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');

            const nowMins = now.getHours() * 60 + now.getMinutes();

            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const isoYesterday = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');

            const filtered = bookings.filter(b => {
              const isActive = ['confirmed', 'pending', 'live', 'rescheduled'].includes(b.status);
              const isYesterday = b.date === yesterdayStr || b.date === isoYesterday;
              const isToday = b.date === todayStr || b.date === isoToday;
              const isTomorrow = b.date === tomorrowStr || b.date === isoTomorrow;

              if (!isActive) return false;

              // Show Yesterday/Today until class completion time
              if (isYesterday || isToday) {
                const sessionMins = parseTime(b.time);
                const durationMins = parseFloat(b.duration || '1') * 60;
                // Hide only after class end time has passed
                return nowMins <= (sessionMins + durationMins);
              }

              // Tomorrow: show all
              return isTomorrow;
            }).sort((a, b) => {
              // Sort by date then time
              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();
              if (dateA !== dateB) return dateA - dateB;
              return parseTime(a.time) - parseTime(b.time);
            });

            if (filtered.length === 0) return (
              <div className="text-center py-12 md:py-20 bg-white/20 rounded-[2rem] border border-dashed border-primary/10 w-full font-bold uppercase tracking-widest text-[10px] text-primary/30">
                No sessions for today or tomorrow
              </div>
            );

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(b => {
                  const isToday = b.date === todayStr || b.date === isoToday;
                  const sessionMins = parseTime(b.time);
                  const diffMins = sessionMins - nowMins;
                  const durationMins = parseFloat(b.duration || '1') * 60;
                  const isInJoinWindow = isToday && diffMins <= 10 && nowMins <= (sessionMins + durationMins);
                  const isLive = b.status === 'live';
                  
                  return (
                  <div key={b.id} className={cn(
                    "p-6 bg-white rounded-3xl border transition-all group relative overflow-hidden",
                    isLive ? "border-blue-200 shadow-lg shadow-blue-100" : "border-black/5 hover:border-primary/20"
                  )}>
                    {/* Live indicator */}
                    {isLive && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-primary animate-pulse" />}
                    
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-2">
                         <span className={cn(
                           "text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                           isToday ? "bg-emerald-50 text-emerald-600" : 
                           (b.date === yesterdayStr || b.date === isoYesterday) ? "bg-rose-50 text-rose-600" : 
                           "bg-blue-50 text-blue-600"
                         )}>{isToday ? 'Today' : (b.date === yesterdayStr || b.date === isoYesterday) ? 'Yesterday' : 'Tomorrow'} · {b.date}</span>
                         {isLive && <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500 text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
                       </div>
                       <span className="text-[10px] font-bold text-on-surface/40 uppercase">{b.time} · {b.duration}</span>
                    </div>
                    
                    <h4 className="text-lg font-bold text-on-surface mb-1">{b.subject}</h4>
                    <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest mb-4">with {b.tutorName}</p>
                    
                    {/* Topic covered (if tutor has set it) */}
                    {b.topic && (
                      <div className="mb-4 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">Topic</p>
                        <p className="text-xs font-bold text-emerald-700">{b.topic}</p>
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2">
                      {/* Join Now button — only in join window */}
                      {(isInJoinWindow || isLive) && (
                        <button 
                          onClick={() => { setView('my-bookings'); }}
                          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-lg shadow-blue-500/20 animate-pulse flex items-center justify-center gap-2"
                        >
                          <Video size={14} /> Join Now
                        </button>
                      )}
                      
                      {/* Reschedule button — only before class starts */}
                      {!isLive && !(isToday && nowMins >= sessionMins) && (
                        <button 
                          onClick={() => onReschedule(b)}
                          className="px-4 py-2.5 bg-primary/5 text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-2 border border-primary/10"
                        >
                          <Calendar size={14} /> Reschedule
                        </button>
                      )}
                      
                      {/* Time indicator for sessions not in join window */}
                      {!isInJoinWindow && !isLive && isToday && (
                        <span className="flex-1 py-2.5 text-center text-[10px] font-bold text-primary/30 uppercase tracking-widest">
                          Starts at {b.time} {diffMins > 0 && `(in ${diffMins}m)`}
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            );
          })()}
        </motion.div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h3 className="text-xl md:text-2xl font-serif font-bold italic">Curriculum & Features</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "p-5 rounded-2xl border flex items-center justify-between",
                  f.status === 'v' ? "bg-white border-black/5" : "bg-slate-50/50 border-slate-100 grayscale opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                   <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", f.status === 'v' ? "bg-primary/5 text-primary" : "bg-slate-100 text-slate-300")}>
                      {f.status === 'v' ? <CheckCircle size={18} /> : <X size={18} />}
                   </div>
                   <span className="font-bold text-sm text-on-surface">{f.name}</span>
                </div>
                {f.status === 'x' && <span className="text-[7px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-2 py-0.5 rounded-sm">Upgrade</span>}
              </motion.div>
            ))}
          </div>
        </section>

        <section className="bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10 self-start">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                 <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-primary">Plan Status</h3>
           </div>
           
           <div className="space-y-6">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-black/5">
                 <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest mb-1">Current Tier</p>
                 <p className="text-xl font-serif font-bold italic text-primary capitalize">{tier}</p>
              </div>

              <div className="space-y-3">
                 <div className="flex justify-between items-end">
                    <p className="text-[9px] font-black uppercase text-primary/30 tracking-widest">Tutor Availability</p>
                    <p className="text-[10px] font-bold text-on-surface/60">
                       {tier === 'free' ? '1 Active Tutor' : tier === 'standard' ? '3 Subjects' : 'Elite Access'}
                    </p>
                 </div>
                 <div className="w-full bg-primary/10 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: tier === 'free' ? '33%' : tier === 'standard' ? '66%' : '100%' }}
                      className="h-full bg-primary"
                    />
                 </div>
                 {tier === 'free' && (
                    <p className="text-[8px] font-bold text-slate-400 italic mt-1 leading-tight">
                       * On Free Plan, you can only book sessions with 1 tutor at a time.
                    </p>
                 )}
              </div>

              <button 
                onClick={() => {
                  setView('settings');
                  setTimeout(() => {
                    document.getElementById('subscription-plans')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="w-full py-4 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                 {tier === 'premium' ? 'Manage Subscription' : 'Upgrade Account'}
              </button>
           </div>
        </section>
      </div>
    </div>
  );
};

const FindTutorsView = ({ setView, setSelectedTutor, tutors, currentUser, bookings, openBookingModal, openChat }: { 
  setView: (view: View) => void, 
  setSelectedTutor: (tutor: Tutor | null) => void,
  tutors: Tutor[],
  currentUser: StudentProfile | null,
  bookings: Booking[],
  openBookingModal: (type: 'demo' | 'paid') => void,
  openChat: (tutorId: string, tutorName: string, tutorAvatar?: string) => void
}) => {
    const [search, setSearch] = useState('');
    const [subject, setSubject] = useState('All');
    
    // Dynamically calculate price options based on current tutors
    const tutorPrices = tutors.map(t => parseFloat(getEffectivePrice(t)));
    const actualMaxPrice = tutorPrices.length > 0 ? Math.max(...tutorPrices) : 5000;
    
    const [maxPrice, setMaxPrice] = useState(actualMaxPrice > 5000 ? actualMaxPrice : 5000); 
    const [classLevel, setClassLevel] = useState('All');

    // Update maxPrice if actualMaxPrice changes significantly (e.g. data loads after mount)
    useEffect(() => {
      if (actualMaxPrice > maxPrice) setMaxPrice(actualMaxPrice);
    }, [actualMaxPrice]);
    
    const filteredTutors = tutors.filter(t => {
      // VISIBILITY GUARD: Tutor MUST have UPI ID and at least one Subject to be visible to students
      const isProfileComplete = 
        Array.isArray(t.subjects) && t.subjects.length > 0 &&
        (t.price || (Array.isArray(t.subjectsPricing) && t.subjectsPricing.length > 0));
      
      if (!isProfileComplete) return false;

      const matchesSearch = search === '' || (t.name || '').toLowerCase().includes(search.toLowerCase());
      const subjects = t.subjects || [];
      const matchesSubject = subject === 'All' || subjects.includes(subject);
      
      const effectivePrice = parseFloat(getEffectivePrice(t));
      const matchesPrice = effectivePrice <= maxPrice;
      
      const classMapping: Record<string, string> = {
        'Nursery - UKG': 'Nursery to UKG',
        '1-5 Class': 'Primary (1-5)',
        '6-10 Class': 'Middle School (6-10)',
        'Intermediate (11-12)': 'Intermediate (11-12)',
        'Graduate': 'Graduate'
      };
      
      const targetSearch = classMapping[classLevel] || classLevel;
      const matchesClass = classLevel === 'All' || 
        (t.targetClasses?.includes(targetSearch)) ||
        (classLevel === 'Graduate' && t.targetClasses?.toLowerCase().includes('graduate'));

      return matchesSearch && matchesSubject && matchesPrice && matchesClass;
    });

    // Pricing steps for the filter
    const priceSteps = [200, 300, 500, 1000, 2000, 3000, 5000].filter(p => p < actualMaxPrice);

    return (
    <div className="space-y-8 md:space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
      >
        <div className="sm:col-span-2 relative">
          <input 
            type="text" 
            placeholder="Search by tutor name..." 
            className="input-field pr-16"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-primary/20" size={20} />
        </div>
        
        <select 
          className="input-field"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="All">All Subjects</option>
          {currentUser?.class === 'B.Tech' ? (
            <>
              <option value="M1">Engineering Mathematics – M1</option>
              <option value="M2">Engineering Mathematics – M2</option>
              <option value="M3">Engineering Mathematics – M3</option>
              <option value="Engineering Graphics">Engineering Graphics</option>
              <option value="C Programming">C Programming</option>
              <option value="C++">C++ (Object Oriented)</option>
              <option value="Java">Java Programming</option>
              <option value="Python">Python Programming</option>
              <option value="SQL">SQL / Database Management</option>
              <option value="PLSQL">PL/SQL (Oracle)</option>
              <option value="C#">C# (.NET)</option>
              <option value="Data Structures">Data Structures & Algorithms</option>
              <option value="DBMS">DBMS (Database Systems)</option>
              <option value="Operating Systems">Operating Systems</option>
              <option value="Computer Networks">Computer Networks</option>
              <option value="Web Development">Web Development (HTML/CSS/JS)</option>
              <option value="React">React.js / Frontend Dev</option>
              <option value="Node.js">Node.js / Backend Dev</option>
              <option value="AI/ML">Artificial Intelligence / ML</option>
              <option value="Cloud Computing">Cloud Computing (AWS/Azure)</option>
              <option value="Software Engineering">Software Engineering</option>
              <option value="English for Engineers">English for Engineers</option>
            </>
          ) : (
            <>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="English">English</option>
              <option value="Telugu">Telugu</option>
              <option value="Hindi">Hindi</option>
              <option value="Spanish">Spanish</option>
              <option value="EAMCET">EAMCET (State Entrance)</option>
              <option value="JEE">JEE (Engineering Entrance)</option>
            </>
          )}
        </select>

        <select 
          className="input-field"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
        >
          <option value={actualMaxPrice + 1000}>All Prices</option>
          {priceSteps.map(p => (
            <option key={p} value={p}>Up to ₹{p}</option>
          ))}
          <option value={actualMaxPrice}>Up to ₹{actualMaxPrice} (Max)</option>
        </select>

        <select 
          className="input-field"
          value={classLevel}
          onChange={(e) => setClassLevel(e.target.value)}
        >
          <option value="All">Class Level (All)</option>
          <option value="Nursery - UKG">Nursery - UKG</option>
          <option value="1-5">1-5 Class</option>
          <option value="6-10">6-10 Class</option>
          <option value="11-12">Intermediate (11-12)</option>
          <option value="Graduate">Graduates</option>
        </select>
      </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredTutors.length > 0 ? filteredTutors.map(tutor => (
            <motion.div 
              key={tutor.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 atelier-card-shadow flex flex-col hover:scale-[1.01] transition-all border border-primary/5 min-h-[400px]"
            >
              <div className="flex items-start justify-between mb-4 md:mb-6">
                <Avatar src={tutor.avatar} size="md" mdSize="lg" initials={(tutor.name || '??').substring(0, 2).toUpperCase()} />
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    <span className="text-emerald-600 text-xs md:text-sm font-black">₹{getEffectivePrice(tutor)}<span className="text-[9px] opacity-40">/hr</span></span>
                  </div>
                  {/* Amount removed as per request */}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-serif font-bold italic text-on-surface mb-2 leading-tight truncate">{tutor.name}</h3>
                <p className="text-accent/60 text-[9px] font-black uppercase tracking-[0.2em] mb-1">
                  {tutor.experience === 'Fresher' ? 'Fresher' : `${tutor.experience || 'Expert'} Experience`}
                </p>
                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
                  {(tutor as any).subjects?.slice(0, 1).map((s: string) => (
                    <span key={s} className="pill-tag bg-primary/5 text-primary/70 !text-[8px]">{getSubjectName(s)}</span>
                  ))}
                  {tutor.subjects.length > 1 && <span className="text-[8px] font-bold text-primary/20">+{tutor.subjects.length - 1} more</span>}
                </div>
                <p className="text-primary/60 text-[10px] md:text-xs leading-relaxed mb-4 line-clamp-2">{(tutor as any).bio}</p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {(() => {
                    const hasAttendedDemo = bookings.some(b => b.tutorId === tutor.id && b.type === 'demo' && (b.status === 'completed' || b.attendance_status === 'attended'));
                    const hasBookedDemo = hasAttendedDemo;

                    if (!hasBookedDemo) {
                      return (
                        <button 
                          onClick={() => { setSelectedTutor(tutor); openBookingModal('demo'); }}
                          className="flex-1 bg-accent/10 text-accent py-2.5 md:py-3 rounded-xl font-black text-[10px] md:text-xs hover:bg-accent hover:text-white transition-all text-center"
                        >
                          Book Free Demo
                        </button>
                      );
                    } else {
                      return (
                        <button 
                          onClick={() => { setSelectedTutor(tutor); openBookingModal('paid'); }}
                          className="flex-1 bg-primary text-background py-2.5 md:py-3 rounded-xl font-black text-[10px] md:text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Enroll Now
                        </button>
                      );
                    }
                  })()}
                </div>
                <button 
                  onClick={() => openChat(tutor.id, tutor.name, tutor.avatar)}
                  className="w-full flex items-center justify-center gap-2 border border-primary/10 text-primary py-2.5 md:py-3 rounded-xl font-black text-[10px] md:text-xs hover:bg-primary/5 transition-all"
                >
                  <MessageSquare size={14} /> Chat with Tutor
                </button>
              </div>
              
              <div className="mt-4 md:mt-6 pt-4 border-t border-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-primary/40 font-bold uppercase tracking-widest text-[8px]">
                  <CheckCircle2 size={10} className="text-emerald-500" />
                  Verified
                </div>
                <div className="flex items-center gap-1 text-accent font-black px-2 py-1 rounded-full border border-accent/10">
                  <Star size={12} fill="currentColor" />
                  <span className="text-xs md:text-sm">{getReputation(tutor.id, tutor.reviews || []).rating.toFixed(1)}</span>
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-20 bg-white/20 rounded-[3rem] border border-dashed border-primary/10">
              <p className="text-primary/30 font-bold uppercase tracking-widest text-xs">No tutors found</p>
            </div>
          )}
        </div>
      </div>
    );
  };

const TutorProfileView = ({ selectedTutor, setView, openBookingModal, openChat, bookings }: { 
  selectedTutor: Tutor | null, 
  setView: (view: View) => void, 
  openBookingModal: (type: 'demo' | 'paid') => void,
  openChat: (tutorId: string, tutorName: string, avatar: string) => void,
  bookings: Booking[]
}) => {
  if (!selectedTutor) return <div className="text-center py-20 font-bold opacity-20 uppercase tracking-widest">Tutor not found</div>;
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-5xl mx-auto space-y-12"
      >
        <button onClick={() => setView('find-tutors')} className="flex items-center gap-3 text-primary/40 font-bold uppercase tracking-widest text-xs hover:text-primary transition-colors">
          <ArrowLeft size={16} /> Back to Search
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-16">
          <div className="lg:col-span-2 space-y-8 md:space-y-16">
            <section className="flex flex-col sm:flex-row gap-8 md:gap-12 items-center sm:items-start text-center sm:text-left">
              <Avatar src={selectedTutor.avatar} size="lg" mdSize="xl" className="w-32 h-32 md:w-40 md:h-40" />
              <div className="flex-1 space-y-4 md:space-y-6">
                <div>
                  <h1 className="text-3xl md:text-5xl font-serif font-bold italic tracking-tight">{selectedTutor.name}</h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 md:gap-6 mt-3 md:mt-4">
                    <div className="flex items-center gap-2 text-accent font-bold">
                      <Star size={16} fill="currentColor" /> {selectedTutor.rating}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 md:gap-8 py-4 md:py-6 border-y border-primary/5">
                  <div>
                    <p className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest mb-1">Primary Subject</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      {selectedTutor.subjects.slice(0, 1).map(s => (
                        <span key={s} className="pill-tag text-[8px] md:text-[9px]">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest mb-1">Expertise</p>
                    <p className="text-xs md:text-sm font-bold">{selectedTutor.experience === 'Fresher' ? 'Fresher' : `${selectedTutor.experience} Years Experience`}</p>
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest mb-1">Next Available</p>
                    <p className="text-xs md:text-sm font-bold">
                      {(() => {
                        if (!selectedTutor?.availability || selectedTutor.availability.length === 0) return 'No availability';
                        const now = new Date();
                        const currentMins = now.getHours() * 60 + now.getMinutes();
                        const futureToday = selectedTutor.availability
                          .map(slot => {
                            const time = typeof slot === 'string' ? slot : (slot.start || '');
                            return { time, mins: parseTime(time) };
                          })
                          .filter(slot => slot.mins > currentMins + 60)
                          .sort((a, b) => a.mins - b.mins);
                        if (futureToday.length > 0) return `${futureToday[0].time} Today`;
                        const sorted = [...selectedTutor.availability]
                          .map(slot => typeof slot === 'string' ? slot : (slot.start || ''))
                          .sort((a, b) => parseTime(a) - parseTime(b));
                        return sorted.length > 0 ? `${sorted[0]} Tomorrow` : 'No availability';
                      })()}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest">About the Tutor</p>
                  <p className="text-primary/70 leading-relaxed text-base md:text-lg font-medium">{selectedTutor.bio}</p>
                </div>
              </div>
            </section>

            <section>
              <div className="bg-primary p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] text-background mb-8 md:mb-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10">
                  <p className="text-background/40 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] mb-4 md:mb-6">Overall Student Satisfaction</p>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-0">
                    <div>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-5xl md:text-7xl font-serif font-black italic tracking-tighter">
                          {getReputation(selectedTutor.id, selectedTutor.reviews || []).rating.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <p className="text-background/50 text-[10px] md:text-xs font-medium">
                        Based on {getReputation(selectedTutor.id, selectedTutor.reviews || []).count} total reviews
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex text-amber-300 gap-1 tooltip" title="Excellent Rating">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} size={20} fill={i <= Math.round(getMockRating(selectedTutor.id)) ? "currentColor" : "none"} strokeWidth={2.5} />
                        ))}
                      </div>
                      <div className="px-4 py-2 bg-white/10 rounded-full border border-white/10">
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] text-white">Next review prompt in 2 weeks</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <h3 className="text-xl md:text-2xl font-serif font-bold italic mb-6 md:mb-8">Feedback Stream</h3>
              <div className="space-y-6 md:space-y-8">
                {(selectedTutor.reviews || []).length > 0 ? (selectedTutor.reviews || []).map(review => (
                  <div key={review.id} className="p-6 md:p-8 bg-white/40 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] border border-primary/5">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar src="" size="sm" initials={review.studentName?.charAt(0) || 'S'} />
                        <h5 className="font-bold text-base md:text-lg text-black">{review.studentName}</h5>
                      </div>
                      <span className="text-[9px] md:text-[10px] font-bold text-black/40 uppercase tracking-widest">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 mb-3 md:mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} fill={i < review.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                    <p className="text-black italic font-medium text-sm md:text-base">"{review.comment}"</p>
                  </div>
                )) : (
                  <div className="py-12 md:py-16 bg-white/20 rounded-[2rem] border-2 border-dashed border-primary/5 text-center">
                    <Quote size={32} className="mx-auto text-primary/10 mb-4" />
                    <p className="text-primary/30 font-bold uppercase tracking-widest text-[10px] md:text-xs">Incoming Feedback from {getMockCount(selectedTutor.id)}+ Students</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6 md:space-y-8">
            <section className="p-8 md:p-10 bg-primary text-background rounded-[2rem] md:rounded-[3rem] shadow-2xl">
              <p className="text-background/50 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">Hourly Rate</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-serif font-bold italic text-emerald-400">₹{getEffectivePrice(selectedTutor)}</span>
                  <span className="text-emerald-400/50 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">/hr</span>
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-6 md:mt-8">
                {(() => {
                  const hasAttendedDemo = bookings.some(b => b.tutorId === selectedTutor.id && b.type === 'demo' && (b.status === 'completed' || b.attendance_status === 'attended'));
                  const hasBookedDemo = hasAttendedDemo;

                  if (selectedTutor.subjectsPricing && selectedTutor.subjectsPricing.length > 0) {
                    return (
                      <div className="space-y-4 mb-4">
                        <p className="text-background/40 text-[9px] font-black uppercase tracking-widest">Available Subjects</p>
                        <div className="flex flex-wrap gap-2">
                           {selectedTutor.subjects.map(s => (
                             <span key={s} className="px-3 py-1.5 bg-white/5 rounded-lg text-[9px] font-bold border border-white/5">{s}</span>
                           ))}
                        </div>
                        
                        {!hasBookedDemo ? (
                          <button 
                            onClick={() => openBookingModal('demo')}
                            className="w-full bg-accent/10 text-accent py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:bg-accent hover:text-white transition-all text-sm md:text-base"
                          >
                            Book Free Demo
                          </button>
                        ) : (
                          <button 
                            onClick={() => openBookingModal('paid')}
                            className="w-full bg-primary text-background py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl text-sm md:text-base"
                          >
                            Enroll Now
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (!hasBookedDemo) {
                    return (
                      <button 
                        onClick={() => openBookingModal('demo')}
                        className="w-full bg-accent/10 text-accent py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:bg-accent hover:text-white transition-all text-sm md:text-base"
                      >
                        Book Free Demo
                      </button>
                    );
                  } else {
                    return (
                      <button 
                        onClick={() => openBookingModal('paid')}
                        className="w-full bg-primary text-background py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl text-sm md:text-base"
                      >
                        Enroll Now
                      </button>
                    );
                  }
                })()}
              </div>
              <button 
                onClick={() => openChat(selectedTutor.id, selectedTutor.name, selectedTutor.avatar)}
                className="w-full mt-3 md:mt-4 bg-primary/10 text-background py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:bg-primary/20 transition-all border border-background/10 text-sm md:text-base"
              >
                Message Tutor
              </button>
            </section>

            {(selectedTutor.availability && selectedTutor.availability.length > 0) && (
            <section className="p-8 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-primary/5">
              <h3 className="text-base md:text-lg font-bold mb-4 md:mb-6">Availability</h3>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                {selectedTutor.availability.map((slot, index) => {
                  const time = typeof slot === 'string' ? slot : (slot.start || '');
                  if (!time) return null;
                  return (
                    <button key={index} className="py-2 md:py-3 px-3 md:px-4 rounded-lg md:rounded-xl border border-primary/10 text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-background transition-all">
                      {time}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] md:text-[10px] text-primary/30 mt-4 md:mt-6 text-center font-bold uppercase tracking-widest">All times are local</p>
            </section>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

const VerificationPendingView = ({ user, onLogout, onResend }: { user: StudentProfile, onLogout: () => void, onResend: () => void }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-8 relative"
      >
        <Mail size={40} className="text-primary animate-bounce" />
        <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-[2rem] animate-spin-slow"></div>
      </motion.div>
      <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter text-on-surface">Verify Your Email</h2>
      <p className="text-primary/60 font-bold max-w-md mb-10 text-sm md:text-base leading-relaxed">
        We sent email verification to your <span className="text-primary">{user.email}</span>. 
        Please check your inbox and click the link to login and access your dashboard.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button 
          onClick={onResend}
          className="flex-1 bg-primary text-white font-black py-4 md:py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-[10px] md:text-xs uppercase tracking-widest"
        >
          Resend Verification Email
        </button>
        <button 
          onClick={onLogout}
          className="flex-1 bg-slate-100 text-slate-600 font-black py-4 md:py-5 rounded-2xl hover:bg-slate-200 transition-all text-[10px] md:text-xs uppercase tracking-widest"
        >
          Sign Out
        </button>
      </div>
      
      <div className="mt-12 p-6 bg-primary/5 rounded-[2rem] border border-primary/10 max-w-sm">
        <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest mb-2">Why verify?</p>
        <p className="text-[11px] text-primary/60 font-bold leading-relaxed">Verification helps us ensure that your academic records and tutor communications are delivered securely to your authorized email address.</p>
      </div>
      
      <p className="mt-8 text-[10px] font-black text-primary/20 uppercase tracking-[0.4em]">Eduqra Security Layer</p>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<View>(() => {
    const savedView = localStorage.getItem('student_view') as View;
    const isLoggedIn = localStorage.getItem('student_logged_in') === 'true';
    if (isLoggedIn && savedView && savedView !== 'login' && savedView !== 'register' && savedView !== 'forgot-password') {
      return savedView;
    }
    return 'login';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<StudentProfile | null>(() => {
    const savedUser = localStorage.getItem('student_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [showUpiGate, setShowUpiGate] = useState(false);
  const [gateUpiInput, setGateUpiInput] = useState('');
  const [isUpdatingGateUpi, setIsUpdatingGateUpi] = useState(false);

  const openBookingModal = (type: 'demo' | 'paid') => {
    setBookingType(type);
    setBookingSelectedSubject('');
    setBookingSelectedDate('');
    setBookingSelectedTime('');
    setBookingDuration('');
    setBookingPlan('');
    setBookingFormData(null);
    setIsBookingModalOpen(true);
  };

  useEffect(() => {
    if (view && !['login', 'register', 'forgot-password'].includes(view)) {
      localStorage.setItem('student_view', view);
    }
  }, [view]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('student_user', JSON.stringify(currentUser));
      localStorage.setItem('student_logged_in', 'true');
    } else {
      localStorage.removeItem('student_user');
      localStorage.setItem('student_logged_in', 'false');
    }
  }, [currentUser]);

  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      const mainElement = document.querySelector('main') || document.querySelector('.main-content') || document.body;
      if (mainElement) {
        mainElement.scrollTop = 0;
      }
    });
  }, [view]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'login') {
      signOut(auth).then(() => {
        localStorage.clear();
        window.history.replaceState({}, '', window.location.pathname);
        window.location.reload();
      });
    }
  }, []);

  const markNotifRead = async (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, { read: true });
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  };
  useEffect(() => {
    let isMounted = true;
    let authTimeout: NodeJS.Timeout;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      
      try {
        if (user) {
          const docRef = doc(db, 'students', user.uid);
          
          const timeoutPromise = new Promise((_, reject) => {
            authTimeout = setTimeout(() => reject(new Error('Firestore timeout')), 8000);
          });
          
          try {
            const docSnap = await Promise.race([getDoc(docRef), timeoutPromise]) as any;
            clearTimeout(authTimeout);
            
            if (docSnap.exists()) {
              const userData = docSnap.data();
              if (userData.status === 'blocked') {
                setView('blocked');
                setCurrentUser({ id: user.uid, ...userData } as any);
                return;
              }
              
              if (!userData.subscription) {
                const defaultPlan = getPlanDefaults('free', userData.studentType || 'school');
                await updateDoc(docRef, { subscription: defaultPlan });
                userData.subscription = defaultPlan;
              }

              // EMAIL VERIFICATION SYNC & CHECK
              if (userData.email_verified === false && user.emailVerified) {
                await updateDoc(docRef, { email_verified: true, status: 'active' });
                await updateDoc(doc(db, 'users', user.uid), { email_verified: true });
                userData.email_verified = true;
                userData.status = 'active';
              }

              setCurrentUser({ id: user.uid, ...userData } as any);

              // 🛡️ EMAIL VERIFICATION GATE
              // Only gate if email_verified is explicitly false (new/unverified users)
              // This allows grandfathering existing users who don't have the field yet.
              if (userData.email_verified === false && !['login', 'register', 'forgot-password'].includes(view)) {
                setView('verify-email');
              } else {
                // Mark first login as completed
                if (userData.first_login_completed === false && userData.email_verified === true) {
                  await updateDoc(docRef, { first_login_completed: true });
                  await updateDoc(doc(db, 'users', user.uid), { first_login_completed: true });
                  userData.first_login_completed = true;
                }
              }

              if (userData.subscription?.tier === 'free') {
                const planNotifId = `plan_remind_${user.uid}`;
                setNotifications(prev => {
                  if (prev.some(n => n.id === planNotifId)) return prev;
                  return [{
                    id: planNotifId,
                    title: 'You\'re on the Free Plan',
                    message: 'Choose Free plan to access basic features, or upgrade to Standard/Premium for more subjects and features.',
                    time: 'Just now',
                    type: 'update' as const,
                    read: false,
                    link: 'settings'
                  }, ...prev];
                });
              }
            } else {
              const defaultPlan = getPlanDefaults('free', 'school');
              const newUser: StudentProfile = {
                id: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'User',
                email: user.email || '',
                mobile: user.phoneNumber || '',
                class: '10',
                board: 'CBSE',
                notifications: { reminders: true, messages: true, updates: true, push: true },
                subscription: defaultPlan,
                email_verified: false,
                first_login_completed: false,
                registrationDate: new Date().toISOString(),
                status: 'EMAIL_NOT_VERIFIED'
              };
              await setDoc(docRef, newUser);
              // Sync to 'users'
              await setDoc(doc(db, 'users', user.uid), { ...newUser, role: 'student' });
              setCurrentUser(newUser as any);

              setNotifications(prev => [{
                id: `plan_prompt_${Date.now()}`,
                title: 'Welcome to Eduqra! Choose Your Plan',
                message: `You're on the Free plan. Explore Standard or Premium plans for more subjects, extra classes, and premium features.`,
                time: 'Just now',
                type: 'update' as const,
                read: false,
                link: 'settings'
              }, ...prev]);

              addDoc(collection(db, 'admin_notifications'), {
                type: 'New Student',
                title: 'New Student Registered',
                message: `${newUser.name} (${newUser.email}) joined the platform on the Free plan.`,
                time: serverTimestamp(),
                read: false
              });
            }
            setView(prev => ['login', 'register', 'forgot-password'].includes(prev) ? 'dashboard' : (prev === 'blocked' ? 'dashboard' : prev));
          } catch (firestoreError) {
            console.error("Firestore error:", firestoreError);
            const defaultPlan = getPlanDefaults('free', 'school');
            setCurrentUser({
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              mobile: user.phoneNumber || '',
              class: '10',
              board: 'CBSE',
              notifications: { reminders: true, messages: true, updates: true, push: true },
              subscription: defaultPlan
            } as any);
            setView(prev => ['login', 'register', 'forgot-password'].includes(prev) ? 'dashboard' : prev);
          }
        } else {
          const isLoggedIn = localStorage.getItem('student_logged_in') === 'true';

          if (!isLoggedIn) {
            setView('login');
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error("Auth fetch error:", err);
        if (isMounted) {
          setView('login');
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    });
    
    authTimeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
        setAuthInitialized(true);
        setView('login');
      }
    }, 15000);
    
    return () => {
      isMounted = false;
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authInitialized && loading) {
      setLoading(false);
    }
  }, [authInitialized, loading]);

  const [selectedTutor, setSelectedTutor] = useState<Tutor|null>(null);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleResendVerification = async () => {
    if (!currentUser?.email) return;
    try {
      const hostname = window.location.hostname;
      const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || `http://${hostname}:5001`;
      const response = await fetch(`${backendBaseUrl}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
          role: 'student'
        })
      });
      if (response.ok) {
        showToast("Resend link sent to your mail");
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Failed to resend: ${errorData.message || 'Server error'}`, 'error');
      }
    } catch (err) {
      console.error("Resend error:", err);
      showToast("Connection error: Could not reach verification server.", "error");
    }
  };

  const effectiveSubscription = useMemo(() => {
    if (!currentUser?.subscription) return { tier: 'free' as const, expiresAt: null, isExpired: false };
    const { tier, expiresAt } = currentUser.subscription;
    if (tier === 'free') return { tier: 'free' as const, expiresAt: null, isExpired: false };
    
    const expiry = expiresAt ? new Date(expiresAt) : null;
    const isExpired = expiry && new Date() > expiry;
    
    return {
      tier: (isExpired ? 'free' : tier) as 'free' | 'standard' | 'premium',
      isExpired,
      expiresAt
    };
  }, [currentUser?.subscription]);

  const currentTier = effectiveSubscription.tier;

  // 🛡️ MANDATORY UPI ID GATE
  useEffect(() => {
    if (currentUser && !currentUser.upiId && !['login', 'register', 'forgot-password', 'blocked'].includes(view)) {
      setShowUpiGate(true);
    } else {
      setShowUpiGate(false);
    }
  }, [currentUser?.upiId, view]);

  const handleGateUpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateUpiInput.trim() || !currentUser?.id) return;
    
    setIsUpdatingGateUpi(true);
    try {
      const userRef = doc(db, 'students', currentUser.id);
      await updateDoc(userRef, { upiId: gateUpiInput.trim() });
      setCurrentUser({ ...currentUser, upiId: gateUpiInput.trim() });
      setShowUpiGate(false);
      setGateUpiInput('');
    } catch (err) {
      console.error("Error updating UPI via gate:", err);
      alert("Failed to update UPI ID. Please try again.");
    } finally {
      setIsUpdatingGateUpi(false);
    }
  };

  useEffect(() => {
    const tutorsQuery = query(
      collection(db, 'users'), 
      where('role', '==', 'tutor'),
      where('status', '==', 'approved')
    );
    const unsubTutors = onSnapshot(tutorsQuery, (snap) => {
      const tutorList = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.displayName || 'Tutor',
          subjects: data.subjects || [],
          availability: data.availability || [],
          rating: data.rating || 5.0,
          price: data.classPricing || data.price || 160,
          // Removed sensitive fields (upiId, phone) for Single Source security
          classTaught: data.classTaught || '',
          avatar: data.avatar || data.profileImage || '',
          bio: data.bio || '',
          experience: data.experience || 'Fresher',
          qualification: data.qualification || '',
          reviews: data.reviews || [],
          subjectsPricing: data.subjectsPricing || []
        };
      });
      setTutors(tutorList);
    }, (err) => {
      console.error("Error fetching tutors:", err);
      setTutors([]);
    });

    return () => unsubTutors();
  }, []);

  useEffect(() => {
    if (!currentUser?.email) return;
    const bQuery = query(collection(db, 'bookings'), where('studentEmail', '==', currentUser.email));
    const unsubBookings = onSnapshot(bQuery, (snap) => {
      const bookingList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      setBookings(bookingList);
    }, (err) => {
      console.error("Error fetching bookings:", err);
    });
    return () => unsubBookings();
  }, [currentUser?.email]);

  const [chats, setChats] = useState<Chat[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const uid = currentUser.id;

    const nQuery = query(
      collection(db, 'notifications'), 
      where('userId', '==', uid)
    );
    
    const unsubNotifs = onSnapshot(nQuery, (snap) => {
      const notifList = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as any));
      
      notifList.sort((a, b) => {
         const timeA = a.time?.seconds ? a.time.seconds * 1000 : new Date(a.time).getTime();
         const timeB = b.time?.seconds ? b.time.seconds * 1000 : new Date(b.time).getTime();
         return timeB - timeA;
      });
      
      setNotifications(notifList);
    });

    return () => unsubNotifs();
  }, [currentUser?.id, currentUser?.email]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed' | 'cancelled'>('idle');
  const [paymentData, setPaymentData] = useState<{paymentId?: string, orderId?: string, status?: string}>({});
  const [bookingFormData, setBookingFormData] = useState<any>(null);
  const [bookingPlan, setBookingPlan] = useState<string>('');
  const [bookingSelectedDate, setBookingSelectedDate] = useState<string>('');
  const [bookingSelectedSubject, setBookingSelectedSubject] = useState<string>('');
  const [bookingSelectedTime, setBookingSelectedTime] = useState<string>('');
  const [bookingDuration, setBookingDuration] = useState('');
  const [bookingType, setBookingType] = useState<'demo' | 'paid'>('paid');
  
  useEffect(() => {
    if (selectedTutor && bookingSelectedDate) {
      const tutorBookings = bookings.filter(b => b.tutorId === selectedTutor.id);
      const tutorAvailability = selectedTutor.availability || [];
      
      // Get the selected weekday name (same as render logic)
      const dateObj = new Date(bookingSelectedDate);
      const selectedDay = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

      // Filter by matching day OR specific date — same logic as the render
      const rawSlots = tutorAvailability.filter((s: any) => {
        if (typeof s === 'string') return true;
        if (s.status === 'busy') return false;
        if (s.date) return s.date === bookingSelectedDate;
        if (s.day) return s.day.toLowerCase() === selectedDay.toLowerCase();
        return false;
      });

      // Expand time ranges into individual hourly slots
      const expandedSlots: string[] = [];
      rawSlots.forEach((s: any) => {
        const startTime = typeof s === 'string' ? s : (s.start || '');
        const endTime = typeof s === 'string' ? '' : (s.end || '');
        if (!startTime) return;
        const startMins = parseTime(startTime);
        const endMins = endTime ? parseTime(endTime) : startMins + 60;
        for (let m = startMins; m < endMins; m += 60) {
          expandedSlots.push(formatMins(m));
        }
      });

      // Remove already-booked slots
      const finalSlots = expandedSlots.filter(slotTime => {
        return !tutorBookings.some(b =>
          b.date === bookingSelectedDate &&
          b.time === slotTime &&
          ['confirmed', 'pending', 'live', 'rescheduled'].includes(b.status)
        );
      });

      // If tutor has real slots for this day, clear any stale time selection
      if (finalSlots.length > 0 && bookingSelectedTime === '10:00 AM') {
        setBookingSelectedTime('');
      }
    }
  }, [bookingSelectedDate, selectedTutor]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');

  const getBookingAmount = () => {
    if (!selectedTutor) return 0;

    const planToUse = bookingFormData?.plan || bookingPlan;
    const currentDur = parseFloat(bookingFormData?.duration || bookingDuration || '0');
    const subject = bookingSelectedSubject || bookingFormData?.subject;

    if (!currentDur) return 0;
    if (bookingType === 'paid' && !planToUse) return 0;
    if (!subject) return 0;

    // Use latest data from tutors list if available to ensure sync
    const latestTutor = tutors.find(t => t.id === selectedTutor.id) || selectedTutor;

    // Check for subject-specific pricing first
    const sp = latestTutor?.subjectsPricing?.find((p: any) => p.subject === subject);
    const entry = (latestTutor as any)?.pricingEntries?.find((e: any) => e.subject === subject);
    
    let baseRate = parseFloat(String(latestTutor?.price || '0')) || 0;
    
    if (entry && entry.hourlyRate) {
      baseRate = entry.hourlyRate;
    } else if (sp) {
      if (sp.type === 'course') {
        return Math.ceil(sp.price * 1.17);
      }
      // If it's stored as monthly price, get hourly rate
      baseRate = sp.price / 30;
    }

    // --- Standard formula: Base = rate × hours × days, Final = Base × 1.17 ---
    let days = 1; 
    if (planToUse === '6months') days = 180;
    else if (planToUse === '3months') days = 90;
    else if (planToUse === '1month' || planToUse === 'monthly') days = 30;
    else if (planToUse === 'subscription') days = 365; // Keep for legacy compatibility

    const base   = baseRate * currentDur * days;
    const fee    = base * 0.17;
    return Math.ceil(base + fee);
  };

  const getPlanFeatures = (plan: string) => {
    switch (plan) {
      case '1month':
      case 'monthly':
        return ['Single Subject Access', 'One-on-One Sessions', 'Platform Fee Applied', 'Basic Assignments'];
      case '3months':
        return ['Up to 2 Subjects', 'Doubt Classes Included', 'Tutor Notes', 'Reduced Platform Fee', '10% Refund Policy'];
      case '6months':
        return ['Up to 4 Subjects', 'Extra Doubt Classes', 'Full Notes Access', 'NO Platform Fee', '25% Refund Policy'];
      case 'subscription':
        return ['Up to 8 Subjects', 'Premium Notes & Mock Tests', 'Extra Support', 'NO Platform Fee', '40% Refund Policy'];
      case 'course':
        return ['Full Course Lifetime Access', 'Project Support', 'Certificate on Completion', 'Placement Assistance'];
      default:
        return [];
    }
  };

  const calculateTotal = () => {
    if (bookingType === 'demo') return 'Free First Demo Session';
    
    const planToUse = bookingFormData?.plan || bookingPlan;
    const dur = parseFloat(bookingFormData?.duration || bookingDuration || '0');
    const subject = bookingSelectedSubject || bookingFormData?.subject;
    const date = bookingSelectedDate || bookingFormData?.date;
    const time = bookingSelectedTime || bookingFormData?.time;

    // Requirement: Show total only after ALL fields are selected
    if (!subject || !planToUse || !dur || !date || !time) {
      return 'Please Select All Fields To See Total';
    }

    const amt = getBookingAmount();
    if (amt === 0) return 'Invalid configuration';

    const walletFunds = currentUser?.walletBalance || 0;
    const isWalletUsed = walletFunds > 0;
    const finalPayable = Math.max(0, amt - walletFunds);
    
    let planLabel = 'Enrollment Total';
    if (planToUse === 'course' || selectedTutor?.subjectsPricing?.find((sp: any) => sp.subject === bookingSelectedSubject)?.type === 'course') {
      planLabel = 'Course Fee';
    } else if (planToUse === 'subscription') {
      planLabel = 'Year Plan';
    } else if (planToUse === '6months') {
      planLabel = '6 Months Plan';
    } else if (planToUse === 'monthly' || planToUse === '1month' || planToUse === '3months') {
      planLabel = planToUse === '1month' ? 'One Month Plan' : planToUse === '3months' ? 'Three Months Plan' : 'Plan Total';
    }

    if (isWalletUsed) {
      return (
        <div className="flex flex-col gap-1 items-end">
          <span className="text-[10px] text-slate-400 font-bold uppercase line-through">₹{amt.toLocaleString('en-IN')}</span>
          <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
             <Wallet size={10} /> - ₹{Math.min(amt, walletFunds).toLocaleString('en-IN')} Wallet Applied
          </span>
          <span className="text-primary font-black">Net Total: ₹{finalPayable.toLocaleString('en-IN')}</span>
        </div>
      );
    }
    
    return `${planLabel}: ₹${amt.toLocaleString('en-IN')}`;
  };

  // --- Real-time Notes Notification for Student ---
  useEffect(() => {
    if (!currentUser || !['standard', 'premium'].includes(currentTier)) return;

    const normalize = (s: string = '') => s.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const enrolledSubjects = Array.from(new Set(bookings.filter(b => ['confirmed', 'completed', 'pending'].includes(b.status)).map(b => normalize(b.subject))));
    const studentClass = normalize(currentUser.class);

    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const note = change.doc.data();
          const noteCreatedAt = note.createdAt?.seconds ? note.createdAt.seconds * 1000 : Date.now();
          
          // Only notify for fresh notes (less than 1 minute old) to avoid spamming old notes on load
          if (Date.now() - noteCreatedAt < 60000) {
            const noteSubject = normalize(note.subject || '');
            const targetClass = normalize(note.targetClass || note.class || '');
            
            const matchesClass = !targetClass || targetClass === studentClass || targetClass.includes(studentClass) || studentClass.includes(targetClass);
            const matchesSubject = enrolledSubjects.length === 0 || enrolledSubjects.includes(noteSubject) || enrolledSubjects.some(s => s.includes(noteSubject) || noteSubject.includes(s));

            if (matchesClass && matchesSubject) {
              setNotifications(prev => [{
                id: `note_${change.doc.id}`,
                title: 'New Study Material!',
                message: `${note.tutorName} uploaded new notes for ${note.subject}: "${note.fileName}"`,
                time: 'Just now',
                type: 'update',
                read: false,
                link: 'notes'
              }, ...prev]);
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser?.id, currentTier, bookings.length]);

  // --- Real-time Attendance & Global Status Engine ---
  useEffect(() => {
    if (!bookings.length || !currentUser) return;

    const engineInterval = setInterval(async () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const isoToday = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

      bookings.forEach(async (b) => {
        // 1. Status updates only for confirmed, pending, or live classes
        if (b.status === 'confirmed' || b.status === 'pending' || b.status === 'live') {
          const isToday = b.date === todayStr || b.date === isoToday;
          const bMins = parseTime(b.time);
          const diff = bMins - nowMins;
          const durationHrs = parseFloat(b.duration || '1');
          const durationMins = durationHrs * 60;

          // 0. AUTO-MARK PAST DAYS: If the booking date is before today, mark as not attended
          if (!isToday) {
            // Parse booking date to compare
            const bookingDate = new Date(b.date);
            const todayDate = new Date(isoToday);
            if (bookingDate < todayDate && !isNaN(bookingDate.getTime())) {
              const bRef = doc(db, 'bookings', b.id);
              if (b.studentPresent && b.tutorPresent && b.topic && b.talkingTime >= 60) {
                await updateDoc(bRef, { 
                  status: 'completed', 
                  attendance_status: 'attended',
                  attendedCount: increment(1),
                  completedAt: serverTimestamp() 
                });
              } else {
                await updateDoc(bRef, { 
                  status: 'cancelled', 
                  attendance_status: 'not_attended' 
                });
              }
              return; // Skip further checks for past-day bookings
            }
          }

          // 1a. 10min Notification Hook (Pre-class) — also notify tutor
          if (isToday && diff === 10 && currentUser?.notifications?.reminders !== false) {
            const notifId = `rem_${b.id}`;
            const alreadyExists = notifications.some(n => n.id === notifId);
            if (!alreadyExists) {
              setNotifications(prev => [{
                id: notifId,
                title: 'Class Starts in 10m!',
                message: `Your session for ${b.subject} with ${b.tutorName} starts soon. The Join button is now enabled.`,
                time: 'Just now',
                type: 'booking',
                read: false,
                link: 'dashboard'
              }, ...prev]);

              // Also notify tutor about the upcoming class
              addDoc(collection(db, 'tutor_notifications'), {
                tutorId: b.tutorId,
                type: 'reminder',
                title: 'Class Starts in 10m!',
                description: `Your session for ${b.subject} with ${b.studentName} starts soon.`,
                time: 'Just now',
                read: false,
                createdAt: serverTimestamp()
              });
            }
          }

          // 1b. Completion/Not-Attended Logic (after class end time)
          if (isToday && nowMins > (bMins + durationMins)) {
            const bRef = doc(db, 'bookings', b.id);
            // Require 10 minutes (600s) of interaction and successful join
            if (b.studentJoined && b.tutorPresent && b.topic && (b.talkingTime || 0) >= 600) {
              await updateDoc(bRef, { 
                status: 'completed', 
                attendance_status: 'attended',
                attendedCount: increment(1),
                completedAt: serverTimestamp() 
              });
            }
          }
          
        }





        // 4. Two-week Review Prompt - ONLY if student has actually ATTENDED at least one class
        const attendedBookings = bookings.filter(b => b.status === 'completed' && b.attendance_status === 'attended');
        const tutorsToReview = new Set(attendedBookings.filter(b => !b.reviewSubmitted).map(b => b.tutorId));
        
        tutorsToReview.forEach(async (tid) => {
          const tutorBookings = attendedBookings.filter(b => b.tutorId === tid);
          const lastReview = tutorBookings.filter(b => b.reviewSubmitted).sort((a,b) => (b.reviewedAt?.seconds || 0) - (a.reviewedAt?.seconds || 0))[0];
          
          const fourteenDaysAgo = new Date();
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
          
          const needsReview = !lastReview || (lastReview.reviewedAt && (lastReview.reviewedAt.seconds * 1000) < fourteenDaysAgo.getTime());
          
          if (needsReview) {
            const reviewNotifId = `review_prompt_${tid}`;
            if (!notifications.some(n => n.id === reviewNotifId)) {
              const tutorName = tutorBookings[0]?.tutorName || 'your tutor';
              setNotifications(prev => [{
                id: reviewNotifId,
                title: 'Review Your Tutor',
                message: `It's been two weeks since your sessions with ${tutorName}. Please share your feedback!`,
                time: 'Just now',
                type: 'update',
                read: false,
                link: 'reviews'
              }, ...prev]);
            }
          }
        });
      });
    }, 60000); // Audit every minute

    return () => clearInterval(engineInterval);
  }, [bookings, currentUser, notifications]);

  // --- Live Class States ---
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionTimer, setSessionTimer] = useState("00:00:00");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'connecting' | 'live' | 'disconnected'>('waiting');
  const [liveMessages, setLiveMessages] = useState<{id: string, sender: string, text: string, time: string}[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  
  // WebRTC Refs
  const socketRef = useRef<any>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<{socketId: string, stream: MediaStream, userId: string, userName?: string}[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const startSession = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !currentUser?.email) return;

    // 🔐 VALIDATE ENTRY (10 min logic) 🔐
    const now = new Date();
    const sessionMins = parseTime(booking.time);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const diff = sessionMins - nowMins;
    const isToday = booking.date === now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || booking.date === (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'));

    if (!isToday || diff > 10) {
      alert("🕒 Class not started yet. You can join 10 minutes before the scheduled time.");
      return;
    }

    setView('live-class');
    setSessionStatus('connecting');
    setActiveMeetingId(bookingId);
    
    // Initialize Local Media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera/Mic Access Denied:", err);
      alert("Please allow camera and microphone access to join the class.");
    }

    // Socket.IO Signaling Setup
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    socketRef.current = io(`${protocol}//${hostname}:5001`);
    
    socketRef.current.emit('join-room', { 
      roomId: bookingId, 
      userId: currentUser.id, 
      userName: currentUser.name,
      role: 'student'
    });

    // Handle existing users
    socketRef.current.on('all-users', (users: any[]) => {
      users.forEach(user => {
        const pc = createPeerConnection(user.socketId, bookingId);
        peersRef.current.set(user.socketId, pc);
        // We are the joiner, we send the offer
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
          socketRef.current.emit('signal', { to: user.socketId, signal: offer });
        });
      });
    });

    // Handle new users joining
    socketRef.current.on('user-joined', ({ socketId, userId, userName, role }: any) => {
      console.log(`👤 ${role === 'tutor' ? 'Tutor' : 'Student'} Joined:`, userName);
      setSessionStatus('live');
    });

    socketRef.current.on('user-media-toggled', ({ socketId, type, enabled }: any) => {
      console.log(`🎥 Media Toggled by ${socketId}: ${type} is now ${enabled}`);
    });

    // Handle incoming signals (Offer/Answer/Candidate)
    socketRef.current.on('signal', async ({ from, signal }: any) => {
      let pc = peersRef.current.get(from);
      
      if (signal.type === 'offer') {
        if (!pc) {
          pc = createPeerConnection(from, bookingId);
          peersRef.current.set(from, pc);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit('signal', { to: from, signal: answer });
      } else if (signal.type === 'answer') {
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    });

    socketRef.current.on('receive-message', (data: any) => {
      setLiveMessages(prev => [...prev, data]);
    });

    socketRef.current.on('user-left', ({ socketId }: any) => {
      const pc = peersRef.current.get(socketId);
      if (pc) pc.close();
      peersRef.current.delete(socketId);
      setRemoteStreams(prev => prev.filter(s => s.socketId !== socketId));
    });

    // Update Firestore Entry
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { studentJoined: true });
    } catch (e) { console.error("Firestore sync error:", e); }
  };

  // Sync Media Status to Room (Dynamic UI)
  useEffect(() => {
    if (socketRef.current && sessionStatus === 'live' && activeMeetingId) {
      socketRef.current.emit('toggle-media', {
        roomId: activeMeetingId,
        type: 'audio',
        enabled: isMicOn
      });
    }
  }, [isMicOn]);

  useEffect(() => {
    if (socketRef.current && sessionStatus === 'live' && activeMeetingId) {
      socketRef.current.emit('toggle-media', {
        roomId: activeMeetingId,
        type: 'video',
        enabled: isCamOn
      });
    }
  }, [isCamOn]);

  const createPeerConnection = (socketId: string, roomId: string) => {
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ] 
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('signal', { to: socketId, signal: { candidate: e.candidate } });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStreams(prev => {
        if (prev.find(s => s.socketId === socketId)) return prev;
        return [...prev, { socketId, stream: e.streams[0], userId: 'remote' }];
      });
      setSessionStatus('live');
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
    }

    return pc;
  };



  // --- Push Notification Registration ---
  useEffect(() => {
    const setupNotifications = async () => {
      if (!messaging || !currentUser?.email) return;

      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { 
            vapidKey: 'BGFS0hv59YGe6BMn5-wcbjlBLu0jw5Gd_zBsVZPPFX-16YOYB92_9qbaIp_SyUE4DeG7HH9-suupaEveV6vIrj4'
          });
          
          if (token) {
            console.log('FCM Token generated');
            const studentRef = doc(db, 'students', currentUser.id);
            await updateDoc(studentRef, {
              fcmTokens: arrayUnion(token)
            });
          }
        }
      } catch (error) {
        console.error('Push notification setup failed:', error);
      }
    };

    if (currentUser && currentUser.notifications?.push !== false) {
      setupNotifications();
      const unsubscribe = onMessage(messaging!, (payload) => {
        console.log('Foregound message received:', payload);
        // Display browser notification if enabled
      });
      return () => unsubscribe();
    }
  }, [currentUser]);


  const handleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      setIsCamOn(false);
      setTimeout(() => setIsCamOn(true), 100);
    } else {
      try {
        const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setIsCamOn(true);
        };
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        if (isCamOn && view === 'live-class' && sessionStatus !== 'disconnected') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        } else {
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCamOn, isMicOn, view, sessionStatus]);

  useEffect(() => {
    let interval: any;
    if (sessionStatus === 'live' && sessionStartTime) {
      interval = setInterval(() => {
        const diff = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setSessionTimer(`${h}:${m}:${s}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStatus, sessionStartTime]);

  const endSession = async () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setRemoteStreams([]);

    if (activeMeetingId && currentUser?.email) {

      try {
        const bookingRef = doc(db, 'bookings', activeMeetingId);
        const bookingSnap = await getDoc(bookingRef);
        const bookingData = bookingSnap.data() as Booking;
        
        let duration = 0;
        const now = new Date();
        const emailKey = currentUser.email.replace(/\./g, '_');

        if (bookingData.isGroup && bookingData.participantData && bookingData.participantData[emailKey]) {
          const joinTime = bookingData.participantData[emailKey].joinTime?.toDate() || new Date();
          duration = Math.floor((now.getTime() - joinTime.getTime()) / 60000);
          
          await updateDoc(bookingRef, {
            [`participantData.${emailKey}.leaveTime`]: serverTimestamp(),
            [`participantData.${emailKey}.status`]: duration >= 12 ? 'attended' : 'not_attended',
            studentPresent: false
          });
        } else {
          const joinTime = bookingData.studentJoinTime?.toDate() || new Date();
          duration = Math.floor((now.getTime() - joinTime.getTime()) / 60000);
          
          await updateDoc(bookingRef, {
            studentPresent: false,
            studentLeaveTime: serverTimestamp(),
            attendance_status: (duration >= 10 && bookingData.tutorJoined) ? 'attended' : 'not_attended'
          });
        }
      } catch (e) {
        console.error("Error updating leave time:", e);
      }
    }
    
    // Topic check prompt if class was valid
    const b = bookings.find(bk => bk.id === activeMeetingId);
    if (b && !b.topic && sessionStatus === 'live') {
       const t = prompt("What was the main topic covered in today's class?");
       if (t) await updateDoc(doc(db, 'bookings', b.id), { topic: t });
    }
    setSessionStatus('disconnected');
    setSessionStartTime(null);
    setSessionTimer("00:00:00");
    setTimeout(() => {
      setActiveMeetingId(null);
      setView('dashboard');
    }, 2000);
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeMeetingId) {
        updateDoc(doc(db, 'bookings', activeMeetingId), {
          studentPresent: false,
          studentLeaveTime: new Date() // Use client date as fallback
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeMeetingId]);

  const handleSendLiveMessage = async (text: string, isReaction: boolean = false) => {
    if (!text.trim() || !activeMeetingId) return;
    
    if (isReaction) {
      const newMessage = {
        id: Date.now().toString(),
        sender: 'System',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setLiveMessages(prev => [...prev.filter(m => m.text !== text), newMessage]);
      return;
    }

    await addDoc(collection(db, `live_sessions/${activeMeetingId}/messages`), {
      sender: currentUser?.name || 'Student',
      senderId: currentUser?.id,
      text,
      timestamp: serverTimestamp()
    });
  };  const openChat = async (tutorId: string) => {
    if (!currentUser?.email) return;

    const studentEmailKey = currentUser.email.replace(/\./g, '_');
    const chatId = `${tutorId}_${studentEmailKey}`;
    
    // Ensure chat document exists in 'whatsapp'
    const chatRef = doc(db, 'whatsapp', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) {
      const tutor = tutors.find(t => t.id === tutorId) || MOCK_TUTORS.find(t => t.id === tutorId);
      const initialMsg = 'Hi! I am interested in your classes.';
      
      await setDoc(chatRef, {
        tutorId: tutorId,
        tutorName: tutor?.name || 'Tutor',
        tutorAvatar: tutor?.avatar || '',
        studentEmail: currentUser.email,
        studentName: currentUser.name || 'Student',
        lastMessage: initialMsg,
        lastMessageTime: new Date().toISOString(),
        timestamp: serverTimestamp(),
        studentUnreadCount: 0,
        tutorUnreadCount: 1
      });

      // Add actual message record so it's not empty
      await addDoc(collection(chatRef, 'messages'), {
        senderId: currentUser.email,
        text: initialMsg,
        timestamp: serverTimestamp(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'TODAY',
        deletedBy: []
      });
    }

    setActiveChatId(chatId);
    setView('chat');
  };
  const processPayment = async (upiOption: string) => {
    if (!selectedTutor || !bookingFormData) return;
    
    setPaymentStatus('processing');
    
    // 1. Calculate amount (using centralized getBookingAmount helper)
    const grossAmount = getBookingAmount();
    let amountStr = grossAmount.toString();

    let finalAmount = parseFloat(amountStr);
    const walletFunds = currentUser?.walletBalance || 0;
    const useWallet = walletFunds > 0;
    
    if (useWallet) {
      if (walletFunds >= finalAmount) {
        // Fully covered by wallet
        finalAmount = 0;
      } else {
        finalAmount -= walletFunds;
      }
    }

    if (finalAmount === 0) {
      setPaymentStatus('success');
      confirmBookingAfterPayment('wallet_pay_id', 'wallet_order_id', grossAmount);
      return;
    }

    try {
      // 2. Create Order on Backend
      const hostname = window.location.hostname;
      const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || `http://${hostname}:5001`;
      const orderResponse = await fetch(`${backendBaseUrl}/api/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: finalAmount,
          receipt: `rcpt_${bookingFormData.id}`,
          notes: {
            bookingId: bookingFormData.id,
            studentId: currentUser?.id,
            studentEmail: currentUser?.email,
            subject: bookingFormData.subject,
            tutorId: selectedTutor.id,
            tutorName: selectedTutor.name,
            plan: bookingFormData.plan,
            type: bookingFormData.type
          }
        })
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.message || 'Failed to create order');

      // 3. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Eduqra",
        description: `${getSubjectName(bookingFormData.subject)} with ${selectedTutor.name}`,
        // image: "/logo.png", // Disabled to avoid CORS error on localhost
        order_id: orderData.orderId,
        handler: async function (response: any) {
          console.log("✅ Payment Successful:", response.razorpay_payment_id);
          setPaymentData({ 
            paymentId: response.razorpay_payment_id, 
            orderId: response.razorpay_order_id, 
            status: 'success' 
          });
          setPaymentStatus('success');
      await confirmBookingAfterPayment(
        response.razorpay_payment_id, 
        response.razorpay_order_id, 
        grossAmount
      );
        },
        prefill: {
          name: currentUser?.name || "",
          email: currentUser?.email || "",
          contact: currentUser?.mobile || ""
        },
        theme: { color: "#000000" },
        modal: {
          ondismiss: function() { setPaymentStatus('idle'); }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      console.error('❌ Payment Error:', err);
      setPaymentStatus('cancelled');
      showToast("Payment initialization failed: " + err.message, "error");
    }
  };

  const confirmBookingAfterPayment = async (paymentId: string, orderId: string, amount: number) => {
    if (!bookingFormData || !selectedTutor) return;

    const isSub = bookingFormData.plan === 'subscription' || bookingFormData.plan === 'monthly' || bookingFormData.plan === '6months';
    const nextBilling = new Date();
    nextBilling.setDate(nextBilling.getDate() + 30);

    try {
      const isWalletUsed = paymentId === 'wallet_pay_id';
      const walletFunds = currentUser?.walletBalance || 0;
      const appliedWalletAmount = isWalletUsed ? amount : Math.min(walletFunds, amount + walletFunds); // This is simplified

      await updateDoc(doc(db, 'bookings', bookingFormData.id), {
        status: 'pending',
        paymentId: paymentId,
        orderId: orderId,
        amount: amount,
        paidAt: serverTimestamp(),
        isSubscription: isSub,
        subscriptionStatus: isSub ? 'active' : null,
        nextBillingDate: isSub ? nextBilling : null,
        walletUsed: appliedWalletAmount > 0,
        walletAmount: appliedWalletAmount,
        tierAtBooking: currentUser?.subscription?.tier || 'free'
      });

      // Deduct from student wallet if used
      if (currentUser?.id && walletFunds > 0) {
        const deduction = isWalletUsed ? amount : walletFunds; 
        await updateDoc(doc(db, 'students', currentUser.id), {
          walletBalance: increment(-Math.min(deduction, walletFunds))
        });
      }

      const hostname = window.location.hostname;
      const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || `http://${hostname}:5001`;
      fetch(`${backendBaseUrl}/api/booking-success`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking: {
            ...bookingFormData,
            studentEmail: currentUser?.email,
            studentName: currentUser?.name,
            tutorName: selectedTutor?.name,
            tutorEmail: selectedTutor?.email
          }
        })
      }).catch(console.error);

      await addDoc(collection(db, 'admin_notifications'), {
        type: 'Payment Success',
        title: 'Enrollment Confirmed',
        message: `${currentUser?.name} paid ₹${amount} for ${getSubjectName(bookingFormData.subject)}.`,
        bookingId: bookingFormData.id,
        time: serverTimestamp(),
        read: false
      });

      await addDoc(collection(db, 'tutor_notifications'), {
        tutorId: selectedTutor.id,
        type: 'booking',
        title: 'Enrollment Confirmed',
        description: `${currentUser?.name} has enrolled for ${getSubjectName(bookingFormData.subject)}.`,
        time: 'Just now',
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Firestore Update Error:", e);
    }
  };



  const processUpgradePayment = async (plan: any) => {
    if (!currentUser) return;
    
    // 1. Calculate amount (matching backend logic)
    const amountStr = plan.price;
    if (parseFloat(amountStr) === 0) {
       // Free plan doesn't need Razorpay
       const subEnd = new Date();
       subEnd.setMonth(subEnd.getMonth() + 3);
       const subLimit = plan.tier === 'free' ? 3 : plan.tier === 'standard' ? 5 : 8;
       const updatedSub: SubscriptionPlan = {
         tier: plan.tier,
         status: 'active',
         startDate: new Date().toISOString(),
         expiresAt: subEnd.toISOString(),
         allowedSubjects: subLimit
       };
       const uid = auth.currentUser?.uid || currentUser?.id;
       if (uid && uid !== 'test_user_id') {
         await updateDoc(doc(db, 'students', uid), { subscription: updatedSub });
       }
       setCurrentUser({ ...currentUser, subscription: updatedSub });
       alert(`Congratulations! You have upgraded to ${plan.name}.`);
       return;
    }

    try {
      // 2. Create Order on Backend
      const hostname = window.location.hostname;
      const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || `http://${hostname}:5001`;
      const orderResponse = await fetch(`${backendBaseUrl}/api/create-razorpay-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: parseFloat(amountStr),
          receipt: `upgrade_${currentUser.email.replace(/\./g, '_')}`,
          notes: {
            studentId: currentUser.id,
            studentEmail: currentUser.email,
            type: 'upgrade',
            planName: plan.name,
            planId: plan.id
          }
        })
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.message || 'Failed to create order');

      // 3. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Eduqra Platform Upgrade",
        description: `Upgrading to ${plan.name} Plan`,
        // image: "/logo.png", // Disabled to avoid CORS error on localhost
        order_id: orderData.orderId,
        handler: async function (response: any) {
          console.log("✅ Upgrade Payment Successful:", response.razorpay_payment_id);
          await confirmUpgradeAfterPayment(plan, response.razorpay_payment_id, response.razorpay_order_id);
        },
        prefill: {
          name: currentUser.name || "",
          email: currentUser.email || "",
          contact: currentUser.mobile || ""
        },
        theme: { color: "#000000" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      console.error('❌ Upgrade Error:', err);
      alert("Upgrade failed: " + err.message);
    }
  };

  const confirmUpgradeAfterPayment = async (plan: any, paymentId: string, orderId: string) => {
    const subEnd = new Date();
    subEnd.setMonth(subEnd.getMonth() + 3);
    const subLimit = plan.tier === 'free' ? 1 : plan.tier === 'standard' ? 3 : 8;
    const updatedSub: SubscriptionPlan = {
      tier: plan.tier,
      status: 'active',
      startDate: new Date().toISOString(),
      expiresAt: subEnd.toISOString(),
      allowedSubjects: subLimit
    };

    const uid = auth.currentUser?.uid || currentUser?.id;
    if (uid && uid !== 'test_user_id') {
      await updateDoc(doc(db, 'students', uid), { 
        subscription: updatedSub,
        lastUpgradePaymentId: paymentId,
        lastUpgradeOrderId: orderId
      });

      // Notify admin
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'Upgrade Success',
        title: 'Platform Upgraded',
        message: `${currentUser?.name} upgraded to ${plan.name} plan.`,
        time: serverTimestamp(),
        read: false
      });

      // Notify student
      await addDoc(collection(db, 'notifications'), {
        userId: uid,
        type: 'update',
        title: 'Platform Upgraded Successfully',
        message: `Welcome to the ${plan.name} plan! Your features are unlocked for 3 months.`,
        time: new Date().toISOString(),
        read: false
      });
    }

    setCurrentUser({ ...currentUser!, subscription: updatedSub });
    notifyTutorsOfPlanUpdate(currentUser?.name || 'Student', updatedSub.tier, bookings);
    alert(`Congratulations! You have upgraded to ${plan.name}.`);
    setView('dashboard');
  };

  const cancelPayment = () => {
    setPaymentStatus('cancelled');
    setTimeout(() => {
      setIsPaymentModalOpen(false);
      setIsBookingModalOpen(true); // Bring user back to booking modal
    }, 1500);
  };

  // --- REAL-TIME SLOT CLOCK ---
  const [currentSystemTime, setCurrentSystemTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentSystemTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // --- REAL-TIME TUTOR SYNC FOR BOOKING ---
  const [activeTutorDoc, setActiveTutorDoc] = useState<any>(null);
  useEffect(() => {
    if (!isBookingModalOpen || !selectedTutor?.id) {
      setActiveTutorDoc(null);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', selectedTutor.id), (snap) => {
      if (snap.exists()) {
        setActiveTutorDoc({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [isBookingModalOpen, selectedTutor?.id]);


  // --- REAL-TIME CHAT SYNC (Rename to whatsapp) ---
  useEffect(() => {
    if (!currentUser?.email) return;
    console.log("Syncing chats for:", currentUser.email);

    // Listen to chats where user is participant
    const cQuery = query(collection(db, 'whatsapp'), where('studentEmail', '==', currentUser.email));
    const unsubChats = onSnapshot(cQuery, (snap) => {
      setChats(prev => {
        const chatList = snap.docs.map(d => {
          const data = d.data();
          const existing = prev.find(p => p.id === d.id);
          // Use the timestamp to determine a smart date label
          const getSmartDate = (dateVal: any) => {
            if (!dateVal) return 'Active';
            let d: Date;
            if (dateVal.seconds) d = new Date(dateVal.seconds * 1000);
            else d = new Date(dateVal);

            if (isNaN(d.getTime())) return 'Active';

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

            if (msgDate.getTime() === today.getTime()) {
              return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            if (msgDate.getTime() === yesterday.getTime()) return 'YESTERDAY';
            
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
          };

          return {
            id: d.id,
            tutorId: data.tutorId,
            tutorName: data.tutorName,
            avatar: data.tutorAvatar || '',
            lastMessage: data.lastMessage || 'No messages yet',
            time: getSmartDate(data.timestamp || data.lastMessageTime),
            unreadCount: data.studentUnreadCount || 0,
            tutorUnreadCount: data.tutorUnreadCount || 0,
            timestamp: data.timestamp,
            messages: existing?.messages || []
          } as any;
        });

        const sortedChats = chatList.sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        });
        console.log(`Synced ${sortedChats.length} real chats`);
        // Merge with mock chats, but only keep mock chats for tutors we DON'T have a real chat for
        const filteredMockChats = MOCK_CHATS.filter(mock => !sortedChats.some(real => real.tutorId === mock.tutorId));
        return [...filteredMockChats, ...sortedChats];
      });
    }, (err) => {
      console.error("Chat sync error:", err);
    });

    return () => unsubChats();
  }, [currentUser?.email]);

  // Sync messages for active chat
  useEffect(() => {
    if (!activeChatId || !currentUser?.email) return;

    const chatId = activeChatId.includes('_') ? activeChatId : `${activeChatId}_${currentUser.email.replace(/\./g, '_')}`;
    
    const q = query(
      collection(db, `whatsapp/${chatId}/messages`), 
      orderBy('timestamp', 'asc')
    );

    const unsubMsgs = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // 'me' if student sent it, otherwise 'tutor'
          sender: data.senderId === currentUser.email ? 'me' : 'tutor'
        };
      }).filter((m: any) => !m.deletedBy?.includes(currentUser.email));

      setChats(prev => prev.map(c => {
        const cId = c.id || `${(c as any).tutorId}_${currentUser.email.replace(/\./g, '_')}`;
        return cId === chatId ? { ...c, messages: msgs as Message[] } : c;
      }));
      
      // Mark as read
      const chatDocRef = doc(db, 'whatsapp', chatId);
      setDoc(chatDocRef, { studentUnreadCount: 0 }, { merge: true });
    });

    return () => unsubMsgs();
  }, [activeChatId, currentUser?.email]);

  const baseSendMessage = async (payload: any) => {
    if (!activeChatId || !currentUser?.email) return;
    // chatId format: tutorId_studentEmailKey
    const chatId = activeChatId.includes('_') ? activeChatId : `${activeChatId}_${currentUser.email.replace(/\./g, '_')}`;
    
    // Extract tutorId from chatId (everything before the first _)
    const tutorId = chatId.split('_')[0];
    const tutor = tutors.find(t => t.id === tutorId) || MOCK_TUTORS.find(t => t.id === tutorId);
    
    const chatRef = doc(db, 'whatsapp', chatId);
    const msgCol = collection(chatRef, 'messages');

    const now = new Date();
    const msg = {
      senderId: currentUser.email,
      timestamp: serverTimestamp(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toDateString(), // Store real date so 'Yesterday' works
      deletedBy: [],
      ...payload
    };

    // Write message first
    if (payload.editId) {
      // Editing an existing message
      const msgRef = doc(db, `whatsapp/${chatId}/messages`, payload.editId);
      await updateDoc(msgRef, { text: payload.text, edited: true });
    } else {
      await addDoc(msgCol, msg);
    }

    // Always update the chat document with full identity so tutor can find it
    await setDoc(chatRef, {
      tutorId: tutorId,
      tutorName: tutor?.name || 'Tutor',
      tutorAvatar: tutor?.avatar || '',
      studentEmail: currentUser.email,
      studentName: currentUser.name || 'Student',
      lastMessage: payload.text || (payload.type === 'poll' ? '📊 Poll' : '📎 Attachment'),
      lastMessageTime: now.toISOString(),
      timestamp: serverTimestamp(),
      tutorUnreadCount: increment(1),
      studentUnreadCount: 0
    }, { merge: true });

    // 4. Notify Tutor of new message
    if (tutorId && !payload.editId) {
      await addDoc(collection(db, 'tutor_notifications'), {
        tutorId: tutorId,
        type: 'message',
        title: `New Message from ${currentUser.name || 'Student'}`,
        description: payload.text || 'Sent an attachment',
        time: 'Just now',
        createdAt: serverTimestamp(),
        read: false
      });
    }
  };

  const sendMessage = async () => {
    const chatId = activeChatId;
    if (!chatId || !currentUser?.email) return;

    const currentDraft = drafts[chatId] || '';
    if (!currentDraft.trim()) return;

    if (editingMessageId) {
      // Edit existing message
      await baseSendMessage({ text: currentDraft.trim(), editId: editingMessageId });
    } else {
      await baseSendMessage({ text: currentDraft.trim() });
    }
    setDrafts(prev => ({ ...prev, [chatId]: '' }));
    setEditingMessageId(null);
  };

  const deleteMessage = async (msgId: string, everyone: boolean) => {
    if (!activeChatId || !currentUser) return;
    const chatId = activeChatId.includes('_') ? activeChatId : `${activeChatId}_${currentUser.email.replace(/\./g, '_')}`;
    const msgRef = doc(db, `whatsapp/${chatId}/messages`, msgId);

    if (everyone) {
      // Delete for Everyone
      await updateDoc(msgRef, {
        text: '🚫 This message was deleted',
        deletedForEveryone: true
      });
    } else {
      // Delete for Me
      await updateDoc(msgRef, {
        deletedBy: arrayUnion(currentUser.email)
      });
    }
  };

  // --- Dynamic Availability ---
  const [tutorBookings, setTutorBookings] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedTutor) return;
    
    const unsub = onSnapshot(query(collection(db, 'bookings'), where('tutorId', '==', selectedTutor.id)), (snap) => {
      setTutorBookings(snap.docs.map(d => d.data()));
    });
    return () => unsub();
  }, [selectedTutor]);

  useEffect(() => {
    if (!currentUser?.email) return;
    const q = query(
      collection(db, 'notifications'), 
      where('studentEmail', '==', currentUser.email)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[];
      
      // Filter based on Student Preferences
      const prefs = currentUser?.notifications || { reminders: true, messages: true, updates: true };
      const filtered = data.filter(n => {
        if (n.type === 'booking') return prefs.reminders !== false;
        if (n.type === 'message') return prefs.messages !== false;
        if (n.type === 'update' || n.type === 'platform') return prefs.updates !== false;
        return true;
      });

      setNotifications(filtered.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));
    });
    return () => unsub();
  }, [currentUser]);


  // --- Reschedule Availability ---
  useEffect(() => {
    if (!reschedulingBooking) {
      setRescheduleDate('');
      setRescheduleSlots([]);
      return;
    }
    
    const initialDate = rescheduleDate || reschedulingBooking.date;
    if (!rescheduleDate) setRescheduleDate(initialDate);

    const tutorId = reschedulingBooking.tutorId;
    const studentEmail = reschedulingBooking.studentEmail;
    const tutor = tutors.find(t => t.id === tutorId) || MOCK_TUTORS.find(t => t.id === tutorId);
    
    if (!tutor) return;

    // Note: Sunday is generally a holiday, but we allow rescheduling for regular students if the tutor has explicit slots.
    const isSunday = new Date(initialDate).getDay() === 0;

    const now = new Date();
    const isToday = initialDate === formatDateLocal(now);

    // Find the student's NEXT confirmed class to set a hard deadline
    const studentBookings = bookings
      .filter(b => b.studentEmail === studentEmail && b.id !== reschedulingBooking.id && b.status === 'confirmed')
      .sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime());
    
    // Find the first booking that happens AFTER the original class date or right now
    const nextClass = studentBookings.find(b => new Date(`${b.date} ${b.time}`) > now);
    const deadlineTime = nextClass ? new Date(`${nextClass.date} ${nextClass.time}`).getTime() : null;

    // Filter tutor bookings for conflicts
    const booked = bookings
      .filter(b => b.tutorId === tutorId && b.date === initialDate && b.status !== 'cancelled' && b.id !== reschedulingBooking.id)
      .map(b => {
        const s = parseTime(b.time);
        const durStr = b.duration ? b.duration.toString().replace(/ Hours?/, '') : '1';
        const d = (parseFloat(durStr) * 60) || 60;
        return { start: s, end: s + d };
      });

    const slots: string[] = [];
    // Convert tutor's manual slots to time strings for the selected date
    const getDayName = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    };
    
    const selectedDay = getDayName(initialDate);
    
    const manualSlotsRaw = (tutor.availability && tutor.availability.length > 0)
      ? tutor.availability
          .filter((slot: any) => {
            if (typeof slot === 'string') return true;
            if (!slot || typeof slot !== 'object') return false;
            // Filter out busy slots
            if (slot.status === 'busy') return false;
            if (slot.date) return slot.date === initialDate;
            if (slot.day) return slot.day.toLowerCase() === selectedDay.toLowerCase();
            return false;
          })
      : [];

    const baseAvailability = manualSlotsRaw.map((slot: any) => typeof slot === 'string' ? slot : (slot.start || ''))
          .filter((time: string) => !!time);

    manualSlotsRaw.forEach((s: any) => {
      const startTime = typeof s === 'string' ? s : (s.start || '');
      const endTime = typeof s === 'string' ? '' : (s.end || '');
      
      if (!startTime) return;

      const startMins = parseTime(startTime);
      const endMins = endTime ? parseTime(endTime) : startMins + 60;

      // Expand range in 1-hour intervals
      for (let slotStartMins = startMins; slotStartMins < endMins; slotStartMins += 60) {
        const slotEndMins = slotStartMins + 60;
        const slotTimeStr = formatMins(slotStartMins);
        const slotDateTime = new Date(`${initialDate} ${slotTimeStr}`).getTime();

        // Rule 1: Must be in the future (if today)
        if (isToday) {
          const minTime = now.getTime() + (60 * 60 * 1000); // At least 1 hour from now
          if (slotDateTime < minTime) continue;
        }

        // Rule 2: Must be BEFORE the next class
        if (deadlineTime && slotDateTime >= deadlineTime) continue;

        // Rule 3: Must not conflict with tutor's other bookings
        if (!booked.some(r => slotStartMins < r.end && slotEndMins > r.start)) {
          slots.push(slotTimeStr);
        }
      }
    });

    // Fallback if no manual slots found
    const finalSlots = Array.from(new Set(slots)).sort((a, b) => parseTime(a) - parseTime(b));
    setRescheduleSlots(finalSlots);
  }, [reschedulingBooking, rescheduleDate, bookings, tutors]);



  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = bookingType;
    if (!selectedTutor || !currentUser) return;
    
    // 🛡️ COMPREHENSIVE FIELD VALIDATION
    if (!bookingSelectedSubject) { alert("Please select a Subject first."); return; }
    if (type !== 'demo' && !bookingPlan) { alert("Please choose an Enrollment Plan."); return; }
    if (!bookingSelectedDate) { alert("Please select a Date."); return; }
    if (!bookingSelectedTime) { alert("Please select a Time Slot."); return; }
    if (type !== 'demo' && !bookingDuration) { alert("Please select a Class Duration."); return; }

    
    const form = e.target as HTMLFormElement;
    const rawSubject = (form.elements.namedItem('subject') as HTMLSelectElement)?.value || (bookingFormData?.subject || 'General');
    const subject = normalizeSubject(rawSubject);
    const date = (form.elements.namedItem('date') as HTMLInputElement)?.value || (bookingFormData?.date || '');
    const time = (form.elements.namedItem('time') as HTMLSelectElement)?.value || bookingSelectedTime || (bookingFormData?.time || '');
    const duration = (form.elements.namedItem('duration') as HTMLSelectElement)?.value || (bookingFormData?.duration || '1 Hour');
    const plan = (form.elements.namedItem('plan') as HTMLSelectElement)?.value as 'monthly' | 'subscription' | 'course' || 'subscription';
    const amount = getBookingAmount();

    // ⚡ PREVENT DUPLICATE BOOKINGS ⚡
    const isDuplicate = bookings.some(b => 
      b.tutorId === selectedTutor.id && 
      b.studentEmail === currentUser.email && 
      b.date === date && 
      b.time === time &&
      b.status !== 'cancelled'
    );

    if (isDuplicate) {
      alert(`⚠️ You already have a session booked for this exact time (${date} at ${time}). Please choose another slot or subject.`);
      return;
    }

    // 🛡️ TIER-BASED BOOKING GUARDS (Updated Logic)
    const tier = currentTier;
    const activeBookings = bookings.filter(b => ['confirmed', 'pending', 'live', 'rescheduled'].includes(b.status));
    const activeSubjects = new Set(activeBookings.map(b => b.subject.toLowerCase()));
    const activeTutors = new Set(activeBookings.map(b => b.tutorId));

    const isNewSubject = !activeSubjects.has(subject.toLowerCase());
    const isNewTutor = !activeTutors.has(selectedTutor.id);

    // Subject Limits based on Plan (User Request: Free:1, Standard:3, Premium:8)
    const subjectLimit = tier === 'free' ? 1 : tier === 'standard' ? 3 : 8;

    // Rule: Allow multiple tutors as long as within subject count. 
    // Example: 1 tutor 3 subjects OR 3 tutors 1 subject each.
    if (isNewSubject && activeSubjects.size >= subjectLimit) {
       alert(`🚀 Upgrade for More Subjects! 
       
You are currently on the ${(tier || 'free').charAt(0).toUpperCase() + (tier || 'free').slice(1)} Plan which allows up to ${subjectLimit} unique subject${subjectLimit > 1 ? 's' : ''}. 

To book "${subject}" or add more subjects, please upgrade your plan in Settings for a professional academic experience!`);
       return;
    }

    if (isNewTutor && activeTutors.size >= subjectLimit) {
       alert(`🚀 Unlock More Tutors!
       
On the ${(tier || 'free').charAt(0).toUpperCase() + (tier || 'free').slice(1)} Plan, you can book with up to ${subjectLimit} different tutor${subjectLimit > 1 ? 's' : ''}. 

To explore more expert tutors, kindly upgrade your plan in the Settings section.`);
       return;
    }

    const isGroup = (form.elements.namedItem('isGroup') as HTMLInputElement)?.value === 'true';

    // ⚡ CHECK FOR EXISTING GROUP SESSION ⚡
    const existingGroup = bookings.find(b => 
      b.tutorId === selectedTutor.id && 
      b.date === date && 
      b.time === time &&
      b.subject === subject &&
      b.isGroup === true &&
      b.status !== 'cancelled'
    );

    if (isGroup && existingGroup) {
      if (existingGroup.participants?.includes(currentUser.email)) {
        alert("🚨 You are already enrolled in this group session.");
        setIsBookingModalOpen(false);
        return;
      }
      if (existingGroup.participantCount && existingGroup.participantCount >= 5) {
        alert("🚨 This group session is now full. Please choose another slot.");
        setIsBookingModalOpen(false);
        return;
      }
    }

    if (type === 'demo') {
      const hasExistingDemo = bookings.some(b => 
        b.tutorId === selectedTutor.id && 
        b.studentEmail === currentUser.email && 
        b.type === 'demo' &&
        b.status !== 'cancelled'
      );

      if (hasExistingDemo) {
        alert("🚨 You have already booked a demo with this tutor. Please proceed to book a full course or wait for your session.");
        setIsBookingModalOpen(false);
        return;
      }

      try {
        if (isGroup && existingGroup) {
          // Join existing group demo
          updateDoc(doc(db, 'bookings', existingGroup.id), {
            participants: arrayUnion(currentUser.email),
            participantCount: increment(1),
            [`participantData.${currentUser.email.replace(/\./g, '_')}`]: {
              name: currentUser.name,
              joinTime: null,
              leaveTime: null,
              status: 'pending'
            }
          });
        } else {
          // Create new demo (1-on-1 or new Group)
          const bookingData = {
            tutorId: selectedTutor.id,
            tutorName: selectedTutor.name,
            studentId: currentUser.email,
            studentName: currentUser.name,
            studentEmail: currentUser.email,
            studentType: currentUser.studentType || (currentUser.class === 'B.Tech' ? 'btech' : 'school'),
            subject,
            date,
            time,
            duration,
            status: 'pending',
            type: 'demo',
            amount: 0,
            createdAt: serverTimestamp(),
            isGroup,
            maxParticipants: isGroup ? 5 : 1,
            participantCount: 1,
            participants: [currentUser.email],
            participantData: {
              [currentUser.email.replace(/\./g, '_')]: {
                name: currentUser.name,
                joinTime: null,
                leaveTime: null,
                status: 'pending'
              }
            }
          };
          addDoc(collection(db, 'bookings'), bookingData);
        }
        
        // Immediate Feedback: Close modal and switch view before notification finishes
        setIsBookingModalOpen(false);
        setView('my-bookings');

        // Background: Notify Tutor
        addDoc(collection(db, 'tutor_notifications'), {
          tutorId: selectedTutor.id,
          type: 'booking',
          title: isGroup ? 'New Group Participant' : 'New Demo Requested',
          description: `${currentUser.name} joined ${isGroup ? 'the group' : 'a demo'} session for ${subject} on ${date} at ${time}.`,
          time: 'Just now',
          read: false,
          createdAt: serverTimestamp()
        });

        // Background: Notify Admin about demo booking
        addDoc(collection(db, 'admin_notifications'), {
          type: 'Demo Booking',
          title: 'New Demo Session',
          message: `${currentUser.name} booked a demo with ${selectedTutor.name} for ${subject} on ${date} at ${time}.`,
          time: serverTimestamp(),
          read: false
        });
      } catch (e) {
        console.error("Booking error:", e);
      }
    } else {
      // Paid sessions
      try {
        if (isGroup && existingGroup) {
        // For now, even if joining a group, we create a reference for payment
        // But the shared document is what matters for the live class.
        // We'll update the shared document after payment success.
        const paymentRefData = {
          isJoiningGroup: true,
          groupId: existingGroup.id,
          tutorId: selectedTutor.id,
          tutorName: selectedTutor.name,
          studentId: currentUser.email,
          studentName: currentUser.name,
          studentEmail: currentUser.email,
          subject,
          date,
          time,
          duration,
          plan,
          amount,
          createdAt: serverTimestamp(),
          isGroup: true
        };
        const docRef = await addDoc(collection(db, 'bookings'), paymentRefData);
        setBookingFormData({ ...paymentRefData, id: docRef.id });
      } else {
        const bookingData = {
          tutorId: selectedTutor.id,
          tutorName: selectedTutor.name,
          studentId: currentUser.email,
          studentName: currentUser.name,
          studentEmail: currentUser.email,
          studentType: currentUser.studentType || (currentUser.class === 'B.Tech' ? 'btech' : 'school'),
          subject,
          date,
          time,
          duration,
          plan,
          status: 'unpaid',
          type: 'paid',
          amount,
          createdAt: serverTimestamp(),
          isGroup,
          maxParticipants: isGroup ? 5 : 1,
          participantCount: 1,
          participants: [currentUser.email]
        };
        const docRef = await addDoc(collection(db, 'bookings'), bookingData);
        setBookingFormData({ ...bookingData, id: docRef.id });
      }
      
        setIsBookingModalOpen(false);
        setIsPaymentModalOpen(true);
        setPaymentStatus('idle');
      } catch (e) {
        console.error("Payment setup error:", e);
      }
    }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    localStorage.removeItem('student_logged_in');
    localStorage.removeItem('student_view');
    localStorage.removeItem('student_user');
    await signOut(auth);
    setView('login');
    setCurrentUser(null);
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };









  // --- View Components ---






















  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [wantsNewTutor, setWantsNewTutor] = useState(false);

  const calculateRefund = (booking: Booking) => {
    if (!booking.amount) return { eligible: false, refundAmount: 0, reason: "No payment found" };

    const platformFeeRate = 0.17;
    const totalAmount = booking.amount;
    const platformFee = totalAmount * platformFeeRate;
    const originalAmount = totalAmount - platformFee;
    
    // Calculate days since payment
    const paidAt = (booking as any).paidAt?.toDate ? (booking as any).paidAt.toDate() : (booking.paidAt ? new Date(booking.paidAt) : null);
    if (!paidAt) return { eligible: false, refundAmount: 0, reason: "Payment date unknown" };

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - paidAt.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Get Tier - prioritize tierAtBooking if saved, else fallback to current user's tier
    const tier = (booking as any).tierAtBooking || currentUser?.subscription?.tier || 'free';
    const attendedClasses = (booking as any).attendedCount || 0;

    let eligible = false;
    let refundAmount = 0;
    let reason = "";
    let deductionType = "";

    if (tier === 'free') {
      if (diffDays <= 3) {
        eligible = true;
        refundAmount = originalAmount; // Refund base amount if within 3 days
        reason = "Within 3-day window (Free Tier)";
      } else {
        eligible = false;
        refundAmount = 0;
        reason = "Refund window (3 days) expired for Free Tier.";
      }
    } else if (tier === 'standard' || tier === 'premium') {
      if (diffDays <= 3 && attendedClasses <= 3) {
        // First 3 days (after attending ≤3 classes)
        // Rule: total paid amount minus (completed days cost + 3% deduction)
        // completed days cost = originalAmount * (attended / totalDays) - assuming duration is total days
        const totalDays = parseFloat(booking.duration || '1') * 30; // Assuming duration is months
        const completedDaysCost = originalAmount * (attendedClasses / totalDays);
        const deduction = totalAmount * 0.03;
        refundAmount = totalAmount - completedDaysCost - deduction;
        eligible = refundAmount > 0;
        reason = "Early Cancellation window (≤3 days/classes)";
        deductionType = "Pro-rated + 3% Fee";
      } else if (diffDays > 3) {
        // Last 10 days of the plan check
        const totalDurationDays = 90; // 3 month plan
        const daysLeft = totalDurationDays - diffDays;

        if (daysLeft > 10) {
          const refundPercent = tier === 'premium' ? 0.40 : 0.20;
          refundAmount = originalAmount * refundPercent;
          eligible = true;
          reason = `Flat ${refundPercent * 100}% Refund (${tier.toUpperCase()} Tier)`;
          deductionType = `Standard Tier Deduction`;
        } else {
          eligible = false;
          refundAmount = 0;
          reason = "No refund in the last 10 days of the plan.";
        }
      } else {
        // Case where diffDays <= 3 but attended > 3 classes
        const refundPercent = tier === 'premium' ? 0.40 : 0.20;
        refundAmount = originalAmount * refundPercent;
        eligible = true;
        reason = `Flat ${refundPercent * 100}% Refund (Classes > 3)`;
      }
    }

    return { 
      eligible: eligible && refundAmount > 0, 
      refundAmount: Math.max(0, Math.floor(refundAmount)),
      reason,
      breakdown: { 
        platformFee: Math.floor(platformFee), 
        originalAmount: Math.floor(originalAmount),
        tutorShare: Math.floor(originalAmount * 0.5), // Standard 50% split assumption for display
        diffDays, 
        attendedClasses,
        tier,
        deductionType
      }
    };
  };

  const handleRequestCancellation = async () => {
    if (!cancelBooking || !cancelReason) {
      alert("Please provide a reason for cancellation.");
      return;
    }
    setIsCancelling(true);
    try {
      await updateDoc(doc(db, 'bookings', cancelBooking.id), { 
        status: 'pending_cancellation',
        cancellationReason: cancelReason,
        wantsNewTutor: wantsNewTutor,
        cancellationRequestedAt: serverTimestamp()
      });
      // 1. Notify Admin
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'Cancellation Request',
        title: 'Booking Cancellation Requested',
        message: `${currentUser?.name} has requested to cancel their session for ${getSubjectName(cancelBooking.subject)} with ${cancelBooking.tutorName}.`,
        bookingId: cancelBooking.id,
        time: serverTimestamp(),
        read: false
      });

      // 2. Notify Tutor
      await addDoc(collection(db, 'tutor_notifications'), {
        tutorId: cancelBooking.tutorId,
        type: 'update',
        title: 'Cancellation Requested',
        description: `${currentUser?.name} requested to cancel the ${getSubjectName(cancelBooking.subject)} session on ${cancelBooking.date}.`,
        time: 'Just now',
        read: false,
        createdAt: serverTimestamp()
      });

      alert('Your booking cancellation request has been submitted. We will review it and notify you soon.');
      setIsCancelModalOpen(false);
      setCancelBooking(null);
    } catch (e) {
      console.error("Error submitting cancellation:", e);
      alert('Failed to submit cancellation request. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  // --- Core Lifecycle ---
  const renderView = () => {
    switch (view) {
      case 'blocked':
        return (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-6"
            >
              <AlertTriangle size={40} />
            </motion.div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-4">Account Suspended</h2>
            <p className="max-w-md text-slate-500 font-medium leading-relaxed mb-8">
              Your access to Eduqra Scholar has been temporarily suspended by the administrator. 
              This is typically due to policy violations, inactivity, or a manual review.
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Reference ID: {currentUser?.id || 'N/A'}
            </div>
            <div className="mt-8 space-y-4">
              <p className="text-sm font-bold text-rose-600 bg-rose-50 py-3 px-6 rounded-xl border border-rose-100 italic">
                "We're sorry, but you are currently unable to access this site."
              </p>
              <button 
                onClick={confirmLogout}
                className="w-full px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3"
              >
                Sign Out & Support
              </button>
            </div>
          </div>
        );
      case 'verify-email':
        return (
          <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-12">
              <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center">
                <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center relative">
                  <div className="absolute inset-[-8px] border-[3px] border-primary/20 border-t-primary rounded-full animate-spin-slow"></div>
                  <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center">
                    <ShieldCheck size={32} className="text-primary" />
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-4xl md:text-5xl font-serif font-black italic mb-6 tracking-tighter text-slate-900">Verify Your Email</h2>
            
            <p className="text-slate-500 font-bold max-w-md mb-12 text-lg leading-relaxed">
              We sent email verification to your <span className="text-slate-900 underline decoration-primary/30">{currentUser?.email}</span>. <br/>
              Please check your inbox and click the link to login and enter your dashboard.
            </p>

            <div className="flex flex-col gap-4 w-full max-w-xs">
              <button 
                onClick={handleResendVerification}
                className="w-full bg-primary text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                Resend Magic Link
              </button>
              <button 
                onClick={confirmLogout}
                className="w-full bg-slate-50 text-slate-400 font-black py-5 rounded-[2rem] hover:bg-slate-100 transition-all text-xs uppercase tracking-widest"
              >
                Sign Out
              </button>
            </div>

            <p className="mt-16 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
              Eduqra Scholar Security
            </p>
          </div>
        );
      case 'payments':
        return (
          <PaymentsView 
            bookings={bookings}
            currentUser={currentUser}
            onPay={(booking) => {
              const tutor = tutors.find(t => t.id === booking.tutorId) || MOCK_TUTORS.find(t => t.id === booking.tutorId);
              setSelectedTutor(tutor || null);
              setBookingFormData({ 
                subject: booking.subject, 
                date: booking.date, 
                time: booking.time, 
                duration: booking.duration.replace(/ Hours?/, ''),
                id: booking.id,
                plan: booking.plan
              });
              setIsPaymentModalOpen(true);
              setPaymentStatus('idle');
              setPaymentData({});
            }}
          />
        );
      case 'login':
        return <LoginView setView={setView} setCurrentUser={setCurrentUser} />;
      case 'register':
        return <RegisterView setView={setView} setCurrentUser={setCurrentUser} />;
      case 'forgot-password':
        return <ForgotPasswordView setView={setView} />;
      case 'dashboard':
        return (
          <DashboardView 
            setView={setView} 
            bookings={bookings} 
            setSelectedTutor={setSelectedTutor} 
            openChat={openChat} 
            onReschedule={(booking) => setReschedulingBooking(booking)} 
            tutors={tutors}
            currentUser={currentUser}
            parseTime={parseTime}
            currentTier={currentTier}
            openBookingModal={openBookingModal}
          />
        );
      case 'find-tutors':
        return (
          <FindTutorsView 
            setView={setView} 
            setSelectedTutor={setSelectedTutor} 
            tutors={tutors}
            currentUser={currentUser}
            bookings={bookings}
            openBookingModal={openBookingModal}
            openChat={openChat}
          />
        );
      case 'tutor-profile':
        return (
          <TutorProfileView 
            selectedTutor={selectedTutor} 
            setView={setView} 
            openBookingModal={openBookingModal}
            openChat={openChat}
            bookings={bookings}
          />
        );
      case 'my-bookings':
        return (
          <MyBookingsView 
            bookings={bookings} 
            setBookings={setBookings}
            openChat={openChat} 
            onReschedule={(booking) => setReschedulingBooking(booking)} 
            setView={setView}
            setSelectedTutor={setSelectedTutor}
            tutors={tutors}
            startSession={startSession}
            parseTime={parseTime}
            currentUser={currentUser}
            setCancelBooking={setCancelBooking}
            setIsCancelModalOpen={setIsCancelModalOpen}
            calculateRefund={calculateRefund}
          />
        );
      case 'chat':
        return (
          <ChatView 
            chats={chats}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            setChats={setChats}
            drafts={drafts}
            setDrafts={setDrafts}
            sendMessage={sendMessage}
            baseSendMessage={baseSendMessage}
            deleteMessage={deleteMessage}
            setView={setView}
            editingMessageId={editingMessageId}
            setEditingMessageId={setEditingMessageId}
            setIsMobileSidebarOpen={setIsMobileSidebarOpen}
            isChatMenuOpen={isChatMenuOpen}
            setIsChatMenuOpen={setIsChatMenuOpen}
            currentUser={currentUser}
            bookings={bookings}
            tutors={tutors}
            openChat={openChat}
            currentTier={currentTier}
          />
        );
      case 'reviews':
        return <ReviewsView bookings={bookings} tutors={tutors} currentUser={currentUser} setBookings={setBookings} getReputation={getReputation} />;
      case 'progress':
        return <ProgressTrackerView setView={setView} bookings={bookings} />;
      case 'notes':
        if (currentTier === 'free') {
          return (
            <div className="p-10 text-center flex flex-col items-center justify-center min-h-[60vh]">
              <Lock size={48} className="text-primary/20 mb-6" />
              <h2 className="text-3xl font-serif font-black italic text-slate-800">Tutor Notes Vault</h2>
              <p className="text-sm text-slate-500 mt-4 max-w-md mx-auto">
                Access comprehensive study materials and session notes shared by your tutors. 
                Upgrade to a **Standard** or **Premium** plan to unlock this vault.
              </p>
              <button 
                onClick={() => setView('settings')}
                className="mt-8 px-8 py-3.5 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20"
              >
                Upgrade Plan
              </button>
            </div>
          );
        }
        return <NotesView currentUser={currentUser} bookings={bookings} currentTier={currentTier} setView={setView} />;
      case 'assignments':
        if (currentTier !== 'premium') {
          return (
            <div className="p-10 text-center flex flex-col items-center justify-center min-h-[60vh]">
              <FileCheck size={48} className="text-primary/20 mb-6" />
              <h2 className="text-3xl font-serif font-black italic text-slate-800">Assessments & Mock Tests</h2>
              <p className="text-sm text-slate-500 mt-4 max-w-md mx-auto">
                Regular mock tests and assignments are exclusive to our **Elite Premium** scholars.
                Get real-time feedback and detailed performance analysis.
              </p>
              <button 
                onClick={() => setView('settings')}
                className="mt-8 px-8 py-3.5 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20"
              >
                Upgrade to Premium
              </button>
            </div>
          );
        }
        return (
          <div className="p-10 text-center">
            <FileCheck size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-serif font-bold">Assignments & Mock Tests</h2>
            <p className="text-sm text-primary/40 mt-2">Welcome to your assessment portal. New tests will appear here based on your curriculum.</p>
          </div>
        );
      case 'projects':
        if (currentTier !== 'premium') {
          return (
            <div className="p-10 text-center flex flex-col items-center justify-center min-h-[60vh]">
              <Briefcase size={48} className="text-primary/20 mb-6" />
              <h2 className="text-3xl font-serif font-black italic text-slate-800">Project Guidance</h2>
              <p className="text-sm text-slate-500 mt-4 max-w-md mx-auto">
                Get hands-on industry project guidance and academic project support. 
                This feature is reserved for our **Elite Premium** scholars.
              </p>
              <button 
                onClick={() => setView('settings')}
                className="mt-8 px-8 py-3.5 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary/20"
              >
                Upgrade to Premium
              </button>
            </div>
          );
        }
        return (
          <div className="p-10 text-center">
            <Briefcase size={48} className="mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-serif font-bold">Advanced Projects</h2>
            <p className="text-sm text-primary/40 mt-2">Academic & Industry project guidance portal is active.</p>
          </div>
        );
      case 'settings':
        return <SettingsView 
          setView={setView} 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          currentTier={currentTier} 
          bookings={bookings} 
          notifyTutorsOfPlanUpdate={notifyTutorsOfPlanUpdate} 
          effectiveSubscription={effectiveSubscription} 
          onUpgrade={processUpgradePayment}
        />;
      case 'live-class':
        return <div className="flex-1 bg-[#0A0A0B]" />;
      default:
        return (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-700 mb-4">Page Not Found</h2>
              <p className="text-gray-500 mb-6">The requested view could not be loaded.</p>
              <button 
                onClick={() => setView('dashboard')}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40 animate-pulse">Syncing Scholar Account...</p>
      </div>
    );
  }

  if (['login', 'register', 'forgot-password'].includes(view)) {
    return renderView();
  }


  if (currentUser && currentUser.email_verified === false) {
    return <VerificationPendingView user={currentUser} onLogout={confirmLogout} onResend={handleResendVerification} />;
  }

  return (
    <>
      <div className="flex flex-col md:flex-row min-h-screen selection:bg-primary/20 selection:text-primary">
        <Sidebar 
          view={view} 
          setView={setView} 
          setIsMobileSidebarOpen={setIsMobileSidebarOpen} 
          isMobileSidebarOpen={isMobileSidebarOpen} 
          handleLogout={handleLogout} 
          currentUser={currentUser} 
          chats={chats}
          currentTier={currentTier}
          effectiveSubscription={effectiveSubscription}
        />
        <div className="flex-1 h-screen overflow-hidden flex flex-col min-w-0 md:pl-64 lg:pl-72">
          <main className={`content-area ${view === 'chat' ? '' : 'content-area-padded'}`}>
            {view !== 'chat' && <div className="side-pattern" />}
            
            {view !== 'chat' && (
              <Topbar 
                view={view} 
                setIsMobileSidebarOpen={setIsMobileSidebarOpen} 
                isNotifOpen={isNotifOpen} 
                setIsNotifOpen={setIsNotifOpen} 
                notifications={notifications}
                markNotifRead={markNotifRead} 
                setView={setView} 
                currentUser={currentUser}
                handleLogout={handleLogout}
                notifBgMap={notifBgMap}
                notifIconMap={notifIconMap}
                formatTime={formatTime}
              />
            )}
            
            {renderView()}
          </main>
        </div>
      </div>
      
      <Modal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)}
        title={bookingType === 'demo' ? `Book Free Demo with ${selectedTutor?.name}` : `Book Session with ${selectedTutor?.name}`}
      >
        <form onSubmit={handleBooking} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Current Focus</label>
            <select 
              name="subject" 
              className="input-field" 
              required 
              value={bookingSelectedSubject}
              onChange={(e) => setBookingSelectedSubject(e.target.value)}
            >
              <option value="" disabled>Select Subject</option>
              {(() => {
                const subjects = (selectedTutor?.subjects && Array.isArray(selectedTutor.subjects)) ? selectedTutor.subjects : [];
                
                return subjects.map(s => {
                  const standardizedId = normalizeSubject(s);
                  const displayName = getSubjectName(standardizedId);
                  const sp = selectedTutor?.subjectsPricing?.find((p: any) => normalizeSubject(p.subject) === standardizedId);
                  const entry = (selectedTutor as any)?.pricingEntries?.find((e: any) => normalizeSubject(e.subject) === standardizedId);
                  
                  let displayPrice = 0;
                  let priceSuffix = '/hr';

                  if (entry && entry.hourlyRate) {
                    displayPrice = Math.ceil(entry.hourlyRate * 1.17);
                  } else if (sp) {
                    if (sp.type === 'course') {
                      displayPrice = Math.ceil(sp.price * 1.17);
                      priceSuffix = ' Full Course';
                    } else {
                      // If it's a monthly total, divide by 30 to get hourly
                      displayPrice = Math.ceil((sp.price / 30) * 1.17);
                    }
                  } else {
                    displayPrice = Math.ceil(parseFloat(String(selectedTutor?.price || '0')) * 1.17);
                  }

                  return <option key={s} value={standardizedId}>{displayName} (₹{displayPrice}{priceSuffix})</option>;
                });
              })()}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Enrollment Type</label>
            <select 
              name="plan" 
              className="input-field" 
              required 
              value={bookingPlan}
              onChange={(e: any) => setBookingPlan(e.target.value)}
            >
              {(() => {
                const targetClasses = (selectedTutor?.targetClasses || '').toLowerCase();
                const isHigherEd = targetClasses.includes('graduate') || 
                                   targetClasses.includes('intermediate') || 
                                   targetClasses.includes('b.tech') || 
                                   targetClasses.includes('degree') ||
                                   targetClasses.includes('btech') ||
                                   targetClasses.includes('college');

                const cls = currentUser?.class || '';
                const gradeNum = parseInt(cls.replace(/\D/g, ''));
                const isSchoolUnder10 = !isNaN(gradeNum) && gradeNum <= 10;

                if (isHigherEd) {
                  return (
                    <>
                      <option value="" disabled>Choose Plan Type</option>
                      <option value="1month">One Month Plan</option>
                      <option value="3months">Three Months Plan</option>
                      <option value="6months">Six Months Plan</option>
                      <option value="course">Full Course Enrollment</option>
                    </>
                  );
                }

                if (isSchoolUnder10) {
                  return (
                    <>
                      <option value="" disabled>Choose Plan Type</option>
                      <option value="1month">One Month Plan</option>
                      <option value="3months">Three Months Plan</option>
                      <option value="6months">Six Months Plan</option>
                    </>
                  );
                }

                return (
                  <>
                    <option value="" disabled>Choose Plan Type</option>
                    <option value="1month">1-Month Plan</option>
                    <option value="3months">3-Months Plan</option>
                    <option value="6months">6-Months Plan</option>
                  </>
                );
              })()}
            </select>
          </div>

          



          {/* Group Session Selection - GRADUATES ONLY */}
          {(currentUser?.studentType === 'btech' || currentUser?.studentType === 'degree' || currentUser?.class === 'B.Tech') ? (
            <div className="space-y-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Session Format</label>
              <div className="flex gap-4">
                <label className="flex-1 flex items-center justify-between p-3 rounded-xl border bg-white cursor-pointer hover:border-primary transition-all">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-primary" />
                    <span className="text-sm font-bold">1-on-1</span>
                  </div>
                  <input type="radio" name="isGroup" value="false" defaultChecked className="accent-primary" />
                </label>
                
                {(() => {
                  if (!bookingSelectedSubject) {
                    return (
                      <div className="flex-1 p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                        <p className="text-[10px] font-black text-gray-300 uppercase">Select Subject First</p>
                      </div>
                    );
                  }

                  const existingGroup = bookings.find(b => 
                    b.tutorId === selectedTutor?.id && 
                    b.date === bookingSelectedDate && 
                    b.subject === bookingSelectedSubject &&
                    b.isGroup === true &&
                    b.status !== 'cancelled'
                  );
                  const count = existingGroup?.participantCount || 0;
                  const isFull = count >= 5;
                  
                  return (
                    <label className={cn(
                      "flex-1 flex items-center justify-between p-3 rounded-xl border bg-white transition-all",
                      isFull ? "opacity-60 cursor-not-allowed border-rose-100 bg-rose-50/30" : "cursor-pointer hover:border-primary"
                    )}>
                      <div className="flex items-center gap-2">
                        <Users size={16} className={cn(isFull ? "text-rose-400" : "text-primary")} />
                        <div>
                          <span className="text-sm font-bold">Group</span>
                          <p className={cn(
                            "text-[9px] font-black uppercase",
                            isFull ? "text-rose-500" : count > 0 ? "text-emerald-500" : "text-primary/20"
                          )}>
                            {isFull ? 'Booking Full' : count > 0 ? `${5 - count} Slots Left` : 'New Group'}
                          </p>
                        </div>
                      </div>
                      <input 
                        type="radio" 
                        name="isGroup" 
                        value="true" 
                        disabled={isFull}
                        className="accent-primary"
                      />
                    </label>
                  );
                })()}
              </div>
              
              {(() => {
                if (!bookingSelectedSubject) return null;

                const existingGroup = bookings.find(b => 
                  b.tutorId === selectedTutor?.id && 
                  b.date === bookingSelectedDate && 
                  b.subject === bookingSelectedSubject &&
                  b.isGroup === true &&
                  b.status !== 'cancelled'
                );
                if (existingGroup && existingGroup.participantCount && existingGroup.participantCount >= 5) {
                  return (
                    <div className="flex items-center gap-2 text-rose-500 p-2 bg-rose-50 rounded-lg">
                      <XCircle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Subject Group is Full</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            /* School/Inter Students - Lock to 1-on-1 */
            <div className="hidden">
              <input type="radio" name="isGroup" value="false" checked readOnly />
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Select Date</label>
              <input 
                name="date" 
                type="date" 
                className="input-field" 
                required 
                min={formatDateLocal(new Date())} 
                max="2099-12-31"
                value={bookingSelectedDate}
                onInput={(e) => {
                  const val = e.currentTarget.value;
                  if (val) {
                    const parts = val.split('-');
                    if (parts[0] && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      e.currentTarget.value = parts.join('-');
                      setBookingSelectedDate(e.currentTarget.value);
                    }
                  }
                }}
                onChange={(e) => {
                  const dateVal = e.target.value;
                  setBookingSelectedDate(dateVal);
                  // Always clear previous time when date changes
                  setBookingSelectedTime('');
                }}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Daily Duration</label>
              <select 
                name="duration" 
                className="input-field" 
                required 
                value={bookingDuration}
                onChange={(e) => setBookingDuration(e.target.value)}
              >
                <option value="" disabled>Choose Hours</option>
                <option value="1">1 Hour</option>
                <option value="1.5">1.5 Hours</option>
                <option value="2">2 Hours</option>
                <option value="3">3 Hours</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Select Time</label>
              <select 
                name="time" 
                className="input-field" 
                required 
                value={bookingSelectedTime}
                onChange={(e) => setBookingSelectedTime(e.target.value)}
                disabled={!bookingSelectedDate || !bookingDuration}
              >
                {(() => {
                  // INTERLINK: Use activeTutorDoc for real-time availability updates from tutor side
                  const latestTutor = activeTutorDoc || tutors.find(t => t.id === selectedTutor?.id) || selectedTutor;
                  
                  if (!bookingSelectedDate || !bookingDuration) {
                    return <option value="" disabled>{!bookingSelectedDate ? 'Select Date First' : 'Choose Hours First'}</option>;
                  }

                  const [y, m, d_val] = bookingSelectedDate.split('-').map(Number);
                  const dateObj = new Date(y, m - 1, d_val);

                  if (isNaN(dateObj.getTime())) {
                    return <option value="" disabled>Invalid Date</option>;
                  }
                  
                  const selectedDay = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                  const now = currentSystemTime;
                  const isoToday = now.toLocaleDateString('en-CA');
                  const isToday = bookingSelectedDate === isoToday;
                  const nowMins = now.getHours() * 60 + now.getMinutes();

                  // Helper to apply real-time and booking filters
                  const getFinalSlots = (sourceSlots: string[]) => {
                    const uniqueSorted = Array.from(new Set(sourceSlots)).sort((a, b) => parseTime(a) - parseTime(b));
                    let filtered = isToday ? uniqueSorted.filter(s => parseTime(s) >= nowMins) : uniqueSorted;
                    return filtered.filter(slotTime => {
                      const slotStart = parseTime(slotTime);
                      const durationVal = parseFloat(bookingDuration || '1');
                      const slotEnd = slotStart + (durationVal * 60);
                      return !tutorBookings.some(b => {
                        if (b.status === 'cancelled' || b.date !== bookingSelectedDate) return false;
                        const bStart = parseTime(b.time);
                        const bDurStr = b.duration?.toString().replace(/ Hours?/, '') || '1';
                        const bEnd = bStart + (parseFloat(bDurStr) * 60);
                        return slotStart < bEnd && slotEnd > bStart;
                      });
                    });
                  };

                  // 1. SLOT SOURCE (RULE 1)
                  const availability = latestTutor?.availability || [];
                  const daySlotsRaw = availability.filter((s: any) => {
                    const dayMatch = s.day && s.day.toLowerCase() === selectedDay.toLowerCase();
                    const dateMatch = s.date && s.date === bookingSelectedDate;
                    return dateMatch || dayMatch;
                  });

                  let baseSlots: string[] = [];
                  if (daySlotsRaw.length > 0) {
                    daySlotsRaw.forEach((s: any) => {
                      const startTime = typeof s === 'string' ? s : (s.start || '');
                      const endTime = typeof s === 'string' ? '' : (s.end || '');
                      if (!startTime) return;
                      const startMins = parseTime(startTime);
                      const endMins = endTime ? parseTime(endTime) : startMins + 60;
                      for (let m = startMins; m < endMins; m += 60) {
                        baseSlots.push(formatMins(m));
                      }
                    });
                  } else {
                    baseSlots = [];
                  }

                  const slotsToShow = getFinalSlots(baseSlots);

                  if (slotsToShow.length === 0) {
                    return <option value="" disabled>No slots available for this duration</option>;
                  }

                  return (
                    <>
                      <option value="" disabled>Select Time</option>
                      {slotsToShow.map((t, idx) => (
                        <option key={idx} value={t}>{t}</option>
                      ))}
                    </>
                  );
                })()}
              </select>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-between border-t border-primary/5">
            <div>
              <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Enrollment Total</p>
              <p className="text-xl md:text-2xl font-serif font-bold italic">
                {calculateTotal()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {currentUser?.class === 'B.Tech' && (
                <span className="text-[9px] font-black text-accent bg-accent/5 px-2 py-1 rounded-full uppercase tracking-tighter">
                  Batch: 1-5 Members
                </span>
              )}
              <button 
                type="submit" 
                className="bg-primary text-background px-10 py-5 rounded-2xl font-bold transition-all shadow-xl hover:scale-105"
              >
                {bookingType === 'demo' ? 'Confirm Demo Session' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={() => paymentStatus !== 'processing' ? setIsPaymentModalOpen(false) : null}
        title="Razorpay Secure Checkout"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 py-6 bg-slate-50 rounded-2xl border border-primary/5">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
              <GraduationCap className="text-primary" size={24} />
            </div>
            <h3 className="text-xl font-bold font-serif italic text-on-surface">Scholar</h3>
            <div className="text-center">
              <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest mt-2">{getSubjectName(bookingFormData?.subject)} with {selectedTutor?.name}</p>
              <div className="text-3xl font-black text-primary mt-2 flex items-center justify-center gap-1">
                <span>₹</span>
                {(() => {
                  const amt = getBookingAmount();
                  const walletFunds = currentUser?.walletBalance || 0;
                  return Math.max(0, amt - walletFunds).toFixed(2);
                })()}
              </div>
              <p className="text-[10px] font-bold text-primary/40 mt-1">{currentUser?.email || 'student@scholar.com'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Pay Using UPI</p>
            
            <div className="grid grid-cols-1 gap-3">
              {['PhonePe', 'Google Pay', 'Paytm'].map((upi) => (
                <button 
                  type="button"
                  key={upi}
                  disabled={paymentStatus === 'processing' || paymentStatus === 'success'}
                  onClick={() => processPayment(upi)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    paymentStatus === 'processing' ? 'opacity-50 cursor-not-allowed bg-slate-50 border-primary/5' : 
                    paymentStatus === 'success' ? 'opacity-40 cursor-not-allowed bg-slate-50 border-primary/5' : 
                    paymentStatus === 'cancelled' ? 'opacity-50 cursor-not-allowed bg-slate-50 border-primary/5' :
                    'bg-white border-primary/10 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center">
                      <DollarSign className="text-primary" size={16} />
                    </div>
                    <span className="font-bold text-sm text-on-surface">{upi}</span>
                  </div>
                  <MousePointer2 size={16} className="text-primary/30" />
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {paymentStatus !== 'idle' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-xl flex items-center gap-3 justify-center ${
                  paymentStatus === 'processing' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  paymentStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                  paymentStatus === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' : ''
                }`}
              >
                {paymentStatus === 'processing' && (
                  <>
                    <RefreshCw className="animate-spin w-5 h-5" />
                    <span className="text-sm font-bold">Processing payment... Please wait.</span>
                  </>
                )}
                {paymentStatus === 'success' && (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-bold">Payment Successful! Order ID: {paymentData.orderId}</span>
                  </>
                )}
                {paymentStatus === 'cancelled' && (
                  <>
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm font-bold">Payment Cancelled. Redirecting...</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-2">
            <button 
              type="button"
              disabled={paymentStatus === 'processing' || paymentStatus === 'success'}
              onClick={cancelPayment}
              className={`w-full py-4 text-xs font-bold uppercase tracking-widest transition-all ${
                paymentStatus === 'processing' || paymentStatus === 'success' ? 'text-primary/20 cursor-not-allowed' : 'text-primary/40 hover:text-rose-500'
              }`}
            >
              Cancel Payment
            </button>
          </div>
          
          <div className="pt-4 border-t border-primary/5 flex items-center justify-center gap-2">
            <Lock className="w-3 h-3 text-primary/30" />
            <p className="text-[9px] font-bold text-primary/30 uppercase tracking-widest">Secured by Razorpay</p>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!reschedulingBooking} 
        onClose={() => {
          setReschedulingBooking(null);
          setRescheduleDate('');
        }}
        title={`Reschedule Session with ${reschedulingBooking?.tutorName}`}
      >
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const date = (form.elements.namedItem('date') as HTMLInputElement).value;
            const time = (form.elements.namedItem('time') as HTMLSelectElement).value;
            const reason = rescheduleReason || 'No reason provided';
            
            if (reschedulingBooking?.id) {
              try {
                // 1. Update existing booking IN-PLACE with new time and status
                const bookingRef = doc(db, 'bookings', reschedulingBooking.id);
                await updateDoc(bookingRef, { 
                  date,
                  time,
                  status: 'confirmed', 
                  isRescheduled: true,
                  rescheduleReason: reason,
                  updatedAt: serverTimestamp()
                });

                // 2. Notify the Tutor automatically (FIXED: match Tutor Dashboard listener)
                await addDoc(collection(db, 'tutor_notifications'), {
                  tutorId: reschedulingBooking.tutorId,
                  userId: currentUser.id || currentUser.email, // Standardize on userId
                  studentId: currentUser.email, 
                  studentName: currentUser.displayName || currentUser.name || 'Student',
                  studentAvatar: currentUser.photoURL || '',
                  type: 'booking',
                  title: 'Session Rescheduled',
                  description: `${currentUser.displayName || currentUser.name || 'Student'} has rescheduled their ${getSubjectName(reschedulingBooking.subject)} session to ${date} at ${time}. Reason: ${reason}`,
                  bookingId: reschedulingBooking.id,
                  time: 'Just now',
                  read: false,
                  createdAt: serverTimestamp() // Required for Tutor Dashboard sorting
                });

                setRescheduleSuccess(true);
                setTimeout(() => {
                  setReschedulingBooking(null);
                  setRescheduleDate('');
                  setRescheduleReason('');
                  setRescheduleSuccess(false);
                }, 3000);
              } catch (err) {
                console.error("Error in rescheduling process:", err);
              }
            }
          }} 
          className="space-y-8"
        >
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">New Date</label>
              <input 
                name="date" 
                type="date" 
                className="input-field" 
                required 
                min={formatDateLocal(new Date())} 
                max="2099-12-31"
                value={rescheduleDate} 
                onInput={(e) => {
                  const val = e.currentTarget.value;
                  if (val) {
                    const parts = val.split('-');
                    if (parts[0] && parts[0].length > 4) {
                      parts[0] = parts[0].slice(0, 4);
                      e.currentTarget.value = parts.join('-');
                      setRescheduleDate(e.currentTarget.value);
                    }
                  }
                }}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">New Time</label>
              <select name="time" className="input-field" required defaultValue={reschedulingBooking?.time}>
                {rescheduleSlots.length > 0 ? (
                  rescheduleSlots.map(t => <option key={t} value={t}>{t}</option>)
                ) : (
                  <option value="" disabled selected>⚠️ No Slots Available for this Date</option>
                )}
              </select>
              <p className="text-[8px] font-bold text-primary/30 uppercase tracking-tight ml-4">
                * Slots are based on tutor's free time
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Reason for Rescheduling</label>
            <textarea 
              className="input-field min-h-[100px] py-4"
              placeholder="Please provide a valid reason for rescheduling this session..."
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              required
            />
          </div>
          <div className="pt-8 flex justify-end">
            <button 
              type="submit" 
              disabled={rescheduleSlots.length === 0 || rescheduleSuccess}
              className={`bg-primary text-background px-10 py-4 rounded-2xl font-bold transition-all shadow-xl ${rescheduleSuccess ? 'bg-emerald-500 scale-95' : 'hover:scale-105'}`}
            >
              {rescheduleSuccess ? '✓ Rescheduled Successfully' : 'Confirm Reschedule'}
            </button>
          </div>
          {rescheduleSuccess && (
            <p className="text-center text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-4">
              The tutor has been notified automatically.
            </p>
          )}
        </form>
      </Modal>

      {/* Live Class Overlay */}
      <AnimatePresence>
        {view === 'live-class' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#0A0A0B] text-white flex flex-col font-sans overflow-hidden"
          >
            {/* Header Bar */}
            <div className="h-20 px-6 flex items-center justify-between border-b border-white/5 bg-[#121214]/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                  <GraduationCap className="text-primary" size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">Advanced Calculus - Session #42</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${sessionStatus === 'live' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : sessionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-white/20'}`}></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      {sessionStatus === 'live' ? 'Live Session' : sessionStatus === 'connecting' ? 'Connecting...' : 'Waiting'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Elapsed</span>
                  <span className="text-xl font-mono font-bold tracking-wider text-primary">{sessionTimer}</span>
                </div>
                <button onClick={() => setView('dashboard')} className="p-3 hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} className="text-white/40" />
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex relative overflow-hidden">
              {currentUser?.class === 'B.Tech' && (
                <div className="absolute left-6 top-6 bottom-6 w-20 flex flex-col gap-4 z-20">
                  <div className="p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col items-center gap-4">
                    <span className="text-[8px] font-black text-white/30 uppercase writing-mode-vertical">Batch</span>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="relative">
                        <div className={`w-10 h-10 rounded-xl bg-[#1A1A1E] border-2 ${i === 1 ? 'border-primary' : 'border-white/5'} overflow-hidden`}>
                          <img src={`https://i.pravatar.cc/100?u=batch_${i}`} alt="batch mate" className={i > 3 ? 'grayscale' : ''} />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#121214] ${i <= 3 ? 'bg-emerald-500' : 'bg-white/20'}`}></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`flex-1 p-6 flex flex-col items-center justify-center gap-6 transition-all duration-500 ${(isLiveChatOpen || currentUser?.class === 'B.Tech') ? 'md:pr-[400px]' : ''} ${currentUser?.class === 'B.Tech' ? 'md:pl-[120px]' : ''}`}>
                
                {/* Video Grid */}
                <div className={cn(
                  "w-full h-full max-w-6xl grid gap-4 md:gap-6 items-stretch",
                  remoteStreams.length <= 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2 md:grid-cols-3"
                )}>
                  {/* Remote Participants */}
                  {remoteStreams.map((rs, idx) => (
                    <div key={rs.socketId} className="relative bg-[#1A1A1E] rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center group">
                       <video 
                          ref={(el) => { if (el) el.srcObject = rs.stream; }}
                          autoPlay 
                          playsInline 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                          <div className="flex items-center gap-3">
                            <div className="p-1 px-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg backdrop-blur-md">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Participant</span>
                              </div>
                            </div>
                            <p className="text-xs md:text-sm font-bold text-white/90">{rs.userName || 'Tutor'}</p>
                          </div>
                        </div>
                    </div>
                  ))}

                  {/* Fallback if waiting */}
                  {remoteStreams.length === 0 && (
                    <div className="relative bg-[#1A1A1E] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center group">
                      {sessionStatus === 'live' ? (
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-white/5 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Establishing video connection...</p>
                        </div>
                      ) : sessionStatus === 'waiting' ? (
                        <div className="text-center p-8 bg-primary/5 rounded-[3rem] border border-primary/20">
                          <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping"></div>
                            <Avatar src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop" size="xl" className="relative z-10 border-0" />
                          </div>
                          <p className="text-lg font-serif italic text-white/80">Dr. Sarah Jenkins</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse mb-6">Waiting for participant...</p>
                          <button 
                            onClick={() => activeMeetingId && startSession(activeMeetingId)} 
                            className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            Start Session
                          </button>
                        </div>
                      ) : sessionStatus === 'connecting' ? (
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Securing Connection...</p>
                        </div>
                      ) : (
                        <div className="text-center p-8 bg-rose-500/5 rounded-[3rem] border border-rose-500/20">
                          <XCircle size={40} className="text-rose-500 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-rose-500 mb-2">Session Ended</h3>
                          <p className="text-sm text-white/40 max-w-xs">The tutor has disconnected from the session.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Local Participant (Self) */}
                  {/* Local Participant (Self) */}
                  <div className={`relative bg-[#1A1A1E] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center transition-opacity duration-700 ${sessionStatus === 'live' ? 'opacity-100' : 'opacity-40'}`}>
                    {isCamOn ? (
                      <div className="w-full h-full relative group">
                        <video 
                          ref={localVideoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover grayscale-[0.2]"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                          <p className="text-sm font-bold text-white/90">Alex (You)</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                          <User size={32} className="text-white/20" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Local Camera Off</p>
                      </div>
                    )}
                    
                    {!isMicOn && (
                      <div className="absolute top-6 right-6 p-2 bg-rose-500 text-white rounded-xl shadow-lg ring-4 ring-rose-500/20">
                        <Mic size={16} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Centered Controls Overlay */}
                <div id="class-controls" className="flex items-center gap-2 md:gap-4 bg-[#121214]/60 backdrop-blur-2xl p-2.5 px-4 md:px-6 rounded-[2.5rem] border border-white/10 shadow-2xl z-20">
                  <button 
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}
                  >
                    {isMicOn ? <Mic size={20} /> : <XCircle size={20} />}
                  </button>
                  
                  <button 
                    onClick={() => setIsCamOn(!isCamOn)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-black'}`}
                  >
                    {isCamOn ? <Camera size={20} /> : <X size={20} />}
                  </button>

                  <button 
                    onClick={handleScreenShare}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-white hover:bg-white/10'}`}
                  >
                    <Monitor size={20} />
                  </button>

                  <button 
                    onClick={endSession}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-rose-500/40"
                  >
                    <LogOut size={20} />
                  </button>

                  <div className="w-px h-8 bg-white/10 mx-1 md:mx-2"></div>

                  <div className="relative group">
                    <button 
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 text-white hover:bg-white/10 flex items-center justify-center transition-all"
                      onClick={() => {
                        const reactions = ['👍', '❤️', '👏', '💡', '🔥', '🎉'];
                        const randomEmoji = reactions[Math.floor(Math.random() * reactions.length)];
                        handleSendLiveMessage(`[REACTION]: ${randomEmoji}`);
                      }}
                    >
                      <Smile size={20} />
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-white/10 backdrop-blur-xl border border-white/10 p-2 rounded-2xl hidden group-hover:flex gap-2">
                       {['👍', '❤️', '👏', '💡', '🔥', '🎉'].map(emoji => (
                         <button 
                           key={emoji}
                           onClick={() => handleSendLiveMessage(`[REACTION]: ${emoji}`)}
                           className="hover:scale-125 transition-transform p-1"
                         >
                           {emoji}
                         </button>
                       ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsLiveChatOpen(!isLiveChatOpen)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isLiveChatOpen ? 'bg-primary text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
                  >
                    <MessageSquare size={20} />
                  </button>
                </div>
              </div>

              {/* Sliding Chat Panel */}
              <AnimatePresence>
                {isLiveChatOpen && (
                  <motion.div 
                    initial={{ x: 400 }}
                    animate={{ x: 0 }}
                    exit={{ x: 400 }}
                    className="absolute right-0 top-0 bottom-0 w-full md:w-[400px] bg-[#121214] border-l border-white/5 flex flex-col shadow-2xl z-30"
                  >
                    <div className="flex h-16 items-center px-6 border-b border-white/5 justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <MessageSquare className="text-primary" size={16} />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-widest">{currentUser?.class === 'B.Tech' ? 'Batch Chat' : 'Live Chat'}</h3>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="space-y-4">
                        {liveMessages.length === 0 && (
                          <div className="text-center py-20">
                            <Smile size={32} className="text-white/5 mx-auto mb-4" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">No messages yet</p>
                          </div>
                        )}
                        {liveMessages.map(msg => (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            key={msg.id} 
                            className={cn(
                              "flex flex-col gap-1",
                              msg.text.startsWith('[REACTION]') ? "items-center" : "items-end"
                            )}
                          >
                            <div className={cn(
                              "px-4 py-2.5 rounded-2xl text-sm font-semibold max-w-[85%]",
                              msg.text.startsWith('[REACTION]') 
                                ? "bg-white/5 border border-white/10 text-3xl animate-bounce" 
                                : "bg-primary rounded-tr-none text-white shadow-lg shadow-primary/10"
                            )}>
                              {msg.text.startsWith('[REACTION]') ? msg.text.replace('[REACTION]: ', '') : msg.text}
                            </div>
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter pr-1">{msg.time}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 md:p-6 bg-[#0A0A0B] border-t border-white/5">
                      <div className="relative flex items-center">
                        <input 
                          placeholder="Type a message..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSendLiveMessage(e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                          className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-6 pr-14 outline-none focus:bg-white/10 focus:border-primary/40 transition-all font-semibold text-sm placeholder:text-white/20 text-white"
                        />
                        <button className="absolute right-3 p-2 bg-primary rounded-xl text-white shadow-lg shadow-primary/20">
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Modal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Logout"
      >
        <div className="p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
            <LogOut size={32} className="text-rose-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-on-surface">Sign Out?</h3>
            <p className="text-sm font-bold text-on-surface/40">Are you sure you want to end your session?</p>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-on-surface/40 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
            >
              Cancel
            </button>
            <button 
              onClick={confirmLogout}
              className="flex-1 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-rose-500 text-white shadow-xl shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>
      {/* Cancellation Modal */}
      <AnimatePresence>
        {isCancelModalOpen && cancelBooking && (
          <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[3rem] w-full max-w-lg p-8 md:p-12 shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-50" />
              
              <div className="text-center relative z-10">
                <div className="w-20 h-20 bg-rose-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                  <AlertTriangle size={36} className="text-rose-600" />
                </div>
                <h3 className="text-3xl font-serif font-black italic text-slate-900 mb-4 tracking-tight">Cancel This Booking?</h3>
                
                <div className="space-y-6 mb-8 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Cancellation</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    >
                      <option value="">Select a reason...</option>
                      <option value="Schedule Conflict">Schedule Conflict</option>
                      <option value="Tutor Not Suitable">Tutor Not Suitable</option>
                      <option value="Subject Changed">Subject Changed</option>
                      <option value="Personal Reasons">Personal Reasons</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-primary/5 rounded-2xl border border-primary/10">
                    <div>
                      <h4 className="text-sm font-black text-primary tracking-tight">Book a different tutor?</h4>
                      <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest mt-1">We'll add refund to your wallet</p>
                    </div>
                    <button 
                      onClick={() => setWantsNewTutor(!wantsNewTutor)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        wantsNewTutor ? "bg-primary" : "bg-slate-200"
                      )}
                    >
                      <motion.div 
                        animate={{ x: wantsNewTutor ? 24 : 4 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                </div>

                {/* Refund Information */}
                <div className="bg-slate-50 rounded-[2rem] p-8 mb-10 border border-slate-100 text-left">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                    <DollarSign size={14} className="text-primary" /> Refund Eligibility Preview
                  </h4>
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-4 italic opacity-60">
                    * Cancellation requests are subject to admin approval
                  </p>
                  
                  {(() => {
                    const { eligible, refundAmount, reason, breakdown } = calculateRefund(cancelBooking);
                    if (!eligible) return (
                      <div className="space-y-3">
                        <p className="text-rose-600 font-bold text-sm bg-rose-50 p-4 rounded-xl border border-rose-100 italic">
                        {reason}
                        </p>
                        <p className="text-[9px] font-medium text-slate-400 leading-relaxed italic">
                          * As per our policy, cancellations after 15 days or usage of more than 50% of the course duration are not eligible for a refund.
                        </p>
                      </div>
                    );

                    return (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Course Amount</span>
                          <span className="font-extrabold">₹{cancelBooking.amount}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Platform Fee (17%)</span>
                          <span className="font-extrabold text-rose-500">- ₹{breakdown?.platformFee}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Tutor Share (50%)</span>
                          <span className="font-extrabold text-rose-500">- ₹{breakdown?.tutorShare}</span>
                        </div>
                        <div className="h-px bg-slate-200 border-dashed border-t" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-slate-900">Estimated Refund</span>
                          <span className="text-2xl font-serif font-black italic text-emerald-600">₹{refundAmount}</span>
                        </div>
                        <p className="text-[9px] font-medium text-slate-400 leading-relaxed flex items-start gap-2 pt-2 border-t border-slate-100 mt-4">
                           <Check size={12} className="text-emerald-500 shrink-0" />
                           Refunds are subject to final admin verification and approval.
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-4">
                  <button 
                    disabled={isCancelling}
                    onClick={handleRequestCancellation}
                    className="w-full bg-rose-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-rose-600/20 hover:scale-[1.02] active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isCancelling ? 'Submitting Request...' : 'Yes, Request Cancellation'}
                  </button>
                  <button 
                    onClick={() => { setIsCancelModalOpen(false); setCancelBooking(null); }}
                    className="w-full bg-slate-100 text-slate-600 font-black py-5 rounded-[1.5rem] hover:bg-slate-200 transition-all uppercase text-xs tracking-widest"
                  >
                    No, Keep Booking
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔐 MANDATORY UPI ID GATE MODAL */}
      <AnimatePresence>
        {showUpiGate && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-primary"></div>
              
              <div className="p-8 md:p-12">
                <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-8 mx-auto">
                   <Wallet size={40} className="text-primary animate-pulse" />
                </div>
                
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-serif font-black italic text-slate-800 mb-4">Add Your UPI ID</h2>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    To access your dashboard and schedule classes, please provide your primary UPI ID. This is required for secure academic transaction verifications.
                  </p>
                </div>

                <form onSubmit={handleGateUpiSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30 ml-1">Your UPI ID (e.g. name@bank)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={20} />
                      <input 
                        type="text" 
                        required
                        placeholder="username@okaxis"
                        value={gateUpiInput}
                        onChange={(e) => setGateUpiInput(e.target.value)}
                        className="w-full h-16 pl-12 pr-6 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-lg focus:border-primary focus:bg-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isUpdatingGateUpi || !gateUpiInput.trim()}
                    className="w-full h-16 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                  >
                    {isUpdatingGateUpi ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue to Dashboard
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Eduqra Scholar • Secure Verification</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn(
              "fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 border transition-all",
              toast.type === 'error' ? "bg-rose-500 text-white border-rose-400" : "bg-primary text-white border-primary/20"
            )}
          >
            {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


interface ChatViewProps {
  chats: Chat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  drafts: { [key: string]: string };
  setDrafts: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  sendMessage: () => Promise<void>;
  baseSendMessage: (payload: any) => Promise<void>;
  deleteMessage: (msgId: string, everyone: boolean) => Promise<void>;
  setView: (view: View) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  setIsMobileSidebarOpen: (open: boolean) => void;
  isChatMenuOpen: boolean;
  setIsChatMenuOpen: (open: boolean) => void;
  currentUser: StudentProfile | null;
  bookings: Booking[];
  tutors: Tutor[];
  openChat: (tutorId: string) => Promise<void>;
  currentTier: string;
}
function ChatView({
  chats,
  activeChatId,
  setActiveChatId,
  setChats,
  drafts,
  setDrafts, 
  sendMessage, 
  deleteMessage,
  setView, 
  editingMessageId, 
  setEditingMessageId,
  setIsMobileSidebarOpen,
  isChatMenuOpen,
  setIsChatMenuOpen,
  currentUser,
  bookings,
  tutors,
  openChat,
  baseSendMessage,
  currentTier
}: ChatViewProps) {
  const [chatSearch, setChatSearch] = useState('');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollDraft, setPollDraft] = useState({ question: '', options: ['', ''], allowMultiple: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSendPoll = async () => {
    if (!pollDraft.question.trim() || pollDraft.options.filter(o => o.trim()).length < 2) return;
    await baseSendMessage({
      type: 'poll',
      pollData: {
        question: pollDraft.question.trim(),
        options: pollDraft.options.filter(o => o.trim()),
        allowMultiple: pollDraft.allowMultiple,
        votes: {}
      }
    });
    setIsPollModalOpen(false);
    setPollDraft({ question: '', options: ['', ''], allowMultiple: true });
  };

  const handleVote = async (messageId: string, optionIndex: number) => {
    if (!currentUser?.email || !activeChatId) return;
    const msgRef = doc(db, `whatsapp/${activeChatId}/messages`, messageId);
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    const votes = { ...(data.pollData?.votes || {}) };
    const emailKey = currentUser.email.replace(/\./g, '_');
    let userVotes = votes[emailKey] || [];
    
    if (data.pollData.allowMultiple) {
      if (userVotes.includes(optionIndex)) {
        userVotes = userVotes.filter((v: number) => v !== optionIndex);
      } else {
        userVotes.push(optionIndex);
      }
    } else {
      userVotes = [optionIndex];
    }
    
    votes[emailKey] = userVotes;
    await updateDoc(msgRef, { 'pollData.votes': votes });
  };
  const studentEmailKey = currentUser?.email?.replace(/\./g, '_') || '';
  
  // Merge real chats with tutors from bookings who haven't started a chat yet
  const bookedTutors = Array.from(new Set(bookings.map(b => b.tutorId)))
    .map(tid => tutors.find(t => t.id === tid) || MOCK_TUTORS.find(t => t.id === tid))
    .filter(Boolean) as Tutor[];

  const rawChatList = [
    ...chats.map(c => ({
      ...c,
      id: c.id || `${c.tutorId}_${studentEmailKey}`,
      isTutor: true
    })),
    ...bookedTutors.filter(t => !chats.some(c => c.tutorId === t.id)).map(t => ({
      id: `${t.id}_${studentEmailKey}`,
      tutorId: t.id,
      tutorName: t.name,
      tutorAvatar: t.avatar,
      messages: [],
      lastMessage: 'Start a conversation...',
      lastMessageTime: 'Now',
      time: 'Now',
      unreadCount: 0,
      isTutor: true
    }))
  ];

  // Strictly enforce unique Tutors to prevent duplicate chat items from ever displaying, and filter out ghost chats created by the bug
  const fullChatList = Array.from(new Map(rawChatList.filter(c => c.tutorId && c.tutorId !== 'mock').map(c => [c.tutorId, c])).values());

  const filteredChats = fullChatList.filter(c => {
    const searchLower = chatSearch.toLowerCase();
    return c.tutorName?.toLowerCase().includes(searchLower);
  });
  
  const activeChat = fullChatList.find(c => c.id === activeChatId) || fullChatList.find(c => c.tutorId === (activeChatId || '').split('_')[0]);
  const currentDraft = activeChatId ? (drafts[activeChatId] || '') : '';

  const attachmentOptions = [
    { icon: FileText, label: 'Document', color: 'bg-indigo-500 text-white' },
    { icon: ImageIcon, label: 'Gallery', color: 'bg-emerald-500 text-white' },
    { icon: Camera, label: 'Camera', color: 'bg-rose-500 text-white' },
    { icon: Mic, label: 'Voice Note', color: 'bg-blue-500 text-white' },
    { icon: BarChart2, label: 'Poll', color: 'bg-amber-500 text-white' },
  ];

  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatId, chats]);

  return (
    <div className="h-[calc(100vh)] flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h1 className="page-title">Messages</h1>
        <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
          <span className="status-label text-primary">Live Support</span>
        </div>
      </div>

      <div className="flex bg-white rounded-none md:rounded-none atelier-card-shadow overflow-hidden flex-1 border border-surface-variant relative">
        {/* Left Panel: Contacts List */}
        <div className={cn(
          "w-full md:w-[320px] lg:w-[400px] border-r border-surface-variant flex flex-col bg-slate-50/30 transition-all duration-300 shrink-0",
          activeChatId ? "hidden md:flex" : "flex"
        )}>
          <div className="p-3 md:p-4 border-b border-surface-variant flex items-center justify-between bg-white">
            <h4 className="label-caps !text-[11px] text-on-surface">Tutors</h4>
            <span className="bg-slate-100 text-slate-500 secondary-text font-black px-1.5 py-0.5 rounded-md !text-[11px]">{filteredChats.length}</span>
          </div>
          <div className="p-3 border-b border-surface-variant bg-white/30 backdrop-blur-sm">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search chats..." 
                className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary/50 transition-all text-sm outline-none font-bold" 
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30" size={16} />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 md:p-3 space-y-1 md:space-y-2 custom-scrollbar">
            {filteredChats.map((chat) => {
              const liveTutor = tutors.find(t => t.id === chat.tutorId);
              const displayTutorName = liveTutor?.name || chat.tutorName || 'Tutor';
              const displayAvatar = liveTutor?.avatar || (chat as any).avatar || (chat as any).tutorAvatar || '';
              
              return (
              <button 
                key={chat.id}
                onClick={() => {
                  // If chat already has a Firestore ID (real chat not mock), open directly; otherwise run openChat to initialise
                  if (chat.id && chat.id.includes('_') && !chat.id.startsWith('mock_')) {
                    setActiveChatId(chat.id);
                    setIsMobileSidebarOpen(false);
                  } else {
                    openChat(chat.tutorId);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl transition-all text-left relative group",
                  activeChatId === chat.id ? "bg-primary/10 shadow-sm" : "hover:bg-slate-100/80"
                )}
              >
                {activeChatId === chat.id && (
                  <motion.div layoutId="active-chat-pill" className="absolute left-0 top-3 bottom-3 md:top-4 md:bottom-4 w-1 bg-primary rounded-r-full" />
                )}
                <div className="relative shrink-0">
                  <Avatar src={displayAvatar} initials={displayTutorName[0]} size="md" className={cn("transition-transform group-hover:scale-105", activeChatId === chat.id ? "ring-2 ring-primary/20" : "")} />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-0.5 md:mb-1">
                    <h5 className={cn(
                      "text-xs md:text-sm truncate transition-colors",
                      activeChatId === chat.id ? "font-black text-on-surface" : "font-bold text-on-surface/80"
                    )}>
                      {displayTutorName}
                    </h5>
                    <span className="status-label opacity-60 shrink-0 ml-2">{chat.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-[10px] md:text-xs truncate",
                      chat.unreadCount > 0 ? "font-bold text-on-surface" : "font-medium text-on-surface-variant opacity-70"
                    )}>
                      {chat.lastMessage}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="bg-primary text-white text-[8px] md:text-[9px] font-black min-w-[16px] md:min-w-[18px] h-[16px] md:h-[18px] flex items-center justify-center rounded-full shrink-0 ml-2 shadow-sm">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
             </button>
            );
            })}
          </div>
        </div>

        {/* Right Panel: Active Chat */}
        <div className={cn(
          "flex-1 flex flex-col bg-gradient-to-b from-slate-50/50 to-slate-100/80 relative transition-all duration-300 h-full",
          !activeChatId ? "hidden md:flex" : "flex"
        )}>
          {activeChat ? (
            (() => {
              const liveTutor = tutors.find(t => t.id === activeChat.tutorId);
              const activeTutorName = liveTutor?.name || activeChat.tutorName || 'Tutor';
              const activeAvatar = liveTutor?.avatar || (activeChat as any).avatar || (activeChat as any).tutorAvatar || '';
              
              return (
            <>
              {/* Subtle pattern */}
              <div className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]"></div>
              
              {/* Chat Header */}
              <div className="p-2 md:p-3 border-b border-surface-variant bg-white flex items-center justify-between shadow-sm relative z-10">
                <div className="flex items-center gap-2 md:gap-3">
                  <button 
                    onClick={() => { setActiveChatId(null); setIsMobileSidebarOpen(false); }}
                    className="md:hidden p-1 hover:bg-slate-100 rounded-full"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="relative">
                    <Avatar src={activeAvatar} initials={activeTutorName[0]} size="md" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm md:text-lg leading-tight text-on-surface">{activeTutorName}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full" />
                      <span className="status-label opacity-60">Online Now</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Join Now shortcut in Chat Header */}
                  {(() => {
                    const tutorBooking = bookings.find(b => b.tutorId === activeChat.tutorId && ['confirmed', 'live'].includes(b.status));
                    if (tutorBooking) {
                      const now = new Date();
                      const nowMins = now.getHours() * 60 + now.getMinutes();
                      const sessionMins = parseTime(tutorBooking.time);
                      const diffMins = sessionMins - nowMins;
                      const durationMins = parseFloat(tutorBooking.duration || '1') * 60;
                      const isToday = tutorBooking.date === now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || tutorBooking.date === (now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'));
                      
                      if ((isToday && diffMins <= 10 && nowMins <= (sessionMins + durationMins)) || tutorBooking.status === 'live') {
                        return (
                          <button 
                            onClick={() => setView('my-bookings')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform animate-pulse shadow-lg shadow-blue-500/20"
                          >
                            <Video size={14} /> Join Now
                          </button>
                        );
                      }
                    }
                    return null;
                  })()}
                  <button className="p-2 hover:bg-primary/5 rounded-xl transition-all text-primary/60 hover:text-primary">
                    <Search size={20} />
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
                      className="p-2 hover:bg-primary/5 rounded-xl transition-all text-primary/60 hover:text-primary"
                    >
                      <MoreVertical size={20} />
                    </button>
                    <AnimatePresence>
                      {isChatMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-surface-variant overflow-hidden z-50"
                        >
                          <button className="w-full px-5 py-3 text-left text-sm font-bold hover:bg-primary/5 flex items-center gap-3">
                            <UserCircle size={16} /> View Profile
                          </button>
                          <button className="w-full px-5 py-3 text-left text-sm font-bold hover:bg-primary/5 flex items-center gap-3">
                            <FileText size={16} /> Shared Files
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm('Are you sure you want to clear this chat for yourself?')) {
                                try {
                                  const msgs = await getDocs(collection(db, `whatsapp/${activeChatId}/messages`));
                                  for (const m of msgs.docs) {
                                    await updateDoc(doc(db, `whatsapp/${activeChatId}/messages`, m.id), {
                                      deletedBy: arrayUnion(currentUser?.email)
                                    });
                                  }
                                  setIsChatMenuOpen(false);
                                  alert('Chat cleared.');
                                } catch (e) { console.error(e); }
                              }
                            }}
                            className="w-full px-5 py-3 text-left text-sm font-bold hover:bg-primary/5 flex items-center gap-3 text-rose-500 border-t border-surface-variant"
                          >
                            <LogOut size={16} /> Clear Chat
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              {activeChat ? (
                <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3 md:space-y-4 relative z-10 scroll-smooth custom-scrollbar">
                  {(activeChat.messages || []).map((msg, i) => {
                    // Check by senderId (Firestore) or sender field ('me' for mock messages)
                    const isUser = msg.senderId === currentUser?.email || (msg as any).sender === 'me';
                    const dateVal = formatDateLabel((msg as any).date);
                    const prevDateVal = i > 0 ? formatDateLabel(((activeChat.messages[i-1] as any).date)) : null;
                    const showDate = i === 0 || dateVal !== prevDateVal;

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-4 md:my-6 relative z-10 w-full">
                          <span className="bg-slate-200/60 text-slate-600 text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-widest backdrop-blur-sm shadow-sm">
                            {dateVal}
                          </span>
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className={cn(
                          "flex w-full group relative",
                          isUser ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isUser && !msg.deletedForEveryone && (
                              <button
                                onClick={() => {
                                  setEditingMessageId(msg.id);
                                  setDrafts(prev => ({ ...prev, [activeChatId!]: msg.text }));
                                }}
                                className="bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-primary hover:text-white border border-primary/10 transition-colors"
                              >
                                <Edit2 size={10} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteMessage(msg.id, false)}
                              className="bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-rose-500 hover:text-white border border-rose-500/10 transition-colors"
                              title="Delete for me"
                            >
                              <X size={10} />
                            </button>
                            {isUser && !msg.deletedForEveryone && (
                              <button
                                onClick={() => deleteMessage(msg.id, true)}
                                className="bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-rose-600 hover:text-white border border-rose-600/10 transition-colors text-rose-600"
                                title="Delete for everyone"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                          <div className={cn(
                            "max-w-full px-3 py-2 rounded-2xl shadow-sm relative transition-all w-fit",
                            isUser ? "bg-primary text-white rounded-tr-md shadow-primary/20" : "bg-white text-on-surface rounded-tl-md border border-slate-100",
                            msg.deletedForEveryone && "bg-slate-100 text-slate-400 border-none shadow-none"
                          )}>
                            {msg.type === 'poll' ? (
                              <div className={cn("p-1 md:p-2 min-w-[200px] md:min-w-[250px]", isUser ? "text-white" : "text-on-surface")}>
                                <div className="flex items-start justify-between mb-3 md:mb-4">
                                  <h4 className="font-black text-sm md:text-base flex items-center gap-2 pr-2">
                                    <BarChart2 size={16} /> {msg.pollData.question}
                                  </h4>
                                  <button 
                                    onClick={() => deleteMessage(msg.id, isUser)}
                                    className={cn(
                                      "shrink-0 p-1.5 rounded-lg transition-all",
                                      isUser ? "hover:bg-white/20 text-white" : "hover:bg-rose-50 text-rose-500"
                                    )}
                                    title="Delete Poll"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                <div className="space-y-1.5 md:space-y-2">
                                  {msg.pollData.options.map((opt: string, idx: number) => {
                                    const votes = msg.pollData.votes || {};
                                    const totalVotes = Object.values(votes).reduce((acc: number, v: any) => acc + (v.includes(idx) ? 1 : 0), 0) as number;
                                    const emailKey = currentUser?.email?.replace(/\./g, '_') || '';
                                    const hasVoted = votes[emailKey]?.includes(idx);
                                    
                                    return (
                                      <button 
                                        key={idx}
                                        onClick={() => handleVote(msg.id, idx)}
                                        className={cn(
                                          "w-full text-left p-2 md:p-3 rounded-xl border-2 transition-all relative overflow-hidden group",
                                          hasVoted 
                                            ? (isUser ? "bg-white/20 border-white" : "bg-primary/10 border-primary") 
                                            : (isUser ? "bg-white/10 border-white/20" : "bg-slate-50 border-slate-100")
                                        )}
                                      >
                                        <div className="flex justify-between items-center relative z-10">
                                          <span className="text-xs md:text-sm font-bold truncate pr-8">{opt}</span>
                                          <span className="text-[10px] font-black opacity-60 shrink-0">{totalVotes}</span>
                                        </div>
                                        {totalVotes > 0 && (
                                          <div 
                                            className={cn("absolute inset-0 opacity-10 transition-all duration-500", isUser ? "bg-white" : "bg-primary")} 
                                            style={{ width: `${(totalVotes / Math.max(1, Object.keys(votes).length)) * 100}%` }}
                                          />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="mt-3 flex items-center justify-between opacity-60">
                                  <span className="text-[9px] font-black uppercase tracking-widest">
                                    {msg.pollData.allowMultiple ? "Multiple Choice" : "Single Choice"}
                                  </span>
                                  <span className="text-[9px] font-black">{Object.keys(msg.pollData.votes || {}).length} participants</span>
                                </div>
                              </div>
                            ) : (msg.type === 'image' || (msg.type === 'file' && (msg.fileName?.toLowerCase().includes('.jpg') || msg.fileName?.toLowerCase().includes('.png') || msg.fileName?.toLowerCase().includes('.jpeg') || msg.fileName?.toLowerCase().includes('.webp') || msg.fileUrl?.startsWith('data:image')))) ? (
                              <div className="relative group max-w-[220px] md:max-w-[280px]">
                                <img 
                                  src={msg.fileUrl || msg.url} 
                                  alt={msg.fileName}
                                  className="w-full h-auto rounded-xl object-cover shadow-sm bg-white/50"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=Image+Load+Error';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-[2px]">
                                  <a href={msg.fileUrl || msg.url} target="_blank" download={msg.fileName || 'image.jpg'} className="bg-white text-black text-xs font-black px-4 py-2 rounded-full cursor-pointer hover:scale-105 transition-transform flex items-center gap-2">
                                    <Download size={14} /> Download
                                  </a>
                                </div>
                              </div>
                            ) : msg.type === 'file' ? (
                              <a 
                                href={msg.fileUrl || msg.url} 
                                target="_blank" 
                                download={msg.fileName}
                                className={cn(
                                  "flex items-center gap-3 p-2 md:p-3 rounded-xl border transition-all",
                                  isUser ? "bg-white/10 border-white/20" : "bg-slate-50 border-slate-100"
                                )}
                              >
                                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0 pr-4">
                                  <p className="text-xs md:text-sm font-bold truncate max-w-[150px]">{msg.fileName || 'Document'}</p>
                                  <p className="text-[9px] font-black opacity-40 uppercase tracking-tighter">Document • {msg.fileSize || 'N/A'}</p>
                                </div>
                              </a>
                            ) : (
                              <p className={cn(
                                "text-sm md:text-sm font-bold leading-snug",
                                msg.deletedForEveryone && "italic font-normal"
                              )}>
                                {msg.text}
                              </p>
                            )}
                            <div className={cn(
                              "flex items-center gap-1.5 mt-1 justify-end",
                              isUser && !msg.deletedForEveryone ? "text-white/80" : "text-on-surface-variant/90"
                            )}>
                              {msg.edited && <span className="mr-1 text-[9px] font-medium opacity-60">(edited)</span>}
                              <span className="status-label !text-[9px] opacity-60 font-medium">{formatTime(msg.timestamp)}</span>
                              {isUser && !msg.deletedForEveryone && (
                                (activeChat as any)?.tutorUnreadCount === 0 ? (
                                  <CheckCheck size={12} className="text-[#53bdeb]" />
                                ) : (
                                  <CheckCheck size={12} className="text-white/90" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-slate-50/50 relative z-10">
                  <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                    <MessageSquare size={32} className="text-primary/20" />
                  </div>
                  <h3 className="text-xl font-serif font-bold italic text-on-surface mb-2">Select a Conversation</h3>
                  <p className="text-sm text-primary/40 font-bold max-w-xs">Pick a tutor from the list to start chatting or view shared progress.</p>
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 md:p-5 bg-white border-t border-surface-variant flex flex-col gap-2 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                {editingMessageId && (
                  <div className="flex items-center justify-between bg-primary/5 px-4 py-2 rounded-xl mb-1 border-l-4 border-primary">
                    <p className="status-label text-primary">Editing Message</p>
                    <button onClick={() => { setEditingMessageId(null); setDrafts(prev => ({ ...prev, [activeChatId!]: '' })); }} className="p-1 hover:bg-primary/10 rounded-full">
                      <X className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2 md:gap-4 w-full">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                      className="p-3 transition-all rounded-xl text-primary/40 hover:text-primary hover:bg-primary/5"
                    >
                      <Paperclip size={20} />
                    </button>
                    <AnimatePresence>
                      {isAttachmentMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.9 }}
                          className="absolute bottom-full left-4 mb-4 w-64 bg-white rounded-2xl shadow-xl border border-surface-variant p-3 z-50 overflow-hidden"
                        >
                          <div className="grid grid-cols-1 gap-1">
                            {attachmentOptions.map((opt) => {
                              // LOCK POLLS FOR NON-PREMIUM
                              const isLocked = opt.label === 'Poll' && currentTier !== 'premium';
                              
                              return (
                              <button 
                                key={opt.label}
                                onClick={() => {
                                  if (isLocked) {
                                    alert("🌟 Premium Feature: Polls are exclusive to our Elite Premium scholars. Upgrade now to interact with polls!");
                                    return;
                                  }
                                  setIsAttachmentMenuOpen(false);
                                  if (opt.label === 'Document') {
                                    fileInputRef.current?.click();
                                  } else if (opt.label === 'Gallery') {
                                    galleryInputRef.current?.click();
                                  } else if (opt.label === 'Camera') {
                                    cameraInputRef.current?.click();
                                  } else if (opt.label === 'Voice Note') {
                                    alert('Voice Recording starting... (Simulated)');
                                  } else if (opt.label === 'Poll') {
                                    setIsPollModalOpen(true);
                                  }
                                }}
                                className={cn(
                                  "flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-all group relative",
                                  isLocked && "opacity-50 grayscale-[0.5]"
                                )}
                              >
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110", opt.color)}>
                                  <opt.icon size={14} />
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="text-sm font-bold text-on-surface/70 group-hover:text-primary">{opt.label}</span>
                                  {isLocked && <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Premium Only</span>}
                                </div>
                                {isLocked && <Lock className="absolute right-4 text-slate-300" size={14} />}
                              </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex-1 relative">
                    <input 
                      type="file" 
                      ref={galleryInputRef} 
                      className="hidden" 
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        for (let i = 0; i < files.length; i++) {
                          const file = files[i];
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            await baseSendMessage({
                              type: 'file', // Can use type image but logic handles file-images too
                              fileName: file.name,
                              fileSize: (file.size / 1024).toFixed(1) + ' KB',
                              fileUrl: reader.result as string
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                        if (galleryInputRef.current) galleryInputRef.current.value = '';
                      }}
                    />
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        
                        try {
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            // Using Base64 conversion so the file actually persists and opens for the tutor
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              try {
                                await baseSendMessage({
                                  type: 'file',
                                  fileName: file.name,
                                  fileSize: (file.size / 1024).toFixed(1) + ' KB',
                                  fileUrl: reader.result as string
                                });
                              } catch (err) {
                                console.error("Error sending file:", err);
                                alert("Error sending file. Please check your connection.");
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        } catch (error) {
                          console.error('File read error:', error);
                        } finally {
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }
                      }}
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      ref={cameraInputRef} 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              try {
                                await baseSendMessage({
                                  type: 'file',
                                  fileName: 'photo_' + new Date().getTime() + '.jpg',
                                  fileSize: (file.size / 1024).toFixed(1) + ' KB',
                                  fileUrl: reader.result as string
                                });
                              } catch (err) {
                                console.error("Error sending photo:", err);
                                alert("Error sending photo. Please check your connection.");
                              }
                            };
                            reader.readAsDataURL(file);
                          } catch (error) {
                            console.error('Photo read error:', error);
                          } finally {
                            if (cameraInputRef.current) cameraInputRef.current.value = '';
                          }
                        }
                      }}
                    />
                    <input 
                      type="text" 
                      value={drafts[activeChatId || ''] || ''}
                      onChange={(e) => setDrafts(prev => ({ ...prev, [activeChatId!]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={editingMessageId ? 'Edit your message...' : 'Type a message...'}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 shadow-inner focus:ring-2 ring-primary outline-none text-sm md:text-base font-medium pr-12 text-black"
                    />
                    <button 
                      onClick={sendMessage}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg md:rounded-xl transition-all",
                        (drafts[activeChatId || ''] || '').trim() ? 'text-primary hover:bg-primary/10' : 'text-primary/30'
                      )}
                    >
                      {(drafts[activeChatId || ''] || '').trim() ? <Send size={22} /> : <Mic size={22} />}
                    </button>
                  </div>
                </div>
              </div>
            </>
            );
            })()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
              <div className="w-20 h-20 md:w-32 md:h-32 bg-primary/5 rounded-full flex items-center justify-center text-primary/20">
                <User size={64} className="opacity-20" />
              </div>
              <div>
                <h3 className="font-black text-xl md:text-2xl text-on-surface tracking-tight">Your Inbox</h3>
                <p className="text-on-surface-variant font-medium text-sm md:text-base max-w-xs mx-auto">Select a tutor from the list to start a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isPollModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0A0A0B]/90 backdrop-blur-md z-[500] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20"
            >
              <div className="p-6 md:p-8 border-b border-light flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                    <BarChart2 size={20} />
                  </div>
                  <h3 className="text-xl font-serif font-bold italic tracking-tight">Create Poll</h3>
                </div>
                <button 
                  onClick={() => setIsPollModalOpen(false)}
                  className="p-3 hover:bg-slate-200/50 rounded-2xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Question</label>
                  <input 
                    type="text" 
                    placeholder="Ask a question..."
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 shadow-inner focus:ring-2 ring-primary outline-none text-base font-bold"
                    value={pollDraft.question}
                    onChange={(e) => setPollDraft(prev => ({ ...prev, question: e.target.value }))}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Options</label>
                  {pollDraft.options.map((option, idx) => (
                    <div key={idx} className="flex gap-3 items-center group">
                      <input 
                        type="text" 
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 shadow-inner focus:ring-2 ring-primary outline-none text-sm font-semibold"
                        value={option}
                        onChange={(e) => {
                          const newOpts = [...pollDraft.options];
                          newOpts[idx] = e.target.value;
                          setPollDraft(prev => ({ ...prev, options: newOpts }));
                        }}
                      />
                      {pollDraft.options.length > 2 && (
                        <button 
                          onClick={() => setPollDraft(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }))}
                          className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollDraft.options.length < 5 && (
                    <button 
                      onClick={() => setPollDraft(prev => ({ ...prev, options: [...prev.options, ''] }))}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Add Text Option
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Allow multiple answers</p>
                    <p className="text-[10px] text-slate-400 font-medium">Participants can select more than one option</p>
                  </div>
                  <button 
                    onClick={() => setPollDraft(prev => ({ ...prev, allowMultiple: !prev.allowMultiple }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all duration-300 relative overflow-hidden",
                      pollDraft.allowMultiple ? "bg-primary" : "bg-[#D1D5DB]"
                    )}
                  >
                    <motion.div 
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      animate={{ x: pollDraft.allowMultiple ? '1.5rem' : '0.25rem' }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </div>

              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-light flex justify-end gap-3">
                <button 
                  onClick={() => setIsPollModalOpen(false)}
                  className="px-6 py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSendPoll}
                  disabled={!pollDraft.question.trim() || pollDraft.options.filter(o => o.trim()).length < 2}
                  className="bg-primary text-white font-black px-10 py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                >
                  Create & Send Poll
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
const PaymentsView = ({ bookings, onPay, currentUser }: { 
  bookings: Booking[], 
  onPay: (booking: Booking) => void,
  currentUser: StudentProfile | null
}) => {
  const unpaidBookings = bookings.filter(b => b.status === 'unpaid');
  
  const paymentHistory = [...bookings].sort((a, b) => {
    const dateA = a.paidAt?.seconds ? a.paidAt.seconds * 1000 : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.date).getTime());
    const dateB = b.paidAt?.seconds ? b.paidAt.seconds * 1000 : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.date).getTime());
    return dateB - dateA;
  });

  const totalInvested = bookings
    .filter(b => b.paymentId || ['confirmed', 'completed', 'live', 'rescheduled'].includes(b.status))
    .reduce((acc, b) => acc + (b.amount || 0), 0);
    
  const pendingDues = unpaidBookings.reduce((acc, b) => acc + (b.amount || 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-20"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-4 mt-2">
        <div>
          <h2 className="text-xl md:text-3xl font-black tracking-tighter">Payments & Billing</h2>
          <p className="text-xs font-bold text-primary/40 mt-0.5">Real-time financial overview of your academic journey.</p>
        </div>
        <div className="bg-primary/5 px-5 py-3 rounded-xl flex items-center gap-3 border border-primary/10 shadow-sm">
          <Lock className="text-primary w-4 h-4" />
          <div>
            <p className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">Gateway</p>
            <p className="font-bold text-xs tracking-tight text-primary">Razorpay Secure</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-primary text-white p-4 rounded-2xl border border-primary/20 shadow-xl shadow-primary/20 relative group overflow-hidden"
        >
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 shadow-inner">
               <Wallet size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/60">Wallet Balance</p>
              <h3 className="text-xl font-black text-white tracking-tight">₹{(currentUser?.walletBalance || 0).toLocaleString('en-IN')}</h3>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-3xl rounded-full -mr-12 -mt-12"></div>
        </motion.div>

        {/* Total Invested */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm relative group overflow-hidden"
        >
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-inner">
               <DollarSign size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Total Invested</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">₹{totalInvested.toLocaleString('en-IN')}</h3>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-2xl rounded-full"></div>
        </motion.div>

        {/* Pending Dues */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm relative group overflow-hidden"
        >
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 border border-rose-100 shadow-inner">
               <RefreshCw size={18} className={pendingDues > 0 ? "animate-spin-slow" : ""} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Pending Dues</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">₹{pendingDues.toLocaleString('en-IN')}</h3>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 blur-2xl rounded-full"></div>
        </motion.div>

        {/* Current Plan */}
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm relative group overflow-hidden"
        >
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary border border-primary/10 shadow-inner">
               <Award size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Active Tier</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight capitalize">{currentUser?.subscription?.tier || 'Free'}</h3>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-2xl rounded-full"></div>
        </motion.div>
      </div>

      {/* Unpaid Sessions Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">Pending Actions</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Unpaid Course Sessions</p>
            </div>
          </div>
          {unpaidBookings.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-rose-500/20 animate-pulse">
              {unpaidBookings.length} ACTION REQUIRED
            </span>
          )}
        </div>
        
        {unpaidBookings.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {unpaidBookings.map((booking, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={booking.id}
                className="bg-white rounded-2xl p-4 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 group hover:border-primary/20 transition-all shadow-sm hover:shadow-md overflow-hidden relative"
              >
                {/* Horizontal Accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 opacity-20 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex items-center gap-4 w-full md:w-auto pl-2">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100 group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                    <BookOpen size={24} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-slate-900 truncate tracking-tight">{getSubjectName(booking.subject)}</h4>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tutor: {booking.tutorName}</span>
                       <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                       <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Awaiting Payment</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-50 pl-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Session Date</span>
                    <div className="flex items-center gap-2">
                       <Calendar size={12} className="text-primary/40" />
                       <span className="text-xs font-bold text-slate-600 tracking-tight">{booking.date}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Payable</span>
                    <span className="text-lg font-black text-slate-900 tracking-tighter">₹{(booking.amount || 0).toLocaleString('en-IN')}</span>
                  </div>

                  <button 
                    onClick={() => onPay(booking)}
                    className="bg-primary text-white h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                  >
                    <MousePointer2 size={14} /> Checkout
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-20" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Your account is fully settled</p>
          </div>
        )}
      </section>

      {/* Comprehensive History Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-primary/5 pb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="text-primary" size={20} />
          </div>
          <h3 className="text-xl md:text-2xl font-serif font-bold italic">Transaction Passbook</h3>
        </div>

        <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-primary/5 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary/[0.02]">
                  <th className="text-left px-8 py-5 text-[9px] font-black text-primary/40 uppercase tracking-widest">Transaction ID</th>
                  <th className="text-left px-8 py-5 text-[9px] font-black text-primary/40 uppercase tracking-widest">Date</th>
                  <th className="text-left px-8 py-5 text-[9px] font-black text-primary/40 uppercase tracking-widest">Tutor / Type</th>
                  <th className="text-left px-8 py-5 text-[9px] font-black text-primary/40 uppercase tracking-widest">Amount</th>
                  <th className="text-right px-8 py-5 text-[9px] font-black text-primary/40 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {paymentHistory.length > 0 ? (
                  paymentHistory.map((txn) => (
                    <tr key={txn.id} className="hover:bg-primary/[0.01] transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-primary truncate max-w-[120px]">{txn.paymentId || '---'}</p>
                        <p className="text-[8px] font-bold text-primary/30 uppercase tracking-tighter">Ref: {txn.orderId || txn.id}</p>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-primary/60">
                        {txn.paidAt ? (
                          txn.paidAt.seconds 
                            ? new Date(txn.paidAt.seconds * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : new Date(txn.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        ) : txn.date}
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-primary">{txn.tutorName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className={cn(
                             "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border",
                             txn.type === 'demo' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-blue-50 text-blue-600 border-blue-100"
                           )}>
                             {txn.type || 'Session'}
                           </span>
                           <p className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">{getSubjectName(txn.subject)}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-xs font-black text-primary">₹{(txn.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="px-8 py-5 text-right">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          txn.status === 'completed' || txn.status === 'confirmed' || txn.status === 'live'
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : txn.status === 'pending' || txn.status === 'pending_cancellation'
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : txn.status === 'unpaid'
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : "bg-slate-50 text-slate-500 border-slate-100"
                        )}>
                          {['completed', 'confirmed', 'live'].includes(txn.status) ? (
                            <CheckCircle2 size={10} />
                          ) : ['pending', 'pending_cancellation'].includes(txn.status) ? (
                            <RefreshCw size={10} className="animate-spin-slow" />
                          ) : txn.status === 'unpaid' ? (
                            <AlertCircle size={10} />
                          ) : (
                            <Clock size={10} />
                          )}
                          {['completed', 'confirmed', 'live'].includes(txn.status) ? 'Paid' : txn.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <p className="text-primary/20 font-black uppercase tracking-widest text-[10px]">No transaction history found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Security Footer */}
      <div className="bg-primary/5 p-8 rounded-[3rem] border border-primary/10 flex items-start gap-5">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
          <ShieldCheckIcon className="text-primary" size={24} />
        </div>
        <div>
          <h4 className="font-black text-sm text-primary mb-1">Secure Transactions Guaranteed</h4>
          <p className="text-[11px] text-primary/60 font-medium leading-relaxed max-w-3xl">
            All payments are processed through Razorpay's secure encrypted gateway. Eduqra does not store your card or bank details. 
            For any billing discrepancies, please contact support with your Transaction ID.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
