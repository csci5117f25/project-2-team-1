import { createRouter, createWebHistory } from "vue-router";

import HomeView from "@/views/HomeView.vue";
import Error404View from "@/views/404View.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: HomeView,
      meta: { requiresAuth: false },
    },
    {
      path: "/404",
      component: Error404View,
    },
    {
      path: "/:catchAll(.*)",
      redirect: "/404",
    },
  ],
});

export default router;
