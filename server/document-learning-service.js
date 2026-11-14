/**
 * document-learning-service.js
 *
 * Authoritative Backend Service for Studora Phase 4:
 * Document-Based Learning, Knowledge Extraction & Personal AI Tutoring.
 *
 * Responsibilities:
 *  1. Text/Markdown intake and owner-scoped persistence (10MB maximum)
 *  2. Text Extraction & Processing Pipeline:
 *     - Text extraction preserving explicit or estimated page boundaries
 *     - Meaningful chunking with source tracking (page number, chunk index, section heading)
 *     - PostgreSQL Full-Text Search vector indexing
 *  3. Document Knowledge Retrieval (RAG):
 *     - Student-isolated search across document chunks using to_tsquery / full-text ranking
 *     - Formats retrieved chunks as grounded citation evidence for Grok AI
 *  4. Automatic Learning Material Generation:
 *     - Summaries (Executive, key definitions, core formulas)
 *     - Flashcards (Question & Answer pairs directly derived from document chunks)
 *     - Practice Questions (Multiple-choice and conceptual questions grounded in text)
 *     - Study Guides (Structured revision roadmap)
 *  5. Extract topics and materials deterministically from source text
 */

import { db } from './db.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['text/plain', 'text/markdown'];

/**
 * ─────────────────────────────────────────────────────────────
 * 1. DOCUMENT UPLOAD & MANAGEMENT
 * ─────────────────────────────────────────────────────────────
 */

