# Океанский Альянс Защиты (ОАЗ)

Веб-приложение для управления экологическими проектами, волонтерством и благотворительностью.

## Архитектура

Приложение состоит из двух частей:
- **Backend**: Flask API с SQLite базой данных
- **Frontend**: HTML/CSS/JavaScript с Bootstrap

## Особенности

- ✅ **API с fallback на localStorage**: Все данные сохраняются через API на сервере. Если API недоступен, используется localStorage как резервный вариант.
- ✅ **Загрузка изображений**: Возможность загружать картинки на сервер через формы в админке.
- ✅ **Полная синхронизация**: Данные синхронизируются между API и localStorage.

## Установка и запуск

### Backend (API)

```bash
# Установка зависимостей
pip install -r requirements.txt

# Запуск сервера
python app.py
```

Сервер запустится на `http://localhost:5000`

### Frontend

Откройте `index.html` в браузере или используйте простой HTTP-сервер:

```bash
# Python 3
python -m http.server 8080

# Или Node.js
npx serve .
```

## API Endpoints

### Пользователи
- `GET /api/users` - список пользователей
- `GET /api/users/<id>` - информация о пользователе
- `POST /api/users` - регистрация
- `PUT /api/users/<id>` - обновление пользователя
- `POST /api/login` - авторизация

### Проекты
- `GET /api/projects` - список проектов
- `GET /api/projects/<id>` - информация о проекте
- `POST /api/projects` - создание проекта
- `PUT /api/projects/<id>` - обновление проекта
- `DELETE /api/projects/<id>` - удаление проекта
- `POST /api/projects/<id>/join` - присоединение к проекту
- `GET /api/projects/<id>/participants/check` - проверка участия

### Новости
- `GET /api/news` - список новостей
- `GET /api/news/<id>` - информация о новости
- `POST /api/news` - создание новости
- `PUT /api/news/<id>` - обновление новости
- `DELETE /api/news/<id>` - удаление новости

### Комментарии
- `GET /api/news/<id>/comments` - комментарии к новости
- `POST /api/news/<id>/comments` - добавление комментария
- `DELETE /api/comments/<id>` - удаление комментария

### Донаты
- `GET /api/users/<id>/donations` - донаты пользователя
- `POST /api/donations` - создание доната

### Волонтерские часы
- `GET /api/users/<id>/volunteer-hours` - часы пользователя
- `POST /api/volunteer-hours` - добавление часов

### Загрузка файлов
- `POST /api/upload` - загрузка изображения
- `GET /uploads/<filename>` - получение изображения

### Статистика
- `GET /api/stats` - общая статистика

## Структура базы данных

### Таблицы

1. **users** - пользователи
   - id, first_name, last_name, email, password, role, is_volunteer, is_donor, created_at

2. **projects** - проекты
   - id, name, description, full_description, image, start_date, end_date, status, target_amount, collected_amount, donation_amount, total_hours, created_at

3. **project_participants** - участники проектов
   - id, project_id, user_id, role, hours_contributed, amount_donated, joined_at

4. **news** - новости
   - id, project_id, title, description, content, image, category, created_at

5. **comments** - комментарии
   - id, news_id, user_id, content, created_at

6. **donations** - донаты
   - id, user_id, project_id, amount, status, created_at

7. **volunteer_hours** - волонтерские часы
   - id, user_id, project_id, hours, date, created_at

## Администратор

Для входа как администратор:
- Email: `admin@oaz-ocean.ru`
- Пароль: `admin123`

## API Client

Центральный модуль `api-client.js` обеспечивает:
- Автоматическое определение доступности API
- Fallback на localStorage при недоступности API
- Синхронизацию данных между API и localStorage
- Унифицированный интерфейс для всех операций

```javascript
// Примеры использования
const users = await API.getUsers();
const projects = await API.getProjects();
await API.createProject({ name: '...', description: '...' });
const result = await API.uploadImage(file);
```

## Структура проекта

```
.
├── app.py                 # Backend API (Flask)
├── requirements.txt       # Python зависимости
├── api-client.js          # API клиент с fallback
├── main.js                # Основной JavaScript
├── projects.js            # Логика проектов
├── project-detail.js      # Детали проекта
├── donate.js              # Логика донатов
├── profile.js             # Личный кабинет
├── catalog.js             # Каталог новостей
├── card.js                # Детали новости
├── admin-projects.js      # Управление проектами (админ)
├── manage-news.js         # Управление новостями (админ)
├── manage-projects.js     # Управление проектами для донатов (админ)
├── style.css              # Стили
├── index.html             # Главная страница
├── projects.html          # Проекты
├── project-detail.html    # Детали проекта
├── donate.html            # Донаты
├── login.html             # Вход
├── register.html          # Регистрация
├── profile.html           # Личный кабинет
├── admin.html             # Админ панель
├── admin-projects.html    # Управление проектами
├── manage-news.html       # Управление новостями
├── catalog.html           # Каталог новостей
├── card.html              # Детали новости
└── uploads/               # Папка для загруженных изображений
```

## Лицензия

MIT License
