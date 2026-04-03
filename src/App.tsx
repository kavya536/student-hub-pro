import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  LayoutDashboard, 
  BookOpen, 
  Settings,
  Bell,
  Search,
  Mail,
  Lock,
  User,
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
  Plus,
  Smile,
  ChevronRight,
  TrendingUp,
  Target,
  CheckCircle2,
  Circle,
  Menu,
  X,
  Monitor
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

interface User {
  name: string;
  email: string;
  password: string;
  mobile: string;
  class: string;
  board: string;
  notifications: {
    reminders: boolean;
    messages: boolean;
    updates: boolean;
  };
}

interface ChatViewProps {
  chats: Chat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  drafts: Record<string, string>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  sendMessage: () => void;
  setView: (view: string) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  setIsMobileSidebarOpen: (open: boolean) => void;
  isChatMenuOpen: boolean;
  setIsChatMenuOpen: (open: boolean) => void;
}

interface Tutor {
  id: string;
  name: string;
  avatar: string;
  subjects: string[];
  experience: string;
  rating: number;
  price: number;
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
  subject: string;
  date: string;
  time: string;
  duration: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  edited?: boolean;
}

interface Chat {
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
    bio: 'Native Spanish speaker with a passion for literature. I focus on conversational skills and cultural immersion.',
    reviews: [],
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
    bio: 'Expert in Telugu and Hindi literature. I make language learning fun and engaging for students of all ages.',
    reviews: [],
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
    bio: 'Native English speaker with a focus on grammar, vocabulary, and creative writing. Let\'s improve your communication skills.',
    reviews: [],
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
    subject: 'Calculus II',
    date: '2024-03-30',
    time: '11:00 AM',
    duration: '1 Hour',
    status: 'confirmed'
  },
  {
    id: 'b2',
    tutorId: '2',
    tutorName: 'James Wilson',
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
    subject: 'Physics I',
    date: '2024-03-20',
    time: '10:00 AM',
    duration: '1 Hour',
    status: 'completed'
  }
];

const MOCK_CHATS: Chat[] = [
  {
    tutorId: '1',
    tutorName: 'Dr. Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    lastMessage: 'See you in our next session!',
    time: '10:30 AM',
    unreadCount: 2,
    messages: [
      { id: 'm1', senderId: '1', text: 'Hi Alex, are you ready for our session?', timestamp: '09:00 AM', date: 'YESTERDAY' },
      { id: 'm2', senderId: 'user', text: 'Yes, I have my notes ready!', timestamp: '09:05 AM', date: 'YESTERDAY' },
      { id: 'm3', senderId: '1', text: 'Great! See you in our next session!', timestamp: '10:30 AM', date: 'TODAY' },
    ]
  },
  {
    tutorId: '2',
    tutorName: 'James Wilson',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    lastMessage: 'I can help with that project.',
    time: 'Yesterday',
    unreadCount: 0,
    messages: [
      { id: 'm4', senderId: '2', text: 'I can help with that project.', timestamp: '11:00 AM', date: 'YESTERDAY' },
      { id: 'm5', senderId: 'user', text: 'ok', timestamp: '11:12 AM', date: 'TODAY' },
    ]
  }
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'Booking Confirmed', message: 'Your session with Dr. Sarah Jenkins is confirmed.', time: '2 mins ago', type: 'booking', read: false, link: 'my-bookings' },
  { id: 'n2', title: 'New Message', message: 'James Wilson sent you a message.', time: '1 hour ago', type: 'message', read: false, link: 'chat' },
  { id: 'n3', title: 'Session Reminder', message: 'Your session starts in 30 minutes.', time: '3 hours ago', type: 'update', read: true, link: 'dashboard' },
];

const BOARDS = ['CBSE', 'ICSE', 'IGCSE', 'IB', 'State Board', 'Other'];

// --- Reusable Components ---

const Badge = ({ children, variant }: { children: React.ReactNode, variant: Booking['status'] }) => {
  const classes = {
    pending: 'badge-pending',
    confirmed: 'badge-confirmed',
    cancelled: 'badge-cancelled',
    completed: 'bg-primary/10 text-primary/70'
  };
  return <span className={`pill-tag ${classes[variant]}`}>{children}</span>;
};

