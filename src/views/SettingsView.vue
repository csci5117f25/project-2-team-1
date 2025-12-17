<script setup lang="ts">
import { deleteAccount, getUserSettings, updateUserSettings } from "@/database/database";
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/notifications/pushNotifications";
import { onMounted, ref, watch } from "vue";
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

const auth = useFirebaseAuth();

watch(notificationsEnabled, async (newValue: boolean, oldValue: boolean) => {
  if (!settingsLoaded.value || syncingNotificationsToggle.value) {
    return;
  }

  try {
    if (newValue) {
      await subscribeToPushNotifications();
    } else {
      await unsubscribeFromPushNotifications();
    }

    await updateUserSettings({
      notifications: newValue,
    });
  } catch (error) {
    console.error("Failed to toggle notifications", error);
    // prevent UI from getting stuck in wrong state
    syncingNotificationsToggle.value = true;
    notificationsEnabled.value = oldValue;
    syncingNotificationsToggle.value = false;
  }
});

onMounted(async () => {
  // prefill all of the settings menu settings
  const settings = await getUserSettings();

  if (settings?.notifications) {
    notificationsEnabled.value = settings.notifications;

    if (typeof window !== "undefined" && Notification.permission === "granted") {
      subscribeToPushNotifications().catch((error) => {
        console.error("Failed to subscribe to notifications", error);
      });
    }
  }

  settingsLoaded.value = true;
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
        <input type="checkbox" v-model="notificationsEnabled" />
        <span class="slider round"></span>
        <span class="switch-label">Notifications</span>
      </label>

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
</style>
