<script setup lang="ts">
import { signOut } from "firebase/auth";
import { useRouter } from "vue-router";
import { useFirebaseAuth } from "vuefire";

const auth = useFirebaseAuth();
const router = useRouter();
const emit = defineEmits(["closeSidebar"]);

const pages = [
  {
    name: "Tasks",
    link: "/",
  },
  {
    name: "Stats",
    link: "/stats",
  },
  {
    name: "Settings",
    link: "/settings",
  },
];

async function logout() {
  await signOut(auth!);
  router.push({ path: "/login" });
}
</script>

<template>
  <div class="sidebar">
    <div>
      <button @click="emit('closeSidebar')" type="button">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          class="bi bi-x"
          viewBox="0 0 16 16"
        >
          <path
            d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
          />
        </svg>
      </button>
      <div class="main-links">
        <router-link
          v-for="page in pages"
          :to="page.link"
          :key="page.name"
          @click="emit('closeSidebar')"
        >
          {{ page.name }}
        </router-link>
      </div>
    </div>
    <a @click="logout()" id="logout-btn">Logout</a>
  </div>
</template>

<style scoped lang="scss">
a {
  color: white;
  background-color: var(--accent-color-secondary);
  padding: 2rem 2rem 2rem 2rem;
  width: 100%;
  font-size: 1.2rem;
  border-top: 1px solid #cccccc;

  &#logout-btn {
    border-bottom-left-radius: 1rem;
    border-top: 1px solid #cccccc;
  }

  &:hover {
    cursor: pointer;
    background-color: var(--accent-color-tertiary);
  }
}

.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 100;
  background-color: var(--accent-color-secondary);
  width: 24rem;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0;
  border-top-left-radius: 1rem;
  border-bottom-left-radius: 1rem;

  div {
    width: 100%;

    button {
      height: 4rem;
      width: 4rem;
      border: 0;
      border-radius: 0.5rem;
      float: right;
      padding: 0;
      background-color: transparent;
      color: white;

      &:hover {
        cursor: pointer;
      }

      svg {
        width: 3rem;
        height: 3rem;
      }
    }
  }

  .main-links {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: 100vw;
  }
}
</style>
