<script lang="ts" setup>
import { signOut } from "firebase/auth";
import { useCurrentUser, useFirebaseAuth } from "vuefire";
import { useRouter } from "vue-router";
import CustomButton from "./CustomButton.vue";

const user = useCurrentUser();
const auth = useFirebaseAuth();
const router = useRouter();

async function logout() {
  try {
    await signOut(auth!);
    router.push("login");
  } catch {
    alert("Error logging out");
  }
}
</script>

<template>
  <CustomButton class="logout-btn" @click="logout()" v-if="user">Logout</CustomButton>
</template>
