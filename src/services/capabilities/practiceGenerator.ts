/**
 * Exam Practice Generator Capability
 *
 * Generates practice exam questions that mimic the style and difficulty
 * of reference questions. Based on research from DeepTutor (HKUDS).
 *
 * @module examPractice
 */

export interface PracticeRequest {
  referenceContent: string; // Can be exam question, homework, research problem, etc.
  numQuestions?: number;
  includeExplanations?: boolean;
}

export interface GeneratedQuestion {
  id: string;
  question: string;
  questionType: string;
  options?: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  concept: string;
}

export interface PracticeResponse {
  generatedQuestions: GeneratedQuestion[];
  qualityReport?: {
    averageSimilarity: string;
    productionReady: boolean;
    issues: string[];
  };
}

/**
 * System prompt for practice question generation
 * Works for exams, homework, research problems, textbooks, etc.
 * Quality target: 85%+ similarity to reference
 */
export const practiceGeneratorPrompt = `
You are Luca's Practice Generator.

Your purpose: Generate "twin questions" that test the same concepts as reference material, 
but with different values and contexts. Works for any learning content: exams, homework, 
research problems, textbooks, etc.

Quality standard: 85%+ similarity.

## WORKFLOW

### Step 1: Parse Reference Question
Extract:
- Question type (calculation, multiple choice, short answer, multi-step)
- Difficulty level (basic, medium, advanced)
- Key concepts being tested
- Format/structure (e.g., "Calculate the [X] of [Y]")

### Step 2: Generate Twin Questions
For each question to generate:

**KEEP THE SAME:**
- Question type and format
- Difficulty level
- Concept being tested
- Length and structure

**CHANGE:**
- Specific values/numbers
- Context/scenario (if applicable)
- Variable names (x → t, f → g, etc.)

### Step 3: Quality Validation
Before returning, verify each question:
- ✅ Tests the same concept
- ✅ Has the same difficulty level
- ✅ Uses the same format
- ✅ Has a clear, correct answer
- ✅ Includes explanation

## SPECIAL CASES

### Multiple Choice Questions
1. Analyze the distractor pattern:
   - Same category? (e.g., all European capitals)
   - Similar values? (e.g., nearby numbers)
   - Common misconceptions?
   - Typical calculation errors?
2. **CRITICAL:** Match the distractor strategy in your generated questions

Example:
- Reference: "What is the capital of France?" with distractors [Berlin, Madrid, Rome] (other European capitals)
- Good Twin: "What is the capital of Germany?" with distractors [Paris, Madrid, Rome] (other European capitals) ✅
- Bad Twin: "What is the capital of Germany?" with distractors [Munich, Hamburg, Frankfurt] (German cities) ❌

### Multi-Step Problems
1. Identify each sub-step in the original
2. Maintain the same logical flow
3. Preserve numerical complexity:
   - Are intermediate results round numbers or fractions?
   - Do sub-calculations have equal values?
   - Match the arithmetic difficulty

Example:
- Reference: "Train travels 60km at 30km/h, then 90km at 45km/h. Average speed?"
  → Times: t₁=2h, t₂=2h (equal)
- Good Twin: "Car travels 50km at 25km/h, then 75km at 25km/h. Average speed?"
  → Times: t₁=2h, t₂=3h (different, preserves complexity) ✅
- Over-simplified: "Car travels 80km at 40km/h, then 120km at 60km/h"
  → Times: t₁=2h, t₂=2h (too similar to reference pattern) ⚠️

## OUTPUT FORMAT

Return valid JSON:
{
  "generatedQuestions": [
    {
      "id": "q1",
      "question": "...",
      "questionType": "calculation|multiple_choice|short_answer",
      "options": null | {"A": "...", "B": "..."},
      "correctAnswer": "...",
      "explanation": "Step-by-step solution with proper notation",
      "difficulty": "basic|medium|advanced",
      "concept": "descriptive_concept_name"
    }
  ]
}

## QUALITY STANDARDS

Self-check before responding:
- Similarity score target: 85%+
- Mathematical/logical correctness: 100%
- Format consistency: 100%
- Explanation clarity: Must be step-by-step

If you cannot achieve 85% similarity, explain why and provide the best attempt possible.
`;

/**
 * Validation rubric for generated questions
 */
export const practiceValidation = {
  similarityThreshold: 0.85,

  qualityChecks: {
    structureMatch: {
      weight: 0.4,
      checks: [
        "Question format identical",
        "Answer format identical",
        "Number of steps matches",
        "Length/complexity similar",
      ],
    },

    difficultyMatch: {
      weight: 0.3,
      checks: [
        "Same cognitive load",
        "Same arithmetic complexity",
        "Same prerequisite concepts",
        "Same working memory requirement",
      ],
    },

    conceptMatch: {
      weight: 0.2,
      checks: ["Tests exact same skill", "Same potential misconceptions"],
    },

    variationQuality: {
      weight: 0.1,
      checks: [
        "Different values (not obvious copy)",
        "Engaging/contextually different",
        "Creative while maintaining difficulty",
      ],
    },
  },

  productionCriteria: {
    minimumAverage: 0.85,
    noQuestionBelow: 0.75,
    percentageAbove90: 0.5,
  },
};

/**
 * Helper to construct the full prompt for practice generation
 */
export function buildPracticePrompt(
  referenceContent: string,
  numQuestions: number = 3,
): string {
  return `Generate ${numQuestions} practice question(s) based on this reference:

Reference Content:
\`\`\`
${referenceContent}
\`\`\`

Follow the practice generation workflow and return valid JSON with the generated questions.`;
}

/**
 * Parse and validate the AI response
 */
export function parsePracticeResponse(response: string): PracticeResponse {
  try {
    // Handle markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*\n?(.*?)```/s);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;

    const parsed = JSON.parse(jsonStr.trim());

    // Validate structure
    if (
      !parsed.generatedQuestions ||
      !Array.isArray(parsed.generatedQuestions)
    ) {
      throw new Error("Response missing generatedQuestions array");
    }

    return parsed as PracticeResponse;
  } catch (error) {
    throw new Error(`Failed to parse practice generation response: ${error}`);
  }
}
