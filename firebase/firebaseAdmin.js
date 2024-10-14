const admin = require('firebase-admin');
const serviceAccount = require('../sdk-files/bite-bazaar-app-firebase-adminsdk-zkwm3-923148537e.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = { admin };
