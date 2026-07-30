# PROJECT REPORT: Karachi Complaint Portal (KCP)

### 1. Introduction

The modern urban landscape requires robust channels of communication between municipal authorities and the citizens they serve. Traditional methods of civic reporting are often encumbered by bureaucratic delays, lack of transparency, and poor tracking mechanisms. This project introduces a comprehensive, mobile-first Karachi Complaint Portal (KCP) designed to bridge the gap between residents and city management. By empowering citizens to report infrastructural issues in real-time and gamifying their civic participation through an integrated rewards system, the application fosters a proactive community culture.

The core problem this application addresses is the decentralization of civic complaints and the historical apathy towards public infrastructure maintenance. The target audience includes everyday citizens, municipal workers, and local business partners who participate in the reward ecosystem. 

**Primary Technology Stack:**
- **Front-end Framework:** React Native (version 0.84.1) utilizing JavaScript for cross-platform iOS and Android deployment.
- **State Management:** React Context API natively integrated with a multi-provider architecture (AppContext, AuthContext, LanguageContext, NetworkContext).
- **Back-end & API Services:** Firebase Cloud Infrastructure, integrating Firestore for NoSQL document storage, Firebase Auth for user identity, and Firebase Storage for multimedia assets.
- **Local Storage & Caching:** AsyncStorage for offline persistence of localization settings, user preferences, and caching partial states.
- **Mapping & Geolocation:** `@react-native-community/geolocation` paired with Leaflet/React Native WebView integration for high-performance spatial rendering.

### 2. Executive Summary & Core Objectives

The primary objective of this application is to digitize and streamline the reporting of urban issues—such as potholes, water leaks, and electricity outages—while simultaneously tracking user engagement to reward proactive civic behavior. The application achieves this through an intuitive, localized interface (supporting Urdu, English, and other regional languages) that ensures inclusivity.

**Scope of the Project:**
- Real-time geolocation-based reporting of municipal issues.
- An interactive map overlay displaying regional complaints to prevent duplicate reporting and increase transparency.
- A gamified civic scoring system that awards "Civic Points" and "Badges" based on the volume and validity of user reports.
- A digital marketplace/reward portal where citizens can exchange their earned points for tangible discounts and services from partnered local businesses.

**Limitations:**
- Hardware-dependent accuracy: The precision of issue reporting relies heavily on the quality of the device's GPS hardware.
- Connectivity dependencies: While offline caching is implemented, real-time synchronization requires an active internet connection.

### 3. Screen-by-Screen Feature Breakdown & Underlying Mechanics

* **Screen:** NakshaScreen (Interactive Map & Reporting Dashboard)
  - **Feature:** Spatial Complaint Mapping - Renders a dynamic, zoomable map displaying ongoing issues within the user's vicinity.
  - **Underlying Mechanism:** Upon component mount, the screen queries the `Geolocation` module to fetch the user's current coordinates. It triggers a listener to Firestore via the `AppContext` which retrieves documents from the `complaints` collection within a specific radius. These coordinates are passed to a `LeafletMap` component rendered inside a WebView bridge. Custom map markers are generated dynamically based on the category of the issue (e.g., Water, Electricity).

  - **Feature:** Quick Issue Submission - Allows users to drop a pin, capture an image, and submit a new complaint.
  - **Underlying Mechanism:** The UI captures touch events on the map to set state for new issue coordinates. When the user initiates a capture, `react-native-image-picker` interacts with the native camera API. The resulting image is compressed and passed to the Firebase Storage SDK. Upon a successful upload, a download URL is generated and appended to a JSON payload containing metadata (timestamp, category, description, user ID, geolocation object). This payload is committed to Firestore. 

* **Screen:** MeraAccountScreen (User Profile & Analytics)
  - **Feature:** Dynamic Radar Chart & Badge Display - Visualizes the user's civic engagement across multiple categories (e.g., Environment, Traffic, Utility) and displays earned achievements.
  - **Underlying Mechanism:** A custom SVG-based `<RadarChart>` component computes trigonometric coordinates (sine/cosine functions) based on the user's stored metrics in the `users` Firestore collection. The component utilizes absolute positioning to overlay localized SVG text nodes dynamically. Badges are processed through a custom hook (`useBadges`) which compares the user's total reports against predefined threshold integers to unlock boolean flags in the state.

