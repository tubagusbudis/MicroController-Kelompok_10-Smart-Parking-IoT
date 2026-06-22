# Smart Parking IoT + Web Dashboard

Project IoT Smart Parking System berbasis ESP32 dengan integrasi Web Dashboard, FreeRTOS Multitasking, Keamanan RFID, dan Analisis Data menggunakan Machine Learning. Proyek ini dirancang sebagai pemenuhan Tugas Akhir Semester (UAS) mata kuliah Sistem Mikrokontroler.

## 📌 Deskripsi Proyek
Sistem ini memodernisasi manajemen parkir konvensional menggunakan IoT. Pengendara melakukan autentikasi di gerbang masuk menggunakan kartu RFID. Setelah lolos verifikasi, palang pintu otomatis akan terbuka. Di dalam area parkir, sistem memantau ketersediaan slot secara *real-time* menggunakan sensor ultrasonik dan langsung mengirimkan datanya ke dashboard web/mobile via protokol MQTT. Data yang terkumpul dianalisis menggunakan Machine Learning untuk memprediksi jam-jam padat parkir.

---

## 🚀 Fitur Utama
* **Real-time Slot Detection:** Mendeteksi kekosongan slot parkir secara akurat menggunakan sensor ultrasonik.
* **Dual Dashboard Monitoring:** Data ketersediaan slot dapat dipantau langsung melalui platform Web dan Mobile.
* **RFID Authentication:** Akses masuk aman menggunakan gerbang otomatis berbasis e-KTM atau Tag RFID.
* **FreeRTOS Multitasking:** Sistem berjalan responsif tanpa *delay* berkat manajemen *task* simultan pada ESP32.
* **Encrypted HTTP Data:** Transmisi data aman dari perangkat ke server dashboard.
* **AI/ML Parking Analytics:** Fitur tambahan berupa prediksi jam parkir penuh dan analisis pola penggunaan lahan parkir.

---

## 🛠️ Komponen & Perangkat Keras (Prototype 2 Slot)
Berikut adalah daftar komponen yang digunakan untuk membangun *prototype* sistem ini:

### 1. Input & Sensor
* **1x** ESP32 NodeMCU Development Board (Otak Utama)
* **2x** Sensor Ultrasonik HC-SR04 (Pendeteksi Mobil di Slot 1 & 2)
* **1x** Modul RFID Reader MFRC522 (Autentikasi Gerbang Masuk)
* **1x** Kartu / Tag RFID (Akses Valid & Invalid)

### 2. Output & Indikator
* **1x** Motor Servo SG90 / MG996R (Penggerak Palang Pintu)
* **1x** LCD Display 16x2 + Modul I2C Backpack (Informasi Sisa Slot di Gerbang)
* **1x** Lampu LED Merah (Indikator Slot Penuh)
* **1** Lampu LED Hijau (Indikator Slot Kosong)

### 3. Pendukung
* **2x** Resistor 220 Ohm (Penahan Arus LED)
* **1x** Breadboard Besar (830 Titik)
* **1 Pack** Kabel Jumper (Male-to-Male & Male-to-Female)
* **1x** Kabel USB Data (Power & Upload Program)

---

## 💻 Tech Stack & Teknologi
* **Microcontroller Development:** C++ (Arduino IDE) / FreeRTOS
* **Communication Protocol:** MQTT (Message Queuing Telemetry Transport) & HTTP (Encrypted)
* **Backend & Logic:** Node-RED / Laravel
* **Frontend Visualization:** Chart.js (Untuk grafik *real-time* di Dashboard)
* **Machine Learning:** Python (Scikit-Learn / Pandas) untuk analisis pola data parkir

---

## 🔌 Alur Kerja Sistem (Workflow)
1. **Akses Masuk:** Pengendara melakukan *tap* kartu pada RFID Reader di gerbang masuk.
2. **Validasi:** ESP32 memeriksa data kartu. Jika valid, Motor Servo akan memutar palang pintu untuk terbuka, dan LCD menampilkan status kuota parkir yang tersedia.
3. **Deteksi Slot:** Ketika kendaraan menempati salah satu slot, Sensor Ultrasonik mendeteksi perubahan jarak objek.
4. **Indikator Fisik:** LED pada slot yang terisi akan berubah warna dari Hijau menjadi Merah.
5. **Koneksi Data:** ESP32 mengirim data status slot ke broker MQTT secara *real-time*.
6. **Dashboard:** Dashboard Web/Mobile menangkap data dari MQTT dan memperbarui visualisasi menggunakan Chart.js.
7. **Analisis Data:** Data log parkir dikirim secara berkala ke server untuk diproses oleh model Machine Learning guna memprediksi tren kepadatan parkir.

---

## 👥 Team Members
* **Tubagus Budi Sampurno** — IoT & Embedded Systems Developer (ESP32, Sensor Integration, MQTT, FreeRTOS, RFID)
* **Farhan Permana** — Machine Learning Engineer (Data Analysis, Prediction Model, Scikit-Learn, Analytics)
* **Natalia Margaretha** — Web Developer (Dashboard Development, Backend Integration, Chart.js, UI/UX)
