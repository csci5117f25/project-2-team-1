import { createRouter, createWebHistory } from "vue-router";
import { getCurrentUser } from "vuefire";

import HomeView from "@/views/HomeView.vue";
import LoginView from "@/views/LoginView.vue";
import SettingsView from "@/views/SettingsView.vue";
import StatsView from "@/views/StatsView.vue";
import Error404View from "@/views/404View.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: "/login",
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: "/settings",
      component: SettingsView,
      meta: { requiresAuth: true },
    },
    {
      path: "/stats",
      component: StatsView,
      meta: { requiresAuth: true },
    },
    {
      path: "/404",
      component: Error404View,
      meta: { requiresAuth: false },
    },
    {
      path: "/:catchAll(.*)",
      redirect: "/404",
    },
  ],
});

router.beforeEach(async (to) => {
  if (to?.meta?.requiresAuth) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        path: "/login",
      };
    }
  }
});

export default router;
