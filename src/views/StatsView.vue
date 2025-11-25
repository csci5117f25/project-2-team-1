<script setup lang="ts">
import { computed } from "vue";
import { useCurrentUser, useFirestore, useCollection } from "vuefire";
import { collection, query } from "firebase/firestore";
import Navbar from "@/components/NavbarComponent.vue";

const user = useCurrentUser();
const db = useFirestore();

// fetch user's tasks from firestore
const tasksQuery = computed(() =>
  user.value?.uid ? query(collection(db, "users", user.value.uid, "tasks")) : null
);
const userTasks = useCollection(tasksQuery);

// mock data for testing
const mockTasks = [
  { id: "1", name: "Morning workout", frequency: "Daily", xp: 50, completed: true },
  { id: "2", name: "Read for 30 minutes", frequency: "Daily", xp: 30, completed: false },
  { id: "3", name: "Weekly review", frequency: "Weekly", xp: 100, completed: true },
];

// show real tasks if available, otherwise show mock data
const displayTasks = computed(() => (userTasks.value?.length ? userTasks.value : mockTasks));

// format current date for display
const currentDate = computed(() =>
  new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
);

const contributions = computed(() => {
  const today = new Date();

  // calc start date
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const startDate = new Date(sixMonthsAgo);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // calc total number weeks to display
  const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
  const totalWeeks = Math.ceil((today.getTime() - startDate.getTime()) / millisecondsPerWeek);

  // build contribution grid
  const monthsData: any[] = [];
  let currentMonthLabel = "";
  let currentMonthWeeks: any[] = [];

  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
    // calc start of this week
    const weekStartDate = new Date(startDate.getTime() + weekIndex * millisecondsPerWeek);
    const monthLabel = weekStartDate.toLocaleDateString("en-US", { month: "short" });

    // create 7 days for this week (random for now lol)
    const weekDays = Array.from({ length: 7 }, (_, dayIndex) => {
      const dayDate = new Date(weekStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000);
      const randomActivity = Math.random() > 0.7 ? Math.floor(Math.random() * 100) : 0;

      return {
        date: dayDate,
        completionPercent: randomActivity,
      };
    });

    // when month changes, save previous month's data
    if (monthLabel !== currentMonthLabel && weekIndex > 0) {
      monthsData.push({
        month: currentMonthLabel,
        weeks: currentMonthWeeks,
      });
      currentMonthWeeks = [];
    }

    currentMonthLabel = monthLabel;
    currentMonthWeeks.push(weekDays);
  }

  // push last month's data
  if (currentMonthWeeks.length) {
    monthsData.push({
      month: currentMonthLabel,
      weeks: currentMonthWeeks,
    });
  }
  return monthsData;
});

const getCellColor = (percent: number) => {
  if (percent === 0) return "";
  if (percent <= 33) return "low";
  if (percent <= 66) return "mid";
  return "high";
};
</script>

<template>
  <div class="stats-view">
    <Navbar />
    <div class="container">
      <h2>{{ currentDate }}</h2>
      <div class="card">
        <div class="months">
          <div
            v-for="(monthData, index) in contributions"
            :key="index"
            :style="{ gridColumn: `span ${monthData.weeks.length}` }"
          >
            {{ monthData.month }}
          </div>
        </div>
        <div class="chart">
          <div class="labels">
            <span style="top: 11px">Mon</span>
            <span style="top: 37px">Wed</span>
            <span style="top: 63px">Fri</span>
          </div>

          <div class="calendar-container">
            <div class="calendar">
              <template v-for="(monthData, monthIndex) in contributions" :key="monthIndex">
                <div v-for="(weekDays, weekIndex) in monthData.weeks" :key="weekIndex" class="week">
                  <div
                    v-for="(day, dayIndex) in weekDays"
                    :key="dayIndex"
                    :class="['day', getCellColor(day.completionPercent)]"
                    :title="`${day.date.toDateString()}: ${day.completionPercent}%`"
                  ></div>
                </div>
              </template>
            </div>

            <div class="legend">
              <span>Less</span>
              <div class="day"></div>
              <div class="day low"></div>
              <div class="day mid"></div>
              <div class="day high"></div>
              <div class="day highest"></div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      <h2>Your tasks</h2>
      <div class="tasks">
        <div v-for="task in displayTasks" :key="task.id" class="task">
          <input type="checkbox" :checked="task.completed" />
          <span class="name">{{ task.name }}</span>
          <span class="freq">{{ task.frequency }}</span>
          <span class="xp">{{ task.xp }} XP</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stats-view {
  min-height: 100vh;
  background-color: var(--background-color);
}

.container {
  padding: 2rem 1rem 1rem;
  max-width: 600px;
  margin: 0 auto;
}

h2 {
  font-size: 1.3rem;
  color: var(--accent-color-quaternary);
  margin: 0 0 1rem;
}

.card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.months {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 13px;
  gap: 3px;
  margin: 0 0 4px 38px;
  font-size: 0.7rem;
  color: #666;
}

.chart {
  display: flex;
  gap: 8px;
}

.labels {
  width: 30px;
  font-size: 0.65rem;
  color: #666;
  position: relative;

  span {
    position: absolute;
    right: 0;
  }
}

.calendar-container {
  flex: 1;
}

.calendar {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 13px;
  gap: 3px;
}

.week {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.day {
  width: 10px;
  height: 10px;
  background: #ebedf0;
  border-radius: 2px;

  &.low {
    background: var(--accent-color-tertiary);
  }
  &.mid {
    background: var(--accent-color-secondary);
  }
  &.high {
    background: var(--accent-color-primary);
  }
}

.legend {
  display: flex;
  align-items: center;
  gap: 3px;
  justify-content: flex-end;
  font-size: 0.7rem;
  color: #666;
  margin-top: 0.75rem;
}

.tasks {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.task {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.9rem;
  background: white;
  border-radius: 8px;

  .name {
    flex: 1;
    font-weight: 500;
  }
  .freq {
    font-size: 0.8rem;
    color: #666;
    padding: 0.2rem 0.5rem;
    background: #f5f5f5;
    border-radius: 4px;
  }
  .xp {
    font-weight: bold;
    color: var(--accent-color-primary);
    font-size: 0.9rem;
  }
}
</style>
