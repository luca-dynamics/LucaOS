# Integration Guide - Practice Generator Capability

## Quick Start

The practice generator capability works for any learning content: exams, homework, research problems, textbooks, etc.

---

## Option 1: Add as a Tool (Recommended)

**File:** `src/services/toolRegistry.ts`

```typescript
import {
  practiceGeneratorPrompt,
  buildPracticePrompt,
  parsePracticeResponse,
} from "./capabilities/practiceGenerator";

export const practiceGeneratorTool = {
  name: "generate_practice_questions",
  description:
    "Generate practice questions from any reference material (exams, homework, research, etc.)",
  parameters: {
    type: "object",
    properties: {
      referenceContent: {
        type: "string",
        description:
          "The reference material to mimic (can be exam question, homework problem, research question, etc.)",
      },
      numQuestions: {
        type: "number",
        description: "Number of practice questions to generate (default: 3)",
      },
    },
    required: ["referenceQuestion"],
  },

  execute: async (args: {
    referenceQuestion: string;
    numQuestions?: number;
  }) => {
    const prompt = buildExamPracticePrompt(
      args.referenceQuestion,
      args.numQuestions || 3,
    );

    // Call Gemini with the exam practice system prompt
    const response = await callGemini({
      systemPrompt: examPracticeSystemPrompt,
      userPrompt: prompt,
    });

    return parseExamPracticeResponse(response);
  },
};

// Add to ToolDefinitions
export const ToolDefinitions = {
  // ... existing tools
  examPracticeTool,
};
```

**Then register it:**

```typescript
// src/services/lucaService.ts
const tools = [
  ToolDefinitions.searchTool,
  ToolDefinitions.memoryTool,
  ToolDefinitions.examPracticeTool, // ← Add here
  // ...
];
```

---

## Option 2: Add to Tutor Persona

**File:** `src/services/agent/config/personaToolAccess.ts`

```typescript
import { examPracticeSystemPrompt } from "../../capabilities/examPractice";

export const tutorPersona = {
  name: "tutor",
  systemInstruction: `You are Luca's tutoring assistant...
  
${examPracticeSystemPrompt}
  `,
  allowedTools: [
    "search",
    "memory",
    // ... other tools
  ],
};
```

**Result:** Tutor persona automatically knows how to generate practice questions.

---

## Option 3: Context-Aware Injection

**File:** `src/services/lucaService.ts`

```typescript
import { examPracticeSystemPrompt } from "./capabilities/examPractice";

async function buildSystemPrompt(message: string, context: any) {
  let systemPrompt = baseSystemPrompt;

  // Detect if user wants exam practice
  const wantsExamPractice = /practice|exam|study|quiz/i.test(message);

  if (wantsExamPractice) {
    systemPrompt += "\n\n" + examPracticeSystemPrompt;
  }

  return systemPrompt;
}
```

**Result:** Capability activates automatically when user mentions "practice" or "exam".

---

## Testing

```typescript
// Test with a simple request
const result = await examPracticeTool.execute({
  referenceQuestion: "Calculate the derivative of f(x) = 3x² + 2x - 1",
  numQuestions: 2,
});

console.log(result.generatedQuestions);
// Should return 2 similar calculus problems
```

---

## Expected Response Format

```json
{
  "generatedQuestions": [
    {
      "id": "q1",
      "question": "Calculate the derivative of g(x) = 5x² - 4x + 7",
      "questionType": "calculation",
      "options": null,
      "correctAnswer": "g'(x) = 10x - 4",
      "explanation": "Using the power rule: d/dx(axⁿ) = naxⁿ⁻¹...",
      "difficulty": "basic",
      "concept": "derivatives_polynomials"
    }
  ]
}
```

---

## Which Option Should You Use?

| Option         | Best For          | Pros                                        | Cons                      |
| -------------- | ----------------- | ------------------------------------------- | ------------------------- |
| **1. Tool**    | General use       | Explicit, testable, works with all personas | Requires user to trigger  |
| **2. Persona** | Education-focused | Always available in tutor mode              | Only for tutor persona    |
| **3. Context** | Automatic         | No user action needed                       | May activate unexpectedly |

**Recommendation:** Start with **Option 1 (Tool)** for explicit control, then add **Option 3 (Context)** for smoother UX.
