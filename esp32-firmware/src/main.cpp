#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include "config.h"

HardwareSerial gsmSerial(1);

unsigned long lastUpdateTime = 0;

bool isOnline = false;
int currentFillLevel = 0;
String previousStatus = "empty";

void debugPrint(String msg){
#if DEBUG
  Serial.println(msg);
#endif
}

/* ---------------- WIFI ---------------- */

void setupWiFi(){

  debugPrint("Connecting WiFi...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;

  while(WiFi.status()!=WL_CONNECTED && attempts < 20){
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if(WiFi.status()==WL_CONNECTED){

    isOnline = true;
    digitalWrite(LED_ONLINE_PIN,HIGH);

    debugPrint("\nWiFi connected");
    debugPrint(WiFi.localIP().toString());

  }else{

    isOnline = false;
    digitalWrite(LED_ONLINE_PIN,LOW);

    debugPrint("\nWiFi connection failed");
  }
}

/* ---------------- GSM ---------------- */

void setupGSM(){

  gsmSerial.begin(GSM_BAUD_RATE,SERIAL_8N1,GSM_RX_PIN,GSM_TX_PIN);

  delay(2000);

  gsmSerial.println("AT");
  delay(1000);

  gsmSerial.println("AT+CMGF=1");
  delay(1000);

  debugPrint("GSM Ready");
}

void sendSMS(String message){

  debugPrint("Sending SMS...");

  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(PHONE_NUMBER);
  gsmSerial.println("\"");

  delay(1000);

  gsmSerial.print(message);

  delay(500);

  gsmSerial.write(26);

  delay(3000);

  debugPrint("SMS Sent");
}

/* ---------------- ULTRASONIC ---------------- */

int readDistance(){

  long total = 0;

  for(int i=0;i<5;i++){

    digitalWrite(TRIGGER_PIN,LOW);
    delayMicroseconds(2);

    digitalWrite(TRIGGER_PIN,HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIGGER_PIN,LOW);

    long duration = pulseIn(ECHO_PIN,HIGH,30000);

    int distance = duration * 0.034 / 2;

    if(distance <=0 || distance > MAX_DISTANCE){
      distance = MAX_DISTANCE;
    }

    if(distance > BIN_HEIGHT){
      distance = BIN_HEIGHT;
    }

    total += distance;

    delay(50);
  }

  return total / 5;
}

/* ---------------- FILL LEVEL ---------------- */

int calculateFillLevel(int distance){

  int level = ((BIN_HEIGHT - distance) * 100) / BIN_HEIGHT;

  if(level < 0) level = 0;
  if(level > 100) level = 100;

  return level;
}

String getFillStatus(int level){

  if(level >= FULL_THRESHOLD)
    return "full";

  else if(level >= NEAR_FULL_THRESHOLD)
    return "near-full";

  else if(level >= 50)
    return "medium";

  else if(level >= 25)
    return "low";

  else
    return "empty";
}

/* ---------------- SERVER ---------------- */

void sendUpdateToServer(int distance){

  if(!isOnline){
    debugPrint("Server update skipped (offline)");
    return;
  }

  debugPrint("ESP32 IP: " + WiFi.localIP().toString());
  debugPrint("Server: " + String(SERVER_HOST) + ":" + String(SERVER_PORT));

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;

  String url = "https://";
  url += SERVER_HOST;
  url += "/api/bins/iot/update";

  StaticJsonDocument<200> doc;

  doc["deviceId"] = DEVICE_ID;
  doc["distanceCm"] = distance;

  String payload;
  serializeJson(doc,payload);

  debugPrint("URL: " + url);
  debugPrint("Payload: " + payload);

  http.begin(client, url);
  http.addHeader("Content-Type","application/json");

  int code = http.POST(payload);

  debugPrint("HTTP Code: " + String(code));

  if(code == -1){
    debugPrint("Error: " + http.errorToString(code));
  } 
  else if(code >= 400){
    String response = http.getString();
    debugPrint("Response: " + response);
  }

  http.end();
}

/* ---------------- LED ---------------- */

void updateLEDs(int level){

  if(level >= FULL_THRESHOLD){

    digitalWrite(LED_ALERT_PIN,(millis()/200)%2);

  }else if(level >= NEAR_FULL_THRESHOLD){

    digitalWrite(LED_ALERT_PIN,(millis()/800)%2);

  }else{

    digitalWrite(LED_ALERT_PIN,LOW);
  }
}

/* ---------------- SETUP ---------------- */

void setup(){

  Serial.begin(115200);

  pinMode(TRIGGER_PIN,OUTPUT);
  pinMode(ECHO_PIN,INPUT);

  pinMode(LED_ONLINE_PIN,OUTPUT);
  pinMode(LED_ALERT_PIN,OUTPUT);

  digitalWrite(TRIGGER_PIN,LOW);

  setupWiFi();
  setupGSM();

  debugPrint("System Ready");
}

/* ---------------- LOOP ---------------- */

void loop(){

  int distance = readDistance();

  currentFillLevel = calculateFillLevel(distance);

  updateLEDs(currentFillLevel);

  String status = getFillStatus(currentFillLevel);

  debugPrint("Distance: "+String(distance)+" cm");
  debugPrint("Fill: "+String(currentFillLevel)+"%");
  debugPrint("Status: "+status);

  if(status != previousStatus){

    if(status=="near-full" || status=="full"){

      String msg = "BIN " + String(BIN_ID) +
                   " " + status +
                   " Level: " + String(currentFillLevel) + "%";

      sendSMS(msg);
    }

    previousStatus = status;
  }

  if(millis() - lastUpdateTime > UPDATE_INTERVAL){

    sendUpdateToServer(distance);

    lastUpdateTime = millis();
  }

  if(WiFi.status()!=WL_CONNECTED){

    debugPrint("WiFi lost. Reconnecting...");
    setupWiFi();
  }

  delay(1000);
}