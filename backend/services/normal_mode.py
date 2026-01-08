import sys
import os

# Ensure backend directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from medical_lookup import MedicalLookup

# Singleton instance
_medical_lookup = None

def get_medical_lookup():
    global _medical_lookup
    if _medical_lookup is None:
        _medical_lookup = MedicalLookup()
    return _medical_lookup

MEDICAL_DISCLAIMER = """
⚠️ **Medical Disclaimer**: This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
"""

SAFE_SYSTEM_PROMPT = """You are MediBot, a helpful AI medical assistant in Normal Mode.
Guidelines:
1. Use the provided Local Medical Data context to answer if relevant.
2. WARNING: NEVER tell the user they "have" a specific condition. Use probabilistic language (e.g., "This might be related to...", "Common causes include...").
3. Keep responses lightweight, fast, and concise.
4. Always recommend seeing a doctor for concerning symptoms.
5. Do NOT use external citations or deep research in this mode.
"""

async def generate_normal_response(query: str, ai_service_func, history: list = []) -> any:
    """
    Generate a normal mode response using MedicalLookup for context (NO FAISS).
    """
    # 1. Get context from MedicalLookup
    lookup = get_medical_lookup()
    
    # Simple keyword extraction (naive)
    # The MedicalLookup expects a list of symptoms
    # We'll simple-split the query to find potential symptom matches
    potential_symptoms = query.replace(',', ' ').replace('.', ' ').split()
    
    # Get possible diseases based on dataset
    possible_conditions = lookup.get_possible_diseases(potential_symptoms)
    
    # Get home remedies if query mentions an issue
    # Naive check: treat whole query as issue or parts of it?
    # MedicalLookup.get_home_remedy keys are specific strings.
    # We'll just skip this for now to keep it simple unless we find a match
    
    context_str = ""
    if possible_conditions:
        context_str += "Based on Local Medical Data (dataset.csv), similar symptoms appear in:\n"
        for cond in possible_conditions:
            context_str += f"- {cond}\n"
            # Get details
            info = lookup.get_disease_info(cond)
            if info['description']:
                context_str += f"  Description: {info['description']}\n"
            if info['precautions']:
                context_str += f"  Precautions: {', '.join(info['precautions'])}\n"
    else:
        context_str = "No direct match in local symptom dataset."

    # 2. Build Prompt
    full_prompt = f"""{SAFE_SYSTEM_PROMPT}

**User Query:** {query}

**Local Medical Data Context:**
{context_str}

**Response:**"""

    # 3. Stream from AI
    async for chunk in ai_service_func(full_prompt, history, mode="normal"):
        yield chunk

    # 4. Add Disclaimer (enforced)
    yield f"\n\n{MEDICAL_DISCLAIMER}"

