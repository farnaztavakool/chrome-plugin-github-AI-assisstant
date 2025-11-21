// llmService.ts
import { SYSTEM_PROMPT } from './prompts.js';
// @ts-ignore - dotenv doesn't have types but works at runtime
import dotenv from 'dotenv';
dotenv.config();

interface LLMRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

interface LLMResponse {
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

interface AnthropicResponse {
  content: Array<{
    text: string;
  }>;
  error?: {
    message: string;
  };
}

interface ClientRequest {
  user_chat: string;
  page_context: {
    url: string;
    extracted_entities?: {
      pull_requests?: Array<{
        url?: string;
        diff_size?: number;
      }>;
    };
  };
}

interface MockResponse {
  assistant_message: string;
  actions: Array<{
    type: string;
    selector?: string;
    description?: string;
    target_url?: string;
    url?: string;
  }>;
}

/**
 * Driver interface for LLM providers.
 */
export async function runLLM({ model, systemPrompt, userPrompt, temperature = 0.7 }: LLMRequest): Promise<LLMResponse> {
  if (model.startsWith('gpt')) {
    return await callOpenAI(model, systemPrompt, userPrompt, temperature);
  } else if (model.startsWith('claude')) {
    return await callAnthropic(model, systemPrompt, userPrompt, temperature);
  } else if (model.startsWith('gemma') || model.startsWith('llama') || model.startsWith('mixtral')) {
    return await callGroq(model, systemPrompt, userPrompt, temperature);
  } else if (model === 'local') {
    return await callLocalMock(systemPrompt, userPrompt);
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
}

async function callGroq(model: string, system: string, user: string, temp: number): Promise<LLMResponse> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }

  // Map friendly names to Groq IDs if needed, or pass through
  // Groq commonly uses: "gemma2-9b-it", "llama3-8b-8192", etc.
  // If user passes "gemma 2b", we might need to map it, but usually API expects exact ID.
  // We will assume the config passes a valid ID like "gemma2-9b-it".
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: temp,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json() as OpenAIResponse;
  if (!response.ok) throw new Error(`Groq API Error: ${data.error?.message || response.statusText}`);
  
  return { content: data.choices[0].message.content };
}

async function callOpenAI(model: string, system: string, user: string, temp: number): Promise<LLMResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: temp,
      response_format: { type: "json_object" } 
    })
  });

  const data = await response.json() as OpenAIResponse;
  if (!response.ok) throw new Error(`OpenAI API Error: ${data.error?.message || response.statusText}`);
  
  return { content: data.choices[0].message.content };
}

async function callAnthropic(model: string, system: string, user: string, temp: number): Promise<LLMResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      system: system,
      messages: [
        { role: 'user', content: user }
      ],
      temperature: temp,
      max_tokens: 4096
    })
  });

  const data = await response.json() as AnthropicResponse;
  if (!response.ok) throw new Error(`Anthropic API Error: ${data.error?.message || response.statusText}`);

  return { content: data.content[0].text };
}

// Local mock for testing without keys
async function callLocalMock(system: string, user: string): Promise<LLMResponse> {
  console.log("[Mock LLM] Receiving request...");
  console.log("[Mock LLM] System:", system.substring(0, 50) + "...");
  // console.log("[Mock LLM] User:", user);

  // Simple keyword-based heuristic to mimic the LLM for the demo
  const userMsg = user.toLowerCase();
  let response: MockResponse = {
    assistant_message: "I'm running in local mock mode. I can simulate actions if you ask nicely.",
    actions: []
  };

  // Extract context from the user prompt (it's passed as a stringified JSON in the prompt)
  // We need to parse the userPrompt to get the 'user_chat' and 'page_context' if we want to be smart mock.
  // The userPrompt is stringified JSON of {user_chat, page_context}
  
  try {
    const input: ClientRequest = JSON.parse(user);
    const chat = input.user_chat.toLowerCase();
    const context = input.page_context;

    if (chat.includes("largest diff")) {
       response.assistant_message = "I found the PR with the largest diff. Navigating you there.";
       response.actions.push({ type: "highlight_dom", selector: "#issue_1" }); // Mock selector
       response.actions.push({ type: "dom_query", selector: ".js-issue-row", description: "Checking all PR rows" });
       
       // Look in context if available
       if (context.extracted_entities && context.extracted_entities.pull_requests) {
          // Logic to find largest
          const prs = context.extracted_entities.pull_requests;
          const largest = prs.reduce((prev, current) => ((current.diff_size || 0) > (prev.diff_size || 0) ? current : prev), {diff_size: -1});
          if (largest.url) {
             response.actions.push({ type: "navigate", target_url: largest.url });
          }
       }
    } else if (chat.includes("files")) {
       response.assistant_message = "Opening the files tab.";
       response.actions.push({ type: "open_pr", url: context.url + "/files" }); // Simplification
    }

  } catch (e) {
     console.error("Mock logic parsing error", e);
  }

  return { content: JSON.stringify(response) };
}

export { SYSTEM_PROMPT };

