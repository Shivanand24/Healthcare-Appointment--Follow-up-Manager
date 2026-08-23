import { GoogleGenerativeAI } from "@google/generative-ai";
import { UrgencyLevel } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PreVisitTriageResult {
  urgency_level: UrgencyLevel;
  chief_complaint: string;
  suggested_questions: string[];
  fallback: boolean;
}

export interface PostVisitSummaryResult {
  plain_summary: string;
  medication_schedule: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  follow_up_instructions: string;
  fallback: boolean;
}

// ─── Helper: timeout wrapper ──────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`LLM request timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── Pre-Visit Triage ────────────────────────────────────────────────────────

export async function generatePreVisitTriage(
  symptoms: string
): Promise<PreVisitTriageResult> {
  const fallback: PreVisitTriageResult = {
    urgency_level: UrgencyLevel.LOW,
    chief_complaint: "Symptom summary unavailable — review raw symptoms below.",
    suggested_questions: [
      "How long have you had these symptoms?",
      "Are they getting better or worse?",
      "Any medications or allergies to note?",
    ],
    fallback: true,
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not set — using fallback triage");
      return fallback;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a medical triage assistant. Analyze the following patient symptoms and respond ONLY with a valid JSON object (no markdown, no code blocks) using exactly this structure:

{
  "urgency_level": "LOW" | "MEDIUM" | "HIGH",
  "chief_complaint": "concise 1-sentence clinical description",
  "suggested_questions": ["question 1", "question 2", "question 3"]
}

Rules:
- HIGH urgency: chest pain, stroke symptoms, severe bleeding, breathing difficulty, sudden severe headache
- MEDIUM urgency: persistent pain, fever >38.5°C, moderate symptoms affecting daily life  
- LOW urgency: mild symptoms, minor discomfort, routine check-ups
- Provide exactly 3 focused clinical questions for the doctor

Patient symptoms: "${symptoms}"`;

    const result = await withTimeout(model.generateContent(prompt), 5000);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      urgency_level: parsed.urgency_level as UrgencyLevel,
      chief_complaint: String(parsed.chief_complaint),
      suggested_questions: Array.isArray(parsed.suggested_questions)
        ? parsed.suggested_questions.map(String)
        : fallback.suggested_questions,
      fallback: false,
    };
  } catch (err) {
    console.error("Pre-visit triage LLM error:", err);
    return fallback;
  }
}

// ─── Post-Visit Summary ───────────────────────────────────────────────────────

export async function generatePostVisitSummary(
  doctorNotes: string,
  prescriptions: Array<{ name: string; dosage: string; frequency: string; duration: string }>
): Promise<PostVisitSummaryResult> {
  const fallback: PostVisitSummaryResult = {
    plain_summary: "Your doctor has recorded notes for this visit. Please contact your healthcare provider for a plain-language explanation.",
    medication_schedule: prescriptions,
    follow_up_instructions: "Please follow your doctor's advice and attend any scheduled follow-up appointments.",
    fallback: true,
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not set — using fallback post-visit summary");
      return fallback;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prescriptionText = prescriptions.length
      ? prescriptions.map((p) => `${p.name} ${p.dosage}: ${p.frequency} for ${p.duration}`).join(", ")
      : "No medications prescribed";

    const prompt = `You are a patient communication specialist. Convert these clinical notes into a warm, clear, patient-friendly summary. Respond ONLY with a valid JSON object (no markdown):

{
  "plain_summary": "2-3 sentence plain English explanation of the visit findings and what they mean for the patient",
  "medication_schedule": [
    {
      "name": "medication name",
      "dosage": "dosage",
      "frequency": "when to take it in plain English",
      "duration": "how long",
      "instructions": "any special instructions"
    }
  ],
  "follow_up_instructions": "clear instructions for follow-up care"
}

Doctor's clinical notes: "${doctorNotes}"
Prescriptions: "${prescriptionText}"

Important: Use simple everyday language. Avoid medical jargon. Be reassuring but accurate.`;

    const result = await withTimeout(model.generateContent(prompt), 5000);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      plain_summary: String(parsed.plain_summary),
      medication_schedule: Array.isArray(parsed.medication_schedule)
        ? parsed.medication_schedule
        : prescriptions,
      follow_up_instructions: String(parsed.follow_up_instructions),
      fallback: false,
    };
  } catch (err) {
    console.error("Post-visit summary LLM error:", err);
    return fallback;
  }
}
