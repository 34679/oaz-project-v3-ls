#!/usr/bin/env python3
"""
API для Океанского Альянса Защиты (ОАЗ)
REST API на Flask для работы с базой данных SQLite
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
import hashlib
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)

# Конфигурация
DATABASE = os.path.join(os.path.dirname(__file__), 'database.db')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Создаем папку для загрузок если её нет
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_db_connection():
    """Получение соединения с базой данных"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def allowed_file(filename):
    """Проверка разрешенных расширений файлов"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def init_db():
    """Инициализация базы данных"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # ============================================
    # Таблица пользователей
    # ============================================
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_volunteer INTEGER DEFAULT 0,
        is_donor INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # ============================================
    # Таблица проектов (полная схема)
    # ============================================
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        full_description TEXT,
        image TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status TEXT DEFAULT 'planned',
        target_amount INTEGER NOT NULL DEFAULT 100000,
        collected_amount INTEGER DEFAULT 0,
        donation_amount INTEGER DEFAULT 2500,
        total_hours INTEGER DEFAULT 0,
        manager_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # ============================================
    # Таблица участников проектов
    # ============================================
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS project_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'volunteer',
        hours_contributed INTEGER DEFAULT 0,
        amount_donated INTEGER DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id, role),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')
    
    # ============================================
    # Таблица новостей
    # ============================================
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        content TEXT NOT NULL,
        image TEXT,
        category TEXT DEFAULT 'news',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
    ''')
    
    # ============================================
    # Таблица комментариев
    # ============================================
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        news_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')
    
    # ============================================
    # Таблица донатов
    # ============================================
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        project_id INTEGER,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
    ''')
    
    # ============================================
    # Таблица волонтерских часов
    # ============================================
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS volunteer_hours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        hours INTEGER NOT NULL,
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully!")

# ============================================
# ЗАГРУЗКА ИЗОБРАЖЕНИЙ
# ============================================

@app.route('/api/upload', methods=['POST'])
def upload_image():
    """Загрузка изображения на сервер"""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        # Генерируем уникальное имя файла
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'url': f'/uploads/{filename}'
        })
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/uploads/<filename>')
def serve_image(filename):
    """Отдача изображений"""
    return send_from_directory(UPLOAD_FOLDER, filename)

# ============================================
# API Endpoints для пользователей
# ============================================

