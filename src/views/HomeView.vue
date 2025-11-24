<script lang="ts" setup>
import Navbar from "@/components/NavbarComponent.vue";
import { getUserTasks, createTask } from "@/database/database";
const data = await getUserTasks();


function createSampleTask() {
  createTask({
    frequency: "daily",
    name: "test",
    icon: "",
    last_completed_time: Date.now(),
    current_streak: 0,
    xp: 10
  });
}

</script>

<template>
  <div>
    <Navbar />
    <div v-for="task in data" :key="task.id">
      <p>{{ task.name }}</p>
    </div>

    <button @click="createSampleTask">Create Sample Task</button>
  </div>
</template>

<style lang="scss" scoped>
div {
  p {
    background-color: blue;
  }
}
</style>
