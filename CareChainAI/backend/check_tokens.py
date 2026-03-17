import google.generativeai as genai

API_KEY = "YOUR API KEY"
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash-lite")

sample_chunks = [
    "Patient: John Doe, Age: 45. Blood test report dated 12/03/2024. Haemoglobin: 13.2 g/dL. WBC: 7200.",
    "Fasting glucose: 142 mg/dL. HbA1c: 6.8%. Cholesterol: 210 mg/dL.",
    "Doctor: Dr. Sharma. Hospital: City Medical Center. Metformin 500mg twice daily.",
]

context = "\n\n---\n\n".join([c[:200] for c in sample_chunks])

prompt = f"""You are a medical records assistant. Explain briefly. Do not diagnose.

RECORDS:
{context}

QUESTION: What does my blood test show?

Answer with bullet points. Consult your doctor for medical advice."""

token_count = model.count_tokens(prompt)
print(f"Prompt tokens: {token_count.total_tokens}")
print(f"Prompt length: {len(prompt)} chars")
print(f"At 200 requests/day free limit — you get 200 questions/day")
