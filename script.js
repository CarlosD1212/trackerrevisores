// ==================================================
// Global Variables
// ==================================================

var modalForcedOpen = false;
var data = [];
var currentPage = 1;
var rowsPerPage = 10;
var currentHistoryPage = 1;
var historyRowsPerPage = 10;
var claimedTask = JSON.parse(localStorage.getItem('claimedTask')) || null;
var showCoordinates = false;
var currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
var onlineUsers = JSON.parse(localStorage.getItem('onlineUsers')) || [];
var sheetData = [];
var isSheetConnected = false;
const API_KEY = 'AIzaSyCxJKTCRYg9xXSVtOSx1ef6AqYzqCgGMa8';
const SHEET_ID = '1XVrPvVAv3dR8Vm9f6md1scurnIS2SrkpwYgIzh2xfPk';
const SHEET_NAME = 'copias';
let currentChatUser = null;
let chatMessages = [];

// ==================================================
// Login and Registration Functions
// ==================================================

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // Update online status
            const onlineUsers = JSON.parse(localStorage.getItem('onlineUsers')) || [];
            if (!onlineUsers.some(u => u.username === user.username)) {
                onlineUsers.push({
                    username: user.username,
                    role: user.role,
                    lastActive: Date.now(),
                    profilePic: localStorage.getItem(`profilePic_${user.username}`) || 'default-profile.png'
                });
                localStorage.setItem('onlineUsers', JSON.stringify(onlineUsers));
            }
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = 'tasks.html';
        } else {
            alert('Invalid username or password');
        }
    });
}

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // Inicializar usuarios si no existen
    if (!localStorage.getItem('users')) {
        const defaultUsers = [
            { username: 'admin', password: 'admin123', role: 'admin' },
            { username: 'reviewer1', password: 'reviewer123', role: 'L10' },
            { username: 'CarlosD', password: 'Diosenticonfio', role: 'developer' }
        ];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
    }

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // Actualizar estado en línea
            const onlineUsers = JSON.parse(localStorage.getItem('onlineUsers')) || [];
            if (!onlineUsers.some(u => u.username === user.username)) {
                onlineUsers.push({
                    username: user.username,
                    role: user.role,
                    lastActive: Date.now(),
                    profilePic: 'default-profile.png'
                });
                localStorage.setItem('onlineUsers', JSON.stringify(onlineUsers));
            }
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = 'tasks.html';
        } else {
            alert('Usuario o contraseña incorrectos');
        }
    });
}

// ==================================================
// Online Users Functions
// ==================================================

function updateOnlineUsers() {
    // Remove inactive users (not active for more than 5 minutes)
    const now = Date.now();
    onlineUsers = onlineUsers.filter(user => now - user.lastActive < 300000);
    
    // Update current user's last active time
    if (currentUser?.username) {
        const userIndex = onlineUsers.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            onlineUsers[userIndex].lastActive = now;
        } else {
            onlineUsers.push({
                username: currentUser.username,
                role: currentUser.role,
                lastActive: now,
                profilePic: localStorage.getItem(`profilePic_${currentUser.username}`) || 'default-profile.png'
            });
        }
    }
    
    localStorage.setItem('onlineUsers', JSON.stringify(onlineUsers));
    renderOnlineUsers();
}

function renderOnlineUsers() {
    const container = document.getElementById('onlineUsersContainer');
    if (!container || !currentUser) return;

    container.innerHTML = '';

    // 1. Separar usuarios conectados/desconectados (únicos)
    const now = Date.now();
    const FIVE_MINUTES = 300000; // 5 minutos de inactividad
    
    const connectedUsers = [];
    const disconnectedUsers = [];
    const seenUsernames = new Set();

    // Procesar en orden inverso para mantener los más recientes
    [...onlineUsers].reverse().forEach(user => {
        if (seenUsernames.has(user.username)) return;
        seenUsernames.add(user.username);
        
        const isConnected = (now - user.lastActive) < FIVE_MINUTES;
        if (isConnected) {
            connectedUsers.push(user);
        } else {
            disconnectedUsers.push(user);
        }
    });

    // 2. Mostrar usuario actual primero (con indicador)
    const currentUserElement = createUserAvatar(currentUser, true);
    currentUserElement.addEventListener('click', () => showUserProfile(currentUser));
    container.appendChild(currentUserElement);

    // 3. Mostrar hasta 4 conectados (para no exceder 5 con el usuario actual)
    connectedUsers
        .filter(user => user.username !== currentUser.username)
        .slice(0, 4)
        .forEach(user => {
            const userElement = createUserAvatar(user);
            userElement.addEventListener('click', () => showUserProfile(user));
            container.appendChild(userElement);
        });

    // 4. Dropdown para usuarios adicionales
    const remainingConnected = connectedUsers
        .filter(user => user.username !== currentUser.username)
        .slice(4);
    
    const allDisconnected = disconnectedUsers
        .filter(user => user.username !== currentUser.username);

    if (remainingConnected.length > 0 || allDisconnected.length > 0) {
        const moreBtn = document.createElement('div');
        moreBtn.className = 'more-users-btn';
        moreBtn.innerHTML = `+${remainingConnected.length + allDisconnected.length}`;
        
        const dropdown = document.createElement('div');
        dropdown.className = 'users-dropdown';
        
        // Sección conectados
        if (remainingConnected.length > 0) {
            const header = document.createElement('div');
            header.className = 'dropdown-section-header';
            header.textContent = 'Conectados';
            dropdown.appendChild(header);
            
            remainingConnected.forEach(user => {
                dropdown.appendChild(createDropdownUserItem(user, true));
            });
        }
        
        // Sección desconectados
        if (allDisconnected.length > 0) {
            const header = document.createElement('div');
            header.className = 'dropdown-section-header';
            header.textContent = 'Desconectados';
            dropdown.appendChild(header);
            
            allDisconnected.forEach(user => {
                dropdown.appendChild(createDropdownUserItem(user, false));
            });
        }

        // Interacciones
        moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
        
        dropdown.addEventListener('click', (e) => e.stopPropagation());
        
        container.appendChild(moreBtn);
        container.appendChild(dropdown);
    }
}

