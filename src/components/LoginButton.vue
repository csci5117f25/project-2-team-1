<script lang="ts" setup>
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useCurrentUser, useFirebaseAuth } from "vuefire";
import { useRouter } from "vue-router";

const user = useCurrentUser();
const auth = useFirebaseAuth();
const provider = new GoogleAuthProvider();
const router = useRouter();

async function login() {
  try {
    const result = await signInWithPopup(auth, provider);
    router.push("/");
  } catch {
    alert("Error logging in");
  }
}
</script>

<template>
  <button class="login-btn" @click="login()" v-if="!user">Log In/Sign Up</button>
</template>

<style scoped lang="scss">
.login-btn {
  background-color: var(--accent-color-secondary);
  color: var(--background-color);
  border: none;
  border-radius: 8px;
  padding: 1.5rem 3.5rem;
  font-size: 1.3rem;
}

.login-btn:hover {
  background-color: var(--accent-color-tertiary);
  color: var(--accent-color-primary);
  transform: translateY(-2px);
}
</style>
