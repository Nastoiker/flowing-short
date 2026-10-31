"use client"
import { useCurrentUser } from '@/features/auth/use-current-user'


import { useState } from "react"
  import { useRouter } from "next/navigation"
import {
  useCreateCategoryMutation,
  useCreateSecondCategoryMutation, useMusicsAllQuery, useUsersQuery, useVideoWithReportQuery,
} from "@/stores/slices/admin.api"


import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {CreateFirstCategoryComponent} from "@/components/admin/createFirstCategory";
import {CreateSecondCategory} from "@/components/admin/createSecondCategory";
import {Htag} from "@/components/Htag/Htag";
import {LayoutUserForAdmin} from "@/components/admin/UsersAdminLayout";
import {Input} from "@/components/ui/input";
import {DeleteFirstCategory} from "@/components/admin/deleteFirstCategory";
import {DeleteSecondCategoryComponent} from "@/components/admin/deleteSecondCategory";
import {LayoutVideoforAdmin} from "@/components/admin/LayoutVideoAdmin";

export default function IndexPage() {
  const [currentSector, setCurrentSector] = useState<string>( );

  // const [createCategory, Category] = useCreateCategoryMutation({});
  // const [createSecond, Second] = useCreateSecondCategoryMutation({});
  // const musics = useMusicsAllQuery({});
  const {data, isLoading, error} = useCurrentUser();
  const users = useUsersQuery({}, {skip: data?.role !== 'admin'});
  const router = useRouter();
  const video = useVideoWithReportQuery({}, {skip: data?.role !== 'admin'});
  const [searchtUser, setSearchUser] = useState<string>('');
  const [searchVideo, setSearchVideo] = useState<string>('');

  if(isLoading) {
    return <div></div>;
  }
  if (!data || data.role !== 'admin' || error) return <p>Доступ только для администратора.</p>
  return <div className={"mx-auto w-full"}>
    <h1 className="inline-block my-10 text-4xl font-extrabold tracking-tight lg:text-5xl">
     Admin
    </h1>
    <div className={'pl-2 border rounded-md p-2 sm:flex sm:space-x-5'}>
      <div  className={cn(
        " py-5 pointer  transition-all hover:border-b-4 ",
        currentSector === "createCategory" && "border-b-4 "
      )} onClick={() => setCurrentSector('createCategory')}>
        <h1 className={'font-extrabold tracking-tight'}>
          Создание категории
        </h1>
      </div>
      <div   className={cn(
        " py-5 pointer  transition-all hover:border-b-4 ",
        currentSector === "video" && "border-b-4 "
      )} onClick={() => setCurrentSector('video')}><h1 className={'font-extrabold tracking-tight'}>
        Видео
      </h1></div>
      <div    className={cn(
        " py-5 pointer   transition-all hover:border-b-4 ",
        currentSector === "users" && "border-b-4"
      )} onClick={() => setCurrentSector('users')}><h1 className={'font-extrabold tracking-tight'}>
        Пользователи
      </h1></div>
      <div   className={cn(
        " py-5 pointer transition-all hover:border-b-4 ",
        currentSector === "musics" && "border-b-4"
      )}  onClick={() => setCurrentSector('musics')}><h1 className={'font-extrabold tracking-tight'}>Музыка</h1></div>
    </div>
    {
      currentSector==='createCategory' && <div className={'space-y-10 width-[900px]'}>
      <div className={'border rounded-lg p-5'}>
        <Htag type={'h1'}>Создание первой категории</Htag>
        <CreateFirstCategoryComponent />
      </div>
      <div className={'border rounded-lg p-5'}>
        <Htag type={'h1'}>Создание второй категории</Htag>
        <CreateSecondCategory />
      </div>
        <div  className={'border rounded-lg p-5'}>
          <Htag type={'h1'}>Удаление первой категории</Htag>
        <DeleteFirstCategory  />
        </div>
      <div  className={'border rounded-lg p-5'}>
        <Htag type={'h1'}>Удаление второй категории</Htag>
        <DeleteSecondCategoryComponent />
      </div>
      </div>
    }
    {
      currentSector==='users' && <div>
      <Input placeholder='Поиск пользователя' onChange={(e) => {setSearchUser(e.target.value)}} />
      <LayoutUserForAdmin sortBy={searchtUser} channels={users.data && users.data } />
      </div>
    }
    {
      currentSector==='musics' && <div>

      </div>
    }
    {
      currentSector==='video' && <div>
        <Input placeholder='Поиск видео' onChange={(e) => {setSearchVideo(e.target.value)}} />
        <LayoutVideoforAdmin sortBy={searchVideo} video={video.data && video.data} />
      </div>
    }
  </div>
}
