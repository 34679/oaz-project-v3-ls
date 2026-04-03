// ============================================
// Страница Проекты - JavaScript
// ============================================

// Данные проектов
let projectsData = [];
let currentFilter = 'all';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    await loadProjects();
    initFilters();
});

// Загрузка проектов
async function loadProjects() {
    try {
        // Загружаем проекты через API
        projectsData = await API.getProjects();
        renderProjects();
    } catch (error) {
        console.error('Error loading projects:', error);
        // Fallback уже обработан в API
        projectsData = [];
        renderProjects();
    }
}

// Инициализация фильтров
function initFilters() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderProjects();
        });
    });
}

// Отрисовка проектов
function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    
    // Фильтрация проектов
    let filteredProjects = projectsData;
    if (currentFilter !== 'all') {
        filteredProjects = projectsData.filter(p => p.status === currentFilter);
    }
    
    if (filteredProjects.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center">
                <p style="padding: 40px; color: #666;">Нет проектов в этой категории</p>
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
                    <h3 class="project-title">${project.name}</h3>
                    
                    <div class="project-info-row">
                        <span class="project-info-label">Участники</span>
                    </div>
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
                            ${project.collected_amount.toLocaleString('ru-RU')} / ${project.target_amount.toLocaleString('ru-RU')} руб.
                        </div>
                    </div>
                    
                    <div class="project-info-row">
                        <span class="project-info-label"><i class="fas fa-clock"></i> Часы работы</span>
                        <span class="project-info-value">${project.total_hours} ч.</span>
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
    
    // Проверяем в локальном кэше участников
    const participants = LocalStorageDB.get('project_participants') || [];
    return participants.some(p => 
        p.project_id === projectId && 
        p.user_id === AppState.currentUser.id
    );
}

// Обработка присоединения к проекту
function handleJoin(projectId) {
    // Проверка авторизации
    if (!AppState.currentUser) {
        // Сохраняем URL для возврата
        sessionStorage.setItem('redirectAfterLogin', 'projects.html');
        window.location.href = 'login.html';
        return;
    }
    
    // Показываем модальное окно подтверждения
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    document.getElementById('confirmMessage').textContent = 
        'Вы уверены, что хотите присоединиться к проекту?';
    
    document.getElementById('confirmBtn').onclick = async function() {
        await joinProject(projectId);
        modal.hide();
    };
    
    modal.show();
}

// Присоединение к проекту
async function joinProject(projectId) {
    try {
        // Определяем роль пользователя
        let role = 'volunteer';
        if (AppState.currentUser.is_donor && !AppState.currentUser.is_volunteer) {
            role = 'donor';
        }
        
        // Отправляем запрос через API
        await API.joinProject(projectId, AppState.currentUser.id, role);
        
        // Обновляем локальный кэш участников
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
        
        // Обновляем данные проектов
        await loadProjects();
        
        alert('Вы успешно присоединились к проекту!');
    } catch (error) {
        alert(error.message || 'Ошибка при присоединении к проекту');
    }
}

// Обработка доната
function handleDonate(projectId) {
    // Проверка авторизации
    if (!AppState.currentUser) {
        sessionStorage.setItem('redirectAfterLogin', 'projects.html');
        window.location.href = 'login.html';
        return;
    }
    
    // Переходим на страницу донатов с выбранным проектом
    sessionStorage.setItem('selectedProjectId', projectId);
    window.location.href = 'donate.html';
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}