* **Screen:** InaamScreen (Rewards & Voucher Redemption)
  - **Feature:** Partner Discount Marketplace - A catalog of brand partners offering discounts in exchange for civic points.
  - **Underlying Mechanism:** This screen fetches a localized dictionary of partners (e.g., 'Foodpanda', 'KFC', 'K-Electric') and iterates through available discount tiers. When a user requests a voucher, the local state verifies their point balance. A transaction is initiated: `User Profile Controller` deducts the points, and a unique cryptographic string (voucher code) is generated and appended to the user's local and remote `redeemedVouchers` array.

* **Screen:** ShikayatScreen (Complaint Ledger)
  - **Feature:** Historical Tracking & Status Updates - A paginated list of all complaints submitted by the user with real-time status indicators (Pending, In Progress, Resolved).
  - **Underlying Mechanism:** A `FlatList` component is bound to a real-time snapshot listener attached to the Firestore `complaints` collection, queried where `userId == currentAuthId`. When an administrator updates a ticket status in the database backend, the snapshot triggers a delta update. The UI reconciles this change, updates the color-coded status badge, and invokes the `LayoutAnimation` API to smoothly transition the card's visual state.

* **Screen:** TopShehriScreen (Community Leaderboard)
  - **Feature:** Ranked Civic Engagement - Displays the top contributors within the city or specific district.
  - **Underlying Mechanism:** Performs an indexed, descending query on the `users` collection sorting by `totalPoints`. The query is limited to the top 50 nodes to optimize read operations. The UI renders this data in an optimized `FlatList`, utilizing memorized list items to prevent re-renders when scrolling.

### 4. End-to-End Application Flow & Data Architecture

The architecture follows a strict unidirectional data flow, ensuring state predictability.

**Flow 1: Submitting a Civic Complaint**
[User Action on UI: Presses "Report Issue" & Captures Photo] ➔ [State Management: Updates Local Form State & Triggers Validation] ➔ [Hardware Interface: Camera Module captures base64/URI] ➔ [Network Request: Firebase Storage SDK uploads image buffer] ➔ [Response: Returns Secure Download URL] ➔ [Controller: Constructs Payload (Location, Text, Image URL, User ID)] ➔ [Database Query: `firestore().collection('complaints').add(payload)`] ➔ [State Update: AppContext triggers listener and pushes new item to local array] ➔ [UI Re-render: Map updates with a new marker, Notification Toast presented].

**Flow 2: Redeeming a Reward**
[User Action on UI: Selects "Rs. 500 Voucher" on InaamScreen] ➔ [Event Handler: Validates Local Point Balance >= Cost] ➔ [Controller: Initiates Batched Database Write] ➔ [Database Mutation: Decrements points in `users` document AND adds transaction record to `vouchers` sub-collection] ➔ [Response JSON: Success Confirmation] ➔ [State Management: Updates `AuthContext` user object with new balance] ➔ [UI Re-render: Point counter decrements with animation, Modal displays unique voucher code to user].

### 5. Module & Functional Breakdown

The codebase is strictly modularized to separate concerns across UI, State, Services, and Utilities.

* **`/context` (State Management Layer)**
  * `AppContext.js`: 
    - **Functional Purpose:** Acts as the central repository for the application's core operational data (complaints, categories, system settings).
    - **Inputs & Outputs:** Accepts database snapshots; outputs global arrays and mutation functions (e.g., `addComplaint`, `updateIssueStatus`).
  * `AuthContext.js`: 
    - **Functional Purpose:** Manages user authentication state, session persistence, and point balances.
    - **Inputs & Outputs:** Accepts credentials (email/password/OAuth tokens); outputs serialized user objects, loading booleans, and session handlers (`login`, `logout`).
  * `LanguageContext.js`:
    - **Functional Purpose:** Handles real-time localization and text directionality (RTL for Urdu, LTR for English).
    - **Inputs & Outputs:** Accepts language string codes ('en', 'ur'); outputs active dictionaries and a highly optimized `t()` translation function.

* **`/services` (Integration Layer)**
  * `NotificationService.js`:
    - **Functional Purpose:** Manages device-level permissions and orchestrates local and push notifications.
    - **Inputs & Outputs:** Accepts notification payloads (Title, Body, Data); outputs OS-level interrupt signals and background data handling callbacks.

* **`/components/main` (Reusable UI Elements)**
  * `LeafletMap.js`:
    - **Functional Purpose:** Bridges the React Native environment with a web-based Leaflet mapping engine via WebView.
    - **Inputs & Outputs:** Accepts arrays of marker coordinates and current viewport boundaries; outputs injected JavaScript commands to update the DOM of the map layer.