// Helper para items del dropdown (con estado)
function createDropdownUserItem(user, isConnected) {
    const item = document.createElement('div');
    item.className = `user-dropdown-item ${isConnected ? 'connected' : 'disconnected'}`;
    item.addEventListener('click', () => showUserProfile(user));
    
    const avatar = document.createElement('div');
    avatar.className = 'dropdown-avatar';
    avatar.innerHTML = user.profilePic.includes('default-profile.png') 
        ? user.username.charAt(0).toUpperCase()
        : `<img src="${user.profilePic}" alt="${user.username}">`;
    avatar.style.backgroundColor = stringToColor(user.username);
    
    const info = document.createElement('div');
    info.className = 'user-dropdown-info';
    
    const name = document.createElement('span');
    name.textContent = user.username;
    
    const status = document.createElement('span');
    status.className = 'user-status';
    status.textContent = isConnected ? 'Conectado' : 'Desconectado';
    
    info.appendChild(name);
    info.appendChild(status);
    
    item.appendChild(avatar);
    item.appendChild(info);
    return item;
}
// Helper para crear avatares
function createUserAvatar(user, isCurrentUser = false) {
    const userDiv = document.createElement('div');
    userDiv.className = `online-user ${isCurrentUser ? 'current-user' : ''}`;
    userDiv.title = `${user.username} (${user.role})`;
    
    const avatar = document.createElement('div');
    avatar.className = 'google-sheets-avatar';
    
    if (!user.profilePic || user.profilePic.includes('default-profile.png')) {
        avatar.textContent = user.username.charAt(0).toUpperCase();
        avatar.style.backgroundColor = stringToColor(user.username);
    } else {
        const img = document.createElement('img');
        img.src = user.profilePic;
        avatar.appendChild(img);
    }
    
    const statusBadge = document.createElement('div');
    statusBadge.className = `status-badge ${user.role}`;
    
    userDiv.appendChild(avatar);
    userDiv.appendChild(statusBadge);
    
    if (isCurrentUser) {
        const youBadge = document.createElement('div');
        youBadge.className = 'you-badge';
        youBadge.textContent = 'Tú';
        userDiv.appendChild(youBadge);
    }
    
    return userDiv;
}

// Helper para items del dropdown
function createDropdownUserItem(user) {
    const item = document.createElement('div');
    item.className = 'user-dropdown-item';
    
    const avatar = document.createElement('div');
    avatar.className = 'dropdown-avatar';
    avatar.textContent = user.username.charAt(0).toUpperCase();
    avatar.style.backgroundColor = stringToColor(user.username);
    
    const info = document.createElement('span');
    info.textContent = `${user.username} (${user.role})`;
    
    item.appendChild(avatar);
    item.appendChild(info);
    return item;
}

// Helper para generar colores únicos
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 65%)`;
}

function toggleUsersDropdown() {
    const dropdown = document.getElementById('usersDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function showUserProfile(user) {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    
    document.getElementById('profileModalPic').src = user.profilePic;
    document.getElementById('profileUsername').textContent = user.username;
    
    // Crear contenedor para el rol e insignia
    const roleContainer = document.createElement('div');
    roleContainer.className = 'role-badge-container';
    
    const roleText = document.createElement('span');
    roleText.textContent = user.role;
    
    const roleBadge = document.createElement('div');
    roleBadge.className = `role-badge-img role-${user.role}-badge`;
    
    roleContainer.appendChild(roleText);
    roleContainer.appendChild(roleBadge);
    
    const roleElement = document.getElementById('profileRole');
    roleElement.innerHTML = '';
    roleElement.appendChild(roleContainer);
    
    const statusElement = document.getElementById('profileStatus');
    const isOnline = onlineUsers.some(u => u.username === user.username);
    statusElement.innerHTML = `Status: <span class="${isOnline ? 'online-status' : 'offline-status'}">${isOnline ? 'Online' : 'Offline'}</span>`;
    
    // Hide edit section if not current user
    const isCurrentUser = currentUser?.username === user.username;
    document.getElementById('profileEditSection').style.display = isCurrentUser ? 'none' : 'none';
    document.getElementById('profileViewSection').style.display = isCurrentUser ? 'block' : 'none';
    
    modal.style.display = 'flex';
}

// ==================================================
// Excel-style Coordinates Functions
// ==================================================

function getExcelColumnName(columnNumber) {
    let columnName = '';
    while (columnNumber > 0) {
        const remainder = (columnNumber - 1) % 26;
        columnName = String.fromCharCode(65 + remainder) + columnName;
        columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return columnName || 'A';
}

function addCellCoordinates() {
    const tbody = document.querySelector('#tasksTable tbody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, cellIndex) => {
            const existingCoord = cell.querySelector('.cell-coordinate');
            if (existingCoord) existingCoord.remove();
            
            const columnName = getExcelColumnName(cellIndex + 1);
            const coordinate = document.createElement('div');
            coordinate.className = 'cell-coordinate';
            coordinate.textContent = `${columnName}${rowIndex + 1}`;
            cell.appendChild(coordinate);
        });
    });
}

function toggleCoordinates() {
    showCoordinates = !showCoordinates;
    localStorage.setItem('showCoordinates', showCoordinates);
    
    const table = document.getElementById('tasksTable');
    if (table) {
        if (showCoordinates) {
            table.classList.add('show-coordinates');
        } else {
            table.classList.remove('show-coordinates');
        }
    }
}

// ==================================================
// Task Claim Functions
// ==================================================

function saveClaimedTask(subtask, reviewLevel, status, groupIndex, rowIndex) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser?.username) return;

    claimedTask = {
        subtask,
        reviewLevel,
        status,
        reviewer: currentUser.username,
        claimedAt: Date.now(),
        action: null,
        groupIndex,
        rowIndex
    };
    localStorage.setItem('claimedTask', JSON.stringify(claimedTask));
    
    // 1. Eliminar solo la tarea reclamada
    data[rowIndex][groupIndex * 4] = '';
    data[rowIndex][groupIndex * 4 + 1] = '';
    data[rowIndex][groupIndex * 4 + 2] = '';
    data[rowIndex][groupIndex * 4 + 3] = '';

    // 2. Reorganización INSTANTÁNEA
    data = reorganizarTareasInstantaneamente(data);

    // 3. Guardar y renderizar
    localStorage.setItem('taskData', JSON.stringify(data));
    renderTable(data, currentPage);
}

function releaseClaimedTask() {
    claimedTask = null;
    localStorage.removeItem('claimedTask');
}

function hasActiveClaimedTask() {
    if (!claimedTask) return false;
    
    const twentyFourHoursAgo = Date.now() - 86400000;
    if (claimedTask.claimedAt < twentyFourHoursAgo) {
        releaseClaimedTask();
        return false;
    }
    return true;
}

// ==================================================
// History Functions
// ==================================================

function saveAction(action, subtask, reviewer) {
    try {
        const history = JSON.parse(localStorage.getItem('history')) || [];
        const personalHistory = JSON.parse(localStorage.getItem(`history_${reviewer}`)) || [];
        
        const timestamp = new Date().toLocaleString();
        const profilePic = localStorage.getItem(`profilePic_${reviewer}`) || 'default-profile.png';

        // Limitar el historial a 1000 registros (previene overflow)
        if (history.length >= 1000) {
            history.shift(); // Elimina el registro más antiguo
        }

        history.push({ action, subtask, reviewer, timestamp, profilePic });
        personalHistory.push({ action, subtask, timestamp });

        // Intentar guardar (con manejo de error explícito)
        localStorage.setItem('history', JSON.stringify(history));
        localStorage.setItem(`history_${reviewer}`, JSON.stringify(personalHistory));

        if (claimedTask?.subtask === subtask) {
            claimedTask.action = action;
            localStorage.setItem('claimedTask', JSON.stringify(claimedTask));
        }
    } catch (e) {
        console.error("Error saving history:", e);
        // Limpiar historial si está lleno
        if (e.name === 'QuotaExceededError') {
            localStorage.removeItem('history');
            localStorage.setItem('history', JSON.stringify([{ action, subtask, reviewer, timestamp }]));
            alert("Historial limpiado automáticamente para liberar espacio.");
        }
    }
}

function renderHistory(filteredHistory) {
    const history = filteredHistory || JSON.parse(localStorage.getItem('history')) || [];
    const tbody = document.querySelector('#historyTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const start = (currentHistoryPage - 1) * historyRowsPerPage;
    const end = start + historyRowsPerPage;

    history.slice(start, end).forEach(entry => {
        const tr = document.createElement('tr');
        ['action', 'subtask', 'reviewer', 'timestamp'].forEach(key => {
            const td = document.createElement('td');
            td.textContent = entry[key] || '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    const totalPages = Math.ceil(history.length / historyRowsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentHistoryPage} of ${totalPages}`;
    document.getElementById('prevPageBtn').disabled = currentHistoryPage === 1;
    document.getElementById('nextPageBtn').disabled = currentHistoryPage === totalPages;
}

