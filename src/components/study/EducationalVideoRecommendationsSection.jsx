/**
 * EducationalVideoRecommendationsSection.jsx
 *
 * Studora Phase C: Educational Video Recommendation Component.
 * Responsive, polished interface presenting verified video recommendations
 * grounded in each student's course of study, department, institution,
 * registered subjects, and diagnosed weak/developing topics.
 *
 * Key Capabilities:
 *  - Browse verified educational video recommendations.
 *  - Clear display of topic, subject, verified source badge (MIT, Stanford, 3B1B, etc.).
 *  - Transparent explanation of pedagogical recommendation reason.
 *  - External video launch with reliable click/watch tracking.
 *  - Completed/Viewed status indicators with interactive toggle.
 *  - Direct "Discuss with NEXA" integration to connect videos with student learning context.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Video,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  Eye,
  PlayCircle
} from 'lucide-react';
import { Button, Badge } from '../ui';
import { api } from '../../services/api/client';

export function EducationalVideoRecommendationsSection({ onDiscussVideoWithNexa, showToast }) {
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request('/api/study/videos?limit=4');
      if (res && res.success) {
        setVideoData(res);
      }
    } catch (err) {
      console.warn('Failed to load video recommendations:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleVideoClick = async (video) => {
    // Open verified video in external tab
    window.open(video.videoUrl, '_blank', 'noopener,noreferrer');

    // If currently unwatched, mark as viewed automatically
    if (video.viewStatus === 'unwatched') {
      try {
        await api.request('/api/study/videos/progress', {
          method: 'POST',
          body: JSON.stringify({ videoId: video.id, status: 'viewed' })
        });
        setVideoData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            videos: prev.videos.map(v => v.id === video.id ? { ...v, viewStatus: 'viewed' } : v)
          };
        });
      } catch (e) {
        console.warn('Failed to track video view:', e.message);
      }
    }
  };

  const handleToggleCompletion = async (e, video) => {
    e.stopPropagation();
    const newStatus = video.viewStatus === 'completed' ? 'viewed' : 'completed';
    setUpdatingId(video.id);
    try {
      await api.request('/api/study/videos/progress', {
        method: 'POST',
        body: JSON.stringify({ videoId: video.id, status: newStatus })
      });
      setVideoData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          videos: prev.videos.map(v => v.id === video.id ? { ...v, viewStatus: newStatus } : v)
        };
      });
      showToast?.({
        type: 'success',
        title: newStatus === 'completed' ? 'Video Completed' : 'Progress Updated',
        message: newStatus === 'completed'
          ? `Marked "${video.title}" as completed!`
          : `Status updated for "${video.title}"`
      });
    } catch (err) {
      showToast?.({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to update video progress.'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !videoData) {
    return (
      <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-28 bg-gray-100 dark:bg-gray-800/50 rounded-xl" />
          <div className="h-28 bg-gray-100 dark:bg-gray-800/50 rounded-xl" />
        </div>
      </div>
    );
  }

  const videos = videoData?.videos || [];
  if (videos.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#161B22] border border-border dark:border-gray-800 rounded-card p-5 sm:p-6 shadow-sm space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#176B4D]/10 text-[#176B4D] dark:bg-[#176B4D]/20 dark:text-[#A7F3D0] flex items-center justify-center shrink-0 shadow-sm">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-ink dark:text-white">
                Recommended Educational Videos
              </h3>
              <Badge variant="academic">Verified Sources</Badge>
              {videoData?.courseOfStudy && (
                <span className="text-[11px] font-medium text-muted dark:text-white/60">
                  • {videoData.courseOfStudy}
                </span>
              )}
            </div>
            <p className="text-xs text-muted dark:text-white/70 mt-0.5">
              {videoData?.rationale || 'Curated lectures and tutorials from verified institutions aligned with your curriculum.'}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchVideos}
          icon={RotateCcw}
          className="text-xs text-muted hover:text-ink shrink-0 self-start sm:self-auto cursor-pointer"
        >
          Refresh
        </Button>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((vid) => {
          const isCompleted = vid.viewStatus === 'completed';
          const isViewed = vid.viewStatus === 'viewed';

          // Verification badge styling
          const isUni = vid.verificationStatus === 'verified_university';

          return (
            <div
              key={vid.id}
              onClick={() => handleVideoClick(vid)}
              className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isCompleted
                  ? 'bg-black/[0.02] dark:bg-white/[0.02] border-emerald-500/30'
                  : 'bg-white/80 dark:bg-white/5 border-border dark:border-gray-800 hover:border-[#176B4D]/50 hover:shadow-sm'
              }`}
            >
              {/* Top Row: Badges & Duration */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isUni 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  }`}>
                    <ShieldCheck className="w-3 h-3" />
                    {vid.publisher}
                  </span>
                  <span className="text-[10px] font-mono text-muted dark:text-white/50">
                    {vid.subjectName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {vid.durationMinutes && (
                    <span className="text-[10px] font-mono text-muted dark:text-white/50 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {vid.durationMinutes}m
                    </span>
                  )}
                  {isCompleted ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  ) : isViewed ? (
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      Viewed
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Title & Topic */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-ink dark:text-white group-hover:text-[#176B4D] dark:group-hover:text-[#A7F3D0] transition-colors line-clamp-2">
                  {vid.title}
                </h4>
                <p className="text-[11px] font-medium text-[#176B4D] dark:text-[#8FC9AE]">
                  Topic: {vid.topicName}
                </p>
                <p className="text-[11px] text-muted dark:text-white/60 line-clamp-2 leading-relaxed">
                  {vid.recommendationReason}
                </p>
              </div>

              {/* Footer Actions */}
              <div className="pt-2 border-t border-border/60 dark:border-gray-800/60 flex items-center justify-between gap-2 mt-auto">
                <span className="text-[10px] font-semibold text-muted group-hover:text-[#176B4D] dark:group-hover:text-[#A7F3D0] flex items-center gap-1">
                  <PlayCircle className="w-3.5 h-3.5" />
                  Watch on YouTube
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                </span>

                <div className="flex items-center gap-2">
                  {/* Discuss with NEXA Button */}
                  {onDiscussVideoWithNexa && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDiscussVideoWithNexa(vid);
                      }}
                      className="text-[10px] font-semibold text-[#176B4D] dark:text-[#A7F3D0] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Ask NEXA about this video"
                    >
                      <Sparkles className="w-3 h-3" />
                      Discuss
                    </button>
                  )}

                  {/* Complete/Uncomplete Toggle */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleCompletion(e, vid)}
                    disabled={updatingId === vid.id}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-black/5 dark:bg-white/10 text-muted hover:text-ink'
                    }`}
                  >
                    {isCompleted ? 'Done ✓' : 'Mark Completed'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
