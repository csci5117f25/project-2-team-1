// must be js file

importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js");

// needs its own config object, can't import from the existing config file
const firebaseConfig = {
  apiKey: "AIzaSyAUsn_hkxg7FmiQPt89s-r8S24A4MDIlVk",
  authDomain: "gyst-1ba35.firebaseapp.com",
  projectId: "gyst-1ba35",
  storageBucket: "gyst-1ba35.firebasestorage.app",
  messagingSenderId: "483812494206",
  appId: "1:483812494206:web:cbbab26bfdea6d5868012f",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title ?? "GYST";
  const notificationOptions = {
    body: payload.notification?.body ?? "Tap to open GYST.",
    icon: "/favicon.ico",
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
