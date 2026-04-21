// ============================================
// Страница Проекты - JavaScript
// ============================================

let projectsData = [];
let currentFilter = 'all';
let searchQuery = '';
let currentSort = 'newest';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    await loadProjects();
    initFilters();
    initSearch();
    initSort();
});

// Загрузка проектов
async function loadProjects() {
    try {
        projectsData = await API.getProjects();
        renderProjects();
    } catch (error) {
        console.error('Error loading projects:', error);
        projectsData = [];
        renderProjects();
    }
}

// Инициализация фильтров по статусу
function initFilters() {
    document.querySelectorAll('.filter-tab[data-filter]').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab[data-filter]').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderProjects();
        });
    });
}

// Инициализация поиска
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        searchQuery = this.value.toLowerCase().trim();
        renderProjects();
    });
}

// Инициализация сортировки
function initSort() {
    const sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;
    
    sortSelect.addEventListener('change', function() {
        currentSort = this.value;
        renderProjects();
    });
}

// Сортировка проектов
function sortProjects(projects, sortType) {
    const sorted = [...projects];
    switch (sortType) {
        case 'newest':
            return sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        case 'oldest':
            return sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
        case 'name_asc':
            return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        case 'name_desc':
            return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        case 'progress_desc':
            return sorted.sort((a, b) => {
                const progressA = (a.collected_amount / a.target_amount) || 0;
                const progressB = (b.collected_amount / b.target_amount) || 0;
                return progressB - progressA;
            });
        case 'progress_asc':
            return sorted.sort((a, b) => {
                const progressA = (a.collected_amount / a.target_amount) || 0;
                const progressB = (b.collected_amount / b.target_amount) || 0;
                return progressA - progressB;
            });
        default:
            return sorted;
    }
}

// Подсветка найденного текста
function highlightSearch(text) {
    if (!searchQuery || !text) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark style="background-color: rgba(247, 86, 124, 0.3); border-radius: 3px; padding: 0 2px;">$1</mark>');
}

// Отрисовка проектов
function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    
    // Фильтрация по статусу
    let filteredProjects = projectsData;
    if (currentFilter !== 'all') {
        filteredProjects = projectsData.filter(p => p.status === currentFilter);
    }
    
    // Фильтрация по поиску
    if (searchQuery) {
        filteredProjects = filteredProjects.filter(p => 
            (p.name && p.name.toLowerCase().includes(searchQuery)) ||
            (p.description && p.description.toLowerCase().includes(searchQuery))
        );
    }
    
    // Сортировка
    filteredProjects = sortProjects(filteredProjects, currentSort);
    
    if (filteredProjects.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center">
                <p style="padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 15px; display: block;"></i>
                    ${searchQuery ? 'Ничего не найдено по запросу "' + searchQuery + '"' : 'Нет проектов в этой категории'}
                </p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredProjects.map(project => {
        const progress = Math.round((project.collected_amount / project.target_amount) * 100);
        const statusClass = `status-${project.status}`;
        const statusText = {
            'active': 'Текущий',
            'planned': 'Запланирован',
            'completed': 'Завершен'
        }[project.status];
        
        const isJoined = isUserJoined(project.id);
        const joinBtnText = isJoined ? 'Вы участвуете' : 'Присоединиться';
        const joinBtnDisabled = isJoined || project.status === 'completed' ? 'disabled' : '';
        
        return `
            <div class="col-md-6 col-lg-4">
                <div class="project-card">
                    <h3 class="project-title">${highlightSearch(project.name)}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 15px;">${highlightSearch(project.description)}</p>
                    
                    <div class="project-info-row">
                        <span class="project-info-label"><i class="fas fa-hands-helping"></i> Волонтер</span>
                        <span class="project-info-value">${project.participants?.volunteers || 0}</span>
                    </div>
                    <div class="project-info-row">
                        <span class="project-info-label"><i class="fas fa-heart"></i> Благотворитель</span>
                        <span class="project-info-value">${project.participants?.donors || 0}</span>
                    </div>
                    
                    <div class="progress-bar-container">
                        <div class="progress">
                            <div class="progress-bar" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-text">
                            ${(project.collected_amount || 0).toLocaleString('ru-RU')} / ${(project.target_amount || 0).toLocaleString('ru-RU')} руб.
                        </div>
                    </div>
                    
                    <div class="project-info-row">
                        <span class="project-info-label"><i class="fas fa-clock"></i> Часы работы</span>
                        <span class="project-info-value">${project.total_hours || 0} ч.</span>
                    </div>
                    
                    <div class="project-info-row">
                        <span class="project-info-label"><i class="fas fa-info-circle"></i> Статус</span>
                        <span class="project-status ${statusClass}">
                            <i class="fas fa-circle" style="font-size: 8px;"></i> ${statusText}
                        </span>
                    </div>
                    
                    <div class="project-dates">
                        <i class="fas fa-calendar-alt"></i> 
                        ${formatDate(project.start_date)} - ${formatDate(project.end_date)}
                    </div>
                    
                    <div class="project-actions">
                        <button class="btn-project btn-join" ${joinBtnDisabled} onclick="handleJoin(${project.id})">
                            ${joinBtnText}
                        </button>
                        <a href="project-detail.html?id=${project.id}" class="btn-project btn-details">
                            Подробнее
                        </a>
                    </div>
                    
                    ${project.status !== 'completed' ? `
                        <button class="btn-project btn-donate mt-2" onclick="handleDonate(${project.id})">
                            <i class="fas fa-donate"></i> Задонатить
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Проверка, присоединился ли пользователь к проекту
function isUserJoined(projectId) {
    if (!AppState.currentUser) return false;
    const participants = LocalStorageDB.get('project_participants') || [];
    return participants.some(p => p.project_id === projectId && p.user_id === AppState.currentUser.id);
}

// Обработка присоединения к проекту
function handleJoin(projectId) {
    if (!AppState.currentUser) {
        sessionStorage.setItem('redirectAfterLogin', 'projects.html');
        window.location.href = 'login.html';
        return;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    document.getElementById('confirmMessage').textContent = 'Вы уверены, что хотите присоединиться к проекту?';
    
    document.getElementById('confirmBtn').onclick = async function() {
        await joinProject(projectId);
        modal.hide();
    };
    
    modal.show();
}

// Присоединение к проекту
async function joinProject(projectId) {
    try {
        let role = 'volunteer';
        if (AppState.currentUser.is_donor && !AppState.currentUser.is_volunteer) {
            role = 'donor';
        }
        
        await API.joinProject(projectId, AppState.currentUser.id, role);
        
        const participants = LocalStorageDB.get('project_participants') || [];
        participants.push({
            project_id: projectId,
            user_id: AppState.currentUser.id,
            role: role,
            hours_contributed: 0,
            amount_donated: 0,
            joined_at: new Date().toISOString()
        });
        LocalStorageDB.set('project_participants', participants);
        
        await loadProjects();
        showNotification('Вы успешно присоединились к проекту!', 'success');
    } catch (error) {
        showNotification(error.message || 'Ошибка при присоединении к проекту', 'error');
    }
}

// Обработка доната
function handleDonate(projectId) {
    if (!AppState.currentUser) {
        sessionStorage.setItem('redirectAfterLogin', 'projects.html');
        window.location.href = 'login.html';
        return;
    }
    
    sessionStorage.setItem('selectedProjectId', projectId);
    window.location.href = 'donate.html';
}

// Показ уведомления
function showNotification(message, type) {
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        ${message}
    `;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 15px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideInRight 0.4s ease;
        background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeIn 0.4s ease reverse';
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}