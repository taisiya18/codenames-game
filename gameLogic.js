// ======================
// 🎮 CODENAMES SERVER
// ======================

const http = require("http");
const url = require("url");

// Храним комнаты в памяти
const rooms = new Map();

// Слова для игры (русские)
const WORDS = [
  "книга", "солнце", "море", "город", "дом", "кошка", "собака", "окно", "дверь",
  "стол", "стул", "рука", "нога", "голова", "глаз", "нос", "рот", "ухо",
  "вода", "огонь", "земля", "воздух", "время", "день", "ночь", "год", "месяц"
];

// Генерация комнаты
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Генерация игрового поля
function generateBoard() {
  const shuffled = [...WORDS].sort(() => Math.random() - 0.5).slice(0, 25);
  const colors = ["red","red","red","red","red","red","red","red","red",
                  "blue","blue","blue","blue","blue","blue","blue","blue",
                  "neutral","neutral","neutral","neutral","neutral","neutral","neutral",
                  "black"].sort(() => Math.random() - 0.5);
  
  return shuffled.map((word, i) => ({
    word,
    color: colors[i],
    revealed: false,
    index: i
  }));
}

// Создаём HTTP сервер
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Настройка CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Маршруты API
  if (parsedUrl.pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "OK",
      game: "Codenames",
      version: "1.0.0",
      rooms: rooms.size,
      timestamp: new Date().toISOString()
    }));
    
  } else if (parsedUrl.pathname === "/api/create-room") {
    const roomId = generateRoomId();
    rooms.set(roomId, {
      id: roomId,
      players: [],
      board: generateBoard(),
      created: Date.now()
    });
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      roomId,
      message: "Комната создана!",
      link: "http://localhost:3001?room=" + roomId
    }));
    
  } else if (parsedUrl.pathname === "/api/rooms") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      rooms: Array.from(rooms.entries()).map(([id, room]) => ({
        id,
        players: room.players.length,
        created: room.created
      }))
    }));
    
  } else if (parsedUrl.pathname === "/api/room-info") {
    const roomId = parsedUrl.query.room;
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id: room.id,
        players: room.players,
        board: room.board.map(card => ({ 
          word: card.word, 
          color: card.revealed ? card.color : "hidden",
          revealed: card.revealed 
        }))
      }));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Room not found" }));
    }
    
  } else {
    // Главная страница
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Codenames Online</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: white;
          }
          .container { 
            background: rgba(255, 255, 255, 0.95); 
            border-radius: 20px;
            padding: 40px;
            max-width: 800px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            color: #333;
          }
          h1 { 
            color: #4a5568; 
            margin-bottom: 30px;
            text-align: center;
            font-size: 2.5em;
          }
          .subtitle {
            color: #718096;
            text-align: center;
            margin-bottom: 40px;
            font-size: 1.2em;
          }
          .game-info {
            background: #edf2f7;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
          }
          .button {
            background: #4299e1;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 18px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
            margin: 10px;
            display: inline-block;
            text-decoration: none;
          }
          .button:hover {
            background: #3182ce;
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          }
          .button.create {
            background: #48bb78;
          }
          .button.create:hover {
            background: #38a169;
          }
          .rooms-container {
            margin-top: 30px;
            display: none;
          }
          .room-card {
            background: white;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 15px;
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .room-id {
            font-family: monospace;
            font-size: 1.2em;
            font-weight: bold;
            color: #2d3748;
          }
          .room-players {
            color: #718096;
          }
          .status {
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            text-align: center;
          }
          .status.success {
            background: #c6f6d5;
            color: #22543d;
          }
          .status.error {
            background: #fed7d7;
            color: #742a2a;
          }
          .game-board {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 10px;
            margin: 20px 0;
          }
          .card {
            aspect-ratio: 1;
            background: #4a5568;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
          }
          .card:hover {
            transform: scale(1.05);
          }
          .card.red { background: #e53e3e; }
          .card.blue { background: #3182ce; }
          .card.neutral { background: #a0aec0; }
          .card.black { background: #1a202c; }
          .card.hidden { background: #2d3748; }
          footer {
            margin-top: 40px;
            text-align: center;
            color: #718096;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎮 CODENAMES ONLINE</h1>
          <div class="subtitle">Онлайн-версия популярной игры "Codenames" ("Своя игра")</div>
          
          <div class="game-info">
            <p><strong>Как играть:</strong></p>
            <p>1. Создайте комнату и получите ID</p>
            <p>2. Отправьте ID друзьям</p>
            <p>3. Распределите роли: ведущий (видит цвета) и игроки</p>
            <p>4. Ведущий даёт подсказку (слово + количество карточек)</p>
            <p>5. Игроки выбирают карточки</p>
          </div>
          
          <div style="text-align: center;">
            <button class="button create" onclick="createRoom()">🎯 Создать новую комнату</button>
            <button class="button" onclick="loadRooms()">🔄 Обновить список комнат</button>
          </div>
          
          <div id="status" class="status"></div>
          
          <div id="rooms-container" class="rooms-container">
            <h3>🎪 Активные комнаты:</h3>
            <div id="rooms-list"></div>
          </div>
          
          <div id="game-container" style="display: none;">
            <h3>🎲 Игровое поле:</h3>
            <div id="game-board" class="game-board"></div>
          </div>
          
          <footer>
            <p>Проект для курсовой работы | Разработано с использованием Node.js</p>
            <p>Проверка сервера: <a href="/api/health" style="color: #4299e1;">/api/health</a></p>
          </footer>
        </div>
        
        <script>
          let currentRoom = null;
          
          function showStatus(message, type = "success") {
            const statusEl = document.getElementById("status");
            statusEl.textContent = message;
            statusEl.className = "status " + type;
            statusEl.style.display = "block";
          }
          
          function hideStatus() {
            document.getElementById("status").style.display = "none";
          }
          
          async function createRoom() {
            try {
              showStatus("Создаём комнату...");
              const response = await fetch("/api/create-room");
              const data = await response.json();
              
              showStatus("✅ Комната создана! ID: " + data.roomId + ". Отправьте этот ID друзьям.", "success");
              currentRoom = data.roomId;
              
              // Показываем кнопку для перехода в игру
              document.getElementById("rooms-container").innerHTML += 
                '<div style="text-align: center; margin: 20px;">' +
                '<button class="button" onclick="joinRoom(\\'' + data.roomId + '\\')">▶️ Перейти в комнату ' + data.roomId + '</button>' +
                '</div>';
                
              loadRooms();
            } catch (error) {
              showStatus("❌ Ошибка: " + error, "error");
            }
          }
          
          async function loadRooms() {
            try {
              const response = await fetch("/api/rooms");
              const data = await response.json();
              
              const roomsList = document.getElementById("rooms-list");
              const roomsContainer = document.getElementById("rooms-container");
              
              if (data.rooms.length > 0) {
                roomsList.innerHTML = data.rooms.map(room => 
                  '<div class="room-card">' +
                    '<div>' +
                      '<span class="room-id">' + room.id + '</span>' +
                      '<div class="room-players">👥 Игроков: ' + room.players + '</div>' +
                    '</div>' +
                    '<button class="button" onclick="joinRoom(\\'' + room.id + '\\')">Присоединиться</button>' +
                  '</div>'
                ).join("");
                roomsContainer.style.display = "block";
              } else {
                roomsList.innerHTML = "<p>Нет активных комнат</p>";
              }
            } catch (error) {
              showStatus("❌ Ошибка загрузки комнат", "error");
            }
          }
          
          async function joinRoom(roomId) {
            try {
              showStatus("Подключаемся к комнате " + roomId + "...");
              currentRoom = roomId;
              
              const response = await fetch("/api/room-info?room=" + roomId);
              const data = await response.json();
              
              if (data.error) {
                showStatus("❌ " + data.error, "error");
                return;
              }
              
              // Показываем игровое поле
              document.getElementById("game-container").style.display = "block";
              const gameBoard = document.getElementById("game-board");
              
              gameBoard.innerHTML = data.board.map(card => 
                '<div class="card ' + card.color + '">' + card.word + '</div>'
              ).join("");
              
              showStatus("✅ Вы в комнате: " + roomId + ". Игроков: " + data.players.length, "success");
              
            } catch (error) {
              showStatus("❌ Ошибка подключения", "error");
            }
          }
          
          // Загружаем комнаты при загрузке страницы
          window.onload = loadRooms;
          
          // Обновляем список каждые 10 секунд
          setInterval(loadRooms, 10000);
        </script>
      </body>
      </html>
    `);
  }
});

// Запускаем сервер
const PORT = 3001;
server.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("🚀 СЕРВЕР CODENAMES ЗАПУЩЕН!");
  console.log("=".repeat(50));
  console.log("🌐 Адрес: http://localhost:" + PORT);
  console.log("🔧 API: http://localhost:" + PORT + "/api/health");
  console.log("=".repeat(50));
  console.log("📝 Доступные эндпоинты:");
  console.log("• Главная страница: GET /");
  console.log("• Создать комнату: GET /api/create-room");
  console.log("• Список комнат: GET /api/rooms");
  console.log("• Инфо о комнате: GET /api/room-info?room=ID");
  console.log("• Проверка: GET /api/health");
  console.log("=".repeat(50));
  console.log("🎮 Инструкция:");
  console.log("1. Откройте http://localhost:" + PORT);
  console.log("2. Создайте комнату");
  console.log("3. Играйте!");
  console.log("=".repeat(50));
});