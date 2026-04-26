/**
 * Universal Platform Notification Helper
 * Sends high-priority emails via Google Apps Script bridge.
 */
export const sendPlatformEmail = async (
  payload: { name: string; email: string }, 
  type: 'approve' | 'reject' | 'tutor_register' | 'student_register' | 'booking_confirm', 
  details?: { reason?: string; tutorName?: string; timing?: string; subject?: string }
) => {
  if (!payload.email) return;

  const GAS_URL = "https://script.google.com/macros/s/AKfycbxNMNsfRfPW4r2ItxpcZX1d3Bu6FPMLKH7hkRDhT0wAeOsaaW7uoZAaDuniV26mrNM/exec";

  let subject = "";
  let html = "";

  // Common styles for premium look
  const containerStyle = "font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px;";
  const cardStyle = "max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);";
  const bodyStyle = "padding: 40px;";
  const h1Style = "color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;";

  if (type === 'student_register') {
    subject = "🚀 Welcome to Eduqra – Your Learning Journey Starts Here!";
    html = `
      <div style="${containerStyle}">
        <div style="${cardStyle}">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 35px; text-align: center;">
            <h1 style="${h1Style}">Welcome to Eduqra</h1>
          </div>
          <div style="${bodyStyle}">
            <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Hello <strong>${payload.name}</strong>,</p>
            <p style="font-size: 15px; color: #475569; line-height: 1.8;">
              Welcome to the family! It’s time to <strong>start learning, clearing your doubts, and gaining the knowledge</strong> you need to excel. 
              Our platform is designed to help you <strong>reach your goals</strong> with the guidance of expert mentors.
            </p>
            
            <div style="margin: 35px 0; text-align: center;">
              <a href="https://student-hub.eduqra.com" style="display: inline-block; background: #1e40af; color: #ffffff; padding: 18px 40px; border-radius: 12px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 14px rgba(30, 64, 175, 0.3);">Login to Student Hub</a>
            </div>
            
            <p style="font-size: 14px; color: #94a3b8; margin-top: 30px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 25px;">Eduqra Learning Services • Your Future, Personalized</p>
          </div>
        </div>
      </div>
    `;
  } else if (type === 'booking_confirm') {
    subject = "🎉 Booking Confirmed – Get Ready for Your Class!";
    html = `
      <div style="${containerStyle}">
        <div style="${cardStyle}">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 35px; text-align: center;">
            <h1 style="${h1Style}">Booking Confirmed</h1>
          </div>
          <div style="${bodyStyle}">
            <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Hello <strong>${payload.name}</strong>,</p>
            <p style="font-size: 15px; color: #475569; line-height: 1.6;">Congratulations! Your payment has been verified and your booking is now <strong>confirmed</strong>.</p>
            
            <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 16px; padding: 25px; margin: 30px 0;">
              <div style="margin-bottom: 12px; border-bottom: 1px solid #ddd6fe; padding-bottom: 12px;">
                <p style="margin: 0; color: #6d28d9; font-size: 12px; font-weight: 800; text-transform: uppercase;">Class Details:</p>
                <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 18px; font-weight: 800;">${details?.subject || 'Tutoring Session'}</p>
              </div>
              <div style="display: flex; gap: 20px;">
                <div style="flex: 1;">
                  <p style="margin: 0; color: #6d28d9; font-size: 10px; font-weight: 800; text-transform: uppercase;">Tutor:</p>
                  <p style="margin: 2px 0 0 0; color: #1e1b4b; font-size: 14px; font-weight: 600;">${details?.tutorName || 'Your Tutor'}</p>
                </div>
                <div style="flex: 1;">
                  <p style="margin: 0; color: #6d28d9; font-size: 10px; font-weight: 800; text-transform: uppercase;">Timing:</p>
                  <p style="margin: 2px 0 0 0; color: #1e1b4b; font-size: 14px; font-weight: 600;">${details?.timing || 'As per schedule'}</p>
                </div>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="https://student-hub.eduqra.com" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 15px 30px; border-radius: 10px; font-weight: 700; text-decoration: none;">View on Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  try {
    await fetch(GAS_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: payload.email, subject: subject, html: html })
    });
    console.log(`[CLOUD AUTO] ${type} email queued for: ${payload.email}`);
    return { success: true };
  } catch (error) {
    console.error("[CLOUD ERROR]", error);
    return { success: false };
  }
};
