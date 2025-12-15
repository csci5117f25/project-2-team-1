<script lang="ts" setup>
import { ref } from "vue";
import Navbar from "@/components/NavbarComponent.vue";
import TaskDetailsModal from "@/components/TaskDetailsModal.vue";
import {
  getUserTasks,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  isCompletedToday,
} from "@/database/database";
import StreakWidget from "@/components/StreakWidget.vue";
import type Task from "@/interfaces/Task";

const data = await getUserTasks();
const selectedTask = ref<(Task & { id: string }) | null>(null);
const isModalOpen = ref(false);

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

const handleSave = async (updatedTask: {
  name: string;
  icon: string;
  frequency: string;
  id: string;
}) => {
  await updateTask(updatedTask.id, updatedTask);
  closeModal();
};

async function handleDelete(taskId: string) {
  await deleteTask(taskId);

  closeModal();
}

async function handleComplete(taskId: string) {
  await toggleTaskComplete(taskId);
}
</script>
<template>
  <div>
    <Navbar />

    <div class="mobile-container">
      <div>
        <StreakWidget />
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
            @click.stop="handleComplete(task.id)"
            :checked="isCompletedToday(task)"
          />
          <span @click.stop class="checkmark"></span>
        </label>
      </div>
    </div>

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

<style scoped lang="scss">
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
