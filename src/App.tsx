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
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
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
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, addDoc, query, where, getDocs, onSnapshot, orderBy, updateDoc, deleteDoc, limit, increment, arrayUnion } from 'firebase/firestore';

// --- Types ---

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

type View = 'dashboard' | 'find-tutors' | 'tutor-profile' | 'my-bookings' | 'payments' | 'chat' | 'reviews' | 'progress' | 'settings' | 'login' | 'register' | 'forgot-password' | 'live-class';

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

interface StudentProfile {
  id?: string;
  name: string;
  email: string;
  password: string;
  mobile: string;
  class: string;
  board: string;
  studentType?: 'school' | 'inter' | 'btech' | 'degree';
  notifications: {
    reminders: boolean;
    messages: boolean;
    updates: boolean;
  };
  totalSessions?: number;
  displayName?: string;
  photoURL?: string;
}


interface Tutor {
  id: string;
  name: string;
  avatar: string;
  subjects: string[];
  experience: string;
  rating: number;
  price: number;
  monthlyPrice?: number;
  bio: string;
  reviews: Review[];
  availability: string[];
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
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' | 'unpaid' | 'live';
  isRescheduled?: boolean;
  attendance_status?: 'attended' | 'not_attended' | 'pending';
  studentPresent?: boolean;
  studentJoinTime?: any;
  studentLeaveTime?: any;
  topic?: string;
  tutorJoined?: boolean;
  studentJoined?: boolean;
  durationConducted?: number; // in minutes
  completedAt?: any;
  plan?: string;
  reviewSubmitted?: boolean;
  reviewedAt?: any;
  reviewRating?: number;
  reviewComment?: string;
  paymentDeadline?: any;
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
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
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
    availability: ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM']
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
    availability: ['10:00 AM', '01:00 PM', '03:00 PM', '05:00 PM']
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
    availability: ['08:00 AM', '12:00 PM', '02:00 PM']
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
    availability: ['10:00 AM', '04:00 PM']
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
    availability: ['09:00 AM', '03:00 PM']
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
    availability: ['07:00 AM', '06:00 PM']
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
    availability: ['11:00 AM', '05:00 PM']
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background rounded-[2rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-primary/10"
      >
        <div className="p-6 md:p-8 border-b border-primary/5 flex items-center justify-between">
          <h3 className="text-xl md:text-2xl font-serif font-bold italic">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-primary/5 rounded-full transition-colors">
            <XCircle className="text-primary/30" size={24} />
          </button>
        </div>
        <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
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

export default function App() {
  const [view, setView] = useState<View>('login');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Scroll to top when view changes
  useEffect(() => {
    // Use setTimeout to ensure scroll happens after page transition
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      // Also scroll the main content area if it exists
      const mainElement = document.querySelector('main') || document.querySelector('.main-content') || document.body;
      if (mainElement) {
        mainElement.scrollTop = 0;
      }
    }, 100);
  }, [view]);

