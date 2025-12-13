<script setup lang="ts">
import { ref, watch, computed, nextTick } from "vue";
import type Task from "@/interfaces/Task";

const props = defineProps<{
  task: (Task & { id: string }) | null; // firestore documents will include ids
  isOpen: boolean;
  tasks?: (Task & { id: string })[]; // all tasks for navigation
}>();

const emit = defineEmits<{
  close: [];
  save: [task: Task & { id: string }];
  delete: [taskId: string];
  complete: [taskId: string];
  navigate: [task: Task & { id: string }];
}>();

const overlayRef = ref<HTMLDivElement | null>(null);
const editedTask = ref<(Task & { id: string }) | null>(null);
const isCompleting = ref(false);
const slideDirection = ref<"left" | "right" | null>(null);
const isSlidingOut = ref(false);
const completeTimeoutId = ref(-1);

// watch for changes to task to update editedTask accordingly
watch(
  () => props.task,
  (newTask) => {
    if (isSlidingOut.value) {
      editedTask.value = newTask ? { ...newTask } : null;
      isCompleting.value = false;
      isSlidingOut.value = false;
      setTimeout(() => (slideDirection.value = null), 150);
    } else {
      editedTask.value = newTask ? { ...newTask } : null;
      isCompleting.value = false;
      slideDirection.value = null;
    }
  },
  { immediate: true }
);

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick(); // waits until Vue has rendered modal
      overlayRef.value?.focus();
    }
  }
);

function handleSave() {
  if (editedTask.value) {
    emit("save", editedTask.value);
  }
}

function handleDelete() {
  if (props.task && confirm("Are you sure you want to delete this task?")) {
    emit("delete", props.task.id);
  }
}

function handleClose() {
  emit("close");
}

function handleComplete() {
  isCompleting.value = !isCompleting.value;
  if (completeTimeoutId.value !== -1) {
    clearTimeout(completeTimeoutId.value);
    completeTimeoutId.value = -1;
  } else {
    completeTimeoutId.value = setTimeout(() => {
      if (props.task) {
        completeTimeoutId.value = -1;
        handleClose();
        emit("complete", props.task.id);
      }
    }, 1000);
  }
}

// Close on background click
function handleBackgroundClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleClose();
  }
}

// Close on Escape key
function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    handleClose();
  }
}

// Helpers for navigating left + right between tasks
const currentTaskIndex = computed(() => {
  if (!props.task || !props.tasks || props.tasks.length === 0) {
    return -1;
  }
  return props.tasks.findIndex((t) => t.id === props.task!.id);
});

const hasPreviousTask = computed(() => {
  return currentTaskIndex.value > 0;
});

const hasNextTask = computed(() => {
  return (
    currentTaskIndex.value >= 0 && props.tasks && currentTaskIndex.value < props.tasks.length - 1
  );
});

function handlePreviousTask() {
  if (hasPreviousTask.value && props.tasks) {
    slideDirection.value = "left";
    isSlidingOut.value = true;
    const prevTask = props.tasks[currentTaskIndex.value - 1];
    if (prevTask) {
      setTimeout(() => emit("navigate", prevTask), 150);
    }
  }
}

function handleNextTask() {
  if (hasNextTask.value && props.tasks) {
    slideDirection.value = "right";
    isSlidingOut.value = true;
    const nextTask = props.tasks[currentTaskIndex.value + 1];
    if (nextTask) {
      setTimeout(() => emit("navigate", nextTask), 150);
    }
  }
}
</script>

<template>
  <div
    v-if="isOpen && editedTask"
    ref="overlayRef"
    class="modal-overlay"
    tabindex="-1"
    @click="handleBackgroundClick"
    @keydown="handleKeydown"
  >
    <button
      v-if="hasPreviousTask"
      class="nav-arrow nav-arrow-left"
      @click.stop="handlePreviousTask"
    >
      <!-- https://www.compart.com/en/unicode/U+2039 -->
      &#8249;
    </button>
    <div
      class="modal-content"
      :key="props.task?.id"
      :class="{
        'slide-out-left': slideDirection === 'right' && isSlidingOut,
        'slide-out-right': slideDirection === 'left' && isSlidingOut,
        'slide-in-left': slideDirection === 'left' && !isSlidingOut,
        'slide-in-right': slideDirection === 'right' && !isSlidingOut,
      }"
    >
      <div class="modal-header">
        <h2>Task Details</h2>
        <button class="close-btn" @click="handleClose">
          &#x2715;
          <!-- icon credit https://stackoverflow.com/questions/5353461/unicode-character-for-x-cancel-close-->
        </button>
      </div>

      <div class="modal-body">
        <div class="field-group">
          <button
            class="complete-toggle-btn"
            :class="{ active: isCompleting }"
            @click="handleComplete"
          >
            {{ isCompleting ? "Completed!" : "Complete for Today" }}
          </button>
        </div>

        <div class="field-group">
          <label for="task-name">Task Name</label>
          <input
            id="task-name"
            v-model="editedTask.name"
            type="text"
            placeholder="Task name"
            required
          />
        </div>

        <div class="field-group">
          <label for="task-frequency">Frequency</label>
          <input
            id="task-frequency"
            v-model="editedTask.frequency"
            type="text"
            placeholder="e.g., daily, weekly, monthly"
          />
        </div>

        <div class="field-group">
          <label for="task-icon">Icon</label>
          <input id="task-icon" v-model="editedTask.icon" type="text" placeholder="icon" />
        </div>

        <div class="stats-section">
          <h3>Statistics</h3>

          <div hidden>
            <!-- TODO: GitHub Contributions HeatMap thing here? -->
          </div>

          <div class="stat-item">
            <span class="stat-label">Current Streak:</span>
            <span class="stat-value">{{ editedTask.current_streak }} days 🔥</span>
          </div>

          <div class="stat-item">
            <span class="stat-label">XP Earned:</span>
            <!-- TODO: We might need a way to track cumulative xp, as this is probably xp per complete? -->
            <span class="stat-value">{{ editedTask.xp }}</span>
          </div>

          <div class="stat-item">
            <span class="stat-label">Last Completed:</span>
            <span class="stat-value">
              {{
                editedTask.last_completed_time
                  ? new Date(editedTask.last_completed_time).toLocaleDateString()
                  : "Never"
              }}
            </span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-delete" @click="handleDelete">Delete</button>
        <div class="right-actions">
          <button class="btn btn-secondary" @click="handleClose">Cancel</button>
          <button class="btn btn-primary" @click="handleSave">Save Changes</button>
        </div>
      </div>
    </div>
    <button v-if="hasNextTask" class="nav-arrow nav-arrow-right" @click.stop="handleNextTask">
      <!-- https://www.compart.com/en/unicode/U+203A -->
      &#8250;
    </button>
  </div>
