/**
 * Online Tuition Student Registration Web App
 * Configuration Template
 * 
 * Instructions:
 * 1. Copy this file and name it 'config.js' (or edit config.js directly).
 * 2. Log in to your Supabase Dashboard: https://supabase.com/dashboard
 * 3. Select your project and navigate to: Project Settings -> API.
 * 4. Copy your "Project URL" and "anon / public" API key into the fields below.
 * 
 * IMPORTANT SECURITY RULE:
 * NEVER put your 'service_role' key in this file or any client-side file!
 * Only the public 'anon' key belongs in frontend configuration.
 */

window.APP_CONFIG = {
  // REQUIRED: Your Supabase Project URL
  // Example: "https://abcdefghijklmno.supabase.co"
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",

  // REQUIRED: Your Supabase Publishable / Anon API Key
  // Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",

  // SUBMISSION MODE:
  // - "edge_function" (Recommended): Calls the server-side Supabase Edge Function
  //   which runs independent validation and uploads to private storage.
  // - "direct": Direct client-to-Supabase insertion using Row Level Security (RLS).
  //   Useful if you want to test before deploying the Edge Function.
  SUBMISSION_MODE: "edge_function",

  // ACADEMY BRANDING & CUSTOMIZATION
  ACADEMY_NAME: "Online Tuition Academy",
  ACADEMY_TAGLINE: "Register Now to Join Our Online Classes",
  ACADEMY_URDU_NAME: "آن لائن ٹیوشن اکیڈمی",
  ACADEMY_CONTACT_PHONE: "0300-1234567",
  ACADEMY_WHATSAPP: "03001234567",
  ACADEMY_EMAIL: "admissions@onlinetuition.example.com",

  // MAXIMUM ALLOWED PHOTO SIZE IN BYTES (500 KB = 512,000 bytes)
  MAX_PHOTO_SIZE_BYTES: 512000,
  
  // ALLOWED IMAGE EXTENSIONS
  ALLOWED_EXTENSIONS: ["jpg", "jpeg", "png", "webp"]
};
