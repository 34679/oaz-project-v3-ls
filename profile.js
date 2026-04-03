// ============================================
// Личный кабинет - JavaScript
// ============================================

// Инициализация профиля
async function initProfile() {
    // Проверка авторизации
    if (!AppState.currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Обновляем UI
    updateAuthUI();
    
    // Заполняем информацию о пользователе
    const profileName = document.getElementById('profileName');
    const profileRole = document.getElementById('profileRole');
    
    if (profileName) {
        profileName.textContent = `${AppState.currentUser.first_name} ${AppState.currentUser.last_name}`;
    }
    
    if (profileRole) {
        const roleText = {
            'user': 'Участник',
            'volunteer': 'Волонтер',
            'donor': 'Благотворитель',
            'volunteer_donor': 'Волонтер и Благотворитель',
            'admin': 'Администратор'
        }[AppState.currentUser.role] || 'Участник';
        
        profileRole.textContent = roleText;
    }
    
    // Загружаем данные книжек
    await loadVolunteerBook();
    await loadDonorBook();
}

// Переключение между книжками
function switchBook(bookType) {
    const volunteerBook = document.getElementById('volunteerBook');
    const donorBook = document.getElementById('donorBook');
    const volunteerTab = document.getElementById('volunteerTab');
    const donorTab = document.getElementById('donorTab');
    
    if (bookType === 'volunteer') {
        volunteerBook.classList.remove('hidden');
        donorBook.classList.add('hidden');
        volunteerTab.classList.add('active');
        donorTab.classList.remove('active');
    } else {
        volunteerBook.classList.add('hidden');
        donorBook.classList.remove('hidden');
        volunteerTab.classList.remove('active');
        donorTab.classList.add('active');
    }
}

// Загрузка книжки волонтера
async function loadVolunteerBook() {
    if (!AppState.currentUser) return;
    
    const userId = AppState.currentUser.id;
    
    try {
        // Загружаем данные через API
        const [projects, participations, volunteerHours] = await Promise.all([
            API.getProjects(),
            API.getProjectParticipants(userId).catch(() => []),
            API.getVolunteerHours(userId).catch(() => [])
        ]);
        
        // Фильтруем участие пользователя как волонтера
        const userParticipations = participations.filter(p => p.role === 'volunteer');
        
        // Разделяем проекты по статусам
        const currentProjects = [];
        const plannedProjects = [];
        const archiveProjects = [];
        
        let totalHours = 0;
        
        userParticipations.forEach(part => {
            const project = projects.find(p => p.id === part.project_id);
            if (!project) return;
            
            // Суммируем часы
            const hours = part.hours_contributed || 0;
            totalHours += hours;
            
            // Добавляем в соответствующий список
            const projectData = {
                ...project,
                user_hours: hours
            };
            
            if (project.status === 'active') {
                currentProjects.push(projectData);
            } else if (project.status === 'planned') {
                plannedProjects.push(projectData);
            } else if (project.status === 'completed') {
                archiveProjects.push(projectData);
            }
        });
        
        // Добавляем часы из отдельных записей
        volunteerHours.forEach(h => {
            totalHours += h.hours || 0;
        });
        
        // Отрисовываем проекты
        renderProjectList('volunteerCurrentProjects', currentProjects, 'volunteer');
        renderProjectList('volunteerPlannedProjects', plannedProjects, 'volunteer');
        renderProjectList('volunteerArchiveProjects', archiveProjects, 'volunteer');
        
        // Скрываем пустые секции
        toggleSection('volunteerCurrentSection', currentProjects.length > 0);
        toggleSection('volunteerPlannedSection', plannedProjects.length > 0);
        toggleSection('volunteerArchiveSection', archiveProjects.length > 0);
        
        // Обновляем статистику
        document.getElementById('volunteerTotalProjects').textContent = userParticipations.length;
        document.getElementById('volunteerTotalHours').textContent = totalHours;
    } catch (error) {
        console.error('Error loading volunteer book:', error);
    }
}

// Загрузка книжки благотворителя
async function loadDonorBook() {
    if (!AppState.currentUser) return;
    
    const userId = AppState.currentUser.id;
    
    try {
        // Загружаем данные через API
        const [projects, participations, donations] = await Promise.all([
            API.getProjects(),
            API.getProjectParticipants(userId).catch(() => []),
            API.getUserDonations(userId).catch(() => [])
        ]);
        
        // Фильтруем участие пользователя как донора
        const userParticipations = participations.filter(p => p.role === 'donor');
        
        // Разделяем проекты по статусам
        const currentProjects = [];
        const plannedProjects = [];
        const archiveProjects = [];
        
        let totalAmount = 0;
        
        // Обрабатываем участия
        userParticipations.forEach(part => {
            const project = projects.find(p => p.id === part.project_id);
            if (!project) return;
            
            // Суммируем пожертвования
            const amount = part.amount_donated || 0;
            totalAmount += amount;
            
            // Добавляем в соответствующий список
            const projectData = {
                ...project,
                user_amount: amount
            };
            
            if (project.status === 'active') {
                currentProjects.push(projectData);
            } else if (project.status === 'planned') {
                plannedProjects.push(projectData);
            } else if (project.status === 'completed') {
                archiveProjects.push(projectData);
            }
        });
        
        // Добавляем суммы из отдельных донатов
        donations.forEach(d => {
            totalAmount += d.amount || 0;
            
            // Если донат привязан к проекту, добавляем в список
            if (d.project_id) {
                const project = projects.find(p => p.id === d.project_id);
                if (project) {
                    const existingProject = [...currentProjects, ...plannedProjects, ...archiveProjects]
                        .find(p => p.id === d.project_id);
                    
                    if (!existingProject) {
                        const projectData = {
                            ...project,
                            user_amount: d.amount
                        };
                        
                        if (project.status === 'active') {
                            currentProjects.push(projectData);
                        } else if (project.status === 'planned') {
                            plannedProjects.push(projectData);
                        } else if (project.status === 'completed') {
                            archiveProjects.push(projectData);
                        }
                    } else {
                        existingProject.user_amount = (existingProject.user_amount || 0) + d.amount;
                    }
                }
            }
        });
        
        // Отрисовываем проекты
        renderProjectList('donorCurrentProjects', currentProjects, 'donor');
        renderProjectList('donorPlannedProjects', plannedProjects, 'donor');
        renderProjectList('donorArchiveProjects', archiveProjects, 'donor');
        
        // Скрываем пустые секции
        toggleSection('donorCurrentSection', currentProjects.length > 0);
        toggleSection('donorPlannedSection', plannedProjects.length > 0);
        toggleSection('donorArchiveSection', archiveProjects.length > 0);
        
        // Обновляем статистику
        const uniqueProjects = new Set([
            ...userParticipations.map(p => p.project_id),
            ...donations.filter(d => d.project_id).map(d => d.project_id)
        ]);
        
        document.getElementById('donorTotalProjects').textContent = uniqueProjects.size;
        document.getElementById('donorTotalAmount').textContent = totalAmount.toLocaleString('ru-RU');
    } catch (error) {
        console.error('Error loading donor book:', error);
    }
}

// Отрисовка списка проектов
function renderProjectList(containerId, projects, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-projects" style="grid-column: 1/-1;">
                <i class="fas fa-inbox"></i>
                <p>Нет проектов в этой категории</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = projects.map(project => {
        const extraInfo = type === 'volunteer' 
            ? `<p><i class="fas fa-clock"></i> ${project.user_hours || 0} ч.</p>`
            : `<p><i class="fas fa-donate"></i> ${(project.user_amount || 0).toLocaleString('ru-RU')} руб.</p>`;
        
        return `
            <div class="project-card">
                <img src="${project.image}" alt="${project.name}">
                <h5>${project.name}</h5>
                ${extraInfo}
            </div>
        `;
    }).join('');
}

// Показать/скрыть секцию
function toggleSection(sectionId, show) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = show ? 'block' : 'none';
    }
}
