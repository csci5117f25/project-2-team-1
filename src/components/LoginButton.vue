<script lang="ts" setup>
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useCurrentUser, useFirebaseAuth } from "vuefire";
import { useRouter } from "vue-router";
import CustomButton from "./CustomButton.vue";

const user = useCurrentUser();
const auth = useFirebaseAuth();
const provider = new GoogleAuthProvider();
const router = useRouter();

async function login() {
  try {
    await signInWithPopup(auth!, provider);
    router.push("/");
  } catch {
    alert("Error logging in");
  }
}
</script>

<template>
  <CustomButton @click="login()" v-if="!user"
    >Continue with Google<i class="fa-brands fa-google"></i
  ></CustomButton>
</template>

<style scoped lang="scss">
i {
  margin-left: 0.25rem;
}
</style>