</template>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  border: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 32px;
  color: var(--accent-color-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
  z-index: 1001;

  &:hover {
    background: var(--accent-color-primary);
    color: white;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: translateY(-50%) scale(0.95);
  }

  &.nav-arrow-left {
    left: calc(50% - 300px - 70px);
  }

  &.nav-arrow-right {
    left: calc(50% + 300px + 20px);
  }
}

@media (max-width: 750px) {
  .nav-arrow {
    top: auto;
    bottom: 50px;
    transform: none;
  }

  .nav-arrow.nav-arrow-left {
    left: calc(50% - 70px);
  }

  .nav-arrow.nav-arrow-right {
    left: calc(50% + 20px);
  }
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;

  &.slide-out-left {
    transform: translateX(-80px);
    opacity: 0;
  }

  &.slide-out-right {
    transform: translateX(80px);
    opacity: 0;
  }

  &.slide-in-left {
    animation: slideInFromLeft 0.15s ease forwards;
  }

  &.slide-in-right {
    animation: slideInFromRight 0.15s ease forwards;
  }
}

@keyframes slideInFromLeft {
  from {
    transform: translateX(-80px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideInFromRight {
  from {
    transform: translateX(80px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;

  h2 {
    margin: 0;
    color: var(--accent-color-quaternary);
    font-size: 26px;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 26px;
    cursor: pointer;
    color: #656464;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f0f0f0;
    }
  }
}

.modal-body {
  padding: 24px;
  overflow-y: auto;

  .field-group {
    margin-bottom: 20px;

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    input[type="text"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #dadada;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;

      &:focus {
        outline: none;
        border-color: var(--accent-color-primary);
        box-shadow: 0 0 0 3px rgba(127, 0, 191, 0.1);
      }
    }

    .complete-toggle-btn {
      width: 100%;
      padding: 12px 16px;
      background-color: #f0f9ff;
      border: 2px solid var(--accent-color-tertiary);
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      color: var(--accent-color-quaternary);
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        background-color: #e0f2fe;
        border-color: var(--accent-color-secondary);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      &.active {
        background-color: var(--accent-color-primary);
        border-color: var(--accent-color-primary);
        color: white;

        &:hover {
          background-color: var(--accent-color-secondary);
          border-color: var(--accent-color-secondary);
        }
      }
    }
  }

  .stats-section {
    margin-top: 24px;
    padding: 20px 20px 12px 20px;
    background-color: #f7f7f7;
    border-radius: 6px;
    border: 1px solid #e0e0e0;

    h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      color: var(--accent-color-quaternary);
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;

      &:not(:last-child) {
        border-bottom: 1px solid #e0e0e0;
      }

      .stat-label {
        font-weight: 600;
        color: #656464;
        font-size: 14px;
      }

      .stat-value {
        color: var(--accent-color-primary);
        font-weight: 600;
        font-size: 14px;
      }
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  background-color: #f7f7f7;
  border-radius: 0 0 12px 12px;

  .right-actions {
    display: flex;
    gap: 12px;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }

    &.btn-primary {
      background-color: var(--accent-color-primary);
      color: white;

      &:hover {
        background-color: var(--accent-color-quaternary);
      }
    }

    &.btn-secondary {
      background-color: #e0e0e0;
      color: #333333;

      &:hover {
        background-color: #d0d0d0;
      }
    }

    &.btn-delete {
      background-color: #dd3344;
      color: white;

      &:hover {
        background-color: #bd1f2f;
      }
    }
  }
}
</style>
