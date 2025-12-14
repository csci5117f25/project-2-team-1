<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import Navbar from "@/components/NavbarComponent.vue";
import ContributionGraph from "@/components/ContributionGraph.vue";
import {
  createTask,
  updateTask,
  markTaskComplete,
  getUserTasks,
  isCompletedToday,
} from "@/database/database";
import type Task from "@/interfaces/Task";
import { doc } from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { useDocument, useCurrentUser } from "vuefire";
import { db } from "../../firebase_conf";
import EmojiPicker from "vue3-emoji-picker";
import StreakWidget from "@/components/StreakWidget.vue";
import "/node_modules/vue3-emoji-picker/dist/style.css";

const showEmojiPicker = ref(false);

const draftTask = ref<Task | null>(null);
const draftInput = ref<HTMLInputElement | null>(null);

const user = useCurrentUser();

const statsDocRef = computed(() => {
  if (!user.value) return null;
  return doc(db, "users", user.value.uid, "stats", "current");
});

const tasks = await getUserTasks();
const statsRef = useDocument<{ xp: number }>(statsDocRef);

// leveling calculations
const currentXP = computed(() => statsRef.value?.xp || 0);
const currentLevel = computed(() => Math.floor(currentXP.value / 100) + 1);
const xpForNextLevel = computed(() => currentLevel.value * 100);
const progressPercent = computed(() => currentXP.value % 100);

const toggleTaskCreation = async () => {
  if (draftTask.value) {
    draftTask.value = null;
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
  await createTask(draftTask.value);
  draftTask.value = null;
};

const cycleDraftFrequency = () => {
  if (draftTask.value) {
    draftTask.value.frequency = draftTask.value.frequency === "daily" ? "monthly" : "daily";
  }
};

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

      <div class="card stats-card">
        <div class="stats-header">
          <div class="level-badge">
            <span class="level-label">Level</span>
            <span class="level-number">{{ currentLevel }}</span>
          </div>
          <div class="xp-text">
            <strong>{{ currentXP }}</strong> <span class="muted">/ {{ xpForNextLevel }} XP</span>
          </div>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
      </div>

      <div class="card graph-card">
        <ContributionGraph />
      </div>

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

      <div class="task-list">
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
              class="task-name"
              type="text"
              v-model="draftTask.name"
              placeholder="What do you need to do?"
              @keydown.enter="saveDraft"
              @keydown.esc="toggleTaskCreation"
            />
            <button class="freq-badge" @click="cycleDraftFrequency">
              {{ draftTask.frequency }}
            </button>
          </div>
        </div>

        <div
          v-for="task in tasks"
          :key="task.id"
          class="task-card"
          :class="{ completed: isCompletedToday(task) }"
        >
          <div class="checkbox-container">
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
              class="task-name"
              type="text"
              :value="task.name"
              placeholder="Task name..."
              @input="(e) => updateTaskName(task, (e.target as HTMLInputElement).value)"
            />
            <button class="freq-badge" @click="cycleFrequency(task)">
              {{ task.frequency }}
            </button>
          </div>
        </div>

        <div v-if="tasks?.length === 0 && !draftTask" class="placeholder-state">
          <p>No tasks yet. Create one to get started!</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
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

.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 2rem;
}

.stats-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.level-badge {
  display: flex;
  flex-direction: column;
  .level-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
  }
  .level-number {
    font-size: 2.5rem;
    font-weight: 600;
    line-height: 1;
    color: var(--accent-color-primary);
  }
}

.xp-text {
  font-size: 0.9rem;
  color: #333;
  .muted {
    color: #999;
  }
}

.progress-bar-container {
  height: 12px;
  background-color: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  // @mark i swear to god this is from the dome 😭 prog bar NEEDS it
  background: linear-gradient(90deg, var(--accent-color-secondary), var(--accent-color-primary));
  transition: width 0.3s ease;
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
    background-color: #ed3c4b;
    &:hover {
      background-color: #df3e16;
    }
  }
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.task-emoji {
  font-size: 1.5rem;
}

.emoji-picker-wrapper {
  position: absolute;
  top: -260px;
  left: 0;
}
</style>
