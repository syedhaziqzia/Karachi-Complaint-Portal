# 🏙️ Karachi Complaint Portal

> A React Native mobile application enabling Karachi citizens to report and track civic infrastructure issues with GPS mapping, photo evidence, and real-time updates.

---

## 📱 Features

- **📍 Real-Time Map** — Report and view complaints on an interactive GPS-pinned map (Leaflet.js via WebView)
- **📷 Photo Evidence** — Attach compressed photo evidence to every report
- **🔐 Authentication** — Email/Password, Phone OTP, and Google Sign-In via Firebase Auth
- **🌍 Multilingual** — Full support for English, Urdu (اردو), and Roman Urdu
- **🏆 Gamification** — XP points, citizen ranks & badge reward system
- **🔔 Push Notifications** — Scheduled reminders via Notifee with boot-persistence
- **🌙 Dark / Light Mode** — System-aware theme switching
- **📶 Offline Support** — Firestore offline persistence for low-connectivity areas

---

## 🗂️ Complaint Categories

| Category | Description |
|---|---|
| 🛣️ Road Damage | Potholes, broken roads, pavement issues |
| 🚰 Sewage | Open drains, sewage overflow |
| 🗑️ Waste | Illegal dumping, garbage accumulation |
| 🏗️ Encroachment | Illegal structures on public land |
| ⚡ Kunda (Electricity) | Illegal power connections |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (Android) |
| Backend | Firebase (Serverless) |
| Database | Cloud Firestore (NoSQL) |
| Auth | Firebase Authentication |
| Storage | Firebase Cloud Storage |
| Maps | Leaflet.js via WebView |
| Notifications | Notifee |
| State Management | React Context API |
| Navigation | React Navigation v6 |
| Internationalisation | i18next |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Android Studio + Android SDK
- Java Development Kit (JDK 17)
- React Native CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/KarachiComplaintPortal.git
cd KarachiComplaintPortal

# Install dependencies
npm install
```

### Firebase Setup (Required)

This project uses Firebase. You need to connect your own Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com) → Create a new project
2. Add an Android app with package name `com.firstapp`
3. Download `google-services.json` and place it at `android/app/google-services.json`
4. Enable **Authentication** (Email, Phone, Google)
5. Enable **Firestore Database**
6. Enable **Cloud Storage**

> ⚠️ `google-services.json` is excluded from this repo for security. You must supply your own.

### Running the App

```bash
# Start Metro bundler
npm start

# Run on Android (in a separate terminal)
npm run android
```

---

## 📁 Project Structure

```
KarachiComplaintPortal/
├── src/
│   ├── context/          # AuthContext, AppContext, ThemeContext, etc.
│   ├── screens/
│   │   ├── auth/         # Login, SignUp, ForgotPassword, OTP
│   │   └── main/         # Map, Complaints, Account, Rewards, etc.
│   ├── components/       # Reusable UI components
│   ├── navigation/       # Auth & Main navigators
│   ├── services/         # NotificationService
│   ├── i18n/             # Translations (EN, UR, RU)
│   ├── hooks/            # Custom hooks (useBadges, etc.)
│   ├── theme/            # Colors & design tokens
│   └── utils/            # Validation helpers
├── android/              # Android native project
├── .gitignore
└── package.json
```

---

## 🔐 Security

- No API keys or credentials are hardcoded in source code
- `google-services.json` and `keystore.properties` are excluded via `.gitignore`
- Firebase Security Rules enforce user-scoped read/write access
- Passwords are never stored — handled entirely by Firebase Auth

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.