function renderPersonalHistory() {
    if (!currentUser?.username) return;
    
    const personalHistory = JSON.parse(localStorage.getItem(`history_${currentUser.username}`)) || [];
    const tbody = document.querySelector('#personalHistoryTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    personalHistory.forEach(entry => {
        const tr = document.createElement('tr');
        ['action', 'subtask', 'timestamp'].forEach(key => {
            const td = document.createElement('td');
            td.textContent = entry[key] || '';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function setupHistoryControls() {
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
        if (currentHistoryPage > 1) {
            currentHistoryPage--;
            renderHistory();
        }
    });

    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
        const history = JSON.parse(localStorage.getItem('history')) || [];
        const totalPages = Math.ceil(history.length / historyRowsPerPage);
        if (currentHistoryPage < totalPages) {
            currentHistoryPage++;
            renderHistory();
        }
    });

    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
        if (confirm("¿Borrar TODO el historial? Esto no se puede deshacer.")) {
            localStorage.removeItem('history');
            const users = JSON.parse(localStorage.getItem('users')) || [];
            users.forEach(user => {
                localStorage.removeItem(`history_${user.username}`);
            });
            alert("Historial borrado.");
            renderHistory([]); // Actualiza la tabla vacía
        }
    });

    document.getElementById('applyFilters')?.addEventListener('click', applyFilters);
    document.getElementById('backBtn')?.addEventListener('click', closeHistoryModal);
    document.getElementById('closePersonalHistoryBtn')?.addEventListener('click', closePersonalHistoryModal);
    
    // Setup history link in admin menu
    document.getElementById('reportLink')?.addEventListener('click', function(e) {
        e.preventDefault();
        openHistoryModal();
    });
}



function applyFilters() {
    const history = JSON.parse(localStorage.getItem('history')) || [];
    const filterAction = document.getElementById('filterAction').value;
    const filterReviewer = document.getElementById('filterReviewer').value.toLowerCase();
    const filterDate = document.getElementById('filterDate').value;
    const filterSubtask = document.getElementById('filterSubtask').value.toLowerCase();

    const filteredHistory = history.filter(entry => {
        return (!filterAction || entry.action === filterAction) &&
               (!filterReviewer || entry.reviewer.toLowerCase().includes(filterReviewer)) &&
               (!filterDate || entry.timestamp.includes(filterDate)) &&
               (!filterSubtask || entry.subtask.toLowerCase().includes(filterSubtask));
    });

    renderHistory(filteredHistory);
}

function clearAllHistory() {
    if (confirm('Are you sure you want to clear ALL history? This cannot be undone!')) {
        // Clear global history
        localStorage.removeItem('history');
        
        // Clear all personal histories
        const users = JSON.parse(localStorage.getItem('users')) || [];
        users.forEach(user => {
            localStorage.removeItem(`history_${user.username}`);
        });
        
        renderHistory([]);
        if (document.getElementById('personalHistoryModal').style.display === 'flex') {
            renderPersonalHistory();
        }
        
        alert('All history has been cleared.');
    }
}

