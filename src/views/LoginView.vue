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
    <div>
      <h1>Get Your Shit Together!</h1>
      <p>
        Users around the world are using GYST to get their tasks done, improve their lives, and get
        themselves together!
      </p>
    </div>
    <img src="/graph.PNG" />
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
  gap: 2rem;
  min-height: 100vh;
  padding-left: 2rem;
  padding-right: 2rem;
}

img {
  width: 50%;
}

p {
  font-style: italic;
  font-weight: bold;
  color: var(--accent-color-tertiary);
  text-align: center;
}

@media (max-width: 1100px) {
  img {
    width: 100%;
  }
}

h1 {
  color: var(--accent-color-primary);
  text-align: center;
  font-size: 3rem;
  margin: 0;
}
</style>
