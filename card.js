// ============================================
// Детали новости/карточки - JavaScript
// ============================================

let currentNewsId = null;

// Загрузка деталей новости
async function loadCardDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    currentNewsId = urlParams.get('id');
    
    if (!currentNewsId) return;
    
    try {
        // Загружаем новость через API
        const cardData = await API.getNewsItem(parseInt(currentNewsId));
        
        if (!cardData) {
            // Если не нашли в новостях, ищем в проектах
            const projects = await API.getProjects();
            const project = projects.find(p => p.id === parseInt(currentNewsId));
            
            if (project) {
                // Перенаправляем на страницу проекта
                window.location.href = `project-detail.html?id=${currentNewsId}`;
                return;
            }
            
            document.getElementById('cardTitle').textContent = 'Не найдено';
            document.getElementById('cardContent').textContent = 'Запрашиваемая новость не найдена.';
            return;
        }
        
        // Заполняем данные
        const imageEl = document.getElementById('cardImage');
        const titleEl = document.getElementById('cardTitle');
        const contentEl = document.getElementById('cardContent');
        
        if (imageEl) imageEl.src = cardData.image;
        if (titleEl) titleEl.textContent = cardData.title;
        if (contentEl) contentEl.textContent = cardData.content;
        
        // Загружаем комментарии
        await loadComments(parseInt(currentNewsId));
    } catch (error) {
        console.error('Error loading card detail:', error);
        document.getElementById('cardTitle').textContent = 'Ошибка';
        document.getElementById('cardContent').textContent = 'Ошибка при загрузке новости.';
    }
}

// Загрузка комментариев
async function loadComments(newsId) {
    const commentsList = document.getElementById('commentsList');
    const commentForm = document.getElementById('commentForm');
    const loginPrompt = document.getElementById('loginPrompt');
    
    if (!commentsList) return;
    
    // Показываем форму или приглашение войти
    if (AppState.currentUser) {
        if (commentForm) commentForm.classList.remove('hidden');
        if (loginPrompt) loginPrompt.classList.add('hidden');
    } else {
        if (commentForm) commentForm.classList.add('hidden');
        if (loginPrompt) loginPrompt.classList.remove('hidden');
    }
    
    try {
        // Загружаем комментарии через API
        const comments = await API.getComments(newsId);
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="text-center">Пока нет комментариев. Будьте первым!</p>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => `
            <div class="comment-item">
                <div class="comment-author">${comment.first_name} ${comment.last_name}</div>
                <div class="comment-date">${formatDate(comment.created_at)}</div>
                <div class="comment-text">${comment.content}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading comments:', error);
        commentsList.innerHTML = '<p class="text-center">Ошибка при загрузке комментариев</p>';
    }
}

// Добавление комментария
async function addComment(event) {
    event.preventDefault();
    
    if (!AppState.currentUser) {
        alert('Пожалуйста, войдите в систему, чтобы оставить комментарий');
        return;
    }
    
    const textarea = document.getElementById('commentText');
    const text = textarea.value.trim();
    
    if (!text) return;
    
    try {
        // Создаем комментарий через API
        await API.createComment(parseInt(currentNewsId), AppState.currentUser.id, text);
        
        // Очищаем поле и перезагружаем комментарии
        textarea.value = '';
        await loadComments(parseInt(currentNewsId));
    } catch (error) {
        alert(error.message || 'Ошибка при добавлении комментария');
    }
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
