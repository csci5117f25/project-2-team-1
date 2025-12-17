import { firebaseApp } from "../../firebase_conf";
import { isSupported, getMessaging, getToken, deleteToken } from "firebase/messaging";
import { saveNotificationToken, removeNotificationToken } from "@/database/database";

const VAPID_PUBLIC_KEY =
  "BLsHPQPvVXi8GkJOQn0m4MSdDiX5nFg7-8xgkQyKw8yL9ijLyVREScqIiCPpnPD8xgZAH7VUOLUbRayaH_HcPeU";
const SERVICE_WORKER_FILE = "/firebase-messaging-sw.js";
const TOKEN_STORAGE_KEY = "gyst-webpush-token";

export const arePushNotificationsSupported = async () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (typeof Notification === "undefined") {
    return false;
  }

  const supported = await isSupported().catch(() => false);
  return supported;
};

export const getStoredToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
};

const setStoredToken = (token: string) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
};

const clearStoredToken = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

const getMessagingInstance = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  // check if messaging is supported in browser
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return null;
  }

  return getMessaging(firebaseApp);
};

const ensureServiceWorkerRegistration = async () => {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers are not supported in this browser.");
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration();
  if (existingRegistration) {
    return existingRegistration;
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_FILE);
};

export const subscribeToPushNotifications = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (typeof Notification === "undefined") {
    throw new Error("Notifications are not supported in this browsre.");
  }

  const messaging = await getMessagingInstance();
  if (!messaging) {
    throw new Error("Firebase Messaging is not supported in this browser.");
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") {
    throw new Error("Notifications were not granted.");
  }

  const registration = await ensureServiceWorkerRegistration();
  const token = await getToken(messaging, {
    vapidKey: VAPID_PUBLIC_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Unable to retrieve an FCM registration token.");
  }

  await saveNotificationToken(token);
  setStoredToken(token);

  return token;
};

export const unsubscribeFromPushNotifications = async () => {
  if (typeof window === "undefined") {
    return;
  }

  const messaging = await getMessagingInstance();
  const storedToken = getStoredToken();

  // if there's a stored token, remove it from the database
  if (storedToken) {
    await removeNotificationToken(storedToken).catch((error) => {
      console.error("Failed to remove stored notification token", error);
    });
  }

  // if we have a messaging instance, delete the token from FCM
  if (messaging) {
    await deleteToken(messaging).catch((error) => {
      console.error("Failed to delete the FCM token", error);
    });
  }

  // clear the stored token locally
  clearStoredToken();
};
