const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const brevo = require("@getbrevo/brevo");

// INITIALIZE
admin.initializeApp();

// Setup Brevo
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || "YOUR_BREVO_API_KEY");

exports.sendPush = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    const { tokens, title, body } = req.body;
    if (!tokens || tokens.length === 0) return res.status(400).send({ error: 'No FCM tokens provided.' });

    const message = {
      notification: { title: title || 'Michu Stays', body: body || 'You have a new update.' },
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
});

// PASSWORD RESET BRIDGE (Brevo Edition - 9,000 free/month)
exports.requestPasswordReset = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    const { email } = req.body;

    if (!email) return res.status(400).send({ error: "Email is required" });

    try {
      // 1. Generate the SECURE link from Firebase
      const resetLink = await admin.auth().generatePasswordResetLink(email, {
          url: 'https://michustays.pro.et/#login',
      });

      // 2. Wrap the reset link in your beautiful HTML template
      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.subject = "Reset Your Michu Stays Password 🔐";
      sendSmtpEmail.htmlContent = `
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
          </div>`;
      sendSmtpEmail.sender = { "name": "Michu Stays", "email": "management@michustays.pro.et" };
      sendSmtpEmail.to = [{ "email": email }];

      await apiInstance.sendTransacEmail(sendSmtpEmail);

      res.status(200).send({ success: true });
    } catch (error) {
      console.error("Reset Bridge (Brevo) Error:", error);
      if (error.code === 'auth/user-not-found') {
          return res.status(200).send({ success: true, note: 'User not found' });
      }
      res.status(500).send({ error: error.message });
    }
  });
});
