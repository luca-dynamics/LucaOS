import { SchemaType, FunctionDeclaration } from "@google/generative-ai";

/**
 * Practice Generator Tool Definition
 * Generates practice questions from any reference material
 */
export const generatePracticeQuestionsTool: FunctionDeclaration = {
  name: "generate_practice_questions",
  description:
    "Generate practice questions that mimic the style and difficulty of reference material. Works for exams, homework, research problems, textbooks,  any learning content. Returns twin questions that test the same concepts with different values.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      referenceContent: {
        type: SchemaType.STRING,
        description:
          "The reference material to mimic (exam question, homework problem, textbook example, research question, etc.)",
      },
      numQuestions: {
        type: SchemaType.NUMBER,
        description: "Number of practice questions to generate (default: 3)",
      },
    },
    required: ["referenceContent"],
  },
};
