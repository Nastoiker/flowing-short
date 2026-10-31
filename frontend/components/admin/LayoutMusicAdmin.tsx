"use client"

import {useCallback, useEffect, useMemo, useState} from "react"

import { useFollowsQuery } from "@/stores/slices/user.api"

import { IMusic } from "@/types/Music.interface"
import { IUser } from "@/types/User.interface"
import { IVideo } from "@/types/Video.interface"
import { Htag } from "@/components/Htag/Htag"
import { Music } from "@/components/Music/Music"
import { SortButton } from "@/components/Sorts/Sort.button"
import { Video } from "@/components/video/video"

interface LayoutProps {
  children: React.ReactNode
}
function FilterByDate(videos) {
  const sort = [...videos]
  const sortByTime = sort?.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  return sortByTime
}
function FilterByLike(videos: IVideo[]) {
  const sort = [...videos]
  const sortByTime = sort?.sort((a, b) => a.likesCount - b.likesCount)
  return sortByTime
}
function FilterBySubs(videos: IVideo[]) {
  const sort = [...videos]
  const sortByTime = sort?.sort(
    (a, b) => a.authorVideo.subscribers_count - b.authorVideo.subscribers_count
  )
  return sortByTime
}
export function LayoutMusic({
                              musics,
                            }: {
  musics: IMusic[]
}) {
  const [activeMusicValue, setActiveMusicValue] = useState<string>(null);
  const [filteredVideo, setFilteredVideo ] = useState<IMusic[]>(musics);


  const FilterByDate = useCallback(function (videos) {
    const sort = [...videos]
    const sortByTime = sort?.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    return sortByTime
  },[]);
  const filterByDate = useMemo(() => FilterByDate(musics), [musics])
  return (
    <div className={"mx-auto flex"}>
      <div className={"w-full mr-20"}>
        {filteredVideo.length>0  ? (
          musics.map((m) => <Music activeMusic={activeMusicValue} setActiveMusic={() => setActiveMusicValue(m.id)} music={m} />)
        ) : (
          <div className={"mx-auto"}>
            <Htag type={"h1"}> Ничего не найдено</Htag>
          </div>
        )}
      </div>
      <SortButton
        className=" top-25 right-5 xl:right-44"
        sortByLike={() => {}}
        sortByDate={() => {setFilteredVideo(filterByDate)}}
      />
    </div>
  )
}