function openHistoryModal() {
    currentHistoryPage = 1;
    renderHistory();
    document.getElementById('historyModal').style.display = 'flex';
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

function openPersonalHistoryModal() {
    renderPersonalHistory();
    document.getElementById('personalHistoryModal').style.display = 'flex';
}

function closePersonalHistoryModal() {
    document.getElementById('personalHistoryModal').style.display = 'none';
}

// ==================================================
// Task Table Functions
// ==================================================

function parseTaskData(taskData) {
    return taskData.split('\n')
        .filter(line => line.trim())
        .map(line => {
            const columns = line.split('\t');
            // We now expect 16 columns (4 groups of 4)
            return Array(16).fill('').map((_, i) => columns[i] || '');
        });
}

function renderTable(data, page) {
    // Usar datos ya reorganizados (no reorganizar nuevamente aquí)
    const tbody = document.querySelector('#tasksTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const start = (page - 1) * rowsPerPage;
    const paginatedData = data.slice(start, start + rowsPerPage);

    const currentUser = JSON.parse(localStorage.getItem('currentUser'))?.username;
    const hasClaimedTask = claimedTask?.reviewer === currentUser;

    paginatedData.forEach((row, rowIndex) => {
        if (rowIndex === 0 && row[0] === 'Task ID') return;
        
        const tr = document.createElement('tr');

        // Task groups with Claim buttons in columns 4, 8, 12, 16
        const claimPositions = [3, 7, 11, 15];
        
        for (let col = 0; col < 16; col++) {
            const td = document.createElement('td');
            const isClaimColumn = claimPositions.includes(col);
            const groupIndex = Math.floor(col / 4);
            const subtask = row[groupIndex * 4] || '';
            const isClaimed = claimedTask?.subtask === subtask && claimedTask?.groupIndex === groupIndex;

            if (isClaimColumn) {
                // It's a Claim column
                const groupStart = groupIndex * 4;
                const subtask = row[groupStart] || '';
                const reviewLevel = row[groupStart + 1] || '';
                const status = row[groupStart + 2] || '';
                
                td.appendChild(createClaimButton(start + rowIndex, groupIndex, subtask, reviewLevel, status, isClaimed, hasClaimedTask));
            } else {
                // Normal column
                td.textContent = row[col] || '';
            }

            // Highlight claimed task
            if (isClaimed && col >= groupIndex * 4 && col < (groupIndex + 1) * 4) {
                td.style.backgroundColor = '#e6f3ff';
                td.style.color = '#0066cc';
            }

            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });

    addCellCoordinates();
    setupPagination(data);
    
    // Apply coordinates visibility
    const table = document.getElementById('tasksTable');
    if (showCoordinates) {
        table.classList.add('show-coordinates');
    } else {
        table.classList.remove('show-coordinates');
    }
}

function reorganizarTareasInstantaneamente(datos) {
    // Paso 1: Compactar todas las tareas (eliminar espacios vacíos entre ellas)
    const tareasCompactadas = [];
    
    // Recorremos todas las tareas existentes
    for (let fila of datos) {
        for (let i = 0; i < 16; i += 4) {
            if (fila[i] !== '') { // Si hay una tarea válida
                tareasCompactadas.push(fila.slice(i, i + 4)); // Agregar el grupo de 4 columnas
            }
        }
    }

    // Paso 2: Reconstruir la estructura de filas original (16 columnas)
    const nuevasFilas = [];
    let filaActual = Array(16).fill('');
    let posicionActual = 0;

    for (let tarea of tareasCompactadas) {
        // Si no cabe en la fila actual, crear nueva fila
        if (posicionActual + 4 > 16) {
            nuevasFilas.push(filaActual);
            filaActual = Array(16).fill('');
            posicionActual = 0;
        }
        
        // Insertar la tarea
        for (let j = 0; j < 4; j++) {
            filaActual[posicionActual + j] = tarea[j];
        }
        posicionActual += 4;
    }

    // Agregar la última fila si tiene contenido
    if (posicionActual > 0) {
        nuevasFilas.push(filaActual);
    }

    return nuevasFilas;
}

function createClaimButton(rowIdx, groupIndex, subtask, reviewLevel, status) {
    const button = document.createElement('button');
    button.className = 'claim-btn';
    
    // Asignar atributos de datos
    button.dataset.rowIndex = rowIdx;
    button.dataset.groupIndex = groupIndex;
    if (subtask) button.dataset.subtask = subtask;
    if (reviewLevel) button.dataset.reviewLevel = reviewLevel;
    if (status) button.dataset.status = status;

    // Verificar estados
    const isComplete = subtask && reviewLevel && status;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'))?.username;
    const isClaimed = claimedTask?.subtask === subtask;

    if (!isComplete) {
        button.disabled = true;
        button.textContent = 'Incompleta';
        button.classList.add('incomplete');
    } else if (isClaimed) {
        button.disabled = true;
        button.textContent = (claimedTask?.reviewer === currentUser) ? 'En Progreso' : 'Ocupada';
        button.classList.add('claimed');
    } else {
        button.textContent = 'Claim';
        button.addEventListener('click', handleClaimClick);
    }

    return button;
}

function handleClaimClick() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Por favor inicie sesión primero');
        return;
    }

    const subtask = this.dataset.subtask;
    const reviewLevel = this.dataset.reviewLevel;
    const status = this.dataset.status;
    const rowIdx = parseInt(this.dataset.rowIndex);
    const groupIndex = parseInt(this.dataset.groupIndex);

    if (!subtask || !reviewLevel || !status) {
        alert('Datos de tarea incompletos');
        return;
    }

    saveClaimedTask(subtask, reviewLevel, status, groupIndex, rowIdx);
    openModal(subtask, reviewLevel, status, true); // Añadir true para forzar apertura
}

function handleClaimTask(button) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Por favor inicie sesión primero');
        return;
    }

    const rowIdx = parseInt(button.dataset.rowIndex);
    const groupIndex = parseInt(button.dataset.groupIndex);
    const subtask = button.dataset.subtask || '';
    const reviewLevel = button.dataset.reviewLevel || '';
    const status = button.dataset.status || '';

    // Validación final de datos
    if (!subtask || !reviewLevel || !status) {
        alert('Error: Datos incompletos de la tarea');
        return;
    }

    saveClaimedTask(subtask, reviewLevel, status, groupIndex, rowIndex);
    renderTable(data, currentPage);
    openModal(subtask, reviewLevel, status);
}

function attachClaimButtonEvents() {
    document.querySelectorAll('.claim-btn').forEach(button => {
        button.addEventListener('click', function() {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) {
                alert('Please log in first');
                return;
            }

            const rowIdx = parseInt(this.dataset.rowIndex);
            const groupIndex = parseInt(this.dataset.groupIndex);
            const subtask = this.dataset.subtask || 'N/A';
            const reviewLevel = this.dataset.reviewLevel || 'N/A';
            const status = this.dataset.status || 'N/A';

            // Verificar si ya hay una tarea reclamada
            if (hasActiveClaimedTask() && claimedTask.reviewer !== currentUser.username) {
                alert('You already have a task in progress. Please finish it first.');
                return;
            }

            saveClaimedTask(subtask, reviewLevel, status, groupIndex, rowIdx);
            renderTable(data, currentPage);
            openModal(subtask, reviewLevel, status);
        });
    });
}

function setupPagination(data) {
    const existingPagination = document.querySelector('.pagination');
    if (existingPagination) existingPagination.remove();

    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    const totalPages = Math.ceil(data.length / rowsPerPage);

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.addEventListener('click', () => {
            currentPage = i;
            renderTable(data, currentPage);
        });
        paginationDiv.appendChild(button);
    }

    document.querySelector('#tasksTable')?.after(paginationDiv);
}

// ==================================================
// Task Modal Functions
// ==================================================

function openModal(subtask, reviewLevel, status, forceOpen = false) {
    const modal = document.getElementById('modal');
    if (!modal) return;

    modalForcedOpen = forceOpen;
    
    document.getElementById('modal-subtask').textContent = subtask || 'N/A';
    document.getElementById('modal-review-level').textContent = reviewLevel || 'N/A';
    document.getElementById('modal-status').textContent = status || 'N/A';
    document.getElementById('open-task-btn').dataset.subtask = subtask;
    document.getElementById('modal-action').value = '';
    document.getElementById('finish-btn').disabled = true;
    modal.style.display = 'flex';
    
    // Guardar en localStorage que hay un modal abierto
    sessionStorage.setItem('activeModal', JSON.stringify({
        subtask,
        reviewLevel,
        status,
        forceOpen
    }));
}

