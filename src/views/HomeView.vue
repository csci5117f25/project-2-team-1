<script lang="ts" setup>
import { ref } from "vue";
import Navbar from "@/components/NavbarComponent.vue";
import TaskDetailsModal from "@/components/TaskDetailsModal.vue";
import { getUserTasks, createTask, updateTask, deleteTask, markTaskComplete } from "@/database/database";
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

async function handleSave(updatedTask: Task & { id: string }) {
  await updateTask(updatedTask.id, updatedTask);
  closeModal();
}

async function handleDelete(taskId: string) {
  await deleteTask(taskId);

  closeModal();
}

async function handleComplete(taskId: string) {

  await markTaskComplete(taskId);
}

function isCompletedToday(lastCompleted: string): boolean {
  if (!lastCompleted) {
    return false;
  }

  const lastCompletedObj = new Date(lastCompleted);
  const today = new Date();

  lastCompletedObj.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return (
    lastCompletedObj.getFullYear() === today.getFullYear() &&
    lastCompletedObj.getMonth() === today.getMonth() &&
    lastCompletedObj.getDate() === today.getDate()
  );
}
</script>
<template>
  <div>
    <Navbar />
    <div class="mobile-container">
      <div>
        <p>Current Streak: {{}}</p>
      </div>
      <div
        v-for="task in data"
        :key="task.id"
        class="home-task"
        @click="openTaskModal(task as Task & { id: string })"
      >
        <label @click.stop class="container"
          >{{ task.name }}
          <input
            type="checkbox"
            @click.stop="console.log('hello')"
            :checked="isCompletedToday(task.last_completed_time)"
          />
          <span @click.stop class="checkmark"></span>
        </label>
      </div>
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
.home-task {
  background-color: white;
  box-shadow: 0.3rem 0.4rem 0.5rem rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  padding: 1rem;
  width: 100%;
  max-width: 30rem;

  &:hover {
    background-color: #eee5ff;
    transition: 0.5s;
    cursor: pointer;
  }
}

/* https://www.w3schools.com/howto/howto_css_custom_checkbox.asp */
.container {
  min-height: 24px;
  display: inline-block;
  align-items: center;
  position: relative;
  padding-left: 35px;
  cursor: pointer;
  font-size: 1rem;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;

    &:checked ~ .checkmark {
      background-color: var(--accent-color-primary);

      &:after {
        display: block;
      }
    }

    &:checked ~ .checkmark {
      background-color: var(--accent-color-primary);
    }
  }

  &:hover {
    input ~ .checkmark {
      background-color: #ccc;
    }

    input:checked ~ .checkmark {
      background-color: var(--accent-color-secondary);
    }
  }

  .checkmark:after {
    left: 9px;
    top: 5px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 3px 3px 0;
    -webkit-transform: rotate(45deg);
    -ms-transform: rotate(45deg);
    transform: rotate(45deg);
  }
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 1.5rem;
  width: 1.5rem;
  background-color: #eee;
  border-radius: 0.5rem;
  box-shadow: 0.2rem 0.3rem 0.5rem rgba(0, 0, 0, 0.3);

  &:after {
    content: "";
    position: absolute;
    display: none;
  }
}
</style>
