<template>
  <div class="login-body">
    <canvas id="network"></canvas>

    <div class="login-wrapper">
      <h1 class="login-title">Вход в панель</h1>
      <div v-if="errorMessage" class="login-error">{{ errorMessage }}</div>

      <form class="login-form" @submit.prevent="submit">
        <label for="login">Логин</label>
        <input id="login" v-model="login" type="text" required>

        <label for="password">Пароль</label>
        <input id="password" v-model="password" type="password" required>

        <button type="submit" class="login-btn">Войти</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const login = ref('');
const password = ref('');
const errorMessage = ref('');

const submit = async () => {
  errorMessage.value = '';
  try {
    const data: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { login: login.value.trim(), password: password.value },
      credentials: 'include'
    });
    if (data?.ok) {
      await navigateTo('/admin');
      return;
    }
    errorMessage.value = data?.error || 'Ошибка авторизации';
  } catch (err: any) {
    errorMessage.value = err?.data?.error || 'Сеть недоступна';
  }
};

useHead({
  title: 'Mercilium Admin — Login',
  htmlAttrs: { lang: 'ru' },
  bodyAttrs: { class: 'login-body' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1.0' }],
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap'
    },
    { rel: 'stylesheet', href: '/dbauth/assets/admin.css' }
  ],
  script: [{ src: '/dbauth/assets/admin-bg.js', defer: true }]
});
</script>
