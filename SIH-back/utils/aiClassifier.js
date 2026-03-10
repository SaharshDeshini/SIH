import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "mistral-small-3.2-vision"; // free OpenRouter model

export async function classifyIssue(description, imageUrl) {
  try {
    const response = await axios.post(
      "https://api.openrouter.ai/v1/chat/completions",
      {
        model: MODEL,
        messages: [
          {
            role: "user",
            content: `Classify this issue into a department (Plumbing, Electrical, Cleaning, Other) and give emergency level (High, Medium, Low):
Description: ${description}
Image URL: ${imageUrl || "No image"}`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        }
      }
    );

    const text = response.data.choices[0].message.content;

    // Extract Department & Emergency
    const depMatch = text.match(/Department:\s*([A-Za-z ]+)/i);
    const emergMatch = text.match(/Emergency:\s*(High|Medium|Low)/i);

    const department = depMatch ? depMatch[1].trim() : "Other";
    const emergency = emergMatch ? emergMatch[1].trim() : "Medium";

    return { department, emergency };

  } catch (err) {
    console.error("OpenRouter classification failed:", err.message);
    return { department: "Other", emergency: "Medium" };
  }
}

// Re-export for compatibility with server.js
export { classifyIssue as classifyDepartment };
