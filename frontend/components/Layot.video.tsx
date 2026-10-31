"use client"

import {useCallback, useMemo, useState, useEffect} from "react"
import { useCheckAuthQuery } from "@/stores/slices/regapi"
import { useFollowsQuery } from "@/stores/slices/user.api"

import { IUser } from "@/types/User.interface"
import { IVideo } from "@/types/Video.interface"
import { Htag } from "@/components/Htag/Htag"
import { SortButton } from "@/components/Sorts/Sort.button"
import { Video } from "@/components/video/video"

interface LayoutProps {
  children: React.ReactNode
}


export function LayoutVideo({
  videos = [],
  user,
}: {
  videos: IVideo[]
  user?: IUser
}) {

  const [filteredVideo, setFilteredVideo ] = useState<IVideo[]>(videos);
  useEffect(() => setFilteredVideo(videos), [videos]);
  const follow = useFollowsQuery({});
  const [activeVideoValue, setActiveVideo] = useState(null)
  const [commentsVisible, setCommentsVisible] = useState({})

  const FilterByDate = useCallback(function (videos) {
    const sort = [...videos]
    const sortByTime = sort?.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    return sortByTime
  },[]);

  const filerLike = useCallback(function (videos: IVideo[]) {
    const sort = [...videos];
    const sortByTime = sort?.sort((a, b) =>  Number(b.likesCount) - Number(a.likesCount));
    return sortByTime
  }, []);
  const FilterBySubs= useCallback(function (videos: IVideo[]) {
    const sort = [...videos]
    const sortByTime = sort?.sort(
      (a, b) => a.authorVideo.subscribers_count - b.authorVideo.subscribers_count
    )
    return sortByTime
  }, []);

  const handleToggleComments = (videoId) => {
    setCommentsVisible((prev) => ({
      ...prev,
      [videoId]: !prev[videoId],
    }))
  }

  const isCommentsVisible = (videoId) => {
    return Boolean(commentsVisible[videoId])
  }
  console.log(videos)
  const filterByDate = useMemo(() => FilterByDate(videos), [videos])
  const filterByLike = useMemo(() => filerLike(videos), [videos])
  const filterBySubs = useMemo(() => FilterBySubs(videos), [videos])
  if(!videos) {
    return <div></div>;
  }
  // const user = useCheckAuthQuery({})
  return (
    <div className={"mx-auto flex"}>
      <div>
        {filteredVideo.length > 0 ? (
          filteredVideo.map((v) => <Video activeVideo={activeVideoValue} onClickVideoProps={() => setActiveVideo(v.id)} key={v.id} user={user && user} video={v} />)
        ) : (
          <div className={"mx-auto"}>
            <Htag type={"h1"}> Ничего не найдено</Htag>
          </div>
        )}
      </div>
      <SortButton
        className=" top-18 right-5 xl:right-44"
        sortByLike={() => {setFilteredVideo(filterByLike)}}
        sortByDate={() => {setFilteredVideo(filterByDate)}}
      />
    </div>
  )
}
