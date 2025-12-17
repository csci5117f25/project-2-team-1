import type Task from "@/interfaces/Task";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  setDoc,
  getDoc,
  getDocs,
  where,
  limit,
  type DocumentData,
} from "firebase/firestore";
import { computed, watch } from "vue";
import { getCurrentUser, useCollection, useDocument } from "vuefire";
import { db } from "../../firebase_conf";
import { useRouter } from "vue-router";
import type CompletedTask from "@/interfaces/CompletedTask";
import { getAuth, deleteUser } from "firebase/auth";

export const getUserTasks = async () => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const reference = collection(db, "users", currentUser.uid, "user_defined_tasks");
    const rawData = useCollection(query(reference));

    const sortedData = computed(() => {
      if (!rawData.value) return [];

      return [...rawData.value].sort((a, b) => {
        const aCompleted = isCompletedToday(a);
        const bCompleted = isCompletedToday(b);

        if (aCompleted === bCompleted) {
          return (b.last_completed_time || 0) - (a.last_completed_time || 0);
        }
        return aCompleted ? 1 : -1;
      });
    });

    return sortedData;
  }
};

export const getUserTask = async (taskId: string) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const router = useRouter();
    const dataSource = computed(() =>
      doc(db, "users", currentUser.uid, "user_defined_tasks", taskId)
    );

    const reference = useDocument(dataSource);

    const { promise } = reference; // https://stackoverflow.com/questions/74914098/struggling-to-get-the-data-from-usedocument-to-display-with-vue-js-and-firestore
    watch(reference, (new_data) => {
      if (!new_data) {
        router.push("/");
      }
    });
    return promise.value;
  }
};

export const createTask = async (data: Task) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const taskWithTimestamp = {
      ...data,
      created_at: data.created_at || Date.now(),
    };

    const tasksSnapshot = await getDocs(
      collection(db, "users", currentUser.uid, "user_defined_tasks")
    );

    let allExistingTasksCompletedToday = true;
    tasksSnapshot.forEach((taskDoc) => {
      const task = taskDoc.data();
      if (!isCompletedToday(task)) {
        allExistingTasksCompletedToday = false;
      }
    });

    // if all tasks were already completed today, decrease streak by 1 and clear last_streak_date
    if (allExistingTasksCompletedToday && !tasksSnapshot.empty) {
      const statsRef = doc(db, "users", currentUser.uid, "stats", "current");
      const statsSnapshot = await getDoc(statsRef);
      const currentStreak = statsSnapshot.exists() ? (statsSnapshot.data().streak ?? 0) : 0;

      if (currentStreak > 0) {
        await setDoc(
          statsRef,
          {
            streak: currentStreak - 1,
            last_streak_date: 0,
          },
          { merge: true }
        );
      }
    }

    return await addDoc(
      collection(db, "users", currentUser.uid, "user_defined_tasks"),
      taskWithTimestamp
    );
  }
};

export const updateTask = async (
  id: string,
  data: { last_completed_time?: number; frequency?: string; name?: string; current_streak?: number }
) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const reference = doc(db, "users", currentUser.uid, "user_defined_tasks", id);
    await setDoc(reference, data, { merge: true });
  }
};

const calculateStreakTaskContinue = (task: DocumentData) => {
  const now = new Date();
  const timeInADay = 1000 * 60 * 60 * 24;
  const timeInAMonth = timeInADay * 30;

  // if task has never been completed, check if it was created before the current period deadline
  if (!task.last_completed_time || task.last_completed_time === 0) {
    if (!task.created_at) return true; // Very old task without created_at, give grace

    const created = new Date(task.created_at);
    const createdTime = created.getTime();
    const nowTime = now.getTime();
    const delta = nowTime - createdTime;

    // for daily: if created more than 1 day ago and never completed, streak broken
    // for monthly: if created more than 1 month ago and never completed, streak broken
    if (task.frequency === "daily") {
      return delta <= timeInADay;
    } else if (task.frequency === "weekly") {
      return delta <= timeInADay * 7;
    } else if (task.frequency === "monthly") {
      return delta <= timeInAMonth;
    }
    return true;
  }

  // task has been completed before
  const last = new Date(task.last_completed_time);
  const lastTime = last.getTime();
  const nowTime = now.getTime();
  const delta = nowTime - lastTime;

  switch (task.frequency) {
    case "daily":
      return delta <= timeInADay * 2;
    case "weekly":
      return delta <= timeInADay * 8;
    case "monthly":
      return delta <= timeInAMonth + timeInADay;
  }
};

export const isCompletedToday = (task: DocumentData) => {
  if (!task.last_completed_time) return false;
  const last = new Date(task.last_completed_time);
  const now = new Date();

  const isSameDay =
    last.getDate() === now.getDate() &&
    last.getMonth() === now.getMonth() &&
    last.getFullYear() === now.getFullYear();

  const isSameWeek = last.getTime() >= now.getTime() - 1000 * 60 * 60 * 24 * 7;

  const isSameMonth =
    last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear();

  if (task.frequency === "daily") return isSameDay;
  if (task.frequency === "weekly") return isSameWeek;
  if (task.frequency === "monthly") return isSameMonth;
  return false;
};

