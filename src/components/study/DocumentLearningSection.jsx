/**
 * DocumentLearningSection.jsx
 *
 * Studora Phase 4: Document-Based Learning & Knowledge Extraction Interface.
 *
 * Capabilities:
 *  - Upload Lecture Notes, Course Materials, Past Questions (PDF, TXT, MD)
 *  - Displays Processing States: 'uploaded', 'processing', 'ready', 'failed', 'unsupported_scanned'
 *  - Document Library with Page Count, File Size, Subject tagging
 *  - View Extracted Summaries, Key Definitions, and Core Formulas
 *  - Interactive Flashcards Viewer
 *  - Practice Questions grounded in uploaded document
 *  - "Ask AI About This Document" transition to AI Tutor Chat
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  RefreshCw,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Layers,
  Copy,
  Check,
  Plus
} from 'lucide-react';
import { Button, Badge, Modal, ProgressBar } from '../ui';
import { api } from '../../services/api/client';

export function DocumentLearningSection({ onAskAiAboutDocument, showToast }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docResources, setDocResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);

  // Upload modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [rawTextNote, setRawTextNote] = useState('');
  const [uploadMode, setUploadMode] = useState('text'); // 'text' | 'file'

  // Flashcards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Active view tab inside selected document: 'summary' | 'flashcards' | 'questions'
  const [activeResourceTab, setActiveResourceTab] = useState('summary');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request('/api/documents');
      if (res && res.documents) {
        setDocuments(res.documents);
        if (res.documents.length > 0 && !selectedDocId) {
          setSelectedDocId(res.documents[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load documents:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDocId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Fetch single document details & resources when selection changes
  useEffect(() => {
    if (!selectedDocId) {
      setSelectedDoc(null);
      setDocResources([]);
      return;
    }

    const doc = documents.find(d => d.id === selectedDocId);
    setSelectedDoc(doc || null);

    async function loadResources() {
      setLoadingResources(true);
      try {
        const res = await api.request(`/api/documents/${selectedDocId}/resources`);
        if (res && res.resources) {
          setDocResources(res.resources);
        }
      } catch (err) {
        console.warn('Failed to load document resources:', err.message);
      } finally {
        setLoadingResources(false);
      }
    }

    loadResources();
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
  }, [selectedDocId, documents]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      showToast?.({ type: 'warning', title: 'Title Required', message: 'Please enter a title for your document.' });
      return;
    }

    setUploading(true);
    try {
      let bodyPayload = {};

      if (uploadMode === 'file' && uploadFile) {
        if (uploadFile.size > 10 * 1024 * 1024) throw new Error('Maximum file size is 10MB.');
        const fileName = uploadFile.name;
        const extension = fileName.toLowerCase().split('.').pop();
        if (!['txt', 'md', 'markdown'].includes(extension)) {
          throw new Error('PDF and DOCX processing is not available yet. Upload a .txt or .md file, or paste your notes.');
        }
        bodyPayload = {
          title: uploadTitle.trim(),
          fileName,
          fileSizeBytes: uploadFile.size,
          mimeType: extension === 'txt' ? 'text/plain' : 'text/markdown',
          rawTextContent: await uploadFile.text()
        };
      } else {
        // Plaintext / Notes paste mode
        if (!rawTextNote.trim()) {
          showToast?.({ type: 'warning', title: 'Content Required', message: 'Please enter notes or upload a file.' });
          setUploading(false);
          return;
        }

        bodyPayload = {
          title: uploadTitle.trim(),
          fileName: `${uploadTitle.trim().replace(/\s+/g, '_')}.txt`,
          fileSizeBytes: new TextEncoder().encode(rawTextNote).length,
          mimeType: 'text/plain',
          rawTextContent: rawTextNote.trim()
        };
      }

      const res = await api.request('/api/documents/upload', {
        method: 'POST',
        body: JSON.stringify(bodyPayload)
      });

      if (res && res.document) {
        showToast?.({ type: 'success', title: 'Document Processed', message: `"${res.document.title}" is ready for AI tutoring.` });
        setIsUploadModalOpen(false);
        setUploadTitle('');
        setUploadFile(null);
        setRawTextNote('');
        fetchDocuments();
        setSelectedDocId(res.document.id);
      }
    } catch (err) {
      showToast?.({ type: 'error', title: 'Upload Failed', message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId, title) => {
    if (!window.confirm(`Delete document "${title}" and all extracted resources?`)) return;

    try {
      await api.request(`/api/documents/${docId}`, { method: 'DELETE' });
      showToast?.({ type: 'info', title: 'Document Removed', message: `Deleted "${title}".` });
      if (selectedDocId === docId) setSelectedDocId(null);
      fetchDocuments();
    } catch (err) {
      showToast?.({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  const handleRenameDocument = async (doc) => {
    const title = window.prompt('New document title', doc.title);
    if (title === null || !title.trim() || title.trim() === doc.title) return;
    try {
      await api.request(`/api/documents/${doc.id}`, { method: 'PATCH', body: JSON.stringify({ title: title.trim() }) });
      await fetchDocuments();
    } catch (err) {
      showToast?.({ type: 'error', title: 'Rename Failed', message: err.message });
    }
  };

  const handleReprocess = async (docId) => {
    try {
      const res = await api.request(`/api/documents/${docId}/reprocess`, { method: 'POST' });
      if (res && res.document) {
        showToast?.({ type: 'success', title: 'Reprocessed', message: 'Document content extracted.' });
        fetchDocuments();
      }
    } catch (err) {
      showToast?.({ type: 'error', title: 'Reprocess Failed', message: err.message });
    }
  };

  const summaryResource = docResources.find(r => r.resourceType === 'summary');
  const flashcardsResource = docResources.find(r => r.resourceType === 'flashcards');
  const questionsResource = docResources.find(r => r.resourceType === 'practice_questions');

  const flashcardsList = flashcardsResource?.payload?.flashcards || [];
  const practiceQuestionsList = questionsResource?.payload?.questions || [];

  return (
    <div className="space-y-6">
      {/* ── Top Header Strip ── */}
      <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-5 shadow-tactile-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-academic-100 dark:bg-academic-900/40 text-academic flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink dark:text-white">Course Materials & Document Learning</h2>
              <Badge variant="academic">Phase 4</Badge>
            </div>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              Add your course notes to ground NEXA by Studora in your learning materials.
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Button
            variant="academic"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            icon={Upload}
            className="shadow-tactile-btn"
          >
            Upload Material
          </Button>
        </div>
      </div>

      {/* ── Workspace 2-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left Column: Documents Library (span 4) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-4 shadow-tactile-surface flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-academic" />
                Uploaded Documents ({documents.length})
              </span>
              <button
                type="button"
                onClick={fetchDocuments}
                className="text-muted hover:text-ink text-[11px]"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[440px] overflow-y-auto scrollbar-thin pr-1">
              {documents.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted space-y-3">
                  <p>No documents uploaded yet.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsUploadModalOpen(true)}
                    icon={Plus}
                  >
                    Add Notes
                  </Button>
                </div>
              ) : (
                documents.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  const isReady = doc.processingStatus === 'ready';
                  const isUnsupported = doc.processingStatus === 'unsupported_scanned';

                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`group p-3 rounded-card border text-xs cursor-pointer transition-all space-y-1.5 ${
                        isSelected
                          ? 'bg-academic-50 dark:bg-academic-950/20 border-academic-300 dark:border-academic-800 text-ink shadow-tactile-surface font-semibold'
                          : 'bg-canvas border-border dark:border-gray-800 text-ink hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate flex-1 font-bold text-ink dark:text-white">
                          {doc.title}
                        </span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleRenameDocument(doc); }} className="text-muted hover:text-academic p-0.5" title="Rename">Rename</button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id, doc.title);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-opacity p-0.5"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <span>{doc.pageCount} page(s) • {doc.chunkCount} chunks</span>
                        {isReady ? (
                          <Badge variant="academic" size="sm">Ready</Badge>
                        ) : isUnsupported ? (
                          <Badge variant="warning" size="sm">Scanned/Unreadable</Badge>
                        ) : (
                          <Badge variant="default" size="sm">{doc.processingStatus}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border dark:border-gray-800 text-[11px] text-muted space-y-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-academic" />
              <span>Full-Text Search Indexed</span>
            </p>
            <p>PDF, TXT, and Markdown Supported</p>
          </div>
        </div>

        {/* Right Column: Document Knowledge Viewer & Generator (span 8) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-5 shadow-tactile-raised flex flex-col justify-between">
          {!selectedDoc ? (
            <div className="py-20 text-center text-xs text-muted space-y-2">
              <FileText className="w-8 h-8 text-muted mx-auto opacity-40" />
              <p>Select an uploaded document to view extracted summaries, flashcards, and practice questions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Document Subheader */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border dark:border-gray-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-ink dark:text-white flex items-center gap-2">
                    {selectedDoc.title}
                  </h3>
                  <span className="text-[11px] text-muted font-mono">
                    {selectedDoc.fileName} • {(selectedDoc.fileSizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="academic"
                    size="sm"
                    onClick={() => onAskAiAboutDocument?.(`Teach me about "${selectedDoc.title}" from my uploaded notes.`)}
                    icon={Sparkles}
                    className="shadow-tactile-btn text-xs py-1"
                  >
                    Ask NEXA About This Document
                  </Button>
                </div>
              </div>

              {/* Status Warning if unreadable */}
              {selectedDoc.processingStatus === 'unsupported_scanned' && (
                <div className="p-3.5 rounded-card bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Scanned Document Detected</span>
                  </p>
                  <p className="text-[11px]">
                    This PDF appears to be a scanned image without selectable text. Optical Character Recognition (OCR) is not currently enabled. Please upload a digital PDF with selectable text.
                  </p>
                </div>
              )}

              {/* Resource Tabs Switcher */}
              <div className="flex items-center gap-2 border-b border-border dark:border-gray-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveResourceTab('summary')}
                  className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition-all ${
                    activeResourceTab === 'summary'
                      ? 'bg-academic text-white shadow-tactile-btn'
                      : 'bg-canvas text-muted hover:text-ink'
                  }`}
                >
                  Executive Summary
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResourceTab('flashcards')}
                  className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition-all ${
                    activeResourceTab === 'flashcards'
                      ? 'bg-academic text-white shadow-tactile-btn'
                      : 'bg-canvas text-muted hover:text-ink'
                  }`}
                >
                  Flashcards ({flashcardsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveResourceTab('questions')}
                  className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition-all ${
                    activeResourceTab === 'questions'
                      ? 'bg-academic text-white shadow-tactile-btn'
                      : 'bg-canvas text-muted hover:text-ink'
                  }`}
                >
                  Practice Questions ({practiceQuestionsList.length})
                </button>
              </div>

              {/* Tab 1: Executive Summary */}
              {activeResourceTab === 'summary' && (
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 text-xs">
                  <div className="p-4 rounded-card bg-canvas border border-border dark:border-gray-800 space-y-2">
                    <h4 className="font-bold text-ink dark:text-white">Overview</h4>
                    <p className="text-muted leading-relaxed">
                      {selectedDoc.extractedSummary || summaryResource?.payload?.overview || "No summary generated."}
                    </p>
                  </div>

                  {summaryResource?.payload?.keyConcepts?.length > 0 && (
                    <div className="p-4 rounded-card bg-canvas border border-border dark:border-gray-800 space-y-2">
                      <h4 className="font-bold text-ink dark:text-white">Key Concepts & Principles</h4>
                      <ul className="space-y-1.5 list-disc pl-4 text-muted">
                        {summaryResource.payload.keyConcepts.map((kc, i) => (
                          <li key={i}>{kc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryResource?.payload?.formulas?.length > 0 && (
                    <div className="p-4 rounded-card bg-canvas border border-border dark:border-gray-800 space-y-2">
                      <h4 className="font-bold text-ink dark:text-white">Extracted Mathematical Notations</h4>
                      <div className="flex flex-wrap gap-2">
                        {summaryResource.payload.formulas.map((f, i) => (
                          <code key={i} className="p-2 rounded bg-white dark:bg-black/30 border border-border font-mono text-academic">
                            {f}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Interactive Flashcards */}
              {activeResourceTab === 'flashcards' && (
                <div className="space-y-4 text-xs">
                  {flashcardsList.length === 0 ? (
                    <div className="py-12 text-center text-muted">No flashcards generated for this document.</div>
                  ) : (
                    <div className="space-y-4">
                      <div
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className="p-8 rounded-card border-2 border-dashed border-academic-300 dark:border-academic-800 bg-academic-50/40 dark:bg-academic-950/20 text-center min-h-[180px] flex flex-col justify-center items-center cursor-pointer transition-all shadow-tactile-surface"
                      >
                        <span className="text-[10px] font-mono text-muted uppercase tracking-wider mb-2">
                          {isCardFlipped ? 'Answer (Click to flip)' : 'Question (Click to reveal answer)'}
                        </span>
                        <p className="text-sm font-bold text-ink dark:text-white leading-relaxed max-w-md">
                          {isCardFlipped
                            ? flashcardsList[currentCardIndex]?.answer
                            : flashcardsList[currentCardIndex]?.question}
                        </p>
                        <span className="text-[10px] text-academic font-medium mt-3">
                          Page {flashcardsList[currentCardIndex]?.pageNumber}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <span>Card {currentCardIndex + 1} of {flashcardsList.length}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={currentCardIndex === 0}
                            onClick={() => {
                              setCurrentCardIndex(currentCardIndex - 1);
                              setIsCardFlipped(false);
                            }}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="academic"
                            size="sm"
                            disabled={currentCardIndex >= flashcardsList.length - 1}
                            onClick={() => {
                              setCurrentCardIndex(currentCardIndex + 1);
                              setIsCardFlipped(false);
                            }}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Practice Questions */}
              {activeResourceTab === 'questions' && (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 text-xs">
                  {practiceQuestionsList.length === 0 ? (
                    <div className="py-12 text-center text-muted">No practice questions generated.</div>
                  ) : (
                    practiceQuestionsList.map((q, idx) => (
                      <div key={idx} className="p-4 rounded-card bg-canvas border border-border dark:border-gray-800 space-y-2.5">
                        <span className="font-bold text-ink dark:text-white block">
                          {idx + 1}. {q.question}
                        </span>

                        <div className="space-y-1.5 pl-2">
                          {q.options?.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-btn border text-[11px] flex items-center gap-2 ${
                                opt.id === q.correctAnswer
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 text-emerald-800 dark:text-emerald-300 font-semibold'
                                  : 'bg-white dark:bg-black/20 border-border text-muted'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center font-mono text-[10px]">
                                {opt.id}
                              </span>
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>

                        <p className="text-[10px] text-muted font-medium pt-1">
                          Source: {q.explanation} (Page {q.pageNumber})
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Upload Material Modal ── */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Academic Material"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Document Title</label>
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g. CS301 - Algorithm Design Chapter 4"
              className="w-full text-xs p-2.5 bg-canvas border border-border rounded-btn text-ink"
              required
            />
          </div>

          <div className="flex items-center gap-3 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setUploadMode('text')}
              className={`text-xs font-semibold pb-1 ${uploadMode === 'text' ? 'text-academic border-b-2 border-academic' : 'text-muted'}`}
            >
              Paste Lecture Notes
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`text-xs font-semibold pb-1 ${uploadMode === 'file' ? 'text-academic border-b-2 border-academic' : 'text-muted'}`}
            >
              Upload PDF File
            </button>
          </div>

          {uploadMode === 'text' ? (
            <div>
              <label className="font-bold text-ink block mb-1">Lecture Text / Chapter Excerpt</label>
              <textarea
                rows={8}
                value={rawTextNote}
                onChange={(e) => setRawTextNote(e.target.value)}
                placeholder="Paste lecture content, theorem explanations, or syllabus notes here..."
                className="w-full text-xs p-2.5 bg-canvas border border-border rounded-btn text-ink placeholder:text-muted focus:outline-none focus:border-academic"
                required
              />
            </div>
          ) : (
            <div>
              <label className="font-bold text-ink block mb-1">Choose Text or Markdown Document</label>
              <input
                type="file"
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs p-2 bg-canvas border border-border rounded-btn text-ink"
              />
              <span className="text-[10px] text-muted mt-1 block">TXT and Markdown only • Maximum file size: 10MB. PDF processing is not configured yet.</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="academic" size="sm" type="submit" disabled={uploading}>
              {uploading ? 'Processing…' : 'Process Document'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
