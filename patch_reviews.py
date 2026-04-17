
import sys

filepath = r'd:\tutor_website\student-hub-pro\src\App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Target block (liberal whitespace match)
target_start = 'const studentPending = bookings.find'
target_end = '})()' # The end of the IIFE

# I'll find the specific IIFE in ReviewsView
# Since I know the line numbers are around 3474

lines = content.split('\n')
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if i >= 3470 and 'const studentPending = bookings.find' in line:
        # Go up to the IIFE start
        for j in range(i, i-10, -1):
            if '{(() => {' in lines[j]:
                start_idx = j
                break
        # Go down to the IIFE end
        for k in range(i, i+100):
            if '})()' in lines[k]:
                end_idx = k
                break
        break

if start_idx != -1 and end_idx != -1:
    new_logic = """                        {(() => {
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
                        })()}"""
    lines[start_idx:end_idx+1] = [new_logic]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\\n'.join(lines))
    print("Successfully patched App.tsx")
else:
    print(f"Could not find block: start={start_idx}, end={end_idx}")
    sys.exit(1)