// En setupModalEvents()
function setupModalEvents() {
    const modal = document.getElementById('modal');
    if (!modal) return;

    // Cierra el modal al hacer clic en la "X"
    document.querySelector('#modal .close').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Habilita el botón Finish al seleccionar una acción
    document.getElementById('modal-action').addEventListener('change', function() {
        document.getElementById('finish-btn').disabled = !this.value;
    });

    // Maneja el clic en Finish
    document.getElementById('finish-btn').addEventListener('click', function() {
        const action = document.getElementById('modal-action').value;
        const subtask = document.getElementById('modal-subtask').textContent;
        const reviewer = currentUser?.username;

        if (!action) {
            alert("Please select an action first!");
            return;
        }

        saveAction(action, subtask, reviewer);
        releaseClaimedTask();
        modal.style.display = 'none';
        window.location.reload(); // Actualiza la tabla
    });

    // Abre la tarea en Remotasks
    document.getElementById('open-task-btn').addEventListener('click', function() {
        const subtaskId = this.dataset.subtask;
        if (subtaskId) {
            window.open(`https://www.remotasks.com/en/tasks?forceClaim=1&subtaskId=${subtaskId}`, '_blank');
        }
    });
}

function closeModalHandler() {
    // Solo permitir cerrar si no es un modal forzado
    if (!modalForcedOpen) {
        document.getElementById('modal').style.display = 'none';
        sessionStorage.removeItem('activeModal');
    }
}

// ==================================================
// Load Tasks Functions
// ==================================================

function setupLoadTasksModal() {
    const modal = document.getElementById('loadTasksModal');
    if (!modal) return;

    document.getElementById('loadTasksLink')?.addEventListener('click', e => {
        e.preventDefault();
        openLoadTasksModal();
    });

    document.getElementById('connectSheetBtn')?.addEventListener('click', connectToSheet);
    document.getElementById('uploadTasksBtn')?.addEventListener('click', processTaskUpload);
    document.getElementById('removeDuplicatesBtn')?.addEventListener('click', removeReviewLevel10Tasks);
    document.getElementById('removeCompletedBtn')?.addEventListener('click', removeCompletedTasks);
    document.getElementById('removeReviewLevelBtn')?.addEventListener('click', removeReviewLevelMinus1Tasks);
    document.getElementById('cancelLoadBtn')?.addEventListener('click', closeLoadTasksModal);
    modal.querySelector('.close')?.addEventListener('click', closeLoadTasksModal);
    
    // Nuevos botones
    document.getElementById('removeReviewLevel11Btn')?.addEventListener('click', removeReviewLevel11Tasks);
    document.getElementById('removeReviewLevel12Btn')?.addEventListener('click', removeReviewLevel12Tasks);
    document.getElementById('removeQuarantinedBtn')?.addEventListener('click', removeQuarantinedTasks);
}

function openLoadTasksModal() {
    const modal = document.getElementById('loadTasksModal');
    if (!modal) return;
    
    // Reset connection status
    document.getElementById('connectionStatus').textContent = 'Disconnected';
    document.getElementById('connectionStatus').className = 'sheet-disconnected';
    isSheetConnected = false;
    
    modal.style.display = 'flex'; // Solo se muestra cuando se llama explícitamente
}

function closeLoadTasksModal() {
    document.getElementById('loadTasksModal').style.display = 'none';
}

function connectToSheet() {
    const sheetUrl = document.getElementById('sheetUrl').value.trim();
    if (!sheetUrl) {
        alert('Please enter a Google Sheet URL');
        return;
    }

    document.getElementById('connectionStatus').textContent = 'Connecting...';
    
    // Use the Google Sheets API to fetch data
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            if (data.values) {
                // Process the sheet data
                sheetData = processSheetData(data.values);
                renderSheetPreview(sheetData);
                
                document.getElementById('connectionStatus').textContent = 'Connected';
                document.getElementById('connectionStatus').className = 'sheet-connected';
                isSheetConnected = true;
            } else {
                throw new Error('No data found in sheet');
            }
        })
        .catch(error => {
            console.error('Error fetching sheet data:', error);
            document.getElementById('connectionStatus').textContent = 'Connection Failed';
            document.getElementById('connectionStatus').className = 'sheet-disconnected';
            alert('Failed to connect to Google Sheet. Please check the URL and try again.');
        });
}

function processSheetData(sheetValues) {
    // Skip header row if exists
    const startRow = sheetValues[0][0] === 'Subtask 1' ? 1 : 0;
    const processedData = [];
    
    for (let i = startRow; i < sheetValues.length; i++) {
        const row = sheetValues[i];
        const newRow = Array(16).fill('');
        
        // Process each task group (4 columns per group)
        for (let group = 0; group < 4; group++) {
            const startCol = group * 4;
            for (let j = 0; j < 4 && startCol + j < row.length; j++) {
                newRow[startCol + j] = row[startCol + j] || '';
            }
        }
        
        processedData.push(newRow);
    }
    
    return processedData;
}

