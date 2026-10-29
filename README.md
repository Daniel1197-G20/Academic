# Studora

**Studora** is an all-in-one academic intelligence and peer-to-peer tutoring ecosystem designed for students and educators. It unifies precision CGPA tracking, AI study planning, structured tutoring sessions, real-time messaging, and high-fidelity 1-on-1 audio/video calling.

---

## Key Features

### 🎓 Academic Performance & CGPA Engine
- Support for 5.0 and 4.0 grading scales with honors classification (First Class, Upper Credit, Magna Cum Laude, etc.).
- Semester-by-semester course management, quality points computation, and target GPA projection models.

### 📅 AI Study Planner & Streak Tracking
- Personalized routine builder broken down into active execution milestones.
- Topic progress tracking, study hour aggregation, and daily study streak calculations.

### 👨‍🏫 Peer-to-Peer Tutor Marketplace
- Search and discovery for verified peer tutors and subject experts.
- Secure session bookings with platform commission splits and automated Paystack financial settlement.

### 💬 Real-Time Messaging & Direct Communication (GetStream Chat)
- Authenticated, end-to-end synchronized chat powered by GetStream Chat.
- Automatic channel creation for student-tutor bookings and peer-to-peer direct conversations.
- Smart user discovery engine with name and keyword ranking.

### 📞 1-on-1 Voice & Video Calling (GetStream Video & ZEGOCLOUD)
- **GetStream Video SDK Integration**: Direct 1-on-1 voice and video dialing straight from chat conversations with camera/mic controls, connection states, and responsive layouts.
- **ZEGOCLOUD Tutoring Classrooms**: Dedicated classroom spaces preserved for scheduled tutor bookings.

### 💳 Subscriptions & Paystack Payments
- Tiered subscription plans (Basic, Student, Pro, Premium) enforced via server-side entitlement checks.
- Webhook signature validation, idempotent payment processing, and bank payout transfers.

---

## Architecture & Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Chart.js.
- **Communication & Media**:
  - `@stream-io/video-react-sdk` & `stream-chat` (GetStream Chat & Video)
  - `@zegocloud/zego-uikit-prebuilt` (ZEGOCLOUD tutoring calls)
- **Backend Services**: Node.js HTTP API, Supabase (PostgreSQL with Row-Level Security), PGlite for isolated testing.
- **Payments**: Paystack API (Subunit kobo transactions, webhooks, transfer recipients).

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Environment Setup
Create a `.env` file in the root directory based on `.env.example`:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# GetStream
VITE_STREAM_API_KEY=your_stream_api_key
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret

# ZEGOCLOUD
VITE_ZEGOCLOUD_APP_ID=your_zego_app_id
ZEGOCLOUD_SERVER_SECRET=your_zego_server_secret

# Paystack
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

### 3. Installation
```bash
npm install
```

### 4. Running the Application
```bash
# Start frontend development server
npm run dev

# Run comprehensive test suite
node server/test-suite.js

# Build for production
npm run build
```

---

## License
Private & Proprietary — Studora.
