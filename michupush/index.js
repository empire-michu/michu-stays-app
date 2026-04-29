const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

exports.sendPush = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send({ error: 'Method Not Allowed' });
        }

        const { tokens, title, body } = req.body;

        if (!tokens || tokens.length === 0) {
            return res.status(400).send({ error: 'No FCM tokens provided.' });
        }

        const message = {
            notification: {
                title: title || 'Michu Stays',
                body: body || 'You have a new update.'
            },
            data: {
                type: (title && title.toLowerCase().includes('booking')) ? 'booking' : 'general',
                title: title || 'Michu Stays',
                body: body || 'You have a new update.'
            },
            android: {
                priority: 'high',
                notification: {
                    priority: 'max',
                    visibility: 'public',
                    sound: 'default',
                    defaultVibrateTimings: true,
                    defaultLightSettings: true
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
            console.log("Push sent successfully:", response);
            res.status(200).send({ success: true, response });
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).send({ success: false, error: error.message });
        }
    });
});
