const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { BrevoClient } = require('@getbrevo/brevo');


// 1. Initialize Firebase Admin SDK
// Handle both 'serviceAccountKey.json' and 'serviceAccountKey.json.json' (Windows extension issue)
let serviceAccount;
try {
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (err) {
    serviceAccount = require('./serviceAccountKey.json.json');
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("✅ Firebase Admin Initialized successfully.");
} catch (e) {
  console.warn("⚠️ Warning: serviceAccountKey.json not found! Push notifications will fail.");
}

// 2. Setup Brevo Client (v5 syntax)
const brevoClient = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY || 'MISSING_KEY'
});



// Removed redundant old initialization block


const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Basic health check endpoint
app.get('/', (req, res) => {
  res.send('Michu Stays Push Notification Server is running!');
});

// 2. The endpoint that receives the ping from the frontend and sends the Push Notification
app.post('/send-push', async (req, res) => {
  const { tokens, title, body } = req.body;

  if (!tokens || tokens.length === 0) {
    return res.status(400).send({ error: 'No FCM tokens provided.' });
  }

  // Create the Firebase message payload
  const message = {
    notification: {
      title: title || 'Michu Stays',
      body: body || 'You have a new update.'
    },
    tokens: tokens // This allows sending to multiple devices at once
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    res.status(200).send({ success: true, response });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// 3. Password Reset Bridge (Brevo)
app.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send({ error: "Email is required" });

  try {
    // Generate secure reset link
    const resetLink = await admin.auth().generatePasswordResetLink(email, {
      url: 'https://michu-stays.firebaseapp.com/#login'
    });



    const emailPayload = {
      subject: "Reset Your Michu Stays Password 🔐",
      htmlContent: `
        <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://michu-stays.web.app/images/logo.png" width="80" style="border-radius: 20px;">
          </div>
          <h1 style="font-size: 24px; font-weight: 800; text-align: center; color: #0b6e4f; margin-bottom: 20px;">Password Reset Request</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #5a606a;">We received a request to reset the password for your Michu Stays account. Click the button below to choose a new password:</p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetLink}" style="background: #0b6e4f; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; display: inline-block; box-shadow: 0 10px 20px rgba(11, 110, 79, 0.2);">Reset Password</a>
          </div>

          <p style="font-size: 14px; color: #94a3b8; text-align: center;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #aaa;">
            &copy; 2026 Michu Stays. All rights reserved.<br>
            Addis Ababa, Ethiopia
          </div>
        </div>`,
      sender: { "name": "Michu Stays", "email": "michustays@gmail.com" },


      to: [{ "email": email }]
    };

    console.log("📨 Attempting to send reset email to:", email);
    const response = await brevoClient.transactionalEmails.sendTransacEmail(emailPayload);
    console.log("✅ Brevo API Response:", JSON.stringify(response));
    
    res.status(200).send({ success: true, messageId: response.messageId });
  } catch (error) {
    console.error("❌ Brevo Reset Error Details:", error);
    res.status(500).send({ error: error.message });
  }
});




// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Michu Push Server listening on port ${port}`);
});

