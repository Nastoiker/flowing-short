"use client"

import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
//изменить
import UserIcon from "@/public/User.svg"
import { useDeleteVideoMutation } from "@/stores/slices/user.api"

import { IUser } from "@/types/User.interface"
import { IVideo } from "@/types/Video.interface"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ButtonDeleteVideo } from "@/components/video/ButtonDeleteVideo"
import { VideoProps } from "@/components/video/VideoProps"
import {api_url} from "@/domen.api";

export const SubscribeChannel = ({
  video,
  user,
  isSubscribe,
  setIsSubscribe,
}: {
  video: IVideo
  user?: IUser
  isSubscribe: boolean
  setIsSubscribe: () => void
}): JSX.Element => {
  const followChannel = () => {}
  const unFolllowChannel = () => {}
  const [deleteVideo, deleted] = useDeleteVideoMutation()

  const deleteVideoHandler = async (id: string) => {
    try {
      const result = await deleteVideo(id)
      console.log(result)
    } catch (err) {
      console.error(err)
    }
  }
  return (
    <div className="z-10 ml-2 absolute flex justify-between my-8 sm:w-96 w-80">
      {isSubscribe ? (
        <>
          <div
            className={" bg-black bg-opacity-70  pr-3.5 rounded-3xl text-white"}
          >
            <HoverCard>
              <HoverCardTrigger asChild>
<Link
                  className={"flex items-center space-x-2"}
                  href={"/channel/" + video.authorVideo.id}
                >
                  <img
                    className={"rounded-full w-12 h-12"}
                    width={50}
                    height={50}
                    alt={"userSubs"}
                    src={
                      video.authorVideo.avatar
                        ? `${api_url}/user` +
                          video.authorVideo.avatar
                        : UserIcon
                    }
                  />
                  <div className={" w-fit"}>
                    <h4 className={""}>{video.authorVideo.login}</h4>
                  </div>
                </Link>
              </HoverCardTrigger>
              <HoverCardContent>
                <p>{video.authorVideo.login}</p>
                <h1>Likes: {video.authorVideo.LikeCount}</h1>
                <p>folowers: {video.authorVideo.subscribers_count}</p>
              </HoverCardContent>
            </HoverCard>
          </div>
          {video.authorVideo.id === user?.id ? (
            <ButtonDeleteVideo
              deleteVideo={() => deleteVideoHandler(video.id)}
            />
          ) : (
            <Button
              onClick={() => setIsSubscribe()}
              className={"bg-red-500 h-12 border-red right-0"}
            >
              Отписаться
            </Button>
          )}
        </>
      ) : (
        <>
          {" "}
          <div
            className={" bg-black bg-opacity-70  pr-3.5 rounded-3xl text-white"}
          >
            <HoverCard>
              <HoverCardTrigger asChild>
<Link
                  className={"flex items-center  space-x-2"}
                  href={"/channel/" + video.authorVideo.id}
                >
                  {" "}
                  <img
                    className={"rounded-full w-12 h-12"}
                    width={50}
                    height={50}
                    alt={"userSubs"}
                    src={
                      video.authorVideo.avatar
                        ? `${api_url}/user` +
                          video.authorVideo.avatar
                        : UserIcon
                    }
                  />
                  <div className={" w-fit"}>
                    <h4 className={""}>{video.authorVideo.login}</h4>
                  </div>
                </Link>
              </HoverCardTrigger>
              <HoverCardContent>
                <p>{video.authorVideo.login}</p>
                <h1>Likes: {video.authorVideo.LikeCount}</h1>
                <p>folowers: {video.authorVideo.subscribers_count}</p>
              </HoverCardContent>
            </HoverCard>
          </div>
          {video.authorVideo.id === user?.id ? (
            <ButtonDeleteVideo
              deleteVideo={() => deleteVideoHandler(video.id)}
            />
          ) : (
            <Button
              onClick={() => setIsSubscribe()}
              className={"bg-red-500 h-12 border-red right-0"}
            >
              Подписаться
            </Button>
          )}
        </>
      )}
    </div>
  )
}
