import type Task from "@/interfaces/Task";
import { addDoc, collection, doc, orderBy, query, updateDoc } from "firebase/firestore";
import { computed, watch } from "vue";
import { getCurrentUser, useCollection, useDocument } from "vuefire";
import { db } from "../../firebase_conf";
import { useRouter } from "vue-router";
import type CompletedTask from "@/interfaces/CompletedTask";

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
    updateTask(id, {
      last_completed_time: Date.now(),
    });
    const streak = (await getUserTask(id))?.current_streak ?? 0;
    const completedTaskData: CompletedTask = {
      parent_id: id,
      days_completed: streak,
    };
    return await addDoc(
      collection(db, "users", currentUser.uid, "completed_tasks"),
      completedTaskData
    );
  }
};

export const updateTaskFrequency = async (id: string, newFrequency: string) => {
  return await updateTask(id, { frequency: newFrequency });
};

export const updateTaskName = async (id: string, newName: string) => {
  return await updateTask(id, { name: newName });
};
