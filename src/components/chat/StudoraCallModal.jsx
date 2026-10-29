import React, { useEffect, useState, useMemo } from 'react';
import {
  StreamCall,
  StreamTheme,
  SpeakerLayout,
  CallControls,
  RingingCall,
  CallingState,
  useCallStateHooks
} from '@stream-io/video-react-sdk';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Loader2,
  Users,
  AlertCircle,
  Phone,
  Maximize2,
  Minimize2
} from 'lucide-react';

/**
 * Inner call UI rendered inside StreamCall context
 */
function ActiveCallContent({ call, callType = 'video', recipientName = 'Participant', onLeave }) {
  const {
    useCallCallingState,
    useMicrophoneState,
    useCameraState,
    useParticipantCount
  } = useCallStateHooks();

  const callingState = useCallCallingState();
  const micState = useMicrophoneState();
  const camState = useCameraState();
  const participantCount = useParticipantCount();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const isJoined = callingState === CallingState.JOINED;
  const isRinging = callingState === CallingState.RINGING;
  const isJoining = callingState === CallingState.JOINING;
  const isLeft = callingState === CallingState.LEFT;

  // Track mic and camera toggling
  const isMicMuted = micState?.status === 'disabled';
  const isCamMuted = camState?.status === 'disabled';

  const toggleMic = async () => {
    try {
      if (call.microphone) {
        await call.microphone.toggle();
      }
    } catch (e) {
      console.warn('[CallModal] Error toggling mic:', e);
    }
  };

  const toggleCam = async () => {
    try {
      if (call.camera) {
        await call.camera.toggle();
      }
    } catch (e) {
      console.warn('[CallModal] Error toggling cam:', e);
    }
  };

  const handleEndCall = async () => {
    try {
      if (call.isCreatedByMe) {
        await call.endCall();
      } else {
        await call.leave();
      }
    } catch (e) {
      console.warn('[CallModal] Error ending call:', e);
    } finally {
      onLeave?.();
    }
  };

  useEffect(() => {
    if (isLeft) {
      const timer = setTimeout(() => {
        onLeave?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isLeft, onLeave]);

  return (
    <div className={`flex flex-col h-full w-full bg-slate-950 text-white rounded-2xl overflow-hidden shadow-2xl ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'relative'
    }`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">
            {callType === 'audio' ? 'Voice Call' : 'Video Call'} • {recipientName}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
            {callingState.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mr-2">
            <Users className="w-3.5 h-3.5" />
            <span>{participantCount || 1}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main stage */}
      <div className="flex-1 relative min-h-0 bg-slate-950 flex items-center justify-center overflow-hidden">
        {isRinging && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-academic/20 border-2 border-academic flex items-center justify-center animate-bounce mb-4">
              <Phone className="w-8 h-8 text-academic animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Ringing {recipientName}…</h3>
            <p className="text-xs text-slate-400 mb-6">Waiting for participant to join</p>
            <button
              type="button"
              onClick={handleEndCall}
              className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-lg"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Cancel Call</span>
            </button>
          </div>
        )}

        {isJoining && (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-academic animate-spin" />
            <p className="text-xs text-slate-300">Connecting to secure encrypted media room…</p>
          </div>
        )}

        {isJoined && (
          <StreamTheme>
            <div className="w-full h-full flex flex-col">
              <SpeakerLayout participantsBarPosition="bottom" />
            </div>
          </StreamTheme>
        )}

        {isLeft && (
          <div className="flex flex-col items-center justify-center space-y-2 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-semibold text-slate-200">Call has ended</p>
            <p className="text-xs text-slate-400">Closing window…</p>
          </div>
        )}
      </div>

      {/* Call controls footer */}
      {isJoined && (
        <div className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleMic}
            className={`p-3 rounded-full transition-all shadow-md ${
              isMicMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
            title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label="Toggle microphone"
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {callType === 'video' && (
            <button
              type="button"
              onClick={toggleCam}
              className={`p-3 rounded-full transition-all shadow-md ${
                isCamMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
              title={isCamMuted ? 'Turn on camera' : 'Turn off camera'}
              aria-label="Toggle camera"
            >
              {isCamMuted ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleEndCall}
            className="p-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-lg hover:scale-105 active:scale-95"
            title="End call"
            aria-label="End call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * StudoraCallModal
 *
 * Full-featured calling modal wrapping GetStream's StreamCall context provider.
 * Supports:
 * - One-to-one voice calls
 * - One-to-one video calls
 * - Microphone / camera toggles & permissions
 * - Ringing & connection states
 * - Graceful leave & end call handling
 */
export function StudoraCallModal({
  isOpen,
  call,
  callType = 'video',
  recipientName = 'Participant',
  onClose
}) {
  if (!isOpen || !call) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl h-[85vh] max-h-[720px] flex flex-col">
        <StreamCall call={call}>
          <ActiveCallContent
            call={call}
            callType={callType}
            recipientName={recipientName}
            onLeave={onClose}
          />
        </StreamCall>
      </div>
    </div>
  );
}
