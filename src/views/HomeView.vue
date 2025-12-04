<script lang="ts" setup>
import { ref } from "vue";
import Navbar from "@/components/NavbarComponent.vue";
import TaskDetailsModal from "@/components/TaskDetailsModal.vue";
import { getUserTasks, createTask } from "@/database/database";
import type Task from "@/interfaces/Task";

const data = await getUserTasks();
const selectedTask = ref<(Task & { id: string }) | null>(null);
const isModalOpen = ref(false);

function createSampleTask() {
  createTask({
    frequency: "daily",
    name: "test",
    icon: "",
    last_completed_time: Date.now(),
    current_streak: 0,
    xp: 10,
  });
}

function openTaskModal(task: Task & { id: string }) {
  selectedTask.value = { ...task, id: task.id };
  isModalOpen.value = true;
}

function handleNavigate(task: Task & { id: string }) {
  selectedTask.value = { ...task, id: task.id };
}

function closeModal() {
  isModalOpen.value = false;
  selectedTask.value = null;
}

function handleSave(updatedTask: Task & { id: string }) {
  console.log("Saving task:", updatedTask);
  // TODO: Implement
  closeModal();
}

function handleDelete(taskId: string) {
  console.log("Deleting task:", taskId);
  // TODO: implement
  closeModal();
}

function handleComplete(taskId: string) {
  console.log("Completing task:", taskId);
  // TODO: Implement

  // wait for cursor to leave button, then wait a moment before closing
  // for feedback/chance for user to undo complete
  // or on mobile just after a brief pause (again for time to undo if needed)

  // temp
  setTimeout(() => {
    closeModal();
  }, 1000);
}
</script>
<template>
  <div>
    <Navbar />
    <div v-for="task in data" :key="task.id">
      <p @click="openTaskModal(task as Task & { id: string })" style="cursor: pointer">
        {{ task.name }}
      </p>
    </div>

    <button @click="createSampleTask">Create Sample Task</button>

    <TaskDetailsModal
      :task="selectedTask"
      :isOpen="isModalOpen"
      :tasks="data as (Task & { id: string })[]"
      @close="closeModal"
      @save="handleSave"
      @delete="handleDelete"
      @complete="handleComplete"
      @navigate="handleNavigate"
    />
  </div>
</template>

<style lang="scss" scoped>
div {
  p {
    background-color: blue;
  }
}
</style>
