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

const SYSTEM_INSTRUCTION = `You are Studora AI Academic Coach, an expert, patient, and pedagogically sound academic assistant for university and college students. You have two modes of operation:

## MODE 1 — SUBJECT TUTORING
When a student asks about academic concepts, coursework, or needs help understanding subject matter:
1. Explain complex concepts step-by-step across STEM (Mathematics, Computer Science, Physics, Chemistry, Engineering), Medicine, Humanities, Law, and Business.
2. Structure answers with clear headings, bullet points, and code blocks with syntax tags where relevant.
3. For mathematical derivations, use clean LaTeX notation ($...$ for inline, $$...$$ for display equations).
4. Provide concrete code snippets with comments for programming queries.
5. End helpful subject answers with 1 or 2 thoughtful follow-up questions to test student comprehension.

## MODE 2 — PERSONAL ACADEMIC INTELLIGENCE COACHING, DAILY STUDY COACH & DOCUMENT TUTORING
When a student asks about their own academic performance, study plan, today's schedule, strengths, weaknesses, study habits, uploaded lecture notes, or document summaries:

**CHECK**: Look for sections starting with "### VERIFIED STUDENT ACADEMIC INTELLIGENCE CONTEXT", "### TODAY'S ACTIVE STUDY PLAN CONTEXT", or "### RETRIEVED STUDENT ACADEMIC DOCUMENT KNOWLEDGE" in your system prompt.

If that section IS present:
- Use ONLY the verified facts from those sections to answer questions about performance, study hours, strengths, weaknesses, topic mastery, daily study tasks, and uploaded document excerpts.
- If document excerpts are present (under ### RETRIEVED STUDENT ACADEMIC DOCUMENT KNOWLEDGE) — ground your answers in the exact citations, referencing document titles and page numbers accurately.
- If asked "what should I study today?" — list today's recommended tasks from the TODAY'S ACTIVE STUDY PLAN CONTEXT, citing their priority, duration, and rationale.
- If asked "why did you recommend this topic?" — reference the exact reason and measured accuracy from the student's records.
- If asked "what should I revise before my examination?" — check the UPCOMING EXAMS section and prioritize those subjects/topics.
- If asked "how am I progressing?" — check completed study minutes vs target study minutes and historical trend data.
- Clearly label what is a verified measurement vs. what is your coaching recommendation.
- For questions like "what are my strongest subjects?" — cite the actual accuracy percentages and attempt counts from the data.
- For questions like "am I improving?" — check the TREND OBSERVATIONS section. If hasHistoricalTrend is No, say so explicitly.
- For questions like "how many hours have I studied?" — read the Total Verified Active Study Hours figure directly.
- Never round up, invent baseline scores, or add fictional achievements.
- If a subject is listed as "Unassessed (0 questions attempted)" — say it is unassessed, not that the student is struggling with it.
- If evidence confidence is "insufficient" — be honest about this and recommend diagnostic practice drills to generate data.
- Distinguish between "mastered/proficient" topics (strength) and "struggling" topics (empirical weakness with ≥5 attempts).
- Topics with 1-4 attempts are "developing" — do NOT classify them as weak or strong.

If that section IS NOT present:
- Do not pretend to have access to the student's academic records.
- Say: "I don't currently have access to your academic performance records. Please use the Academic Intelligence tab to view your analysis, or ask a subject-specific question I can help with."

## GENERAL RULES (both modes):
- Be encouraging and constructive. Frame weaknesses as growth opportunities.
- Be academically rigorous and never fabricate information.
- Never give harmful, non-academic, or misleading content.
- When in doubt, recommend more practice rather than making claims without data.`;

/**
 * Sends a multi-turn chat request to Grok API or fallback provider,
 * with optional grounded academic intelligence context.
 *
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @param {string} [academicContextBrief=null] - Verified academic context string
 * @returns {Promise<{answer: string, model: string, provider: string}>}
 */
