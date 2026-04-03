// ============================================
// Океанский Альянс Защиты (ОАЗ)
// Основной JavaScript файл
// ============================================

// Глобальное состояние приложения
const AppState = {
    currentUser: null,
    currentSlide: 0,
    selectedProjects: [],
    currentCategory: 'news'
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    // Инициализируем API клиент и данные по умолчанию
    await API.initDefaultData();
    
    // Загружаем текущего пользователя
    AppState.currentUser = API.getCurrentUser();
    
    initNavigation();
    initSlider();
    updateAuthUI();
});

// ============================================
// НАВИГАЦИЯ
// ============================================
function initNavigation() {
    // Обновляем активный пункт меню
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === currentPage || (currentPage === '' && href === 'index.html'))) {
            link.classList.add('active');
        }
    });
}

function updateAuthUI() {
    const authNav = document.getElementById('authNav');
    if (!authNav) return;
    
    if (AppState.currentUser) {
        const isAdmin = AppState.currentUser.role === 'admin';
        const profileLink = isAdmin ? 'admin.html' : 'profile.html';
        authNav.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="${profileLink}">
                    <i class="fas fa-user"></i> ${AppState.currentUser.first_name}
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="logout(); return false;">
                    <i class="fas fa-sign-out-alt"></i> Выход
                </a>
            </li>
        `;
    } else {
        authNav.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="login.html">
                    <i class="fas fa-sign-in-alt"></i> Вход/Регистрация
                </a>
            </li>
        `;
    }
}

function logout() {
    API.logout();
    AppState.currentUser = null;
    window.location.href = 'index.html';
}

// ============================================
// СЛАЙДЕР
// ============================================
function initSlider() {
    const slider = document.querySelector('.news-slider');
    if (!slider) return;
    
    const slides = slider.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.slider-arrow.prev');
    const nextBtn = document.querySelector('.slider-arrow.next');
    
    if (!slides.length) return;
    
    function showSlide(index) {
        AppState.currentSlide = index;
        slider.style.transform = `translateX(-${index * 100}%)`;
        
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }
    
    function nextSlide() {
        showSlide((AppState.currentSlide + 1) % slides.length);
    }
    
    function prevSlide() {
        showSlide((AppState.currentSlide - 1 + slides.length) % slides.length);
    }
    
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => showSlide(index));
    });
    
    // Автоматическое перелистывание
    setInterval(nextSlide, 5000);
}

// ============================================
// АУТЕНТИФИКАЦИЯ
// ============================================
async function register(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isVolunteer = document.getElementById('isVolunteer').checked;
    const isDonor = document.getElementById('isDonor').checked;
    
    if (!firstName || !lastName || !email || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    try {
        // Создаем пользователя через API
        const result = await API.createUser({
            first_name: firstName,
            last_name: lastName,
            email: email,
            password: password,
            is_volunteer: isVolunteer,
            is_donor: isDonor
        });
        
        // Авторизуем пользователя
        const user = await API.login(email, password);
        AppState.currentUser = user;
        
        alert('Регистрация успешна!');
        
        // Перенаправление
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
        } else {
            window.location.href = 'profile.html';
        }
    } catch (error) {
        alert(error.message || 'Ошибка при регистрации');
    }
}

async function login(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Проверка администратора (хардкод для демо)
    if (email === 'admin@oaz-ocean.ru' && password === 'admin123') {
        try {
            const user = await API.login(email, password);
            AppState.currentUser = user;
            window.location.href = 'admin.html';
            return;
        } catch (e) {
            // Если API недоступен, используем fallback
            const admin = {
                id: 1,
                first_name: 'Админ',
                last_name: 'Администратор',
                email: email,
                role: 'admin',
                is_volunteer: 0,
                is_donor: 0
            };
            LocalStorageDB.set('currentUser', admin);
            AppState.currentUser = admin;
            window.location.href = 'admin.html';
            return;
        }
    }
    
    try {
        const user = await API.login(email, password);
        AppState.currentUser = user;
        
        // Перенаправление
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
        } else {
            window.location.href = 'profile.html';
        }
    } catch (error) {
        alert('Неверный email или пароль');
    }
}

// ============================================
// СТАТИСТИКА (для главной страницы)
// ============================================
async function loadStats() {
    try {
        const stats = await API.getStats();
        
        // Обновляем элементы на странице если они есть
        const donationsEl = document.getElementById('totalDonations');
        const hoursEl = document.getElementById('totalHours');
        
        if (donationsEl) {
            donationsEl.textContent = (stats.total_donations || 0).toLocaleString('ru-RU') + ' ₽';
        }
        if (hoursEl) {
            hoursEl.textContent = (stats.total_volunteer_hours || 0).toLocaleString('ru-RU') + ' ч.';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Загружаем статистику если есть соответствующие элементы
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('totalDonations') || document.getElementById('totalHours')) {
        loadStats();
    }
});
