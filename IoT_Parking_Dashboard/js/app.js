document.addEventListener("DOMContentLoaded", () => {

  // KONFIGURASI GEMINI API (PENTING!)
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

  // --- 1. STATE MANAGEMENT ---
  const parkingState = { slot1: "KOSONG", slot2: "KOSONG" };

  // --- 2. INISIALISASI CHART.JS DENGAN GRADIENT ---
  const canvas = document.getElementById("densityChart");
  const ctx = canvas.getContext("2d");

  let gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, "rgba(0, 230, 118, 0.4)");
  gradient.addColorStop(1, "rgba(0, 230, 118, 0.0)");

  const dummyData = Array.from({ length: 11 }, () =>
    Math.floor(Math.random() * 100),
  );

  new Chart(ctx, {
    type: "line",
    data: {
      labels: [
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
      ],
      datasets: [
        {
          data: dummyData,
          borderColor: "#00e676",
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#050b14",
          pointBorderColor: "#00e676",
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: "rgba(255,255,255,0.03)" },
          ticks: { color: "#64748b" },
        },
        x: {
          grid: { color: "rgba(255,255,255,0.03)" },
          ticks: { color: "#64748b" },
        },
      },
    },
  });

  // --- 3. MQTT CONNECTION LOGIC ---
  const mqttClient = new Paho.MQTT.Client(
    "broker.hivemq.com",
    8000,
    "/mqtt",
    "WebClient_" + Math.random().toString(16).substr(2, 8),
  );

  mqttClient.onConnectionLost = function () {
    document.getElementById("mqtt-indicator").className = "status-badge";
    document.getElementById("mqtt-text").innerText = "Disconnected";
  };

  mqttClient.onMessageArrived = function (message) {
    const topic = message.destinationName;
    const payload = message.payloadString.trim().toUpperCase();

    if (topic === "uas/tubagus/slot1") {
      parkingState.slot1 = payload === "1" ? "TERISI" : payload;
      updateSlotUI("card-slot1", "status-slot1", parkingState.slot1);
    } else if (topic === "uas/tubagus/slot2") {
      parkingState.slot2 = payload === "1" ? "TERISI" : payload;
      updateSlotUI("card-slot2", "status-slot2", parkingState.slot2);
    } else if (topic === "uas/tubagus/gate") {
      appendLog(message.payloadString);

      // Panggil sapaan dinamis Gemini setiap ada sinyal masuk gerbang
      generateDynamicWelcome();
    }
  };

  mqttClient.connect({
    timeout: 3,
    useSSL: false,
    onSuccess: function () {
      document.getElementById("mqtt-indicator").className =
        "status-badge connected";
      document.getElementById("mqtt-text").innerText = "Connected";
      mqttClient.subscribe("uas/tubagus/slot1");
      mqttClient.subscribe("uas/tubagus/slot2");
      mqttClient.subscribe("uas/tubagus/gate");
    },
  });

  // --- 4. HELPER FUNCTIONS ---
  function updateSlotUI(cardId, textId, status) {
    const card = document.getElementById(cardId);
    const textEl = document.getElementById(textId);
    if (status === "TERISI") {
      card.className = "glass-panel slot-card terisi";
      textEl.innerText = "TERISI";
    } else {
      card.className = "glass-panel slot-card kosong";
      textEl.innerText = "KOSONG";
    }
  }

    function appendLog(text) {
      const list = document.getElementById("log-list");
      const time = new Date().toTimeString().split(" ")[0];
      const li = document.createElement("li");
      li.className = "log-item";
      li.innerHTML = `<span class="log-time"><i class="fa-solid fa-clock"></i> ${time}</span> ${text}`;
      list.appendChild(li);
      list.scrollTop = list.scrollHeight;
    }

 
  // 5. FITUR: AI DYNAMIC WELCOME NOTIFICATION

  async function generateDynamicWelcome() {
    try {
      // Prompt di-update biar AI-nya lebih "nurut" dan nggak ngasih list
      const promptText =
        "Berikan HANYA SATU kalimat sapaan ramah dan kasual (maksimal 15 kata) untuk pengunjung yang baru masuk gerbang parkir. Dilarang memberikan pilihan, dilarang menggunakan nomor, dan dilarang memberikan teks pengantar. Langsung output 1 kalimat sapaan akhirnya saja.";

      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });

      const data = await response.json();

      // Bersihin sisa-sisa karakter aneh (kayak tanda bintang atau kutip) dari AI
      let sapaan = data.candidates[0].content.parts[0].text;
      sapaan = sapaan.replace(/["*]/g, "").trim();

      showToast(sapaan);
    } catch (error) {
      console.error("Gagal generate sapaan AI:", error);
      showToast("Akses dibuka! Selamat datang di area parkir.");
    }
  }

  function showToast(message) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<i class="fa-solid fa-car-on" style="color: var(--emerald); font-size: 1.2rem;"></i> <div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  // 6. FITUR: SMART PARKING ASSISTANT (CHATBOT)

  const chatInput = document.getElementById("chat-input");
  const btnSend = document.getElementById("btn-send");

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserChat();
  });
  btnSend.addEventListener("click", handleUserChat);

  async function handleUserChat() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Tampilkan pesan user
    addChatBubble(text, "user");
    chatInput.value = "";

    // Munculkan indikator typing
    const typingInd = document.getElementById("typing-indicator");
    typingInd.style.display = "block";

    // Panggil API Gemini
    const replyText = await processAIWithGemini(text);

    // Sembunyikan indikator typing & tampilkan jawaban AI
    typingInd.style.display = "none";
    addChatBubble(replyText, "ai");
  }

  function addChatBubble(text, sender) {
    const history = document.getElementById("chat-history");
    const div = document.createElement("div");
    div.className = `chat-bubble ${sender}`;

    const formattedText = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    if (sender === "ai") {
      div.innerHTML = `
                <div class="avatar"><i class="fa-solid fa-microchip"></i></div>
                <div class="message"><strong>Gemini Assistant:</strong><br>${formattedText}</div>`;
    } else {
      div.innerHTML = `
                <div class="avatar"><i class="fa-solid fa-user"></i></div>
                <div class="message">${formattedText}</div>`;
    }

    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
  }

  async function processAIWithGemini(userText) {
    const systemPrompt = `
            Kamu adalah asisten admin parkir cerdas bernama Gemini. 
            Jawab dengan singkat, padat, dan bahasa Indonesia kasual yang natural (sehari-hari).
            Berikut adalah data real-time ketersediaan slot parkir saat ini:
            - Slot 1: ${parkingState.slot1}
            - Slot 2: ${parkingState.slot2}
            
            Pertanyaan User: ${userText}
        `;

    try {
      const response = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
        }),
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
      console.error("Error panggil Gemini:", error);
      return "Waduh, koneksi ke server AI lagi gangguan nih bro. Coba cek internet atau API Key lu ya.";
    }
  }
});
