// Run `firebase deploy --only functions` to deploy any changes
// Don't use default prettier formatting for this file

import {setGlobalOptions} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

setGlobalOptions({region: "us-central1", maxInstances: 10});

admin.initializeApp();

const NOTIFICATION_TITLE = "GYST Reminder";
const NOTIFICATION_BODY = "Time to knock out a task!";

export const sendDailyNotifications = onSchedule(
  {
    schedule: "0 11 * * *", // 11:00 AM Central daily
    timeZone: "America/Chicago",
  },
  async () => {
    const db = admin.firestore();

    // find users with notis enabled
    const usersSnap = await db
      .collectionGroup("settings")
      .where("notifications", "==", true)
      .get();

    const messages: admin.messaging.TokenMessage[] = [];

    for (const settingsDoc of usersSnap.docs) {
      const userId = settingsDoc.ref.parent.parent?.id;
      if (!userId) continue;

      const tokensSnap = await db
        .collection("users")
        .doc(userId)
        .collection("notification_tokens")
        .get();

      tokensSnap.forEach((tokenDoc) => {
        messages.push({
          token: tokenDoc.id,
          notification: {
            title: NOTIFICATION_TITLE,
            body: NOTIFICATION_BODY,
          },
          data: {
            userId,
            // other attributes could be added here for code to use
          },
        });
      });
    }

    const messaging = admin.messaging();
    const sendPromises = messages.map((msg) =>
      messaging.send(msg).catch(async (error) => {
        if (error.code === "messaging/registration-token-not-registered") {
          await cleanupToken(msg.token);
        } else {
          logger.error("Failed to send", {token: msg.token, error});
        }
      })
    );

    await Promise.all(sendPromises);
  }
);

/**
 * Removes stale notification tokens from Firestore.
 * @param {string} token - The notification token to remove.
 */
async function cleanupToken(token: string) {
  const db = admin.firestore();
  const tokenDocs = await db
    .collectionGroup("notification_tokens")
    .where("token", "==", token)
    .get();
  for (const doc of tokenDocs.docs) {
    await doc.ref.delete();
  }
}
