const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const marker = '  return (\n    <div className="flex h-[calc(100vh-140px)]';
const startIdx = content.indexOf(marker);

if (startIdx === -1) {
  console.log('marker not found');
  process.exit(1);
}

const newLogic = `  return (
    <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] flex flex-col p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h1 className="text-2xl md:text-3xl font-serif font-bold italic text-primary">Messages</h1>
        <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/10 shadow-sm">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Live Support</span>
        </div>
      </div>

      <div className="flex bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden flex-1 border border-primary/5 relative">
        {/* Left Panel: Contacts List */}
        <div className={cn(
          "w-full md:w-[320px] lg:w-[380px] border-r border-primary/5 flex flex-col bg-slate-50/30 transition-all duration-300 shrink-0",
          activeChatId ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 border-b border-primary/5 flex items-center justify-between bg-white">
            <h4 className="text-[11px] font-bold text-primary/60 uppercase tracking-widest">Tutors</h4>
            <span className="bg-primary/5 text-primary font-black px-1.5 py-0.5 rounded-md text-[11px]">{filteredChats.length}</span>
          </div>
          
          <div className="p-3 bg-white/50 border-b border-primary/5">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-slate-50 border-none rounded-xl py-2.5 pl-4 pr-10 focus:ring-2 focus:ring-primary/10 transition-all text-sm outline-none" 
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/30" size={16} />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
            {filteredChats.map((chat) => (
              <button 
                key={chat.tutorId}
                onClick={() => setActiveChatId(chat.tutorId)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group relative",
                  activeChatId === chat.tutorId ? "bg-primary/10 shadow-sm" : "hover:bg-slate-100/80"
                )}
              >
                {activeChatId === chat.tutorId && (
                  <motion.div layoutId="active-chat-pill" className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full" />
                )}
                <div className="relative shrink-0">
                  <Avatar src={chat.avatar} size="md" className={cn(activeChatId === chat.tutorId ? "ring-2 ring-primary/20" : "")} />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="font-bold text-sm truncate text-on-surface">{chat.tutorName}</p>
                    <span className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">{chat.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-xs truncate opacity-70",
                      chat.unreadCount > 0 ? "font-bold text-on-surface" : "font-medium"
                    )}>{chat.lastMessage}</p>
                    {chat.unreadCount > 0 && (
                      <span className="bg-primary text-white text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm">
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
          "flex-1 flex flex-col bg-gradient-to-b from-slate-50/50 to-slate-100/80 relative transition-all duration-300",
          !activeChatId ? "hidden md:flex" : "flex"
        )}>
          {activeChat ? (
            <>
              <div className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]"></div>

              <div className="p-3 border-b border-primary/5 bg-white/80 backdrop-blur-md flex items-center justify-between shadow-sm relative z-10">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveChatId(null)}
                    className="md:hidden p-2 hover:bg-slate-100 rounded-xl"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <div className="relative">
                    <Avatar src={activeChat.avatar} size="md" mdSize="lg" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm md:text-lg italic text-primary leading-tight">{activeChat.tutorName}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      <p className="text-[9px] md:text-[10px] font-bold text-green-600 uppercase tracking-widest opacity-80">Online Now</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-primary/5 rounded-xl text-primary/40 transition-all">
                    <Search size={20} />
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
                      className="p-2 hover:bg-primary/5 rounded-xl text-primary/40 transition-all"
                    >
                      <MoreVertical size={20} />
                    </button>
                    <AnimatePresence>
                      {isChatMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-primary/5 overflow-hidden z-50 p-1"
                        >
                          <button className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-primary/5 rounded-xl flex items-center gap-3 transition-colors">
                            <UserCircle size={16} /> View Profile
                          </button>
                          <button className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-primary/5 rounded-xl flex items-center gap-3 transition-colors">
                            <FileText size={16} /> Shared Files
                          </button>
                          <button className="w-full px-4 py-3 text-left text-sm font-bold hover:bg-rose-50 text-rose-500 rounded-xl flex items-center gap-3 transition-colors border-t border-primary/5 mt-1">
                            <LogOut size={16} /> Clear Chat
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-4 md:space-y-6 relative z-10 custom-scrollbar">
                {activeChat.messages.map((msg, i) => {
                  const isUser = msg.senderId === 'user';
                  const dateVal = (msg as any).date || 'TODAY';
                  const prevDateVal = i > 0 ? ((activeChat.messages[i-1] as any).date || 'TODAY') : null;
                  const showDate = i === 0 || dateVal !== prevDateVal;

                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-6 relative z-10 w-full">
                          <span className="bg-slate-200/60 text-slate-600 text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-widest backdrop-blur-sm">
                            {dateVal}
                          </span>
                        </div>
                      )}
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={cn("flex w-full group relative", isUser ? "justify-end" : "justify-start")}
                      >
                        {isUser && (
                          <button 
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setDrafts(prev => ({ ...prev, [activeChatId!]: msg.text }));
                            }}
                            className="bg-white/90 p-2 rounded-full shadow-sm mr-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white self-center border border-primary/10"
                            title="Edit message"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        <div className={cn(
                          "max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm relative transition-all w-fit",
                          isUser ? "bg-primary text-white rounded-tr-md shadow-primary/20" : "bg-white text-on-surface rounded-tl-md border border-slate-100"
                        )}>
                          <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                          <div className={cn("flex items-center gap-1.5 mt-1 justify-end", isUser ? "text-white/70" : "text-primary/40")}>
                            <span className="text-[9px] font-bold uppercase tracking-widest">{msg.timestamp}</span>
                            {isUser && <Check size={12} className="text-white/80" />}
                          </div>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 md:p-6 bg-white border-t border-primary/5 flex flex-col gap-2 relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                {editingMessageId && (
                  <div className="flex items-center justify-between bg-primary/5 px-4 py-2 rounded-xl mb-1 border-l-4 border-primary">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Editing Message</p>
                    <button onClick={() => { setEditingMessageId(null); setDrafts(prev => ({ ...prev, [activeChatId!]: '' })); }} className="p-1 hover:bg-primary/10 rounded-full">
                      <X className="w-3 h-3 text-primary" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)} className={cn("p-3 rounded-xl transition-all", isAttachmentMenuOpen ? "bg-primary text-white" : "text-primary/40 hover:bg-primary/5")}>
                    <Paperclip size={20} />
                  </button>
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={currentDraft}
                      onChange={(e) => setDrafts(prev => ({ ...prev, [activeChatId!]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..." 
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 shadow-inner focus:ring-2 ring-primary/10 outline-none pr-12" 
                    />
                    <button onClick={sendMessage} disabled={!currentDraft.trim()} className={cn("absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all", currentDraft.trim() ? "text-primary hover:bg-primary/10" : "text-primary/20 cursor-not-allowed")}>
                      {editingMessageId ? <Check size={22} /> : <Send size={22} />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6">
              <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center text-primary/20 shadow-inner">
                <MessageSquare size={48} className="opacity-40" />
              </div>
              <h3 className="font-serif font-bold text-2xl italic text-primary">Your Inbox</h3>
              <p className="text-primary/60 font-medium text-sm max-w-xs mx-auto">Select a tutor to start a conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
`;

const newContent = content.substring(0, startIdx) + newLogic;
fs.writeFileSync('src/App.tsx', newContent);
console.log('Fixed!');
