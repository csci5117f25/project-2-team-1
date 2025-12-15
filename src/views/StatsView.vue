<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import Navbar from "@/components/NavbarComponent.vue";
import ContributionGraph from "@/components/ContributionGraph.vue";
import type Task from "@/interfaces/Task";
import { doc } from "firebase/firestore";
import { useDocument, useCurrentUser } from "vuefire";
import { db } from "../../firebase_conf";
import EmojiPicker from "vue3-emoji-picker";
import StreakWidget from "@/components/StreakWidget.vue";
import "/node_modules/vue3-emoji-picker/dist/style.css";
import TaskList from "@/components/TaskList.vue";
import { createTask } from "@/database/database";

const showEmojiPicker = ref(false);

const draftTask = ref<Task | null>(null);
const draftInput = ref<HTMLInputElement | null>(null);

const selectedTask = ref<(Task & { id: string }) | null>(null);
const isModalOpen = ref(false);

const user = useCurrentUser();

const statsDocRef = computed(() => {
  if (!user.value) return null;
  return doc(db, "users", user.value.uid, "stats", "current");
});

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
</script>

<template>
  <div class="page-wrapper">
    <Navbar />

    <div class="content-container">
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

      <TaskList :statsView="true" :draftTask="draftTask">
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
      </TaskList>
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
</style>
