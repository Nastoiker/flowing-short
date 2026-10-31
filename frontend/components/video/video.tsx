"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useGetVideosQuery } from "@/stores/slices/api"
import { useCheckAuthQuery } from "@/stores/slices/regapi"
import {
  useDeleteVideoMutation,
  useFollowChannelMutation,
  useLikeVideoMutation,
  useUnfollowChannelMutation,
  useWatchVideoMutation,
} from "@/stores/slices/user.api"
import { useWatchVideounLoginMutation } from "@/stores/slices/video.api"

import { IUser } from "@/types/User.interface"
import { Comments } from "@/components/Comment/Comments"
import CommentsModal from "@/components/Comment/commentScrollArea"
import { Report } from "@/components/Report/Report"
import { Repost } from "@/components/Repost/Repost"
import { Like } from "@/components/like/Like"
import { LikeSimple } from "@/components/like/LikeSimple"
import { SubscribeChannel } from "@/components/video/SubscribeChannel"
import { VideoProps } from "@/components/video/VideoProps"
import ProgressBar from "@/components/video/progress.video"
import View from "./View.svg"
import cn from 'classnames';
import {api_url} from "@/domen.api";
export const Video = ({
  user,
  video,
  className,
  onClickVideoProps,
                        activeVideo,
  ...props
}: VideoProps): JSX.Element => {
  const query = { videoId: video.id }
  const [likeVideo, { isLoading, isError, data, error }] =
    useLikeVideoMutation()
  const [countLike, setCount] = useState<number>(video.likesCount)
  const [liked, SetLike] = useState<boolean>(false)
  const videoRef = useRef(null)
  const [folowOnChannel] = useFollowChannelMutation()
  const [unfollowChannel] = useUnfollowChannelMutation()
  const [watchVideo] = useWatchVideoMutation()
  const [watchVideoUnLogin] = useWatchVideounLoginMutation()
  const [isFolowing, setIsFolowing] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isWatching, setIsWatching] = useState<boolean>(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  useEffect(() => {
    if (!video.music?.music_url) return;
    const audioEl = new Audio(
      `${api_url}/user/` + video.music.music_url
    )
    audioEl.addEventListener("ended", () => {
      setIsPlayingAudio(false)
    })
    setAudio(audioEl);
    return () => audioEl.pause()
  }, [])

  const handleEndVideo = async () => {
    console.log(1122211)
    if (user) {
      console.log(1122211)
      await watchVideo({ videoId: video.id })
    } else {
      await watchVideoUnLogin({ videoId: video.id })
    }
  }
  useEffect(() => {
    if (Math.floor(currentTime) == Math.floor(videoRef?.current?.duration)) {
      console.log(1)
      if (!audio) return;
      audio.currentTime = 0 // reset the current time to zero
      void audio.play().catch(() => {})
    }
    if(activeVideo!==video.id) {
      audio?.pause();
      videoRef?.current?.pause()
      setIsPlaying(false);
      setIsPlayingAudio(false);
    }
    console.log(videoRef?.current?.duration)
  }, [currentTime])
  useEffect(() => {
    console.log(user)

    if (user) {
      if (video.watchers.find((w) => w.userId === user.id)) {
        setIsWatching(true)
      }
      const checkExist = user.folowing.find(
        (f) => f.authorId === video.authorVideo.id
      )
      if (checkExist) {
        setIsFolowing(true)
      }
      console.log(1)

      const checkLike = user.Like.find((v) => v.videoId === video.id)
      checkLike && SetLike(true)
    }
  }, [])

  const handleLikeVideo = async (query) => {
    if (!user) return
    SetLike((l) => !l)

    try {
      const result = await likeVideo(query)
      console.log(result)
    } catch (err) {
      console.error(err)
    }
    liked ? setCount(countLike - 1) : setCount(countLike + 1)
  }
  useEffect(() => {
    const handleTimeUpdate = () => {
      setCurrentTime(videoRef.current?.currentTime)
    }
    videoRef.current.addEventListener("loadedmetadata", () => {
      setCurrentTime(videoRef.current.currentTime)
    })
    videoRef.current.addEventListener("timeupdate", handleTimeUpdate)
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("timeupdate", handleTimeUpdate)
      }
    }
  }, [])
  const onVideoClick = async () => {

    if (isPlaying) {
       audio?.pause();
      videoRef?.current?.pause();
      setIsPlayingAudio(false);
      setIsPlaying(false)
    } else {
      onClickVideoProps();
      setIsPlaying(true)
      setIsPlayingAudio(true)
      await audio?.play().catch(() => {});
      if (!isWatching) {
        console.log(1)
        handleEndVideo()
      }
      setIsWatching(true)
      void videoRef?.current?.play().catch(() => {})
    }
  }
  const handleWatch = () => {}
  const Folowing = async (authorId: string) => {
    if (!user) return
    user.folowers.find((f) => f)
    if (isFolowing) {
      const checkExist = user.folowing.find(
        (f) => f.authorId === video.authorVideo.id
      )
      setIsFolowing(false)
      await unfollowChannel({ id: checkExist.id, authorId })
      return new Promise((resolve) => {
        setTimeout(() => resolve(""), 1000)
      })
    }
    setIsFolowing(true)
    await folowOnChannel({ authorId })
    return new Promise((resolve) => {
      setTimeout(() => resolve(""), 1000)
    })
  }
  const videoPath = `${api_url}/video` + video.embed_link
  return (
    <div className={cn(className, 'md:flex')}>
      <div className={"flex justify-center"}>
        <div>
          <SubscribeChannel
            user={user}
            video={video}
            isSubscribe={isFolowing}
            setIsSubscribe={() => Folowing(video.authorVideo.id)}
          />

          <video
            width={350}
            height={350}
            className={"rounded-3xl w-full max-w-[400px] min-h-[500px]"}
            playsInline
            preload="metadata"
            aria-label={video.Title}

            onClick={onVideoClick}
            loop
            ref={videoRef}
            src={videoPath.replace(" ", "")}
          ></video>
          {/*<div className={"bg-black w-fit rounded-xl p-2 absolute -my-14 ml-64 text-amber-50"}>{Math.floor(currentTime)} : { videoRef.current && Math.floor(videoRef?.current?.duration)}</div>*/}
          <div
            className={
              "bg-black text-amber-50 w-[300px] absolute -my-24  mx-4 opacity-70 p-2 rounded-xl"
            }
          >
            {video.Title}
            <p className={'break-all'}>{video.Description + video.tag.map((t) => t.tag.name)}</p>
          </div>
          <div>
            <ProgressBar
              value={currentTime}
              max={videoRef?.current?.duration.toString()}
            />
            <div className={"flex justify-between px-2"}>
              <div className={"flex items-center "}>
                <div className={"flex items-center"}>
                  <Comments setIsOpen={() => setIsOpen((s) => !s)} />{" "}
                  <h1 className={"mx-2"}>{video.Comment.length}</h1>
                </div>{" "}
              </div>

              <Repost />
            </div>
          </div>
        </div>

        <div
          className={
            " -ml-16 sm:-ml-0 my-28 px-4  [&>*]:bg-gray-600 sm:[&>*]:bg-transparent  [&>*]:rounded-full  grid place-content-start gap-y-6 justify-items-center  p-5"
          }
        >
          <div className={"text-center"}>
            {isWatching ? (
              <svg
                width="37"
                height="31"
                viewBox="0 0 37 31"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18.4998 0.875C27.2618 0.875 34.5516 7.18 36.0807 15.5C34.5532 23.82 27.2618 30.125 18.4998 30.125C9.73782 30.125 2.44807 23.82 0.918945 15.5C2.44645 7.18 9.73782 0.875 18.4998 0.875ZM18.4998 26.875C21.814 26.8743 25.0297 25.7486 27.6207 23.6821C30.2117 21.6157 32.0245 18.7309 32.7624 15.5C32.0218 12.2716 30.2078 9.39001 27.6171 7.32629C25.0263 5.26258 21.8121 4.13886 18.4998 4.13886C15.1876 4.13886 11.9733 5.26258 9.38256 7.32629C6.7918 9.39001 4.97782 12.2716 4.2372 15.5C4.9751 18.7309 6.78792 21.6157 9.37893 23.6821C11.9699 25.7486 15.1857 26.8743 18.4998 26.875ZM18.4998 22.8125C16.5604 22.8125 14.7005 22.0421 13.3291 20.6707C11.9577 19.2994 11.1873 17.4394 11.1873 15.5C11.1873 13.5606 11.9577 11.7006 13.3291 10.3293C14.7005 8.95792 16.5604 8.1875 18.4998 8.1875C20.4392 8.1875 22.2992 8.95792 23.6705 10.3293C25.0419 11.7006 25.8123 13.5606 25.8123 15.5C25.8123 17.4394 25.0419 19.2994 23.6705 20.6707C22.2992 22.0421 20.4392 22.8125 18.4998 22.8125ZM18.4998 19.5625C19.5773 19.5625 20.6106 19.1345 21.3724 18.3726C22.1343 17.6108 22.5623 16.5774 22.5623 15.5C22.5623 14.4226 22.1343 13.3892 21.3724 12.6274C20.6106 11.8655 19.5773 11.4375 18.4998 11.4375C17.4224 11.4375 16.3891 11.8655 15.6272 12.6274C14.8653 13.3892 14.4373 14.4226 14.4373 15.5C14.4373 16.5774 14.8653 17.6108 15.6272 18.3726C16.3891 19.1345 17.4224 19.5625 18.4998 19.5625Z"
                  fill="currentcolor"
                />
              </svg>
            ) : (
              <svg
                width="37"
                height="31"
                viewBox="0 0 37 31"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18.4998 0.875C27.2618 0.875 34.5516 7.18 36.0807 15.5C34.5532 23.82 27.2618 30.125 18.4998 30.125C9.73782 30.125 2.44807 23.82 0.918945 15.5C2.44645 7.18 9.73782 0.875 18.4998 0.875ZM18.4998 26.875C21.814 26.8743 25.0297 25.7486 27.6207 23.6821C30.2117 21.6157 32.0245 18.7309 32.7624 15.5C32.0218 12.2716 30.2078 9.39001 27.6171 7.32629C25.0263 5.26258 21.8121 4.13886 18.4998 4.13886C15.1876 4.13886 11.9733 5.26258 9.38256 7.32629C6.7918 9.39001 4.97782 12.2716 4.2372 15.5C4.9751 18.7309 6.78792 21.6157 9.37893 23.6821C11.9699 25.7486 15.1857 26.8743 18.4998 26.875ZM18.4998 22.8125C16.5604 22.8125 14.7005 22.0421 13.3291 20.6707C11.9577 19.2994 11.1873 17.4394 11.1873 15.5C11.1873 13.5606 11.9577 11.7006 13.3291 10.3293C14.7005 8.95792 16.5604 8.1875 18.4998 8.1875C20.4392 8.1875 22.2992 8.95792 23.6705 10.3293C25.0419 11.7006 25.8123 13.5606 25.8123 15.5C25.8123 17.4394 25.0419 19.2994 23.6705 20.6707C22.2992 22.0421 20.4392 22.8125 18.4998 22.8125ZM18.4998 19.5625C19.5773 19.5625 20.6106 19.1345 21.3724 18.3726C22.1343 17.6108 22.5623 16.5774 22.5623 15.5C22.5623 14.4226 22.1343 13.3892 21.3724 12.6274C20.6106 11.8655 19.5773 11.4375 18.4998 11.4375C17.4224 11.4375 16.3891 11.8655 15.6272 12.6274C14.8653 13.3892 14.4373 14.4226 14.4373 15.5C14.4373 16.5774 14.8653 17.6108 15.6272 18.3726C16.3891 19.1345 17.4224 19.5625 18.4998 19.5625Z"
                  fill="gray"
                />
              </svg>
            )}

            {video.watchers.length}
          </div>
          <div>
            <LikeSimple isLike={liked} setLike={() => handleLikeVideo(query)} />
            <h1 className={"ml-3.5"}>{countLike}</h1>
          </div>

          <Report videoId={video.id} userId={user?.id} />
        </div>
      </div>
      <div className={"w-full"}>
        {isOpen && (
          <CommentsModal video={video} user={user}  />
        )}
      </div>
    </div>
  )
}