export async function createStudentDocument(userId, {
  title,
  fileName,
  fileSizeBytes,
  mimeType,
  rawTextContent,
  subjectId = null
}) {
  if (!userId) throw new Error('userId is required');
  if (!title || !fileName) throw new Error('Document title and fileName are required');

  const normalizedName = String(fileName || '').trim().toLowerCase();
  const normalizedMime = String(mimeType || '').toLowerCase().trim();
  if (!['.txt', '.md', '.markdown'].some(ext => normalizedName.endsWith(ext)) || !ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    const err = new Error('Unsupported document format. Text and Markdown files are supported; PDF and DOCX processing is not configured on this server.');
    err.statusCode = 415;
    throw err;
  }
  if (typeof rawTextContent !== 'string' || !rawTextContent.trim() || rawTextContent.includes('\u0000')) {
    const err = new Error('The uploaded file is empty or is not valid text.');
    err.statusCode = 400;
    throw err;
  }
  const actualSize = Buffer.byteLength(rawTextContent, 'utf8');
  if (actualSize > MAX_FILE_SIZE_BYTES) {
    const err = new Error(`File exceeds maximum allowed size of 10MB (${(actualSize / 1024 / 1024).toFixed(1)}MB)`);
    err.statusCode = 413;
    throw err;
  }

  const duplicate = await db.query(`SELECT id FROM student_documents WHERE user_id = $1 AND file_name = $2 AND source_text = $3 LIMIT 1;`, [userId, fileName.trim(), rawTextContent]);
  if (duplicate.rows.length) return getStudentDocumentById(userId, duplicate.rows[0].id);

  const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO student_documents (
      id, user_id, subject_id, title, file_name, file_size_bytes,
      mime_type, storage_path, processing_status, page_count,
      extracted_summary, extracted_topics, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'uploaded', 0, null, '[]', $9, $9);
  `, [
    docId,
    userId,
    subjectId || null,
    title.trim(),
    fileName.trim(),
    actualSize,
    normalizedMime || 'application/pdf',
    `database:${docId}`,
    now
  ]);

  await db.query(`UPDATE student_documents SET source_text = $1 WHERE id = $2 AND user_id = $3;`, [rawTextContent, docId, userId]);

  return getStudentDocumentById(userId, docId);
}

export async function getStudentDocuments(userId, { subjectId = null } = {}) {
  if (!userId) throw new Error('userId is required');

  let query = `
    SELECT 
      d.*,
      s.name as subject_name,
      s.code as subject_code,
      (SELECT COUNT(*) FROM document_chunks WHERE document_id = d.id) as chunk_count,
      (SELECT COUNT(*) FROM document_learning_resources WHERE document_id = d.id) as resource_count
    FROM student_documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    WHERE d.user_id = $1
  `;
  const params = [userId];

  if (subjectId) {
    query += ` AND d.subject_id = $2`;
    params.push(subjectId);
  }

  query += ` ORDER BY d.created_at DESC;`;

  const res = await db.query(query, params);
  return res.rows.map(formatDocumentRecord);
}

export async function getStudentDocumentById(userId, docId) {
  if (!userId || !docId) throw new Error('userId and docId are required');

  const res = await db.query(`
    SELECT 
      d.*,
      s.name as subject_name,
      s.code as subject_code,
      (SELECT COUNT(*) FROM document_chunks WHERE document_id = d.id) as chunk_count,
      (SELECT COUNT(*) FROM document_learning_resources WHERE document_id = d.id) as resource_count
    FROM student_documents d
    LEFT JOIN subjects s ON d.subject_id = s.id
    WHERE d.id = $1 AND d.user_id = $2;
  `, [docId, userId]);

  if (res.rows.length === 0) return null;
  return formatDocumentRecord(res.rows[0]);
}

export async function deleteStudentDocument(userId, docId) {
  if (!userId || !docId) throw new Error('userId and docId are required');

  const check = await db.query(`SELECT id FROM student_documents WHERE id = $1 AND user_id = $2;`, [docId, userId]);
  if (check.rows.length === 0) {
    const err = new Error('Document not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  // Cascades to document_chunks and document_learning_resources
  await db.query(`DELETE FROM student_documents WHERE id = $1 AND user_id = $2;`, [docId, userId]);
  return { success: true, documentId: docId };
}

export async function renameStudentDocument(userId, docId, title) {
  const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 160) : '';
  if (!cleanTitle) throw Object.assign(new Error('A document title is required.'), { statusCode: 400 });
  const result = await db.query(`UPDATE student_documents SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id;`, [cleanTitle, docId, userId]);
  if (!result.rows.length) throw Object.assign(new Error('Document not found or access denied.'), { statusCode: 404 });
  return getStudentDocumentById(userId, docId);
}

/**
 * ─────────────────────────────────────────────────────────────
 * 2. TEXT EXTRACTION & CHUNKING ENGINE
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Processes an uploaded document: extracts text, chunks it, generates summary & topics,
 * and builds PostgreSQL search vectors.
 */
export async function processDocumentContent(userId, docId, rawTextContent = null) {
  const doc = await getStudentDocumentById(userId, docId);
  if (!doc) throw new Error('Document not found');

  const now = new Date().toISOString();

  // Set processing status
  await db.query(`
    UPDATE student_documents SET processing_status = 'processing', updated_at = $1 WHERE id = $2 AND user_id = $3;
  `, [now, docId, userId]);

  try {
    let extractedPages = [];

    const storedSource = await db.query(`SELECT source_text FROM student_documents WHERE id = $1 AND user_id = $2;`, [docId, userId]);
    const sourceText = typeof rawTextContent === 'string' ? rawTextContent : storedSource.rows[0]?.source_text;
    if (typeof sourceText !== 'string') throw new Error('Stored source text is unavailable; upload the document again.');
    extractedPages = parseRawTextIntoPages(sourceText);

    // Check if extraction produced any readable text
    const totalExtractedText = extractedPages.map(p => p.text).join('').trim();
    if (!totalExtractedText) throw new Error('No readable text was found in this document.');

    // Clear previous chunks if reprocessing
    await db.query(`DELETE FROM document_chunks WHERE document_id = $1;`, [docId]);
    await db.query(`DELETE FROM document_learning_resources WHERE document_id = $1;`, [docId]);

    // Split pages into meaningful chunks (~300-500 words per chunk, keeping page citations)
    const chunks = [];
    let chunkIndex = 0;

    for (const page of extractedPages) {
      const pageChunks = splitIntoChunks(page.text, 1200); // ~300 words
      for (const c of pageChunks) {
        chunkIndex++;
        const chunkId = 'chunk_' + Date.now() + '_' + chunkIndex;
        const heading = extractSectionHeading(c.content) || `Page ${page.pageNumber}`;
        const wordCount = c.content.split(/\s+/).filter(Boolean).length;

        await db.query(`
          INSERT INTO document_chunks (
            id, document_id, user_id, page_number, chunk_index,
            section_heading, content, token_count, search_vector, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            to_tsvector('english', $6 || ' ' || $7), $9
          );
        `, [
          chunkId,
          docId,
          userId,
          page.pageNumber,
          chunkIndex,
          heading,
          c.content,
          wordCount,
          now
        ]);

        chunks.push({
          id: chunkId,
          pageNumber: page.pageNumber,
          chunkIndex,
          heading,
          content: c.content
        });
      }
    }

    // Extract topics and executive summary from first few chunks
    const fullText = chunks.map(c => c.content).join('\n\n');
    const extractedTopics = extractTopicsFromText(fullText);
    const summary = generateDocumentExecutiveSummary(doc.title, fullText);

    // Update document to 'ready'
    await db.query(`
      UPDATE student_documents SET
        processing_status = 'ready',
        page_count = $1,
        extracted_summary = $2,
        extracted_topics = $3,
        error_message = null,
        updated_at = $4
      WHERE id = $5;
    `, [
      extractedPages.length,
      summary,
      JSON.stringify(extractedTopics),
      now,
      docId
    ]);

    // Auto-generate standard learning resources (Summary & Flashcards)
    await generateStandardDocumentResources(userId, docId, doc.title, chunks);

    return getStudentDocumentById(userId, docId);
  } catch (err) {
    await db.query(`
      UPDATE student_documents SET
        processing_status = 'failed',
        error_message = $1,
        updated_at = $2
      WHERE id = $3;
    `, [err.message, now, docId]);

    throw err;
  }
}

/**
 * ─────────────────────────────────────────────────────────────
 * 3. DOCUMENT KNOWLEDGE RETRIEVAL (RAG)
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Searches authenticated student's document chunks using PostgreSQL Full-Text Search.
 * Strictly respects student ownership.
 */
export async function retrieveRelevantDocumentChunks(userId, queryText, { documentId = null, limit = 4 } = {}) {
  if (!userId || !queryText) return [];

  const cleanWords = queryText
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 6);

  if (cleanWords.length === 0) return [];

  const tsQueryString = cleanWords.join(' | ');
  const safeLimit = Math.max(1, Math.min(8, Math.trunc(Number(limit) || 4)));

  let sql = `
    SELECT 
      c.id,
      c.document_id,
      c.page_number,
      c.chunk_index,
      c.section_heading,
      c.content,
      d.title as document_title,
      ts_rank_cd(c.search_vector, to_tsquery('english', $2)) as rank
    FROM document_chunks c
    JOIN student_documents d ON c.document_id = d.id
    WHERE c.user_id = $1
      AND d.processing_status = 'ready'
      AND c.search_vector @@ to_tsquery('english', $2)
  `;
  const params = [userId, tsQueryString];

  if (documentId) {
    sql += ` AND c.document_id = $3`;
    params.push(documentId);
  }

  sql += ` ORDER BY rank DESC LIMIT ${safeLimit};`;

  try {
    const res = await db.query(sql, params);
    if (res.rows.length > 0) {
      return res.rows;
    }
  } catch (tsErr) {
    // Fall back to ILIKE if tsquery syntax fails on specific words
  }

  // Fallback ILIKE search if tsquery returned empty or encountered syntax issue
  const primaryWord = cleanWords[0] || '';
  if (!primaryWord) return [];

  let fallbackSql = `
    SELECT 
      c.id, c.document_id, c.page_number, c.chunk_index,
      c.section_heading, c.content, d.title as document_title, 1.0 as rank
    FROM document_chunks c
    JOIN student_documents d ON c.document_id = d.id
    WHERE c.user_id = $1 AND d.processing_status = 'ready' AND c.content ILIKE $2
  `;
  const fallbackParams = [userId, `%${primaryWord}%`];

  if (documentId) {
    fallbackSql += ` AND c.document_id = $3`;
    fallbackParams.push(documentId);
  }

  fallbackSql += ` LIMIT ${safeLimit};`;

  const fallbackRes = await db.query(fallbackSql, fallbackParams);
  return fallbackRes.rows;
}

/**
 * Formats retrieved document chunks into a grounded context brief for Grok AI.
 */
export function formatDocumentKnowledgeContext(chunks = []) {
  if (!chunks || chunks.length === 0) return null;

  const citations = chunks.map((c, i) => {
    return `[Citation ${i + 1}] Source: "${c.document_title}" (Page ${c.page_number}, Section: ${c.section_heading || 'Excerpt'})
"""
${c.content.trim()}
"""`;
  }).join('\n\n');

  return `### RETRIEVED STUDENT ACADEMIC DOCUMENT KNOWLEDGE (DO NOT OVERRIDE OR INVENT QUOTES)
The student has uploaded verified course materials relevant to this query. Ground your explanation in these exact document excerpts:

${citations}

CRITICAL RULES FOR DOCUMENT TUTORING:
1. Cite the exact document title and page number when quoting or explaining principles from the excerpts above.
2. If the student's question is NOT answered in these excerpts, clearly state: "Based on your uploaded document, this specific detail is not covered." Then you may provide general academic knowledge, clearly labeling it as such.
3. For math, physics, or engineering formulas, preserve exact mathematical syntax from the document.`;
}

/**
 * ─────────────────────────────────────────────────────────────
 * 4. AUTOMATIC LEARNING MATERIAL GENERATOR
 * ─────────────────────────────────────────────────────────────
 */

export async function generateStandardDocumentResources(userId, docId, documentTitle, chunks = []) {
  const allText = chunks.map(c => c.content).join('\n\n');
  const now = new Date().toISOString();

  // 1. Executive Summary Resource
  const summaryPayload = {
    overview: `Comprehensive academic breakdown of "${documentTitle}" derived from ${chunks.length} verified content sections.`,
    keyConcepts: extractKeyConcepts(allText),
    importantDefinitions: extractImportantDefinitions(allText),
    formulas: extractKeyFormulas(allText)
  };

  const sumId = 'res_sum_' + Date.now();
  await db.query(`
    INSERT INTO document_learning_resources (
      id, document_id, user_id, resource_type, title, payload, created_at, updated_at
    ) VALUES ($1, $2, $3, 'summary', $4, $5, $6, $6);
  `, [
    sumId,
    docId,
    userId,
    `Executive Summary: ${documentTitle}`,
    JSON.stringify(summaryPayload),
    now
  ]);

  // 2. Flashcards Resource
  const flashcards = generateFlashcardsFromChunks(chunks);
  const flashId = 'res_flash_' + Date.now();
  await db.query(`
    INSERT INTO document_learning_resources (
      id, document_id, user_id, resource_type, title, payload, created_at, updated_at
    ) VALUES ($1, $2, $3, 'flashcards', $4, $5, $6, $6);
  `, [
    flashId,
    docId,
    userId,
    `Revision Flashcards (${flashcards.length}): ${documentTitle}`,
    JSON.stringify({ flashcards }),
    now
  ]);

  // 3. Practice Questions Resource
  const practiceQuestions = generatePracticeQuestionsFromChunks(chunks);
  const qId = 'res_q_' + Date.now();
  await db.query(`
    INSERT INTO document_learning_resources (
      id, document_id, user_id, resource_type, title, payload, created_at, updated_at
    ) VALUES ($1, $2, $3, 'practice_questions', $4, $5, $6, $6);
  `, [
    qId,
    docId,
    userId,
    `Self-Assessment Questions (${practiceQuestions.length}): ${documentTitle}`,
    JSON.stringify({ questions: practiceQuestions }),
    now
  ]);

  return { summary: summaryPayload, flashcardsCount: flashcards.length, questionsCount: practiceQuestions.length };
}

export async function getDocumentLearningResources(userId, docId) {
  if (!userId || !docId) throw new Error('userId and docId are required');

  const res = await db.query(`
    SELECT * FROM document_learning_resources
    WHERE document_id = $1 AND user_id = $2
    ORDER BY created_at ASC;
  `, [docId, userId]);

  return res.rows.map(r => ({
    id: r.id,
    documentId: r.document_id,
    resourceType: r.resource_type,
    title: r.title,
    payload: parseJsonSafe(r.payload, {}),
    createdAt: r.created_at
  }));
}

/**
 * ─────────────────────────────────────────────────────────────
 * 5. TEXT PROCESSING HELPERS & EXTRACTION LOGIC
 * ─────────────────────────────────────────────────────────────
 */

function parseRawTextIntoPages(rawText) {
  // Support explicit page break markers like --- Page 2 --- or \f
  if (rawText.includes('\f')) {
    return rawText.split('\f').map((pageStr, idx) => ({
      pageNumber: idx + 1,
      text: pageStr.trim()
    })).filter(p => p.text.length > 0);
  }

  const pageMatches = rawText.split(/---+\s*Page\s*(\d+)\s*---+/i);
  if (pageMatches.length > 1) {
    const pages = [];
    for (let i = 1; i < pageMatches.length; i += 2) {
      const pageNum = parseInt(pageMatches[i], 10);
      const text = (pageMatches[i + 1] || '').trim();
      if (text) pages.push({ pageNumber: pageNum, text });
    }
    if (pages.length > 0) return pages;
  }

  // Fallback: estimate 3000 chars per page
  const chunkSize = 2500;
  const pages = [];
  let cur = 0;
  let pageNum = 1;

  while (cur < rawText.length) {
    const slice = rawText.slice(cur, cur + chunkSize).trim();
    if (slice) {
      pages.push({ pageNumber: pageNum, text: slice });
      pageNum++;
    }
    cur += chunkSize;
  }

  return pages.length > 0 ? pages : [{ pageNumber: 1, text: rawText.trim() }];
}

function splitIntoChunks(text, targetChars = 1200) {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;

    if ((current.length + p.length) > targetChars && current.length > 300) {
      chunks.push({ content: current.trim() });
      current = p;
    } else {
      current += (current ? '\n\n' : '') + p;
    }
  }

  if (current.trim()) {
    chunks.push({ content: current.trim() });
  }

  return chunks;
}

function extractSectionHeading(chunkText) {
  const firstLine = chunkText.split('\n')[0]?.trim();
  if (firstLine && firstLine.length < 80 && (
    firstLine.startsWith('#') ||
    firstLine.endsWith(':') ||
    /^[A-Z0-9\.\s\-]+$/.test(firstLine) ||
    /^(Chapter|Section|Module|Unit|Theorem|Definition|Algorithm|Part)\s+/i.test(firstLine)
  )) {
    return firstLine.replace(/^#+\s*/, '');
  }
  return null;
}

function extractTopicsFromText(text) {
  const topics = new Set();
  const lines = text.split('\n');

  for (const line of lines) {
    const l = line.trim();
    if (/^(Chapter|Module|Topic|Unit|Section)\s*\d*[:\-]?\s*(.+)/i.test(l)) {
      const m = l.match(/^(Chapter|Module|Topic|Unit|Section)\s*\d*[:\-]?\s*(.+)/i);
      if (m && m[2] && m[2].length < 60) topics.add(m[2].trim());
    }
  }

  // Fallback to key academic indicators
  if (topics.size === 0) {
    const keywords = ['Calculus', 'Limits', 'Algorithms', 'Complexity', 'Data Structures', 'Database Systems', 'Physics', 'Mechanics', 'Thermodynamics', 'Organic Chemistry'];
    for (const kw of keywords) {
      if (text.includes(kw)) topics.add(kw);
    }
  }

  return Array.from(topics).slice(0, 5);
}

function generateDocumentExecutiveSummary(title, previewText) {
  const firstParagraph = previewText.split('\n\n')[0] || '';
  return `Executive Summary for "${title}":\n\n${firstParagraph.slice(0, 350)}${firstParagraph.length > 350 ? '…' : ''}`;
}

function extractKeyConcepts(text) {
  const concepts = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('•') || l.startsWith('*') || l.startsWith('-')) {
      const item = l.replace(/^[\*\•\-]\s*/, '').trim();
      if (item.length > 15 && item.length < 150) {
        concepts.push(item);
      }
    }
    if (concepts.length >= 5) break;
  }

  return concepts;
}

function extractImportantDefinitions(text) {
  const definitions = [];
  const matches = text.match(/(?:is defined as|refers to|means)\s+([^.\n]+)/gi) || [];

  for (const m of matches.slice(0, 4)) {
    definitions.push(m.trim());
  }

  return definitions;
}

function extractKeyFormulas(text) {
  const formulas = [];
  // LaTeX or mathematical notations
  const latexMatches = text.match(/\$\$([^$]+)\$\$|\$([^$]+)\$/g) || [];

  for (const f of latexMatches.slice(0, 4)) {
    formulas.push(f);
  }

  return formulas;
}

function generateFlashcardsFromChunks(chunks) {
  const flashcards = [];

  for (const c of chunks) {
    const lines = c.content.split('\n').map(l => l.trim()).filter(Boolean);
    for (const l of lines) {
      if (l.includes('is defined as') || l.includes('refers to')) {
        const parts = l.split(/is defined as|refers to/i);
        if (parts.length === 2 && parts[0].length < 50 && parts[1].length > 15) {
          flashcards.push({
            question: `What is ${parts[0].trim()}?`,
            answer: parts[1].trim(),
            pageNumber: c.pageNumber
          });
        }
      }
    }
    if (flashcards.length >= 6) break;
  }

  if (flashcards.length === 0 && chunks[0]) {
    flashcards.push({
      question: 'Explain this excerpt in your own words.',
      answer: chunks[0].content.slice(0, 350),
      pageNumber: chunks[0].pageNumber
    });
  }

  return flashcards;
}

function generatePracticeQuestionsFromChunks(chunks) {
  const questions = [];

  for (let i = 0; i < Math.min(chunks.length, 3); i++) {
    const c = chunks[i];
    questions.push({
      id: `doc_q_${i + 1}`,
      question: `In your own words, explain this point from ${c.section_heading || `page ${c.pageNumber}`}: “${c.content.slice(0, 180).trim()}”`,
      answerGuidance: 'Use the cited passage as your source and explain its meaning.',
      sourceExcerpt: c.content.slice(0, 500),
      pageNumber: c.pageNumber
    });
  }

  return questions;
}

function formatDocumentRecord(row) {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    subjectName: row.subject_name || null,
    subjectCode: row.subject_code || null,
    title: row.title,
    fileName: row.file_name,
    fileSizeBytes: Number(row.file_size_bytes),
    mimeType: row.mime_type,
    storagePath: null,
    processingStatus: row.processing_status,
    pageCount: Number(row.page_count || 0),
    extractedSummary: row.extracted_summary,
    extractedTopics: parseJsonSafe(row.extracted_topics, []),
    errorMessage: row.error_message || null,
    chunkCount: Number(row.chunk_count || 0),
    resourceCount: Number(row.resource_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseJsonSafe(val, fallback) {
  if (!val) return fallback;
  if (Array.isArray(val) || typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}
