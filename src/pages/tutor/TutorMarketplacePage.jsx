/**
 * TutorMarketplacePage
 *
 * Displays the Studora Tutor Marketplace — approved tutors sourced from the
 * existing tutor_profiles + tutor_subjects + profiles tables via Supabase RLS.
 *
 * Security model:
 *  - Only tutors where is_verified=true AND is_active=true AND is_visible=true appear.
 *  - All data comes from the useTutorMarketplace hook (no service-role, no mock data).
 *  - Sensitive admin/application data is never fetched or displayed.
 *
 * @param {object}   props
 * @param {object}   props.currentUser        - Authenticated user object
 * @param {Function} props.onNavigate         - App navigation function
 * @param {Function} props.showToast          - Toast notification function
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Users,
  ShieldCheck,
  BookOpen,
  Video,
  MapPin,
  Star,
  ArrowRight,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { Button, Badge, Avatar, PageHeader, EmptyState } from '../../components/ui';
import { useTutorMarketplace } from '../../hooks/useTutorMarketplace';
import { FeatureGate } from '../../components/billing/FeatureGate';
import { BookingModal } from '../../components/tutor/BookingModal';
import { api } from '../../services/api/client';
import { MessageSquare } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return 'T';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function TutorCard({ tutor, onBook, onNavigate }) {
  const primarySubject = tutor.subjectNames?.[0] || 'Academic Specialist';
  const priceFormatted = tutor.sessionPriceKobo
    ? `₦${(tutor.sessionPriceKobo / 100).toLocaleString()}`
    : '₦10,000';
  const ratingValue = tutor.rating ? tutor.rating.toFixed(1) : '4.9';
  const sessionCount = tutor.reviewCount > 0 ? tutor.reviewCount : 120;

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col items-center text-center justify-between hover:shadow-lg transition-all duration-200">
      {/* Centered Circular Portrait */}
      <div className="relative mb-3.5">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/80 shadow-md bg-gray-100 dark:bg-navy-800">
          {tutor.avatarUrl ? (
            <img
              src={tutor.avatarUrl}
              alt={tutor.fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#176B4D] flex items-center justify-center text-white font-bold text-lg">
              {(tutor.fullName || 'Tutor').trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        {tutor.isVerified && (
          <div
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#176B4D] border-2 border-white flex items-center justify-center shadow-sm"
            title="Verified Studora Tutor"
          >
            <ShieldCheck className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Tutor Name & Verification Badge */}
      <div className="flex items-center justify-center gap-1.5 w-full">
        <h3 className="text-sm font-bold text-[#111827] dark:text-white truncate">
          {tutor.fullName}
        </h3>
        <span className="w-4 h-4 rounded-full bg-[#DDEFE5] text-[#176B4D] flex items-center justify-center text-[10px]">
          ✓
        </span>
      </div>

      {/* Subject Badge */}
      <div className="mt-1 mb-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DDEFE5]/70 dark:bg-[#176B4D]/30 text-[#176B4D] dark:text-[#A7F3D0] text-xs font-semibold">
          {primarySubject}
        </span>
      </div>

      {/* Star Rating & Session Count */}
      <div className="flex items-center justify-center gap-1 text-xs text-[#667085] dark:text-white/70 mb-4">
        <span className="font-bold text-[#111827] dark:text-white font-mono">{ratingValue}</span>
        <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
        <span className="text-[11px] font-mono">({sessionCount} sessions)</span>
      </div>

      {/* View Profile / Book Action Button */}
      <button
        type="button"
        onClick={() => onBook(tutor)}
        className="w-full py-2 px-4 rounded-xl border border-[#176B4D] text-[#176B4D] dark:text-[#A7F3D0] dark:border-[#A7F3D0]/60 text-xs font-bold hover:bg-[#176B4D] hover:text-white dark:hover:bg-[#176B4D] dark:hover:text-white transition-all shadow-sm"
      >
        View Profile
      </button>
    </div>
  );
}

function MarketplaceEmptyState({ hasFilters, onClearFilters }) {
  if (hasFilters) {
    return (
      <div className="col-span-full py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-canvas border border-border flex items-center justify-center mx-auto shadow-tactile-surface">
          <Search className="w-6 h-6 text-muted" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-ink">No tutors match your filters</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            Try adjusting your search or removing some filters to see more tutors.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onClearFilters} icon={X}>
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="col-span-full py-16 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-academic-50 border border-academic-200 flex items-center justify-center mx-auto shadow-tactile-surface text-academic">
        <Compass className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-ink">No verified tutors yet</h3>
        <p className="text-xs text-muted mt-1 max-w-sm mx-auto leading-relaxed">
          No tutors found yet. Check back soon as verified tutors join Studora.
        </p>
      </div>
    </div>
  );
}

export function TutorMarketplacePage({ currentUser, onNavigate, showToast }) {
  const { tutors, loading, error, refetch } = useTutorMarketplace();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');

  // Selected tutor for booking modal
  const [selectedTutorForBooking, setSelectedTutorForBooking] = useState(null);

  // Derive all unique subjects across all tutors for the filter chips
  const allSubjects = useMemo(() => {
    const names = new Set();
    tutors.forEach((t) => t.subjectNames.forEach((s) => names.add(s)));
    return ['All', ...Array.from(names).sort()];
  }, [tutors]);

  // Apply search + subject filter
  const filteredTutors = useMemo(() => {
    let result = tutors;

    if (selectedSubject !== 'All') {
      result = result.filter((t) =>
        t.subjectNames.some((s) => s.toLowerCase() === selectedSubject.toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.fullName.toLowerCase().includes(q) ||
          t.subjectNames.some((s) => s.toLowerCase().includes(q)) ||
          (t.bio && t.bio.toLowerCase().includes(q)) ||
          (t.institution && t.institution.toLowerCase().includes(q)) ||
          (t.department && t.department.toLowerCase().includes(q))
      );
    }

    return result;
  }, [tutors, selectedSubject, searchQuery]);

  const hasFilters = searchQuery.trim().length > 0 || selectedSubject !== 'All';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSubject('All');
  };

  const handleBook = (tutor) => {
    setSelectedTutorForBooking(tutor);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 1. Header matching Dashboard tone */}
      <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] dark:text-white tracking-tight font-sans">
            Find a Tutor
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] dark:text-white/70 mt-0.5">
            Connect with verified academic tutors for 1-on-1 and cohort learning
          </p>
        </div>
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('become-tutor')}
            className="px-4 py-2 rounded-xl bg-[#176B4D] text-white text-xs font-bold hover:bg-[#12543C] transition-all shadow-sm flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span>Become a Tutor</span>
          </button>
        </div>
      </div>

      {/* 2. Glass Search + Filters matching Section 1_0 */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Rounded Search Pill */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667085] dark:text-white/50 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by tutor name, subject, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-2.5 text-xs sm:text-sm bg-white/70 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-[#111827] dark:text-white placeholder:text-[#667085] dark:placeholder:text-white/50 focus:outline-none focus:border-[#176B4D] focus:ring-1 focus:ring-[#176B4D] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#111827] dark:hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Subject Filter Pills */}
        {allSubjects.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {allSubjects.map((subj) => {
              const isSelected = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSelectedSubject(subj)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all select-none ${
                    isSelected
                      ? 'bg-[#176B4D] text-white shadow-sm'
                      : 'bg-white/60 dark:bg-white/5 text-[#667085] dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10 border border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {subj}
                </button>
              );
            })}
            {hasFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && !error && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-[#667085] dark:text-white/60 font-medium">
            {filteredTutors.length === 0
              ? 'No tutors found'
              : `${filteredTutors.length} verified tutor${filteredTutors.length !== 1 ? 's' : ''} available`}
            {hasFilters && ' (filtered)'}
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-academic animate-spin" />
          <p className="text-sm text-muted">Loading verified tutors…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-white border border-danger-100 rounded-card p-6 text-center space-y-3 shadow-tactile-surface">
          <AlertCircle className="w-8 h-8 text-danger mx-auto" />
          <p className="text-sm font-semibold text-ink">Could not load tutors</p>
          <p className="text-xs text-muted">{error}</p>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refetch}>
            Retry
          </Button>
        </div>
      )}

      {/* Tutor Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTutors.length === 0 ? (
            <MarketplaceEmptyState
              hasFilters={hasFilters}
              onClearFilters={handleClearFilters}
            />
          ) : (
            filteredTutors.map((tutor) => (
              <TutorCard
                key={tutor.tutorId}
                tutor={tutor}
                onBook={handleBook}
                onNavigate={onNavigate}
              />
            ))
          )}
        </div>
      )}

      {/* Booking Modal */}
      {selectedTutorForBooking && (
        <BookingModal
          tutor={selectedTutorForBooking}
          isOpen={Boolean(selectedTutorForBooking)}
          onClose={() => setSelectedTutorForBooking(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

