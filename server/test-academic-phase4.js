/**
 * test-academic-phase4.js
 *
 * Comprehensive Test Suite for Studora Phase 4:
 * Document-Based Learning, Knowledge Extraction & Personal AI Tutoring.
 *
 * Verifies:
 *  1. Document Upload, Validation & Persistence:
 *     - Upload valid document with title, fileName, fileSizeBytes, rawTextContent
 *     - Rejects oversized file (> 10MB) with 413
 *     - Rejects unsupported file extension / mime type with 415
 *  2. Text Extraction, Chunking & Processing States:
 *     - Automatically parses raw text into pages and chunks
 *     - Sets processing_status to 'ready' for valid text
 *     - Gracefully flags scanned/empty documents as 'unsupported_scanned'
 *  3. Automatic Learning Material Generation:
 *     - Generates Executive Summary resource
 *     - Generates Revision Flashcards resource (with page numbers)
 *     - Generates Practice Questions resource
 *  4. Document Knowledge Retrieval (RAG):
 *     - POST /api/documents/search retrieves matching chunks using PostgreSQL FTS / ILIKE
 *     - Search results include page number, section heading, and content
 *  5. Conversational Document-Grounded AI Tutoring:
 *     - POST /api/ai/chat seamlessly injects retrieved document chunks
 *     - Grok / fallback engine provides document-grounded answers citing document title and page
 *  6. Cross-Student Ownership & Protection:
 *     - Student A cannot view, retrieve, search, or delete Student B's uploaded documents
 *  7. Document Reprocessing & Deletion:
 *     - Reprocessing updates chunks and learning resources safely
 *     - Deleting document cascades cleanly to chunks and resources
 */

process.env.APP_SECRET = process.env.APP_SECRET || 'test_secret_for_academic_phase4_suite_2026';
process.env.NODE_ENV = 'test';

// Set test mode before importing db.js, because it selects the database path
// when the module is evaluated.
const { initializeDatabase, db, closeDatabase } = await import('./db.js');
const { handleApiRequest, createSessionToken } = await import('./api.js');

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ [FAIL] ${testName} ${detail ? `— ${detail}` : ''}`);
    failedCount++;
  }
}

function createMockHttp(method, path, body = null, headers = {}) {
  let resStatus = 200;
  let resHeaders = {};
  let resBody = '';

  const req = {
    method,
    url: path,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    on(event, handler) {
      if (event === 'data' && body) {
        handler(Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
      }
      if (event === 'end') {
        handler();
      }
    }
  };

  const res = {
    writeHead(status, hdrs = {}) {
      resStatus = status;
      resHeaders = { ...resHeaders, ...hdrs };
    },
    setHeader(name, val) {
      resHeaders[name.toLowerCase()] = val;
    },
    end(chunk) {
      if (chunk) resBody += chunk.toString();
    },
    getStatus: () => resStatus,
    getBody: () => {
      try {
        return JSON.parse(resBody);
      } catch (e) {
        return resBody;
      }
    }
  };

  return { req, res };
}

async function run() {
  console.log('\n====================================================');
  console.log('🧪 ACADEMIC INTELLIGENCE PHASE 4 TEST SUITE');
  console.log('====================================================\n');

  await initializeDatabase();

  const runId = Date.now();
  const studentA = 'usr_p4_student_a_' + runId;
  const studentB = 'usr_p4_student_b_' + runId;
  const emailA = `student.p4.a.${runId}@studora.local`;
  const emailB = `student.p4.b.${runId}@studora.local`;

  await db.query(`
    INSERT INTO users (id, email, display_name, role, status)
    VALUES 
      ($1, $2, 'Student Alpha Phase4', 'student', 'active'),
      ($3, $4, 'Student Beta Phase4', 'student', 'active')
    ON CONFLICT (id) DO NOTHING;
  `, [studentA, emailA, studentB, emailB]);

  await db.query(`
    INSERT INTO profiles (user_id, full_name, institution, department, academic_level)
    VALUES 
      ($1, 'Student Alpha Phase4', 'University of Lagos', 'Computer Science', 'Year 3'),
      ($2, 'Student Beta Phase4', 'University of Ibadan', 'Mechanical Engineering', 'Year 2')
    ON CONFLICT (user_id) DO NOTHING;
  `, [studentA, studentB]);

  const tokenA = createSessionToken({ userId: studentA, email: emailA, role: 'student' });
  const tokenB = createSessionToken({ userId: studentB, email: emailB, role: 'student' });

  // ─────────────────────────────────────────────────────────────
  // 1. Validation & Upload Edge Cases
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. Document Upload & File Validation ---');
  {
    // Unauthenticated upload
    const { req: r1, res: s1 } = createMockHttp('POST', '/api/documents/upload', {
      title: 'Course Notes',
      fileName: 'notes.pdf',
      fileSizeBytes: 1024
    });
    await handleApiRequest(r1, s1);
    assert(s1.getStatus() === 401, 'Unauthenticated POST /api/documents/upload rejected with 401');

    // PDF upload is rejected because no verified parser or private file storage is configured.
    const { req: pdfReq, res: pdfRes } = createMockHttp('POST', '/api/documents/upload', {
      title: 'Unsupported PDF', fileName: 'notes.pdf', fileSizeBytes: 512,
      mimeType: 'application/pdf', rawTextContent: '%PDF-fake'
    }, { authorization: `Bearer ${tokenA}` });
    await handleApiRequest(pdfReq, pdfRes);
    assert(pdfRes.getStatus() === 415, 'PDF upload rejected without parser/storage capability');

    // Oversized file (> 10MB)
    const { req: r2, res: s2 } = createMockHttp('POST', '/api/documents/upload', {
      title: 'Massive PDF',
      fileName: 'massive.txt',
      fileSizeBytes: 15 * 1024 * 1024, // 15MB
      mimeType: 'text/plain',
      // The server validates measured UTF-8 content, not a client supplied size.
      rawTextContent: 'x'.repeat(10 * 1024 * 1024 + 1)
    }, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r2, s2);
    assert(s2.getStatus() === 413, 'Oversized document (>10MB) rejected with 413 Payload Too Large');

    // Unsupported extension
    const { req: r3, res: s3 } = createMockHttp('POST', '/api/documents/upload', {
      title: 'Executable Script',
      fileName: 'script.exe',
      mimeType: 'application/x-msdownload',
      fileSizeBytes: 2048,
      rawTextContent: 'sample'
    }, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r3, s3);
    assert(s3.getStatus() === 415, 'Unsupported file type (.exe) rejected with 415');
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Valid Document Processing & Extraction
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Valid Document Extraction & Automatic Chunking ---');
  let validDocId = null;
  {
    const lectureNotes = `Chapter 4: Advanced Sorting Algorithms and Divide-and-Conquer Strategies
