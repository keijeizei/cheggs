<template>
  <div class="switch-container">
    <p>{{ label }}</p>
    <label class="switch">
      <input type="checkbox" v-model="computedValue" />
      <span class="slider round"></span>
    </label>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: String,
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue", "setRef"]);

const computedValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit("update:modelValue", value);
  },
});
</script>

<style scoped>
p {
  color: white;
  margin: 0;
}

.switch-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5px;
  margin: 10px;
  width: 95%;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: 0.4s;
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: 0.4s;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: #71e382;
}

input:focus + .slider {
  box-shadow: 0 0 1px #71e382;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