function renderSheetPreview(data) {
    const tbody = document.querySelector('#sheetPreviewTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        
        row.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell || '';
            // Resaltar celdas vacías
            if (!cell) {
                td.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            }
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
}

function processTaskUpload() {
    if (!isSheetConnected || sheetData.length === 0) {
        alert('Please connect to a sheet and load data first');
        return;
    }

    data = sheetData;
    localStorage.setItem('taskData', JSON.stringify(data));
    
    currentPage = 1;
    renderTable(data, currentPage);
    setupPagination(data);
    
    closeLoadTasksModal();
    alert('Tasks loaded successfully!');
}

function removeReviewLevel10Tasks() {
    if (sheetData.length === 0) {
        alert('No data to process');
        return;
    }
    
    const filteredData = sheetData.map(row => {
        const newRow = [...row];
        
        // Check each task group in the row
        for (let i = 0; i < 16; i += 4) {
            const reviewLevel = row[i + 1];
            
            // Remove tasks with review level 10
            if (reviewLevel === '10') {
                for (let j = 0; j < 4; j++) {
                    newRow[i + j] = '';
                }
            }
        }
        
        return newRow;
    }).filter(row => {
        // Remove rows that are completely empty
        return row.some(cell => cell !== '');
    });
    
    sheetData = filteredData;
    renderSheetPreview(sheetData);
    alert(`Removed tasks with review level 10. ${sheetData.length} tasks remaining.`);
}

function removeCompletedTasks() {
    if (sheetData.length === 0) {
        alert('No data to process');
        return;
    }
    
    const filteredData = sheetData.map(row => {
        const newRow = [...row];
        
        // Check each task group in the row
        for (let i = 0; i < 16; i += 4) {
            const status = row[i + 2];
            
            // Remove completed tasks
            if (status === 'completed') {
                for (let j = 0; j < 4; j++) {
                    newRow[i + j] = '';
                }
            }
        }
        
        return newRow;
    }).filter(row => {
        // Remove rows that are completely empty
        return row.some(cell => cell !== '');
    });
    
    sheetData = filteredData;
    renderSheetPreview(sheetData);
    alert(`Removed completed tasks. ${sheetData.length} tasks remaining.`);
}

function removeReviewLevelMinus1Tasks() {
    if (sheetData.length === 0) {
        alert('No data to process');
        return;
    }
    
    const filteredData = sheetData.map(row => {
        const newRow = [...row];
        
        // Check each task group in the row
        for (let i = 0; i < 16; i += 4) {
            const reviewLevel = row[i + 1];
            
            // Remove tasks with review level -1
            if (reviewLevel === '-1') {
                for (let j = 0; j < 4; j++) {
                    newRow[i + j] = '';
                }
            }
        }
        
        return newRow;
    }).filter(row => {
        // Remove rows that are completely empty
        return row.some(cell => cell !== '');
    });
    
    sheetData = filteredData;
    renderSheetPreview(sheetData);
    alert(`Removed tasks with review level -1. ${sheetData.length} tasks remaining.`);
}

function removeReviewLevel11Tasks() {
    if (sheetData.length === 0) {
        alert('No data to process');
        return;
    }
    
    const filteredData = sheetData.map(row => {
        const newRow = [...row];
        
        // Check each task group in the row
        for (let i = 0; i < 16; i += 4) {
            const reviewLevel = row[i + 1];
            
            // Remove tasks with review level 11
            if (reviewLevel === '11') {
                for (let j = 0; j < 4; j++) {
                    newRow[i + j] = '';
                }
            }
        }
        
        return newRow;
    }).filter(row => {
        // Remove rows that are completely empty
        return row.some(cell => cell !== '');
    });
    
    sheetData = filteredData;
    renderSheetPreview(sheetData);
    alert(`Removed tasks with review level 11. ${sheetData.length} tasks remaining.`);
}

function removeReviewLevel12Tasks() {
    if (sheetData.length === 0) {
        alert('No data to process');
        return;
    }
    
    const filteredData = sheetData.map(row => {
        const newRow = [...row];
        
        // Check each task group in the row
        for (let i = 0; i < 16; i += 4) {
            const reviewLevel = row[i + 1];
            
            // Remove tasks with review level 12
            if (reviewLevel === '12') {
                for (let j = 0; j < 4; j++) {
                    newRow[i + j] = '';
                }
            }
        }
        
        return newRow;
    }).filter(row => {
        // Remove rows that are completely empty
        return row.some(cell => cell !== '');
    });
    
    sheetData = filteredData;
    renderSheetPreview(sheetData);
    alert(`Removed tasks with review level 12. ${sheetData.length} tasks remaining.`);
}

function removeQuarantinedTasks() {
    if (sheetData.length === 0) {
        alert('No data to process');
        return;
    }
    
    const filteredData = sheetData.map(row => {
        const newRow = [...row];
        
        // Check each task group in the row
        for (let i = 0; i < 16; i += 4) {
            const status = row[i + 2];
            
            // Remove quarantined tasks
            if (status === 'quarantined') {
                for (let j = 0; j < 4; j++) {
                    newRow[i + j] = '';
                }
            }
        }
        
        return newRow;
    }).filter(row => {
        // Remove rows that are completely empty
        return row.some(cell => cell !== '');
    });
    
    sheetData = filteredData;
    renderSheetPreview(sheetData);
    alert(`Removed quarantined tasks. ${sheetData.length} tasks remaining.`);
}

function setupLoadTasksModal() {
    const modal = document.getElementById('loadTasksModal');
    if (!modal) return;

    document.getElementById('loadTasksLink')?.addEventListener('click', e => {
        e.preventDefault();
        openLoadTasksModal();
    });

    document.getElementById('connectSheetBtn')?.addEventListener('click', connectToSheet);
    document.getElementById('uploadTasksBtn')?.addEventListener('click', processTaskUpload);
    document.getElementById('removeDuplicatesBtn')?.addEventListener('click', removeReviewLevel10Tasks);
    document.getElementById('removeCompletedBtn')?.addEventListener('click', removeCompletedTasks);
    document.getElementById('removeReviewLevelBtn')?.addEventListener('click', removeReviewLevelMinus1Tasks);
    document.getElementById('cancelLoadBtn')?.addEventListener('click', closeLoadTasksModal);
    modal.querySelector('.close')?.addEventListener('click', closeLoadTasksModal);
    
    // Existing buttons
    document.getElementById('removeReviewLevel11Btn')?.addEventListener('click', removeReviewLevel11Tasks);
    document.getElementById('removeReviewLevel12Btn')?.addEventListener('click', removeReviewLevel12Tasks);
    document.getElementById('removeQuarantinedBtn')?.addEventListener('click', removeQuarantinedTasks);
    
    // New button for Review Level 0
    document.getElementById('removeReviewLevel0Btn')?.addEventListener('click', removeReviewLevel0Tasks);
}

function removeReviewLevel0Tasks() {
    if (sheetData.length === 0) {
        alert('No data to process');
        return;
    }
    
    const filteredData = sheetData.map(row => {
        const newRow = [...row];
        
        // Check each task group in the row
        for (let i = 0; i < 16; i += 4) {
            const reviewLevel = row[i + 1];
            
            // Remove tasks with review level 0
            if (reviewLevel === '0') {
                for (let j = 0; j < 4; j++) {
                    newRow[i + j] = '';
                }
            }
        }
        
        return newRow;
    }).filter(row => {
        // Remove rows that are completely empty
        return row.some(cell => cell !== '');
    });
    
    sheetData = filteredData;
    renderSheetPreview(sheetData);
    alert(`Removed tasks with review level 0. ${sheetData.length} tasks remaining.`);
}

// ==================================================
// User Management Functions
// ==================================================

function setupManageUsersModal() {
    document.getElementById('manageUsersLink')?.addEventListener('click', e => {
        e.preventDefault();
        openManageUsersModal();
    });

    

    document.getElementById('saveRolesBtn')?.addEventListener('click', saveUserRoles);
    document.getElementById('cancelManageUsersBtn')?.addEventListener('click', closeManageUsersModal);
    document.querySelector('#manageUsersModal .close')?.addEventListener('click', closeManageUsersModal);
}

function openManageUsersModal() {
    loadUsers();
    document.getElementById('manageUsersModal').style.display = 'flex';
}

function closeManageUsersModal() {
    document.getElementById('manageUsersModal').style.display = 'none';
}

function loadUsers() {
    let users = JSON.parse(localStorage.getItem('users')) || [];
    
    // Asegurarnos que el usuario CarlosD existe con rol developer
    const carlosUser = users.find(u => u.username === 'CarlosD');
    if (!carlosUser) {
        users.push({
            username: 'CarlosD',
            password: 'Diosenticonfio',
            role: 'developer'
        });
        localStorage.setItem('users', JSON.stringify(users));
    } else if (carlosUser.role !== 'developer') {
        carlosUser.role = 'developer';
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    users.forEach((user, index) => {
        const tr = document.createElement('tr');
        
        // Username
        const tdUsername = document.createElement('td');
        tdUsername.textContent = user.username;
        tr.appendChild(tdUsername);
        
        // Current Role
        const tdCurrentRole = document.createElement('td');
        tdCurrentRole.textContent = user.role;
        tr.appendChild(tdCurrentRole);
        
        // Role Selector
        const tdRoleSelect = document.createElement('td');
        const select = document.createElement('select');
        select.dataset.userIndex = index;
        ['admin', 'L0', 'L10', 'L12', 'developer'].forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role;
            if (role === user.role) option.selected = true;
            select.appendChild(option);
        });
        
        // Deshabilitar para CarlosD
        if (user.username === 'CarlosD') {
            select.disabled = true;
        }
        
        tdRoleSelect.appendChild(select);
        tr.appendChild(tdRoleSelect);
        
        // Delete Button (ocultar para CarlosD)
        const tdActions = document.createElement('td');
        if (user.username !== 'CarlosD') {
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-user-btn';
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
                    deleteUser(index);
                }
            });
            tdActions.appendChild(deleteBtn);
        }

        
        tr.appendChild(tdActions);
        
        tbody.appendChild(tr);
    });
}



