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
import { getPreMadeTasks } from "@/database/database";

const preMadeTasks = ref(await getPreMadeTasks());
console.log(preMadeTasks.value);

const showEmojiPicker = ref(false);

const draftTask = ref<Task | null>(null);
const draftInput = ref<HTMLInputElement | null>(null);
const showCustomInput = ref(true);
const customSelectValue = ref("");
const selectedInput = ref("");

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
  if (showCustomInput.value) {
    if (!draftTask.value?.name.trim()) return;
  } else {
    if (draftTask.value) {
      draftTask.value.name = selectedInput.value;
    }
  }
  if (draftTask.value) {
    console.log(draftTask.value);
    await createTask(draftTask.value);
  }
  draftTask.value = null;
  selectedInput.value = "custom";
  showCustomInput.value = true;
  customSelectValue.value = "";
};

const handleSelect = async (event: Event) => {
  const eventValue = (event.target as any).value;
  if (eventValue === "custom") {
    showCustomInput.value = true;
    customSelectValue.value = "";
    await nextTick();
    draftInput.value?.focus();
  }
};

const handleCustomInput = async () => {
  console.log(showCustomInput.value);
  if (showCustomInput.value) {
    if (draftTask.value) {
      customSelectValue.value = draftTask.value.name;
      showCustomInput.value = false;
    }
  }
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
              :class="`task-name ${showCustomInput ? 'input' : 'input-hidden'}`"
              type="text"
              v-model="draftTask.name"
              placeholder="What do you need to do?"
              @keydown.enter="saveDraft"
              @keydown.esc="toggleTaskCreation"
            />
            <select
              @focus="handleCustomInput"
              @change="handleSelect"
              v-model="selectedInput"
              :class="`dropdown task-name ${showCustomInput ? 'dropdown-hidden' : ''}`"
            >
              <option value="custom">{{ customSelectValue }}</option>

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
      </TaskList>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-wrapper {
  min-height: 100vh;
  background-color: var(--background-color);
}

.dropdown {
  // https://stackoverflow.com/questions/38788848/positioning-of-an-arrow-in-an-html-select
  background: url("data:image/svg+xml,<svg height='10px' width='10px' viewBox='0 0 16 16' fill='%23000000' xmlns='http://www.w3.org/2000/svg'><path d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/></svg>")
    no-repeat;
  background-position: calc(100% - 1.5rem) center !important;
  -moz-appearance: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
  padding-right: 2rem !important;
  border: none;
  outline: none;
  width: 100%;
}

.dropdown-hidden {
  width: 10%;
}

.input {
  width: 100%;
}

.input-hidden {
  display: none;
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
