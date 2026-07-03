import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error("GROQ_API_KEY is not set. Check your .env file.");
}

const groq = new Groq({ apiKey });

interface GeneratedQuestion {
  question: string;
  answer: string;
  options: string[];
}

export const generateDailyQuestion = async (): Promise<GeneratedQuestion> => {
 const prompt = `Generate one math question suitable for a daily math quiz app.

Requirements:
- Must be solvable in under 2 minutes
- Must have a single, unambiguous numeric answer
- Vary the topic: arithmetic, algebra, percentages, geometry, sequences
- Double-check your arithmetic before responding — the answer must be mathematically correct
- For answers that are whole numbers, give the answer as a whole number (e.g. "125" not "125.00")
- For answers that are decimals, round to 2 decimal places
- Generate 3 wrong answers that are plausible but clearly incorrect
- Wrong answers should be close to the correct answer to make it challenging

Respond ONLY with valid JSON in this exact format, no markdown, no extra text:
{"question": "the question text", "answer": "the correct answer", "options": ["correct answer", "wrong answer 1", "wrong answer 2", "wrong answer 3"]}`;

  const response = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from AI");
  }

  const cleaned = content.trim().replace(/^```json\s*|^```\s*|```$/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as GeneratedQuestion;

    if (!parsed.question || !parsed.answer || !parsed.options || parsed.options.length !== 4  ) {
      throw new Error("Missing question, answer or options field");
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse Groq response:", content);
    throw new Error("AI did not return valid question data");
  }
};
















// import { GoogleGenerativeAI } from "@google/generative-ai";

//  const apiKey = process.env.GEMINI_API_KEY

//  if (!apiKey) {
//     throw new Error('GEMINI_API_KEY is not set. Check your .env file.')

//  }


//  const genAI = new GoogleGenerativeAI(apiKey)


//  interface GeneratedQuestion {
//     question: string;
//     answer: string;
//  }


//  export const generateDailyQuestion = async (): Promise<GeneratedQuestion> => {

//     const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash'})

//     const prompt = `Generate one interesting math question suitable for a daily maths quiz app.
    
//     It should be solvable in under 2 minutes, have a single clear numeric or short text answer,
// and vary in topic (arithmetic, algebra, geometry, logic, sequences, percentages, etc).

// Respond ONLY with valid JSON in this exact format, no markdown, no extra text:
// {"question": "the question text", "answer": "the exact correct answer"}`

// const result = await model.generateContent(prompt)
// const text = result.response.text().trim();

// const cleaned = text.replace(/^```json\s*|^```\s*|```$/g, "").trim();

// try {
//     const parsed = JSON.parse(cleaned) as GeneratedQuestion;

//     if (!parsed.question || !parsed.answer) {
//         throw new Error("Missing question or answer field");
//     }
//     return parsed;
// } catch (error) {
//     console.error('Failed to parse Gemini response:', text)
//     throw new Error('AI did not return valid question data')
// }

//  }