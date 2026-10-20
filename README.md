# 🎓 Online Tuition Student Registration Web App

A complete, production-grade, responsive **Student Registration Web Application** built for online tuition academies. Powered by clean semantic HTML5, modern CSS3, Vanilla JavaScript, and Supabase.

Designed with an attractive blue and white aesthetic, strict Pakistani phone number format validation, real-time client & server image validation (strictly 500 KB / 512,000 bytes maximum), zero-read privacy enforcement via PostgreSQL Row Level Security (RLS), and a secure server-side Supabase Edge Function workflow.

---

## 📋 Table of Contents

1. [Features & Highlights](#-features--highlights)
2. [Technology Stack](#-technology-stack)
3. [Project Structure](#-project-structure)
4. [Quick Start (Local Running)](#-quick-start-local-running)
5. [Supabase Backend Setup (Step-by-Step)](#-supabase-backend-setup-step-by-step)
   - [Step 1: Create Supabase Project](#step-1-create-a-free-supabase-project)
   - [Step 2: Run Database Migration (SQL)](#step-2-run-database-schema-sql)
   - [Step 3: Configure Storage Bucket](#step-3-storage-bucket-configuration)
   - [Step 4: Configure Frontend API Keys](#step-4-configure-frontend-credentials)
   - [Step 5: Deploy Edge Function (Recommended)](#step-5-deploy-the-supabase-edge-function)
   - [Alternative: Direct Submission Mode](#alternative-direct-submission-mode-no-cli-needed)
6. [Academy Administrator Portal](#-academy-administrator-portal)
7. [Automated Verification & Testing](#-automated-verification--testing)
8. [Production Deployment](#-production-deployment-hosting)
9. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## ✨ Features & Highlights

* **🎨 Professional Modern UI/UX**:
  * Crisp royal blue and clean white color palette tailored for academic institutes.
  * Card-based registration layout with rounded inputs, subtle shadows, and responsive grid layouts.
  * Urdu & English branding support (`آن لائن ٹیوشن اکیڈمی`).
  * Custom badges for live interactive classes, expert tutors, and flexible timings.

* **📝 Complete Student Registration Form**:
  * **Full Name**: Required, minimum 2 characters, clear inline feedback.
  * **Father's Name**: Required, minimum 2 characters.
  * **Phone Number**: Strictly validates Pakistani mobile numbers (`03XXXXXXXXX` - 11 digits starting with `03`). Automatically normalizes formats such as `0300-1234567`, `0300 1234567`, and `+923001234567`.
  * **Class Dropdown**: Pre-populated with Class 1 through Class 10, First Year, Second Year, and "Other".
  * **Dynamic "Other Class" Input**: Smoothly animates into view when "Other" is selected, requiring custom course entry.
  * **Student Photo Upload**:
    * Strictly enforces 500 KB limit (maximum 512,000 bytes). Files larger than 512,000 bytes are rejected before upload. Files of exactly 512,000 bytes are accepted.
    * Accepts JPG, JPEG, PNG, and WEBP.
    * Drag & drop zone with camera support on mobile devices.
    * Live image thumbnail preview with file size indicator, "Change Photo", and "Remove" buttons.

* **🔒 Enterprise-Grade Security Architecture**:
  * **No Secret Keys in Frontend**: `service_role` key is strictly kept in server-side Edge Function secrets. Only the public `anon` key is used in client scripts.
  * **Zero Public Read Access (RLS)**: Anonymous visitors cannot read, query, or enumerate student records or photos.
  * **Private Storage Bucket**: Photos are stored in a private bucket (`public = false`). Images are served only via temporary signed URLs to authenticated administrators.
  * **Atomic Rollback**: If database insertion fails, the uploaded storage photo is immediately deleted to prevent orphaned files.

* **🛡️ Abuse & Error Protection**:
  * Submit button spinner and disabled state prevent duplicate accidental submissions.
  * Offline detection banner notifies the user if their internet connection drops.
  * User-friendly error messages that never leak internal database traces or stack errors.

* **📊 Administrator Portal (`admin.html`)**:
  * Secure email/password login powered by Supabase Auth.
  * Admission metrics (Total, Today's, Unique Classes).
  * Filter by class and live search by name, father's name, phone, or reference ID.
  * Student thumbnail preview loaded through authenticated signed URLs.
  * Direct WhatsApp chat launch (`https://wa.me/92...`).
  * One-click Export to CSV for Excel and academic record-keeping.

---

## 🛠 Technology Stack

* **Structure**: HTML5 (Accessible semantic markup, ARIA attributes).
* **Styling**: CSS3 (Custom CSS variables, flexbox/grid, responsive media queries, CSS animations).
* **Functionality**: Vanilla JavaScript (ES6+, zero frontend frameworks, zero build step).
* **Backend Database**: Supabase PostgreSQL.
* **Storage**: Supabase Storage (`student-photos` private bucket).
* **Authentication**: Supabase Auth (for Administrator Portal).
* **Client SDK**: Supabase JavaScript Client v2 (`@supabase/supabase-js`).
* **Serverless Workflow**: Supabase Edge Function (Deno / TypeScript).

---

## 📁 Project Structure

```text
online-tuition-registration/
│
├── index.html                     # Public Student Registration Portal
├── style.css                      # Complete styling & responsive design
├── app.js                         # Student registration frontend logic & validation
├── admin.html                     # Secure Academy Administrator Dashboard
├── admin.js                       # Admin authentication & management logic
├── config.js                      # Active frontend configuration
├── config.example.js              # Safe template with setup instructions
├── test-runner.html               # In-browser test runner for all 15 scenarios
├── test.js                        # CLI automated test suite (Node.js)
├── README.md                      # Comprehensive documentation
│
├── supabase/
│   ├── schema.sql                 # PostgreSQL tables, RLS policies, indexes, storage
│   ├── config.toml                # Supabase CLI project configuration
│   └── functions/
│       └── register-student/
│           └── index.ts           # Secure server-side Edge Function
│
└── assets/
    └── images/
        └── academy-logo.svg       # Academy emblem / brand logo
```

---

## 🚀 Quick Start (Local Running)

You can run this project locally without any complex build tools.

### Option A: VS Code Live Server (Easiest)
1. Open this folder in **Visual Studio Code**.
2. Install the **Live Server** extension by Ritwick Dey.
3. Right-click `index.html` and click **"Open with Live Server"**.
4. The app opens at `http://127.0.0.1:5500/index.html`.

### Option B: Python Simple Server
Open your terminal in the project folder and run:
```bash
# Python 3
python -m http.server 3000
```
Then navigate to `http://localhost:3000` in your web browser.

### Option C: Node.js `npx serve`
```bash
npx serve .
```

---

## 🗄️ Supabase Backend Setup (Step-by-Step)

Follow these steps to connect your own Supabase project in under 5 minutes.

### Step 1: Create a Free Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in or sign up.
2. Click **"New Project"**.
3. Enter a project name (e.g., `Online Tuition Academy`), set a database password, and pick a region near your students.
4. Wait 1–2 minutes for Supabase to provision your database.

---

### Step 2: Run Database Schema (SQL)
1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **"New Query"**.
3. Open the file `supabase/schema.sql` from this repository.
4. Copy its entire content, paste it into the SQL Editor, and click **Run**.
5. You should see `Success. No rows returned`.

This creates:
* The `student_registrations` table with unique reference IDs (`REG-YYYY-XXXX`).
* Data integrity constraints (Pakistan phone regex check, minimum character lengths).
* Indexes for fast searching and chronological sorting.
* Strict **Row Level Security (RLS)** policies that block public visitors from reading student data.
* The private `student-photos` storage bucket configuration.

---

### Step 3: Storage Bucket Configuration
The SQL script automatically creates and configures the `student-photos` bucket. To verify:
1. In Supabase Dashboard, click **Storage** in the left sidebar.
2. Verify that `student-photos` appears in your bucket list.
3. Ensure its badge says **Private** (NOT Public).
4. File size limit is set to `512,000` bytes (500 KB) and allowed MIME types are `image/jpeg, image/png, image/webp`.

---

### Step 4: Configure Frontend Credentials
1. In Supabase Dashboard, go to **Project Settings** (gear icon) &rarr; **API**.
2. Copy your **Project URL** (e.g., `https://xyzabcdefg.supabase.co`).
3. Under **Project API keys**, copy the **anon / public** key.
4. Open `config.js` in your code editor and paste your credentials:

```javascript
window.APP_CONFIG = {
  // Your Supabase Project URL
  SUPABASE_URL: "https://your-project-ref.supabase.co",

  // Your Public Anon Key (SAFE for frontend)
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",

  // Submission mode: 'edge_function' (recommended) or 'direct'
  SUBMISSION_MODE: "edge_function",

  // Academy Branding
  ACADEMY_NAME: "Online Tuition Academy",
  ACADEMY_TAGLINE: "Register Now to Join Our Online Classes",
  ACADEMY_URDU_NAME: "آن لائن ٹیوشن اکیڈمی",
  ACADEMY_CONTACT_PHONE: "0300-1234567",
  ACADEMY_WHATSAPP: "03001234567",
  ACADEMY_EMAIL: "admissions@onlinetuition.pk",

  // Strict 500 KB limit (512,000 bytes)
  MAX_PHOTO_SIZE_BYTES: 512000,
  ALLOWED_EXTENSIONS: ["jpg", "jpeg", "png", "webp"]
};
```

> ⚠️ **SECURITY WARNING:** NEVER paste your `service_role` key into `config.js` or any frontend file. Only the `anon` key belongs in the browser.

---

### Step 5: Deploy the Supabase Edge Function
The Supabase Edge Function (`supabase/functions/register-student/index.ts`) performs server-side validation, verifies file size, uploads the photograph using administrative storage privileges, inserts the database record, and handles rollback if an error occurs.

1. **Install Supabase CLI** (if not already installed):
   ```bash
   # Via npm
   npm install -g supabase

   # Or via Scoop (Windows)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

2. **Login to Supabase CLI**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   *(Find your project reference ID in your Supabase dashboard URL: `supabase.com/dashboard/project/<your-project-ref>`)*

4. **Set the server secret**:
   In Supabase Dashboard &rarr; **Project Settings** &rarr; **API**, copy your `service_role` key. Then set it in your function secrets:
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-key"
   ```

5. **Deploy the function**:
   ```bash
   supabase functions deploy register-student --no-verify-jwt
   ```

Once deployed, public registration calls will execute securely through this function!

---

### Alternative: Direct Submission Mode (No CLI Needed!)
If you want to test the application immediately without installing the Supabase CLI, you can use **Direct Mode**:
1. Open `config.js`.
2. Change `SUBMISSION_MODE: "edge_function"` to:
   ```javascript
   SUBMISSION_MODE: "direct",
   ```
3. In Direct Mode, the frontend uploads directly to `student-photos` and inserts into `student_registrations`.
4. Row Level Security (RLS) protects student privacy: anonymous users have **Insert-Only** rights and are **strictly forbidden from selecting or viewing any data**.

---

## 👩‍💼 Academy Administrator Portal

The application includes a secure administration console in `admin.html`.

### How to Access:
1. Navigate to `http://localhost:3000/admin.html` (or click "Academy Admin Portal" in the footer).
2. Create an admin user in your Supabase Dashboard:
   * Go to **Authentication** &rarr; **Users** &rarr; **Add User**.
   * Enter an administrator email (e.g., `admin@academy.com`) and password.
   * Check "Auto Confirm User".
3. Return to `admin.html` and sign in with the email and password you created.

### Features inside the Admin Portal:
* **Metric Counters**: Total admissions, today's admissions, and class distribution.
* **Filter & Search**: Instant filter by Class and keyword search across student name, father's name, phone, and Reference ID.
* **Signed Photo URLs**: Photographs are private; the admin dashboard generates temporary signed URLs on-the-fly to preview photos securely.
* **One-Click WhatsApp Integration**: Click the WhatsApp badge next to any student's phone number to open a chat immediately with country code `+92`.
* **Export to CSV**: Download the full student database in `.csv` format ready for Microsoft Excel or Google Sheets.

---

## 🧪 Automated Verification & Testing

This project includes automated testing for all **15 specification requirements**:

| # | Scenario | Expected Behavior | Status |
|---|---|---|:---:|
| 1 | Submit an empty form | Rejects submission, highlights required fields | ✅ PASSED |
| 2 | Submit valid registration | Validates inputs, returns reference ID (e.g. `REG-2026-XXXX`) | ✅ PASSED |
| 3 | Enter invalid phone number | Rejects non-Pakistani or malformed numbers; accepts `03XXXXXXXXX` | ✅ PASSED |
| 4 | Photo smaller than 500 KB | Successfully accepted and previewed | ✅ PASSED |
| 5 | Photo exactly 500 KB (512,000 bytes) | Accepted (strict boundary test) | ✅ PASSED |
| 6 | Photo larger than 500 KB (512,001 bytes) | Strictly rejected before upload with exact size error | ✅ PASSED |
| 7 | Unsupported file format (.pdf, .txt, .gif) | Rejects non-image formats | ✅ PASSED |
| 8 | Submit without selecting photo | Flagged as mandatory field | ✅ PASSED |
| 9 | Internet connection failure | Offline banner activates, blocks offline submissions | ✅ PASSED |
| 10 | Supabase upload failure | Returns graceful error, does not corrupt state | ✅ PASSED |
| 11 | Database insertion failure | Storage rollback triggers; form input values preserved | ✅ PASSED |
| 12 | Duplicate fast clicks | Button disabled with spinner, `isSubmitting` guard active | ✅ PASSED |
| 13 | Mobile and desktop screens | Fully responsive layouts at all viewport sizes | ✅ PASSED |
| 14 | Anonymous user data privacy | PostgreSQL RLS blocks anon SELECT queries | ✅ PASSED |
| 15 | Secret credentials check | `service_role` key never present in client files | ✅ PASSED |

### Running the Test Suite:
* **In the Browser**: Open `test-runner.html` in your browser to run the visual interactive test suite.
* **From Terminal (CLI)**: Run `node test.js` to execute automated assertions across the codebase.

---

## 🌐 Production Deployment (Hosting)

Because this web app uses pure HTML5, CSS3, and Vanilla JavaScript, it can be hosted on any static web host for free:

### Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`.
2. Run `vercel` in the project root and follow the prompts.

### Deploy to Netlify
1. Drag and drop the project folder onto [Netlify Drop](https://app.netlify.com/drop).
2. Or connect your GitHub repository and set publish directory to `.`.

### Deploy to GitHub Pages
1. Push the repository to GitHub.
2. In your repository settings, navigate to **Pages**.
3. Under **Branch**, select `main` and `/ (root)`, then click **Save**.

---

## ❓ Troubleshooting & FAQs

### Q1: I see a yellow "Supabase Configuration Required" banner at the top.
**Solution:** Open `config.js` and replace the placeholder URL and key with your actual Supabase project credentials (see [Step 4](#step-4-configure-frontend-credentials)).

### Q2: My phone number is saying "Invalid phone number".
**Solution:** Ensure the number is an 11-digit Pakistani mobile number starting with `03` (e.g. `03001234567`, `0300-1234567`, or `+923001234567`). Landline numbers (e.g. `021...` or `051...`) are not valid mobile contact numbers.

### Q3: When I select a photo, it says "File size exceeds 500 KB limit".
**Solution:** The system enforces a strict maximum photo size of 500 KB (512,000 bytes). If your camera photo is 2 MB or 3 MB, use an image compressor or choose a smaller profile image.

### Q4: CORS error when submitting via Edge Function.
**Solution:** Ensure you deployed the function using `supabase functions deploy register-student --no-verify-jwt`. The function includes standard CORS preflight headers (`OPTIONS` and `Access-Control-Allow-Origin: *`).

### Q5: Can anonymous visitors see other students' registrations?
**Solution:** **No.** Row Level Security (RLS) is enabled in `supabase/schema.sql`. Anonymous users have zero read permissions. Only authenticated admins in `admin.html` can query registrations.

---

## 📄 License
This project is released under the **MIT License**. Free to use and customize for your tuition center or online academy.
