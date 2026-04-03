// ============================================
// Детали проекта - JavaScript
// ============================================

let currentProject = null;
let currentProjectId = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    // Получаем ID проекта из URL
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = parseInt(urlParams.get('id'));
    
    if (!currentProjectId) {
        window.location.href = 'projects.html';
        return;
    }
    
    await loadProjectDetails();
});

// Загрузка деталей проекта
async function loadProjectDetails() {
    try {
        // Загружаем проект через API
        currentProject = await API.getProject(currentProjectId);
        
        if (!currentProject) {
            alert('Проект не найден');
            window.location.href = 'projects.html';
            return;
        }
        
        // Заполняем информацию
        document.getElementById('projectImage').src = currentProject.image;
        document.getElementById('projectImage').alt = currentProject.name;
        document.getElementById('projectTitle').textContent = currentProject.name;
        document.getElementById('projectDescription').textContent = currentProject.description;
        document.getElementById('projectFullDescription').innerHTML = 
            currentProject.full_description || currentProject.description;
        
        // Даты
        document.getElementById('projectStartDate').textContent = formatDate(currentProject.start_date);
        document.getElementById('projectEndDate').textContent = formatDate(currentProject.end_date);
        
        // Часы
        document.getElementById('projectHours').textContent = `${currentProject.total_hours} ч.`;
        
        // Участники
        const participants = currentProject.participants || { volunteers: 0, donors: 0 };
        const totalParticipants = participants.volunteers + participants.donors;
        document.getElementById('projectParticipants').textContent = totalParticipants;
        
        // Прогресс
        const progress = Math.round((currentProject.collected_amount / currentProject.target_amount) * 100);
        document.getElementById('projectProgress').style.width = `${progress}%`;
        document.getElementById('projectAmounts').textContent = 
            `${currentProject.collected_amount.toLocaleString('ru-RU')} / ${currentProject.target_amount.toLocaleString('ru-RU')} руб.`;
        
        // Статус
        const statusText = {
            'active': 'Текущий',
            'planned': 'Запланирован',
            'completed': 'Завершен'
        }[currentProject.status] || currentProject.status;
        
        const statusBadge = document.getElementById('projectStatus');
        statusBadge.textContent = statusText;
        statusBadge.className = `status-badge status-${currentProject.status}`;
        
        // Обновляем кнопки
        await updateActionButtons();
    } catch (error) {
        console.error('Error loading project details:', error);
        alert('Ошибка при загрузке проекта');
    }
}

// Обновление кнопок действий
async function updateActionButtons() {
    const joinBtn = document.getElementById('joinBtn');
    const donateBtn = document.getElementById('donateBtn');
    
    // Если проект завершен - отключаем кнопки
    if (currentProject.status === 'completed') {
        joinBtn.disabled = true;
        joinBtn.textContent = 'Проект завершен';
        donateBtn.disabled = true;
        donateBtn.textContent = 'Проект завершен';
        return;
    }
    
    // Проверяем, присоединился ли пользователь
    if (AppState.currentUser) {
        const participation = await API.checkParticipation(currentProjectId, AppState.currentUser.id);
        if (participation.is_joined) {
            joinBtn.disabled = true;
            joinBtn.textContent = 'Вы участвуете';
        }
    }
}

// Обработка присоединения к проекту
function handleJoinProject() {
    // Проверка авторизации
    if (!AppState.currentUser) {
        sessionStorage.setItem('redirectAfterLogin', `project-detail.html?id=${currentProjectId}`);
        window.location.href = 'login.html';
        return;
    }
    
    // Показываем модальное окно подтверждения
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    document.getElementById('confirmMessage').textContent = 
        `Вы уверены, что хотите присоединиться к проекту "${currentProject.name}"?`;
    
    document.getElementById('confirmActionBtn').onclick = async function() {
        await joinProject();
        modal.hide();
    };
    
    modal.show();
}

// Присоединение к проекту
async function joinProject() {
    try {
        // Определяем роль пользователя
        let role = 'volunteer';
        if (AppState.currentUser.is_donor && !AppState.currentUser.is_volunteer) {
            role = 'donor';
        }
        
        // Отправляем запрос через API
        await API.joinProject(currentProjectId, AppState.currentUser.id, role);
        
        // Обновляем локальный кэш участников
        const participants = LocalStorageDB.get('project_participants') || [];
        participants.push({
            project_id: currentProjectId,
            user_id: AppState.currentUser.id,
            role: role,
            hours_contributed: 0,
            amount_donated: 0,
            joined_at: new Date().toISOString()
        });
        LocalStorageDB.set('project_participants', participants);
        
        alert('Вы успешно присоединились к проекту!');
        await loadProjectDetails();
    } catch (error) {
        alert(error.message || 'Ошибка при присоединении к проекту');
    }
}

// Обработка доната
function handleDonateProject() {
    // Проверка авторизации
    if (!AppState.currentUser) {
        sessionStorage.setItem('redirectAfterLogin', `project-detail.html?id=${currentProjectId}`);
        window.location.href = 'login.html';
        return;
    }
    
    // Переходим на страницу донатов с выбранным проектом
    sessionStorage.setItem('selectedProjectId', currentProjectId);
    window.location.href = 'donate.html';
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}