function saveUserRoles() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const selects = document.querySelectorAll('#usersTable select');
    
    selects.forEach(select => {
        const index = parseInt(select.dataset.userIndex);
        if (index >= 0 && index < users.length && users[index].username !== 'CarlosD') {
            users[index].role = select.value;
        }
    });
    
    localStorage.setItem('users', JSON.stringify(users));
    alert('User roles updated successfully!');
    closeManageUsersModal();
}

function deleteUser(index) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (index >= 0 && index < users.length && users[index].username !== 'CarlosD') {
        users.splice(index, 1);
        localStorage.setItem('users', JSON.stringify(users));
        loadUsers();
    }
}

// ==================================================
// Profile Picture Functions
// ==================================================

function setupProfilePicture() {
    const profilePic = document.getElementById('profilePic');
    if (!profilePic) return;

    // Load saved profile picture
    const savedPic = localStorage.getItem(`profilePic_${currentUser?.username}`);
    if (savedPic) {
        profilePic.src = savedPic;
    }

    // Open modal when clicking on profile picture
    profilePic.addEventListener('click', () => showUserProfile({
        username: currentUser.username,
        role: currentUser.role,
        profilePic: savedPic || 'default-profile.png'
    }));

    // Setup modal events
    const profileModal = document.getElementById('profileModal');
    profileModal.addEventListener('click', function(e) {
        if (e.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });

    


    document.getElementById('editProfileBtn')?.addEventListener('click', function() {
        document.getElementById('profileEditSection').style.display = 'block';
        document.getElementById('profileViewSection').style.display = 'none';
        document.getElementById('profilePicPreview').src = document.getElementById('profileModalPic').src;
    });

    document.getElementById('saveProfilePicBtn')?.addEventListener('click', saveProfilePicture);
    document.getElementById('cancelProfilePicBtn')?.addEventListener('click', function() {
        document.getElementById('profileEditSection').style.display = 'none';
        document.getElementById('profileViewSection').style.display = 'block';
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('logoutBtnView')?.addEventListener('click', logout);
    
    document.querySelector('#profileModal .close')?.addEventListener('click', function() {
        document.getElementById('profileModal').style.display = 'none';
    });
}

function saveProfilePicture() {
    const preview = document.getElementById('profilePicPreview');
    const profilePic = document.getElementById('profilePic');
    const profileModalPic = document.getElementById('profileModalPic');
    const input = document.getElementById('profilePicInput');

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            profilePic.src = e.target.result;
            profileModalPic.src = e.target.result;
            localStorage.setItem(`profilePic_${currentUser?.username}`, e.target.result);
            
            // Update in online users
            const onlineUsers = JSON.parse(localStorage.getItem('onlineUsers')) || [];
            const userIndex = onlineUsers.findIndex(u => u.username === currentUser.username);
            if (userIndex !== -1) {
                onlineUsers[userIndex].profilePic = e.target.result;
                localStorage.setItem('onlineUsers', JSON.stringify(onlineUsers));
                renderOnlineUsers();
            }
            
            document.getElementById('profileEditSection').style.display = 'none';
            document.getElementById('profileViewSection').style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    } else if (preview.src.includes('data:image')) {
        profilePic.src = preview.src;
        profileModalPic.src = preview.src;
        localStorage.setItem(`profilePic_${currentUser?.username}`, preview.src);
        
        // Update in online users
        const onlineUsers = JSON.parse(localStorage.getItem('onlineUsers')) || [];
        const userIndex = onlineUsers.findIndex(u => u.username === currentUser.username);
        if (userIndex !== -1) {
            onlineUsers[userIndex].profilePic = preview.src;
            localStorage.setItem('onlineUsers', JSON.stringify(onlineUsers));
            renderOnlineUsers();
        }
        
        document.getElementById('profileEditSection').style.display = 'none';
        document.getElementById('profileViewSection').style.display = 'block';
    }
    
}



function logout() {
    // Remove from online users
    const onlineUsers = JSON.parse(localStorage.getItem('onlineUsers')) || [];
    const updatedOnlineUsers = onlineUsers.filter(u => u.username !== currentUser.username);
    localStorage.setItem('onlineUsers', JSON.stringify(updatedOnlineUsers));
    
    // Clear current user
    localStorage.removeItem('currentUser');
    
    // Redirect to login page
    window.location.href = 'index.html';
}



// ==================================================
// Ranking Functions (new)
// ==================================================

function updateRanking() {
    const history = JSON.parse(localStorage.getItem('history')) || [];
    const rankingList = document.getElementById('rankingList');
    if (!rankingList) return;
    
    const userStats = {};
    history.forEach(entry => {
        if (entry.action === 'accepted') {
            if (!userStats[entry.reviewer]) {
                userStats[entry.reviewer] = {
                    count: 0,
                    profilePic: entry.profilePic || 'default-profile.png'
                };
            }
            userStats[entry.reviewer].count++;
        }
    });
    
    // Get profile pictures from online users
    const onlineUsers = JSON.parse(localStorage.getItem('onlineUsers')) || [];
    onlineUsers.forEach(user => {
        if (userStats[user.username]) {
            userStats[user.username].profilePic = user.profilePic;
        }
    });
    
    // Convert to array and sort by count
    const ranking = Object.entries(userStats)
        .map(([username, stats]) => ({ username, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5
    
    // Render ranking
    rankingList.innerHTML = '';
    ranking.forEach((user, index) => {
        const item = document.createElement('div');
        item.className = 'ranking-item';
        
        const avatar = document.createElement('img');
        avatar.className = 'ranking-avatar';
        avatar.src = user.profilePic;
        avatar.alt = user.username;
        
        const name = document.createElement('div');
        name.className = 'ranking-name';
        name.textContent = user.username;
        
        const score = document.createElement('div');
        score.className = 'ranking-score';
        score.textContent = `${user.count} tasks`;
        
        item.appendChild(avatar);
        item.appendChild(name);
        item.appendChild(score);
        rankingList.appendChild(item);
    });
}


// ==================================================
// Menu Functions
// ==================================================

function setupMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const adminsBtn = document.getElementById('adminsBtn');
    
    if (menuBtn) {
        const menuDropdown = menuBtn.nextElementSibling;
        
        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            menuDropdown.style.display = menuDropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
                menuDropdown.style.display = 'none';
                menuBtn.classList.remove('active');
            }
        });
    }
    
    if (adminsBtn) {
        const adminDropdown = adminsBtn.nextElementSibling;
        
        adminsBtn.addEventListener('click', () => {
            adminsBtn.classList.toggle('active');
            adminDropdown.style.display = adminDropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', (e) => {
            if (!adminsBtn.contains(e.target) && !adminDropdown.contains(e.target)) {
                adminDropdown.style.display = 'none';
                adminsBtn.classList.remove('active');
            }
        });
    }
    
    // Clear all history solo para admins
    document.getElementById('clearAllHistoryBtn')?.addEventListener('click', clearAllHistory);
}

// ==================================================
// Utility Functions
// ==================================================

function showError(message) {
    const tbody = document.querySelector('#tasksTable tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="16">${message}</td></tr>`;
    }
}

function openLastClaimedTaskModal() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser?.username) {
        alert('Please log in first');
        return;
    }

    if (!claimedTask || claimedTask.reviewer !== currentUser.username) {
        alert('You have no tasks in progress.');
        return;
    }

    const history = JSON.parse(localStorage.getItem('history')) || [];
    const taskCompleted = history.some(entry => 
        entry.subtask === claimedTask.subtask && 
        ['accepted', 'reject'].includes(entry.action)
    );

    if (taskCompleted) {
        alert('This task was already completed.');
        releaseClaimedTask();
        return;
    }

    openModal(claimedTask.subtask, claimedTask.reviewLevel, claimedTask.status);
}

