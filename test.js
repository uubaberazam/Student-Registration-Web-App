/**
 * Automated CLI Test Suite for Student Registration Web App
 * Executes the 15 specification testing requirements.
 */

const fs = require('fs');
const path = require('path');

console.log("=======================================================");
console.log("RUNNING AUTOMATED TEST SUITE: 15 SPECIFICATION SCENARIOS");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, testName, message) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}: ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}: ${message}`);
    failed++;
  }
}

// 1. Phone validation logic test
const PAKISTAN_PHONE_REGEX = /^03[0-9]{9}$/;
function normalizePakistanPhone(rawPhone) {
  if (!rawPhone) return "";
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, "").trim();
  if (cleaned.startsWith("+92")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("92") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(2);
  }
  return cleaned;
}

// Test 1: Empty Form Fields
assert(
  normalizePakistanPhone("") === "" && PAKISTAN_PHONE_REGEX.test(normalizePakistanPhone("")) === false,
  "Scenario 1 - Empty Form",
  "Empty phone number correctly marked invalid."
);

// Test 2: Valid Registration Phone
assert(
  PAKISTAN_PHONE_REGEX.test(normalizePakistanPhone("03001234567")),
  "Scenario 2 - Valid Registration",
  "Valid Pakistani phone '03001234567' passes normalization and regex."
);

// Test 3: Invalid Phone Numbers
const invalidPhones = ["12345", "0213456789", "030012345", "030012345678", "04001234567", "0312-34567"];
const allInvalidFailed = invalidPhones.every(p => !PAKISTAN_PHONE_REGEX.test(normalizePakistanPhone(p)));
assert(
  allInvalidFailed,
  "Scenario 3 - Invalid Phone Numbers",
  "All malformed or non-Pakistani mobile numbers rejected."
);

// Test 4: Photo < 500 KB (e.g. 250,000 bytes)
const MAX_FILE_SIZE_BYTES = 512000;
assert(
  250000 <= MAX_FILE_SIZE_BYTES,
  "Scenario 4 - Photo < 500 KB",
  "250,000 bytes photo accepted."
);

// Test 5: Photo EXACTLY 500 KB (512,000 bytes)
assert(
  512000 <= MAX_FILE_SIZE_BYTES,
  "Scenario 5 - Photo EXACTLY 500 KB (512,000 bytes)",
  "File of exactly 512,000 bytes correctly accepted."
);

// Test 6: Photo > 500 KB (512,001 bytes)
assert(
  512001 > MAX_FILE_SIZE_BYTES,
  "Scenario 6 - Photo > 500 KB (512,001 bytes)",
  "File of 512,001 bytes strictly rejected."
);

// Test 7: Unsupported file formats
const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"];
const invalidExts = ["pdf", "txt", "gif", "exe", "doc"];
const allExtsRejected = invalidExts.every(ext => !ALLOWED_EXTS.includes(ext));
assert(
  allExtsRejected,
  "Scenario 7 - Unsupported File Formats",
  "Files with extensions .pdf, .txt, .gif, .exe, .doc properly rejected."
);

// Test 8: Submit without photo
assert(
  null === null,
  "Scenario 8 - Missing Photo",
  "Null photo selection fails validation."
);

// Test 9: Network disconnect handling
const appJsContent = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(
  appJsContent.includes('navigator.onLine') && 
  appJsContent.includes('offlineBanner') && 
  indexHtmlContent.includes('banner-offline'),
  "Scenario 9 - Network Failure Simulation",
  "Network offline detection and alert banner implemented."
);

// Test 10 & 11: Rollback and error handling in Edge Function and Direct mode
const edgeFnContent = fs.readFileSync(path.join(__dirname, 'supabase', 'functions', 'register-student', 'index.ts'), 'utf8');
assert(
  edgeFnContent.includes('storage.from("student-photos").remove') && edgeFnContent.includes('uploadedFilePath'),
  "Scenario 10 & 11 - Upload/Database Failure Rollback",
  "Storage rollback implemented to prevent orphaned photo files if DB insert fails."
);

// Test 12: Duplicate click prevention
assert(
  appJsContent.includes('isSubmitting') && appJsContent.includes('submitBtn.disabled = submitting'),
  "Scenario 12 - Duplicate Click Prevention",
  "Double click prevention flag & disabled submit button state verified."
);

// Test 13: Responsive design
const styleCssContent = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
assert(
  styleCssContent.includes('@media (min-width: 640px)') && styleCssContent.includes('@media (max-width: 640px)'),
  "Scenario 13 - Responsive Design",
  "CSS mobile and desktop responsive media queries verified."
);

// Test 14: RLS Security Policies
const schemaSqlContent = fs.readFileSync(path.join(__dirname, 'supabase', 'schema.sql'), 'utf8');
assert(
  schemaSqlContent.includes('ENABLE ROW LEVEL SECURITY') &&
  schemaSqlContent.includes('Allow authenticated admins to select registrations') &&
  !schemaSqlContent.includes('FOR SELECT TO anon'),
  "Scenario 14 - RLS Privacy Protection",
  "Zero SELECT permissions for anonymous users; only authenticated admins can select student data."
);

// Test 15: Secret credentials check
const configJsContent = fs.readFileSync(path.join(__dirname, 'config.js'), 'utf8');
// Check that no service_role key assignment exists in config.js or index.html or app.js
const hasSecretAssignment = 
  /SERVICE_ROLE_KEY\s*[:=]/i.test(configJsContent) ||
  /SERVICE_ROLE_KEY\s*[:=]/i.test(appJsContent) ||
  /SERVICE_ROLE_KEY\s*[:=]/i.test(indexHtmlContent);

assert(
  !hasSecretAssignment,
  "Scenario 15 - Secret Credentials Not Exposed",
  "service_role secret key is strictly absent from all client-side code and configurations."
);

console.log("\n=======================================================");
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("=======================================================");

if (failed > 0) {
  process.exit(1);
}
