<script lang="ts" setup>
import { ref, computed, nextTick } from "vue";
import TaskDetailsModal from "./TaskDetailsModal.vue";
import {
  getUserTasks,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  isCompletedToday,
  createTask,
  getPreMadeTasks,
} from "@/database/database";
import type Task from "@/interfaces/Task";
import EmojiPicker from "vue3-emoji-picker";
import "/node_modules/vue3-emoji-picker/dist/style.css";

const preMadeTasks = ref(await getPreMadeTasks());
console.log(preMadeTasks.value);
const showEmojiPicker = ref(false);
const draftTask = ref<Task | null>(null);
const draftInput = ref<HTMLInputElement | null>(null);
const selectedInput = ref("");
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

const toggleTaskCreation = async () => {
  if (draftTask.value) {
    draftTask.value = null;
    selectedInput.value = "";
  } else {
    draftTask.value = {
      frequency: "daily",
      name: "",
      icon: "",
      last_completed_time: 0,
      current_streak: 0,
      xp: 10,
      created_at: Date.now(),
    };
    await nextTick();
    draftInput.value?.focus();
  }
};

const saveDraft = async () => {
  if (!draftTask.value?.name.trim()) return;

  console.log(draftTask.value);
  await createTask(draftTask.value);

  draftTask.value = null;
  selectedInput.value = "";
};

const handlePresetSelect = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  if (target.value && draftTask.value) {
    draftTask.value.name = target.value;
    selectedInput.value = "";
    nextTick(() => {
      draftInput.value?.focus();
    });
  }
};

const cycleDraftFrequency = () => {
  if (draftTask.value) {
    draftTask.value.frequency = draftTask.value.frequency === "daily" ? "monthly" : "daily";
  }
};
</script>

<template>
  <div class="task-list">
    <div class="section-header">
      <h2>Your Tasks</h2>
      <button
        class="add-btn"
        @click="toggleTaskCreation"
        :class="{ 'cancel-mode': draftTask }"
        aria-label="Add new task"
      >
        <i class="fa-solid" :class="draftTask ? 'fa-xmark' : 'fa-plus'"></i>
      </button>
    </div>

    <div v-if="draftTask" class="task-card draft-card">
      <div class="checkbox-container">
        <button class="icon-btn save-btn" @click="saveDraft" title="Save Task">
          <i class="fa-solid fa-check"></i>
        </button>
      </div>

      <button class="emoji-trigger" @click="showEmojiPicker = !showEmojiPicker">
        {{ draftTask.icon || "😎" }}
      </button>

      <div v-if="showEmojiPicker" class="emoji-picker-wrapper">
        <EmojiPicker
          @select="
            (e: { i: string }) => {
              draftTask!.icon = e.i;
              showEmojiPicker = false;
            }
          "
        ></EmojiPicker>
      </div>

      <div class="task-details">
        <input
          ref="draftInput"
          class="task-input"
          type="text"
          v-model="draftTask.name"
          placeholder="What do you need to do?"
          @keydown.enter="saveDraft"
          @keydown.esc="toggleTaskCreation"
        />

        <select @change="handlePresetSelect" v-model="selectedInput" class="task-ideas-dropdown">
          <option value="" disabled selected>Task Ideas</option>

          <template :key="category.name" v-for="category in preMadeTasks">
            <option disabled :value="category.name">{{ category.name }}</option>
            <option v-for="item in category.items" :value="item" :key="item">
              {{ item }}
            </option>
          </template>
        </select>

        <button class="freq-badge" @click="cycleDraftFrequency">
          {{ draftTask.frequency }}
        </button>
      </div>
    </div>

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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;

  h2 {
    font-size: 1.4rem;
    color: var(--accent-color-quaternary);
    margin: 0;
  }
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
    background-color: var(--danger-color);

    &:hover {
      background-color: var(--danger-color-hover);
    }
  }
}

.draft-card {
  position: relative;
  background: white;
  padding: 1.25rem;
  border-radius: 12px;
  display: flex;
  gap: 1rem;
  align-items: center;
  border: 2px solid var(--accent-color-tertiary);
  cursor: default;
  margin-bottom: 1rem;
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

.emoji-trigger {
  font-size: 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
}

.emoji-picker-wrapper {
  position: absolute;
  top: -260px;
  left: 50px;
  z-index: 1000;
}

.task-input {
  flex: 1;
  border: none;
  font-size: 1rem;
  font-family: inherit;
  background: transparent;
  outline: none;
  padding: 0.4rem 0.2rem;

  &:focus {
    border-bottom: 2px solid var(--accent-color-tertiary);
  }
}

.task-dropdown {
  flex: 1;
  font-size: 1rem;
  font-family: inherit;
  background: url("data:image/svg+xml,<svg height='10px' width='10px' viewBox='0 0 16 16' fill='%23000000' xmlns='http://www.w3.org/2000/svg'><path d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/></svg>")
    no-repeat;
  background-position: calc(100% - 0.5rem) center;
  -moz-appearance: none;
  -webkit-appearance: none;
  appearance: none;
  padding: 0.4rem 2rem 0.4rem 0.2rem;
  border: none;
  outline: none;
  cursor: pointer;

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

.task-input {
  flex: 2;
  min-width: 150px;
  border: none;
  font-size: 1rem;
  font-family: inherit;
  background: transparent;
  outline: none;
  padding: 0.4rem 0.2rem;

  &:focus {
    border-bottom: 2px solid var(--accent-color-tertiary);
  }
}

.task-ideas-dropdown {
  flex: 1;
  min-width: 120px;
  font-size: 0.9rem;
  font-family: inherit;
  background: url("data:image/svg+xml,<svg height='10px' width='10px' viewBox='0 0 16 16' fill='%23000000' xmlns='http://www.w3.org/2000/svg'><path d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/></svg>")
    no-repeat;
  background-position: calc(100% - 0.5rem) center;
  -moz-appearance: none;
  -webkit-appearance: none;
  appearance: none;
  padding: 0.4rem 1.5rem 0.4rem 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  color: #666;
  background-color: #f8f8f8;

  &:hover {
    background-color: #f0f0f0;
  }

  &:focus {
    border-color: var(--accent-color-tertiary);
  }
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