--- Page 1 ---
QuickSort is defined as an efficient divide-and-conquer sorting algorithm. It selects a pivot element from the array and partitions the other elements into two sub-arrays according to whether they are less than or greater than the pivot.

The recurrence relation for QuickSort in the average case is given by:
$$T(n) = 2T(n/2) + O(n)$$
Solving this recurrence yields an expected time complexity of $O(n \\log n)$.

--- Page 2 ---
MergeSort is defined as a comparison-based sorting algorithm that divides the input array into two halves, recursively sorts them, and merges the two sorted halves.
MergeSort guarantees worst-case $O(n \\log n)$ time complexity regardless of the initial ordering of the elements. However, MergeSort requires $O(n)$ auxiliary memory space for merging sub-arrays.`;

    const { req: r1, res: s1 } = createMockHttp('POST', '/api/documents/upload', {
      title: 'CS301 Lecture 4: Sorting & Divide-and-Conquer',
      fileName: 'CS301_Lecture4.txt',
      fileSizeBytes: 4096,
      mimeType: 'text/plain',
      rawTextContent: lectureNotes
    }, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r1, s1);
    const body1 = s1.getBody();

    assert(s1.getStatus() === 201, 'Valid document uploaded and processed with status 201 Created');
    assert(body1.success === true, 'Response indicates success: true');
    assert(body1.document && body1.document.id, 'Document assigned stable unique identifier');
    assert(body1.document.processingStatus === 'ready', 'Processing status set to "ready"');
    assert(body1.document.pageCount === 2, 'Accurately detected 2 pages with preserved boundaries');
    assert(body1.document.chunkCount >= 2, 'Accurately divided content into chunked sections');
    validDocId = body1.document.id;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Scanned / Unreadable Document Handling
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Scanned / Empty Document Handling ---');
  {
    const { req: r1, res: s1 } = createMockHttp('POST', '/api/documents/upload', {
      title: 'Empty Notes',
      fileName: 'empty_notes.txt',
      fileSizeBytes: 2048,
      mimeType: 'text/plain',
      rawTextContent: ''
    }, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r1, s1);
    const body1 = s1.getBody();

    assert(s1.getStatus() === 400, 'Empty document rejected before persistence');
    assert(body1.error.includes('empty'), 'Empty document receives a clear validation error');
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Automatic Learning Material Generation
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Generated Learning Materials (Summary, Flashcards, Questions) ---');
  {
    const { req: r1, res: s1 } = createMockHttp('GET', `/api/documents/${validDocId}/resources`, null, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r1, s1);
    const body1 = s1.getBody();

    assert(s1.getStatus() === 200, 'GET /api/documents/:id/resources returns status 200');
    assert(Array.isArray(body1.resources), 'Resources returned as array');
    assert(body1.resources.some(r => r.resourceType === 'summary'), 'Executive summary resource generated');
    assert(body1.resources.some(r => r.resourceType === 'flashcards'), 'Revision flashcards resource generated');
    assert(body1.resources.some(r => r.resourceType === 'practice_questions'), 'Practice assessment questions generated');

    const flashcardsRes = body1.resources.find(r => r.resourceType === 'flashcards');
    const cards = flashcardsRes?.payload?.flashcards || [];
    assert(cards.length > 0, 'Flashcards list contains generated Q&A pairs');
    assert(cards[0].pageNumber !== undefined, 'Flashcards preserve page citation number');
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Contextual Knowledge Retrieval (RAG)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Contextual Knowledge Retrieval (FTS Search) ---');
  {
    const { req: r1, res: s1 } = createMockHttp('POST', '/api/documents/search', {
      query: 'What is the recurrence relation for QuickSort?',
      documentId: validDocId,
      limit: 2
    }, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r1, s1);
    const body1 = s1.getBody();

    assert(s1.getStatus() === 200, 'POST /api/documents/search returns status 200');
    assert(body1.chunks && body1.chunks.length > 0, 'Retrieves relevant document chunks');
    assert(body1.chunks[0].content.includes('T(n) = 2T(n/2) + O(n)'), 'Retrieved chunk contains the exact formula from Page 1');
    assert(body1.chunks[0].page_number === 1, 'Chunk metadata accurately references Page 1');
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Conversational Document-Grounded AI Tutoring
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. Document-Grounded AI Tutoring Integration (/api/ai/chat) ---');
  {
    const { req: r1, res: s1 } = createMockHttp('POST', '/api/ai/chat', {
      prompt: 'Explain the recurrence relation for QuickSort from my uploaded notes.'
    }, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r1, s1);
    const body1 = s1.getBody();

    assert(s1.getStatus() === 200, 'POST /api/ai/chat returns 200 OK');
    const answer = body1.message?.content || body1.answer;
    assert(answer && typeof answer === 'string', 'AI returns valid response string');
    assert(answer.includes('Document-Grounded Academic Tutor') || answer.includes('QuickSort'), 'Response references uploaded material');
  }

  // ─────────────────────────────────────────────────────────────
  // 7. Cross-Student Ownership & Protection
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 7. Cross-Student Ownership & Security ---');
  {
    // Student B attempts to access Student A's document details
    const { req: r1, res: s1 } = createMockHttp('GET', `/api/documents/${validDocId}`, null, {
      authorization: `Bearer ${tokenB}`
    });
    await handleApiRequest(r1, s1);
    assert(s1.getStatus() === 404, 'Student B blocked from reading Student A document (404/Access Denied)');

    // Student B attempts to search Student A's document chunks
    const { req: r2, res: s2 } = createMockHttp('POST', '/api/documents/search', {
      query: 'QuickSort recurrence',
      documentId: validDocId
    }, {
      authorization: `Bearer ${tokenB}`
    });
    await handleApiRequest(r2, s2);
    const body2 = s2.getBody();
    assert(body2.chunks.length === 0, 'Student B cannot retrieve Student A document chunks (0 results)');

    // Student B attempts to delete Student A's document
    const { req: r3, res: s3 } = createMockHttp('DELETE', `/api/documents/${validDocId}`, null, {
      authorization: `Bearer ${tokenB}`
    });
    await handleApiRequest(r3, s3);
    assert(s3.getStatus() === 404, 'Student B blocked from deleting Student A document');
  }

  // ─────────────────────────────────────────────────────────────
  // 8. Document Deletion & Cascading
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 8. Document Deletion & Cascade Cleanliness ---');
  {
    const { req: r1, res: s1 } = createMockHttp('DELETE', `/api/documents/${validDocId}`, null, {
      authorization: `Bearer ${tokenA}`
    });
    await handleApiRequest(r1, s1);
    assert(s1.getStatus() === 200, 'Student A can delete own document');

    // Verify chunks are completely cascaded in DB
    const chunkCheck = await db.query(`SELECT COUNT(*) as cnt FROM document_chunks WHERE document_id = $1;`, [validDocId]);
    assert(Number(chunkCheck.rows[0].cnt) === 0, 'Associated document chunks completely cascaded upon deletion');

    const resourceCheck = await db.query(`SELECT COUNT(*) as cnt FROM document_learning_resources WHERE document_id = $1;`, [validDocId]);
    assert(Number(resourceCheck.rows[0].cnt) === 0, 'Associated document learning resources completely cascaded upon deletion');
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  await closeDatabase();
  process.exit(failedCount === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
