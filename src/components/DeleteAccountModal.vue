<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
  delete: [];
}>();

function handleDelete() {
  emit("delete");
}

function handleClose() {
  emit("close");
}

// Close on background click
function handleBackgroundClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    handleClose();
  }
}

// Close on Escape key
function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    handleClose();
  }
}
</script>

<template>
  <div
    v-if="props.isOpen"
    class="modal-overlay"
    @click="handleBackgroundClick"
    @keydown="handleKeydown"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>Confirm Delete Account</h2>
        <button class="close-btn" @click="handleClose">
          &#x2715;
          <!-- icon credit https://stackoverflow.com/questions/5353461/unicode-character-for-x-cancel-close-->
        </button>
      </div>

      <div class="modal-body">
        <div class="field-group">
          <p>Are you sure you want to delete your account?</p>
          <p>This is not reversible; your data will be lost forever.</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-delete" @click="handleDelete">Delete</button>
        <div class="right-actions">
          <button class="btn btn-secondary" @click="handleClose">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;

  h2 {
    margin: 0;
    color: var(--accent-color-quaternary);
    font-size: 26px;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 26px;
    cursor: pointer;
    color: #656464;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f0f0f0;
    }
  }
}

.modal-body {
  padding: 24px;
  overflow-y: auto;

  .field-group {
    margin-bottom: 20px;
  }
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  background-color: #f7f7f7;
  border-radius: 0 0 12px 12px;

  .right-actions {
    display: flex;
    gap: 12px;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &:active {
      transform: translateY(0);
    }

    &.btn-delete {
      background-color: var(--danger-color);
      color: white;

      &:hover {
        background-color: var(--danger-color-hover);
      }
    }
    &.btn-secondary {
      background-color: #e0e0e0;
      color: #333333;

      &:hover {
        background-color: #d0d0d0;
      }
    }
  }
}
</style>
