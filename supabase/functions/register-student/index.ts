// =====================================================================
// SUPABASE EDGE FUNCTION: register-student
// Handles secure server-side student registration, image validation,
// upload to private Supabase Storage, and database insertion.
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const MAX_FILE_SIZE_BYTES = 512000; // Strictly 500 KB (512,000 bytes)
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

// Pakistan phone number regex (03XXXXXXXXX: 11 digits starting with 03)
const PAKISTAN_PHONE_REGEX = /^03[0-9]{9}$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function sanitizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[\x00-\x1F\x7F]/g, "");
}

function normalizePakistanPhone(phone: string): string {
  // Strip non-digit characters except leading plus
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  // Handle +92 or 92 prefix
  if (cleaned.startsWith("+92")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("92") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(2);
  }
  return cleaned;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed. Use POST." }, 405);
  }

  // Ensure server-side credentials exist
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment secrets.");
    return jsonResponse(
      {
        success: false,
        error: "Server configuration error. Please contact the administrator.",
      },
      500
    );
  }

  // Initialize administrative Supabase client
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let uploadedFilePath: string | null = null;

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request format. Expected multipart/form-data.",
        },
        400
      );
    }

    const formData = await req.formData();
    const fullName = sanitizeText(formData.get("full_name"));
    const fatherName = sanitizeText(formData.get("father_name"));
    const rawPhone = sanitizeText(formData.get("phone_number"));
    const className = sanitizeText(formData.get("class_name"));
    const photoFile = formData.get("photo");

    // 1. Validate full_name
    if (!fullName || fullName.length < 2 || fullName.length > 100) {
      return jsonResponse(
        {
          success: false,
          error: "Student Full Name is required (between 2 and 100 characters).",
        },
        400
      );
    }

    // 2. Validate father_name
    if (!fatherName || fatherName.length < 2 || fatherName.length > 100) {
      return jsonResponse(
        {
          success: false,
          error: "Father's Name is required (between 2 and 100 characters).",
        },
        400
      );
    }

    // 3. Validate and normalize phone_number
    const normalizedPhone = normalizePakistanPhone(rawPhone);
    if (!PAKISTAN_PHONE_REGEX.test(normalizedPhone)) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid phone number. Please enter a valid 11-digit Pakistani phone number starting with 03 (e.g. 03001234567).",
        },
        400
      );
    }

    // 4. Validate class_name
    if (!className || className.length < 1 || className.length > 80) {
      return jsonResponse(
        {
          success: false,
          error: "Class selection is required.",
        },
        400
      );
    }

    // 5. Validate photo file
    if (!(photoFile instanceof File) || photoFile.size === 0) {
      return jsonResponse(
        {
          success: false,
          error: "A student photograph is required. Please upload an image file.",
        },
        400
      );
    }

    // Check maximum permitted file size: strictly 500 KB (512,000 bytes)
    if (photoFile.size > MAX_FILE_SIZE_BYTES) {
      return jsonResponse(
        {
          success: false,
          error: `Image size exceeds the maximum limit of 500 KB (512,000 bytes). Your file is ${Math.round(
            photoFile.size / 1024
          )} KB. Please compress or choose a smaller image.`,
        },
        400
      );
    }

    // Check MIME type
    const fileMime = photoFile.type.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(fileMime)) {
      return jsonResponse(
        {
          success: false,
          error:
            "Unsupported file type. Only JPG, JPEG, PNG, and WEBP image formats are accepted.",
        },
        400
      );
    }

    // Check extension
    const fileNameParts = photoFile.name.split(".");
    const fileExt = (fileNameParts.pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      return jsonResponse(
        {
          success: false,
          error:
            "Unsupported file extension. Only .jpg, .jpeg, .png, and .webp files are accepted.",
        },
        400
      );
    }

    // 6. Upload Photo to Supabase Storage in organized folder structure
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const uniqueId = crypto.randomUUID();
    const storagePath = `photos/${year}/${month}/${uniqueId}.${fileExt}`;

    const arrayBuffer = await photoFile.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("student-photos")
      .upload(storagePath, fileBuffer, {
        contentType: photoFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload failed:", uploadError.message);
      return jsonResponse(
        {
          success: false,
          error: "Failed to upload student photograph. Please try again.",
        },
        500
      );
    }

    // Track path for rollback on DB error
    uploadedFilePath = storagePath;

    // 7. Insert Student Registration record into PostgreSQL
    const { data: insertedData, error: dbError } = await supabase
      .from("student_registrations")
      .insert([
        {
          full_name: fullName,
          father_name: fatherName,
          phone_number: normalizedPhone,
          class_name: className,
          photo_path: storagePath,
        },
      ])
      .select("id, reference_id, full_name, class_name, created_at")
      .single();

    if (dbError || !insertedData) {
      console.error("Database insert error:", dbError?.message);

      // Rollback: delete orphaned uploaded file from storage
      if (uploadedFilePath) {
        try {
          await supabase.storage.from("student-photos").remove([uploadedFilePath]);
          console.log(`Cleaned up orphaned storage file: ${uploadedFilePath}`);
        } catch (cleanupErr) {
          console.error("Failed to cleanup orphaned storage file:", cleanupErr);
        }
      }

      return jsonResponse(
        {
          success: false,
          error:
            "Unable to save your registration information right now. Please try again later.",
        },
        500
      );
    }

    // 8. Return success response with generated reference ID
    return jsonResponse(
      {
        success: true,
        reference_id: insertedData.reference_id,
        id: insertedData.id,
        full_name: insertedData.full_name,
        class_name: insertedData.class_name,
        created_at: insertedData.created_at,
        message: "Registration Submitted Successfully!",
      },
      201
    );
  } catch (err: unknown) {
    // If an unexpected error happened after upload, attempt rollback
    if (uploadedFilePath) {
      try {
        await supabase.storage.from("student-photos").remove([uploadedFilePath]);
      } catch (_e) {
        // silent rollback catch
      }
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Unhandled registration error:", message);
    return jsonResponse(
      {
        success: false,
        error: "An unexpected error occurred while processing your registration. Please try again.",
      },
      500
    );
  }
});
