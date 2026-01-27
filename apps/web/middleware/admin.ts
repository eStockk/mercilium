export default defineNuxtRouteMiddleware(async () => {
  const headers = useRequestHeaders(['cookie']);
  const { data, error } = await useFetch('/api/auth/me', {
    headers,
    credentials: 'include'
  });

  if (error.value || !data.value?.ok) {
    return navigateTo('/admin/login');
  }
});