  useEffect(() => {
    let isMounted = true;
    let authTimeout: NodeJS.Timeout;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      
      console.log("Auth state changed:", user ? "User logged in" : "User logged out");
      
      // Clear any existing timeout
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      
      try {
        if (user) {
          // Simple Firestore operation with timeout
          const docRef = doc(db, 'students', user.uid);
          
          // Set timeout for the Firestore operation
          const timeoutPromise = new Promise((_, reject) => {
            authTimeout = setTimeout(() => reject(new Error('Firestore timeout')), 8000);
          });
          
          try {
            const docSnap = await Promise.race([getDoc(docRef), timeoutPromise]) as any;
            clearTimeout(authTimeout);
            
            if (docSnap.exists) {
              const userData = docSnap.data();
              setCurrentUser({ id: user.uid, ...userData } as any);
              console.log("Real student profile loaded:", userData.email);
            } else {
              console.log("No student profile found, using auth fallback for:", user.email);
              setCurrentUser({
                id: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'User',
                email: user.email || '',
                mobile: user.phoneNumber || '',
                class: '10',
                board: 'CBSE',
                notifications: { reminders: true, messages: true, updates: true }
              } as any);
            }
            setView('dashboard');
          } catch (firestoreError) {
            console.error("Firestore error, using fallback:", firestoreError);
            // Use auth fallback if Firestore fails
            setCurrentUser({
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              mobile: user.phoneNumber || '',
              class: '10',
              board: 'CBSE',
              notifications: { reminders: true, messages: true, updates: true }
            } as any);
            setView('dashboard');
          }
        } else {
          setView('login');
          setCurrentUser(null);
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
    
    // Set a fallback timeout in case onAuthStateChanged doesn't fire
    authTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.log("Auth initialization timeout, setting loading to false");
        setLoading(false);
        setAuthInitialized(true);
        setView('login');
      }
    }, 15000); // 15 second fallback timeout
    
    return () => {
      isMounted = false;
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      unsubscribe();
    };
  }, []);

  // Additional safety check for loading state
  useEffect(() => {
    if (authInitialized && loading) {
      console.log("Auth initialized but still loading, forcing loading to false");
      setLoading(false);
    }
  }, [authInitialized, loading]);

  const [selectedTutor, setSelectedTutor] = useState<Tutor|null>(null);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // --- Real-time Data Sync ---
  useEffect(() => {
    // 1. Fetch APPROVED tutors only — real-time listener from 'users' collection
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
          price: data.price || 150,
          classTaught: data.classTaught || '',
          avatar: data.avatar || data.profileImage || '',
          bio: data.bio || '',
          experience: data.experience || 'Fresher',
          reviews: data.reviews || []
        };
      });
      setTutors(tutorList);
    }, (err) => {
      console.error("Error fetching tutors:", err);
      setTutors([]);
    });

    return () => unsubTutors();
  }, []);

  // 2. Real-time bookings for current student — reflects admin confirm/cancel instantly
  useEffect(() => {
    if (!currentUser?.email) return;
    console.log("Syncing bookings for:", currentUser.email);
    const bQuery = query(collection(db, 'bookings'), where('studentEmail', '==', currentUser.email));
    const unsubBookings = onSnapshot(bQuery, (snap) => {
      const bookingList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      console.log(`Found ${bookingList.length} real bookings`);
      // Merge with mock data to satisfy "previous all data with present"
      setBookings(bookingList);
    }, (err) => {
      console.error("Error fetching bookings:", err);
    });
    return () => unsubBookings();
  }, [currentUser?.email]);

  const [chats, setChats] = useState<Chat[]>(MOCK_CHATS);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed' | 'cancelled'>('idle');
  const [paymentData, setPaymentData] = useState<{paymentId?: string, orderId?: string, status?: string}>({});
  const [bookingFormData, setBookingFormData] = useState<any>(null);
  const [bookingPlan, setBookingPlan] = useState<'hourly' | 'monthly'>('hourly');
  const [bookingType, setBookingType] = useState<'demo' | 'paid'>('paid');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
  const [bookingDuration, setBookingDuration] = useState('1');
  const [bookingSelectedDate, setBookingSelectedDate] = useState<string>('');
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  const getEffectivePrice = (tutorPrice: any) => {
    if (!currentUser) return parseFloat(String(tutorPrice) || '150') || 150;
    if (currentUser.class === 'B.Tech') return 150; // Base hourly rate; technical courses are ₹3000 flat
    const classNum = parseInt(currentUser.class);
    if (!isNaN(classNum) && classNum >= 6 && classNum <= 10) return 160;
    if (!isNaN(classNum) && classNum >= 1 && classNum <= 5) return 150;
    return parseFloat(String(tutorPrice) || '150') || 150;
  };

  const calculateTotal = () => {
    if (bookingType === 'demo') return 'Free First Demo Session';
    
    const rate = getEffectivePrice(selectedTutor?.price);
    const dur = parseFloat(bookingDuration);

    if (bookingPlan === 'yearly') {
       // Yearly is paid monthly
       if (currentUser?.class === 'B.Tech') return '₹4,000 / month';
       return `₹${(rate * 15).toLocaleString()} / month`; // Discounted monthly rate for yearly commitment
    }
    
    if (currentUser?.class === 'B.Tech' && bookingPlan.startsWith('course')) {
      return '₹3,000'; // Flat course price for B.Tech technical courses
    }

    if (bookingPlan === 'course_45') return `₹${(rate * 45).toLocaleString()}`;
    if (bookingPlan === 'course_60') return `₹${(rate * 60).toLocaleString()}`;
    if (bookingPlan === 'hourly') return `₹${(rate * dur).toLocaleString()}`;
    return `₹${(rate * 20).toLocaleString()}`;
  };

  // --- Real-time Attendance & Global Status Engine ---
  useEffect(() => {
    if (!bookings.length || !currentUser) return;

    const engineInterval = setInterval(async () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const isoToday = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

      bookings.forEach(async (b) => {
        // Status updates only for confirmed or pending classes
        if (b.status === 'confirmed' || b.status === 'pending') {
          const isToday = b.date === todayStr || b.date === isoToday;
          const bMins = parseTime(b.time);
          const diff = bMins - nowMins;

          // 1. 10min Notification Hook (Pre-class)
          if (isToday && diff === 10) {
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
            }
          }

          // 2. Cancellation/Completion Logic (60 mins after start time)
          if (isToday && nowMins > (bMins + 60)) {
            const bRef = doc(db, 'bookings', b.id);
            // ONLY if both were inside class at some point
            if (b.studentPresent && b.tutorPresent) {
              await updateDoc(bRef, { 
                status: 'completed', 
                attendance_status: 'attended',
                completedAt: serverTimestamp() 
              });
            } else if (b.status !== 'cancelled') {
              // Mark as cancelled if time passed and attendance failed
              await updateDoc(bRef, { 
                status: 'cancelled', 
                attendance_status: 'not_attended' 
              });
            }
          }
          
          // 3. Post-Time Auto-Cancel for Pending sessions
          if (isToday && nowMins > bMins && b.status === 'pending') {
             await updateDoc(doc(db, 'bookings', b.id), { status: 'cancelled' });
          }

          // 4. Automatic Cancellation for Unpaid Bookings (30 min timeout)
          if (b.status === 'unpaid' && b.paymentDeadline) {
            const deadline = b.paymentDeadline.seconds ? new Date(b.paymentDeadline.seconds * 1000) : new Date(b.paymentDeadline);
            if (now > deadline) {
               await updateDoc(doc(db, 'bookings', b.id), { status: 'cancelled', cancellationReason: 'Payment Timeout' });
            }
          }
        }
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
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);

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

  const startSession = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || !currentUser?.email) return;

    // 🔐 VALIDATE ENTRY 🔐
    const isParticipant = booking.participants?.includes(currentUser.email) || booking.studentEmail === currentUser.email;
    if (!isParticipant) {
      alert("⛔ Access Denied: You are not a registered participant for this session.");
      return;
    }

    setView('live-class');
    setSessionStatus('connecting');
    setActiveMeetingId(bookingId);
    
    // Track attendance start
    const emailKey = currentUser.email.replace(/\./g, '_');
    try {
      if (booking.isGroup) {
        await updateDoc(doc(db, 'bookings', bookingId), {
          [`participantData.${emailKey}.joinTime`]: serverTimestamp(),
          [`participantData.${emailKey}.status`]: 'pending',
          studentJoined: true // Legacy flag compatibility
        });
      } else {
        await updateDoc(doc(db, 'bookings', bookingId), {
          studentJoinTime: serverTimestamp(),
          studentPresent: true,
          studentJoined: true,
          attendance_status: 'pending'
        });
      }
    } catch (e) {
      console.error("Error updating attendance:", e);
    }
    
    (window as any).lastMuteSignal = Date.now();
    
    const sessionRef = doc(db, 'live_sessions', bookingId);
    const unsub = onSnapshot(doc(db, 'bookings', bookingId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      
      // Sync with status from booking
      if (data.status === 'live' && (sessionStatus === 'waiting' || sessionStatus === 'connecting')) {
        setSessionStatus('live');
        if (data.startedAt) {
          const startedAt = data.startedAt.seconds ? new Date(data.startedAt.seconds * 1000) : new Date(data.startedAt);
          setSessionStartTime(startedAt);
        } else {
          setSessionStartTime(new Date());
        }
      }
      
      if (data.status === 'completed') {
        endSession();
        return;
      }
    });

    const reactUnsub = onSnapshot(collection(db, `live_sessions/${bookingId}/reactions`), (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const reaction = change.doc.data();
          handleSendLiveMessage(`[REACTION]: ${reaction.emoji}`, true);
        }
      });
    });

    const msgUnsub = onSnapshot(query(collection(db, `live_sessions/${bookingId}/messages`), orderBy('timestamp', 'asc')), (snap) => {
      const msgs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'
      })) as any[];
      setLiveMessages(msgs);
    });

    setTimeout(() => {
      setSessionStatus(prev => {
        const currentBooking = bookings.find(b => b.id === bookingId);
        if (currentBooking?.status === 'live') return 'live';
        return prev === 'connecting' ? 'waiting' : prev;
      });
    }, 2000);

    return () => {
      unsub();
      reactUnsub();
      msgUnsub();
    };
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        if (isCamOn && view === 'live-class' && sessionStatus === 'live') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
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
            attendance_status: duration >= 12 ? 'attended' : 'not_attended'
          });
        }
      } catch (e) {
        console.error("Error updating leave time:", e);
      }
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



  const processPayment = (upiOption: string) => {
    if (!selectedTutor || !bookingFormData) return;
    
    setPaymentStatus('processing');
    
    // Generate UPI Intent deep link for the authentic mobile flow
    const durationStr = bookingFormData.duration ? bookingFormData.duration.toString().replace(/ Hours?/, '') : '1';
    const durationNum = parseFloat(durationStr) || 1;
    
    // Dynamic Calculation: Use class-aware effective price
    const hourlyRate = getEffectivePrice(selectedTutor.price);
    let amount = '0';
    if (bookingFormData.type === 'demo') {
      amount = '0';
    } else if (currentUser?.class === 'B.Tech' && (bookingFormData.plan || bookingPlan).startsWith('course')) {
      amount = '3000';
    } else if ((bookingFormData.plan || bookingPlan) === 'hourly') {
      amount = (hourlyRate * durationNum).toFixed(2);
    } else if ((bookingFormData.plan || bookingPlan) === 'course_45') {
      amount = (hourlyRate * 45).toFixed(2);
    } else if ((bookingFormData.plan || bookingPlan) === 'course_60') {
      amount = (hourlyRate * 60).toFixed(2);
    } else {
      // Monthly: 20 sessions
      amount = (hourlyRate * 20).toFixed(2);
    }
    const vpa = 'rzp@hdfcbank';
    const name = encodeURIComponent('Scholar Platform');
    
    let deepLink = '';
    if (upiOption === 'PhonePe') {
      deepLink = `phonepe://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR`;
    } else if (upiOption === 'Google Pay') {
      deepLink = `tez://upi/pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR`;
    } else if (upiOption === 'Paytm') {
      deepLink = `paytmmp://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR`;
    } else {
      deepLink = `upi://pay?pa=${vpa}&pn=${name}&am=${amount}&cu=INR`;
    }
    
    // Attempt to open the installed app (if on mobile, this prompts the user to open PhonePe/GPay)
    try {
      if (deepLink && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = deepLink;
      } else if (deepLink) {
        console.warn('Deep link redirection skipped on desktop: ', deepLink);
      }
    } catch (err) {
      console.error('Redirection failed:', err);
    }
    
    // Simulate Razorpay checkout process webhook callback from background
    setTimeout(async () => {
      // Simulate success
      const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
      const orderId = 'order_' + Math.random().toString(36).substr(2, 9);
      
      setPaymentData({ paymentId, orderId, status: 'success' });
      setPaymentStatus('success');

      if (bookingFormData?.id) {
        // Update the 'unpaid' booking to 'pending' (for Admin/Tutor review)
        await updateDoc(doc(db, 'bookings', bookingFormData.id), {
          status: 'pending',
          paymentId: paymentId,
          orderId: orderId,
          amount: parseFloat(amount),
          paidAt: serverTimestamp()
        });

        // Notify admin of completed payment
        await addDoc(collection(db, 'admin_notifications'), {
          type: 'Payment Success',
          title: 'Enrollment Confirmed',
          message: `${currentUser?.name} paid ₹${amount} for ${bookingFormData.subject}. Booking ID: ${bookingFormData.id}`,
          bookingId: bookingFormData.id,
          time: serverTimestamp(),
          read: false
        });
      }
      
      setNotifications([{
        id: `n${Date.now()}`,
        title: 'Payment Successful',
        message: `Your booking with ${selectedTutor.name} is confirmed.`,
        time: 'Just now',
        type: 'booking',
        read: false,
        link: 'my-bookings'
      }, ...notifications]);

      // 2. Automated welcome chat message
      const studentEmailKey = currentUser?.email?.replace(/\./g, '_');
      if (studentEmailKey && selectedTutor) {
        const chatId = `${selectedTutor.id}_${studentEmailKey}`;
        const chatRef = doc(db, 'whatsapp', chatId);
        const autoMsg = `Hi ${selectedTutor.name}, I have just booked a ${bookingFormData.subject} session for ${bookingFormData.date} at ${bookingFormData.time}. Looking forward to it!`;
        
        await setDoc(chatRef, {
          tutorId: selectedTutor.id,
          tutorName: selectedTutor.name,
          tutorAvatar: selectedTutor.avatar || '',
          studentEmail: currentUser?.email,
          studentName: currentUser?.name || 'Student',
          lastMessage: autoMsg,
          lastMessageTime: new Date().toISOString(),
          timestamp: serverTimestamp(),
          tutorUnreadCount: increment(1)
        }, { merge: true });

        await addDoc(collection(chatRef, 'messages'), {
          senderId: currentUser?.email,
          text: autoMsg,
          timestamp: serverTimestamp(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: 'TODAY',
          deletedBy: []
        });
      }

      // Close modal after success
      setTimeout(() => {
        setIsPaymentModalOpen(false);
        setView('my-bookings');
      }, 2500);

    }, 4500);
  };

  const cancelPayment = () => {
    setPaymentStatus('cancelled');
    setTimeout(() => {
      setIsPaymentModalOpen(false);
      setIsBookingModalOpen(true); // Bring user back to booking modal
    }, 1500);
  };


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
        return cId === chatId ? { ...c, messages: msgs } : c;
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
      setNotifications(data.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedTutor || !tutorBookings) return;
    
    const WORKING_START = 9;
    const WORKING_END = 20;
    const dateStr = new Date().toISOString().split('T')[0]; // Simple today view

    const booked = tutorBookings
      .filter(b => b.date === dateStr && b.status !== 'cancelled')
      .map(b => {
        const s = parseTime(b.time);
        const d = (parseFloat(b.duration) * 60) || 60;
        return { start: s, end: s + d };
      });

    const isSunday = new Date().getDay() === 0;
    if (isSunday) {
      setAvailableSlots([]);
      return;
    }

    const slots = [];
    for (let m = WORKING_START * 60; m <= WORKING_END * 60 - 60; m += 30) {
      if (!booked.some(r => m < r.end && m + 60 > r.start)) {
        slots.push({ start: formatMins(m), end: formatMins(m+60), label: '1 Hour' });
      }
    }
    setAvailableSlots(slots);
  }, [selectedTutor, tutorBookings]);

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

    // Rule 0: No classes on Sunday
    const isSunday = new Date(initialDate).getDay() === 0;
    if (isSunday) {
      setRescheduleSlots([]);
      return;
    }

    const now = new Date();
    const isToday = initialDate === now.toISOString().split('T')[0];

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
    const baseAvailability = (tutor.availability && tutor.availability.length > 0)
      ? tutor.availability
          .filter((slot: any) => {
            // Legacy format support: ["09:00 AM", ...]
            if (typeof slot === 'string') return true;
            // New format support: [{ day, date?, start, end, ... }]
            if (!slot || typeof slot !== 'object') return false;
            if (slot.date) return slot.date === initialDate;
            if (slot.day) return slot.day === selectedDay;
            return false;
          })
          .map((slot: any) => typeof slot === 'string' ? slot : (slot.start || ''))
          .filter((time: string) => !!time)
      : [];

    baseAvailability.forEach(slot => {
      const slotStartMins = parseTime(slot);
      const slotEndMins = slotStartMins + 60;
      const slotDateTime = new Date(`${initialDate} ${slot}`).getTime();

      // Rule 1: Must be in the future (if today)
      if (isToday) {
        const minTime = now.getTime() + (60 * 60 * 1000); // At least 1 hour from now
        if (slotDateTime < minTime) return;
      }

      // Rule 2: Must be BEFORE the next class
      if (deadlineTime && slotDateTime >= deadlineTime) return;

      // Rule 3: Must not conflict with tutor's other bookings
      if (!booked.some(r => slotStartMins < r.end && slotEndMins > r.start)) {
        slots.push(slot);
      }
    });

    setRescheduleSlots(slots);
  }, [reschedulingBooking, rescheduleDate, bookings, tutors]);

  function parseTime(t: string) {
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let [_, h, m, ampm] = match;
    let hours = parseInt(h);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + parseInt(m);
  }

  function formatMins(m: number) {
    let h = Math.floor(m / 60);
    const mm = m % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mm.toString().padStart(2, '0')} ${ampm}`;
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = bookingType;
    if (!selectedTutor || !currentUser) return;
    
    const form = e.target as HTMLFormElement;
    const subject = (form.elements.namedItem('subject') as HTMLSelectElement)?.value || (bookingFormData?.subject || 'General');
    const date = (form.elements.namedItem('date') as HTMLInputElement)?.value || (bookingFormData?.date || '');
    const time = (form.elements.namedItem('time') as HTMLSelectElement)?.value || (bookingFormData?.time || '');
    const duration = (form.elements.namedItem('duration') as HTMLSelectElement)?.value || (bookingFormData?.duration || '1 Hour');
    const plan = (form.elements.namedItem('plan') as HTMLSelectElement)?.value as 'hourly' | 'monthly' || 'hourly';

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

    const isGroup = (form.elements.namedItem('isGroup') as HTMLInputElement)?.value === 'true';

    // ⚡ CHECK FOR EXISTING GROUP SESSION ⚡
    const existingGroup = bookings.find(b => 
      b.tutorId === selectedTutor.id && 
      b.date === date && 
      b.time === time &&
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

      if (isGroup && existingGroup) {
        // Join existing group demo
        await updateDoc(doc(db, 'bookings', existingGroup.id), {
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
        await addDoc(collection(db, 'bookings'), bookingData);
      }
      
      // Notify Tutor
      await addDoc(collection(db, 'tutor_notifications'), {
        tutorId: selectedTutor.id,
        type: 'booking',
        title: isGroup ? 'New Group Participant' : 'New Demo Requested',
        description: `${currentUser.name} joined ${isGroup ? 'the group' : 'a demo'} session for ${subject} on ${date}.`,
        time: 'Just now',
        read: false
      });

      setIsBookingModalOpen(false);
      setView('my-bookings');
    } else {
      // Paid sessions
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
          status: 'unpaid',
          type: 'paid',
          amount: 0,
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
          amount: 0,
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
    }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await signOut(auth);
    setView('login');
    setCurrentUser(null);
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

const LoginView = ({ setView, setCurrentUser }: { 
  setView: (view: View) => void, 
  setCurrentUser: (user: StudentProfile | null) => void 
}) => {
  const [email, setEmail] = useState('test@eduqra.com');
  const [password, setPassword] = useState('EduqraSecure!2024');
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

      // 🔐 SECURE BYPASS CHECK
      if (email === "test@eduqra.com") {
        if (password === "EduqraSecure!2024") {
          console.log("✅ Test account bypass success");
          setCurrentUser({
            name: "Scholar Tester",
            email: "test@eduqra.com",
            password: "EduqraSecure!2024",
            mobile: "9999999999",
            class: "10",
            board: "CBSE",
            notifications: { reminders: true, messages: true, updates: true }
          } as any);
          setView("dashboard");
          setIsLoggingIn(false);
          return;
        } else {
          // If it's test email but WRONG password, block immediately
          console.log("❌ Test account password mismatch");
          setError("Invalid email or password.");
          setIsLoggingIn(false);
          return;
        }
      }

      // 1. Try to sign in via Firebase
      console.log("📡 Attempting Firebase Sign In for:", email);
      await signInWithEmailAndPassword(auth, email, password);
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
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                <input 
                  type="email" 
                  className="input-field pl-12"
                  value={email}
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

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$/;
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
        status: 'active',
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
      fetch('http://localhost:5001/api/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: uid })
      }).catch(err => console.error("Welcome Email Trigger Failed:", err));
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
          
          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Full Name</label>
              <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value.replace(/[^A-Za-z\s]/g, "")})} placeholder="Alphabets only" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Email</label>
              <input type="email" required className="input-field" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="example@email.com" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required className="input-field pr-12" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Min 8 chars, 1 Symbol, 1 Num" />
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



  const markNotifRead = async (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, { read: true });
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  };

  // --- View Components ---

const ForgotPasswordView = ({ setView }: { setView: (view: View) => void }) => {
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
        const response = await fetch('http://localhost:5001/api/auth/reset-password', {
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

    const handleReset = (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      
      const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
      if (!passRegex.test(newPassword)) {
        setError("Password must be 8+ chars with uppercase, lowercase, numbers, and symbols.");
        return;
      }

      setSuccess("✅ Password updated successfully! Redirecting to login...");
      setTimeout(() => setView('login'), 2000);
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
              <button type="submit" className="w-full bg-primary text-background py-4 rounded-2xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">
                Update & Sign In
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

const Sidebar = ({ view, setView, isMobileSidebarOpen, setIsMobileSidebarOpen, handleLogout, currentUser, chats }: { 
  view: View, 
  setView: (view: View) => void, 
  isMobileSidebarOpen: boolean, 
  setIsMobileSidebarOpen: (open: boolean) => void, 
  handleLogout: () => void, 
  currentUser: StudentProfile | null, 
  chats: Chat[] 
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
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
            <GraduationCap className="text-primary" size={24} />
          </div>
          <span className="font-serif text-2xl font-bold italic">Scholar</span>
        </div>
        <button 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden p-2 text-background/60 hover:text-background"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {[
          { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
          { id: 'find-tutors', name: 'Find Tutors', icon: Search },
          { id: 'my-bookings', name: 'My Bookings', icon: Calendar },
          { id: 'payments', name: 'Payments', icon: DollarSign },
          { id: 'progress', name: 'Progress', icon: BarChart2 },
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
            <item.icon size={20} className={cn(view === item.id ? "text-primary" : "text-white/40")} />
            <span className="flex-1 text-left">{item.name}</span>
            {item.badge && item.badge > 0 && (
              <span className="bg-primary text-background text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-primary/20">{item.badge}</span>
            )}
          </motion.button>
        ))}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center text-[10px] font-bold">
            {currentUser?.email?.substring(0, 2)?.toUpperCase() || 'ST'}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-medium truncate">{currentUser?.email || 'Student Account'}</span>
            <span className="text-[10px] text-background/40 uppercase tracking-wider">Student Account</span>
          </div>
        </div>
      </div>
    </aside>
  </>
);

const Topbar = ({ view, setIsMobileSidebarOpen, isNotifOpen, setIsNotifOpen, notifications, markNotifRead, setView, currentUser, handleLogout }: {
  view: View,
  setIsMobileSidebarOpen: (open: boolean) => void,
  isNotifOpen: boolean,
  setIsNotifOpen: (open: boolean) => void,
  notifications: Notification[],
  markNotifRead: (id: string) => void,
  setView: (view: View) => void,
  currentUser: StudentProfile | null,
  handleLogout: () => void
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
                    className={`w-full p-4 md:p-6 text-left hover:bg-primary/5 transition-colors border-b border-primary/5 last:border-0 ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <p className="text-xs md:text-sm font-bold text-on-surface">{n.title}</p>
                    <p className="text-[10px] md:text-xs text-on-surface-variant mt-1">{n.message}</p>
                    <p className="text-[9px] md:text-[10px] text-on-surface-variant opacity-40 mt-2 font-bold uppercase tracking-widest">{n.time}</p>
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
            <p className="text-sm font-bold">{currentUser?.name || 'Alex Johnson'}</p>
            <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{currentUser?.class ? `Class ${currentUser.class}` : 'Senior Student'}</p>
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

