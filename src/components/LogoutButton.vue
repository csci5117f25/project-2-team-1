<script lang="ts" setup>
import { signOut } from "firebase/auth";
import { useCurrentUser, useFirebaseAuth } from "vuefire";
import { useRouter } from "vue-router";

const user = useCurrentUser();
const auth = useFirebaseAuth();
const router = useRouter();

async function logout() {
  try {
    const result = await signOut(auth);
    router.push("login");
  } catch {
    alert("Error logging out");
  }
}
</script>

<template>
  <button class="logout-btn" @click="logout()" v-if="user">Logout</button>
</template>

<style scoped lang="scss">
.logout-btn {
  background-color: var(--accent-color-secondary);
  color: var(--background-color);
  border: none;
  border-radius: 8px;
  padding: 1.5rem 3.5rem;
  font-size: 1.3rem;
}

.logout-btn:hover {
  background-color: var(--accent-color-tertiary);
  color: var(--accent-color-primary);
  transform: translateY(-2px);
}
</style>
