const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
//  БАЗА ДАННЫХ
// ============================================================
const DB_PATH = path.join(__dirname, 'data', 'db.json');

function readDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        }
    } catch (e) { console.error('Ошибка чтения БД:', e); }
    return { users: [], groups: [], messages: {}, groupMessages: {} };
}

function writeDB(db) {
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        return true;
    } catch (e) { console.error('Ошибка записи БД:', e); return false; }
}

// ============================================================
//  ВСЕ АККАУНТЫ
// ============================================================
function initDB() {
    const db = readDB();
    if (db.users.length > 0) {
        console.log('✅ Пользователей в БД:', db.users.length);
        return;
    }

    const users = [
        { id: 'admin', name: 'EchoAdmin', email: 'admin@echo.ru', phone: '+79990000000', password: '123', bio: 'Главный администратор 🚀', avatar: '', createdAt: Date.now() },
        { id: 'u_myanix', name: 'Myanix', email: 'myanix@echo.ru', phone: '+79990000001', password: 'hotmisha223', bio: '💪', avatar: '', createdAt: Date.now() },
        { id: 'u_qbez', name: 'QBeZ1007', email: 'qbez@echo.ru', phone: '+79990000002', password: 'hotdog100$', bio: '🔥', avatar: '', createdAt: Date.now() },
        { id: 'u_mirrox', name: 'mirrox_', email: 'mirrox@echo.ru', phone: '+79990000003', password: 'dsl382dAZX', bio: '✨', avatar: '', createdAt: Date.now() },
        { id: 'u_malakat', name: 'Malakat', email: 'malakat@echo.ru', phone: '+79990000004', password: 'gabrieldeepdark', bio: '👾', avatar: '', createdAt: Date.now() },
        { id: 'u_burger', name: 'BurgerAnus', email: 'burger@echo.ru', phone: '+79990000005', password: 'Hotsasha228', bio: '🍔', avatar: '', createdAt: Date.now() },
        { id: 'u1', name: 'Алексей', email: 'alex@echo.ru', phone: '+79991112233', password: '123', bio: 'Разработчик', avatar: '', createdAt: Date.now() - 3600000 * 24 * 30 },
        { id: 'u2', name: 'Мария', email: 'maria@echo.ru', phone: '+79992223344', password: '123', bio: 'Дизайнер', avatar: '', createdAt: Date.now() - 3600000 * 24 * 25 },
        { id: 'u3', name: 'Иван', email: 'ivan@echo.ru', phone: '+79993334455', password: '123', bio: 'Менеджер', avatar: '', createdAt: Date.now() - 3600000 * 24 * 20 },
        { id: 'u4', name: 'Елена', email: 'elena@echo.ru', phone: '+79994445566', password: '123', bio: 'Аналитик', avatar: '', createdAt: Date.now() - 3600000 * 24 * 15 },
    ];

    db.users = users;
    const allIds = users.map(u => u.id);

    // Группа "Покойошечки" со всеми пользователями
    db.groups = [
        { id: 'g_poko', name: '👑 Покойошечки', creatorId: 'admin', members: allIds, createdAt: Date.now() }
    ];

    db.groupMessages = {
        'g_poko': [
            { id: 'msg_hello', from: 'admin', text: '👋 Добро пожаловать в группу "Покойошечки"! 🎉 Все пользователи уже здесь!', time: Date.now() - 60000 }
        ]
    };

    db.messages = {};
    writeDB(db);
    console.log('✅ Инициализация завершена. Пользователей:', db.users.length);
}

initDB();

// ============================================================
//  API - ПОЛЬЗОВАТЕЛИ
// ============================================================

app.get('/api/users', (req, res) => {
    const db = readDB();
    res.json(db.users);
});

app.post('/api/register', (req, res) => {
    const { name, email, phone, password } = req.body;
    console.log('📝 Регистрация:', name, email);

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }

    const db = readDB();

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Эта почта уже используется' });
    }
    if (db.users.find(u => u.phone === phone)) {
        return res.status(400).json({ error: 'Этот телефон уже используется' });
    }

    const newUser = {
        id: 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        name: name,
        email: email,
        phone: phone,
        password: password,
        bio: '',
        avatar: '',
        createdAt: Date.now()
    };

    db.users.push(newUser);

    // Добавляем в группу "Покойошечки"
    const pokoGroup = db.groups.find(g => g.id === 'g_poko');
    if (pokoGroup) {
        pokoGroup.members.push(newUser.id);
        if (!db.groupMessages['g_poko']) db.groupMessages['g_poko'] = [];
        db.groupMessages['g_poko'].push({
            id: 'msg_' + Date.now().toString(36),
            from: 'system',
            text: `👤 ${newUser.name} присоединился к группе`,
            time: Date.now()
        });
    }

    writeDB(db);
    console.log('✅ Зарегистрирован:', newUser.name);
    res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    console.log('🔑 Попытка входа:', login);

    if (!login || !password) {
        return res.status(400).json({ error: 'Введите логин и пароль' });
    }

    const db = readDB();

    const user = db.users.find(u =>
        (u.email === login || u.phone === login) && u.password === password
    );

    if (user) {
        console.log('✅ Вход выполнен:', user.name);
        res.json({ success: true, user: user });
    } else {
        console.log('❌ Неверные данные для:', login);
        res.status(401).json({ error: 'Неверный логин или пароль' });
    }
});

