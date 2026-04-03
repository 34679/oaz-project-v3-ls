// ============================================
// Управление новостями (Админ) - JavaScript
// ============================================

let editingNewsId = null;

// Загрузка новостей для администратора
async function loadManageNews() {
    try {
        // Загружаем новости через API
        const news = await API.getNews();
        const container = document.getElementById('manageList');
        
        if (news.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">Нет новостей</p>';
            return;
        }
        
        container.innerHTML = news.map(item => {
            const categoryText = {
                'news': 'Новость',
                'work': 'Проделанная работа',
                'help': 'Помощь'
            }[item.category] || item.category;
            
            return `
                <div class="manage-card">
                    <div class="manage-card-info">
                        <h4>${item.title}</h4>
                        <p>${item.description} | ${categoryText}</p>
                    </div>
                    <div class="manage-card-actions">
                        <button class="btn-edit" onclick="editNews(${item.id})">Редактировать</button>
                        <button class="btn-delete" onclick="deleteNewsById(${item.id})">Удалить</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading news:', error);
        alert('Ошибка при загрузке новостей');
    }
}

// Загрузка проектов в выпадающий список
async function loadProjectsSelect() {
    try {
        const projects = await API.getProjects();
        const select = document.getElementById('newsProject');
        
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Без проекта</option>' + 
            projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        
        select.value = currentValue;
    } catch (error) {
        console.error('Error loading projects for select:', error);
    }
}

// Открыть модальное окно для добавления
async function openNewsModal() {
    editingNewsId = null;
    document.getElementById('modalTitle').textContent = 'Добавить новость';
    document.getElementById('newsForm').reset();
    document.getElementById('newsId').value = '';
    document.getElementById('deleteNewsBtn').style.display = 'none';
    
    // Сбрасываем превью изображения
    document.getElementById('newsImagePreview').innerHTML = '';
    document.getElementById('newsImageUrl').value = '';
    
    await loadProjectsSelect();
    
    const modal = new bootstrap.Modal(document.getElementById('newsModal'));
    modal.show();
}

// Редактирование новости
async function editNews(newsId) {
    try {
        // Загружаем новость через API
        const item = await API.getNewsItem(newsId);
        
        if (!item) return;
        
        editingNewsId = newsId;
        document.getElementById('modalTitle').textContent = 'Редактировать новость';
        document.getElementById('deleteNewsBtn').style.display = 'inline-block';
        
        await loadProjectsSelect();
        
        // Заполняем форму
        document.getElementById('newsId').value = item.id;
        document.getElementById('newsTitle').value = item.title;
        document.getElementById('newsDesc').value = item.description;
        document.getElementById('newsContent').value = item.content;
        document.getElementById('newsCategory').value = item.category;
        document.getElementById('newsProject').value = item.project_id || '';
        document.getElementById('newsImageUrl').value = item.image || '';
        
        // Показываем превью изображения
        updateNewsImagePreview(item.image);
        
        const modal = new bootstrap.Modal(document.getElementById('newsModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading news for edit:', error);
        alert('Ошибка при загрузке новости');
    }
}

// Обработка загрузки изображения новости
async function handleNewsImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        // Показываем индикатор загрузки
        document.getElementById('newsImagePreview').innerHTML = '<p>Загрузка...</p>';
        
        // Загружаем изображение через API
        const result = await API.uploadImage(file);
        
        if (result.success) {
            document.getElementById('newsImageUrl').value = result.url;
            updateNewsImagePreview(result.url);
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Ошибка при загрузке изображения');
        document.getElementById('newsImagePreview').innerHTML = '';
    }
}

// Обновление превью изображения новости
function updateNewsImagePreview(url) {
    const preview = document.getElementById('newsImagePreview');
    if (url) {
        preview.innerHTML = `<img src="${url}" alt="Preview" style="max-width: 100%; max-height: 150px; border-radius: 8px;">`;
    } else {
        preview.innerHTML = '';
    }
}

// Сохранение новости
async function saveNews() {
    const form = document.getElementById('newsForm');
    
    // Валидация
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const newsData = {
        title: document.getElementById('newsTitle').value,
        description: document.getElementById('newsDesc').value,
        content: document.getElementById('newsContent').value,
        category: document.getElementById('newsCategory').value,
        project_id: document.getElementById('newsProject').value || null,
        image: document.getElementById('newsImageUrl').value || 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400'
    };
    
    try {
        if (editingNewsId) {
            // Редактирование
            await API.updateNews(editingNewsId, newsData);
            alert('Новость обновлена!');
        } else {
            // Добавление новой
            await API.createNews(newsData);
            alert('Новость добавлена!');
        }
        
        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('newsModal'));
        modal.hide();
        
        // Перезагружаем список
        await loadManageNews();
    } catch (error) {
        console.error('Error saving news:', error);
        alert(error.message || 'Ошибка при сохранении новости');
    }
}

// Удаление новости (из формы редактирования)
function deleteNews() {
    if (!editingNewsId) return;
    deleteNewsById(editingNewsId);
}

// Удаление новости по ID
async function deleteNewsById(newsId) {
    if (!confirm('Вы уверены, что хотите удалить эту новость?')) return;
    
    try {
        await API.deleteNews(newsId);
        
        // Закрываем модальное окно если открыто
        const modalElement = document.getElementById('newsModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
        
        // Перезагружаем список
        await loadManageNews();
        
        alert('Новость удалена!');
    } catch (error) {
        console.error('Error deleting news:', error);
        alert('Ошибка при удалении новости');
    }
}

// Загрузка новостей при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('manageList')) {
        loadManageNews();
    }
});
