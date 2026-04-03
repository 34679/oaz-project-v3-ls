// ============================================
// Океанский Альянс Защиты (ОАЗ)
// API Client - центральный модуль для работы с API
// с fallback на localStorage при недоступности API
// ============================================

// ============================================
// КОНФИГУРАЦИЯ
// ============================================
const API_CONFIG = {
    // Базовый URL API (измените при необходимости)
    BASE_URL: window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api',
    // Таймаут запросов в мс
    TIMEOUT: 5000,
    // Флаг доступности API
    isApiAvailable: true
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Выполнение fetch с таймаутом
 */
async function fetchWithTimeout(url, options = {}, timeout = API_CONFIG.TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

/**
 * Проверка доступности API
 */
async function checkApiAvailability() {
    try {
        const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/`, { method: 'GET' }, 2000);
        API_CONFIG.isApiAvailable = response.ok;
        return response.ok;
    } catch (error) {
        API_CONFIG.isApiAvailable = false;
        console.warn('API недоступен, используем localStorage:', error.message);
        return false;
    }
}

// Проверяем доступность API при загрузке
checkApiAvailability();

// ============================================
// LOCALSTORAGE ХРАНИЛИЩЕ (Fallback)
// ============================================

const LocalStorageDB = {
    // Получить данные
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    },
    
    // Сохранить данные
    set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error writing to localStorage:', e);
            return false;
        }
    },
    
    // Удалить данные
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing from localStorage:', e);
            return false;
        }
    },
    
    // Генерация ID
    generateId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    }
};

// ============================================
// API МЕТОДЫ
// ============================================

const API = {
    // ============================================
    // ПОЛЬЗОВАТЕЛИ
    // ============================================
    
    /**
     * Получить список пользователей
     */
    async getUsers() {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/users`);
                if (response.ok) {
                    const data = await response.json();
                    // Синхронизируем с localStorage
                    LocalStorageDB.set('users', data);
                    return data;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        return LocalStorageDB.get('users') || [];
    },
    
    /**
     * Получить пользователя по ID
     */
    async getUser(userId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/users/${userId}`);
                if (response.ok) return await response.json();
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        const users = LocalStorageDB.get('users') || [];
        return users.find(u => u.id === userId);
    },
    
    /**
     * Создать пользователя (регистрация)
     */
    async createUser(userData) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                if (response.ok) {
                    const result = await response.json();
                    // Обновляем localStorage
                    const users = await this.getUsers();
                    users.push({ ...userData, id: result.id });
                    LocalStorageDB.set('users', users);
                    return result;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const users = LocalStorageDB.get('users') || [];
        if (users.find(u => u.email === userData.email)) {
            throw new Error('Email already exists');
        }
        const newUser = { ...userData, id: LocalStorageDB.generateId() };
        users.push(newUser);
        LocalStorageDB.set('users', users);
        return { id: newUser.id, message: 'User created successfully' };
    },
    
    /**
     * Обновить пользователя
     */
    async updateUser(userId, userData) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                if (response.ok) return await response.json();
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const users = LocalStorageDB.get('users') || [];
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index] = { ...users[index], ...userData };
            LocalStorageDB.set('users', users);
            return { message: 'User updated successfully' };
        }
        throw new Error('User not found');
    },
    
    /**
     * Авторизация
     */
    async login(email, password) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                if (response.ok) {
                    const user = await response.json();
                    LocalStorageDB.set('currentUser', user);
                    return user;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const users = LocalStorageDB.get('users') || [];
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            LocalStorageDB.set('currentUser', user);
            return user;
        }
        throw new Error('Invalid credentials');
    },
    
    /**
     * Выход
     */
    logout() {
        LocalStorageDB.remove('currentUser');
    },
    
    /**
     * Получить текущего пользователя
     */
    getCurrentUser() {
        return LocalStorageDB.get('currentUser');
    },
    
    // ============================================
    // ПРОЕКТЫ
    // ============================================
    
    /**
     * Получить список проектов
     */
    async getProjects() {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/projects`);
                if (response.ok) {
                    const data = await response.json();
                    LocalStorageDB.set('projects', data);
                    return data;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        return LocalStorageDB.get('projects') || [];
    },
    
    /**
     * Получить проект по ID
     */
    async getProject(projectId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/projects/${projectId}`);
                if (response.ok) return await response.json();
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        const projects = LocalStorageDB.get('projects') || [];
        return projects.find(p => p.id === projectId);
    },
    
    /**
     * Создать проект
     */
    async createProject(projectData) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/projects`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData)
                });
                if (response.ok) {
                    const result = await response.json();
                    // Обновляем кэш
                    await this.getProjects();
                    return result;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const projects = LocalStorageDB.get('projects') || [];
        const newProject = {
            ...projectData,
            id: LocalStorageDB.generateId(),
            collected_amount: 0,
            participants: { volunteers: 0, donors: 0 },
            created_at: new Date().toISOString()
        };
        projects.push(newProject);
        LocalStorageDB.set('projects', projects);
        return { id: newProject.id, message: 'Project created successfully' };
    },
    
    /**
     * Обновить проект
     */
    async updateProject(projectId, projectData) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData)
                });
                if (response.ok) {
                    await this.getProjects(); // Обновляем кэш
                    return await response.json();
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const projects = LocalStorageDB.get('projects') || [];
        const index = projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            projects[index] = { ...projects[index], ...projectData, updated_at: new Date().toISOString() };
            LocalStorageDB.set('projects', projects);
            return { message: 'Project updated successfully' };
        }
        throw new Error('Project not found');
    },
    
    /**
     * Удалить проект
     */
    async deleteProject(projectId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/projects/${projectId}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    await this.getProjects(); // Обновляем кэш
                    return await response.json();
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        let projects = LocalStorageDB.get('projects') || [];
        projects = projects.filter(p => p.id !== projectId);
        LocalStorageDB.set('projects', projects);
        return { message: 'Project deleted successfully' };
    },
    
    /**
     * Присоединиться к проекту
     */
    async joinProject(projectId, userId, role = 'volunteer') {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/projects/${projectId}/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, role })
                });
                if (response.ok) {
                    await this.getProjects(); // Обновляем кэш
                    return await response.json();
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const participants = LocalStorageDB.get('project_participants') || [];
        
        // Проверяем, не участвует ли уже
        if (participants.some(p => p.project_id === projectId && p.user_id === userId && p.role === role)) {
            throw new Error('User already participating');
        }
        
        participants.push({
            project_id: projectId,
            user_id: userId,
            role: role,
            hours_contributed: 0,
            amount_donated: 0,
            joined_at: new Date().toISOString()
        });
        LocalStorageDB.set('project_participants', participants);
        
        // Обновляем счетчик в проекте
        const projects = LocalStorageDB.get('projects') || [];
        const project = projects.find(p => p.id === projectId);
        if (project) {
            if (!project.participants) project.participants = { volunteers: 0, donors: 0 };
            if (role === 'volunteer') {
                project.participants.volunteers++;
            } else {
                project.participants.donors++;
            }
            LocalStorageDB.set('projects', projects);
        }
        
        return { message: 'Successfully joined project' };
    },
    
    /**
     * Проверить участие пользователя в проекте
     */
    async checkParticipation(projectId, userId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(
                    `${API_CONFIG.BASE_URL}/projects/${projectId}/participants/check?user_id=${userId}`
                );
                if (response.ok) return await response.json();
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const participants = LocalStorageDB.get('project_participants') || [];
        const participation = participants.find(p => p.project_id === projectId && p.user_id === userId);
        return {
            is_joined: participation !== null && participation !== undefined,
            role: participation ? participation.role : null
        };
    },
    
    /**
     * Получить участников проекта
     */
    async getProjectParticipants(projectId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/projects/${projectId}/participants`);
                if (response.ok) return await response.json();
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        const participants = LocalStorageDB.get('project_participants') || [];
        return participants.filter(p => p.project_id === projectId);
    },
    
    // ============================================
    // НОВОСТИ
    // ============================================
    
    /**
     * Получить список новостей
     */
    async getNews(category = null) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const url = category 
                    ? `${API_CONFIG.BASE_URL}/news?category=${category}`
                    : `${API_CONFIG.BASE_URL}/news`;
                const response = await fetchWithTimeout(url);
                if (response.ok) {
                    const data = await response.json();
                    LocalStorageDB.set('news', data);
                    return data;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        const news = LocalStorageDB.get('news') || [];
        if (category) {
            return news.filter(n => n.category === category);
        }
        return news;
    },
    
    /**
     * Получить новость по ID
     */
    async getNewsItem(newsId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/news/${newsId}`);
                if (response.ok) return await response.json();
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        const news = LocalStorageDB.get('news') || [];
        return news.find(n => n.id === newsId);
    },
    
    /**
     * Создать новость
     */
    async createNews(newsData) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/news`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newsData)
                });
                if (response.ok) {
                    const result = await response.json();
                    await this.getNews(); // Обновляем кэш
                    return result;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const news = LocalStorageDB.get('news') || [];
        const newNews = {
            ...newsData,
            id: LocalStorageDB.generateId(),
            created_at: new Date().toISOString()
        };
        news.push(newNews);
        LocalStorageDB.set('news', news);
        return { id: newNews.id, message: 'News created successfully' };
    },
    
    /**
     * Обновить новость
     */
    async updateNews(newsId, newsData) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/news/${newsId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newsData)
                });
                if (response.ok) {
                    await this.getNews(); // Обновляем кэш
                    return await response.json();
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const news = LocalStorageDB.get('news') || [];
        const index = news.findIndex(n => n.id === newsId);
        if (index !== -1) {
            news[index] = { ...news[index], ...newsData, updated_at: new Date().toISOString() };
            LocalStorageDB.set('news', news);
            return { message: 'News updated successfully' };
        }
        throw new Error('News not found');
    },
    
    /**
     * Удалить новость
     */
    async deleteNews(newsId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/news/${newsId}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    await this.getNews(); // Обновляем кэш
                    return await response.json();
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        let news = LocalStorageDB.get('news') || [];
        news = news.filter(n => n.id !== newsId);
        LocalStorageDB.set('news', news);
        return { message: 'News deleted successfully' };
    },
    
    // ============================================
    // КОММЕНТАРИИ
    // ============================================
    
    /**
     * Получить комментарии к новости
     */
    async getComments(newsId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/news/${newsId}/comments`);
                if (response.ok) {
                    const data = await response.json();
                    // Сохраняем в структуру localStorage
                    const allComments = LocalStorageDB.get('comments') || {};
                    allComments[newsId] = data;
                    LocalStorageDB.set('comments', allComments);
                    return data;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        const allComments = LocalStorageDB.get('comments') || {};
        return allComments[newsId] || [];
    },
    
    /**
     * Создать комментарий
     */
    async createComment(newsId, userId, content) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/news/${newsId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, content })
                });
                if (response.ok) {
                    await this.getComments(newsId); // Обновляем кэш
                    return await response.json();
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const allComments = LocalStorageDB.get('comments') || {};
        if (!allComments[newsId]) allComments[newsId] = [];
        
        // Получаем имя пользователя
        const users = LocalStorageDB.get('users') || [];
        const user = users.find(u => u.id === userId);
        
        allComments[newsId].push({
            id: LocalStorageDB.generateId(),
            news_id: newsId,
            user_id: userId,
            first_name: user ? user.first_name : 'Unknown',
            last_name: user ? user.last_name : '',
            content: content,
            created_at: new Date().toISOString()
        });
        LocalStorageDB.set('comments', allComments);
        return { message: 'Comment created successfully' };
    },
    
    /**
     * Удалить комментарий
     */
    async deleteComment(commentId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/comments/${commentId}`, {
                    method: 'DELETE'
                });
                if (response.ok) return await response.json();
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const allComments = LocalStorageDB.get('comments') || {};
        for (const newsId in allComments) {
            allComments[newsId] = allComments[newsId].filter(c => c.id !== commentId);
        }
        LocalStorageDB.set('comments', allComments);
        return { message: 'Comment deleted successfully' };
    },
    
    // ============================================
    // ДОНАТЫ
    // ============================================
    
    /**
     * Получить донаты пользователя
     */
    async getUserDonations(userId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/users/${userId}/donations`);
                if (response.ok) {
                    const data = await response.json();
                    LocalStorageDB.set(`donations_${userId}`, data);
                    return data;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        const donations = LocalStorageDB.get('donations') || [];
        return donations.filter(d => d.user_id === userId);
    },
    
    /**
     * Создать донат
     */
    async createDonation(donationData) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/donations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(donationData)
                });
                if (response.ok) {
                    const result = await response.json();
                    // Обновляем кэши
                    await this.getProjects();
                    await this.getUserDonations(donationData.user_id);
                    return result;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const donations = LocalStorageDB.get('donations') || [];
        const newDonation = {
            ...donationData,
            id: LocalStorageDB.generateId(),
            status: 'completed',
            created_at: new Date().toISOString()
        };
        donations.push(newDonation);
        LocalStorageDB.set('donations', donations);
        
        // Обновляем сумму в проекте
        if (donationData.project_id) {
            const projects = LocalStorageDB.get('projects') || [];
            const project = projects.find(p => p.id === donationData.project_id);
            if (project) {
                project.collected_amount = (project.collected_amount || 0) + donationData.amount;
                LocalStorageDB.set('projects', projects);
            }
        }
        
        // Обновляем пользователя как донора
        const users = LocalStorageDB.get('users') || [];
        const user = users.find(u => u.id === donationData.user_id);
        if (user) {
            user.is_donor = 1;
            if (user.role === 'user') user.role = 'donor';
            if (user.role === 'volunteer') user.role = 'volunteer_donor';
            LocalStorageDB.set('users', users);
        }
        
        return { id: newDonation.id, message: 'Donation created successfully' };
    },
    
    // ============================================
    // ВОЛОНТЕРСКИЕ ЧАСЫ
    // ============================================
    
    /**
     * Получить волонтерские часы пользователя
     */
    async getVolunteerHours(userId) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/users/${userId}/volunteer-hours`);
                if (response.ok) {
                    const data = await response.json();
                    LocalStorageDB.set(`volunteer_hours_${userId}`, data);
                    return data;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        const hours = LocalStorageDB.get('volunteer_hours') || [];
        return hours.filter(h => h.user_id === userId);
    },
    
    /**
     * Добавить волонтерские часы
     */
    async addVolunteerHours(hoursData) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/volunteer-hours`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(hoursData)
                });
                if (response.ok) {
                    const result = await response.json();
                    // Обновляем кэши
                    await this.getProjects();
                    await this.getVolunteerHours(hoursData.user_id);
                    return result;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback на localStorage
        const hours = LocalStorageDB.get('volunteer_hours') || [];
        const newHours = {
            ...hoursData,
            id: LocalStorageDB.generateId(),
            created_at: new Date().toISOString()
        };
        hours.push(newHours);
        LocalStorageDB.set('volunteer_hours', hours);
        
        // Обновляем часы в проекте
        const projects = LocalStorageDB.get('projects') || [];
        const project = projects.find(p => p.id === hoursData.project_id);
        if (project) {
            project.total_hours = (project.total_hours || 0) + hoursData.hours;
            LocalStorageDB.set('projects', projects);
        }
        
        // Обновляем пользователя как волонтера
        const users = LocalStorageDB.get('users') || [];
        const user = users.find(u => u.id === hoursData.user_id);
        if (user) {
            user.is_volunteer = 1;
            if (user.role === 'user') user.role = 'volunteer';
            if (user.role === 'donor') user.role = 'volunteer_donor';
            LocalStorageDB.set('users', users);
        }
        
        return { id: newHours.id, message: 'Volunteer hours added successfully' };
    },
    
    // ============================================
    // СТАТИСТИКА
    // ============================================
    
    /**
     * Получить общую статистику
     */
    async getStats() {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/stats`);
                if (response.ok) {
                    const data = await response.json();
                    LocalStorageDB.set('stats', data);
                    return data;
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback - считаем из localStorage
        const donations = LocalStorageDB.get('donations') || [];
        const hours = LocalStorageDB.get('volunteer_hours') || [];
        const users = LocalStorageDB.get('users') || [];
        const news = LocalStorageDB.get('news') || [];
        const projects = LocalStorageDB.get('projects') || [];
        
        return {
            total_donations: donations.reduce((sum, d) => sum + (d.amount || 0), 0),
            total_volunteer_hours: hours.reduce((sum, h) => sum + (h.hours || 0), 0),
            total_users: users.length,
            total_news: news.length,
            total_projects: projects.length
        };
    },
    
    // ============================================
    // ЗАГРУЗКА ИЗОБРАЖЕНИЙ
    // ============================================
    
    /**
     * Загрузить изображение на сервер
     */
    async uploadImage(file) {
        if (API_CONFIG.isApiAvailable) {
            try {
                const formData = new FormData();
                formData.append('image', file);
                
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback for image');
            }
        }
        // Fallback - используем FileReader для локального хранения
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    success: true,
                    url: e.target.result,
                    local: true
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },
    
    // ============================================
    // ИНИЦИАЛИЗАЦИЯ ДАННЫХ
    // ============================================
    
    /**
     * Инициализировать данные по умолчанию
     */
    async initDefaultData() {
        if (API_CONFIG.isApiAvailable) {
            try {
                const response = await fetchWithTimeout(`${API_CONFIG.BASE_URL}/init-default-data`, {
                    method: 'POST'
                });
                if (response.ok) {
                    // Обновляем все кэши
                    await this.getProjects();
                    await this.getNews();
                    await this.getUsers();
                    return await response.json();
                }
            } catch (error) {
                console.warn('API error, using localStorage fallback');
            }
        }
        // Fallback - инициализация через localStorage
        return this.initLocalStorageDefaults();
    },
    
    /**
     * Инициализация данных по умолчанию в localStorage
     */
    initLocalStorageDefaults() {
        // Проекты по умолчанию
        if (!LocalStorageDB.get('projects')) {
            const defaultProjects = [
                {
                    id: 1,
                    name: 'Очистка побережья Балтики',
                    description: 'Масштабная акция по очистке берегов Балтийского моря от пластика',
                    full_description: 'Полное описание проекта по очистке побережья...',
                    image: 'https://images.unsplash.com/photo-1618477461853-5f8dd68aa395?w=800',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'active',
                    target_amount: 500000,
                    collected_amount: 125000,
                    donation_amount: 2500,
                    total_hours: 120,
                    participants: { volunteers: 15, donors: 8 }
                },
                {
                    id: 2,
                    name: 'Спасение тюленей',
                    description: 'Программа реабилитации и спасения пострадавших тюленей',
                    full_description: 'Полное описание программы спасения тюленей...',
                    image: 'https://images.unsplash.com/photo-1579165466741-7f35a4755657?w=800',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'active',
                    target_amount: 300000,
                    collected_amount: 75000,
                    donation_amount: 3000,
                    total_hours: 80,
                    participants: { volunteers: 10, donors: 5 }
                },
                {
                    id: 3,
                    name: 'Восстановление коралловых рифов',
                    description: 'Проект по восстановлению и выращиванию кораллов',
                    full_description: 'Полное описание проекта по восстановлению кораллов...',
                    image: 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=800',
                    start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'planned',
                    target_amount: 800000,
                    collected_amount: 0,
                    donation_amount: 5000,
                    total_hours: 200,
                    participants: { volunteers: 0, donors: 0 }
                },
                {
                    id: 4,
                    name: 'Образовательные программы',
                    description: 'Обучение детей и взрослых экологии океана',
                    full_description: 'Полное описание образовательных программ...',
                    image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800',
                    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'completed',
                    target_amount: 200000,
                    collected_amount: 200000,
                    donation_amount: 2000,
                    total_hours: 50,
                    participants: { volunteers: 25, donors: 12 }
                }
            ];
            LocalStorageDB.set('projects', defaultProjects);
        }
        
        // Новости по умолчанию
        if (!LocalStorageDB.get('news')) {
            const defaultNews = [
                {
                    id: 1,
                    project_id: 1,
                    title: 'Очистка побережья началась!',
                    description: 'Стартовала масштабная акция по очистке берегов',
                    content: 'Сегодня началась масштабная акция по очистке побережья Балтийского моря. Волонтеры со всей области собрались, чтобы убрать мусор и пластик с пляжей.',
                    image: 'https://images.unsplash.com/photo-1618477461853-5f8dd68aa395?w=400',
                    category: 'news'
                },
                {
                    id: 2,
                    project_id: 2,
                    title: 'Спасены первые тюлени',
                    description: 'Волонтеры спасли 5 тюленей за неделю',
                    content: 'Наша команда спасателей успешно реабилитировала 5 тюленей за прошедшую неделю. Все животные уже чувствуют себя хорошо.',
                    image: 'https://images.unsplash.com/photo-1579165466741-7f35a4755657?w=400',
                    category: 'work'
                },
                {
                    id: 3,
                    project_id: 1,
                    title: 'Нужны волонтеры!',
                    description: 'Приглашаем всех желающих присоединиться к проекту',
                    content: 'Для успешного проведения акции по очистке побережья нам нужны волонтеры. Присоединяйтесь!',
                    image: 'https://images.unsplash.com/photo-1618477461853-5f8dd68aa395?w=400',
                    category: 'help'
                }
            ];
            LocalStorageDB.set('news', defaultNews);
        }
        
        // Пользователи по умолчанию
        if (!LocalStorageDB.get('users')) {
            const defaultUsers = [
                {
                    id: 1,
                    first_name: 'Админ',
                    last_name: 'Администратор',
                    email: 'admin@oaz-ocean.ru',
                    password: 'admin123',
                    role: 'admin',
                    is_volunteer: 0,
                    is_donor: 0
                }
            ];
            LocalStorageDB.set('users', defaultUsers);
        }
        
        return { message: 'Default data initialized in localStorage' };
    },
    
    // ============================================
    // СИНХРОНИЗАЦИЯ
    // ============================================
    
    /**
     * Принудительно синхронизировать все данные с API
     */
    async syncAll() {
        if (!API_CONFIG.isApiAvailable) {
            console.warn('API недоступен, синхронизация невозможна');
            return false;
        }
        
        try {
            await this.getUsers();
            await this.getProjects();
            await this.getNews();
            console.log('Синхронизация завершена успешно');
            return true;
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
            return false;
        }
    }
};

// ============================================
// ЭКСПОРТ
// ============================================

// Делаем API доступным глобально
window.API = API;
window.API_CONFIG = API_CONFIG;
window.LocalStorageDB = LocalStorageDB;
