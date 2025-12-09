import type Task from "@/interfaces/Task";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  setDoc,
  updateDoc,
  getDoc,
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
    return await addDoc(collection(db, "users", currentUser.uid, "user_defined_tasks"), data);
  }
};

export const updateTask = async (
  id: string,
  data: { last_completed_time?: number; frequency?: string; name?: string }
) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const reference = doc(db, "users", currentUser.uid, "user_defined_tasks", id);
    await updateDoc(reference, data);
  }
};

export const markTaskComplete = async (id: string) => {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    await updateTask(id, {
      last_completed_time: Date.now(),
    });
    const task = await getUserTask(id);
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
