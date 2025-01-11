import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Example function to generate comedic event
export async function generateComedicEventPrompt(stocks: any[]) {
  const prompt = `You are a comedic stock market event generator. 
Given these stocks: ${stocks.map((s) => s.name).join(", ")} 
Generate a short comedic scenario that changes stock prices and dividend yields. 
Provide the changes in JSON: { "title": "...", "description": "...", "changes": { "stockName": {"priceDelta": X, "dividendDelta": Y} } }`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You generate comedic stock events." },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
  });

  // Parse response
  const text = response.choices[0]?.message?.content || "";
  return text;
}