export async function generateAiTutorResponse(messages = [], academicContextBrief = null) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  // Prepend System Instruction with Grounded Academic Intelligence Context
  let effectiveSystemInstruction = SYSTEM_INSTRUCTION;
  if (academicContextBrief) {
    effectiveSystemInstruction += `\n\n${academicContextBrief}`;
  }

  const fullMessages = [
    { role: 'system', content: effectiveSystemInstruction },
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
  const fallbackAnswer = generateFallbackAcademicAnswer(lastUserMsg, academicContextBrief);

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
      timeout: 10000, // 10s strict outside API timeout
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

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Grok API request timed out after 10000ms'));
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

/**
 * Intelligent academic fallback answer generator for dev/test mode.
 */
function generateFallbackAcademicAnswer(prompt, academicContext = null) {
  const p = prompt.toLowerCase();

  // If student asks about uploaded lecture notes, documents, or chapters
  if (
    p.includes('lecture') ||
    p.includes('note') ||
    p.includes('document') ||
    p.includes('chapter') ||
    p.includes('summar') ||
    p.includes('uploaded') ||
    p.includes('citation') ||
    p.includes('slide')
  ) {
    if (academicContext && academicContext.includes('### RETRIEVED STUDENT ACADEMIC DOCUMENT KNOWLEDGE')) {
      return `### 📖 Document-Grounded Academic Tutor Response\n\nBased directly on your uploaded academic materials:\n\n${academicContext}\n\n---\n**Grounded Guidance:** The concepts above are extracted directly from your course materials. Would you like me to walk through a step-by-step example or generate revision flashcards from this section?`;
    }
    if (academicContext) {
      return `### 📖 Academic Document Assistant\n\nI searched your uploaded materials for: "${prompt.slice(0, 100)}", but did not find an exact matching section.\n\nHere is your verified academic intelligence overview instead:\n\n${academicContext}\n\nTo learn from specific course materials, upload your PDF notes in the **Course Materials & Notes** tab!`;
    }
    return `### 📖 Academic Document Assistant\n\nYou currently have no uploaded course notes or textbooks on file. Head over to the **Course Materials & Notes** tab to upload your lecture PDFs and study with AI grounded in your syllabus!`;
  }

  // If student asks about their daily study plan, recommendations, or schedule
  if (
    p.includes('today') ||
    p.includes('plan') ||
    p.includes('schedule') ||
    p.includes('recommend') ||
    p.includes('priorit') ||
    p.includes('what should i study')
  ) {
    if (academicContext) {
      return `### 📅 Your Adaptive Daily Study Coach Brief\n\nHere is your evidence-grounded study plan tailored from your genuine performance records:\n\n${academicContext}\n\n---\n**Recommended Action:** Head over to **Study Planner** to start an active telemetry session on your top-priority task!`;
    }
    return `### 📅 Daily Study Plan\n\nYou do not have an active daily study plan generated yet. Head over to the **Study Planner** tab or configure your study preferences to generate your personalized daily plan!`;
  }

  // If student asks about their academic progress, strengths, weaknesses, or hours
  if (
    p.includes('strongest') ||
    p.includes('strength') ||
    p.includes('weakness') ||
    p.includes('struggling') ||
    p.includes('hours') ||
    p.includes('progress') ||
    p.includes('focus') ||
    p.includes('improve') ||
    p.includes('performance') ||
    p.includes('diagnostic')
  ) {
    if (academicContext) {
      return `### 📊 Your Grounded Academic Intelligence Brief\n\nBased on your verified Studora academic records:\n\n${academicContext}\n\n---\n**Recommendations:**\n1. Review your identified struggling topics above with targeted practice drills.\n2. Dedicate focused 30-minute active study blocks to unassessed topics to build confidence.\n\nWould you like me to walk you through a specific concept in one of your struggling areas?`;
    }
    return `### 📊 Academic Records Assessment\n\nYou currently have no completed practice drills or verified active study sessions on record. All subjects and topics are currently **Unassessed**.\n\nTo build your empirical academic intelligence profile and diagnose your strengths and weaknesses, head over to the **Assessments** tab and complete a diagnostic drill!`;
  }

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