app.put('/api/users/:id', (req, res) => {
    const db = readDB();
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Не найден' });

    const { name, phone, bio, avatar } = req.body;
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    writeDB(db);
    res.json({ success: true, user: user });
});

// ============================================================
//  API - ГРУППЫ (ИСПРАВЛЕНО!)
// ============================================================

app.get('/api/groups', (req, res) => {
    const db = readDB();
    res.json(db.groups);
});

app.get('/api/groups/:id', (req, res) => {
    const db = readDB();
    const group = db.groups.find(g => g.id === req.params.id);
    if (!group) {
        return res.status(404).json({ error: 'Группа не найдена' });
    }

    const membersWithInfo = group.members.map(id => {
        const user = db.users.find(u => u.id === id);
        return user || { id, name: 'Неизвестный', email: '' };
    });

    res.json({
        ...group,
        membersWithInfo: membersWithInfo
    });
});

// СОЗДАНИЕ ГРУППЫ - ЭТОТ ЭНДПОИНТ БЫЛ ОТСУТСТВОВАЛ!
app.post('/api/groups', (req, res) => {
    const { name, members, creatorId } = req.body;
    console.log('➕ Создание группы:', name);

    if (!name || !members || members.length === 0) {
        return res.status(400).json({ error: 'Недостаточно данных' });
    }

    const db = readDB();
    const groupId = 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

    const group = {
        id: groupId,
        name: name,
        creatorId: creatorId,
        members: members,
        createdAt: Date.now()
    };

    db.groups.push(group);
    db.groupMessages[groupId] = [];
    writeDB(db);

    console.log('✅ Группа создана:', name);
    res.json({ success: true, group: group });
});

// Добавить пользователя в группу
app.post('/api/groups/:id/add', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'Не указан пользователь' });
    }

    const db = readDB();

    const user = db.users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const group = db.groups.find(g => g.id === req.params.id);
    if (!group) {
        return res.status(404).json({ error: 'Группа не найдена' });
    }

    if (group.members.includes(userId)) {
        return res.status(400).json({ error: 'Пользователь уже в группе' });
    }

    group.members.push(userId);

    if (!db.groupMessages[group.id]) db.groupMessages[group.id] = [];
    db.groupMessages[group.id].push({
        id: 'msg_' + Date.now().toString(36),
        from: 'system',
        text: `👤 ${user.name} присоединился к группе`,
        time: Date.now()
    });

    writeDB(db);
    res.json({ success: true, group: group });
});

// Покинуть группу
app.post('/api/groups/:id/leave', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Не указан пользователь' });

    const db = readDB();
    const group = db.groups.find(g => g.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Группа не найдена' });

    group.members = group.members.filter(id => id !== userId);

    if (group.members.length === 0) {
        db.groups = db.groups.filter(g => g.id !== req.params.id);
        delete db.groupMessages[req.params.id];
    }

    writeDB(db);
    res.json({ success: true });
});

// ============================================================
//  API - ЧАТЫ
// ============================================================

app.get('/api/chats/:userId', (req, res) => {
    const db = readDB();
    const userId = req.params.userId;
    const chats = [];

    db.users.filter(u => u.id !== userId).forEach(u => {
        const chatId = [userId, u.id].sort().join('_');
        const msgs = db.messages[chatId] || [];
        const last = msgs.length ? msgs[msgs.length - 1] : null;
        chats.push({
            id: chatId,
            type: 'private',
            name: u.name,
            userId: u.id,
            avatar: u.avatar,
            lastMessage: last
        });
    });

    db.groups.forEach(g => {
        if (g.members.includes(userId)) {
            const msgs = db.groupMessages[g.id] || [];
            const last = msgs.length ? msgs[msgs.length - 1] : null;
            chats.push({
                id: g.id,
                type: 'group',
                name: g.name,
                groupId: g.id,
                members: g.members,
                creatorId: g.creatorId,
                lastMessage: last
            });
        }
    });

    chats.sort((a, b) => {
        const ta = a.lastMessage ? a.lastMessage.time : 0;
        const tb = b.lastMessage ? b.lastMessage.time : 0;
        return tb - ta;
    });

    res.json(chats);
});

