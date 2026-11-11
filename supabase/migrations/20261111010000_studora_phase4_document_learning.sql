-- 20261111010000_studora_phase4_document_learning.sql
-- Studora Phase 4: Document-Based Learning, Knowledge Extraction & Personal AI Tutoring

-- 1. Student Academic Documents
CREATE TABLE IF NOT EXISTS public.student_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded, processing, ready, failed, unsupported
  page_count INT NOT NULL DEFAULT 0,
  extracted_summary TEXT,
  extracted_topics JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_documents_user ON public.student_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_documents_subject ON public.student_documents(user_id, subject_id);

-- 2. Document Content Chunks (for contextual knowledge retrieval)
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  chunk_index INT NOT NULL DEFAULT 0,
  section_heading TEXT,
  content TEXT NOT NULL,
  token_count INT NOT NULL DEFAULT 0,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_doc ON public.document_chunks(document_id, chunk_index ASC);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_tsv ON public.document_chunks USING GIN(search_vector);

-- 3. Generated Learning Resources (Summaries, Flashcards, Practice Questions, Study Guides)
CREATE TABLE IF NOT EXISTS public.document_learning_resources (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- summary, flashcards, practice_questions, study_guide
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_resources_doc ON public.document_learning_resources(document_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_doc_resources_user ON public.document_learning_resources(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_learning_resources ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Students manage their own documents" ON public.student_documents;
CREATE POLICY "Students manage their own documents" ON public.student_documents
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Students manage their own document chunks" ON public.document_chunks;
CREATE POLICY "Students manage their own document chunks" ON public.document_chunks
  FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Students manage their own document resources" ON public.document_learning_resources;
CREATE POLICY "Students manage their own document resources" ON public.document_learning_resources
  FOR ALL USING (auth.uid()::text = user_id);
