"use client"
import { useParams } from "next/navigation"

import {useEffect, useState} from "react"
import {notFound, useSearchParams} from "next/navigation"
import {useAppDispatch, useAppSelector} from "@/stores"

import { IVideo } from "@/types/Video.interface"
import { LayoutVideo } from "@/components/Layot.video"
import { LayoutFounded } from "@/components/layout/layout.founded"
import {searchContent} from "@/stores/slices/search.slice";
import {LayoutMusic} from "@/components/Layout.music";
import {LayoutChannels} from "@/components/Layout.channel";
import {useCheckAuthQuery} from "@/stores/slices/regapi";

export interface VideoByCategory {
  id: string
  name: string
  alias: string
  firstLevelId: string
  videos: IVideo[]
}



export default function PageFounded() {
  const found = useParams<{founded:string}>().founded;
  const [search, setSearch] = useState();
  const searchParams = useSearchParams();
  const  user = useCheckAuthQuery({});
  const searchvValue = searchParams.get('byValue');
  const searchState = found;
  const [activeFound, setActiveFound] = useState<string>('video');
  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(searchContent(searchState));
  }, [searchState])
  const video = useAppSelector(state => state.search.found);
  console.log(video);
  if(!video) {
    return <div>Ничего не найдено</div>;
  }
  return (
    <div className="  w-full">
      <LayoutFounded active={activeFound} setActiveFounded={(s) => setActiveFound(s)} />
      <div className="space-y-4 border rounded-lg p-2 sm:p-5">
        <h1 className="inline-block text-4xl font-extrabold tracking-tight lg:text-5xl">
          {searchState}
        </h1>
        {
          activeFound==='video' && <LayoutVideo user={user.data?.email && user.data} videos={video.videos} />
        }
        {
          activeFound==='channels' && <LayoutChannels channels={video.channels} />
        }
         {
          activeFound==='tags' && <LayoutVideo user={user.data?.email && user.data}  videos={video.tags} />
        }
        {
          activeFound === 'musics' && <LayoutMusic user={user.data?.email && user.data} musics={video.musics} />
        }
      </div>
    </div>
  )
}
