<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { getCompletedTasks } from "@/database/database";
import type CompletedTask from "@/interfaces/CompletedTask";

interface Props {
  taskId?: string;
}

const props = defineProps<Props>();

const CELL_SIZE = 12;
const CELL_GAP = 4;
const WEEK_WIDTH = CELL_SIZE + CELL_GAP;
const MIN_WEEKS = 12;

const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const allCompletedTasks = ref<CompletedTask[]>([]);

const tooltip = ref({
  visible: false,
  text: "",
  x: 0,
  y: 0,
});

const updateWidth = () => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth;
  }
};

// Why did i agree to work on this dumb ahh github grid
// https://blog.logrocket.com/how-to-use-the-resizeobserver-api-a-tutorial-with-examples/
// https://dev.to/jamie_wang_5a76e661ad80fa/stop-using-resize-you-might-be-missing-out-on-resizeobserver-4b0g
let resizeObserver: ResizeObserver | null = null;
onMounted(async () => {
  if (containerRef.value) {
    updateWidth();
    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateWidth);
    });
    resizeObserver.observe(containerRef.value);
  }

  const dataRef = await getCompletedTasks();
  if (dataRef) {
    watch(
      dataRef,
      (newData) => {
        allCompletedTasks.value = newData || [];
      },
      { immediate: true }
    );
  }
});

onUnmounted(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value);
  }
});

const filteredTasks = computed(() => {
  if (!props.taskId) return allCompletedTasks.value;
  return allCompletedTasks.value.filter((t) => t.parent_id === props.taskId);
});

