<script setup lang="ts">
import { computed, ref } from "vue";
import Navbar from "@/components/NavbarComponent.vue";
import ContributionGraph from "@/components/ContributionGraph.vue";
import type Task from "@/interfaces/Task";
import { doc } from "firebase/firestore";
import { useDocument, useCurrentUser } from "vuefire";
import { db } from "../../firebase_conf";
import StreakWidget from "@/components/StreakWidget.vue";
import "/node_modules/vue3-emoji-picker/dist/style.css";
import TaskList from "@/components/TaskList.vue";
import { getPreMadeTasks } from "@/database/database";
import html2canvas from "html2canvas";
import CustomButton from "@/components/CustomButton.vue";

const preMadeTasks = ref(await getPreMadeTasks());
console.log(preMadeTasks.value);

const draftTask = ref<Task | null>(null);
const userExportDiv = ref<HTMLElement | null>(null);

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

const handleUserExport = async () => {
  if (userExportDiv.value) {
    const canvas = await html2canvas(userExportDiv.value, { scale: 2 });
    const url = canvas.toDataURL();
    const a = document.createElement("a"); // https://stackoverflow.com/questions/11620698/how-to-trigger-a-file-download-when-clicking-an-html-button-or-javascript
    a.href = url;
    a.download = "GYST-stats-export.png";
    a.click();
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

      <div class="center-align-btn">
        <CustomButton class="share-button" @click="handleUserExport"
          >Share your stats<i class="fa-solid fa-share-from-square"></i
        ></CustomButton>
      </div>

      <TaskList :statsView="true" :draftTask="draftTask"> </TaskList>
    </div>
  </div>

  <div ref="userExportDiv" id="user-export-div" style="position: absolute; left: -9999px">
    <h1>Look at My Stats on GYST!</h1>
    <StreakWidget :isForDisplayCard="true" />
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
  </div>
</template>

<style scoped lang="scss">
.page-wrapper {
  min-height: 100vh;
  background-color: var(--background-color);
}

.share-button i {
  margin-left: 0.25rem;
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

.checkbox-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
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

.task-details {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.task-name {
  flex: 1;
  border: none;
  font-size: 1rem;
  font-family: inherit;
  background: transparent;
  outline: none;
  padding: 0.4rem 0.2rem;
  border-bottom: 2px solid var(--accent-color-tertiary);
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

.center-align-btn {
  display: flex;
  flex-direction: row;
  justify-content: center;
}

#user-export-div {
  h1 {
    color: var(--accent-color-primary);
  }

  width: 700px;
  height: 700px;
  background-color: var(--background-color);
  padding: 1rem;
  border: var(--accent-color-primary) 0.5rem solid;
}

@media (max-width: 768px) {
  .content-container {
    padding: 1rem 0.75rem;
  }

  .card {
    padding: 1.25rem;
  }

  .draft-card {
    padding: 1rem;
  }

  .task-details {
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .date-header {
    font-size: 1.2rem;
  }

  .draft-card {
    padding: 1rem;
    gap: 0.75rem;
  }

  .task-details {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .task-name {
    font-size: 0.95rem;
    flex-basis: 100%;
  }

  .emoji-trigger {
    font-size: 1.25rem;
    padding: 0.2rem 0.4rem;
    flex-shrink: 0;
    order: 1;
  }

  .freq-badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.6rem;
    flex-shrink: 0;
    order: 3;
  }

  .emoji-picker-wrapper {
    left: 0;
    top: -260px;
  }
}
</style>
