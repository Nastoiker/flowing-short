"use client"
import { useParams } from "next/navigation"
import Link from "next/link"
import { notFound } from "next/navigation"
import { useCheckAuthQuery } from "@/stores/slices/regapi"

import { IUser } from "@/types/User.interface"
import { LayoutVideo } from "@/components/Layot.video"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Profile from "@/components/user/Profile.svg";
import {useAppDispatch, useAppSelector} from "@/stores";
import {useEffect} from "react";
import {searchVideoByTag} from "@/stores/slices/tag.slice";



export default  function PagePage() {
  const id = useParams<{tagId:string}>().tagId;
  const dispatch = useAppDispatch();

  const tag = id;
  useEffect(() => {
    dispatch(searchVideoByTag(tag));
  },[tag]);
  const videos = useAppSelector(state=> state.tag.videos);
  const  user = useCheckAuthQuery({});
  if(!videos) {
    return <div>loading</div>
  }
  return (
    <section className={"grid  "}>
    <div className={"flex max-w-[980px] mx-auto flex-col gap-2"}>
      <div>
        <h1 className="inline mr-2 text-3xl font-extrabold leading-tight tracking-tighter md:text-5xl lg:text-6xl lg:leading-[1.1]">
          #{tag}
        </h1>
        <span>{videos.length}</span>
      </div>
      <LayoutVideo user={user.data && user.data}  videos={ videos}  />
    </div>
    </section>
  )
}