export const calculateGlobalStreak = async (shouldIncrement: boolean = false) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const tasksSnapshot = await getDocs(
      collection(db, "users", currentUser.uid, "user_defined_tasks")
    );

    const statsRef = doc(db, "users", currentUser.uid, "stats", "current");
    const statsSnapshot = await getDoc(statsRef);
    const statsData = statsSnapshot.exists() ? statsSnapshot.data() : {};
    const currentStreak = statsData.streak ?? 0;
    const lastStreakDate = statsData.last_streak_date ?? 0;

    if (tasksSnapshot.empty) {
      return currentStreak; // no tasks - maintain current streak
    }

    let allTasksCompletedToday = true;
    let anyTaskExpired = false;

    tasksSnapshot.forEach((taskDoc) => {
      const task = taskDoc.data();

      if (!calculateStreakTaskContinue(task)) {
        // task expired - streak is broken
        anyTaskExpired = true;
      } else if (!isCompletedToday(task)) {
        // task is valid but not completed today
        allTasksCompletedToday = false;
      }
    });

    if (anyTaskExpired) {
      return 0; // streak broken
    }

    // only increment if shouldIncrement is true, all tasks are complete, and we haven't incremented today
    if (shouldIncrement && allTasksCompletedToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastStreakDay = new Date(lastStreakDate);
      lastStreakDay.setHours(0, 0, 0, 0);

      // only increment if we haven't already incremented today
      if (today.getTime() > lastStreakDay.getTime()) {
        return { streak: currentStreak + 1, incremented: true };
      }
    }

    return { streak: currentStreak, incremented: false }; // maintain current streak
  }
  return { streak: 0, incremented: false };
};

export const markTaskComplete = async (id: string) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const task = await getUserTask(id);
    if (task) {
      const completionTime = Date.now();
      const newStreak = calculateStreakTaskContinue(task) ? task.current_streak + 1 : 1;
      let xpReward = 10;
      if (task.frequency === "weekly") xpReward = 30;
      if (task.frequency === "monthly") xpReward = 50;
      await updateTask(id, {
        last_completed_time: completionTime,
        current_streak: newStreak,
      });

      const completedTaskData: CompletedTask = {
        parent_id: id,
        days_completed: newStreak,
        completed_at: completionTime,
      };
      await addDoc(collection(db, "users", currentUser.uid, "completed_tasks"), completedTaskData);

      const streakResult = await calculateGlobalStreak(true);
      const statsRef = doc(db, "users", currentUser.uid, "stats", "current");
      const statsSnapshot = await getDoc(statsRef);
      const currentXp = statsSnapshot.exists() ? statsSnapshot.data().xp : 0;

      const updateData: { xp: number; streak: number; last_streak_date?: number } = {
        xp: currentXp + xpReward,
        streak: streakResult.streak,
      };

      // only update last_streak_date if we actually incremented the streak
      if (streakResult.incremented) {
        updateData.last_streak_date = Date.now();
      }

      return await setDoc(statsRef, updateData, { merge: true });
    }
  }
};

export const unmarkTaskComplete = async (id: string) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const task = await getUserTask(id);
    if (!task || !isCompletedToday(task)) {
      return;
    }

    // check if all tasks complete before unchecking
    const tasksSnapshot = await getDocs(
      collection(db, "users", currentUser.uid, "user_defined_tasks")
    );

    let allTasksCurrentlyComplete = true;
    tasksSnapshot.forEach((taskDoc) => {
      const taskData = taskDoc.data();
      if (!isCompletedToday(taskData)) {
        allTasksCurrentlyComplete = false;
      }
    });

    const targetTimestamp = task.last_completed_time;

    // find previous completion to restore last_completed_time
    const completedTasksRef = collection(db, "users", currentUser.uid, "completed_tasks");
    const previousQ = query(
      completedTasksRef,
      where("parent_id", "==", id),
      where("completed_at", "<", targetTimestamp),
      orderBy("completed_at", "desc"),
      limit(1)
    );
    const previousSnapshot = await getDocs(previousQ);
    const previousCompletedTime = previousSnapshot.docs[0]?.data().completed_at ?? 0;

    // update task w/ previous completion time and dec streak
    const newStreak = Math.max(0, (task.current_streak || 0) - 1);
    await updateTask(id, {
      last_completed_time: previousCompletedTime,
      current_streak: newStreak,
    });

    // delete completion entry
    const q = query(
      completedTasksRef,
      where("parent_id", "==", id),
      where("completed_at", "==", targetTimestamp),
      limit(1)
    );
    const completedTasksSnapshot = await getDocs(q);
    const docToDelete = completedTasksSnapshot.docs[0];
    if (docToDelete) {
      await deleteDoc(docToDelete.ref);
    }

    // update global streak and XP
    const statsRef = doc(db, "users", currentUser.uid, "stats", "current");
    const statsSnapshot = await getDoc(statsRef);
    const currentStreak = statsSnapshot.exists() ? (statsSnapshot.data().streak ?? 0) : 0;
    const currentXp = statsSnapshot.exists() ? statsSnapshot.data().xp : 0;

    const newGlobalStreak = allTasksCurrentlyComplete
      ? Math.max(0, currentStreak - 1)
      : currentStreak;

    let xpPenalty = 10;
    if (task.frequency === "weekly") xpPenalty = 30;
    if (task.frequency === "monthly") xpPenalty = 50;
    const newXp = Math.max(0, currentXp - xpPenalty);

    await setDoc(
      statsRef,
      {
        xp: newXp,
        streak: newGlobalStreak,
        last_streak_date: 0,
      },
      { merge: true }
    );
  }
};

