# Mercilium — Nuxt + Go + Mongo

## Что сделано
- Переведён фронт на Nuxt (SSR), сервер на Go, БД на MongoDB.
- Сохранены дизайн/анимации/стили 1‑к‑1 (ассеты перенесены в Nuxt `public`).
- Красивые маршруты + редиректы со старых PHP/HTML путей.
- Админка оставлена в прежнем виде, но фон оптимизирован (не “5 fps”), стиль линий/цифр сохранён.
- Данные в Mongo инициализируются пустыми коллекциями, создаётся админ `admin` с паролем `Hgasrfw31`.

## Почему SSR (кратко)
SSR рендерит HTML на сервере: первый экран быстрее, страницы индексируются поиском, динамические страницы (например `/cataclysm/:id`) приходят уже с контентом и не “мигают” пустыми блоками. При этом все анимации и интерактив сохраняются на клиенте.

## Маршруты (красивые)
- `/` — главная
- `/cataclysm` — лента
- `/cataclysm/:id` — пост
- `/lounge` — вход в Lounge
- `/lounge/custom` — конструктор
- `/lounge/link` — панель туннеля
- `/lounge/office` — офис
- `/lounge/office/map` — карта офиса
- `/admin/login` — логин
- `/admin` — панель

### Редиректы
Старые адреса автоматически 301‑редиректятся:
- `/cataclysm/post.php?id=42` → `/cataclysm/42`
- `/dbauth/pages/login.php` → `/admin/login`
- `/dbauth/pages/dashboard.php` → `/admin`
- `/lounge/office/map.html` → `/lounge/office/map`
- и т.д. (см. `deploy/nginx/default.conf` и `apps/web/server/middleware/legacy-redirects.ts`)

## Админка
Логин: `admin`  
Пароль: `Hgasrfw31`

## Деплой (Docker)
```bash
cd mercilium
docker compose up -d --build
```
Откроется `http://<ваш_домен>/`

## Локальная разработка
### API (Go)
```bash
cd mercilium/apps/api
go mod tidy
go run ./cmd/server
```
### Web (Nuxt)
```bash
cd mercilium/apps/web
npm install
npm run dev
```

## Переменные окружения
### API (`apps/api/.env.example`)
- `MONGO_URI` — строка подключения к Mongo
- `MONGO_DB` — имя БД
- `UPLOAD_DIR` — куда сохраняются файлы
- `ADMIN_USER` / `ADMIN_PASSWORD` — сидинг администратора

### Web (`apps/web/.env.example`)
- `NUXT_PUBLIC_API_BASE` — базовый URL для API (обычно `/api`)