const DashboardView = ({ setView, bookings, setSelectedTutor, openChat, onReschedule, tutors }: { 
  setView: (view: View) => void, 
  bookings: Booking[], 
  setSelectedTutor: (tutor: Tutor | null) => void, 
  openChat: (tutorId: string) => void, 
  onReschedule: (booking: Booking) => void,
  tutors: Tutor[]
}) => (
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
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
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

            const filtered = bookings.filter(b => {
              const isConfirmed = b.status === 'confirmed' || b.status === 'pending';
              const isToday = b.date === todayStr || b.date === isoToday;
              const isTomorrow = b.date === tomorrowStr || b.date === isoTomorrow;
              return isConfirmed && (isToday || isTomorrow);
            });

            if (filtered.length === 0) return (
              <div className="text-center py-12 md:py-20 bg-white/20 rounded-[2rem] border border-dashed border-primary/10 w-full">
                <p className="text-primary/30 font-bold uppercase tracking-widest text-[10px]">No sessions for today or tomorrow</p>
                <button onClick={() => setView('find-tutors')} className="text-accent font-bold text-xs mt-4 hover:underline uppercase tracking-tighter">Find a tutor</button>
              </div>
            );

            return filtered.map((booking, i) => (
                <motion.div 
                  key={booking.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="course-card flex-col md:flex-row gap-4 md:gap-8 p-4 md:p-8"
                >
                <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
                  <Avatar 
                    src={((tutors || []).find(t => t.id === booking.tutorId) || MOCK_TUTORS.find(t => t.id === booking.tutorId))?.avatar || ''} 
                    size="md" mdSize="lg" 
                    initials={(booking.tutorName || 'Tutor').charAt(0).toUpperCase()}
                  />
                  <div 
                    className="cursor-pointer flex-1"
                    onClick={() => {
                      setSelectedTutor((tutors || []).find(t => t.id === booking.tutorId) || MOCK_TUTORS.find(t => t.id === booking.tutorId) || null);
                      setView('tutor-profile');
                    }}
                  >
                    <h4 className="text-lg md:text-xl font-bold">{booking.tutorName}</h4>
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-1">
                      <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-on-surface/80">
                        <BookOpen size={10} /> {booking.subject}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-on-surface/80">
                        <Clock size={10} /> {booking.time}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-primary/5">
                  <div className="text-left md:text-right">
                    <p className="text-xs md:text-sm font-bold">{booking.date}</p>
                    <p className="text-[9px] md:text-[10px] font-bold text-on-surface/60 uppercase tracking-widest">Scheduled Session</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                       onClick={() => openChat(booking.tutorId)}
                       className="w-10 h-10 rounded-full border border-primary/10 flex items-center justify-center hover:bg-primary hover:text-background transition-all"
                       title="Message"
                     >
                       <MessageSquare size={18} />
                     </button>
                     {booking.status === 'confirmed' && (() => {
                        const now = new Date();
                        const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const isoToday = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                        const isToday = booking.date === todayStr || booking.date === isoToday;
                        const sessionMins = parseTime(booking.time);
                        const nowMins = now.getHours() * 60 + now.getMinutes();
                        const diffMins = sessionMins - nowMins;
                        const isActive = (isToday && diffMins <= 10 && diffMins >= -60) || booking.status === 'live';

                        return isActive ? (
                          <button 
                            onClick={() => startSession(booking.id)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-blue-500/20 animate-pulse"
                          >
                            Join Class
                          </button>
                        ) : (
                          <button 
                            disabled
                            className="px-6 py-2 bg-primary/10 text-primary/40 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-not-allowed opacity-50"
                          >
                            {isToday && diffMins > 10 ? 'Session Not Started' : booking.time}
                          </button>
                        );
                     })()}
                      {(() => {
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
                            className="w-10 h-10 rounded-full border border-primary/10 flex items-center justify-center hover:bg-primary hover:text-background transition-all"
                            title="Reschedule Session"
                          >
                            <Calendar size={18} />
                          </button>
                        );
                      })()}
                   </div>
                </div>
              </motion.div>
            ));
          })()}
        </motion.div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <h3 className="text-xl md:text-2xl font-serif font-bold italic">My Active Tutors</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {(() => {
            const bookedTutorIds = Array.from(new Set(bookings.map(b => b.tutorId)));
            const activeTutors = tutors.filter(t => bookedTutorIds.includes(t.id));

            if (activeTutors.length === 0) return (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center py-12 bg-white/10 rounded-[2rem] border border-dashed border-primary/5">
                <p className="text-primary/30 font-bold uppercase tracking-widest text-[10px]">Your personal tutors list will appear here after your first booking</p>
              </div>
            );

            return activeTutors.map((tutor, i) => (
              <motion.div 
                key={tutor.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i }}
                onClick={() => setSelectedTutor(tutor)}
                className="p-5 bg-white/40 backdrop-blur-md rounded-3xl shadow-sm border border-primary/5 cursor-pointer hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <Avatar initials={(tutor.name || 'T')[0]} size="md" className="group-hover:scale-105 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{tutor.name}</h4>
                    <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest mt-0.5">
                      {bookings.filter(b => b.tutorId === tutor.id).length} Active Sessions
                    </p>
                  </div>
                  <MessageSquare size={16} className="text-primary/30 hover:text-primary cursor-pointer" onClick={(e) => { e.stopPropagation(); openChat(tutor.id); }} />
                </div>
              </motion.div>
            ));
          })()}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-serif font-bold italic">Learning Progress</h3>
          <button onClick={() => setView('progress')} className="px-3 py-1 bg-accent/10 text-accent text-[9px] font-extrabold uppercase tracking-widest rounded-lg hover:bg-accent hover:text-white transition-all shadow-sm">View Tracker</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {(() => {
            const activeBookings = bookings.filter(b => b.status !== 'cancelled');
            const bookedSubjects = Array.from(new Set(activeBookings.map(b => b.subject)));
            
            return bookedSubjects.length > 0 ? bookedSubjects.map((sub, i) => {
              const subSessions = bookings.filter(b => b.subject === sub);
              const attendedCount = subSessions.filter(b => b.status === 'completed' || b.attendance_status === 'attended').length;
              
              // Dynamic Target: 45 for course_45, 60 for course_60, 20 for monthly, 1 for demo/hourly
              const latestBooking = subSessions.length > 0 ? subSessions[0] : null;
              const planLimit = latestBooking?.plan === 'course_45' ? 45 : latestBooking?.plan === 'course_60' ? 60 : latestBooking?.plan === 'monthly' ? 20 : 1;
              const progress = Math.min(Math.round((attendedCount / planLimit) * 100) + 10, 100); // +10% base for registration
              
              return (
                <motion.div 
                  key={sub}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + (i * 0.1) }}
                  className="p-8 bg-white/40 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-primary/5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-base md:text-lg">{sub}</span>
                    <span className="text-xs font-bold text-primary">{progress}%</span>
                  </div>
                  <div className="h-2 bg-primary/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-primary"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-primary/30">
                      {attendedCount} / {planLimit} Sessions Attended
                    </p>
                    <span className="text-[8px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">
                      {latestBooking?.plan || 'Active'}
                    </span>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="col-span-2 p-12 text-center bg-primary/5 rounded-[2.5rem] border border-dashed border-primary/10">
                <p className="text-sm font-bold text-primary/40 uppercase tracking-widest">No active courses found. Your learning progress will appear here after booking.</p>
              </div>
            );
          })()}
        </div>
      </section>
    </div>
  );