export const toggleTaskComplete = async (id: string) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const task = await getUserTask(id);
    if (task) {
      if (isCompletedToday(task)) {
        await unmarkTaskComplete(id);
      } else {
        await markTaskComplete(id);
      }
    }
  }
};

export const getUserStats = async () => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const reference = doc(db, "users", currentUser.uid, "stats", "current");
    return useDocument(reference);
  }
};

export const updateUserStats = async (data: { streak?: number }) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const reference = doc(db, "users", currentUser.uid, "stats", "current");
    await setDoc(reference, data, { merge: true });
  }
};

export const validateAndUpdateStreak = async () => {
  // only check if streak should be reset to 0 (don't increment on page load)
  const streakResult = await calculateGlobalStreak(false);
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const statsRef = doc(db, "users", currentUser.uid, "stats", "current");
    const statsSnapshot = await getDoc(statsRef);
    const currentStreak = statsSnapshot.exists() ? (statsSnapshot.data().streak ?? 0) : 0;

    // only update if streak was reset to 0
    if (streakResult.streak === 0 && currentStreak !== 0) {
      await updateUserStats({ streak: 0 });
    }
  }
};

export const updateTaskFrequency = async (id: string, newFrequency: string) => {
  return await updateTask(id, { frequency: newFrequency });
};

export const updateTaskName = async (id: string, newName: string) => {
  return await updateTask(id, { name: newName });
};

export const getUserSettings = async () => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const router = useRouter();
    const dataSource = computed(() => doc(db, "users", currentUser.uid, "settings", "settings"));

    const reference = useDocument(dataSource);

    const { promise } = reference; // https://stackoverflow.com/questions/74914098/struggling-to-get-the-data-from-usedocument-to-display-with-vue-js-and-firestore
    watch(reference, (new_data) => {
      if (!new_data) {
        router.push("/");
      }
    });
    return promise.value;
  }
};

export const updateUserSettings = async (data: { notifications?: boolean }) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const reference = doc(db, "users", currentUser.uid, "settings", "settings");
    await setDoc(reference, data, { merge: true });
  }
};

export const deleteTask = async (id: string) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const reference = doc(db, "users", currentUser.uid, "user_defined_tasks", id);
    await deleteDoc(reference);
  }
};

export const deleteAccount = async () => {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      const reference = doc(db, "users", currentUser.uid);
      await deleteDoc(reference);

      const auth = getAuth();
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
    }
  } catch (error) {
    console.error(`could not delete account: ${error}`);
  }
};

export const saveNotificationToken = async (token: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return;
  }

  const reference = doc(db, "users", currentUser.uid, "notification_tokens", token);
  await setDoc(
    reference,
    {
      token,
      platform: "web",
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};

export const removeNotificationToken = async (token: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return;
  }

  const reference = doc(db, "users", currentUser.uid, "notification_tokens", token);
  await deleteDoc(reference);
};

export const getCompletedTasks = async (taskId?: string) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const reference = collection(db, "users", currentUser.uid, "completed_tasks");
    let q;
    if (taskId) {
      q = query(reference, orderBy("days_completed", "desc"));
    } else {
      q = query(reference, orderBy("days_completed", "desc"));
    }
    const completedTasks = useCollection<CompletedTask>(q);
    return completedTasks;
  }
};

export const getPreMadeTasks = async () => {
  const returnData: { name: string; items: string[] }[] = [];
  const referenceCategories = await getDocs(collection(db, "task_categories"));
  referenceCategories.forEach(async (category: DocumentData) => {
    const categoryData = category.data();
    const referenceItems = await getDocs(collection(db, "task_categories", category.id, "items"));
    const items: string[] = [];
    referenceItems.forEach(async (item: DocumentData) => {
      const itemData = item.data();
      items.push(itemData.name);
    });
    returnData.push({ name: categoryData.name, items: items });
  });
  return returnData;
};
