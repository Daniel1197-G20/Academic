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
  const subjectLabels = tutor.subjectNames.slice(0, 3);
  const hasMoreSubjects = tutor.subjectNames.length > 3;
  const priceFormatted = tutor.sessionPriceKobo
    ? `₦${(tutor.sessionPriceKobo / 100).toLocaleString()}`
    : '₦10,000';

  return (
    <div className="bg-white border border-border rounded-card shadow-tactile-raised flex flex-col justify-between hover:shadow-tactile-hero transition-all duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-5 space-y-4">
        {/* Avatar + name row */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <Avatar
              name={tutor.fullName}
              src={tutor.avatarUrl}
              size="lg"
            />
            {tutor.isVerified && (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-academic border-2 border-white flex items-center justify-center"
                title="Verified Studora Tutor"
              >
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink truncate">{tutor.fullName}</h3>
              <span className="text-xs font-bold font-mono text-academic shrink-0">{priceFormatted}</span>
            </div>
            <p className="text-xs text-muted mt-0.5 truncate">{tutor.title}</p>
            {tutor.rating != null && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3 h-3 text-gold-500 fill-gold-500 shrink-0" />
                <span className="text-xs font-semibold font-mono text-ink">
                  {tutor.rating.toFixed(1)}
                </span>
                {tutor.reviewCount > 0 && (
                  <span className="text-[11px] text-muted">({tutor.reviewCount})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio snippet */}
        {tutor.bio && (
          <p className="text-xs text-muted leading-relaxed line-clamp-2">{tutor.bio}</p>
        )}

        {/* Subjects */}
        {subjectLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {subjectLabels.map((s) => (
              <span
                key={s}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-academic-50 border border-academic-200 text-academic"
              >
                {s}
              </span>
            ))}
            {hasMoreSubjects && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-canvas border border-border text-muted">
                +{tutor.subjectNames.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="pt-2 border-t border-border space-y-1 text-[11px] text-muted font-mono">
          {tutor.institution && (
            <p className="truncate">
              <span className="text-muted">Institution:</span>{' '}
              <span className="text-ink">{tutor.institution}</span>
            </p>
          )}
          {tutor.academicLevel && (
            <p className="truncate">
              <span className="text-muted">Level:</span>{' '}
              <span className="text-ink">{tutor.academicLevel}</span>
            </p>
          )}
        </div>
      </div>

      {/* CTA Footer */}
      <div className="px-5 pb-5">
        <FeatureGate
          feature="TUTOR_BOOKING"
          featureTitle="Book a Verified Tutor"
          description="Booking tutoring sessions requires Student plan or above."
          requiredPlan="Student"
          requiredPlanCode="student"
          onUpgrade={() => onNavigate('pricing')}
        >
          <Button
            variant="academic"
            size="sm"
            className="w-full shadow-tactile-btn"
            onClick={() => onBook(tutor)}
          >
            Book a Session ({priceFormatted})
          </Button>
        </FeatureGate>
      </div>
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

// ── Main Page ─────────────────────────────────────────────────────────────────

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
    <div className="max-w-6xl space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="academic">Studora Marketplace</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Find a Tutor
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Connect with verified Studora tutors who can help you learn, prepare, practice,
            and make progress — online or in person.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('become-tutor')}
            icon={Users}
          >
            Become a Tutor
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by tutor name, subject, or keyword…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-border rounded-card text-ink placeholder:text-muted focus:outline-none focus:border-academic focus:ring-1 focus:ring-academic/30 transition-colors shadow-tactile-surface"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Subject Filters */}
        {allSubjects.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {allSubjects.map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-all select-none
                  ${selectedSubject === subj
                    ? 'bg-academic text-white shadow-tactile-btn'
                    : 'bg-white border border-border text-muted hover:text-ink hover:border-gray-300'
                  }`}
              >
                {subj}
              </button>
            ))}
            {hasFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 rounded-btn text-xs font-medium text-muted hover:text-danger transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && !error && (
        <p className="text-[11px] text-muted font-mono">
          {filteredTutors.length === 0
            ? 'No tutors found'
            : `${filteredTutors.length} verified tutor${filteredTutors.length !== 1 ? 's' : ''} available`}
          {hasFilters && ' (filtered)'}
        </p>
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

