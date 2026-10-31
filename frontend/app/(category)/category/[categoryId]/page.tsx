import { notFound } from "next/navigation"
import { useCheckAuthQuery } from "@/stores/slices/regapi"

import { IVideo } from "@/types/Video.interface"
import { LayoutVideo } from "@/components/Layot.video"
import {LayoutVideoCategory} from "@/components/Layout.category";
import axios from "axios";
import {getCategory} from "@/actions/getCategory";
export const dynamic = 'force-dynamic';
export interface VideoByCategory {
  id: string
  name: string
  alias: string
  firstLevelId: string
  videos: IVideo[]
}

interface PageProps {
  params: Promise<{ categoryId: string }>,
};
// async function getCategory(alias) {
//   try {
//     const res =  await axios.get("http://127.0.0.1:8000/Video/category/:" + alias);
//     return await res.data;
//   } catch (e) {
//     console.log(e.message);
//   }

  // try {
  //   const res = await axios.get("http://localhost:8000/Video/category/:" + alias)
  //   if (!res?.ok) {
  //     return null
  //   }
  //   console.log(res)
  //
  //   return await res.json();
  // } catch (e) {
  //   return null
  // }
// }

export default async function PageCategory({ params }: PageProps) {
  const slug = (await params).categoryId;
  const videos = await getCategory(slug);
  if (!videos?.videos)  {
    notFound();
  }
  console.log(slug);
  const result = videos.videos;
  return (
    <section className={"grid  "}>
    <div className={"flex max-w-[980px] mx-auto flex-col gap-2"}  >
      <div className="space-y-4">
        <h1 className="inline-block text-4xl font-extrabold tracking-tight  lg:text-5xl">
          {slug}
        </h1>
      </div>
      <LayoutVideoCategory videos={result} />
      <hr className="my-4 border-slate-200" />
    </div>
    </section>
  )
}
