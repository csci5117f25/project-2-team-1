<script setup lang="ts">
import { computed } from "vue";
import { getUserStats, getUserTasks, isCompletedToday } from "@/database/database";

const userStats = await getUserStats();
const tasks = await getUserTasks();

const isActive = computed(() => {
  if (!tasks || !tasks.value || tasks.value.length === 0) return false;
  return tasks.value.every((task) => isCompletedToday(task));
});
</script>
<template>
  <p v-if="!isActive">Complete all of your tasks today to increase your streak!</p>
  <div class="streak-container" :class="{ inactive: !isActive }">
    <p class="fire-emoji">🔥</p>
    <div>
      <p class="streak-text">Streak: {{ userStats?.streak ?? 0 }}</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.streak-container {
  display: flex;
  flex-direction: row;
  position: relative;
  background: linear-gradient(to right, #ff6600, #ffcc00);
  padding: 0.5rem;
  margin-bottom: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  width: 100%;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    background 0.3s;

  &.inactive {
    background: linear-gradient(to right, #999, #bbb);

    .streak-text {
      color: #666;
    }

    .fire-emoji {
      filter: grayscale(1);
      opacity: 0.5;
    }
  }

  &.inactive {
    background: linear-gradient(to right, #999, #bbb);

    .streak-text {
      color: #666;
    }

    .fire-emoji {
      filter: grayscale(1);
      opacity: 0.5;
    }
  }

  &:hover {
    cursor: default;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &::before {
    content: "";
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    bottom: 0.5rem;
    left: 0.5rem;
    background-color: white;
    border-radius: 0.25rem;
    z-index: 0;
  }

  p {
    position: relative;
    z-index: 1;
    margin: 0.5rem;
  }

  div {
    display: flex;
    flex-direction: column;
    justify-content: center;

    .streak-text {
      font-size: 2.5rem;
      font-weight: bold;
      color: #ff6600;
    }
  }

  .fire-emoji {
    font-size: 5rem;
    margin: 0;
    padding: 0;
    position: relative;
    top: -5px;
  }
}
</style>
