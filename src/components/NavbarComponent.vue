<script setup lang="ts">
import Sidebar from "@/components/SidebarComponent.vue";
import { ref } from "vue";

const isSidebarShown = ref(false);
</script>

<template>
  <div>
    <router-link to="/">GYST</router-link>
    <button @click="isSidebarShown = true" type="button">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        class="bi bi-list"
        viewBox="0 0 16 16"
      >
        <path
          fill-rule="evenodd"
          d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"
        />
      </svg>
    </button>
  </div>

  <div v-if="isSidebarShown" class="sidebar-backdrop" @click="isSidebarShown = false"></div>

  <Sidebar @close-sidebar="isSidebarShown = false" v-if="isSidebarShown" />
</template>

<style scoped lang="scss">
div {
  background-color: var(--accent-color-primary);
  padding: 0.8rem 0.8rem 0.8rem 1.2rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 3.5rem; /* Ensures navbar has enough height */
  box-sizing: border-box;

  button {
    width: 2.5rem;
    height: 2.5rem;
    margin: 0;
    padding: 0;
    background-color: var(--accent-color-secondary);
    border: 0;
    border-radius: 0.5rem;

    &:hover {
      cursor: pointer;
      background-color: var(--accent-color-tertiary);
    }

    &:active {
      background-color: var(--accent-color-quaternary);
    }

    svg {
      width: 2rem;
      height: 2rem;
      color: white;
    }
  }

  a {
    font-size: 2rem;
    color: white;
    font-weight: bold;
    margin: 0;
  }
}

@media (max-width: 480px) {
  div {
    position: relative;
    min-height: 3.5rem;
    padding: 0.8rem 0.8rem 0.8rem 1.2rem;
  }

  a {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  button {
    position: absolute;
    right: 0.8rem;
    top: 50%;
    transform: translateY(-50%);
  }
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  z-index: 99;
}
</style>
