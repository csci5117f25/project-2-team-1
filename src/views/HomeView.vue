<script lang="ts" setup>
import { computed } from "vue";
import Navbar from "@/components/NavbarComponent.vue";
import StreakWidget from "@/components/StreakWidget.vue";
import TaskList from "@/components/TaskList.vue";

const currentDateDisplay = computed(() => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
});
</script>

<template>
  <div class="page-wrapper">
    <Navbar />

    <div class="content-container">
      <h1 class="date-header">{{ currentDateDisplay }}</h1>

      <StreakWidget />

      <TaskList />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-wrapper {
  min-height: 100vh;
  background-color: var(--background-color);
}

.content-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.date-header {
  font-size: 1.5rem;
  color: var(--accent-color-primary);
  margin-bottom: 1.5rem;
  font-weight: 600;
}

@media (max-width: 480px) {
  .date-header {
    font-size: 1.2rem;
  }
}
</style>
