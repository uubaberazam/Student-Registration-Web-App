/**
 * Online Tuition Student Registration Web App
 * Configuration File
 * 
 * Replace YOUR_PROJECT_REF and YOUR_SUPABASE_ANON_KEY with your actual credentials.
 * If these remain placeholders, the app will display a friendly setup guide banner.
 */

window.APP_CONFIG = {
  // Enter your Supabase Project URL here
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",

  // Enter your Supabase Publishable / Anon API Key here
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",

  // Choose submission mode: 'edge_function' (default & recommended) or 'direct'
  SUBMISSION_MODE: "edge_function",

  // Academy Branding
  ACADEMY_NAME: "Online Tuition Academy",
  ACADEMY_TAGLINE: "Register Now to Join Our Online Classes",
  ACADEMY_URDU_NAME: "آن لائن ٹیوشن اکیڈمی",
  ACADEMY_CONTACT_PHONE: "0300-1234567",
  ACADEMY_WHATSAPP: "03001234567",
  ACADEMY_EMAIL: "admissions@onlinetuition.example.com",

  // Strict Limits (500 KB = 512,000 bytes)
  MAX_PHOTO_SIZE_BYTES: 512000,
  ALLOWED_EXTENSIONS: ["jpg", "jpeg", "png", "webp"]
};