@app.route('/api/users', methods=['GET'])
def get_users():
    """Получение списка пользователей"""
    conn = get_db_connection()
    users = conn.execute('''
        SELECT id, first_name, last_name, email, role, is_volunteer, is_donor, created_at 
        FROM users
    ''').fetchall()
    conn.close()
    return jsonify([dict(user) for user in users])

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Получение пользователя по ID"""
    conn = get_db_connection()
    user = conn.execute('''
        SELECT id, first_name, last_name, email, role, is_volunteer, is_donor, created_at 
        FROM users WHERE id = ?
    ''', (user_id,)).fetchone()
    conn.close()
    if user is None:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(dict(user))

@app.route('/api/users', methods=['POST'])
def create_user():
    """Создание нового пользователя (регистрация)"""
    data = request.get_json()
    
    if not all(k in data for k in ('first_name', 'last_name', 'email', 'password')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Определяем роль на основе флагов
    role = 'user'
    is_volunteer = 1 if data.get('is_volunteer') else 0
    is_donor = 1 if data.get('is_donor') else 0
    
    if is_volunteer and is_donor:
        role = 'volunteer_donor'
    elif is_volunteer:
        role = 'volunteer'
    elif is_donor:
        role = 'donor'
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (first_name, last_name, email, password, role, is_volunteer, is_donor)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (data['first_name'], data['last_name'], data['email'], data['password'], role, is_volunteer, is_donor))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return jsonify({
            'id': user_id, 
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'email': data['email'],
            'role': role,
            'message': 'User created successfully'
        }), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Email already exists'}), 409

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Обновление пользователя"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Получаем текущие данные
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user:
        conn.close()
        return jsonify({'error': 'User not found'}), 404
    
    # Обновляем поля
    is_volunteer = data.get('is_volunteer', user['is_volunteer'])
    is_donor = data.get('is_donor', user['is_donor'])
    
    # Пересчитываем роль
    role = 'user'
    if is_volunteer and is_donor:
        role = 'volunteer_donor'
    elif is_volunteer:
        role = 'volunteer'
    elif is_donor:
        role = 'donor'
    
    cursor.execute('''
        UPDATE users 
        SET first_name = ?, last_name = ?, email = ?, role = ?, is_volunteer = ?, is_donor = ?
        WHERE id = ?
    ''', (
        data.get('first_name', user['first_name']),
        data.get('last_name', user['last_name']),
        data.get('email', user['email']),
        role,
        is_volunteer,
        is_donor,
        user_id
    ))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'User updated successfully'})

@app.route('/api/login', methods=['POST'])
def login():
    """Авторизация пользователя"""
    data = request.get_json()
    
    if not all(k in data for k in ('email', 'password')):
        return jsonify({'error': 'Missing email or password'}), 400
    
    conn = get_db_connection()
    user = conn.execute(
        'SELECT id, first_name, last_name, email, role, is_volunteer, is_donor FROM users WHERE email = ? AND password = ?',
        (data['email'], data['password'])
    ).fetchone()
    conn.close()
    
    if user is None:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    return jsonify(dict(user))

# ============================================
# API Endpoints для проектов
# ============================================

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Получение списка проектов с количеством участников"""
    conn = get_db_connection()
    
    # Получаем проекты с подсчетом участников
    projects = conn.execute('''
        SELECT 
            p.*,
            COUNT(DISTINCT CASE WHEN pp.role = 'volunteer' THEN pp.user_id END) as volunteer_count,
            COUNT(DISTINCT CASE WHEN pp.role = 'donor' THEN pp.user_id END) as donor_count
        FROM projects p
        LEFT JOIN project_participants pp ON p.id = pp.project_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
    ''').fetchall()
    
    conn.close()
    
    # Преобразуем в список словарей и добавляем participants
    result = []
    for project in projects:
        proj_dict = dict(project)
        proj_dict['participants'] = {
            'volunteers': proj_dict.pop('volunteer_count', 0) or 0,
            'donors': proj_dict.pop('donor_count', 0) or 0
        }
        result.append(proj_dict)
    
    return jsonify(result)

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    """Получение проекта по ID с участниками"""
    conn = get_db_connection()
    
    project = conn.execute('''
        SELECT 
            p.*,
            COUNT(DISTINCT CASE WHEN pp.role = 'volunteer' THEN pp.user_id END) as volunteer_count,
            COUNT(DISTINCT CASE WHEN pp.role = 'donor' THEN pp.user_id END) as donor_count
        FROM projects p
        LEFT JOIN project_participants pp ON p.id = pp.project_id
        WHERE p.id = ?
        GROUP BY p.id
    ''', (project_id,)).fetchone()
    
    conn.close()
    
    if project is None:
        return jsonify({'error': 'Project not found'}), 404
    
    proj_dict = dict(project)
    proj_dict['participants'] = {
        'volunteers': proj_dict.pop('volunteer_count', 0) or 0,
        'donors': proj_dict.pop('donor_count', 0) or 0
    }
    
    return jsonify(proj_dict)

