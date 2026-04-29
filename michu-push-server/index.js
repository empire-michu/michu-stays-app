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

  // Create the Firebase message payload with high-priority wake flags
  const message = {
    notification: {
      title: title || 'Michu Stays',
      body: body || 'You have a new update.'
    },
    data: {
      type: (title && title.toLowerCase().includes('booking')) ? 'booking' : 'general',
      click_action: 'FCM_PLUGIN_ACTIVITY',
      title: title || 'Michu Stays',
      body: body || 'You have a new update.',
      forceShow: '1'
    },
    android: {
      priority: 'high',
      ttl: '86400s',
      notification: {
        channelId: 'michu_urgent_v3',
        priority: 'max',
        visibility: 'public',
        sound: 'default',
        clickAction: 'FCM_PLUGIN_ACTIVITY',
        icon: 'stock_ticker_update',
        color: '#0e442c'
      }
    },
    apns: {
      payload: {
        aps: { 
          sound: 'default',
          contentAvailable: true,
          mutableContent: true
        }
      }
    },
    tokens: tokens 
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
    try {
        // Generate secure reset link
        const resetLink = await admin.auth().generatePasswordResetLink(email, {
          url: 'https://michu-stays.firebaseapp.com/#login'
        });

        const emailPayload = {
          subject: "Reset Your Michu Stays Password 🔐",
      htmlContent: `
        <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 25px;">
            <img src="https://michu-stays.web.app/images/logo.png" width="80" style="border-radius: 20px;">
            <h2 style="margin: 10px 0 0 0; color: #0b6e4f; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Michu Stays</h2>
          </div>
          <h1 style="font-size: 24px; font-weight: 800; text-align: center; color: #1a1a1a; margin-bottom: 20px;">Password Reset Request</h1>
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
  } catch (innerError) {
    console.warn("⚠️ Firebase or Brevo Inner Error:", innerError.message);
    // Don't leak exact existence of email based on password reset requests. Send success.
    return res.status(200).send({ success: true, message: "If registered, reset link sent." });
  }
  } catch (error) {
    console.error("❌ Brevo Reset Error Details:", error);
    res.status(500).send({ error: error.message });
  }
});




// Moved app.listen to the bottom

// 4. Booking Confirmation Endpoint
app.post('/send-booking-confirmation', async (req, res) => {
  console.log("-----------------------------------------");
  console.log("📥 RECEIVED: Booking confirmation request");
  
  const { email, customerName, hotelTitle, checkIn, checkOut, totalAmount, bookingId, referenceCode, nights } = req.body;
  console.log("   - Target Email:", email);
  console.log("   - Hotel:", hotelTitle);
  console.log("   - Booking ID:", bookingId);
  
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
            <img src="https://michu-stays.web.app/images/logo.png" width="80" style="border-radius: 20px;">
            <h2 style="margin: 10px 0 0 0; color: #0b6e4f; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Michu Stays</h2>
          </div>
          <h1 style="font-size: 26px; font-weight: 900; text-align: center; color: #1a1a1a; margin-bottom: 10px;">Booking Confirmed! 🎉</h1>
          <p style="text-align: center; font-size: 16px; color: #64748b; margin-bottom: 30px;">Hello ${customerName}, your stay at <strong>${hotelTitle}</strong> is officially confirmed.</p>
          
          <div style="background: #f8fafc; border-radius: 20px; padding: 25px; margin-bottom: 30px; border: 1px solid #e2e8f0; text-align: left;">
            <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 20px; margin-top: 0; text-align: center;">Stay Details</h2>
            
            <div style="margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
              <span style="color: #64748b; font-size: 12px; display: block; margin-bottom: 4px; text-transform: uppercase;">Hotel</span>
              <strong style="font-size: 16px; color: #1a1a1a;">🏨 ${hotelTitle}</strong>
            </div>
            
            <div style="margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
              <span style="color: #64748b; font-size: 12px; display: block; margin-bottom: 4px; text-transform: uppercase;">Check-in / Check-out</span>
              <strong style="font-size: 15px; color: #1a1a1a;">📅 ${checkIn} &rarr; ${checkOut}</strong> 
              <span style="color: #0b6e4f; font-size: 14px; font-weight: 600; margin-left: 8px;">(${nights || 1} Night${nights > 1 ? 's' : ''})</span>
            </div>
            
            <div style="margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
              <span style="color: #64748b; font-size: 12px; display: block; margin-bottom: 4px; text-transform: uppercase;">Reference / Booking ID</span>
              <strong style="font-size: 15px; color: #1a1a1a; font-family: monospace; letter-spacing: 1px;">#${referenceCode || bookingId}</strong>
            </div>

            <div style="padding-top: 5px;">
              <span style="color: #64748b; font-size: 12px; display: block; margin-bottom: 4px; text-transform: uppercase;">Total Paid</span>
              <strong style="font-size: 18px; color: #0b6e4f;">💰 ${totalAmount} Birr</strong>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; background: #ecfdf5; border-radius: 16px; border: 1px solid #d1fae5; margin-bottom: 30px;">
             <p style="margin: 0; color: #065f46; font-weight: 700; font-size: 15px;">Your room is ready for your arrival. Simply show your booking ID at the front desk!</p>
          </div>

          <p style="font-size: 14px; color: #64748b; line-height: 1.6;">If you have any questions or need to make changes, please contact the hotel manager directly through the app or email us at <a href="mailto:michustays@gmail.com" style="color: #0b6e4f; font-weight: 700; text-decoration: none;">michustays@gmail.com</a>.</p>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #94a3b8;">
            &copy; 2026 Michu Stays. All rights reserved.<br>
            Addis Ababa, Ethiopia
          </div>
        </div>`,
      sender: { "name": "Michu Stays", "email": "michustays@gmail.com" },
      to: [{ "email": email }]
    };

    console.log("📨 SENDING TRANSAC EMAIL via Brevo API...");
    const response = await brevoClient.transactionalEmails.sendTransacEmail(emailPayload);
    console.log("✅ SUCCESS: Brevo Message ID:", response.messageId);
    
    res.status(200).send({ success: true, messageId: response.messageId });
  } catch (error) {
    console.error("❌ ERROR: Brevo failed to send confirmation email:", error);
    res.status(500).send({ error: error.message });
  }
  console.log("-----------------------------------------");
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Michu Push Server listening on port ${port}`);
});