### 6. Data Management & Lifecycle

The application employs a hybrid data management strategy to ensure responsiveness even under poor network conditions.

- **Global State Synchronization:** The application heavily utilizes Firebase's `onSnapshot` listeners. This ensures that the global state in `AppContext` and `AuthContext` represents a near-instantaneous reflection of the remote database. By attaching listeners at the root level of the application hierarchy, any mutation on the remote database triggers a reactive re-render of dependent UI components.
- **Local Persistence & Caching:** `AsyncStorage` acts as the first line of defense. User preferences (Theme, Language) are synchronously read from local storage before the main React tree mounts, preventing UI flickering. Furthermore, a local cache mechanism intercepts read requests for static assets (like partner logos) to minimize network overhead.
- **Offline Reliability:** Network connectivity is monitored via `@react-native-community/netinfo`. When a user transitions to an offline state (`NetworkContext.isOnline === false`), outgoing POST/PUT requests (like new complaints) are serialized and pushed to a local queue. A background sync function periodically checks connectivity and flushes this queue to the remote server once the connection is restored.

### 7. Security Architecture & Native Permissions Modeling

To ensure the integrity of the data ecosystem and the privacy of individual citizens, the application implements a strict, multi-layered security and permissions architecture. Given the sensitive nature of geospatial data, privacy is treated as a paramount architectural constraint.

- **Role-Based Access Control (RBAC) via Firebase Security Rules:** At the database layer, Firestore relies on rigorous security rules. Read and write operations on the `users` collection are restricted such that a standard user can only mutate their own document payload. Access to the `complaints` collection allows universal read access (to facilitate the public map view), but write operations strictly require a valid, non-expired Firebase Authentication token. Malformed data payloads are rejected natively at the database level by enforcing schema validation within the security rules, checking for required fields like `geolocation.lat` and `category`.
- **Runtime Native Hardware Permissions:** Rather than front-loading permission requests during the initial splash screen—which often leads to user friction—the application utilizes Just-In-Time (JIT) permission requests. The `Camera` and `Location` permissions are only requested at the exact moment a user attempts to file a complaint or access the map. If a user permanently denies location permissions, the app gracefully degrades, prompting them to manually select a generalized area rather than throwing fatal exceptions.
- **Data Anonymization Protocol:** When rendering the global map on the `NakshaScreen`, specific coordinates are intentionally obfuscated by a small, randomized margin. This microscopic offset prevents malicious actors from tracking the precise geolocation of an individual submitting a complaint, effectively balancing the requirement for public transparency with absolute user privacy.

### 8. Conclusion

This Karachi Complaint Portal (KCP) represents a highly sophisticated integration of geospatial tracking, gamified user retention mechanisms, and real-time database architecture. By abstracting the complex backend synchronization into intuitive, language-accessible UI screens, the application lowers the barrier to entry for civic participation. 

The modular architecture ensures high maintainability. The decoupling of state providers allows for seamless horizontal scaling, such as introducing new reward partners or new reporting categories without extensive refactoring. Future enhancements could include integrating machine learning for automated image classification of reported issues, or predictive analytics to help municipal bodies preemptively allocate maintenance resources based on historical complaint heatmaps.

---

## APPENDIX: SUPPLEMENTARY TECHNICAL REFERENCE (BACKUP MATERIAL)

### A. Advanced State Transitions & Boundary Conditions

To guarantee application stability, several critical boundary conditions and failure states have been mapped and handled algorithmically.

**Offline Action & Queue Recovery Flow:**
[Network Drops: `NetInfo` broadcasts offline state] ➔ [User Action: Submits Complaint] ➔ [Event Handler: Detects offline flag] ➔ [Local Cache Storage: Serializes form payload via `JSON.stringify` and pushes to `AsyncStorage` 'offline_queue'] ➔ [UI Re-render: Displays "Saved Offline" toast to user] ➔ [Connection Restored Event: `NetInfo` detects active connection] ➔ [Background Sync Service: Iterates over 'offline_queue'] ➔ [Remote Server Sync: Executes batched write to Firestore] ➔ [Cleanup: Purges successfully synced items from `AsyncStorage`].

**Authentication Token Expiry Flow:**
[Background Process: Firebase Auth detects token expiration] ➔ [Network Request: Attempts automatic silent token refresh] ➔ [Failure State: Refresh token is invalid/revoked] ➔ [AuthContext Intercept: Listener receives null user object] ➔ [State Management: Clears local session variables] ➔ [Navigation Layer: `AuthNavigator` aggressively unmounts `MainTabNavigator`] ➔ [UI State: Forces user back to `LoginScreen` with a localized session expiry alert].