function checkAdminStatus() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser?.role === 'admin') {
        document.body.classList.add('admin');
    }
    if (currentUser?.role === 'developer') {
        document.body.classList.add('developer');
    }
}

// ==================================================
// Initialization
// ==================================================

function setupMenu() {
    // Menu dropdown con hover
    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        const dropdown = menuBtn.nextElementSibling;
        menuBtn.addEventListener('mouseenter', () => dropdown.style.display = 'block');
        menuBtn.addEventListener('mouseleave', () => dropdown.style.display = 'none');
        dropdown.addEventListener('mouseenter', () => dropdown.style.display = 'block');
        dropdown.addEventListener('mouseleave', () => dropdown.style.display = 'none');
    }
    
    document.getElementById('toggleCoordinatesBtn')?.addEventListener('click', toggleCoordinates);
    document.getElementById('personalHistoryBtn')?.addEventListener('click', openPersonalHistoryModal);
    
    
    // Admin dropdown con hover
    const adminsBtn = document.getElementById('adminsBtn');
    if (adminsBtn) {
        const dropdown = adminsBtn.nextElementSibling;
        adminsBtn.addEventListener('mouseenter', () => dropdown.style.display = 'block');
        adminsBtn.addEventListener('mouseleave', () => dropdown.style.display = 'none');
        dropdown.addEventListener('mouseenter', () => dropdown.style.display = 'block');
        dropdown.addEventListener('mouseleave', () => dropdown.style.display = 'none');
        
        // Move Clear All History button to admin menu
        const clearHistoryBtn = document.getElementById('clearAllHistoryBtn');
        if (clearHistoryBtn) {
            dropdown.appendChild(clearHistoryBtn);
        }
    }
    
    // Clear all history solo para admins
    document.getElementById('clearAllHistoryBtn')?.addEventListener('click', clearAllHistory);
}



// ==================================================
// Initialization (updated)
// ==================================================

function initializeTasksPage() {

    function restoreModalState() {
        const savedModal = JSON.parse(sessionStorage.getItem('activeModal'));
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (savedModal && claimedTask && claimedTask.reviewer === currentUser?.username) {
            openModal(savedModal.subtask, savedModal.reviewLevel, savedModal.status, true);
        }
    }

    function checkOpenModal() {
        const activeModal = JSON.parse(localStorage.getItem('activeModal'));
        if (activeModal && claimedTask) {
            openModal(activeModal.subtask, activeModal.reviewLevel, activeModal.status);
        }
    }
    checkAdminStatus();
    
    // Load saved settings
    showCoordinates = localStorage.getItem('showCoordinates') === 'true';
    
    // Setup event handlers
    setupMenu();
    setupModalEvents();
    setupHistoryControls();
    setupManageUsersModal();
    setupLoadTasksModal();
    setupProfilePicture();

    // Setup task in progress button
    document.getElementById('taskInProgressBtn')?.addEventListener('click', openLastClaimedTaskModal);

    // Setup register link
    document.getElementById('registerLink')?.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'register.html';
    });

    // Load saved data
    data = JSON.parse(localStorage.getItem('taskData')) || [];
    
    // Check for expired claimed task
    if (hasActiveClaimedTask() && claimedTask.claimedAt < Date.now() - 86400000) {
        releaseClaimedTask();
    }

    // Update online users status
    updateOnlineUsers();
    setInterval(updateOnlineUsers, 60000); // Update every minute

    // Render initial data
    if (data.length > 0) {
        renderTable(data, currentPage);
        setupPagination(data);
    } else {
        showError('No task data available. Please load tasks.');
    }
    
    // Update ranking
    updateRanking();
    
    // Attach claim button events after initial render
    setTimeout(attachClaimButtonEvents, 100);
}

function initializeLoginPage() {
    setupLoginForm();
}

function initializeRegisterPage() {
    setupRegisterForm();
}

// Initialize the appropriate page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('tasks.html')) {
        initializeTasksPage();
    } else if (window.location.pathname.endsWith('index.html')) {
        initializeLoginPage();
    } else if (window.location.pathname.endsWith('register.html')) {
        initializeRegisterPage();
    }
    
    // Check if user is logged in when accessing tasks page
    if (window.location.pathname.endsWith('tasks.html')) {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!currentUser) {
            window.location.href = 'index.html';
        }
    }
});