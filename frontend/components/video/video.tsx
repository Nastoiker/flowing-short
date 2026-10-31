"use client"
import { VideoProps } from './VideoProps'
import { VideoCard } from '@/features/video-feed/video-card'
// Existing imports keep working while feature modules own feed behavior.
export const Video = ({video, user, activeVideo, onClickVideoProps}: VideoProps) =>
  <VideoCard video={video} user={user} active={activeVideo === video.id} activate={onClickVideoProps}/>