// map dates to completion counts
const completionMap = computed(() => {
  const map = new Map<string, number>();
  filteredTasks.value.forEach((task) => {
    if (task.completed_at) {
      const d = new Date(task.completed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
  });
  return map;
});

interface DayData {
  date: Date;
  count: number;
  level: number;
  dateString: string;
}

interface WeekData {
  days: DayData[];
  monthLabel: string | null;
}

// generate graph weeks based on container width
// https://bitsofco.de/github-contribution-graph-css-grid/
const graphData = computed(() => {
  const availableWidth = Math.max(0, containerWidth.value - 30);
  const calculatedWeeks = Math.floor(availableWidth / WEEK_WIDTH);
  const weeksToRender = Math.max(MIN_WEEKS, calculatedWeeks);

  const today = new Date();
  const weeks: WeekData[] = [];

  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - today.getDay());

  const graphStartDate = new Date(currentSunday);
  graphStartDate.setDate(graphStartDate.getDate() - (weeksToRender - 1) * 7);

  let lastMonthLabel = "";

  for (let w = 0; w < weeksToRender; w++) {
    const weekStart = new Date(graphStartDate);
    weekStart.setDate(graphStartDate.getDate() + w * 7);

    const days: DayData[] = [];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + d);

      const key = `${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;
      const count = completionMap.value.get(key) || 0;
      const isFuture = dayDate > today;

      let level = 0;
      if (count > 0) {
        if (count <= 1) level = 1;
        else if (count <= 2) level = 2;
        else if (count <= 3) level = 3;
        else level = 4;
      }

      days.push({
        date: dayDate,
        count,
        level: isFuture ? -1 : level,
        dateString: dayDate.toLocaleDateString(),
      });
    }

    let monthLabel = null;

    if (days[0]) {
      const firstDay = days[0].date;
      const currentMonthName = firstDay.toLocaleDateString("en-US", { month: "short" });
      const isStartOfMonth = firstDay.getDate() <= 7;

      if (isStartOfMonth && currentMonthName !== lastMonthLabel) {
        monthLabel = currentMonthName;
        lastMonthLabel = currentMonthName;
      } else if (w === 0) {
        const fourWeeksLater = new Date(firstDay);
        fourWeeksLater.setDate(firstDay.getDate() + 28);

        if (firstDay.getMonth() === fourWeeksLater.getMonth()) {
          monthLabel = currentMonthName;
          lastMonthLabel = currentMonthName;
        }
      }
    }

    weeks.push({ days, monthLabel });
  }

  return weeks;
});

const showTooltip = (event: MouseEvent, day: DayData) => {
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  // https://medium.com/@AlexanderObregon/how-getboundingclientrect-works-and-what-it-returns-e67f5b3700cf
  tooltip.value = {
    visible: true,
    text: `${day.dateString}: ${day.count} completions`,
    x: rect.left + rect.width / 2,
    y: rect.top - 8,
  };
};

const hideTooltip = () => {
  tooltip.value.visible = false;
};

const getLevelClass = (level: number) => {
  if (level === -1) return "future";
  if (level === 0) return "l0";
  if (level === 1) return "l1";
  if (level === 2) return "l2";
  if (level === 3) return "l3";
  return "l4";
};
</script>

<template>
  <div class="graph-wrapper">
    <div
      v-if="tooltip.visible"
      class="custom-tooltip"
      :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
    >
      {{ tooltip.text }}
    </div>

    <div class="scroll-container">
      <div class="graph-container" ref="containerRef">
        <div class="day-labels">
          <span></span>
          <span>Mon</span>
          <span></span>
          <span>Wed</span>
          <span></span>
          <span>Fri</span>
          <span></span>
        </div>

        <div class="weeks-wrapper">
          <div class="grid-content">
            <div v-for="(week, i) in graphData" :key="i" class="week-column">
              <div class="month-placeholder">
                <span v-if="week.monthLabel" class="month-text">{{ week.monthLabel }}</span>
              </div>

              <div
                v-for="(day, d) in week.days"
                :key="d"
                class="day-cell"
                :class="getLevelClass(day.level)"
                @mouseenter="showTooltip($event, day)"
                @mouseleave="hideTooltip"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="legend">
      <span>Less</span>
      <div class="day-cell l0"></div>
      <div class="day-cell l1"></div>
      <div class="day-cell l2"></div>
      <div class="day-cell l3"></div>
      <div class="day-cell l4"></div>
      <span>More</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
$cell-size: 12px;
$cell-gap: 3px;

.graph-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.custom-tooltip {
  position: fixed;
  background-color: #333;
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  transform: translate(-50%, -100%);
  z-index: 30;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.scroll-container {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 5px;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
  }
}

.graph-container {
  display: flex;
  flex-direction: row;
  min-width: 100%;
  align-items: flex-end;
}

.day-labels {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-top: 20px;
  margin-right: 6px;
  gap: $cell-gap;
  padding-bottom: 2px;
  flex-shrink: 0;
  left: 0;
  background: white;
  z-index: 10;

  span {
    height: $cell-size;
    line-height: $cell-size;
    font-size: 9px;
    color: #999;
    text-align: right;
    padding-right: 2px;
  }
}

.weeks-wrapper {
  flex: 1;
}

.grid-content {
  display: flex;
  gap: $cell-gap;
}

.week-column {
  display: flex;
  flex-direction: column;
  gap: $cell-gap;
}

.month-placeholder {
  height: 16px;
  position: relative;
  margin-bottom: 4px;
}

.month-text {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 10px;
  color: #666;
  white-space: nowrap;
}

.day-cell {
  width: $cell-size;
  height: $cell-size;
  border-radius: 2px;
  box-sizing: border-box;
  position: relative;

  &.future {
    background: transparent;
    border: 1px dashed #e0e0e0;
  }

  &.l0 {
    background-color: #ebedf0;
  }
  &.l1 {
    background-color: var(--accent-color-tertiary);
    opacity: 0.6;
  }
  &.l2 {
    background-color: var(--accent-color-tertiary);
    opacity: 1;
  }
  &.l3 {
    background-color: var(--accent-color-secondary);
  }
  &.l4 {
    background-color: var(--accent-color-primary);
  }

  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.4);
    z-index: 20;
    border: 1px solid var(--accent-color-quaternary);
    box-shadow: 0 4px 8px rgba(97, 0, 150, 0.4);
    border-radius: 3px;
  }
}

.legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 10px;
  font-size: 10px;
  color: #666;

  .day-cell {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
}
</style>
