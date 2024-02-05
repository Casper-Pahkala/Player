<template>
  <router-view />
</template>

<script setup>
  import { useAppStore } from '@/store/app';
  import { ref, computed } from 'vue';

  const store = useAppStore();
  store.connectToWebsocket();
</script>

<style>


html {
  overflow: hidden !important;
}

* {
  cursor: url('/cursor.gif'), auto !important;
}

</style>
