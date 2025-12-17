// Run `firebase deploy --only functions` to deploy any changes
// Don't use default prettier formatting for this file

import {setGlobalOptions} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {onRequest} from "firebase-functions/v2/https";
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
    await sendNotificationToAllTokens(NOTIFICATION_TITLE, NOTIFICATION_BODY);
  }
);

export const sendTestNotification = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Use POST"});
    return;
  }

  const providedKey =
    (typeof req.query.key === "string" ? req.query.key : null) ??
    req.get("x-test-notification-key") ??
    null;

  const db = admin.firestore();
  const configSnap = await db.doc("config/testNotification").get();
  const expectedKey =
    (
      configSnap.exists ?
        (configSnap.get("key") as string | undefined) :
        undefined
    ) ?? "";

  if (!expectedKey) {
    res.status(503).json({
      error: "Missing server config",
      message:
        "Ensure Firestore doc config/testNotification has a { key: \"...\" }.",
    });
    return;
  }

  if (!providedKey || providedKey !== expectedKey) {
    res.status(403).json({error: "Forbidden"});
    return;
  }

  // Allows for optional title/body in the request, else defaults are used
  const body =
    typeof req.body === "object" && req.body ?
      (req.body as Record<string, unknown>) :
      {};
  const title =
    typeof body.title === "string" && body.title ?
      body.title :
      NOTIFICATION_TITLE;
  const messageBody =
    typeof body.body === "string" && body.body ? body.body : NOTIFICATION_BODY;

  const result = await sendNotificationToAllTokens(title, messageBody);
  res.status(200).json(result);
});

/**
 * @typedef {Object} NotificationResult
 * @property {number} attempted
 * @property {number} sent
 * @property {number} failed
 * @property {number} cleaned
 */

/**
 * Sends a notification to all stored notification tokens
 * (all device/browser combos with notifications enabled).
 * Cleans up any stale tokens that are no longer valid.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body.
 * @return {Promise<NotificationResult>}
 * Summary of notification sending results.
 */
async function sendNotificationToAllTokens(title: string, body: string) {
  const db = admin.firestore();
  const tokensSnap = await db.collectionGroup("notification_tokens").get();

  const tokens: Array<{token: string; userId: string}> = [];
  for (const tokenDoc of tokensSnap.docs) {
    const userId = tokenDoc.ref.parent.parent?.id;
    if (!userId) continue;
    tokens.push({token: tokenDoc.id, userId});
  }

  const messaging = admin.messaging();
  const chunkSize = 20; // send at most 20 at a time

  // logging
  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const sendPromises = chunk.map(({token, userId}) =>
      messaging
        .send({
          token,
          notification: {
            title,
            body,
          },
          data: {
            userId,
            // other attributes could be added here for code to use
          },
        })
        .then(() => {
          sent += 1;
        })
        .catch(async (error) => {
          failed += 1;
          if (error.code === "messaging/registration-token-not-registered") {
            await cleanupToken(token);
            cleaned += 1;
          } else {
            logger.error("Failed to send", {token, error});
          }
        })
    );

    await Promise.all(sendPromises);
  }
  return {attempted: tokens.length, sent, failed, cleaned};
}

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
