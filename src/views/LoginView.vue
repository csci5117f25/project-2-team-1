<script setup lang="ts">
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useCurrentUser, useFirebaseAuth } from "vuefire";

const user = useCurrentUser();
const auth = useFirebaseAuth();
const provider = new GoogleAuthProvider();

async function login() {
  if (!auth) {
    return;
  }

  try {
    await signInWithPopup(auth, provider);
  } catch {
    alert("oh no");
  }
}

async function logout() {
  if (!auth) {
    return;
  }

  try {
    await signOut(auth);
  } catch {
    alert("oh no");
  }
}
</script>

<template>
  <div>
    <button v-if="!user" @click="login()">Log In</button>
    <button v-else @click="logout()">Log Out</button>
  </div>
</template>

<style scoped lang="scss"></style>
