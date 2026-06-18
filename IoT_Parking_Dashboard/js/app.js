document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. STATE MANAGEMENT ---
    const parkingState = { slot1: 'KOSONG', slot2: 'KOSONG' };

    // --- 2. INISIALISASI CHART.JS DENGAN GRADIENT ---
    const canvas = document.getElementById('densityChart');
    const ctx = canvas.getContext('2d');
    
    // Membuat efek gradasi warna untuk chart
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 230, 118, 0.4)'); // Emerald terang di atas
    gradient.addColorStop(1, 'rgba(0, 230, 118, 0.0)'); // Transparan di bawah

    const dummyData = Array.from({length: 11}, () => Math.floor(Math.random() * 100));
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'],
            datasets: [{
                data: dummyData,
                borderColor: '#00e676',
                backgroundColor: gradient, // Gunakan gradient di sini
                borderWidth: 3, 
                fill: true, 
                tension: 0.4, // Membuat garis lebih melengkung halus
                pointBackgroundColor: '#050b14', 
                pointBorderColor: '#00e676',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
                x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } }
            }
        }
    });

    // --- 3. MQTT CONNECTION LOGIC ---
    const mqttClient = new Paho.MQTT.Client("broker.hivemq.com", 8000, "/mqtt", "WebClient_" + Math.random().toString(16).substr(2, 8));

    mqttClient.onConnectionLost = function() {
        document.getElementById('mqtt-indicator').className = 'status-badge';
        document.getElementById('mqtt-text').innerText = 'Disconnected';
    };

    mqttClient.onMessageArrived = function(message) {
        const topic = message.destinationName;
        const payload = message.payloadString.trim().toUpperCase();

        if (topic === "uas/tubagus/slot1") {
            parkingState.slot1 = payload === '1' ? 'TERISI' : payload;
            updateSlotUI('card-slot1', 'status-slot1', parkingState.slot1);
        } 
        else if (topic === "uas/tubagus/slot2") {
            parkingState.slot2 = payload === '1' ? 'TERISI' : payload;
            updateSlotUI('card-slot2', 'status-slot2', parkingState.slot2);
        } 
        else if (topic === "uas/tubagus/gate") {
            appendLog(message.payloadString);
        }
    };

    mqttClient.connect({
        timeout: 3, useSSL: false,
        onSuccess: function() {
            document.getElementById('mqtt-indicator').className = 'status-badge connected';
            document.getElementById('mqtt-text').innerText = 'Connected';
            mqttClient.subscribe("uas/tubagus/slot1");
            mqttClient.subscribe("uas/tubagus/slot2");
            mqttClient.subscribe("uas/tubagus/gate");
        }
    });

    // --- 4. HELPER FUNCTIONS ---
    function updateSlotUI(cardId, textId, status) {
        const card = document.getElementById(cardId);
        const textEl = document.getElementById(textId);
        if (status === 'TERISI') {
            card.className = 'glass-panel slot-card terisi';
            textEl.innerText = 'TERISI';
        } else {
            card.className = 'glass-panel slot-card kosong';
            textEl.innerText = 'KOSONG';
        }
    }

    function appendLog(text) {
        const list = document.getElementById('log-list');
        const time = new Date().toTimeString().split(' ')[0];
        const li = document.createElement('li');
        li.className = 'log-item';
        // Tambahkan ikon gerbang kecil di log
        li.innerHTML = `<span class="log-time"><i class="fa-solid fa-clock"></i> ${time}</span> ${text}`;
        list.appendChild(li);
        list.scrollTop = list.scrollHeight;
    }

    // --- 5. AI CHATBOT LOGIC ---
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');

    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleUserChat(); });
    btnSend.addEventListener('click', handleUserChat);

    function handleUserChat() {
        const text = chatInput.value.trim();
        if (!text) return;
        addChatBubble(text, 'user');
        chatInput.value = '';
        const typingInd = document.getElementById('typing-indicator');
        typingInd.style.display = 'block';

        setTimeout(() => {
            typingInd.style.display = 'none';
            addChatBubble(processAILogic(text.toLowerCase()), 'ai');
        }, 800);
    }

    function addChatBubble(text, sender) {
        const history = document.getElementById('chat-history');
        const div = document.createElement('div');
        div.className = `chat-bubble ${sender}`;
        
        // Membedakan layout avatar user vs AI
        if(sender === 'ai') {
            div.innerHTML = `
                <div class="avatar"><i class="fa-solid fa-microchip"></i></div>
                <div class="message"><strong>System Core:</strong><br>${text}</div>`;
        } else {
            div.innerHTML = `
                <div class="avatar"><i class="fa-solid fa-user"></i></div>
                <div class="message">${text}</div>`;
        }
        
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
    }

    function processAILogic(query) {
        let kosong = [], terisi = [];
        if(parkingState.slot1 === 'KOSONG') kosong.push('Slot 1'); else terisi.push('Slot 1');
        if(parkingState.slot2 === 'KOSONG') kosong.push('Slot 2'); else terisi.push('Slot 2');

        if (query.includes('kosong') || query.includes('tersedia')) {
            if (kosong.length === 0) return "Saat ini <strong>semua slot penuh</strong>.";
            return `Terdapat <strong>${kosong.length} slot kosong</strong>, yaitu di: ${kosong.join(' & ')}.`;
        } else if (query.includes('isi') || query.includes('penuh')) {
            if (terisi.length === 0) return "Area parkir saat ini <strong>kosong sepenuhnya</strong>.";
            return `Slot yang <strong>sedang terisi</strong>: ${terisi.join(' & ')}.`;
        } else if (query.includes('status') || query.includes('report')) {
            return `Status Data:<br>• Slot 1: <strong>${parkingState.slot1}</strong><br>• Slot 2: <strong>${parkingState.slot2}</strong>.`;
        } else if (query.includes('clear') || query.includes('bersih')) {
            setTimeout(() => { document.getElementById('chat-history').innerHTML = ''; }, 800);
            return "Membersihkan cache obrolan...";
        } else {
            return "Perintah tidak terdeteksi di database. Coba ketik: <em>'cek slot kosong'</em> atau <em>'status'</em>.";
        }
    }
});