// ============================================================
//  API - СООБЩЕНИЯ
// ============================================================

app.get('/api/messages/:chatId', (req, res) => {
    const db = readDB();
    const chatId = req.params.chatId;
    const isGroup = chatId.startsWith('g_');
    const messages = isGroup ? (db.groupMessages[chatId] || []) : (db.messages[chatId] || []);
    res.json(messages);
});

app.post('/api/messages', (req, res) => {
    const { chatId, from, text } = req.body;
    if (!chatId || !from || !text) {
        return res.status(400).json({ error: 'Недостаточно данных' });
    }

    const db = readDB();
    const isGroup = chatId.startsWith('g_');
    const msgs = isGroup ? (db.groupMessages[chatId] || []) : (db.messages[chatId] || []);

    const msg = {
        id: 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        from: from,
        text: text.trim(),
        time: Date.now()
    };

    msgs.push(msg);

    if (isGroup) {
        db.groupMessages[chatId] = msgs;
    } else {
        db.messages[chatId] = msgs;
    }

    writeDB(db);
    res.json({ success: true, message: msg });
});

// ============================================================
//  WEBSOCKET
// ============================================================

const clients = new Map();

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket подключён');
    let userId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 WebSocket:', data.type);

            switch (data.type) {
                case 'auth':
                    userId = data.userId;
                    clients.set(userId, ws);
                    broadcast({ type: 'online', onlineUsers: Array.from(clients.keys()) });
                    break;

                case 'message':
                    const db = readDB();
                    const isGroup = data.chatId.startsWith('g_');
                    const msgs = isGroup ? (db.groupMessages[data.chatId] || []) : (db.messages[data.chatId] || []);
                    const msg = {
                        id: 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
                        from: data.from,
                        text: data.text,
                        time: Date.now()
                    };
                    msgs.push(msg);
                    if (isGroup) db.groupMessages[data.chatId] = msgs;
                    else db.messages[data.chatId] = msgs;
                    writeDB(db);
                    broadcastToChat(data.chatId, { type: 'new_message', chatId: data.chatId, message: msg });
                    break;

                case 'call_start':
                    console.log('📞 Звонок начат в чате:', data.chatId);
                    broadcastToChat(data.chatId, {
                        type: 'call_started',
                        chatId: data.chatId,
                        callerId: data.callerId,
                        callType: data.callType,
                        callerName: data.callerName
                    });
                    break;

                case 'call_join':
                    console.log('📞 Пользователь присоединился к звонку:', data.userName);
                    broadcastToChat(data.chatId, {
                        type: 'call_joined',
                        chatId: data.chatId,
                        userId: data.userId,
                        userName: data.userName
                    });
                    break;

                case 'call_end':
                    console.log('📞 Звонок завершён в чате:', data.chatId);
                    broadcastToChat(data.chatId, {
                        type: 'call_ended',
                        chatId: data.chatId
                    });
                    break;
            }
        } catch (e) {
            console.error('WebSocket ошибка:', e);
        }
    });

    ws.on('close', () => {
        if (userId) {
            clients.delete(userId);
            broadcast({ type: 'online', onlineUsers: Array.from(clients.keys()) });
        }
    });
});

function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastToChat(chatId, data) {
    const message = JSON.stringify(data);
    const db = readDB();
    const isGroup = chatId.startsWith('g_');

    let recipients = [];
    if (isGroup) {
        const group = db.groups.find(g => g.id === chatId);
        if (group) recipients = group.members;
    } else {
        recipients = chatId.split('_');
    }

    recipients.forEach(userId => {
        const client = clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// ============================================================
//  ЗАПУСК
// ============================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║   🚀 Echo Messenger Server                                  ║
║   📡 http://localhost:${PORT}                                ║
║                                                             ║
║   👑 АДМИНИСТРАТОР:                                         ║
║   admin@echo.ru / 123                                       ║
║                                                             ║
║   📋 ТВОИ АККАУНТЫ:                                         ║
║   myanix@echo.ru / hotmisha223                              ║
║   qbez@echo.ru / hotdog100$                                 ║
║   mirrox@echo.ru / dsl382dAZX                               ║
║   malakat@echo.ru / gabrieldeepdark                         ║
║   burger@echo.ru / Hotsasha228                              ║
║                                                             ║
║   👑 ГРУППА "ПОКОЙОШЕЧКИ" СОЗДАНА!                         ║
║   👥 ВСЕ ПОЛЬЗОВАТЕЛИ УЖЕ В ГРУППЕ!                        ║
╚═══════════════════════════════════════════════════════════════╝
    `);
    console.log('✅ Сервер запущен на порту:', PORT);
});