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
