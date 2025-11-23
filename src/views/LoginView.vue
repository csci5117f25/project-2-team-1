<script lang="ts" setup>
import { useCurrentUser } from "vuefire";
import { watch } from "vue";
import { useRouter } from "vue-router";

import LoginButton from "@/components/LoginButton.vue";

const user = useCurrentUser();
const router = useRouter();

watch(user, (newuser) => {
  if (newuser) {
    router.push("/");
  }
});
</script>

<template>
  <div class="page">
    <h1>Get Your Shit Together Now!</h1>
    <LoginButton />
  </div>
</template>

<style scoped lang="scss">
.page {
  justify-content: center;
  align-items: center;
  text-align: center;
  flex-direction: column;
  display: flex;
  min-height: 100vh;
}

h1 {
  color: var(--accent-color-primary);
  text-align: center;
  font-size: 3rem;
}
</style>