**Geospatial Error Handling:**
[User Action: Opens Map Screen] ➔ [Hardware Interface: Requests GPS coordinates] ➔ [Failure State: GPS disabled or permission denied] ➔ [Fallback Mechanism: Appets to fetch approximate location via IP address utilizing a secondary API] ➔ [UI Re-render: Renders map at fallback coordinates with a persistent warning banner advising the user to enable high-accuracy GPS].

### B. Micro-Function Directory

This section details critical utility functions embedded within the application's hooks and context providers, essential for the platform's core mechanics.

* `calculateDistance(lat1, lon1, lat2, lon2)` (Location Utility):
  - **Purpose:** Implements the Haversine formula to determine the great-circle distance between two points on a sphere.
  - **Inputs:** Two sets of latitude/longitude coordinates (floats).
  - **Outputs:** Distance in kilometers (float). Used extensively to filter complaints within a user's local radius.

* `useBadges()` (Custom Hook):
  - **Purpose:** An algorithmic evaluator that parses a user's raw statistical data to determine unlockable achievements.
  - **Logic:** Evaluates conditions such as `reportsSubmitted >= 10` for a "Bronze Reporter" badge, or `consecutiveDaysActive >= 7` for a "Streak" badge.
  - **Outputs:** An array of structured badge objects containing identifiers, localized titles, and boolean unlock states.

* `processImageBuffer(uri)` (Image Utility):
  - **Purpose:** Optimizes user-captured images before network transmission to save bandwidth and storage costs.
  - **Logic:** Reads the local file URI, resizes the image to a maximum dimension of 1024x1024 while maintaining aspect ratio, and applies an 80% JPEG compression algorithm.
  - **Outputs:** A new local file URI pointing to the optimized image buffer, ready for upload.

* `parseLocalizedDate(timestamp, locale)` (Formatting Utility):
  - **Purpose:** Standardizes date strings across the platform based on the user's selected language.
  - **Logic:** Ingests a Firebase Timestamp object, converts it to a native JS Date, and utilizes `Intl.DateTimeFormat` configured with the provided locale string (e.g., 'ur-PK' or 'en-US').
  - **Outputs:** A human-readable, culturally formatted date string (e.g., "15 اگست 2026").

* `generateVoucherHash(userId, timestamp)` (Cryptography Utility):
  - **Purpose:** Creates unique, collision-resistant codes for the reward marketplace.
  - **Logic:** Concatenates the user ID, current timestamp, and a server-side salt, passing the string through an SHA-256 hashing function, then truncating to the first 8 alphanumeric characters.
  - **Outputs:** An 8-character string (e.g., "A8B29F4X") to be presented at partner locations.

### C. Advanced Performance Optimization Techniques

Maintaining a smooth 60 frames-per-second (FPS) UI response rate is critical, particularly on lower-end Android devices which may be prevalent among the target demographic. The KCP platform incorporates multiple structural optimizations to achieve fluid rendering and minimal battery consumption.

- **FlatList Prop Tuning & Memorization:** Complex lists, such as the leaderboard (`TopShehriScreen`) and the complaint ledger (`ShikayatScreen`), bypass the default React Native render cycle. They rely on tightly tuned `FlatList` properties including `initialNumToRender`, `maxToRenderPerBatch`, and `windowSize`. By pairing these properties with `React.memo` for the individual list items, the application explicitly halts re-rendering unless the exact scalar values associated with a list item are mutated by the remote database. This virtually eliminates dropped frames during rapid, continuous scrolling.
- **Image Caching & Deferred Loading:** The platform minimizes active memory load by aggressively caching images using libraries designed for immediate visual rendering. When viewing high-resolution complaint attachments, the application loads a low-fidelity base64 placeholder (stored locally in `AsyncStorage`) instantly, while the primary asset is retrieved asynchronously over the network. Once fully loaded, the high-fidelity image replaces the placeholder via a localized fade-in animation, preventing layout shifts.
- **Asynchronous Component Mounting:** To minimize the Time To Interactive (TTI) metric upon initial launch, heavy components such as the Leaflet mapping engine are lazily loaded. The WebView module responsible for rendering the map is deferred until the primary UI thread completes rendering the overlay elements (navigation headers, floating action buttons). This sequential mounting strategy prevents thread blocking, ensuring the user immediately perceives a responsive application.
