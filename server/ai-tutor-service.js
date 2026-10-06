/**
 * ai-tutor-service.js
 *
 * Server-side AI Academic Tutor Service supporting xAI Grok API.
 *
 * Responsibilities:
 *  1. Call xAI Grok API (https://api.x.ai/v1/chat/completions) with System Instructions
 *  2. Support multi-turn conversation context
 *  3. Fallback gracefully to smart academic response generator if GROK_API_KEY is not configured
 *  4. Keep API keys 100% server-side
 */

import https from 'https';

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY || null;
const GROK_API_URL = process.env.GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL   = process.env.GROK_MODEL   || 'grok-2-latest';

const SYSTEM_INSTRUCTION = `You are Studora AI Academic Tutor, an expert, patient, and pedagogical academic assistant for university and college students.

Your Goals:
1. Explain complex coursework concepts step-by-step across STEM (Mathematics, Computer Science, Physics, Chemistry, Engineering), Medicine, Humanities, Law, and Business.
2. Structure your answers with clear headings, bullet points, and code blocks with syntax tags.
3. For mathematical derivations and equations, use clean standard LaTeX notation ($...$ for inline, $$...$$ for display equations).
4. Provide concrete code snippets with comments for programming queries.
5. End helpful answers with 1 or 2 thoughtful follow-up questions to test student comprehension.
6. Be encouraging, precise, and academically rigorous. Never give harmful or non-academic content.`;

/**
 * Sends a multi-turn chat request to Grok API or fallback provider.
 *
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @returns {Promise<{answer: string, model: string, provider: string}>}
 */
export async function generateAiTutorResponse(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  // Prepend System Instruction
  const fullMessages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...messages.map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
      content: String(m.content || ''),
    })),
  ];

  // If GROK_API_KEY / XAI_API_KEY is available, call Grok HTTP API
  if (GROK_API_KEY) {
    try {
      const result = await callGrokApi(fullMessages);
      return {
        answer: result.content,
        model: GROK_MODEL,
        provider: 'xAI Grok',
      };
    } catch (err) {
      console.error('[ai-tutor-service] Grok API call failed, falling back to internal engine:', err.message);
      // Fall through to fallback
    }
  }

  // Fallback engine (Dev/Test mode when no key configured)
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const fallbackAnswer = generateFallbackAcademicAnswer(lastUserMsg);

  return {
    answer: fallbackAnswer,
    model: 'studora-academic-dev',
    provider: 'Studora Local Engine',
  };
}

/**
 * Calls xAI Grok Chat Completions Endpoint via Node https module.
 */
function callGrokApi(messages) {
  return new Promise((resolve, reject) => {
    const url = new URL(GROK_API_URL);
    const bodyStr = JSON.stringify({
      model: GROK_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: 2048,
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const content = parsed.choices?.[0]?.message?.content;
            if (content) {
              resolve({ content });
            } else {
              reject(new Error('Grok API returned empty completion content'));
            }
          } else {
            const msg = parsed.error?.message || parsed.message || `Grok HTTP ${res.statusCode}`;
            reject(new Error(`Grok API Error: ${msg}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Grok API response: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

/**
 * Intelligent academic fallback answer generator for dev/test mode.
 */
function generateFallbackAcademicAnswer(prompt) {
  const p = prompt.toLowerCase();

  if (p.includes('l\'hopital') || p.includes('lhopital') || p.includes('limit') || p.includes('calculus')) {
    return `### 📐 Understanding L'Hôpital's Rule

**L'Hôpital's Rule** states that if a limit evaluates to an indeterminate form $\\frac{0}{0}$ or $\\frac{\\pm\\infty}{\\pm\\infty}$, the limit of the quotient of the functions is equal to the limit of the quotient of their derivatives:

$$\\lim_{x \\to c} \\frac{f(x)}{g(x)} = \\lim_{x \\to c} \\frac{f'(x)}{g'(x)}$$

#### Step-by-Step Problem Solving:
1. **Verify Indeterminate Form**: Direct substitution must yield $\\frac{0}{0}$ or $\\frac{\\infty}{\\infty}$.
2. **Differentiate Numerator & Denominator Separately**: Take $f'(x)$ and $g'(x)$ independently (do *not* use the quotient rule).
3. **Re-evaluate Limit**: Evaluate $\\lim_{x \\to c} \\frac{f'(x)}{g'(x)}$. If still indeterminate, you may apply the rule again.

---
**Follow-up Question:** Would you like to work through an example such as $\\lim_{x \\to 0} \\frac{\\sin x}{x}$ together?`;
  }

  if (p.includes('quicksort') || p.includes('algorithm') || p.includes('complexity') || p.includes('big o')) {
    return `### ⚡ QuickSort Algorithm & Time Complexity Analysis

**QuickSort** is a divide-and-conquer sorting algorithm that selects a **pivot** element and partitions the array such that elements smaller than the pivot go to the left, and larger elements go to the right.

#### Time Complexity Summary:
* **Best Case**: $\\mathcal{O}(n \\log n)$ — when pivot splits array evenly into two equal halves.
* **Average Case**: $\\mathcal{O}(n \\log n)$ — expected runtime on random inputs.
* **Worst Case**: $\\mathcal{O}(n^2)$ — occurs when array is already sorted and worst pivot (smallest/largest element) is repeatedly picked.

\`\`\`javascript
// QuickSort Implementation in JavaScript
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[arr.length - 1];
  const left = [];
  const right = [];

  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] < pivot) left.push(arr[i]);
    else right.push(arr[i]);
  }

  return [...quickSort(left), pivot, ...quickSort(right)];
}
\`\`\`

---
**Follow-up Question:** Would you like to discuss how randomized pivot selection (Randomized QuickSort) avoids the worst-case $\\mathcal{O}(n^2)$ complexity?`;
  }

  return `### 📚 Studora AI Academic Tutor Response

Here is a structured analytical breakdown for your coursework query:

> **Query:** "${prompt.slice(0, 100)}${prompt.length > 100 ? '…' : ''}"

#### Core Concepts & Key Takeaways:
1. **Definition & Context**: Ensure you identify the underlying principles, governing theorems, or foundational models.
2. **Methodological Step**: Apply systematic problem solving by breaking down variables and establishing relationships.
3. **Synthesis & Conclusion**: Validate results against constraints or edge cases.

---
**Follow-up Question:** Which specific aspect of this topic would you like to explore deeper or practice with a sample exam question?`;
}