@app.route('/api/projects', methods=['POST'])
def create_project():
    """Создание нового проекта"""
    data = request.get_json()
    
    if not all(k in data for k in ('name', 'description', 'start_date', 'end_date', 'target_amount')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO projects (name, description, full_description, image, start_date, end_date, 
                            status, target_amount, collected_amount, donation_amount, total_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['name'],
        data['description'],
        data.get('full_description', ''),
        data.get('image', ''),
        data['start_date'],
        data['end_date'],
        data.get('status', 'planned'),
        data['target_amount'],
        data.get('collected_amount', 0),
        data.get('donation_amount', 2500),
        data.get('total_hours', 0)
    ))
    conn.commit()
    project_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': project_id, 'message': 'Project created successfully'}), 201

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    """Обновление проекта"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Получаем текущие данные
    project = conn.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    if not project:
        conn.close()
        return jsonify({'error': 'Project not found'}), 404
    
    cursor.execute('''
        UPDATE projects 
        SET name = ?, description = ?, full_description = ?, image = ?, 
            start_date = ?, end_date = ?, status = ?, target_amount = ?, 
            donation_amount = ?, total_hours = ?, updated_at = ?
        WHERE id = ?
    ''', (
        data.get('name', project['name']),
        data.get('description', project['description']),
        data.get('full_description', project['full_description']),
        data.get('image', project['image']),
        data.get('start_date', project['start_date']),
        data.get('end_date', project['end_date']),
        data.get('status', project['status']),
        data.get('target_amount', project['target_amount']),
        data.get('donation_amount', project['donation_amount']),
        data.get('total_hours', project['total_hours']),
        datetime.now(),
        project_id
    ))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Project updated successfully'})

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Удаление проекта"""
    conn = get_db_connection()
    conn.execute('DELETE FROM projects WHERE id = ?', (project_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Project deleted successfully'})

@app.route('/api/projects/<int:project_id>/participants', methods=['GET'])
def get_project_participants(project_id):
    """Получение участников проекта"""
    conn = get_db_connection()
    participants = conn.execute('''
        SELECT pp.*, u.first_name, u.last_name, u.email
        FROM project_participants pp
        JOIN users u ON pp.user_id = u.id
        WHERE pp.project_id = ?
    ''', (project_id,)).fetchall()
    conn.close()
    return jsonify([dict(p) for p in participants])

@app.route('/api/projects/<int:project_id>/join', methods=['POST'])
def join_project(project_id):
    """Присоединение к проекту"""
    data = request.get_json()
    
    if 'user_id' not in data:
        return jsonify({'error': 'Missing user_id'}), 400
    
    user_id = data['user_id']
    role = data.get('role', 'volunteer')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Проверяем, не участвует ли уже пользователь
    existing = conn.execute('''
        SELECT * FROM project_participants 
        WHERE project_id = ? AND user_id = ? AND role = ?
    ''', (project_id, user_id, role)).fetchone()
    
    if existing:
        conn.close()
        return jsonify({'error': 'User already participating'}), 409
    
    cursor.execute('''
        INSERT INTO project_participants (project_id, user_id, role)
        VALUES (?, ?, ?)
    ''', (project_id, user_id, role))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Successfully joined project'}), 201

@app.route('/api/projects/<int:project_id>/participants/check', methods=['GET'])
def check_participation(project_id):
    """Проверка участия пользователя в проекте"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Missing user_id parameter'}), 400
    
    conn = get_db_connection()
    participation = conn.execute('''
        SELECT * FROM project_participants 
        WHERE project_id = ? AND user_id = ?
    ''', (project_id, user_id)).fetchone()
    conn.close()
    
    return jsonify({
        'is_joined': participation is not None,
        'role': dict(participation)['role'] if participation else None
    })

# ============================================
# API Endpoints для новостей
# ============================================

@app.route('/api/news', methods=['GET'])
def get_news():
    """Получение списка новостей"""
    category = request.args.get('category')
    
    conn = get_db_connection()
    if category:
        news = conn.execute('''
            SELECT n.*, p.name as project_name 
            FROM news n 
            LEFT JOIN projects p ON n.project_id = p.id 
            WHERE n.category = ? 
            ORDER BY n.created_at DESC
        ''', (category,)).fetchall()
    else:
        news = conn.execute('''
            SELECT n.*, p.name as project_name 
            FROM news n 
            LEFT JOIN projects p ON n.project_id = p.id 
            ORDER BY n.created_at DESC
        ''').fetchall()
    conn.close()
    return jsonify([dict(item) for item in news])

@app.route('/api/news/<int:news_id>', methods=['GET'])
def get_news_item(news_id):
    """Получение новости по ID"""
    conn = get_db_connection()
    news = conn.execute('''
        SELECT n.*, p.name as project_name 
        FROM news n 
        LEFT JOIN projects p ON n.project_id = p.id 
        WHERE n.id = ?
    ''', (news_id,)).fetchone()
    conn.close()
    if news is None:
        return jsonify({'error': 'News not found'}), 404
    return jsonify(dict(news))

@app.route('/api/news', methods=['POST'])
def create_news():
    """Создание новой новости"""
    data = request.get_json()
    
    if not all(k in data for k in ('title', 'description', 'content')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO news (title, description, content, image, category, project_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data['title'], 
        data['description'], 
        data['content'], 
        data.get('image', ''), 
        data.get('category', 'news'),
        data.get('project_id')
    ))
    conn.commit()
    news_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': news_id, 'message': 'News created successfully'}), 201

@app.route('/api/news/<int:news_id>', methods=['PUT'])
def update_news(news_id):
    """Обновление новости"""
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Получаем текущие данные
    news = conn.execute('SELECT * FROM news WHERE id = ?', (news_id,)).fetchone()
    if not news:
        conn.close()
        return jsonify({'error': 'News not found'}), 404
    
    cursor.execute('''
        UPDATE news 
        SET title = ?, description = ?, content = ?, image = ?, category = ?, project_id = ?, updated_at = ?
        WHERE id = ?
    ''', (
        data.get('title', news['title']),
        data.get('description', news['description']),
        data.get('content', news['content']),
        data.get('image', news['image']),
        data.get('category', news['category']),
        data.get('project_id', news['project_id']),
        datetime.now(),
        news_id
    ))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'News updated successfully'})

@app.route('/api/news/<int:news_id>', methods=['DELETE'])
def delete_news(news_id):
    """Удаление новости"""
    conn = get_db_connection()
    conn.execute('DELETE FROM news WHERE id = ?', (news_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'News deleted successfully'})

# ============================================
# API Endpoints для комментариев
# ============================================

@app.route('/api/news/<int:news_id>/comments', methods=['GET'])
def get_comments(news_id):
    """Получение комментариев к новости"""
    conn = get_db_connection()
    comments = conn.execute('''
        SELECT c.*, u.first_name, u.last_name 
        FROM comments c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.news_id = ? 
        ORDER BY c.created_at DESC
    ''', (news_id,)).fetchall()
    conn.close()
    return jsonify([dict(comment) for comment in comments])

@app.route('/api/news/<int:news_id>/comments', methods=['POST'])
def create_comment(news_id):
    """Создание комментария"""
    data = request.get_json()
    
    if 'user_id' not in data or 'content' not in data:
        return jsonify({'error': 'Missing user_id or content'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO comments (news_id, user_id, content)
        VALUES (?, ?, ?)
    ''', (news_id, data['user_id'], data['content']))
    conn.commit()
    comment_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': comment_id, 'message': 'Comment created successfully'}), 201

@app.route('/api/comments/<int:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    """Удаление комментария"""
    conn = get_db_connection()
    conn.execute('DELETE FROM comments WHERE id = ?', (comment_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Comment deleted successfully'})

# ============================================
# API Endpoints для донатов
# ============================================

@app.route('/api/donations', methods=['GET'])
def get_all_donations():
    """Получение всех донатов"""
    conn = get_db_connection()
    donations = conn.execute('''
        SELECT d.*, u.first_name, u.last_name, p.name as project_name
        FROM donations d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN projects p ON d.project_id = p.id
        ORDER BY d.created_at DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(d) for d in donations])

@app.route('/api/users/<int:user_id>/donations', methods=['GET'])
def get_user_donations(user_id):
    """Получение донатов пользователя"""
    conn = get_db_connection()
    donations = conn.execute('''
        SELECT d.*, p.name as project_name, p.status as project_status
        FROM donations d 
        LEFT JOIN projects p ON d.project_id = p.id 
        WHERE d.user_id = ? 
        ORDER BY d.created_at DESC
    ''', (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(donation) for donation in donations])

@app.route('/api/donations', methods=['POST'])
def create_donation():
    """Создание доната"""
    data = request.get_json()
    
    if not all(k in data for k in ('user_id', 'amount')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Создаем донат
    cursor.execute('''
        INSERT INTO donations (user_id, project_id, amount, status)
        VALUES (?, ?, ?, ?)
    ''', (data['user_id'], data.get('project_id'), data['amount'], data.get('status', 'completed')))
    
    # Обновляем collected_amount в проекте если указан project_id
    if data.get('project_id'):
        cursor.execute('''
            UPDATE projects 
            SET collected_amount = collected_amount + ?
            WHERE id = ?
        ''', (data['amount'], data['project_id']))
    
    # Обновляем пользователя как донора
    cursor.execute('''
        UPDATE users 
        SET is_donor = 1,
            role = CASE 
                WHEN role = 'user' THEN 'donor'
                WHEN role = 'volunteer' THEN 'volunteer_donor'
                ELSE role
            END
        WHERE id = ?
    ''', (data['user_id'],))
    
    conn.commit()
    donation_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': donation_id, 'message': 'Donation created successfully'}), 201

# ============================================
# API Endpoints для волонтерских часов
# ============================================

@app.route('/api/users/<int:user_id>/volunteer-hours', methods=['GET'])
def get_volunteer_hours(user_id):
    """Получение волонтерских часов пользователя"""
    conn = get_db_connection()
    hours = conn.execute('''
        SELECT v.*, p.name as project_name, p.status as project_status
        FROM volunteer_hours v 
        JOIN projects p ON v.project_id = p.id 
        WHERE v.user_id = ? 
        ORDER BY v.created_at DESC
    ''', (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(h) for h in hours])

@app.route('/api/volunteer-hours', methods=['POST'])
def add_volunteer_hours():
    """Добавление волонтерских часов"""
    data = request.get_json()
    
    if not all(k in data for k in ('user_id', 'project_id', 'hours')):
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Добавляем часы
    cursor.execute('''
        INSERT INTO volunteer_hours (user_id, project_id, hours, date)
        VALUES (?, ?, ?, ?)
    ''', (data['user_id'], data['project_id'], data['hours'], data.get('date', datetime.now().date())))
    
    # Обновляем total_hours в проекте
    cursor.execute('''
        UPDATE projects 
        SET total_hours = total_hours + ?
        WHERE id = ?
    ''', (data['hours'], data['project_id']))
    
    # Обновляем пользователя как волонтера
    cursor.execute('''
        UPDATE users 
        SET is_volunteer = 1,
            role = CASE 
                WHEN role = 'user' THEN 'volunteer'
                WHEN role = 'donor' THEN 'volunteer_donor'
                ELSE role
            END
        WHERE id = ?
    ''', (data['user_id'],))
    
    conn.commit()
    hours_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': hours_id, 'message': 'Volunteer hours added successfully'}), 201

# ============================================
# API для участий пользователя
# ============================================

@app.route('/api/users/<int:user_id>/participations', methods=['GET'])
def get_user_participations(user_id):
    """Получение проектов пользователя с деталями участия"""
    conn = get_db_connection()
    
    participations = conn.execute('''
        SELECT pp.*, p.*, 
               CASE WHEN pp.role = 'volunteer' THEN pp.hours_contributed ELSE pp.amount_donated END as contribution
        FROM project_participants pp
        JOIN projects p ON pp.project_id = p.id
        WHERE pp.user_id = ?
        ORDER BY pp.joined_at DESC
    ''', (user_id,)).fetchall()
    
    conn.close()
    return jsonify([dict(p) for p in participations])

# ============================================
# Статистика
# ============================================

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Получение общей статистики"""
    conn = get_db_connection()
    
    total_donations = conn.execute('SELECT COALESCE(SUM(amount), 0) as total FROM donations').fetchone()['total']
    total_volunteer_hours = conn.execute('SELECT COALESCE(SUM(hours), 0) as total FROM volunteer_hours').fetchone()['total']
    total_users = conn.execute('SELECT COUNT(*) as count FROM users').fetchone()['count']
    total_news = conn.execute('SELECT COUNT(*) as count FROM news').fetchone()['count']
    total_projects = conn.execute('SELECT COUNT(*) as count FROM projects').fetchone()['count']
    
    conn.close()
    
    return jsonify({
        'total_donations': total_donations,
        'total_volunteer_hours': total_volunteer_hours,
        'total_users': total_users,
        'total_news': total_news,
        'total_projects': total_projects
    })

# ============================================
# Инициализация данных по умолчанию
# ============================================

@app.route('/api/init-default-data', methods=['POST'])
def init_default_data():
    """Инициализация данных по умолчанию"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Проверяем, есть ли уже данные
    users_count = conn.execute('SELECT COUNT(*) as count FROM users').fetchone()['count']
    projects_count = conn.execute('SELECT COUNT(*) as count FROM projects').fetchone()['count']
    
    # Добавляем администратора если нет пользователей
    if users_count == 0:
        cursor.execute('''
            INSERT INTO users (first_name, last_name, email, password, role)
            VALUES (?, ?, ?, ?, ?)
        ''', ('Админ', 'Администратор', 'admin@oaz-ocean.ru', 'admin123', 'admin'))
    
    # Добавляем проекты по умолчанию если нет проектов
    if projects_count == 0:
        default_projects = [
            {
                'name': 'Очистка побережья Балтики',
                'description': 'Масштабная акция по очистке берегов Балтийского моря от пластика',
                'full_description': 'Полное описание проекта по очистке побережья...',
                'image': 'https://images.unsplash.com/photo-1618477461853-5f8dd68aa395?w=800',
                'start_date': datetime.now().strftime('%Y-%m-%d'),
                'end_date': datetime.fromtimestamp(datetime.now().timestamp() + 30 * 24 * 60 * 60).strftime('%Y-%m-%d'),
                'status': 'active',
                'target_amount': 500000,
                'collected_amount': 125000,
                'donation_amount': 2500,
                'total_hours': 120
            },
            {
                'name': 'Спасение тюленей',
                'description': 'Программа реабилитации и спасения пострадавших тюленей',
                'full_description': 'Полное описание программы спасения тюленей...',
                'image': 'https://images.unsplash.com/photo-1579165466741-7f35a4755657?w=800',
                'start_date': datetime.now().strftime('%Y-%m-%d'),
                'end_date': datetime.fromtimestamp(datetime.now().timestamp() + 60 * 24 * 60 * 60).strftime('%Y-%m-%d'),
                'status': 'active',
                'target_amount': 300000,
                'collected_amount': 75000,
                'donation_amount': 3000,
                'total_hours': 80
            },
            {
                'name': 'Восстановление коралловых рифов',
                'description': 'Проект по восстановлению и выращиванию кораллов',
                'full_description': 'Полное описание проекта по восстановлению кораллов...',
                'image': 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=800',
                'start_date': datetime.fromtimestamp(datetime.now().timestamp() + 30 * 24 * 60 * 60).strftime('%Y-%m-%d'),
                'end_date': datetime.fromtimestamp(datetime.now().timestamp() + 180 * 24 * 60 * 60).strftime('%Y-%m-%d'),
                'status': 'planned',
                'target_amount': 800000,
                'collected_amount': 0,
                'donation_amount': 5000,
                'total_hours': 200
            },
            {
                'name': 'Образовательные программы',
                'description': 'Обучение детей и взрослых экологии океана',
                'full_description': 'Полное описание образовательных программ...',
                'image': 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800',
                'start_date': datetime.fromtimestamp(datetime.now().timestamp() - 90 * 24 * 60 * 60).strftime('%Y-%m-%d'),
                'end_date': datetime.fromtimestamp(datetime.now().timestamp() - 30 * 24 * 60 * 60).strftime('%Y-%m-%d'),
                'status': 'completed',
                'target_amount': 200000,
                'collected_amount': 200000,
                'donation_amount': 2000,
                'total_hours': 50
            }
        ]
        
        for project in default_projects:
            cursor.execute('''
                INSERT INTO projects (name, description, full_description, image, start_date, end_date,
                                    status, target_amount, collected_amount, donation_amount, total_hours)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                project['name'], project['description'], project['full_description'], project['image'],
                project['start_date'], project['end_date'], project['status'], project['target_amount'],
                project['collected_amount'], project['donation_amount'], project['total_hours']
            ))
    
    # Добавляем новости по умолчанию если нет новостей
    news_count = conn.execute('SELECT COUNT(*) as count FROM news').fetchone()['count']
    if news_count == 0:
        default_news = [
            {
                'title': 'Очистка побережья началась!',
                'description': 'Стартовала масштабная акция по очистке берегов',
                'content': 'Сегодня началась масштабная акция по очистке побережья Балтийского моря. Волонтеры со всей области собрались, чтобы убрать мусор и пластик с пляжей.',
                'image': 'https://images.unsplash.com/photo-1618477461853-5f8dd68aa395?w=400',
                'category': 'news'
            },
            {
                'title': 'Спасены первые тюлени',
                'description': 'Волонтеры спасли 5 тюленей за неделю',
                'content': 'Наша команда спасателей успешно реабилитировала 5 тюленей за прошедшую неделю. Все животные уже чувствуют себя хорошо.',
                'image': 'https://images.unsplash.com/photo-1579165466741-7f35a4755657?w=400',
                'category': 'work'
            },
            {
                'title': 'Нужны волонтеры!',
                'description': 'Приглашаем всех желающих присоединиться к проекту',
                'content': 'Для успешного проведения акции по очистке побережья нам нужны волонтеры. Присоединяйтесь!',
                'image': 'https://images.unsplash.com/photo-1618477461853-5f8dd68aa395?w=400',
                'category': 'help'
            }
        ]
        
        for news in default_news:
            cursor.execute('''
                INSERT INTO news (title, description, content, image, category)
                VALUES (?, ?, ?, ?, ?)
            ''', (news['title'], news['description'], news['content'], news['image'], news['category']))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Default data initialized successfully'})

# ============================================
# Главная страница API
# ============================================

@app.route('/api/', methods=['GET'])
def api_index():
    """Информация об API"""
    return jsonify({
        'name': 'ОАЗ API',
        'version': '2.0',
        'endpoints': {
            'users': '/api/users',
            'projects': '/api/projects',
            'news': '/api/news',
            'comments': '/api/news/<id>/comments',
            'donations': '/api/donations',
            'volunteer_hours': '/api/volunteer-hours',
            'stats': '/api/stats',
            'upload': '/api/upload'
        }
    })

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
