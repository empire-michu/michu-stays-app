const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// 1. Initialize Firebase Admin SDK
// You must download your Service Account JSON from Firebase -> Project Settings -> Service Accounts
// and place it in this folder named 'serviceAccountKey.json'.
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("✅ Firebase Admin Initialized successfully.");
} catch (e) {
  console.warn("⚠️ Warning: serviceAccountKey.json not found! Push notifications will fail. Please drop the key file in this folder.");
}

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

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Michu Push Server listening on port ${port}`);
});
