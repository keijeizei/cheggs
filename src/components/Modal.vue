<template>
  <div class="modal-overlay" v-if="isOpen">
    <div class="modal">
      <slot></slot>
      <button class="close-button" @click="closeModal">Close</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  isOpen: Boolean,
  closeModal: Function,
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  z-index: 10;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  /* backdrop-filter: blur(1px); */
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  display: flex;
  flex-direction: column;
  padding: 30px 20px;
  backdrop-filter: blur(5px);
  border-radius: 8px;
  box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.3);
}

.close-button {
  margin-top: 20px;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>
