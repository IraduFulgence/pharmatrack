Pharmatrack - Digital Pharmacy Management System

Pharmatrack is a comprehensive, multi-tenant digital health coordination platform designed to bridge the gap between patients and pharmacies. It streamlines prescription handling, inventory management, order fulfillment, and pharmacy verification, ensuring patients get the medicine they need safely and efficiently.
📑 Table of Contents

    System Architecture

    User Roles & Modules

    Key Features

    Technology Stack

    Project Structure

    Getting Started

    Environment Variables

    API Documentation

🏗 System Architecture

Pharmatrack is built as a modern, decoupled application:

    Frontend: A Single Page Application (SPA) built with React.js, Vite, and Tailwind CSS.

    Backend: A RESTful API built with NestJS (Node.js framework) and PostgreSQL.

    Authentication: JWT (JSON Web Tokens) based, with Role-Based Access Control (RBAC).

    File Storage: Local disk storage (via Multer) for pharmacy compliance documents.

👥 User Roles & Modules

The system is divided into three distinct user roles, each with their own dedicated dashboard and permissions.
1. 👤 Patient (Client)

Focuses on finding and ordering medicine.

    Registration & Login: Create an account manually or via Google OAuth.

    Profile: Manage personal details (Date of Birth, Gender, Contact).

    Search Medicine: Locate nearby pharmacies that have specific medicines in stock.

    Upload Prescription: Submit a photo/PDF of a doctor's prescription.

    Order Tracking: Track the status of medicine orders (Pending, Ready, Out for Delivery).

2. 🏥 Pharmacy Partner

Focuses on managing inventory, processing orders, and fulfilling prescriptions.

    Registration: Register a pharmacy account with TIN, RDB Certificate, and Pharmacy License.

    Dashboard: Real-time overview of daily stats, low stock alerts, and pending tasks.

    Inventory Management (Core):

        Stock-In: Receive new batches of medicine.

        Adjustments: Record damages, expiries, losses, or physical counts.

        Alerts: System-generated warnings for low stock and expiring batches (FEFO).

        Catalogue: Register new medicines into the global catalogue.

        Reports: Generate valuation and transaction reports (CSV/JSON).

    Prescription Management: Review incoming patient prescriptions and update statuses.

    Order Management: View, process, and assign delivery/pickup statuses for patient orders.

    Settings: Manage pharmacy location (via map), view submitted documents, and track verification status.

3. 🛡 Administrator (System Admin)

Focuses on platform moderation, compliance, and user management.

    Global Dashboard: Monitor total system stats (Total Pharmacies, Pending Approvals, Total Patients).

    Pharmacy Verification: Review submitted documents (License, RDB) to Approve or Reject pharmacy applications.

    Patient Management: View, edit, suspend, or reactivate patient accounts.

    Admin Management: Create and manage other system administrators (Super Admin feature).

    Audit Logs: Track all critical actions performed by system admins.

✨ Key Features

    FEFO Tracking: First-Expired, First-Out logic for inventory batches to prevent dispensing expired medicine.

    Real-time Alerts: Automated notifications for low stock and near-expiry items.

    Document Verification Flow: Secure upload and admin review of legal pharmacy documents before granting system access.

    Responsive UI: Fully responsive dashboards with both Light and Dark modes.

    Multi-Language: (i18n) Support for English, French, and Kinyarwanda.

    Google OAuth: Faster onboarding for patients.

💻 Technology Stack
Frontend

    Framework: React 18 (with Vite)

    Routing: React Router DOM v6

    Styling: Tailwind CSS

    Icons: Lucide React

    Charts: Recharts

    Maps: React Leaflet (OpenStreetMap)

    State/API: Context API + Fetch API

Backend

    Framework: NestJS

    Database: PostgreSQL

    ORM: Raw SQL (via pg pool)

    Auth: Passport-JWT & bcrypt

    File Upload: Multer

    Validation: Class-validator & Class-transformer

📂 Project Structure
text

pharmatrack/
├── backend/                  # NestJS Application
│   ├── src/
│   │   ├── admin/            # Admin controllers & services
│   │   ├── auth/             # Login, Register, JWT strategy
│   │   ├── inventory/        # Medicine, Batches, Alerts, Reports
│   │   ├── sales/           # sales processing
│   │   ├── prescriptions/    # Prescription handling
│   │   ├── upload/           # File upload service (Multer)
│   │   ├── database/         # Database connection service
│   │   └── main.ts           # App entry point
│   └── uploads/              # Local file storage (Pharmacy docs)
│
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # Reusable UI (Navbar, Sidebar, Modals)
│   │   ├── pages/            # Page views
│   │   │   ├── admin/        # Admin dashboard views
│   │   │   ├── dashboard/    # Pharmacy dashboard views
│   │   │   ├── patient/      # Patient views
│   │   │   ├── login.jsx
│   │   │   └── register.jsx
│   │   ├── services/         # API call services (auth, inventory)
│   │   ├── locales/          # i18n translations (en, fr, rw)
│   │   ├── utils/            # Helper functions
│   │   └── App.jsx           # Main Router configuration
│   └── vite.config.js
└── README.md

🚀 Getting Started
Prerequisites

    Node.js (v18 or higher)

    PostgreSQL (v14 or higher)

    npm or yarn

1. Database Setup

Create a PostgreSQL database named pharmatrack_db and run the provided SQL schema file (if available) to create the necessary tables.
2. Backend Setup
bash

cd backend
npm install

Create a .env file in the backend folder:
env

PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/pharmatrack_db
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads

Start the backend:
bash

npm run start:dev

The backend should be running on http://localhost:3000.
3. Frontend Setup

Open a new terminal:
bash

cd frontend
npm install

Create a .env file in the frontend folder:
env

VITE_API_URL=http://localhost:3000/api

Start the frontend:
bash

npm run dev

The frontend should be running on http://localhost:5173.
📡 API Documentation (Swagger)

The backend is fully documented using Swagger. Once the backend is running, navigate to:

http://localhost:3000/api/docs

This interface allows you to view all endpoints, required parameters, and test the APIs directly with authentication.
🔒 Security Features

    Password Hashing: Bcrypt (10 rounds).

    Input Sanitization: DTOs with class-validator to prevent malformed data.

    Role Guards: Backend routes are protected by @Roles('ADMIN'), @Roles('PHARMACY'), etc.

    File Validation: Multer filters ensure only PDF, JPEG, and PNG files are uploaded for compliance documents.

    CORS: Configured to allow requests only from the frontend origin.

