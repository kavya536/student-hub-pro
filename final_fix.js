const fs = require('fs');
const content = fs.readFileSync('d:/tutor_website/student-hub-pro/src/App.tsx', 'utf8');

const startMarker = 'const ChatView =';
const startIdx = content.indexOf(startMarker);

if (startIdx === -1) {
    console.error('Could not find ChatView');
    process.exit(1);
}

const head = content.substring(0, startIdx);

const newChatView = `const ChatView = ({ 
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const filteredChats = chats.filter(c => {
    const searchLower = chatSearch.toLowerCase();
    return c.tutorName.toLowerCase().includes(searchLower);
  });
  
  const activeChat = chats.find(c => c.tutorId === activeChatId);
  const currentDraft = activeChatId ? (drafts[activeChatId] || '') : '';

  const attachmentOptions = [
    { icon: FileText, label: 'Document', color: 'bg-indigo-500' },
    { icon: ImageIcon, label: 'Photos & videos', color: 'bg-blue-500' },
    { icon: Camera, label: 'Camera', color: 'bg-rose-500' },
    { icon: Mic, label: 'Audio', color: 'bg-orange-500' },
    { icon: UserCircle, label: 'Contact', color: 'bg-blue-600' },
    { icon: BarChart2, label: 'Poll', color: 'bg-amber-500' },
  ];

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatId, chats]);

  return (
    <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] flex flex-col p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
        <h1 className="text-2xl md:text-3xl font-serif font-bold italic text-primary">Messages</h1>
        <div className="flex items-center gap-1.5 bg-primary/10 px-3 md:px-4 py-1.5 md:py-2 rounded-full shadow-sm border border-primary/10">
          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-pulse"></span>
          <span className="text-[10px] md:text-xs font-bold text-primary tracking-widest uppercase">Live Support</span>
        </div>
      </div>

      <div className="flex bg-white rounded-2xl md:rounded-[2.5rem] shadow-xl overflow-hidden flex-1 border border-primary/10 relative">
        <div className={cn(
          "w-full md:w-[320px] lg:w-[380px] border-r border-primary/10 flex flex-col bg-slate-50/50 transition-all duration-300 shrink-0",
          activeChatId ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 md:p-5 border-b border-primary/5 flex items-center justify-between bg-white">
            <h4 className="text-[11px] font-bold text-primary/60 uppercase tracking-widest">Tutors</h4>
            <span className="bg-primary/10 text-primary font-black px-2 py-1 rounded-md text-[11px]">{filteredChats.length}</span>
          </div>
          <div className="p-3 md:p-4 border-b border-primary/5 bg-white">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none" 
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30" size={16} />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 md:p-3 space-y-1 md:space-y-2 custom-scrollbar">
            {filteredChats.map((chat) => (
              <button 
                key={chat.tutorId}
                onClick={() => setActiveChatId(chat.tutorId)}
                className={cn("w-full flex items-center gap-3 p-3 md:p-4 rounded-xl transition-all text-left relative group", activeChatId === chat.tutorId ? "bg-primary/10 shadow-sm" : "hover:bg-slate-100")}
              >
                {activeChatId === chat.tutorId && (
                  <motion.div layoutId="active-chat-pill" className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
                )}
                <div className="relative shrink-0">
                  <Avatar src={chat.avatar} size="md" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="font-bold text-sm truncate text-primary">{chat.tutorName}</p>
                    <span className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">{chat.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs truncate opacity-70">{chat.lastMessage}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={cn(
          "flex-1 flex flex-col bg-slate-50 relative h-full",
          !activeChatId ? "hidden md:flex" : "flex"
        )}>
          {activeChat ? (
            <>
              <div className="p-3 md:p-5 border-b border-primary/10 bg-white/80 backdrop-blur-md flex items-center justify-between shadow-sm relative z-10">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveChatId(null)} className="md:hidden p-2 hover:bg-slate-100 rounded-xl">
                    <ArrowLeft size={20} />
                  </button>
                  <Avatar src={activeChat.avatar} size="md" />
                  <div>
                    <h4 className="font-serif font-bold text-base md:text-xl italic text-primary leading-tight">{activeChat.tutorName}</h4>
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest opacity-80">Online Now</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 relative z-10 custom-scrollbar">
                {activeChat.messages.map((msg) => (
                  <div key={msg.id} className={cn("flex w-full", msg.senderId === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] px-4 py-3 rounded-2xl shadow-sm", msg.senderId === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-white text-on-surface rounded-tl-none")}>
                      <p className="text-sm font-bold">{msg.text}</p>
                      <span className="text-[9px] opacity-70 mt-1 block text-right">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-primary/10 flex items-center gap-3">
                <button className="p-3 text-primary/40 hover:text-primary transition-all">
                  <Paperclip size={20} />
                </button>
                <input 
                  type="text" 
                  value={currentDraft}
                  onChange={(e) => setDrafts(prev => ({ ...prev, [activeChatId!]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..." 
                  className="flex-1 bg-slate-50 border-none rounded-2xl px-6 py-4 shadow-inner focus:ring-2 ring-primary/10 outline-none" 
                />
                <button onClick={sendMessage} className="p-3 bg-primary text-white rounded-2xl shadow-lg hover:bg-primary/90 transition-all">
                  <Send size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6">
              <MessageSquare size={64} className="text-primary/10" />
              <h3 className="font-serif font-bold text-2xl italic text-primary">Your Inbox</h3>
              <p className="text-primary/60 font-medium text-sm">Select a tutor to start a conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('d:/tutor_website/student-hub-pro/src/App.tsx', head + newChatView);
console.log('Success!');
