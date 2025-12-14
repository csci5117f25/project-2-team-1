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
    const sortedData = useCollection(query(reference, orderBy("last_completed_time", "desc")));
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

    // if all tasks were already completed today, decrease streak by 1
    if (allExistingTasksCompletedToday && !tasksSnapshot.empty) {
      const statsRef = doc(db, "users", currentUser.uid, "stats", "current");
      const statsSnapshot = await getDoc(statsRef);
      const currentStreak = statsSnapshot.exists() ? (statsSnapshot.data().streak ?? 0) : 0;

      if (currentStreak > 0) {
        await setDoc(statsRef, { streak: currentStreak - 1 }, { merge: true });
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

  const isSameMonth =
    last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear();

  if (task.frequency === "daily") return isSameDay;
  if (task.frequency === "monthly") return isSameMonth;
  return false;
};

const calculateGlobalStreak = async () => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const tasksSnapshot = await getDocs(
      collection(db, "users", currentUser.uid, "user_defined_tasks")
    );

    const statsRef = doc(db, "users", currentUser.uid, "stats", "current");
    const statsSnapshot = await getDoc(statsRef);
    const currentStreak = statsSnapshot.exists() ? (statsSnapshot.data().streak ?? 0) : 0;

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

    if (allTasksCompletedToday) {
      return currentStreak + 1; // all tasks completed today - increment
    }

    return currentStreak; // some tasks not completed yet - maintain current streak
  }
  return 0;
};

export const markTaskComplete = async (id: string) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const task = await getUserTask(id);
    if (task) {
      const newStreak = calculateStreakTaskContinue(task) ? task.current_streak + 1 : 1;
      await updateTask(id, {
        last_completed_time: Date.now(),
        current_streak: newStreak,
      });

      const newGlobalStreak = await calculateGlobalStreak();
      await updateUserStats({ streak: newGlobalStreak });
    }

    const streak = task?.current_streak ?? 0;
    const completedTaskData: CompletedTask = {
      parent_id: id,
      days_completed: streak,
      completed_at: Date.now(),
    };
    await addDoc(collection(db, "users", currentUser.uid, "completed_tasks"), completedTaskData);

    const statsRef = doc(db, "users", currentUser.uid, "stats", "current");
    const statsSnapshot = await getDoc(statsRef);
    const currentXp = statsSnapshot.exists() ? statsSnapshot.data().xp : 0;
    const xpReward = task?.frequency === "daily" ? 10 : 50;
    return await setDoc(
      statsRef,
      {
        xp: currentXp + xpReward,
      },
      { merge: true }
    );
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