// 4. Booking Confirmation Endpoint
app.post('/send-booking-confirmation', async (req, res) => {
  console.log("-----------------------------------------");
  console.log("📥 RECEIVED: Booking confirmation request");
  
  const { email, customerName, hotelTitle, checkIn, checkOut, totalAmount, bookingId, referenceCode, nights } = req.body;
  console.log("   - Target Email:", email);
  console.log("   - Hotel:", hotelTitle);
  console.log("   - Booking ID:", bookingId);
  console.log("   - Reference:", referenceCode);
  
  if (!email || !hotelTitle) {
    console.warn("⚠️ ERROR: Missing required fields in request body.");
    return res.status(400).send({ error: "Missing required booking details (email or hotel title)" });
  }

  try {
    const emailPayload = {
      subject: `Booking Confirmed at ${hotelTitle} 🏨`,
      htmlContent: `
        <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; color: #1a1a1a; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 25px;">
            <img src="https://michu-stays.web.app/images/logo.png" width="80" style="border-radius: 18px;">
            <div style="font-size: 22px; font-weight: 800; color: #0b6e4f; margin-top: 8px; letter-spacing: -0.5px;">Michu Stays</div>
          </div>
          
          <h1 style="font-size: 26px; font-weight: 900; text-align: center; color: #1a1a1a; margin-bottom: 10px;">Booking Confirmed! 🎉</h1>
          <p style="text-align: center; font-size: 16px; color: #64748b; margin-bottom: 30px;">Hello ${customerName}, your stay at <strong>${hotelTitle}</strong> is officially confirmed.</p>
          
          <div style="background: #f8fafc; border-radius: 24px; padding: 30px; margin-bottom: 30px; border: 1.5px solid #edf2f7;">
            <h2 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; margin-bottom: 20px; margin-top: 0; font-weight: 800;">Stay Details</h2>
            
            <div style="display: flex; flex-direction: column; gap: 18px;">
               <div>
                <div style="font-size: 12px; font-weight: 800; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase;">PROPERTY</div>
                <div style="font-size: 17px; font-weight: 700; color: #0b6e4f;">🏨 ${hotelTitle}</div>
              </div>

              <div style="display: flex; gap: 40px;">
                <div>
                  <div style="font-size: 12px; font-weight: 800; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase;">DATES</div>
                  <div style="font-size: 15px; font-weight: 600; color: #334155;">📅 ${checkIn} &rarr; ${checkOut}</div>
                  <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Total: ${nights || 'N/A'} Nights</div>
                </div>
              </div>

              <div>
                <div style="font-size: 12px; font-weight: 800; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase;">TOTAL PAID</div>
                <div style="font-size: 18px; font-weight: 800; color: #1a1a1a;">💰 ${totalAmount} Birr</div>
              </div>

              <div style="padding-top: 15px; border-top: 1px dashed #e2e8f0;">
                <div style="font-size: 12px; font-weight: 800; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase;">REFERENCE CODE</div>
                <div style="font-size: 18px; font-weight: 800; color: #0b6e4f; font-family: monospace; letter-spacing: 1px;">${referenceCode || bookingId}</div>
              </div>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; background: #ecfdf5; border-radius: 18px; border: 1px solid #d1fae5; margin-bottom: 30px;">
             <p style="margin: 0; color: #065f46; font-weight: 700; font-size: 15px;">Your room is ready for your arrival. Simply show your reference code at the front desk!</p>
          </div>

          <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center;">If you have any questions, contact us at <a href="mailto:michustays@gmail.com" style="color: #0b6e4f; font-weight: 700; text-decoration: none;">michustays@gmail.com</a>.</p>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #94a3b8;">
            &copy; 2026 Michu Stays. All rights reserved.<br>
            Addis Ababa, Ethiopia
          </div>
        </div>`,
      textContent: `Booking Confirmed! Hello ${customerName}, your stay at ${hotelTitle} from ${checkIn} to ${checkOut} (${nights} nights) is confirmed. Reference: ${referenceCode || bookingId}. Total: ${totalAmount} Birr.`,
      sender: { "name": "Michu Stays", "email": "michustays@gmail.com" },
      replyTo: { "email": "michustays@gmail.com", "name": "Michu Stays Support" },
      to: [{ "email": email }]
    };

    console.log("📨 SENDING TRANSAC EMAIL via Brevo API...");
    const response = await brevoClient.transactionalEmails.sendTransacEmail(emailPayload);
    console.log("✅ SUCCESS: Brevo Message ID:", response.messageId);
    
    res.status(200).send({ success: true, messageId: response.messageId });
  } catch (error) {
    console.error("❌ ERROR: Brevo failed to send confirmation email:", JSON.stringify(error, null, 2));
    res.status(500).send({ error: error.message || "Failed to dispatch email", details: error });
  }
  console.log("-----------------------------------------");
});
