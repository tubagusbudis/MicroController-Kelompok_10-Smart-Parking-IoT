#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>
#include <Wire.h>

// --- PIN MAPPING WEMOS D1 R32 ---
// RFID MFRC522
#define SS_PIN 5     // Pin SS
#define RST_PIN 4    // Pin IO4 (Kiri)
#define MOSI_PIN 23  // Pin MOSI
#define MISO_PIN 19  // Pin MISO
#define SCK_PIN 18   // Pin SCK

// SERVO & SENSOR (Deretan kanan board)
#define SERVO_PIN 12 // IO12
#define TRIG_1 13    // IO13
#define ECHO_1 14    // IO14
#define TRIG_2 27    // IO27
#define ECHO_2 16    // IO16
#define LED_RED 25   // IO25
#define LED_GREEN 26 // IO26

// --- OBJEK & VARIABEL GLOBAL ---
MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2); // Alamat I2C umum: 0x27 atau 0x3F
Servo gateServo;

// ⚠️ GANTI PAKE WIFI ASLI LU! ⚠️
const char* ssid = "ENO";
const char* password = "ESA12345";
const char* mqtt_server = "broker.hivemq.com";

const char* topic_slot1 = "uas/tubagus/slot1";
const char* topic_slot2 = "uas/tubagus/slot2";
const char* topic_gate = "uas/tubagus/gate";

WiFiClient espClient;
PubSubClient mqttClient(espClient);

int slotTersedia = 2; 

void TaskGateControl(void *pvParameters);
void TaskParkingSlots(void *pvParameters);
void reconnectMQTT();

void setup() {
  Serial.begin(115200);

  pinMode(TRIG_1, OUTPUT);
  pinMode(ECHO_1, INPUT);
  pinMode(TRIG_2, OUTPUT);
  pinMode(ECHO_2, INPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);

  // Setup I2C untuk LCD 
  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Sistem Parkir");

  // Setup SPI untuk RFID
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();

  // Koneksi WiFi 
  WiFi.begin(ssid, password);
  Serial.print("Konek ke WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  mqttClient.setServer(mqtt_server, 1883);
  lcd.clear();

  xTaskCreatePinnedToCore(TaskGateControl, "GateTask", 4096, NULL, 2, NULL, 0);
  xTaskCreatePinnedToCore(TaskParkingSlots, "SlotTask", 4096, NULL, 1, NULL, 1);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();
  vTaskDelay(pdMS_TO_TICKS(50)); 
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Mencoba konek ke MQTT...");
    String clientId = "ESP32Real-";
    clientId += String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("Berhasil Terhubung!");
      mqttClient.publish(topic_gate, "Hardware ESP32 Online!");
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(mqttClient.state());
      vTaskDelay(pdMS_TO_TICKS(5000));
    }
  }
}

// ---- TASK 1: KONTROL GERBANG & RFID ----
void TaskGateControl(void *pvParameters) {
  for (;;) {
    lcd.setCursor(0, 0);
    lcd.print("Sisa Slot: ");
    lcd.print(slotTersedia);
    lcd.print(" "); 

    lcd.setCursor(0, 1);
    if (slotTersedia > 0) {
      lcd.print("Silakan Tap Kartu");
    } else {
      lcd.print("Parkir Penuh!    ");
    }

    if (slotTersedia > 0 && rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
      Serial.println("Akses Diterima! Buka Gerbang...");
      lcd.setCursor(0, 1);
      lcd.print("Akses Diterima!  ");
      
      String uidStr = "";
      for (byte i = 0; i < rfid.uid.size; i++) {
        uidStr += String(rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
        uidStr += String(rfid.uid.uidByte[i], HEX);
      }
      uidStr.toUpperCase();
      
      String logPesan = "Kendaraan Masuk. UID:" + uidStr;
      mqttClient.publish(topic_gate, logPesan.c_str());
      
      gateServo.attach(SERVO_PIN); 
      gateServo.write(90);             
      vTaskDelay(pdMS_TO_TICKS(3000)); 
      gateServo.write(0);              
      vTaskDelay(pdMS_TO_TICKS(500));  
      gateServo.detach();              
      
      rfid.PICC_HaltA(); 
    }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

// ---- TASK 2: MONITORING SENSOR SLOT ----
void TaskParkingSlots(void *pvParameters) {
  bool statusSlot1Terakhir = false; 
  bool statusSlot2Terakhir = false;

  for (;;) {
    auto bacaJarak = [](int trig, int echo) -> float {
      digitalWrite(trig, LOW);
      delayMicroseconds(2);
      digitalWrite(trig, HIGH);
      delayMicroseconds(10);
      digitalWrite(trig, LOW);
      float duration = pulseIn(echo, HIGH, 30000); 
      return (duration * 0.0343) / 2;
    };

    float jarak1 = bacaJarak(TRIG_1, ECHO_1);
    float jarak2 = bacaJarak(TRIG_2, ECHO_2);

    bool slot1Terisi = (jarak1 > 0 && jarak1 < 10);
    bool slot2Terisi = (jarak2 > 0 && jarak2 < 10);

    if (slot1Terisi != statusSlot1Terakhir) {
      mqttClient.publish(topic_slot1, slot1Terisi ? "TERISI" : "KOSONG");
      statusSlot1Terakhir = slot1Terisi;
    }

    if (slot2Terisi != statusSlot2Terakhir) {
      mqttClient.publish(topic_slot2, slot2Terisi ? "TERISI" : "KOSONG");
      statusSlot2Terakhir = slot2Terisi;
    }

    int slotKosong = 2;
    if (slot1Terisi) slotKosong--;
    if (slot2Terisi) slotKosong--;
    slotTersedia = slotKosong;

    if (slotTersedia == 0) {
      digitalWrite(LED_RED, HIGH);
      digitalWrite(LED_GREEN, LOW);
    } else {
      digitalWrite(LED_RED, LOW);
      digitalWrite(LED_GREEN, HIGH);
    }

    vTaskDelay(pdMS_TO_TICKS(500)); 
  }
}