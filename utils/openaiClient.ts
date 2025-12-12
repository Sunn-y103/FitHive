/**
 * OpenAI Client Utility
 * 
 * This module provides a simple function to call the OpenAI Chat Completions API
 * directly from React Native. It's designed to be lightweight and frontend-friendly.
 * 
 * IMPORTANT: This makes API calls directly from the client. Make sure to:
 * - Store API keys securely (consider using environment variables)
 * - Implement rate limiting on the client side
 * - Consider using a backend proxy for production apps
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * OpenAI Chat Message
 */
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * OpenAI API Request Body
 */
interface OpenAIRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature: number;
}

/**
 * OpenAI API Response Structure
 */
interface OpenAIResponse {
  choices?: Array<{
    message?: {
      role: string;
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

// ============================================================================
// OPENAI API CLIENT FUNCTION
// ============================================================================

/**
 * Calls the OpenAI Chat Completions API and returns the assistant's response
 * 
 * This function:
 * 1. Prepares the request body with the user's prompt
 * 2. Sends a POST request to OpenAI's API
 * 3. Extracts the assistant's message from the response
 * 4. Handles errors gracefully
 * 
 * @param {string} apiKey - Your OpenAI API key (should be stored securely)
 * @param {string} prompt - The user's prompt/message to send to OpenAI
 * @returns {Promise<string | null>} The assistant's response text, or null if error
 * @throws {Error} If the API request fails or returns an error
 * 
 * @example
 * const response = await callOpenAI('sk-...', 'Generate a fitness reward message');
 * if (response) {
 *   console.log(response); // "Great job today!"
 * }
 */
export async function callOpenAI(
  apiKey: string,
  prompt: string
): Promise<string | null> {
  // Validate inputs
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OpenAI API key is required');
  }

  if (!prompt || prompt.trim() === '') {
    throw new Error('Prompt cannot be empty');
  }

  // Step 1: Prepare the request body
  // We're using the Chat Completions API format
  const requestBody: OpenAIRequest = {
    model: 'gpt-3.5-turbo', // Lightweight model, good for simple tasks
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 80, // Limit response length (80 tokens ≈ 60-80 words)
    temperature: 0.3, // Lower temperature = more focused, less creative responses
  };

  try {
    // Step 2: Send POST request to OpenAI API
    // Using fetch API (built into React Native, no extra dependencies needed)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`, // API key in Authorization header
      },
      body: JSON.stringify(requestBody), // Convert object to JSON string
    });

    // Step 3: Read the response as text first
    // We do this so we can include the full error message if something goes wrong
    const responseText = await response.text();

    // Step 4: Check if the request was successful
    // HTTP status 200 means success, anything else is an error
    if (!response.ok) {
      // Try to parse error message from response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch {
        // If we can't parse the error, use the raw response text
        errorMessage = responseText || errorMessage;
      }
      throw new Error(`OpenAI error: ${errorMessage}`);
    }

    // Step 5: Parse the JSON response
    // The response should contain the assistant's message
    let responseData: OpenAIResponse;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response: ${parseError}`);
    }

    // Step 6: Extract the assistant's message
    // The response structure is: { choices: [{ message: { content: "..." } }] }
    if (
      !responseData.choices ||
      responseData.choices.length === 0 ||
      !responseData.choices[0].message
    ) {
      // No message in response - return null instead of throwing
      // This can happen if the API returns an unexpected format
      console.warn('OpenAI response missing message content');
      return null;
    }

    const assistantMessage = responseData.choices[0].message.content;

    // Step 7: Return the assistant's message text
    // Trim whitespace to clean up the response
    return assistantMessage.trim() || null;
  } catch (error) {
    // Step 8: Handle any errors that occurred
    // Re-throw the error so the caller can handle it
    if (error instanceof Error) {
      throw error;
    }
    // If it's not an Error object, wrap it
    throw new Error(`Unexpected error calling OpenAI: ${error}`);
  }
}

/**
 * Simplified version that returns null on error instead of throwing
 * Useful when you want to handle errors silently
 * 
 * @param {string} apiKey - Your OpenAI API key
 * @param {string} prompt - The user's prompt
 * @returns {Promise<string | null>} Response text or null on error
 */
export async function callOpenAISafe(
  apiKey: string,
  prompt: string
): Promise<string | null> {
  try {
    return await callOpenAI(apiKey, prompt);
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return null;
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  callOpenAI,
  callOpenAISafe,
};

