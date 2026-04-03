// ============================================
// Каталог новостей - JavaScript
// ============================================

let currentCategory = 'news';
let newsData = [];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    await loadNews();
    initTabs();
    initSwipe();
});

// Загрузка новостей
async function loadNews() {
    try {
        // Загружаем новости через API
        newsData = await API.getNews();
        renderNews();
    } catch (error) {
        console.error('Error loading news:', error);
        newsData = [];
        renderNews();
    }
}

// Инициализация вкладок
function initTabs() {
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            renderNews();
        });
    });
}

// Инициализация свайпа
function initSwipe() {
    const catalogSection = document.querySelector('.catalog-section');
    if (!catalogSection) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    const categories = ['news', 'work', 'help'];
    let currentIndex = 0;
    
    catalogSection.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    catalogSection.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        currentIndex = categories.indexOf(currentCategory);
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0 && currentIndex < categories.length - 1) {
                // Свайп влево - следующая категория
                switchCategory(categories[currentIndex + 1]);
            } else if (diff < 0 && currentIndex > 0) {
                // Свайп вправо - предыдущая категория
                switchCategory(categories[currentIndex - 1]);
            }
        }
    }
}

// Переключение категории
function switchCategory(category) {
    currentCategory = category;
    
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === category);
    });
    
    renderNews();
}

// Отрисовка новостей
function renderNews() {
    const grid = document.getElementById('newsGrid');
    if (!grid) return;
    
    const filteredNews = newsData.filter(n => n.category === currentCategory);
    
    if (filteredNews.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1;">Нет новостей в этой категории</p>';
        return;
    }
    
    grid.innerHTML = filteredNews.map(news => `
        <div class="news-card">
            <img src="${news.image}" alt="${news.title}" class="news-card-image">
            <div class="news-card-content">
                <h3 class="news-card-title">${news.title}</h3>
                <p class="news-card-desc">${news.description}</p>
                <a href="card.html?id=${news.id}" class="news-card-btn">Подробнее</a>
            </div>
        </div>
    `).join('');
}
