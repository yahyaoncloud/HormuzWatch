# API Reference

This document outlines the primary REST APIs exposed by the Go Backend.

> **Base URL:** `http://localhost:8080` (Local) / `https://<api-url>` (Prod)
> **Authentication:** Protected endpoints require the `Authorization: Bearer <token>` header.

---

## 1. Authentication

### Register
Register a new user account. Status will default to `pending` until approved by an administrator.

**Endpoint:** `POST /auth/register`  
**Auth Required:** No

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Registration successful. Pending admin approval."
}
```

### Login
Authenticate and obtain a JWT.

**Endpoint:** `POST /auth/login`  
**Auth Required:** No

**Request:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "token": "eyJhbGci...",
  "expiresAt": "2026-06-12T12:00:00Z",
  "sessionId": "uuid-v4",
  "user": {
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### Get Session
Validate the current JWT token and session.

**Endpoint:** `GET /auth/session`  
**Auth Required:** Yes (JWT)

**Response (200 OK):**
```json
{
  "status": "success",
  "sessionId": "uuid-v4",
  "expiresAt": "2026-06-12T12:00:00Z",
  "user": {
    "username": "johndoe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### Logout
Revoke the current session.

**Endpoint:** `POST /auth/logout`  
**Auth Required:** Yes (JWT)

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

## 2. Public Streaming Data

### Top Traces
Get the top 10 most anomalous vessels currently being tracked.

**Endpoint:** `GET /public/top-traces`  
**Auth Required:** No

**Response (200 OK):**
```json
[
  {
    "id": "123456789",
    "name": "EVER GIVEN",
    "lat": 26.5,
    "lon": 56.2,
    "speed": 14.5,
    "heading": 45,
    "score": 85,
    "severity": "critical",
    "lastUpdate": "2026-06-11T19:40:00Z"
  }
]
```

### Server-Sent Events (SSE) Stream
Real-time stream of the top traces. Refreshed every 5 seconds.

**Endpoint:** `GET /public/stream`  
**Auth Required:** No

**Event Output:**
```text
event: traces
data: {"traces": [...], "timestamp": "2026-06-11T19:40:05Z"}
```

---

## 3. Telemetry & Analytics

### Heatmap
Get aggregated geospatial density data for visualization.

**Endpoint:** `GET /heatmap`  
**Auth Required:** Yes (JWT)

**Response (200 OK):**
```json
{
  "type": "heatmap",
  "data": [
    {
      "lat": 26.5,
      "lon": 56.2,
      "intensity": 45,
      "last_updated": "2026-06-11T19:40:00Z"
    }
  ]
}
```

### Track History
Get historical observations for a specific track.

**Endpoint:** `GET /tracks/:id/history`  
**Auth Required:** Yes (JWT)

**Response (200 OK):**
```json
[
  {
    "timestamp": "2026-06-11T19:35:00Z",
    "lat": 26.4,
    "lon": 56.1,
    "speed": 14.2,
    "heading": 45
  }
]
```

---

## 4. Intelligence & Context

### Restricted Zones
Get active geofence definitions.

**Endpoint:** `GET /zones/restricted`  
**Auth Required:** Yes (JWT)

**Response (200 OK):**
```json
[
  {
    "id": "Z1",
    "name": "Strait Traffic Separation Scheme",
    "centerLat": 26.5,
    "centerLon": 56.25,
    "radiusDeg": 0.5
  }
]
```

### News Feed
Aggregated maritime security news from RSS and GDELT.

**Endpoint:** `GET /news`  
**Auth Required:** Yes (JWT)

**Response (200 OK):**
```json
[
  {
    "id": "hash",
    "title": "Naval exercise announced in Gulf of Oman",
    "link": "https://...",
    "pub_date": "2026-06-11T12:00:00Z",
    "source": "Maritime Security Hub"
  }
]
```

---

## 5. WebSocket API

The WebSocket connection upgrades from `GET /ws/stream`. It expects standard JWT validation.

### Server → Client Messages

**Telemetry Push:**
```json
{
  "type": "telemetry",
  "data": {
    "trackId": "123456789",
    "assetName": "CARGO VESSEL",
    "timestamp": "2026-06-11T19:40:00Z",
    "lat": 26.5,
    "lon": 56.2,
    "speed": 14.5,
    "heading": 45
  }
}
```

**Anomaly Push:**
```json
{
  "type": "anomaly",
  "data": {
    "id": "123456789",
    "score": 85,
    "severity": "critical",
    "reasons": ["Course deviation", "Speed drop"],
    "actions": ["Escalate to duty officer"]
  }
}
```