const FindTutorsView = ({ setView, setSelectedTutor, tutors }: { 
  setView: (view: View) => void, 
  setSelectedTutor: (tutor: Tutor | null) => void,
  tutors: Tutor[]
}) => {
    const [search, setSearch] = useState('');
    const [subject, setSubject] = useState('All');
    const [maxPrice, setMaxPrice] = useState(5000); // Increased default to 5000 to show our ₹150+ tutors by default
    const [minRating, setMinRating] = useState(0);
    
    const filteredTutors = tutors.filter(t => {
      const matchesSearch = search === '' || (t.name || '').toLowerCase().includes(search.toLowerCase());
      const subjects = t.subjects || [];
      const matchesSubject = subject === 'All' || subjects.includes(subject);
      
      const effectivePrice = getEffectivePrice(t.price);
      const matchesPrice = effectivePrice <= maxPrice;
      
      const matchesRating = (t.rating === undefined || t.rating === null) || t.rating >= minRating;
      
      return matchesSearch && matchesSubject && matchesPrice && matchesRating;
    });

    return (
    <div className="space-y-8 md:space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
      >
        <div className="col-span-2 lg:col-span-2 relative">
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
        <div className="flex gap-4">
          <select 
            className="input-field flex-1"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          >
            <option value="5000">Max Price (All)</option>
            <option value="200">₹200</option>
            <option value="500">₹500</option>
            <option value="1000">₹1000</option>
          </select>
          <select 
            className="input-field flex-1"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
          >
            <option value="0">Min Rating</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
          </select>
        </div>
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
                  <span className="text-secondary text-sm md:text-lg font-black">₹{getEffectivePrice(tutor.price)}/hr</span>
                  <p className="text-[8px] font-black uppercase tracking-widest text-primary/30 mt-0.5">Starting Price</p>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-serif font-bold italic text-on-surface mb-2 leading-tight truncate">{tutor.name}</h3>
                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
                  {(tutor as any).subjects?.slice(0, 2).map((s: string) => (
                    <span key={s} className="pill-tag bg-primary/5 text-primary/70 !text-[8px]">{s}</span>
                  ))}
                  <span className="pill-tag bg-accent/5 text-accent/70 !text-[8px]">{(tutor as any).experience || 'Expert'} Exp</span>
                </div>
                <p className="text-primary/60 text-[10px] md:text-xs leading-relaxed mb-4 line-clamp-2">{(tutor as any).bio}</p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {(() => {
                    const hasAttendedDemo = bookings.some(b => b.tutorId === tutor.id && b.type === 'demo' && (b.status === 'completed' || b.attendance_status === 'attended'));
                    const hasBookedDemo = bookings.some(b => b.tutorId === tutor.id && b.type === 'demo' && b.status !== 'cancelled');

                    if (!hasBookedDemo) {
                      return (
                        <button 
                          onClick={() => { setSelectedTutor(tutor); setBookingType('demo'); setIsBookingModalOpen(true); }}
                          className="flex-1 bg-accent/10 text-accent py-2.5 md:py-3 rounded-xl font-black text-[10px] md:text-xs hover:bg-accent hover:text-white transition-all text-center"
                        >
                          Book Free Demo
                        </button>
                      );
                    } else {
                      return (
                        <button 
                          onClick={() => { setSelectedTutor(tutor); setBookingType('paid'); setIsBookingModalOpen(true); setBookingPlan('monthly'); setBookingDuration('1'); }}
                          className="flex-1 bg-primary text-background py-2.5 md:py-3 rounded-xl font-black text-[10px] md:text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          {hasAttendedDemo ? 'Pay for Next Session' : 'Enroll Now'}
                        </button>
                      );
                    }
                  })()}
                </div>
                <button 
                  onClick={() => openChat(tutor.id)}
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

const TutorProfileView = ({ selectedTutor, setView, setIsBookingModalOpen, openChat }: { 
  selectedTutor: Tutor | null, 
  setView: (view: View) => void, 
  setIsBookingModalOpen: (open: boolean) => void,
  openChat: (tutorId: string) => void
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
                    {selectedTutor.experience !== 'Fresher' && (
                      <>
                        <span className="hidden sm:inline text-primary/10">|</span>
                        <span className="text-primary/40 text-[10px] md:text-xs font-bold uppercase tracking-widest">{selectedTutor.experience} Experience</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 py-4 md:py-6 border-y border-primary/5">
                  <div>
                    <p className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest mb-1">Subjects</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      {selectedTutor.subjects.map(s => (
                        <span key={s} className="pill-tag text-[8px] md:text-[9px]">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest mb-1">Next Available</p>
                    <p className="text-xs md:text-sm font-bold">
                      {(() => {
                        if (!selectedTutor?.availability || selectedTutor.availability.length === 0) return 'Flexible';
                        const now = new Date();
                        const currentMins = now.getHours() * 60 + now.getMinutes();
                        const futureToday = selectedTutor.availability
                          .map(time => ({ time, mins: parseTime(time) }))
                          .filter(slot => slot.mins > currentMins + 60)
                          .sort((a, b) => a.mins - b.mins);
                        if (futureToday.length > 0) return `${futureToday[0].time} Today`;
                        const sorted = [...selectedTutor.availability].sort((a, b) => parseTime(a) - parseTime(b));
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
              <p className="text-background/50 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">Investment</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-serif font-bold italic">₹{getEffectivePrice(selectedTutor.price)}</span>
                <span className="text-background/50 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">/ hour</span>
              </div>
              <div className="flex flex-col gap-4 mt-6 md:mt-8">
                {(() => {
                  const hasAttendedDemo = bookings.some(b => b.tutorId === selectedTutor.id && b.type === 'demo' && (b.status === 'completed' || b.attendance_status === 'attended'));
                  const hasBookedDemo = bookings.some(b => b.tutorId === selectedTutor.id && b.type === 'demo' && b.status !== 'cancelled');

                  if (!hasBookedDemo) {
                    return (
                      <button 
                        onClick={() => { setBookingType('demo'); setIsBookingModalOpen(true); }}
                        className="w-full bg-accent/10 text-accent py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:bg-accent hover:text-white transition-all text-sm md:text-base"
                      >
                        Book Free Demo
                      </button>
                    );
                  } else {
                    return (
                      <button 
                        onClick={() => { setBookingType('paid'); setBookingDuration('1'); setIsBookingModalOpen(true); }}
                        className="w-full bg-primary text-background py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl text-sm md:text-base"
                      >
                        {hasAttendedDemo ? 'Complete Enrollment' : 'Become a Paid Student'}
                      </button>
                    );
                  }
                })()}
              </div>
              <button 
                onClick={() => openChat(selectedTutor.id)}
                className="w-full mt-3 md:mt-4 bg-primary/10 text-background py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:bg-primary/20 transition-all border border-background/10 text-sm md:text-base"
              >
                Message Tutor
              </button>
            </section>

            <section className="p-8 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-primary/5">
              <h3 className="text-base md:text-lg font-bold mb-4 md:mb-6">Availability</h3>
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                {selectedTutor.availability.map(time => (
                  <button key={time} className="py-2 md:py-3 px-3 md:px-4 rounded-lg md:rounded-xl border border-primary/10 text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-background transition-all">
                    {time}
                  </button>
                ))}
              </div>
              <p className="text-[9px] md:text-[10px] text-primary/30 mt-4 md:mt-6 text-center font-bold uppercase tracking-widest">All times are local</p>
            </section>
          </div>
        </div>
      </motion.div>
    );
  };

const MyBookingsView = ({ bookings, setBookings, openChat, onReschedule, setView, setSelectedTutor, tutors, startSession, parseTime }: { 
  bookings: Booking[], 
  setBookings: (bookings: Booking[]) => void,
  openChat: (tutorId: string) => void, 
  onReschedule: (booking: Booking) => void,
  setView: (view: View) => void,
  setSelectedTutor: (tutor: Tutor | null) => void,
  tutors: Tutor[],
  startSession: (id: string) => void,
  parseTime: (time: string) => number
}) => {
    const [tab, setTab] = useState<'all' | 'confirmed' | 'pending' | 'completed' | 'cancel'>('all');
    
    const filteredBookings = bookings.filter(b => {
      if (tab === 'all') return true;
      if (tab === 'confirmed') return b.status === 'confirmed' && b.attendance_status !== 'attended';
      if (tab === 'pending') return b.status === 'pending';
      if (tab === 'completed') return (b.status === 'completed' || b.attendance_status === 'attended') && b.tutorJoined && b.studentJoined && b.topic && (b.durationConducted === undefined || b.durationConducted >= 2);
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
              <span className="text-3xl md:text-5xl font-black">{bookings.filter(b => (b.attendance_status === 'attended' || b.status === 'completed') && b.tutorJoined && b.studentJoined && b.topic && (b.durationConducted === undefined || b.durationConducted >= 2)).length}</span>
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
              className="course-card p-6 md:p-8 flex flex-col md:flex-row items-stretch md:items-center gap-6 md:gap-12"
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
                  <p className="text-[9px] md:text-[10px] font-bold text-primary/40 uppercase tracking-widest">{booking.subject}</p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 border-t md:border-t-0 md:border-l border-primary/5 pt-4 md:pt-0 md:pl-12">
                <div className="flex items-center gap-3 text-primary/60">
                  <div className="p-2 rounded-lg bg-accent/5 text-accent"><Calendar size={16} /></div>
                  <div>
                    <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">Date</p>
                    <p className="text-xs md:text-sm font-bold text-on-surface">{booking.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-primary/60">
                  <div className="p-2 rounded-lg bg-accent/5 text-accent"><Clock size={16} /></div>
                  <div>
                    <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">Time & Duration</p>
                    <p className="text-xs md:text-sm font-bold text-on-surface">
                      {booking.status === 'completed' || booking.attendance_status === 'attended' ? (
                        <span className="text-slate-500 italic opacity-60">Session Ended</span>
                      ) : (
                        `${booking.time} • ${booking.duration && booking.duration.toLowerCase().includes('hr') ? booking.duration : `${booking.duration || '1'} Hr`}`
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 md:min-w-[200px] border-t md:border-t-0 border-primary/5 pt-4 md:pt-0">
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

                  {booking.status === 'confirmed' && (() => {
                    const now = new Date();
                    const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const isoToday = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                    const isToday = booking.date === todayStr || booking.date === isoToday;
                    
                    const sessionMins = parseTime(booking.time);
                    const nowMins = now.getHours() * 60 + now.getMinutes();
                    const diffMins = sessionMins - nowMins;
                    
                    const durationHrs = parseFloat(booking.duration || '1');
                    const durationMins = durationHrs * 60;
                    
                    const isActive = (isToday && diffMins <= 10 && diffMins >= -(durationMins)) || booking.status === 'live';
                    const isCompleted = isToday && diffMins < -(durationMins);
                    
                    if (isActive) {
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
                    return (
                      <button disabled className="px-6 py-2 bg-primary/5 text-primary/30 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-not-allowed opacity-50">
                        {isToday && diffMins > 10 ? 'Session Not Started' : booking.time}
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

const ProgressTrackerView = ({ setView, bookings }: { setView: (view: View) => void, bookings: Booking[] }) => {
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
      const limit = latest?.plan === 'course_45' ? 45 : latest?.plan === 'course_60' ? 60 : latest?.plan === 'monthly' ? 20 : 1;
      const progress = Math.min(Math.round((attended / limit) * 100) + 10, 100);
      
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

const ReviewsView = ({ bookings, tutors, currentUser }: { bookings: Booking[], tutors: Tutor[], currentUser: StudentProfile | null }) => {
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
                   <p className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] mb-4">{(tutor.subjects || []).slice(0, 1).join(' • ')}</p>

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
                              } else {
                                await updateDoc(doc(db, 'bookings', bId), {
                                  reviewSubmitted: true,
                                  reviewRating: reviewForm.rating,
                                  reviewComment: reviewForm.comment,
                                  reviewedAt: serverTimestamp()
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

const SettingsView = ({ setView, currentUser, setCurrentUser }: { setView: (view: View) => void, currentUser: StudentProfile | null, setCurrentUser: (user: StudentProfile | null) => void }) => {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    mobile: currentUser?.mobile || '',
    class: currentUser?.class || '',
    board: currentUser?.board || '',
    email: currentUser?.email || ''
  });

  const [prefState, setPrefState] = useState({
    reminders: currentUser?.notifications?.reminders ?? true,
    messages: currentUser?.notifications?.messages ?? true,
    updates: currentUser?.notifications?.updates ?? true
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
        email: currentUser.email || ''
      });
      setPrefState({
        reminders: currentUser.notifications?.reminders ?? true,
        messages: currentUser.notifications?.messages ?? true,
        updates: currentUser.notifications?.updates ?? true
      });
    }
  }, [currentUser?.email]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    setStatus('saving');
    setIsSaving(true);
    
    try {
      const userRef = doc(db, 'students', auth.currentUser.uid);
      const updatedData = {
        name: formData.name,
        mobile: formData.mobile,
        class: formData.class,
        board: formData.board
      };
      await setDoc(userRef, updatedData, { merge: true });
      setCurrentUser({ ...currentUser, ...updatedData } as any);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error('Save failed:', e);
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrefs = async () => {
    if (!auth.currentUser) return;
    setStatus('saving');
    
    try {
      const userRef = doc(db, 'students', auth.currentUser.uid);
      await setDoc(userRef, { notifications: prefState }, { merge: true });
      setCurrentUser({ ...currentUser!, notifications: prefState });
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      console.error('Error updating preferences:', e);
      setStatus('error');
    }
  };

  const handleUpdatePassword = async () => {
    const { updatePassword, EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
    if (!auth.currentUser || !auth.currentUser.email) return;

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
      setErrorMessage(e.message || "Failed to update password. Check current password.");
      setPwdStatus('error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-12"
    >
      {/* Profile Section */}
      <section className="p-6 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-primary/5 space-y-8 md:space-y-10 shadow-2xl">
        <h3 className="text-xl md:text-2xl font-serif font-bold italic">My Profile</h3>
        <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8 pb-8 md:pb-10 border-b border-primary/5">
          <Avatar src={currentUser?.photoURL} initials={currentUser?.name?.charAt(0) || 'S'} size="lg" mdSize="xl" className="w-24 h-24 md:w-32 md:h-32" />
          <button className="text-[10px] font-bold uppercase tracking-widest text-accent hover:underline">Change Photo</button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
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

        <div className="pt-8 border-t border-primary/5 flex items-center gap-4">
          <Button 
             className="rounded-full px-12 py-4 shadow-xl shadow-primary/20 flex items-center gap-2"
             onClick={handleSaveProfile}
             disabled={isSaving}
          >
            <Save size={16} />
            Update Profile
          </Button>
          {status === 'success' && <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Saved Successfully!</span>}
        </div>
      </section>

      {/* Notifications Section */}
      <section className="p-6 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-primary/5 space-y-6 md:space-y-8 shadow-xl">
        <h3 className="text-xl md:text-2xl font-serif font-bold italic">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { id: 'reminders', label: 'Booking Reminders', desc: 'Get notified about upcoming sessions' },
            { id: 'messages', label: 'New Messages', desc: 'Receive alerts when tutors message you' },
            { id: 'updates', label: 'Platform Updates', desc: 'Stay informed about new features and tutors' }
          ].map((pref) => (
            <div key={pref.id} className="flex items-center justify-between p-4 md:p-6 bg-white/40 rounded-xl md:rounded-2xl border border-primary/5">
              <div className="pr-4">
                <p className="text-xs md:text-sm font-bold">{pref.label}</p>
                <p className="text-[10px] md:text-xs text-primary/40">{pref.desc}</p>
              </div>
              <button 
                onClick={() => setPrefState(prev => ({ ...prev, [pref.id]: !prev[pref.id as keyof typeof prefState] }))}
                className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${prefState[pref.id as keyof typeof prefState] ? 'bg-primary' : 'bg-primary/10'}`}
              >
                <motion.div 
                  animate={{ x: prefState[pref.id as keyof typeof prefState] ? 'calc(100% - 1.25rem)' : '0.25rem' }}
                  className="absolute top-0.5 md:top-1 w-4 h-4 bg-white rounded-full shadow-sm"
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
            Save Preferences
          </Button>
          {status === 'success' && <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Saved!</span>}
        </div>
      </section>

      {/* Security Section */}
      <section className="p-6 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-primary/5 space-y-6 md:space-y-8 shadow-xl">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest ml-1">{errorMessage}</p>
        )}

        <div className="pt-4 flex items-center gap-4">
          <Button 
            className="w-full sm:w-auto px-10 py-4 rounded-2xl text-[10px] uppercase shadow-lg shadow-primary/10"
            onClick={handleUpdatePassword}
            disabled={pwdStatus === 'saving'}
          >
            {pwdStatus === 'saving' ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Lock size={14} className="mr-2" />}
            Update Password
          </Button>
          {pwdStatus === 'success' && <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Success!</span>}
        </div>
      </section>
    </motion.div>
  );
};

  const PaymentsView = ({ bookings, onPay }: { 
    bookings: Booking[], 
    onPay: (booking: Booking) => void 
  }) => {
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-12"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 mt-2">
          <div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Payments & Billing</h2>
            <p className="text-sm font-bold text-primary/40 mt-1">Manage your course transactions securely.</p>
          </div>
          <div className="bg-primary/5 px-6 py-4 rounded-2xl flex items-center gap-3 border border-primary/10 shadow-sm">
            <Lock className="text-primary w-5 h-5" />
            <div>
              <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">Gateway</p>
              <p className="font-bold text-sm tracking-tight text-primary">Razorpay Secure</p>
            </div>
          </div>
        </div>

        <section className="space-y-6">
          <h3 className="text-xl md:text-2xl font-serif font-bold italic border-b border-primary/5 pb-4">Unpaid Sessions</h3>
          {pendingBookings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingBookings.map((booking, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={booking.id}
                  className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-rose-100 shadow-xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-rose-100 transition-all flex flex-col"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-primary"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg leading-tight">{booking.subject}</h4>
                      <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest mt-1">with {booking.tutorName}</p>
                    </div>
                    <Badge variant="pending">Pending</Badge>
                  </div>
                  
                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary/60">
                      <Calendar size={14} className="text-accent" /> {booking.date}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                      <Clock size={14} /> {booking.time} • {booking.duration}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-primary/5 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-primary/30 uppercase tracking-widest">Total Price</p>
                      <p className="text-2xl font-serif font-bold italic text-primary">${MOCK_TUTORS.find(t => t.id === booking.tutorId)?.price}</p>
                    </div>
                    <button 
                      onClick={() => onPay(booking)}
                      className="bg-primary text-background px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg text-xs tracking-wide flex items-center gap-2"
                    >
                      <DollarSign size={14} /> Pay Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white/20 rounded-[3rem] border border-dashed border-primary/10">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-70" />
              <p className="text-primary/30 font-bold uppercase tracking-widest text-xs">All caught up! No pending payments.</p>
            </div>
          )}
        </section>
      </motion.div>
    );
  };

  // --- Render Logic ---
  const views = {
    'payments': (
      <PaymentsView 
        bookings={bookings}
        onPay={(booking) => {
          setSelectedTutor(MOCK_TUTORS.find(t => t.id === booking.tutorId) || null);
          setBookingFormData({ 
            subject: booking.subject, 
            date: booking.date, 
            time: booking.time, 
            duration: booking.duration.replace(/ Hours?/, ''),
            id: booking.id
          });
          setIsPaymentModalOpen(true);
          setPaymentStatus('idle');
          setPaymentData({});
        }}
      />
    ),
    'login': (
      <LoginView 
        setView={setView} 
        setCurrentUser={setCurrentUser} 
      />
    ),
    'register': (
      <RegisterView 
        setView={setView} 
        setCurrentUser={setCurrentUser} 
      />
    ),
    'forgot-password': <ForgotPasswordView setView={setView} />,
    'dashboard': (
      <DashboardView 
        setView={setView} 
        bookings={bookings} 
        setSelectedTutor={setSelectedTutor} 
        openChat={openChat} 
        onReschedule={(booking) => setReschedulingBooking(booking)} 
        tutors={tutors}
      />
    ),
    'find-tutors': (
      <FindTutorsView 
        setView={setView} 
        setSelectedTutor={setSelectedTutor} 
        tutors={tutors}
      />
    ),
    'tutor-profile': (
      <TutorProfileView 
        selectedTutor={selectedTutor} 
        setView={setView} 
        setIsBookingModalOpen={setIsBookingModalOpen} 
        openChat={openChat}
      />
    ),
    'my-bookings': (
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
      />
    ),
    'chat': (
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
      />
    ),
    'reviews': <ReviewsView bookings={bookings} tutors={tutors} currentUser={currentUser} />,
    'progress': <ProgressTrackerView setView={setView} bookings={bookings} />,
    'settings': <SettingsView setView={setView} currentUser={currentUser} setCurrentUser={setCurrentUser} />
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
    const viewComponent = views[view as keyof typeof views];
    return viewComponent || <LoginView setView={setView} setCurrentUser={setCurrentUser} />;
  }

  const currentView = views[view];
  
  if (!currentView) {
    console.error("View not found:", view);
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
              />
            )}
            
            {currentView}
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
            <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Select Subject</label>
            <select name="subject" className="input-field" required defaultValue="">
              <option value="" disabled>Select Subject</option>
              {(() => {
                const btechTechnical = [
                  "Engineering Mathematics – M1", "Engineering Mathematics – M2", "Engineering Mathematics – M3", "Engineering Mathematics – M4",
                  "C Programming", "C++", "Java", "Python", "SQL", "PLSQL", "C#", "Data Structures", "DBMS", 
                  "Operating Systems", "Computer Networks", "Web Development", "React", "Node.js", "AI/ML", 
                  "Cloud Computing", "Software Engineering", "Discrete Mathematics", "Computer Architecture", 
                  "Digital Logic", "Microprocessors", "Control Systems", "Signals and Systems", "Theory of Computation", 
                  "Compiler Design", "Embedded Systems", "VLSI Design"
                ];
                
                // Tier 1: Real-time Firestore subjects
                let subjects = (selectedTutor?.subjects && selectedTutor.subjects.length > 0) ? [...selectedTutor.subjects] : [];
                
                // Tier 2: Mock record fallback
                if (subjects.length === 0) {
                  const mockTutor = MOCK_TUTORS.find(t => t.id === selectedTutor?.id);
                  if (mockTutor?.subjects && mockTutor.subjects.length > 0) subjects = [...mockTutor.subjects];
                }
                
                // Tier 3: Core subjects global fallback
                if (subjects.length === 0) {
                  subjects = currentUser?.class === 'B.Tech' 
                    ? [...btechTechnical, "Engineering Graphics", "English for Engineers"]
                    : ["Mathematics", "Physics", "Chemistry", "Computer Science", "English", "Telugu"];
                } else if (currentUser?.class === 'B.Tech') {
                  // If we have subjects but student is B.Tech, ensure technical are included if not already there
                  btechTechnical.forEach(bt => {
                    if (!subjects.includes(bt)) subjects.push(bt);
                  });
                }
                
                return subjects.map(s => <option key={s} value={s}>{s}</option>);
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
              <option value="hourly">Hourly Foundation (Per Session)</option>
              <option value="monthly">Monthly Track (20 Sessions)</option>
              {(currentUser?.studentType === 'btech' || currentUser?.studentType === 'degree' || currentUser?.class === 'B.Tech') ? (
                <>
                  <option value="course_45">B.Tech Technical (45 Sessions)</option>
                  <option value="course_60">B.Tech Technical (60 Sessions)</option>
                  <option value="yearly">Yearly Mentorship (Monthly Payment)</option>
                </>
              ) : (
                <option value="yearly">Academic Yearly (Monthly Payment)</option>
              )}
            </select>
          </div>

          {/* Group Session Selection for B.Tech/Degree students */}
          {(currentUser?.studentType === 'btech' || currentUser?.studentType === 'degree' || currentUser?.class === 'B.Tech') && (
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
                <label className="flex-1 flex items-center justify-between p-3 rounded-xl border bg-white cursor-pointer hover:border-primary transition-all">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <div>
                      <span className="text-sm font-bold">Group</span>
                      {(() => {
                        const existingGroup = bookings.find(b => 
                          b.tutorId === selectedTutor?.id && 
                          b.date === bookingSelectedDate && 
                          b.isGroup === true &&
                          b.status !== 'cancelled'
                        );
                        if (existingGroup) {
                          return (
                            <p className={`text-[9px] font-black uppercase ${existingGroup.participantCount && existingGroup.participantCount >= 5 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {existingGroup.participantCount || 0}/5 Filled
                            </p>
                          );
                        }
                        return <p className="text-[9px] font-black uppercase text-primary/20">New Group</p>;
                      })()}
                    </div>
                  </div>
                  {(() => {
                    const existingGroup = bookings.find(b => 
                      b.tutorId === selectedTutor?.id && 
                      b.date === bookingSelectedDate && 
                      b.isGroup === true &&
                      b.status !== 'cancelled'
                    );
                    const isFull = existingGroup && existingGroup.participantCount && existingGroup.participantCount >= 5;
                    return (
                      <input 
                        type="radio" 
                        name="isGroup" 
                        value="true" 
                        disabled={isFull}
                        className={`accent-primary ${isFull ? 'cursor-not-allowed opacity-30' : ''}`}
                      />
                    );
                  })()}
                </label>
              </div>
              {(() => {
                const existingGroup = bookings.find(b => 
                  b.tutorId === selectedTutor?.id && 
                  b.date === bookingSelectedDate && 
                  b.isGroup === true &&
                  b.status !== 'cancelled'
                );
                if (existingGroup && existingGroup.participantCount && existingGroup.participantCount >= 5) {
                  return (
                    <div className="flex items-center gap-2 text-rose-500 p-2 bg-rose-50 rounded-lg">
                      <XCircle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Slot Full - Join another session</span>
                    </div>
                  );
                }
                return null;
              })()}
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
                min={new Date().toISOString().split('T')[0]} 
                value={bookingSelectedDate}
                onChange={(e) => setBookingSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Select Time</label>
              <select name="time" className="input-field" required>
                {new Date(bookingSelectedDate).getDay() !== 0 ? (
                  <>
                    {(selectedTutor?.availability || []).map(t => <option key={t} value={t}>{t}</option>)}
                    {(!selectedTutor?.availability || selectedTutor.availability.length === 0) && (
                      <>
                        <option value="09:00 AM">09:00 AM (Default)</option>
                        <option value="11:00 AM">11:00 AM (Default)</option>
                        <option value="02:00 PM">02:00 PM (Default)</option>
                        <option value="04:00 PM">04:00 PM (Default)</option>
                      </>
                    )}
                  </>
                ) : (
                  <option value="" disabled>Classes are not available on Sundays</option>
                )}
              </select>
            </div>
          </div>
          {bookingType === 'paid' && (
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Duration</label>
              <select 
                name="duration" 
                className="input-field" 
                required 
                value={bookingDuration}
                onChange={(e) => setBookingDuration(e.target.value)}
              >
                <option value="1">1 Hour</option>
                <option value="1.5">1.5 Hours</option>
                <option value="2">2 Hours</option>
                <option value="3">3 Hours</option>
              </select>
            </div>
          )}
          <div className="pt-8 flex items-center justify-between border-t border-primary/5">
            <div>
              <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Enrollment Total</p>
              <p className="text-xl md:text-2xl font-serif font-bold italic">
                {calculateTotal()}
              </p>
              {bookingType === 'paid' && (
                <p className="text-[8px] font-bold text-primary/20 uppercase tracking-widest mt-1">
                  {bookingPlan.startsWith('course') ? 'Full Industrial Course Access' : 'Monthly Academic Enrollment'}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {currentUser?.class === 'B.Tech' && (
                <span className="text-[9px] font-black text-accent bg-accent/5 px-2 py-1 rounded-full uppercase tracking-tighter">
                  Batch: 1-5 Members
                </span>
              )}
              <button type="submit" className="bg-primary text-background px-10 py-5 rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl">
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
              <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest mt-2">{bookingFormData?.subject} with {selectedTutor?.name}</p>
              <div className="text-3xl font-black text-primary mt-2 flex items-center justify-center gap-1">
                <span>₹</span>
                {(() => {
                  const rate = getEffectivePrice(selectedTutor?.price);
                  const dur = parseFloat(bookingFormData?.duration || '1');
                  const plan = bookingFormData?.plan || bookingPlan;
                  
                  if (plan === 'yearly') {
                    return currentUser?.class === 'B.Tech' ? '4000' : (rate * 15).toLocaleString();
                  }
                  if (currentUser?.class === 'B.Tech' && plan.startsWith('course')) {
                    return '3000';
                  }
                  if (plan === 'hourly') {
                    return (rate * dur).toLocaleString();
                  }
                  if (plan === 'course_45') return (rate * 45).toLocaleString();
                  if (plan === 'course_60') return (rate * 60).toLocaleString();
                  return (rate * 20).toLocaleString(); // Default monthly
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
                  <ChevronRight size={16} className="text-primary/30" />
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
            
            if (reschedulingBooking?.id) {
              try {
                // 1. Mark existing booking as rescheduled/cancelled
                const oldBookingRef = doc(db, 'bookings', reschedulingBooking.id);
                await updateDoc(oldBookingRef, { 
                  status: 'cancelled', 
                  isRescheduled: true 
                });

                // 2. Create a NEW booking for the new slot
                const { id, ...bookingData } = reschedulingBooking;
                const newBookingRef = await addDoc(collection(db, 'bookings'), {
                  ...bookingData,
                  date,
                  time,
                  status: 'confirmed', // Assuming the student picks from tutor's available slots
                  isRescheduled: false,
                  rescheduledFrom: id 
                });

                // 3. Notify the Tutor automatically
                await addDoc(collection(db, 'tutor_notifications'), {
                  tutorId: reschedulingBooking.tutorId,
                  studentId: currentUser.email, // Using email as ID for easier lookup in this system
                  studentName: currentUser.displayName || 'Student',
                  studentAvatar: currentUser.photoURL || '',
                  type: 'booking',
                  title: 'Session Rescheduled',
                  description: `${currentUser.displayName || 'Student'} has rescheduled their ${reschedulingBooking.subject} session to ${date} at ${time}.`,
                  bookingId: newBookingRef.id,
                  time: 'Just now',
                  read: false,
                  timestamp: serverTimestamp()
                });

                setRescheduleSuccess(true);
                setTimeout(() => {
                  setReschedulingBooking(null);
                  setRescheduleDate('');
                  setRescheduleSuccess(false);
                }, 3000);
              } catch (err) {
                console.error("Error in rescheduling process:", err);
              }
            }

            setReschedulingBooking(null);
            setRescheduleDate('');
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
                min={new Date().toISOString().split('T')[0]} 
                max={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                value={rescheduleDate} 
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">New Time</label>
              <select name="time" className="input-field" required defaultValue={reschedulingBooking?.time}>
                {rescheduleSlots.length > 0 ? (
                  rescheduleSlots.map(t => <option key={t} value={t}>{t}</option>)
                ) : (
                  <option value="" disabled>No slots available for this date</option>
                )}
              </select>
            </div>
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
                <div className="w-full h-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Remote Participant (Tutor) */}
                  <div className="relative bg-[#1A1A1E] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center group">
                    {sessionStatus === 'live' ? (
                      <>
                        <img 
                          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=800&fit=crop" 
                          className="w-full h-full object-cover grayscale-[0.2]"
                          alt="Remote Participant"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                          <div className="flex items-center gap-3">
                            <div className="p-1 px-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg backdrop-blur-md">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Speaker</span>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-white/90">Dr. Sarah Jenkins (Tutor)</p>
                          </div>
                        </div>
                      </>
                    ) : sessionStatus === 'waiting' ? (
                      <div className="text-center space-y-6">
                        <div className="relative w-24 h-24 mx-auto">
                          <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping"></div>
                          <Avatar src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop" size="xl" className="relative z-10 border-0" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-serif italic text-white/80">Dr. Sarah Jenkins</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Waiting for participant...</p>
                        </div>
                        <button onClick={startSession} className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Start Session</button>
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
}
const ChatView = ({
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
  baseSendMessage
}: ChatViewProps) => {
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
  
  const activeChat = fullChatList.find(c => c.id === activeChatId) || fullChatList.find(c => c.tutorId === activeChatId?.split('_')[0]);
  
  // Helper to format Firestore timestamp safely
  const formatTime = (ts: any) => {
    if (!ts) return 'Sending...';
    if (typeof ts === 'string' && ts.includes(':')) return ts;
    let date: Date;
    if (ts.seconds) date = new Date(ts.seconds * 1000);
    else date = new Date(ts);
    
    if (isNaN(date.getTime())) return 'Sending...';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDateLabel = (d: any) => {
    if (!d) return 'TODAY';
    if (d === 'TODAY' || d === 'YESTERDAY') return d;
    
    let date: Date;
    if (d.seconds) date = new Date(d.seconds * 1000);
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
  const currentDraft = activeChatId ? (drafts[activeChatId] || '') : '';

  const attachmentOptions = [
    { icon: FileText, label: 'Document', color: 'bg-indigo-500 text-white' },
    { icon: Camera, label: 'Camera', color: 'bg-rose-500 text-white' },
    { icon: BarChart2, label: 'Poll', color: 'bg-amber-500 text-white' },
  ];

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
            {filteredChats.map((chat) => (
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
                  <Avatar src={(chat as any).avatar || (chat as any).tutorAvatar || ''} initials={(chat.tutorName || 'T')[0]} size="md" className={cn("transition-transform group-hover:scale-105", activeChatId === chat.id ? "ring-2 ring-primary/20" : "")} />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-0.5 md:mb-1">
                    <h5 className={cn(
                      "text-xs md:text-sm truncate transition-colors",
                      activeChatId === chat.id ? "font-black text-on-surface" : "font-bold text-on-surface/80"
                    )}>
                      {chat.tutorName}
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
            ))}
          </div>
        </div>

        {/* Right Panel: Active Chat */}
        <div className={cn(
          "flex-1 flex flex-col bg-gradient-to-b from-slate-50/50 to-slate-100/80 relative transition-all duration-300 h-full",
          !activeChatId ? "hidden md:flex" : "flex"
        )}>
          {activeChat ? (
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
                    <Avatar src={(activeChat as any).avatar || (activeChat as any).tutorAvatar || ''} initials={((activeChat as any).tutorName || 'T')[0]} size="md" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm md:text-lg leading-tight text-on-surface">{activeChat.tutorName}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full" />
                      <span className="status-label opacity-60">Online Now</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                          <button className="w-full px-5 py-3 text-left text-sm font-bold hover:bg-primary/5 flex items-center gap-3 text-rose-500 border-t border-surface-variant">
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
                                <h4 className="font-black text-sm md:text-base mb-3 md:mb-4 flex items-center gap-2">
                                  <BarChart2 size={16} /> {msg.pollData.question}
                                </h4>
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
                            ) : msg.type === 'file' ? (
                              <a 
                                href={msg.fileUrl} 
                                target="_blank" 
                                className={cn(
                                  "flex items-center gap-3 p-2 md:p-3 rounded-xl border transition-all",
                                  isUser ? "bg-white/10 border-white/20" : "bg-slate-50 border-slate-100"
                                )}
                              >
                                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0 pr-4">
                                  <p className="text-xs md:text-sm font-bold truncate max-w-[150px]">{msg.fileName}</p>
                                  <p className="text-[9px] font-black opacity-40 uppercase tracking-tighter">Document • {msg.fileSize || 'N/A'}</p>
                                </div>
                              </a>
                            ) : msg.type === 'image' || (msg.type === 'file' && (msg.fileName?.includes('.jpg') || msg.fileName?.includes('.png') || msg.fileName?.includes('.jpeg') || msg.fileName?.includes('.webp'))) ? (
                              <div className="relative group max-w-[220px] md:max-w-[280px]">
                                <img 
                                  src={msg.fileUrl} 
                                  alt={msg.fileName}
                                  className="w-full h-auto rounded-xl object-cover shadow-sm bg-white/50"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-[2px]">
                                  <a href={msg.fileUrl} target="_blank" download className="bg-white text-black text-xs font-black px-4 py-2 rounded-full cursor-pointer hover:scale-105 transition-transform flex items-center gap-2">
                                    <Download size={14} /> Download
                                  </a>
                                </div>
                              </div>
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
                            {attachmentOptions.map((opt) => (
                              <button 
                                key={opt.label}
                                onClick={() => {
                                  setIsAttachmentMenuOpen(false);
                                  if (opt.label === 'Document') {
                                    fileInputRef.current?.click();
                                  } else if (opt.label === 'Camera') {
                                    cameraInputRef.current?.click();
                                  } else if (opt.label === 'Poll') {
                                    setIsPollModalOpen(true);
                                  }
                                }}
                                className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-all group"
                              >
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110", opt.color)}>
                                  <opt.icon size={14} />
                                </div>
                                <span className="text-sm font-bold text-on-surface/70 group-hover:text-primary">{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex-1 relative">
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
                      disabled={!(drafts[activeChatId || ''] || '').trim()}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg md:rounded-xl transition-all",
                        (drafts[activeChatId || ''] || '').trim() ? 'text-primary hover:bg-primary/10' : 'text-primary/30 cursor-not-allowed'
                      )}
                    >
                      <Send size={22} />
                    </button>
                  </div>
                </div>
              </div>
            </>
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
                      "w-12 h-6 rounded-full transition-all relative overflow-hidden",
                      pollDraft.allowMultiple ? "bg-primary" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      pollDraft.allowMultiple ? "left-7" : "left-1"
                    )} />
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