const Avatar = ({ src, size = 'md', mdSize, className = '', initials }: { src: string, size?: 'sm' | 'md' | 'lg' | 'xl', mdSize?: 'sm' | 'md' | 'lg' | 'xl', className?: string, initials?: string }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };
  const mdSizes = {
    sm: 'md:w-8 md:h-8',
    md: 'md:w-10 md:h-10',
    lg: 'md:w-16 md:h-16',
    xl: 'md:w-24 md:h-24'
  };
  return (
    <div className={`${sizes[size]} ${mdSize ? mdSizes[mdSize] : ''} rounded-full overflow-hidden border-2 border-background shadow-sm flex-shrink-0 ${className}`}>
      {initials ? (
        <div className="w-full h-full bg-primary/5 text-primary flex items-center justify-center font-bold">
          {initials}
        </div>
      ) : (
        <img src={src} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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

export default function App() {
  const [view, setView] = useState<View>('login');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [chats, setChats] = useState<Chat[]>(MOCK_CHATS);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed' | 'cancelled'>('idle');
  const [paymentData, setPaymentData] = useState<{paymentId?: string, orderId?: string, status?: string}>({});
  const [bookingFormData, setBookingFormData] = useState<any>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);

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

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      // Restart camera after stopping screen share
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

  const startSession = () => {
    setSessionStatus('connecting');
    setTimeout(() => {
      setSessionStatus('live');
      setSessionStartTime(new Date());
    }, 2000);
  };

  const endSession = () => {
    setSessionStatus('disconnected');
    setSessionStartTime(null);
    setSessionTimer("00:00:00");
    setTimeout(() => setView('dashboard'), 3000);
  };

  const handleSendLiveMessage = (text: string) => {
    if (!text.trim()) return;
    const newMessage = {
      id: Date.now().toString(),
      sender: 'You',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setLiveMessages([...liveMessages, newMessage]);
  };

  const openChat = (tutorId: string) => {
    if (!chats.find(c => c.tutorId === tutorId)) {
      const tutor = MOCK_TUTORS.find(t => t.id === tutorId);
      if (tutor) {
        setChats([...chats, {
          tutorId: tutor.id,
          tutorName: tutor.name,
          avatar: tutor.avatar,
          lastMessage: '',
          time: 'Just now',
          unreadCount: 0,
          messages: []
        }]);
      }
    }
    setActiveChatId(tutorId);
    setView('chat');
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTutor) return;
    
    const form = e.target as HTMLFormElement;
    const subject = (form.elements[0] as HTMLSelectElement).value;
    const date = (form.elements[1] as HTMLInputElement).value;
    const time = (form.elements[2] as HTMLSelectElement).value;
    const duration = (form.elements[3] as HTMLSelectElement).value;

    setBookingFormData({ subject, date, time, duration });
    setIsBookingModalOpen(false);
    setIsPaymentModalOpen(true);
    setPaymentStatus('idle');
    setPaymentData({});
  };

  const processPayment = (upiOption: string) => {
    if (!selectedTutor || !bookingFormData) return;
    
    setPaymentStatus('processing');
    
    // Generate UPI Intent deep link for the authentic mobile flow
    const durationStr = bookingFormData.duration ? bookingFormData.duration.toString().replace(/ Hours?/, '') : '1';
    const durationNum = parseFloat(durationStr);
    const amount = (selectedTutor.price * durationNum).toFixed(2);
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
    if (deepLink) {
      window.location.href = deepLink;
    }
    
    // Simulate Razorpay checkout process webhook callback from background
    setTimeout(() => {
      // Simulate success
      const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
      const orderId = 'order_' + Math.random().toString(36).substr(2, 9);
      
      setPaymentData({ paymentId, orderId, status: 'success' });
      setPaymentStatus('success');

      // Create or update booking after payment
      if (bookingFormData.id) {
        setBookings(bookings.map(b => b.id === bookingFormData.id ? { ...b, status: 'confirmed' } : b));
      } else {
        const newBooking: Booking = {
          id: `b${Date.now()}`,
          tutorId: selectedTutor.id,
          tutorName: selectedTutor.name,
          subject: bookingFormData.subject,
          date: bookingFormData.date,
          time: bookingFormData.time,
          duration: durationNum + (durationNum === 1 ? ' Hour' : ' Hours'),
          status: 'confirmed'
        };
        
        setBookings([newBooking, ...bookings]);
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

  const sendMessage = () => {
    const currentDraft = drafts[activeChatId || ''] || '';
    if (!currentDraft.trim() || !activeChatId) return;
    
    const newMessage: Message = {
      id: editingMessageId || `m${Date.now()}`,
      senderId: 'user',
      text: currentDraft,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      edited: !!editingMessageId
    };

    setChats(chats.map(chat => {
      if (chat.tutorId === activeChatId) {
        let newMessages;
        if (editingMessageId) {
          newMessages = chat.messages.map(m => m.id === editingMessageId ? newMessage : m);
        } else {
          newMessages = [...chat.messages, newMessage];
        }
        return {
          ...chat,
          messages: newMessages,
          lastMessage: currentDraft,
          time: 'Just now'
        };
      }
      return chat;
    }));

    setDrafts({ ...drafts, [activeChatId]: '' });
    setEditingMessageId(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
  };

const LoginView = ({ setView, setCurrentUser, users }: { 
  setView: (view: View) => void, 
  setCurrentUser: (user: User | null) => void, 
  users: User[] 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
    } else {
      // Bypassing restriction: allow login with any credentials or empty fields
      setCurrentUser({
        name: email.split('@')[0] || 'Guest Student',
        email: email || 'guest@scholar.com',
        password: password,
        mobile: '',
        class: '12',
        board: 'CBSE',
        notifications: { reminders: true, messages: true, updates: true }
      });
    }
    setView('dashboard');
  };

  const handleGoogleLogin = () => {
    setCurrentUser({
      name: 'Google User',
      email: 'google@scholar.com',
      password: '',
      mobile: '',
      class: '12',
      board: 'CBSE',
      notifications: { reminders: true, messages: true, updates: true }
    });
    setView('dashboard');
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
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                <input 
                  type="password" 
                  className="input-field pl-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}
            <button type="submit" className="w-full bg-primary text-background py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-lg">
              Login
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
            className="w-full mt-6 flex items-center justify-center gap-3 bg-white border border-primary/10 py-4 rounded-2xl font-bold hover:bg-primary/5 transition-all shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            <span className="text-sm">Sign in with Google</span>
          </button>
          
          <div className="mt-8 text-center space-y-4">
            <button onClick={() => setView('forgot-password')} className="text-xs font-bold text-accent hover:underline">Forgot Password?</button>
            <p className="text-xs text-primary/40 font-bold">
              Don't have an account? <button onClick={() => setView('register')} className="text-accent hover:underline">Register Now</button>
            </p>
          </div>
        </motion.div>
      </div>
    );
  };

const RegisterView = ({ setView, setCurrentUser, users, setUsers }: { 
  setView: (view: View) => void, 
  setCurrentUser: (user: User | null) => void, 
  users: User[], 
  setUsers: (users: User[]) => void 
}) => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', mobile: '', class: '', board: ''
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      ...formData,
      notifications: { reminders: true, messages: true, updates: true }
    };
    setUsers([...users, newUser]);
    setCurrentUser(newUser);
    setView('dashboard');
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
              <input type="text" className="input-field" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Email</label>
              <input type="email" className="input-field" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Password</label>
              <input type="password" className="input-field" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Mobile Number</label>
              <input type="tel" className="input-field" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Class</label>
              <input type="text" className="input-field" value={formData.class} onChange={(e) => setFormData({...formData, class: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Board</label>
              <select 
                className="input-field" 
                value={formData.board} 
                onChange={(e) => setFormData({...formData, board: e.target.value})}
              >
                <option value="">Select Board</option>
                {BOARDS.map(board => (
                  <option key={board} value={board}>{board}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="md:col-span-2 bg-primary text-background py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-lg mt-4">
              Register
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

const ForgotPasswordView = ({ setView }: { setView: (view: View) => void }) => {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<'email' | 'reset'>('email');
    const [newPassword, setNewPassword] = useState('');

    const handleEmailSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setStep('reset');
    };

    const handleReset = (e: React.FormEvent) => {
      e.preventDefault();
      setView('login');
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
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-primary/40">Reset Password</p>
          </div>
          
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <p className="text-sm text-primary/60 text-center">Enter your email to receive a reset link.</p>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                  <input type="email" required className="input-field pl-12" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-background py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-lg">
                Send Reset Link
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-6">
              <p className="text-sm text-primary/60 text-center">Create a new password for your account.</p>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40 ml-4">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                  <input type="password" required className="input-field pl-12" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-background py-4 rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-lg">
                Update Password
              </button>
            </form>
          )}
          
          <div className="mt-8 text-center">
            <button onClick={() => setView('login')} className="text-xs font-bold text-accent hover:underline">Back to Login</button>
          </div>
        </motion.div>
      </div>
    );
  };

  const markNotifRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // --- View Components ---

const Sidebar = ({ view, setView, isMobileSidebarOpen, setIsMobileSidebarOpen, handleLogout, currentUser, chats }: { 
  view: View, 
  setView: (view: View) => void, 
  isMobileSidebarOpen: boolean, 
  setIsMobileSidebarOpen: (open: boolean) => void, 
  handleLogout: () => void, 
  currentUser: User | null, 
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
      "planner-sidebar w-64 lg:w-72 fixed md:sticky top-0 h-screen inset-y-0 left-0 z-[70] transition-transform duration-300 ease-in-out",
      isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      view === 'chat' ? 'md:hidden' : ''
    )}>
      <div className="flex items-center justify-between mb-16">
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
          { id: 'chat', name: 'Chat', icon: MessageSquare, badge: chats.reduce((acc, c) => acc + c.unreadCount, 0) },
          { id: 'reviews', name: 'Reviews', icon: Star },
          { id: 'settings', name: 'Settings', icon: Settings },
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
  currentUser: User | null,
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
          <Avatar src="" initials={currentUser?.name?.[0] || 'S'} />
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
                <Settings size={16} /> Settings
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

const DashboardView = ({ setView, bookings, setSelectedTutor, openChat, onReschedule }: { 
  setView: (view: View) => void, 
  bookings: Booking[], 
  setSelectedTutor: (tutor: Tutor | null) => void, 
  openChat: (tutorId: string) => void, 
  onReschedule: (booking: Booking) => void 
}) => (
    <div className="space-y-10 md:space-y-12">
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {[
          { label: 'Upcoming Sessions', value: bookings.filter(b => b.status === 'confirmed').length, color: 'text-on-surface', span: 'col-span-1' },
          { label: 'Completed Sessions', value: bookings.filter(b => b.status === 'completed').length, color: 'text-on-surface', span: 'col-span-1' },
          { label: 'Total Tutors Booked', value: new Set(bookings.map(b => b.tutorId)).size, color: 'text-on-surface', span: 'col-span-2 sm:col-span-1' }
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.6)' }}
            className={`p-4 sm:p-6 lg:p-8 bg-white/40 backdrop-blur-md rounded-3xl border border-primary/5 shadow-sm transition-all cursor-default ${stat.span}`}
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
          {bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length > 0 ? (
            bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').map((booking, i) => (
                <motion.div 
                  key={booking.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="course-card flex-col md:flex-row gap-4 md:gap-8 p-4 md:p-8"
                >
                <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
                  <Avatar src={MOCK_TUTORS.find(t => t.id === booking.tutorId)?.avatar || ''} size="md" mdSize="lg" />
                  <div 
                    className="cursor-pointer flex-1"
                    onClick={() => {
                      setSelectedTutor(MOCK_TUTORS.find(t => t.id === booking.tutorId) || null);
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
                    <p className="text-[9px] md:text-[10px] font-bold text-on-surface/60 uppercase tracking-widest">{booking.duration}</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                       onClick={() => openChat(booking.tutorId)}
                       className="w-10 h-10 rounded-full border border-primary/10 flex items-center justify-center hover:bg-primary hover:text-background transition-all"
                       title="Message"
                     >
                       <MessageSquare size={18} />
                     </button>
                     {booking.status === 'confirmed' && (
                        <button 
                          onClick={() => setView('live-class')}
                          className="px-6 py-2 bg-primary text-background rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                        >
                          Join Class
                        </button>
                     )}
                     <button 
                       onClick={() => onReschedule(booking)}
                       className="w-10 h-10 rounded-full border border-primary/10 flex items-center justify-center hover:bg-primary hover:text-background transition-all"
                       title="Reschedule Session"
                     >
                       <Calendar size={18} />
                     </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-white/20 rounded-[3rem] border border-dashed border-primary/10">
              <p className="text-on-surface/30 font-bold uppercase tracking-widest text-xs">No sessions booked yet</p>
              <button onClick={() => setView('find-tutors')} className="text-accent font-bold text-sm mt-4 hover:underline">Find a tutor</button>
            </div>
          )}
        </motion.div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-serif font-bold italic">Learning Progress</h3>
          <button onClick={() => setView('progress')} className="px-3 py-1 bg-accent/10 text-accent text-[9px] font-extrabold uppercase tracking-widest rounded-lg hover:bg-accent hover:text-white transition-all shadow-sm">View Tracker</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {MOCK_GOALS.slice(0, 2).map((goal, i) => (
            <motion.div 
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + (i * 0.1) }}
              className="p-8 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-primary/5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold">{goal.title}</span>
                <span className="text-xs font-bold text-on-surface/40">{goal.progress}%</span>
              </div>
              <div className="h-2 bg-primary/5 rounded-full overflow-hidden">
                <div className={`h-full ${goal.color}`} style={{ width: `${goal.progress}%` }} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );

const FindTutorsView = ({ setView, setSelectedTutor }: { 
  setView: (view: View) => void, 
  setSelectedTutor: (tutor: Tutor | null) => void 
}) => {
    const [search, setSearch] = useState('');
    const [subject, setSubject] = useState('All');
    const [maxPrice, setMaxPrice] = useState(100);
    const [minRating, setMinRating] = useState(0);
    
    const filteredTutors = MOCK_TUTORS.filter(t => 
      (search === '' || t.name.toLowerCase().includes(search.toLowerCase())) &&
      (subject === 'All' || t.subjects.includes(subject)) &&
      (t.price <= maxPrice) &&
      (t.rating >= minRating)
    );

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
          <option value="Mathematics">Mathematics</option>
          <option value="Physics">Physics</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Spanish">Spanish</option>
          <option value="Telugu">Telugu</option>
          <option value="Hindi">Hindi</option>
          <option value="English">English</option>
          <option value="EAMCET">EAMCET</option>
          <option value="JEE">JEE</option>
          <option value="Chemistry">Chemistry</option>
          <option value="Biology">Biology</option>
        </select>
        <div className="flex gap-4">
          <select 
            className="input-field flex-1"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          >
            <option value="100">Max Price</option>
            <option value="30">$30</option>
            <option value="40">$40</option>
            <option value="50">$50</option>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {filteredTutors.length > 0 ? filteredTutors.map(tutor => (
            <motion.div 
              layout
              key={tutor.id} 
              className="bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] border border-primary/5 hover:bg-white/60 transition-all cursor-pointer overflow-hidden flex flex-col p-6 md:p-8 gap-4 md:gap-6 group shadow-sm hover:shadow-xl"
              onClick={() => {
                setSelectedTutor(tutor);
                setView('tutor-profile');
              }}
            >
              <div className="flex items-center gap-4 md:gap-6 min-w-0">
                <Avatar src={tutor.avatar} size="md" mdSize="lg" className="shrink-0 ring-4 ring-primary/5 group-hover:ring-primary/10 transition-all" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xl md:text-2xl font-serif font-bold italic text-on-surface leading-tight truncate">{tutor.name}</h4>
                  <div className="flex flex-wrap gap-1.5 mt-2 md:mt-3">
                    {tutor.subjects.map(s => (
                      <span key={s} className="pill-tag whitespace-nowrap bg-primary/5 text-primary/60 border-none px-2 md:px-3 py-0.5 md:py-1 text-[8px] md:text-[9px] uppercase tracking-widest font-bold">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-primary/5">
                <div className="space-y-0.5">
                  <p className="text-xl md:text-2xl font-serif font-bold italic text-primary">${tutor.price}</p>
                  <p className="text-[8px] md:text-[9px] font-bold text-primary/30 uppercase tracking-widest">Per Hour</p>
                </div>
                <div className="flex items-center gap-2 text-accent font-bold bg-accent/5 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-accent/10">
                  <Star size={12} mdSize={14} fill="currentColor" />
                  <span className="text-base md:text-lg">{tutor.rating}</span>
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
                    <span className="hidden sm:inline text-primary/10">|</span>
                    <span className="text-primary/40 text-[10px] md:text-xs font-bold uppercase tracking-widest">{selectedTutor.experience} Experience</span>
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
                    <p className="text-xs md:text-sm font-bold">{selectedTutor.availability[0]} Today</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest">About the Tutor</p>
                  <p className="text-primary/70 leading-relaxed text-base md:text-lg font-medium">{selectedTutor.bio}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-serif font-bold italic mb-6 md:mb-8">Reviews</h3>
              <div className="space-y-6 md:space-y-8">
                {selectedTutor.reviews.length > 0 ? selectedTutor.reviews.map(review => (
                  <div key={review.id} className="p-6 md:p-8 bg-white/40 backdrop-blur-md rounded-[1.5rem] md:rounded-[2rem] border border-primary/5">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar src="" size="sm" initials={review.studentName[0]} />
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
                  <p className="text-primary/30 font-bold uppercase tracking-widest text-[10px] md:text-xs text-center py-8">No reviews yet</p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6 md:space-y-8">
            <section className="p-8 md:p-10 bg-primary text-background rounded-[2rem] md:rounded-[3rem] shadow-2xl">
              <p className="text-background/50 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2">Investment</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-5xl font-serif font-bold italic">${selectedTutor.price}</span>
                <span className="text-background/50 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">/ hour</span>
              </div>
              <button 
                onClick={() => setIsBookingModalOpen(true)}
                className="w-full mt-6 md:mt-8 bg-background text-primary py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl text-sm md:text-base"
              >
                Book Session
              </button>
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

const MyBookingsView = ({ bookings, setBookings, openChat, onReschedule, setView, setSelectedTutor }: { 
  bookings: Booking[], 
  setBookings: (bookings: Booking[]) => void,
  openChat: (tutorId: string) => void, 
  onReschedule: (booking: Booking) => void,
  setView: (view: View) => void,
  setSelectedTutor: (tutor: Tutor | null) => void
}) => {
    const [tab, setTab] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
    
    const filteredBookings = bookings.filter(b => tab === 'all' || b.status === tab);

    return (
      <div className="space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 md:gap-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex bg-primary/5 p-1 rounded-xl md:p-1.5 md:rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar"
          >
            {['all', 'pending', 'completed', 'cancelled'].map(t => (
              <button 
                key={t}
                onClick={() => setTab(t as any)}
                className={`flex-1 sm:flex-none px-4 md:px-8 py-2 md:py-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-primary text-background shadow-xl' : 'text-primary/40 hover:bg-primary/5'}`}
              >
                {t}
              </button>
            ))}
          </motion.div>
        </div>

        <div className="space-y-4 md:space-y-6">
          {filteredBookings.length > 0 ? filteredBookings.map((booking, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={booking.id} 
              className="course-card flex-col md:flex-row gap-6 md:gap-8 p-6 md:p-8"
            >
              <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
                <Avatar src={MOCK_TUTORS.find(t => t.id === booking.tutorId)?.avatar || ''} size="md" mdSize="lg" />
                <div 
                  className="cursor-pointer flex-1"
                  onClick={() => {
                    setSelectedTutor(MOCK_TUTORS.find(t => t.id === booking.tutorId) || null);
                    setView('tutor-profile');
                  }}
                >
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-1 md:mb-2">
                    <h4 className="font-bold text-lg md:text-xl">{booking.tutorName}</h4>
                    <Badge variant={booking.status}>{booking.status}</Badge>
                  </div>
                  <p className="text-[9px] md:text-[10px] font-bold text-primary/40 uppercase tracking-widest">{booking.subject}</p>
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-primary/5">
                <div className="flex items-center gap-2 text-xs md:text-sm font-bold">
                  <Calendar size={14} className="text-accent" /> {booking.date}
                </div>
                <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest">
                  <Clock size={14} /> {booking.time} • {booking.duration}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-primary/5">
                {booking.status === 'pending' && (
                  <button 
                    onClick={() => {
                      setBookings(bookings.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
                    }}
                    className="px-4 py-2 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                  >
                    Cancel
                  </button>
                )}
                {(booking.status === 'confirmed' || booking.status === 'completed') && (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => openChat(booking.tutorId)}
                      className="w-10 h-10 rounded-full border border-primary/10 flex items-center justify-center hover:bg-primary hover:text-background transition-all"
                      title="Message"
                    >
                      <MessageSquare size={18} />
                    </button>
                    {booking.status === 'confirmed' && (
                      <button 
                        onClick={() => setView('live-class')}
                        className="px-6 py-2 bg-primary text-background rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                      >
                        Join Class
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-20 bg-white/20 rounded-[3rem] border border-dashed border-primary/10">
              <p className="text-primary/30 font-bold uppercase tracking-widest text-xs">No sessions found</p>
            </div>
          )}
        </div>
      </div>
    );
  };

const ProgressTrackerView = ({ setView }: { setView: (view: View) => void }) => {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-12"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 p-6 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-primary/5 shadow-sm"
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
              {MOCK_GOALS.map((goal, i) => (
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
                <span className="text-5xl md:text-7xl font-serif font-black tracking-tighter">3.8</span>
                <span className="text-lg md:text-xl font-bold mb-2 md:mb-3 opacity-40">/ 4.0</span>
              </div>
              <p className="text-xs md:text-sm text-background/60 leading-relaxed">
                You're in the top 5% of your class. Keep up the great work in Mathematics and Computer Science!
              </p>
              <div className="pt-4 md:pt-6 border-t border-background/10">
                <div className="flex items-center justify-between text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-40">
                  <span>Credits Earned</span>
                  <span>18 / 24</span>
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
            className="p-6 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-primary/5 shadow-sm"
          >
            <h3 className="text-xl md:text-2xl font-serif font-bold italic mb-6 md:mb-8">Grade Distribution</h3>
            <div className="h-48 md:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_GRADES}>
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
                    {MOCK_GRADES.map((entry, index) => (
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
            className="p-10 bg-white/40 backdrop-blur-md rounded-[3rem] border border-primary/5 shadow-sm"
          >
            <h3 className="text-2xl font-serif font-bold italic mb-8">Recent Assignments</h3>
            <div className="space-y-4">
              {[
                { title: 'Calculus Problem Set 4', status: 'Completed', score: '95/100', date: 'Yesterday' },
                { title: 'Physics Lab Report', status: 'Graded', score: '88/100', date: '2 days ago' },
                { title: 'Intro to Algorithms Quiz', status: 'Completed', score: '18/20', date: 'Last Week' },
                { title: 'Spanish Essay', status: 'Pending', score: '-', date: 'Due Tomorrow' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-6 bg-white/40 rounded-2xl border border-primary/5 hover:bg-white/60 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'Pending' ? 'bg-accent/10 text-accent' : 'bg-primary/5 text-primary'}`}>
                      {item.status === 'Pending' ? <Circle size={18} /> : <CheckCircle2 size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{item.title}</p>
                      <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest mt-0.5">{item.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{item.score}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${item.status === 'Pending' ? 'text-accent' : 'text-primary/40'}`}>{item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  };

const ReviewsView = ({ bookings }: { bookings: Booking[] }) => {
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const [reviewForm, setReviewForm] = useState<{bookingId: string | null, rating: number, comment: string}>({
      bookingId: null,
      rating: 0,
      comment: ''
    });

    // Calculate overall review
    const allReviews = MOCK_TUTORS.flatMap(t => t.reviews);
    const avgRating = (allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length).toFixed(1);
    
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto space-y-12"
      >
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 md:p-10 bg-primary text-background rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 md:gap-12 text-center sm:text-left"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8">
            {/* Added Tutor Avatar Visual for satisfaction context */}
            <Avatar src={MOCK_TUTORS[0].avatar} size="lg" mdSize="xl" className="border-4 border-white/20 shadow-2xl" />
            
            <div>
              <p className="text-white/50 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-1 md:mb-2">Overall Student Satisfaction</p>
              <h2 className="text-3xl md:text-5xl font-serif font-bold italic text-white">{avgRating} / 5.0</h2>
              <p className="text-white/40 text-[10px] md:text-xs mt-1 md:mt-2 font-medium">Based on {allReviews.length} student reviews</p>
            </div>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-2">
            <div className="flex gap-1 text-yellow-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill={i < Math.round(Number(avgRating)) ? '#EAB308' : 'none'} />
              ))}
            </div>
            <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-background/30">Next review prompt in 2 weeks</p>
          </div>
        </motion.section>

        <section>
          <h3 className="text-xl md:text-2xl font-serif font-bold italic mb-6 md:mb-8">Pending Reviews</h3>
          <div className="space-y-4">
            {completedBookings.length > 0 ? completedBookings.map((booking, i) => (
              <motion.div 
                key={booking.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="course-card flex-col items-stretch gap-6 p-6 md:p-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 md:gap-8">
                  <div className="flex items-center gap-4 md:gap-8">
                    <Avatar src={MOCK_TUTORS.find(t => t.id === booking.tutorId)?.avatar || ''} size="md" mdSize="lg" />
                    <div>
                      <h4 className="font-bold text-lg md:text-xl">{booking.tutorName}</h4>
                      <p className="text-[9px] md:text-[10px] font-bold text-primary/40 uppercase tracking-widest">{booking.subject} • {booking.date}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setReviewForm({ ...reviewForm, bookingId: booking.id })}
                    className="w-full sm:w-auto px-6 py-2 bg-accent/10 text-accent rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                  >
                    {reviewForm.bookingId === booking.id ? 'Close' : 'Write Review'}
                  </button>
                </div>

                {reviewForm.bookingId === booking.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6 pt-6 border-t border-primary/5"
                  >
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Rating:</p>
                      <div className="flex items-center gap-1 text-yellow-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            size={20} 
                            className="cursor-pointer" 
                            fill={star <= reviewForm.rating ? '#EAB308' : 'none'}
                            onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                          />
                        ))}
                      </div>
                    </div>
                    <textarea 
                      placeholder="Share your experience (optional)..."
                      className="input-field min-h-[100px] py-4"
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    />
                    <button 
                      disabled={reviewForm.rating === 0}
                      onClick={() => {
                        // In a real app, this would save to DB
                        setBookings(bookings.map(b => b.id === booking.id ? { ...b, status: 'cancelled' } : b)); // Mocking "removing" from pending
                        setReviewForm({ bookingId: null, rating: 0, comment: '' });
                      }}
                      className={`w-full py-4 rounded-xl font-bold transition-transform shadow-lg ${reviewForm.rating === 0 ? 'bg-primary/20 text-primary/40 cursor-not-allowed' : 'bg-primary text-background hover:scale-[1.02]'}`}
                    >
                      Submit Review
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )) : (
              <div className="text-center py-20 bg-white/20 rounded-[3rem] border border-dashed border-primary/10">
                <p className="text-primary/30 font-bold uppercase tracking-widest text-xs">No pending reviews</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-serif font-bold italic mb-8">Past Reviews</h3>
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="p-10 bg-white/40 backdrop-blur-md rounded-[3rem] border border-primary/5"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar src="" size="sm" initials="SJ" />
                  <h5 className="font-bold text-on-surface">Dr. Sarah Jenkins</h5>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">March 15, 2024</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-500 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#EAB308" />)}
              </div>
              <p className="text-black italic font-medium leading-relaxed">"Dr. Sarah is incredible. She explained complex calculus problems in a way that finally clicked for me. Highly recommend!"</p>
            </motion.div>
          </div>
        </section>
      </motion.div>
    );
  };

const SettingsView = ({ setView }: { setView: (view: View) => void }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-12"
    >
      <section className="p-6 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-primary/5 space-y-8 md:space-y-10">
        <h3 className="text-xl md:text-2xl font-serif font-bold italic">Profile Settings</h3>
        <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8 pb-8 md:pb-10 border-b border-primary/5">
          <Avatar src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" size="lg" mdSize="xl" className="w-24 h-24 md:w-32 md:h-32" />
          <button className="text-[10px] font-bold uppercase tracking-widest text-accent hover:underline">Change Photo</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Full Name</label>
            <input type="text" defaultValue={currentUser?.name} className="input-field text-sm md:text-base text-black" />
          </div>
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Mobile</label>
            <input type="tel" defaultValue={currentUser?.mobile} className="input-field text-sm md:text-base text-black" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Class</label>
            <input type="text" defaultValue={currentUser?.class} className="input-field text-sm md:text-base text-black" />
          </div>
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Board</label>
            <select className="input-field text-sm md:text-base text-black" defaultValue={currentUser?.board}>
              <option value="">Select Board</option>
              {BOARDS.map(board => (
                <option key={board} value={board}>{board}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Email Address</label>
          <input type="email" defaultValue={currentUser?.email} className="input-field text-sm md:text-base text-black" />
        </div>
        <button className="w-full bg-primary text-background py-4 md:py-5 rounded-xl md:rounded-2xl font-bold hover:scale-[1.02] transition-transform shadow-xl text-sm md:text-base">Save Changes</button>
      </section>

      <section className="p-6 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-primary/5 space-y-6 md:space-y-8">
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
                onClick={() => {
                  if (currentUser) {
                    const newNotifs = { ...currentUser.notifications, [pref.id]: !currentUser.notifications[pref.id as keyof typeof currentUser.notifications] };
                    setCurrentUser({ ...currentUser, notifications: newNotifs });
                  }
                }}
                className={`w-10 h-5 md:w-12 md:h-6 rounded-full transition-colors relative shrink-0 ${currentUser?.notifications[pref.id as keyof typeof currentUser.notifications] ? 'bg-primary' : 'bg-primary/10'}`}
              >
                <motion.div 
                  animate={{ x: currentUser?.notifications[pref.id as keyof typeof currentUser.notifications] ? 'calc(100% - 1.25rem)' : '0.25rem' }}
                  className="absolute top-0.5 md:top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="p-6 md:p-10 bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[3rem] border border-primary/5 space-y-6 md:space-y-8">
        <h3 className="text-xl md:text-2xl font-serif font-bold italic">Security</h3>
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Current Password</label>
            <input type="password" placeholder="••••••••" className="input-field text-sm md:text-base" />
          </div>
          <div className="space-y-3">
            <label className="text-[9px] md:text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">New Password</label>
            <input type="password" placeholder="••••••••" className="input-field text-sm md:text-base" />
          </div>
        </div>
        <button className="w-full py-4 md:py-5 rounded-xl md:rounded-2xl border border-primary/10 text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-background transition-all">Update Password</button>
      </section>
    </motion.div>
  );

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
        users={users} 
      />
    ),
    'register': (
      <RegisterView 
        setView={setView} 
        setCurrentUser={setCurrentUser} 
        users={users} 
        setUsers={setUsers} 
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
      />
    ),
    'find-tutors': (
      <FindTutorsView 
        setView={setView} 
        setSelectedTutor={setSelectedTutor} 
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
        setView={setView}
        editingMessageId={editingMessageId}
        setEditingMessageId={setEditingMessageId}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        isChatMenuOpen={isChatMenuOpen}
        setIsChatMenuOpen={setIsChatMenuOpen}
      />
    ),
    'reviews': <ReviewsView bookings={bookings} />,
    'progress': <ProgressTrackerView setView={setView} />,
    'settings': <SettingsView setView={setView} />
  };

  if (['login', 'register', 'forgot-password'].includes(view)) {
    return views[view as keyof typeof views] || <LoginView setView={setView} setCurrentUser={setCurrentUser} users={users} />;
  }

  return (
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
      <div className="flex-1 flex flex-col min-w-0">
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
          
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={view === 'chat' ? 'h-screen' : ''}
            >
              {views[view as keyof typeof views]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Modal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)}
        title={`Book Session with ${selectedTutor?.name}`}
      >
        <form onSubmit={handleBooking} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Select Subject</label>
            <select className="input-field" required>
              {selectedTutor?.subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Select Date</label>
              <input type="date" className="input-field" required min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Select Time</label>
              <select className="input-field" required>
                {selectedTutor?.availability.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">Duration</label>
            <select className="input-field" required>
              <option value="1">1 Hour</option>
              <option value="1.5">1.5 Hours</option>
              <option value="2">2 Hours</option>
            </select>
          </div>
          <div className="pt-8 flex items-center justify-between border-t border-primary/5">
            <div>
              <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Total Price</p>
              <p className="text-3xl font-serif font-bold italic">${selectedTutor?.price}</p>
            </div>
            <button type="submit" className="bg-primary text-background px-10 py-5 rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl">Continue to Payment</button>
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
                {selectedTutor?.price && bookingFormData?.duration ? selectedTutor.price * parseFloat(bookingFormData.duration) : 0}
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
        onClose={() => setReschedulingBooking(null)}
        title={`Reschedule Session with ${reschedulingBooking?.tutorName}`}
      >
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const date = (form.elements.namedItem('date') as HTMLInputElement).value;
            const time = (form.elements.namedItem('time') as HTMLSelectElement).value;
            setBookings(bookings.map(b => b.id === reschedulingBooking?.id ? { ...b, date, time } : b));
            setReschedulingBooking(null);
          }} 
          className="space-y-8"
        >
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">New Date</label>
              <input name="date" type="date" className="input-field" required min={new Date().toISOString().split('T')[0]} defaultValue={reschedulingBooking?.date} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest ml-1">New Time</label>
              <select name="time" className="input-field" required defaultValue={reschedulingBooking?.time}>
                {MOCK_TUTORS.find(t => t.id === reschedulingBooking?.tutorId)?.availability.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
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
              <div className={`flex-1 p-6 flex flex-col items-center justify-center gap-6 transition-all duration-500 ${isLiveChatOpen ? 'md:pr-[400px]' : ''}`}>
                
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
                <div Name="class-controls" className="flex items-center gap-2 md:gap-4 bg-[#121214]/60 backdrop-blur-2xl p-2.5 px-4 md:px-6 rounded-[2.5rem] border border-white/10 shadow-2xl z-20">
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
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    className="fixed right-0 top-0 bottom-0 md:relative w-full max-w-[400px] bg-[#121214] border-l border-white/5 flex flex-col shadow-2xl z-[210]"
                  >
                    <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <MessageSquare className="text-primary" size={18} />
                        </div>
                        <h3 className="font-bold text-sm tracking-tight">Session Chat</h3>
                      </div>
                      <button onClick={() => setIsLiveChatOpen(false)} className="text-white/20 hover:text-white transition-colors">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                      <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Messages are private & secure</p>
                      </div>
                      
                      <div className="space-y-4">
                        {liveMessages.length === 0 && (
                          <div className="text-center py-20">
                            <Smile size={32} className="text-white/5 mx-auto mb-4" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">No messages yet</p>
                          </div>
                        )}
                        {liveMessages.map(msg => (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={msg.id} 
                            className="flex flex-col items-end gap-1"
                          >
                            <div className="bg-primary px-4 py-2.5 rounded-2xl rounded-tr-none text-sm font-semibold max-w-[85%] text-white">
                              {msg.text}
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
    </div>
  );
}

const ChatView = ({ 
  chats, 
  activeChatId, 
  setActiveChatId, 
  setChats, 
  drafts, 
  setDrafts, 
  sendMessage, 
  setView, 
  editingMessageId, 
  setEditingMessageId,
  setIsMobileSidebarOpen,
  isChatMenuOpen,
  setIsChatMenuOpen
}: ChatViewProps) => {
  const [chatSearch, setChatSearch] = useState('');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const filteredChats = chats.filter(c => {
    const searchLower = chatSearch.toLowerCase();
    const tutor = MOCK_TUTORS.find(t => t.id === c.tutorId);
    const subjects = tutor?.subjects || [];
    
    return (
      c.tutorName.toLowerCase().includes(searchLower) ||
      subjects.some(s => s.toLowerCase().includes(searchLower)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(searchLower))
    );
  });
  
  const activeChat = chats.find(c => c.tutorId === activeChatId);
  const currentDraft = activeChatId ? (drafts[activeChatId] || '') : '';
  const chatEndRef = useRef<HTMLDivElement>(null);

  const attachmentOptions = [
    { icon: FileText, label: 'Document', color: 'bg-indigo-500' },
    { icon: ImageIcon, label: 'Photos & videos', color: 'bg-blue-500' },
    { icon: Camera, label: 'Camera', color: 'bg-rose-500' },
    { icon: Mic, label: 'Audio', color: 'bg-orange-500' },
    { icon: UserCircle, label: 'Contact', color: 'bg-blue-600' },
    { icon: BarChart2, label: 'Poll', color: 'bg-amber-500' },
  ];

  useEffect(() => {
    // Removed auto-selection of first chat
  }, [activeChatId, chats, setActiveChatId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatId, chats]);

  return (
    <div className="h-full flex flex-col md:p-6 p-2 antialiased">
      <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0 mt-4 md:mt-0">
        <h2 className="text-2xl font-black text-on-surface tracking-tight ml-2 md:ml-0">Messages</h2>
        <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black text-primary uppercase tracking-widest hidden md:inline">Live Support</span>
          <span className="text-[10px] font-black text-primary uppercase tracking-widest md:hidden">Live</span>
        </div>
      </div>

      <div className="flex bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex-1 border border-slate-100 relative">
        {/* Left Panel: Contacts List */}
        <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] lg:w-[400px] border-r border-slate-100 flex-col bg-white shrink-0`}>
          <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-black text-sm uppercase tracking-widest text-on-surface">Tutors</h4>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-md">{filteredChats.length}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-1 md:space-y-2 custom-scrollbar">
            {filteredChats.length > 0 ? (
              filteredChats.map(chat => {
                const initials = chat.tutorName.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase();
                return (
                  <button 
                    key={chat.tutorId}
                    onClick={() => {
                      if (activeChatId !== chat.tutorId) {
                        setActiveChatId(chat.tutorId);
                      }
                    }}
                    className={`w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl transition-all text-left group relative ${activeChatId === chat.tutorId ? 'bg-primary/10 shadow-sm' : 'hover:bg-slate-50'}`}
                  >
                    {activeChatId === chat.tutorId && (
                      <motion.div layoutId="active-chat-indicator" className="absolute left-0 top-3 bottom-3 md:top-4 md:bottom-4 w-1 bg-primary rounded-r-full" />
                    )}
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full font-black flex items-center justify-center text-xs md:text-sm transition-transform group-hover:scale-105 ${activeChatId === chat.tutorId ? "bg-primary/20 text-primary" : "bg-slate-200 text-slate-500"}`}>
                        {initials}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 md:mb-1">
                        <p className="font-black text-xs md:text-sm truncate text-on-surface">
                          {chat.tutorName}
                        </p>
                        <span className="text-[8px] md:text-[9px] font-bold text-on-surface-variant opacity-60">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-[10px] md:text-xs truncate ${chat.unreadCount > 0 ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant opacity-70'}`}>
                          {chat.lastMessage}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="bg-primary text-white text-[8px] md:text-[9px] font-black min-w-[16px] md:min-w-[18px] h-[16px] md:h-[18px] flex items-center justify-center rounded-full shadow-sm">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="p-10 text-center">
                <p className="text-xs font-bold text-primary/20 uppercase tracking-widest">No conversations yet</p>
              </div>
            )}
          </div>
        </div>

      {/* Right Panel: Active Chat */}
      <div className={`${activeChatId ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-background/20 relative h-full`}>
        {activeChat ? (
          <>
      {/* Chat Header */}
      <div className="p-4 md:p-6 bg-white/60 backdrop-blur-md border-b border-primary/5 flex items-center justify-between px-6 md:px-10 z-10">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-2 hover:bg-primary/5 rounded-xl text-primary/40 hover:text-primary transition-all"
          >
            <Menu size={20} />
          </button>
          <button 
            onClick={() => setActiveChatId(null)}
            className="hidden md:flex p-2 hover:bg-primary/5 rounded-xl text-primary/40 hover:text-primary transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <button 
            onClick={() => setActiveChatId(null)}
            className="md:hidden p-2 hover:bg-primary/5 rounded-xl text-primary/40 hover:text-primary transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="relative">
            <Avatar src={activeChat.avatar} size="md" mdSize="lg" />
            <div className="absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
          </div>
          <div>
            <h4 className="font-black text-sm md:text-lg leading-tight text-on-surface">{activeChat.tutorName}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[8px] md:text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Online Now</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-3 hover:bg-primary/5 rounded-2xl transition-all text-primary/60 hover:text-primary">
            <Search size={20} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
              className="p-3 hover:bg-primary/5 rounded-2xl transition-all text-primary/60 hover:text-primary"
            >
              <MoreVertical size={20} />
            </button>
            <AnimatePresence>
              {isChatMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-primary/5 overflow-hidden z-50"
                >
                  <button className="w-full px-6 py-4 text-left text-sm font-bold hover:bg-primary/5 flex items-center gap-3">
                    <UserCircle size={16} /> View Profile
                  </button>
                  <button className="w-full px-6 py-4 text-left text-sm font-bold hover:bg-primary/5 flex items-center gap-3">
                    <FileText size={16} /> Shared Files
                  </button>
                  <button className="w-full px-6 py-4 text-left text-sm font-bold hover:bg-primary/5 flex items-center gap-3 text-rose-500 border-t border-primary/5">
                    <LogOut size={16} /> Clear Chat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-6 custom-scrollbar bg-gradient-to-b from-slate-50/50 to-slate-100/80 relative">
              {/* Subtle Modern Dot Pattern */}
              <div className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]"></div>
              
              {activeChat.messages.map((msg, idx) => {
                const isUser = msg.senderId === 'user';
                const showDateSeparator = idx === 0 || msg.date !== activeChat.messages[idx-1].date;
                const displayDate = msg.date || (idx < activeChat.messages.length - 1 ? 'YESTERDAY' : 'TODAY');

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-4 md:my-6 relative z-10 w-full">
                        <span className="bg-slate-200/60 text-slate-600 text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-widest backdrop-blur-sm">
                          {displayDate}
                        </span>
                      </div>
                    )}
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex w-full group relative ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                    {isUser && (
                      <button 
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setDrafts(prev => ({ ...prev, [activeChatId!]: msg.text }));
                        }}
                        className="bg-white/90 p-2 rounded-full shadow-sm mr-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white self-center border border-primary/10 z-20"
                        title="Edit message"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    <div className={`
                      max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl md:rounded-[1.5rem] shadow-sm relative transition-all z-10
                      ${isUser 
                        ? 'bg-primary text-white rounded-tr-md shadow-primary/20' 
                        : 'bg-white text-on-surface rounded-tl-md border border-slate-100'}
                    `}>
                      {!isUser && (
                        <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-1.5 opacity-100">
                          {activeChat.tutorName}
                        </p>
                      )}
                      <p className="text-base md:text-lg font-bold leading-snug mb-1">{msg.text}</p>
                      <div className={`flex items-center gap-1.5 mt-2 justify-end ${isUser ? 'text-white/90' : 'text-on-surface-variant/90'}`}>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                          {msg.timestamp} {msg.edited && <span className="ml-1 opacity-60">(edited)</span>}
                        </span>
                        {isUser && <Check size={14} className="text-white/90" />}
                      </div>
                    </div>
                  </motion.div>
                 </React.Fragment>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-8 bg-white/60 backdrop-blur-md border-t border-primary/5 relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Mock sending a file message
                    setChats(prev => prev.map(chat => {
                      if (chat.tutorId === activeChatId) {
                        return {
                          ...chat,
                          messages: [...chat.messages, {
                            id: `m${Date.now()}`,
                            senderId: 'user',
                            text: `📎 Sent a file: ${file.name}`,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }]
                        };
                      }
                      return chat;
                    }));
                  }
                }}
              />
              <AnimatePresence>
                {isAttachmentMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="absolute bottom-full left-8 mb-4 w-64 bg-white rounded-[2rem] shadow-2xl border border-primary/5 p-4 z-50 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 gap-1">
                      {attachmentOptions.map((opt) => (
                        <button 
                          key={opt.label}
                          onClick={() => {
                            setIsAttachmentMenuOpen(false);
                            if (opt.label === 'Document' || opt.label === 'Photos & videos') {
                              fileInputRef.current?.click();
                            }
                          }}
                          className="flex items-center gap-4 p-3 hover:bg-primary/5 rounded-2xl transition-all group"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg ${opt.color} group-hover:scale-110 transition-transform`}>
                            <opt.icon size={18} />
                          </div>
                          <span className="text-sm font-bold text-primary/70 group-hover:text-primary">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-4 bg-white rounded-3xl p-2 pl-6 shadow-xl border border-primary/5">
                {editingMessageId && (
                  <button 
                    onClick={() => {
                      setEditingMessageId(null);
                      setDrafts(prev => ({ ...prev, [activeChatId!]: '' }));
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                    title="Cancel edit"
                  >
                    <XCircle size={18} />
                  </button>
                )}
                <input 
                  type="text" 
                  placeholder={editingMessageId ? "Edit your message..." : "Write a message..."}
                  className={`flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium py-3 ${editingMessageId ? 'text-accent' : ''}`}
                  value={currentDraft}
                  onChange={(e) => setDrafts(prev => ({ ...prev, [activeChatId!]: e.target.value }))}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                    className={`p-3 transition-all rounded-xl ${isAttachmentMenuOpen ? 'bg-primary text-background' : 'text-primary/40 hover:text-primary hover:bg-primary/5'}`}
                  >
                    <Paperclip size={20} />
                  </button>
                  <button 
                    onClick={sendMessage}
                    disabled={!currentDraft.trim()}
                    className={`
                      w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg
                      ${currentDraft.trim() 
                        ? (editingMessageId ? 'bg-accent text-white' : 'bg-primary text-background') + ' hover:scale-105 active:scale-95 shadow-primary/20' 
                        : 'bg-primary/10 text-primary/40 cursor-not-allowed'}
                    `}
                  >
                    {editingMessageId ? <Check size={20} /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[#f0f2f5]">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <User size={40} className="text-primary/40" />
            </div>
            <h3 className="text-2xl font-black text-on-surface tracking-tight mb-2">Your Inbox</h3>
            <p className="text-sm font-bold text-on-surface-variant opacity-70">
              Select a tutor from the list to start a conversation
            </p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
