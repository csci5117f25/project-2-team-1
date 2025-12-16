<script lang="ts" setup>
import { ref, computed } from "vue";
import TaskDetailsModal from "./TaskDetailsModal.vue";
import {
  getUserTasks,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  isCompletedToday,
} from "@/database/database";
import type Task from "@/interfaces/Task";

const selectedTask = ref<(Task & { id: string }) | null>(null);
const isModalOpen = ref(false);

// https://vueschool.io/articles/vuejs-tutorials/what-is-a-race-condition-in-vue-js/
const pendingToggles = ref<Map<string, number>>(new Map());
const optimisticStates = ref<Map<string, boolean>>(new Map());
const lastOperationTime = ref<number>(0);
const MIN_OPERATION_INTERVAL = 100;

const tasksData = await getUserTasks();

const getCompletionState = (task: Task & { id: string }): boolean => {
  const taskId = task.id;
  if (optimisticStates.value.has(taskId)) {
    return optimisticStates.value.get(taskId)!;
  }
  return isCompletedToday(task);
};

const isPending = (taskId: string): boolean => {
  return pendingToggles.value.has(taskId);
};

const sortedTasks = computed<(Task & { id: string })[]>(() => {
  const taskList = (tasksData?.value || []) as (Task & { id: string })[];
  if (taskList.length === 0) return [];

  return [...taskList].sort((a, b) => {
    const aComplete = getCompletionState(a);
    const bComplete = getCompletionState(b);
    if (aComplete === bComplete) return 0;
    return aComplete ? 1 : -1;
  });
});

const handleCheck = async (taskId: string) => {
  const now = Date.now();

  // global rate limit
  if (now - lastOperationTime.value < MIN_OPERATION_INTERVAL) {
    return;
  }

  // per-task rate limit
  if (pendingToggles.value.has(taskId)) {
    const pendingTime = pendingToggles.value.get(taskId)!;
    if (now - pendingTime < 800) {
      return;
    }
  }

  const taskList = (tasksData?.value || []) as (Task & { id: string })[];
  const task = taskList.find((t) => t.id === taskId);
  if (!task) return;

  const currentState = getCompletionState(task);
  const newState = !currentState;

  lastOperationTime.value = now;
  pendingToggles.value.set(taskId, now);

  // optimistic ui update
  optimisticStates.value.set(taskId, newState);

  try {
    await toggleTaskComplete(taskId);
    await new Promise((resolve) => setTimeout(resolve, 550));
  } catch (error) {
    console.error("Error toggling task:", error);
    // rollback on error
    optimisticStates.value.set(taskId, currentState);
    await new Promise((resolve) => setTimeout(resolve, 300));
  } finally {
    setTimeout(() => {
      optimisticStates.value.delete(taskId);
      pendingToggles.value.delete(taskId);
    }, 250);
  }
};

const openTaskModal = (task: Task & { id: string }) => {
  selectedTask.value = { ...task, id: task.id };
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedTask.value = null;
};

const handleSave = async (updatedTask: {
  name: string;
  icon: string;
  frequency: string;
  id: string;
}) => {
  await updateTask(updatedTask.id, updatedTask);
  closeModal();
};

const handleDelete = async (taskId: string) => {
  await deleteTask(taskId);
  closeModal();
};

const handleComplete = async (taskId: string) => {
  await handleCheck(taskId);
};

const handleNavigate = (task: Task & { id: string }) => {
  selectedTask.value = { ...task, id: task.id };
};

const handleTaskCardClick = (task: Task & { id: string }, event: MouseEvent) => {
  const target = event.target as HTMLElement;

  if (target.closest(".menu-btn")) {
    return;
  }

  handleCheck(task.id);
};
</script>

<template>
  <div class="task-list">
    <slot></slot>

    <transition-group name="task-move" tag="div" class="tasks-container">
      <div
        v-for="task in sortedTasks"
        :key="task.id"
        class="task-card"
        :class="{
          completed: getCompletionState(task),
          pending: isPending(task.id),
        }"
        @click="handleTaskCardClick(task, $event)"
      >
        <div class="checkbox-container">
          <input
            type="checkbox"
            :checked="getCompletionState(task)"
            @click.stop="handleCheck(task.id)"
          />
        </div>

        <span class="task-emoji">
          {{ task.icon }}
        </span>

        <div class="task-details">
          <span class="task-name">{{ task.name }}</span>
        </div>

        <button class="menu-btn" @click.stop="openTaskModal(task)" title="Task details">
          <i class="fa-solid fa-ellipsis"></i>
        </button>
      </div>
    </transition-group>

    <div v-if="sortedTasks.length === 0" class="placeholder-state">
      <p>No tasks yet. Create one to get started!</p>
    </div>
  </div>

  <TaskDetailsModal
    :task="selectedTask"
    :isOpen="isModalOpen"
    :tasks="sortedTasks"
    @close="closeModal"
    @save="handleSave"
    @delete="handleDelete"
    @complete="handleComplete"
    @navigate="handleNavigate"
  />
</template>

<style scoped lang="scss">
.task-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tasks-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-move-move {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-move-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-move-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  width: calc(100% - 2rem);
}

.task-move-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.task-move-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.task-card {
  position: relative;
  background: white;
  padding: 1.25rem;
  border-radius: 12px;
  display: flex;
  gap: 1rem;
  align-items: center;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    background-color 0.3s ease,
    opacity 0.3s ease;

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

  &.pending {
    .checkbox-container input {
      pointer-events: none;
      opacity: 0.6;
    }
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

.task-emoji {
  font-size: 1.5rem;
}

.task-details {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  overflow: hidden;
}

.task-name {
  font-size: 1rem;
  font-family: inherit;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #999;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  width: 32px;
  height: 32px;

  &:hover {
    background-color: #f0f0f0;
    color: var(--accent-color-primary);
  }

  &:active {
    transform: scale(0.95);
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
  .task-card {
    padding: 0.8rem;
  }

  .task-name {
    font-size: 0.95rem;
  }
}
</style>
