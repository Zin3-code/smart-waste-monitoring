#ifndef CONFIG_H
#define CONFIG_H

// WIFI
#define WIFI_SSID "AZC BoardingHouse 2.4G"
#define WIFI_PASSWORD "AiahZiahCoco"

// SERVER
#define SERVER_HOST "smart-waste-monitoring-api.onrender.com"
#define SERVER_PORT 80

// DEVICE
#define BIN_ID "BIN-ml5uhmt0-e4ec80ef"
#define DEVICE_ID "ESP32-001"

// ULTRASONIC SENSOR
#define TRIGGER_PIN 5     
#define ECHO_PIN 18
#define MAX_DISTANCE 28
#define BIN_HEIGHT 24

// GSM SIM800L
#define GSM_TX_PIN 17
#define GSM_RX_PIN 16
#define GSM_BAUD_RATE 9600
#define PHONE_NUMBER "+639276270152"

// UPDATE INTERVAL
#define UPDATE_INTERVAL 30000

// STATUS THRESHOLDS
#define NEAR_FULL_THRESHOLD 65
#define FULL_THRESHOLD 85

// LED
#define LED_ONLINE_PIN 2
#define LED_ALERT_PIN 4

// DEBUG
#define DEBUG true

#endif