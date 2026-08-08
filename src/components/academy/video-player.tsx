'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  /** YouTube video ID or full URL */
  videoId: string;
  /** Video title for accessibility */
  title: string;
  /** Optional poster/thumbnail URL */
  poster?: string;
  /** Optional CSS class */
  className?: string;
}

/**
 * Lightweight YouTube video player component with lazy-loading.
 * Renders a thumbnail placeholder until clicked, then loads the iframe.
 * This avoids loading heavy YouTube scripts until the student actually wants to watch.
 */
export function VideoPlayer({ videoId, title, poster, className }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Extract video ID from full URL if needed
  const id = videoId.includes('youtube.com')
    ? new URL(videoId).searchParams.get('v') || videoId
    : videoId.includes('youtu.be')
      ? videoId.split('/').pop()?.split('?')[0] || videoId
      : videoId;

  const thumbnailUrl = poster || `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;

  if (!isPlaying) {
    return (
      <div
        className={cn(
          'relative w-full aspect-video rounded-lg overflow-hidden cursor-pointer group bg-black',
          className
        )}
        onClick={() => setIsPlaying(true)}
        role="button"
        aria-label={`Play video: ${title}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsPlaying(true);
          }
        }}
      >
        {/* Thumbnail */}
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
          loading="lazy"
        />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-600 text-white shadow-lg group-hover:scale-110 transition-transform">
            <Play className="h-8 w-8 ml-1" fill="white" />
          </div>
        </div>

        {/* Title bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-white text-sm font-medium line-clamp-2">{title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full aspect-video rounded-lg overflow-hidden', className)}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}

/**
 * Video section component for lectures that have video content.
 * Displays a list of related videos with the lazy-loading player.
 */
interface VideoSectionProps {
  videos: Array<{
    id: string;
    title: string;
    description?: string;
    duration?: string;
  }>;
  sectionTitle?: string;
}

export function VideoSection({ videos, sectionTitle }: VideoSectionProps) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="space-y-4">
      {sectionTitle && (
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Play className="h-5 w-5 text-red-500" />
          {sectionTitle}
        </h3>
      )}
      <div className="grid gap-4">
        {videos.map((video) => (
          <div key={video.id} className="space-y-2">
            <VideoPlayer videoId={video.id} title={video.title} />
            {(video.description || video.duration) && (
              <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                {video.description && <p>{video.description}</p>}
                {video.duration && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">{video.duration}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
