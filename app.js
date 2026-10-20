/**
 * =====================================================================
 * ONLINE TUITION STUDENT REGISTRATION SYSTEM
 * Frontend Application Logic (Vanilla JavaScript)
 * File: app.js
 * =====================================================================
 */

(function () {
  "use strict";

  // -------------------------------------------------------------------
  // 1. Constants & Configuration
  // -------------------------------------------------------------------
  const MAX_FILE_SIZE_BYTES = 512000; // Strictly 500 KB (512,000 bytes)
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
  const PAKISTAN_PHONE_REGEX = /^03[0-9]{9}$/;

  const config = window.APP_CONFIG || {
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
    SUBMISSION_MODE: "edge_function",
  };

  // State
  let selectedPhotoFile = null;
  let isSubmitting = false;
  let supabaseClient = null;

  // -------------------------------------------------------------------
  // 2. DOM Elements
  // -------------------------------------------------------------------
  const elements = {
    // Banners & Modals
    offlineBanner: document.getElementById("offlineBanner"),
    setupBanner: document.getElementById("setupBanner"),
    setupModal: document.getElementById("setupModal"),
    toggleSetupModalBtn: document.getElementById("toggleSetupModalBtn"),
    btnCloseSetupModal: document.getElementById("btnCloseSetupModal"),
    btnDismissModal: document.getElementById("btnDismissModal"),

    // Branding Elements
    academyTitle: document.getElementById("academyTitle"),
    academyTagline: document.getElementById("academyTagline"),
    academyUrduName: document.getElementById("academyUrduName"),
    footerAcademyName: document.getElementById("footerAcademyName"),
    footerYear: document.getElementById("footerYear"),

    // Global Alert Box
    formGlobalAlert: document.getElementById("formGlobalAlert"),
    formGlobalAlertMessage: document.getElementById("formGlobalAlertMessage"),
    dismissAlertBtn: document.getElementById("dismissAlertBtn"),

    // Form & Groups
    registrationForm: document.getElementById("registrationForm"),
    groupFullName: document.getElementById("groupFullName"),
    groupFatherName: document.getElementById("groupFatherName"),
    groupPhoneNumber: document.getElementById("groupPhoneNumber"),
    groupClassName: document.getElementById("groupClassName"),
    groupOtherClass: document.getElementById("groupOtherClass"),
    groupStudentPhoto: document.getElementById("groupStudentPhoto"),

    // Inputs
    fullNameInput: document.getElementById("fullName"),
    fatherNameInput: document.getElementById("fatherName"),
    phoneNumberInput: document.getElementById("phoneNumber"),
    classNameSelect: document.getElementById("className"),
    otherClassNameInput: document.getElementById("otherClassName"),
    photoInput: document.getElementById("photoInput"),

    // Error Feedback Elements
    fullNameError: document.getElementById("fullNameError"),
    fatherNameError: document.getElementById("fatherNameError"),
    phoneNumberError: document.getElementById("phoneNumberError"),
    classNameError: document.getElementById("classNameError"),
    otherClassNameError: document.getElementById("otherClassNameError"),
    photoError: document.getElementById("photoError"),

    // Dropzone & Preview Elements
    photoDropzone: document.getElementById("photoDropzone"),
    photoPreviewCard: document.getElementById("photoPreviewCard"),
    photoPreviewImg: document.getElementById("photoPreviewImg"),
    previewFileName: document.getElementById("previewFileName"),
    previewFileSize: document.getElementById("previewFileSize"),
    previewFileStatus: document.getElementById("previewFileStatus"),
    btnChangePhoto: document.getElementById("btnChangePhoto"),
    btnRemovePhoto: document.getElementById("btnRemovePhoto"),

    // Submit Button
    submitBtn: document.getElementById("submitBtn"),
    btnText: document.querySelector(".btn-text"),
    btnSpinner: document.querySelector(".btn-spinner"),

    // Success Card
    successCard: document.getElementById("successCard"),
    successRefCode: document.getElementById("successRefCode"),
    btnCopyRef: document.getElementById("btnCopyRef"),
    copyRefText: document.getElementById("copyRefText"),
    summaryFullName: document.getElementById("summaryFullName"),
    summaryClass: document.getElementById("summaryClass"),
    summaryPhone: document.getElementById("summaryPhone"),
    summaryDate: document.getElementById("summaryDate"),
    btnRegisterAnother: document.getElementById("btnRegisterAnother"),
  };

  // -------------------------------------------------------------------
  // 3. Helper Functions
  // -------------------------------------------------------------------

  /**
   * Check if Supabase credentials are configured or default placeholders
   */
  function isConfigured() {
    const url = config.SUPABASE_URL || "";
    const key = config.SUPABASE_ANON_KEY || "";
    return (
      url.trim().length > 0 &&
      !url.includes("YOUR_PROJECT_REF") &&
      key.trim().length > 0 &&
      !key.includes("YOUR_SUPABASE_ANON_KEY")
    );
  }

  /**
   * Format bytes into a readable string (e.g. 245 KB)
   */
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  /**
   * Normalize Pakistani phone numbers:
   * Accepts "03001234567", "0300-1234567", "0300 1234567", "+923001234567", "923001234567"
   * Returns standard 11-digit "03XXXXXXXXX"
   */
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

  /**
   * Set field visual state and validation feedback message
   */
  function setFieldFeedback(inputEl, groupEl, errorEl, errorMessage) {
    if (errorMessage) {
      groupEl.classList.add("has-error");
      groupEl.classList.remove("has-success");
      inputEl.setAttribute("aria-invalid", "true");
      errorEl.textContent = errorMessage;
      errorEl.style.display = "flex";
    } else {
      groupEl.classList.remove("has-error");
      if (inputEl.value.trim().length > 0) {
        groupEl.classList.add("has-success");
      } else {
        groupEl.classList.remove("has-success");
      }
      inputEl.removeAttribute("aria-invalid");
      errorEl.textContent = "";
      errorEl.style.display = "none";
    }
  }

  /**
   * Display or hide the global alert banner
   */
  function showGlobalAlert(message) {
    elements.formGlobalAlertMessage.textContent = message;
    elements.formGlobalAlert.classList.remove("hidden");
    elements.formGlobalAlert.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideGlobalAlert() {
    elements.formGlobalAlert.classList.add("hidden");
    elements.formGlobalAlertMessage.textContent = "";
  }

  // -------------------------------------------------------------------
  // 4. Individual Field Validators
  // -------------------------------------------------------------------

  function validateFullName() {
    const value = elements.fullNameInput.value.trim();
    if (!value) {
      setFieldFeedback(
        elements.fullNameInput,
        elements.groupFullName,
        elements.fullNameError,
        "Please enter the student's full name."
      );
      return false;
    }
    if (value.length < 2) {
      setFieldFeedback(
        elements.fullNameInput,
        elements.groupFullName,
        elements.fullNameError,
        "Student name must be at least 2 characters long."
      );
      return false;
    }
    setFieldFeedback(elements.fullNameInput, elements.groupFullName, elements.fullNameError, "");
    return true;
  }

  function validateFatherName() {
    const value = elements.fatherNameInput.value.trim();
    if (!value) {
      setFieldFeedback(
        elements.fatherNameInput,
        elements.groupFatherName,
        elements.fatherNameError,
        "Please enter the student's father's name."
      );
      return false;
    }
    if (value.length < 2) {
      setFieldFeedback(
        elements.fatherNameInput,
        elements.groupFatherName,
        elements.fatherNameError,
        "Father's name must be at least 2 characters long."
      );
      return false;
    }
    setFieldFeedback(elements.fatherNameInput, elements.groupFatherName, elements.fatherNameError, "");
    return true;
  }

  function validatePhoneNumber() {
    const rawValue = elements.phoneNumberInput.value.trim();
    if (!rawValue) {
      setFieldFeedback(
        elements.phoneNumberInput,
        elements.groupPhoneNumber,
        elements.phoneNumberError,
        "Please enter your Pakistani mobile phone number."
      );
      return false;
    }

    const normalized = normalizePakistanPhone(rawValue);
    if (!PAKISTAN_PHONE_REGEX.test(normalized)) {
      setFieldFeedback(
        elements.phoneNumberInput,
        elements.groupPhoneNumber,
        elements.phoneNumberError,
        "Invalid phone number. Must be 11 digits starting with 03 (e.g. 03001234567)."
      );
      return false;
    }

    setFieldFeedback(elements.phoneNumberInput, elements.groupPhoneNumber, elements.phoneNumberError, "");
    return true;
  }

  function validateClass() {
    const value = elements.classNameSelect.value;
    if (!value) {
      setFieldFeedback(
        elements.classNameSelect,
        elements.groupClassName,
        elements.classNameError,
        "Please select a class from the dropdown menu."
      );
      return false;
    }
    setFieldFeedback(elements.classNameSelect, elements.groupClassName, elements.classNameError, "");

    // If "Other" is selected, validate custom class input
    if (value === "Other") {
      const otherValue = elements.otherClassNameInput.value.trim();
      if (!otherValue) {
        setFieldFeedback(
          elements.otherClassNameInput,
          elements.groupOtherClass,
          elements.otherClassNameError,
          "Please specify your class or course name."
        );
        return false;
      }
      setFieldFeedback(
        elements.otherClassNameInput,
        elements.groupOtherClass,
        elements.otherClassNameError,
        ""
      );
    }
    return true;
  }

  function validatePhoto() {
    if (!selectedPhotoFile) {
      elements.groupStudentPhoto.classList.add("has-error");
      elements.photoError.textContent = "Please upload a student photograph.";
      elements.photoError.style.display = "flex";
      return false;
    }

    // Strictly validate file size: Max 500 KB (512,000 bytes)
    if (selectedPhotoFile.size > MAX_FILE_SIZE_BYTES) {
      elements.groupStudentPhoto.classList.add("has-error");
      elements.photoError.textContent = `File size exceeds 500 KB limit. Your photo is ${formatBytes(
        selectedPhotoFile.size
      )} (${selectedPhotoFile.size.toLocaleString()} bytes). Maximum allowed is 500 KB (512,000 bytes).`;
      elements.photoError.style.display = "flex";
      return false;
    }

    // Validate MIME type
    const mime = (selectedPhotoFile.type || "").toLowerCase();
    const ext = (selectedPhotoFile.name.split(".").pop() || "").toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      elements.groupStudentPhoto.classList.add("has-error");
      elements.photoError.textContent =
        "Unsupported file extension. Only JPG, JPEG, PNG, and WEBP formats are accepted.";
      elements.photoError.style.display = "flex";
      return false;
    }

    if (mime && !ALLOWED_MIME_TYPES.includes(mime)) {
      elements.groupStudentPhoto.classList.add("has-error");
      elements.photoError.textContent =
        "Unsupported image format. Please upload a valid JPG, PNG, or WEBP image.";
      elements.photoError.style.display = "flex";
      return false;
    }

    elements.groupStudentPhoto.classList.remove("has-error");
    elements.photoError.textContent = "";
    elements.photoError.style.display = "none";
    return true;
  }

  /**
   * Validate entire form
   */
  function validateEntireForm() {
    const isNameValid = validateFullName();
    const isFatherValid = validateFatherName();
    const isPhoneValid = validatePhoneNumber();
    const isClassValid = validateClass();
    const isPhotoValid = validatePhoto();

    const allValid = isNameValid && isFatherValid && isPhoneValid && isClassValid && isPhotoValid;

    if (!allValid) {
      // Focus first erroneous field for accessibility
      if (!isNameValid) elements.fullNameInput.focus();
      else if (!isFatherValid) elements.fatherNameInput.focus();
      else if (!isPhoneValid) elements.phoneNumberInput.focus();
      else if (!isClassValid) {
        if (elements.classNameSelect.value === "Other") elements.otherClassNameInput.focus();
        else elements.classNameSelect.focus();
      } else if (!isPhotoValid) {
        elements.photoDropzone.focus();
      }
    }

    return allValid;
  }

  // -------------------------------------------------------------------
  // 5. Photo File Handling & Preview
  // -------------------------------------------------------------------

  function handleFileSelected(file) {
    if (!file) return;

    // Reject non-image early
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      selectedPhotoFile = null;
      elements.photoInput.value = "";
      elements.photoDropzone.classList.remove("hidden");
      elements.photoPreviewCard.classList.add("hidden");
      elements.groupStudentPhoto.classList.add("has-error");
      elements.photoError.textContent =
        "Invalid file type. Please upload an image with .jpg, .jpeg, .png, or .webp extension.";
      elements.photoError.style.display = "flex";
      return;
    }

    // Check size limit: 500 KB (512,000 bytes)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      selectedPhotoFile = null;
      elements.photoInput.value = "";
      elements.photoDropzone.classList.remove("hidden");
      elements.photoPreviewCard.classList.add("hidden");
      elements.groupStudentPhoto.classList.add("has-error");
      elements.photoError.textContent = `File is too large (${formatBytes(
        file.size
      )}). Maximum allowed photo size is 500 KB (512,000 bytes). Please compress or choose a smaller image.`;
      elements.photoError.style.display = "flex";
      return;
    }

    // File is valid!
    selectedPhotoFile = file;
    elements.groupStudentPhoto.classList.remove("has-error");
    elements.photoError.textContent = "";
    elements.photoError.style.display = "none";

    // Show preview
    const reader = new FileReader();
    reader.onload = function (e) {
      elements.photoPreviewImg.src = e.target.result;
      elements.previewFileName.textContent = file.name;
      elements.previewFileSize.textContent = formatBytes(file.size);
      elements.previewFileStatus.textContent = "Valid size (≤ 500 KB)";
      elements.previewFileStatus.classList.remove("error");

      elements.photoDropzone.classList.add("hidden");
      elements.photoPreviewCard.classList.remove("hidden");
    };
    reader.onerror = function () {
      elements.photoError.textContent = "Could not read the selected image file. Please try another image.";
      elements.photoError.style.display = "flex";
    };
    reader.readAsDataURL(file);
  }

  function resetPhotoUpload() {
    selectedPhotoFile = null;
    elements.photoInput.value = "";
    elements.photoPreviewImg.src = "";
    elements.previewFileName.textContent = "";
    elements.previewFileSize.textContent = "";
    elements.photoDropzone.classList.remove("hidden");
    elements.photoPreviewCard.classList.add("hidden");
    elements.groupStudentPhoto.classList.remove("has-error");
    elements.photoError.textContent = "";
    elements.photoError.style.display = "none";
  }

  // -------------------------------------------------------------------
  // 6. Form Submission Logic
  // -------------------------------------------------------------------

  function setSubmittingState(submitting) {
    isSubmitting = submitting;
    elements.submitBtn.disabled = submitting;
    if (submitting) {
      elements.btnText.textContent = "Submitting Registration...";
      elements.btnSpinner.classList.remove("hidden");
    } else {
      elements.btnText.textContent = "Submit Registration";
      elements.btnSpinner.classList.add("hidden");
    }
  }

  /**
   * Submit via Supabase Edge Function (Recommended Secure Mode)
   */
  async function submitViaEdgeFunction(registrationData) {
    const edgeFunctionUrl = `${config.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/register-student`;

    const formData = new FormData();
    formData.append("full_name", registrationData.fullName);
    formData.append("father_name", registrationData.fatherName);
    formData.append("phone_number", registrationData.phoneNumber);
    formData.append("class_name", registrationData.className);
    formData.append("photo", selectedPhotoFile);

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        apikey: config.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${config.SUPABASE_ANON_KEY}`,
      },
      body: formData,
    });

    let result;
    try {
      result = await response.json();
    } catch (_e) {
      throw new Error("Unable to parse server response. Please try again.");
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Server could not process registration.");
    }

    return result;
  }

  /**
   * Submit directly using Supabase JS Client with RLS policies
   * Used if SUBMISSION_MODE === 'direct' or as a fallback
   */
  async function submitDirectly(registrationData) {
    if (!supabaseClient) {
      throw new Error("Supabase client is not initialized.");
    }

    // 1. Upload photo to 'student-photos' bucket
    const ext = (selectedPhotoFile.name.split(".").pop() || "jpg").toLowerCase();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12);
    const storagePath = `photos/${year}/${month}/${uniqueId}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("student-photos")
      .upload(storagePath, selectedPhotoFile, {
        contentType: selectedPhotoFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Direct storage upload failed:", uploadError);
      throw new Error("Failed to upload student photograph. Please check file size or permissions.");
    }

    // 2. Insert into student_registrations table
    const { data: inserted, error: insertError } = await supabaseClient
      .from("student_registrations")
      .insert([
        {
          full_name: registrationData.fullName,
          father_name: registrationData.fatherName,
          phone_number: registrationData.phoneNumber,
          class_name: registrationData.className,
          photo_path: storagePath,
        },
      ])
      .select("id, reference_id, full_name, class_name, created_at")
      .single();

    if (insertError) {
      console.error("Direct table insert failed:", insertError);
      // Clean up orphaned uploaded photo
      try {
        await supabaseClient.storage.from("student-photos").remove([storagePath]);
      } catch (_cleanupErr) {
        // silent rollback
      }
      throw new Error("Database insertion failed. Please try again later.");
    }

    return {
      success: true,
      reference_id: inserted.reference_id || `REG-${year}-${uniqueId.substring(0, 6).toUpperCase()}`,
      id: inserted.id,
      full_name: inserted.full_name,
      class_name: inserted.class_name,
      created_at: inserted.created_at || new Date().toISOString(),
    };
  }

  /**
   * Main Form Submission Handler
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    // Prevent duplicate submission if already processing
    if (isSubmitting) return;

    hideGlobalAlert();

    // 1. Check network status
    if (typeof navigator.onLine !== "undefined" && !navigator.onLine) {
      showGlobalAlert("You appear to be offline. Please check your internet connection and try again.");
      return;
    }

    // 2. Validate all inputs
    if (!validateEntireForm()) {
      return;
    }

    // 3. Check Supabase Configuration
    if (!isConfigured()) {
      showGlobalAlert(
        "Supabase credentials are not configured yet. Please configure config.js with your project credentials."
      );
      elements.setupModal.classList.remove("hidden");
      return;
    }

    // 4. Gather normalized form values
    const chosenClass = elements.classNameSelect.value;
    const finalClassName =
      chosenClass === "Other"
        ? elements.otherClassNameInput.value.trim()
        : chosenClass;

    const registrationData = {
      fullName: elements.fullNameInput.value.trim(),
      fatherName: elements.fatherNameInput.value.trim(),
      phoneNumber: normalizePakistanPhone(elements.phoneNumberInput.value),
      className: finalClassName,
    };

    setSubmittingState(true);

    try {
      let result;

      // Choose submission mode
      if (config.SUBMISSION_MODE === "direct") {
        result = await submitDirectly(registrationData);
      } else {
        result = await submitViaEdgeFunction(registrationData);
      }

      // Display Success State
      displaySuccessState(result, registrationData);
    } catch (err) {
      console.error("Submission failed:", err);
      // Display friendly error, NEVER leak internal DB stack trace
      const userMessage =
        err && err.message && !err.message.includes("Failed to fetch")
          ? err.message
          : "Unable to connect to the registration server. Please check your network or try again shortly.";

      showGlobalAlert(userMessage);
    } finally {
      setSubmittingState(false);
    }
  }

  /**
   * Display Success Card and clear inputs
   */
  function displaySuccessState(result, registrationData) {
    const refCode = result.reference_id || "REG-" + new Date().getFullYear() + "-SUBMITTED";

    elements.successRefCode.textContent = refCode;
    elements.summaryFullName.textContent = registrationData.fullName;
    elements.summaryClass.textContent = registrationData.className;
    elements.summaryPhone.textContent = registrationData.phoneNumber;
    elements.summaryDate.textContent = new Date().toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    // Clear form inputs
    elements.registrationForm.reset();
    resetPhotoUpload();
    elements.groupOtherClass.classList.add("hidden");

    // Remove field feedback states
    [
      elements.groupFullName,
      elements.groupFatherName,
      elements.groupPhoneNumber,
      elements.groupClassName,
      elements.groupOtherClass,
      elements.groupStudentPhoto,
    ].forEach((group) => {
      group.classList.remove("has-error", "has-success");
    });

    // Hide form, reveal success card
    elements.registrationForm.classList.add("hidden");
    elements.successCard.classList.remove("hidden");
    elements.successCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /**
   * Reset view to submit another student
   */
  function handleRegisterAnother() {
    elements.successCard.classList.add("hidden");
    elements.registrationForm.classList.remove("hidden");
    hideGlobalAlert();
    elements.fullNameInput.focus();
    elements.registrationForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // -------------------------------------------------------------------
  // 7. Event Listeners Setup
  // -------------------------------------------------------------------
  function setupEventListeners() {
    // Real-time & on-blur field validations
    elements.fullNameInput.addEventListener("input", () => {
      if (elements.groupFullName.classList.contains("has-error")) validateFullName();
    });
    elements.fullNameInput.addEventListener("blur", validateFullName);

    elements.fatherNameInput.addEventListener("input", () => {
      if (elements.groupFatherName.classList.contains("has-error")) validateFatherName();
    });
    elements.fatherNameInput.addEventListener("blur", validateFatherName);

    elements.phoneNumberInput.addEventListener("input", () => {
      if (elements.groupPhoneNumber.classList.contains("has-error")) validatePhoneNumber();
    });
    elements.phoneNumberInput.addEventListener("blur", validatePhoneNumber);

    // Dropdown Class change
    elements.classNameSelect.addEventListener("change", () => {
      validateClass();
      if (elements.classNameSelect.value === "Other") {
        elements.groupOtherClass.classList.remove("hidden");
        elements.otherClassNameInput.focus();
      } else {
        elements.groupOtherClass.classList.add("hidden");
        elements.otherClassNameInput.value = "";
      }
    });

    elements.otherClassNameInput.addEventListener("input", () => {
      if (elements.groupOtherClass.classList.contains("has-error")) validateClass();
    });
    elements.otherClassNameInput.addEventListener("blur", validateClass);

    // Photo Dropzone interactions
    elements.photoDropzone.addEventListener("click", () => {
      elements.photoInput.click();
    });

    elements.photoDropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        elements.photoInput.click();
      }
    });

    // File input change
    elements.photoInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      handleFileSelected(file);
    });

    // Drag and Drop
    ["dragenter", "dragover"].forEach((eventName) => {
      elements.photoDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.photoDropzone.classList.add("drag-active");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      elements.photoDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        elements.photoDropzone.classList.remove("drag-active");
      });
    });

    elements.photoDropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const file = dt.files && dt.files[0];
      handleFileSelected(file);
    });

    // Change and Remove buttons in preview
    elements.btnChangePhoto.addEventListener("click", () => {
      elements.photoInput.click();
    });

    elements.btnRemovePhoto.addEventListener("click", () => {
      resetPhotoUpload();
    });

    // Form submit
    elements.registrationForm.addEventListener("submit", handleFormSubmit);

    // Dismiss Alert
    elements.dismissAlertBtn.addEventListener("click", hideGlobalAlert);

    // Copy Reference ID
    elements.btnCopyRef.addEventListener("click", () => {
      const refCode = elements.successRefCode.textContent;
      navigator.clipboard
        .writeText(refCode)
        .then(() => {
          elements.copyRefText.textContent = "Copied!";
          setTimeout(() => {
            elements.copyRefText.textContent = "Copy ID";
          }, 2000);
        })
        .catch(() => {
          elements.copyRefText.textContent = "Copied!";
        });
    });

    // Submit another student button
    elements.btnRegisterAnother.addEventListener("click", handleRegisterAnother);

    // Offline / Online listeners
    window.addEventListener("online", () => {
      elements.offlineBanner.classList.add("hidden");
    });
    window.addEventListener("offline", () => {
      elements.offlineBanner.classList.remove("hidden");
    });

    // Setup Modal open / close
    if (elements.toggleSetupModalBtn) {
      elements.toggleSetupModalBtn.addEventListener("click", () => {
        elements.setupModal.classList.remove("hidden");
      });
    }

    if (elements.btnCloseSetupModal) {
      elements.btnCloseSetupModal.addEventListener("click", () => {
        elements.setupModal.classList.add("hidden");
      });
    }

    if (elements.btnDismissModal) {
      elements.btnDismissModal.addEventListener("click", () => {
        elements.setupModal.classList.add("hidden");
      });
    }

    // Close modal on escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !elements.setupModal.classList.contains("hidden")) {
        elements.setupModal.classList.add("hidden");
      }
    });
  }

  // -------------------------------------------------------------------
  // 8. Initialization
  // -------------------------------------------------------------------
  function init() {
    // Set dynamic branding if configured
    if (config.ACADEMY_NAME && elements.academyTitle) {
      elements.academyTitle.textContent = config.ACADEMY_NAME;
    }
    if (config.ACADEMY_TAGLINE && elements.academyTagline) {
      elements.academyTagline.textContent = config.ACADEMY_TAGLINE;
    }
    if (config.ACADEMY_URDU_NAME && elements.academyUrduName) {
      elements.academyUrduName.textContent = config.ACADEMY_URDU_NAME;
    }
    if (config.ACADEMY_NAME && elements.footerAcademyName) {
      elements.footerAcademyName.textContent = config.ACADEMY_NAME;
    }
    if (elements.footerYear) {
      elements.footerYear.textContent = new Date().getFullYear();
    }

    // Check offline state on load
    if (typeof navigator.onLine !== "undefined" && !navigator.onLine) {
      elements.offlineBanner.classList.remove("hidden");
    }

    // Check credentials configuration
    if (!isConfigured()) {
      elements.setupBanner.classList.remove("hidden");
    } else {
      elements.setupBanner.classList.add("hidden");
      // Initialize Supabase JS Client if library is available
      if (window.supabase && typeof window.supabase.createClient === "function") {
        try {
          supabaseClient = window.supabase.createClient(
            config.SUPABASE_URL,
            config.SUPABASE_ANON_KEY
          );
        } catch (e) {
          console.warn("Could not initialize Supabase JS client:", e);
        }
      }
    }

    setupEventListeners();
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Export for testing purposes
  window.__ONLINE_TUITION_TEST_EXPORTS__ = {
    validateFullName,
    validateFatherName,
    validatePhoneNumber,
    validateClass,
    validatePhoto,
    normalizePakistanPhone,
    formatBytes,
    setSelectedPhotoFile: (file) => {
      selectedPhotoFile = file;
    },
    getSelectedPhotoFile: () => selectedPhotoFile,
    MAX_FILE_SIZE_BYTES,
    elements,
  };
})();
