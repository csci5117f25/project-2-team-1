<script lang="ts" setup>
defineEmits(["click"]);
</script>

<template>
  <button class="btn" @click="$emit('click')"><slot></slot></button>
</template>

<style scoped lang="scss">
.btn {
  background-color: var(--accent-color-secondary);
  color: var(--background-color);
  border: none;
  border-radius: 9999px;
  padding: 1.25rem 3rem;
  font-size: 1rem;

  &:hover {
    cursor: pointer;
    background-color: var(--accent-color-tertiary);
    transform: translateY(-1px);
    transition: 0.5s;
  }
}

i {
  margin-left: 0.25rem;
}
</style>
