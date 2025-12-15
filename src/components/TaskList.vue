<script lang="ts" setup>
import {
  deleteTask,
  getUserTasks,
  isCompletedToday,
  markTaskComplete,
  updateTask,
} from "@/database/database";
import type Task from "@/interfaces/Task";
import TaskDetailsModal from "./TaskDetailsModal.vue";
import type { DocumentData } from "firebase/firestore";
import { ref } from "vue";

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

  closeModal();
}

defineProps(["statsView", "draftTask"]);
const tasks = await getUserTasks();

const updateTaskName = (task: DocumentData, newName: string) => {
  updateTask(task.id, { name: newName });
};

const cycleFrequency = (task: DocumentData) => {
  const next = task.frequency === "daily" ? "monthly" : "daily";
  updateTask(task.id, { frequency: next });
};

const handleCheck = (task: DocumentData, isChecked: boolean) => {
  if (isChecked) {
    markTaskComplete(task.id);
  }
};
</script>

<template>
  <div class="task-list">
    <slot></slot>
    <!-- Extra functionality can be injected etc creating new tasks -->

    <div
      v-for="task in tasks"
      :key="task.id"
      class="task-card"
      :class="{ completed: !statsView ? isCompletedToday(task) : false }"
    >
      <div v-if="!statsView" class="checkbox-container">
        <input
          type="checkbox"
          :checked="isCompletedToday(task)"
          :disabled="isCompletedToday(task)"
          @change="(e) => handleCheck(task, (e.target as HTMLInputElement).checked)"
        />
      </div>

      <span class="task-emoji">
        {{ task.icon }}
      </span>

      <div class="task-details">
        <input
          v-if="statsView"
          class="task-name"
          type="text"
          :value="task.name"
          placeholder="Task name..."
          @input="(e) => updateTaskName(task, (e.target as HTMLInputElement).value)"
        />
        <span class="task-name" v-else @click="openTaskModal(task as Task & { id: string })">
          {{ task.name }}
        </span>
        <button v-if="statsView" class="freq-badge" @click="cycleFrequency(task)">
          {{ task.frequency }}
        </button>
      </div>
    </div>

    <TaskDetailsModal
      v-if="!statsView"
      :task="selectedTask"
      :isOpen="isModalOpen"
      :tasks="tasks as (Task & { id: string })[]"
      @close="closeModal"
      @save="handleSave"
      @delete="handleDelete"
      @complete="handleComplete"
      @navigate="handleNavigate"
    />

    <div v-if="tasks?.length === 0 && !draftTask" class="placeholder-state">
      <p>No tasks yet. Create one to get started!</p>
    </div>
  </div>
</template>

<style lang="scss">
.task-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-name {
  width: 100%;
}

.task-emoji {
  font-size: 1.5rem;
}

.emoji-picker-wrapper {
  position: absolute;
  top: -260px;
  left: 0;
}

.add-btn {
  background-color: var(--accent-color-primary);
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  transition: background-color 0.2s;

  &:hover {
    background-color: var(--accent-color-quaternary);
  }

  &.cancel-mode {
    background-color: #ed3c4b;
    &:hover {
      background-color: #df3e16;
    }
  }
}

.task-card {
  position: relative;
  background: white;
  padding: 1rem;
  border-radius: 10px;
  display: flex;
  gap: 1rem;
  align-items: center;
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &.completed {
    background-color: #f8f9fa;
    opacity: 0.85;
    .task-name {
      text-decoration: line-through;
      color: #999;
    }
  }

  &.draft-card {
    border: 2px solid var(--accent-color-tertiary);
    z-index: 10;
  }
}

.checkbox-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;

  input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent-color-primary);
    cursor: pointer;
  }
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 1.1rem;

  &.save-btn {
    color: var(--accent-color-primary);
    &:hover {
      color: var(--accent-color-quaternary);
    }
  }
}

.task-details {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.task-name {
  border: none;
  font-size: 1rem;
  font-family: inherit;
  width: 100%;
  background: transparent;
  outline: none;
  padding: 0.4rem 0.2rem;

  &:focus {
    border-bottom: 2px solid var(--accent-color-tertiary);
  }
}

.freq-badge {
  background: #f0f0f0;
  border: none;
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  color: #666;
  text-transform: capitalize;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;

  &:hover {
    background: #e0e0e0;
  }
}

.placeholder-state {
  text-align: center;
  color: #999;
  padding: 2rem;
  background: white;
  border-radius: 10px;
}

@media (max-width: 480px) {
  .date-header {
    font-size: 1.2rem;
  }
  .task-card {
    padding: 0.8rem;
  }
  .task-name {
    font-size: 0.95rem;
  }
  .freq-badge {
    padding: 0.2rem 0.6rem;
    font-size: 0.7rem;
  }
}
</style>
