import { Type, FunctionDeclaration } from "@google/genai";

/**
 * Education & Learning Tools
 * Tools for study assistance, practice generation, and educational support
 */

export const generatePracticeQuestionsTool: FunctionDeclaration = {
  name: "generate_practice_questions",
  description:
    "Generate practice questions that mimic reference material. Works for exams, homework, research problems, textbooks, and any learning content. Returns twin questions that test the same concepts with different values. Quality target: 85%+ similarity to reference.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      referenceContent: {
        type: Type.STRING,
        description:
          "The reference material to analyze and mimic (exam question, homework problem, textbook example, research question, etc.)",
      },
      numQuestions: {
        type: Type.NUMBER,
        description: "Number of practice questions to generate (default: 3, max: 10)",
      },
      includeExplanations: {
        type: Type.BOOLEAN,
        description: "Include step-by-step explanations for each question (default: true)",
      },
    },
    required: ["referenceContent"],
  },
};
