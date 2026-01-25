'use client';

import { Play, Pause } from 'lucide-react';
import { useRef, useState } from 'react';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
      setHasInteracted(true);
    }
  };

  return (
    <div className="mt-16 relative group max-w-4xl mx-auto">
      <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-1 shadow-2xl overflow-hidden">
        <div className="rounded-lg overflow-hidden relative">
          <video
            ref={videoRef}
            className="w-full aspect-video"
            autoPlay
            loop
            muted
            playsInline
            poster="/morpheus-poster.jpg"
          >
            <source src="/morpheus-vsl.mp4" type="video/mp4" />
          </video>

          <button
            onClick={togglePlayback}
            className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity ${
              hasInteracted
                ? 'opacity-0 group-hover:opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            }`}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
          >
            <div className="w-16 h-16 rounded-full bg-teal-500/90 flex items-center justify-center shadow-xl shadow-teal-500/30 hover:bg-teal-500 transition-colors">
              {isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white ml-1" />
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="absolute -inset-4 bg-teal-500/5 rounded-2xl blur-2xl -z-10" />
    </div>
  );
}
