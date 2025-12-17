<script setup lang="ts">
import { deleteAccount } from "@/database/database";
import {
  arePushNotificationsSupported,
  getStoredToken,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/notifications/pushNotifications";
import { onMounted, ref } from "vue";
import { signOut } from "firebase/auth";
import { useFirebaseAuth } from "vuefire";
import Navbar from "@/components/NavbarComponent.vue";
import Spinner from "@/components/SpinnerComponent.vue";
import DeleteAccountModal from "@/components/DeleteAccountModal.vue";
import router from "@/router";
import CustomButton from "@/components/CustomButton.vue";

const settingsLoaded = ref(false);
const notificationsEnabled = ref(false);
const syncingNotificationsToggle = ref(false);
const isDeletePopupOpen = ref(false);
const notificationsSupported = ref(false);
const isIPhone = ref(false);

const auth = useFirebaseAuth();

async function onNotificationsToggle() {
  if (!settingsLoaded.value || syncingNotificationsToggle.value) {
    return;
  }

  if (!notificationsSupported.value) {
    notificationsEnabled.value = false;
    return;
  }

  const nextValue = !notificationsEnabled.value;
  const previousValue = notificationsEnabled.value;

  syncingNotificationsToggle.value = true;
  try {
    if (nextValue) {
      await subscribeToPushNotifications();
      // Only reflect "enabled" once the local token (final step) has been stored.
      notificationsEnabled.value = Boolean(getStoredToken());
    } else {
      await unsubscribeFromPushNotifications();
      notificationsEnabled.value = false;
    }
  } catch (error) {
    console.error("Failed to toggle notifications", error);
    notificationsEnabled.value = previousValue;
  } finally {
    syncingNotificationsToggle.value = false;
  }
}

onMounted(async () => {
  try {
    // for additional help message for iPhone users, who have extra steps
    isIPhone.value = typeof navigator !== "undefined" && /iPhone/i.test(navigator.userAgent);
    notificationsSupported.value = await arePushNotificationsSupported();

    const storedToken = getStoredToken();
    // browser permission check
    const permission =
      typeof Notification === "undefined"
        ? "default"
        : (Notification.permission as NotificationPermission);
    notificationsEnabled.value = Boolean(storedToken) && permission === "granted"; // if token and permission granted
  } catch (error) {
    console.error("Failed to load settings", error);
  } finally {
    settingsLoaded.value = true;
  }
});

function closeModal() {
  isDeletePopupOpen.value = false;
}

async function onDeleteAccount() {
  await deleteAccount();
  await signOut(auth!);
  router.push({ path: "/login" });
}
</script>

<template>
  <div>
    <DeleteAccountModal
      :isOpen="isDeletePopupOpen"
      @close="closeModal()"
      @delete="onDeleteAccount()"
    />

    <Navbar />
    <div v-if="settingsLoaded" class="mobile-container">
      <h2>Settings</h2>
      <label class="switch">
        <input
          type="checkbox"
          :checked="notificationsEnabled"
          :disabled="!notificationsSupported || syncingNotificationsToggle"
          @click.prevent="onNotificationsToggle"
        />
        <span class="slider round"></span>
        <span class="switch-label">Notifications</span>
      </label>
      <p v-if="!notificationsSupported" class="notifications-unsupported">
        Notifications aren't supported on this browser/device.
      </p>
      <p v-if="!notificationsSupported && isIPhone" class="notifications-unsupported">
        Are you trying to enable notifications on your iPhone? You must first
        <a
          href="https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios"
          target="_blank"
          rel="noopener noreferrer"
        >
          add this site to your Home Screen.
        </a>
      </p>

      <CustomButton @click="isDeletePopupOpen = true">Delete Account</CustomButton>
    </div>

    <div v-else class="mobile-container spinner">
      <Spinner />
    </div>
  </div>
</template>

<style scoped lang="scss">
.switch {
  display: flex;
  position: relative;
  align-items: center;
  width: 60px;
  height: 34px;

  input {
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + .slider {
      background-color: var(--accent-color-quaternary);
    }

    &:checked + .slider:before {
      -webkit-transform: translateX(26px);
      -ms-transform: translateX(26px);
      transform: translateX(26px);
    }

    &:focus + .slider {
      box-shadow: 0 0 1px var(--accent-color-primary);
    }

    &:disabled + .slider {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .switch-label {
    margin-left: 4rem;
    position: static;
    white-space: nowrap;
  }
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: 0.4s;
  transition: 0.4s;

  &:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    -webkit-transition: 0.4s;
    transition: 0.4s;
  }
}

.slider.round {
  border-radius: 34px;

  &:before {
    border-radius: 50%;
  }
}

button {
  background-color: var(--danger-color);
  color: white;
  padding: 0.8rem 1.6rem 0.8rem 1.6rem;
  border: none;
  border-radius: 0.5rem;
  margin-top: 2.5rem;

  &:hover {
    cursor: pointer;
    background-color: var(--danger-color-hover);
  }
}

.spinner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notifications-unsupported {
  margin-top: 0.75rem;
  color: var(--text-color-secondary);
  font-size: 0.95rem;
}
</style>
