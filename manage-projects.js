// ============================================
// Управление проектами для донатов (Админ) - JavaScript
// ============================================

let editingProjectId = null;

// Загрузка проектов для администратора
async function loadManageProjects() {
    try {
        // Загружаем проекты через API
        const projects = await API.getProjects();
        const container = document.getElementById('manageList');
        
        if (projects.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Нет проектов</p>';
            return;
        }
        
        container.innerHTML = projects.map(item => {
            const progress = Math.round((item.collected_amount / item.target_amount) * 100);
            return `
                <div class="manage-card">
                    <div class="manage-card-info">
                        <h4>${item.name}</h4>
                        <p>${item.description} | ${item.donation_amount} руб. | Прогресс: ${progress}%</p>
                    </div>
                    <div class="manage-card-actions">
                        <button class="btn-edit" onclick="editProject(${item.id})">Редактировать</button>
                        <button class="btn-delete" onclick="deleteProjectById(${item.id})">Удалить</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading projects:', error);
        alert('Ошибка при загрузке проектов');
    }
}

// Открыть модальное окно для добавления
function openProjectModal() {
    editingProjectId = null;
    document.getElementById('modalTitle').textContent = 'Добавить проект';
    document.getElementById('projectForm').reset();
    document.getElementById('projectId').value = '';
    document.getElementById('deleteProjectBtn').style.display = 'none';
    
    // Сбрасываем превью изображения
    document.getElementById('manageImagePreview').innerHTML = '';
    document.getElementById('manageProjectImageUrl').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('projectModal'));
    modal.show();
}

// Редактирование проекта
async function editProject(projectId) {
    try {
        // Загружаем проект через API
        const item = await API.getProject(projectId);
        
        if (!item) return;
        
        editingProjectId = projectId;
        document.getElementById('modalTitle').textContent = 'Редактировать проект';
        document.getElementById('deleteProjectBtn').style.display = 'inline-block';
        
        // Заполняем форму
        document.getElementById('projectId').value = item.id;
        document.getElementById('projectName').value = item.name;
        document.getElementById('projectDesc').value = item.description;
        document.getElementById('projectAmount').value = item.donation_amount;
        document.getElementById('manageProjectImageUrl').value = item.image || '';
        
        // Показываем превью изображения
        updateManageImagePreview(item.image);
        
        const modal = new bootstrap.Modal(document.getElementById('projectModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading project for edit:', error);
        alert('Ошибка при загрузке проекта');
    }
}

// Обработка загрузки изображения
async function handleManageImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        // Показываем индикатор загрузки
        document.getElementById('manageImagePreview').innerHTML = '<p>Загрузка...</p>';
        
        // Загружаем изображение через API
        const result = await API.uploadImage(file);
        
        if (result.success) {
            document.getElementById('manageProjectImageUrl').value = result.url;
            updateManageImagePreview(result.url);
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Ошибка при загрузке изображения');
        document.getElementById('manageImagePreview').innerHTML = '';
    }
}

// Обновление превью изображения
function updateManageImagePreview(url) {
    const preview = document.getElementById('manageImagePreview');
    if (url) {
        preview.innerHTML = `<img src="${url}" alt="Preview" style="max-width: 100%; max-height: 150px; border-radius: 8px;">`;
    } else {
        preview.innerHTML = '';
    }
}

// Сохранение проекта
async function saveProject() {
    const form = document.getElementById('projectForm');
    
    // Валидация
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const projectData = {
        name: document.getElementById('projectName').value,
        description: document.getElementById('projectDesc').value,
        donation_amount: parseInt(document.getElementById('projectAmount').value),
        image: document.getElementById('manageProjectImageUrl').value || 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400',
        target_amount: 100000,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active'
    };
    
    try {
        if (editingProjectId) {
            // Редактирование
            await API.updateProject(editingProjectId, projectData);
            alert('Проект обновлен!');
        } else {
            // Добавление нового
            await API.createProject(projectData);
            alert('Проект добавлен!');
        }
        
        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('projectModal'));
        modal.hide();
        
        // Перезагружаем список
        await loadManageProjects();
    } catch (error) {
        console.error('Error saving project:', error);
        alert(error.message || 'Ошибка при сохранении проекта');
    }
}

// Удаление проекта (из формы редактирования)
function deleteProject() {
    if (!editingProjectId) return;
    deleteProjectById(editingProjectId);
}

// Удаление проекта по ID
async function deleteProjectById(projectId) {
    if (!confirm('Вы уверены, что хотите удалить этот проект?')) return;
    
    try {
        await API.deleteProject(projectId);
        
        // Закрываем модальное окно если открыто
        const modalElement = document.getElementById('projectModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
        
        // Перезагружаем список
        await loadManageProjects();
        
        alert('Проект удален!');
    } catch (error) {
        console.error('Error deleting project:', error);
        alert('Ошибка при удалении проекта');
    }
}

// Загрузка проектов при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('manageList')) {
        loadManageProjects();
    }
});
