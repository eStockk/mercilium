import { getRequestURL, sendRedirect } from 'h3';

export default defineEventHandler(event => {
  const url = getRequestURL(event);
  const path = url.pathname;

  if (path === '/index.html') {
    return sendRedirect(event, '/', 301);
  }

  if (path === '/cataclysm/post.php') {
    const id = url.searchParams.get('id');
    return sendRedirect(event, id ? `/cataclysm/${id}` : '/cataclysm', 301);
  }

  const redirects: Record<string, string> = {
    '/cataclysm/index.php': '/cataclysm',
    '/dbauth/pages/login.php': '/admin/login',
    '/dbauth/pages/dashboard.php': '/admin',
    '/dbauth/pages/logout.php': '/admin/logout',
    '/dbauth/': '/admin/login',
    '/lounge/index.html': '/lounge',
    '/lounge/custom/index.html': '/lounge/custom',
    '/lounge/link/index.html': '/lounge/link',
    '/lounge/office/index.html': '/lounge/office',
    '/lounge/office/map.html': '/lounge/office/map'
  };

  if (redirects[path]) {
    return sendRedirect(event, redirects[path], 301);
  }
});
