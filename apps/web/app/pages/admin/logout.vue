<template>
  <div></div>
</template>

<script setup lang="ts">
onMounted(async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    // ignore
  }
  await navigateTo('/admin/login');
});
</script>
