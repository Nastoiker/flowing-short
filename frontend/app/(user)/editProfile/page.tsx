"use client"
import { useCurrentUser } from '@/features/auth/use-current-user'


import {ChangeEvent, useEffect, useRef, useState} from "react"
import Image from "next/image"
import Link from "next/link"
import { useGetVideosQuery } from "@/stores/slices/api"

import { useEditProfileMutation } from "@/stores/slices/user.api"
import { scaleDiverging } from "d3-scale"
import { useForm } from "react-hook-form"

import { IEditProfileInterface } from "@/types/EditProfile.interface"
import { LayoutVideo } from "@/components/Layot.video"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import Profile from "@/components/user/Profile.svg"
import {useRouter} from "next/navigation";
import axios from "axios";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {AlertCircle} from "lucide-react";
import {IState} from "@/components/forms/createVideo/createVideo";
import {api_url} from "@/domen.api";

export default function IndexPage() {
  const { data, isLoading, error } = useCurrentUser();
  const [file, setFile] = useState<File>();
  const [EditProfile] = useEditProfileMutation();
  const [onDrag, setOnDrag] = useState<boolean>(false);
  const picture = useRef(null);
  const [selectedFile, setSelectedFile] = useState<any>();
  const router = useRouter();
  const [state, setState] = useState<IState>({ loading: false, error: false, success: false });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<IEditProfileInterface>({
    defaultValues: {
      login: data?.login,
      phone: data?.phone,
    }
  })
  useEffect(() => { if (data) reset({login: data.login, phone: data.phone || ''}) }, [data, reset])
  const uploadedFile = (file: any) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      setSelectedFile(reader.result)
    }
  }
  const onDrop = (e: any) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    setFile(file)
    uploadedFile(file)
    setOnDrag(true)
    setValue("file", file);
  }
  const handleInputAvatar = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files[0];
    setFile(file);
    uploadedFile(file);
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {}
    setSelectedFile(file)
    setValue("file", file);
    setOnDrag(true)
  }
  const handleDragOver = (e: any) => {
    e.preventDefault()

    setOnDrag(false)
  }
  const onSubmit = async (formData: IEditProfileInterface) => {

    // await EditProfile(formData);
    try {
      setState({error: false, loading: false, success: false});
      const res = await axios.patch(`${api_url}/user/updateProfile`, { ...formData}, {
        headers: {
          Accept: 'application/json',
          "Content-Type": "multipart/form-data;",
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setState({error: false, loading: false, success: true});
      reset();
    } catch(e) {
      setState({error: true, loading: false, success: false});
    }

  }
  if (isLoading) return <p role="status">Загрузка профиля…</p>
  if (!data || error) return <Link href="/authorization">Войдите, чтобы изменить профиль</Link>
  return (
    <div className={"w-full"}>
      {isLoading ? (
        <div>loading</div>
      ) : (
        <div
          className={
            "flex justify-around  items-center p-10 rounded-3xl mx-auto"
          }
        >
          <div onDrop={onDrop} className={""} onDragOver={handleDragOver}>
            {onDrag ? (
              <img
                alt={"avatar"}
                className={" mx-auto rounded-full w-26 h-26"}
                width={100}
                height={100}
                src={selectedFile}
              />
            ) : (
              <div className={"space-y-5 my-5 p-5  outline-dashed border-4"}>
                <label id='uploadAvatar'>
                  <img
                    alt={"avatar"}
                    className={" mx-auto rounded-full w-26 h-26"}
                    width={100}
                    height={100}
                    src={
                      data?.avatar?.length > 0
                        ? `${api_url}/user` + data?.avatar
                        : Profile.src
                    }
                  />
                  <input id={'uploadAvatar'} accept={'image/*'} onChange={(e) => handleInputAvatar(e)} className={'hidden'} type={'file'} />
                </label>

                <h1 className={"font-bold"}>
                  Перенести новый файл для аватарки
                </h1>
              </div>
            )}
            {onDrag && (
              <Button className="mx-auto " onClick={() => setOnDrag(false)}>
                Отменить
              </Button>
            )}
          </div>
          <div className={"mx-auto border rounded-md px-12 my-auto"}>
            <form
              action=""
              className={"space-y-7   my-12"}
              onSubmit={handleSubmit(onSubmit)}
            >
              <Label className={"font-bold"} htmlFor={"name"}>
                Name
              </Label>
              <Input
                placeholder={data.login}
                {...register("login")}
                id={"name"}
              />
              <Label className={"font-bold"} htmlFor={"password"}>
                password
              </Label>
              <Input
                placeholder={'Введите пароль'}
                {...register("password")}
                type="password" autoComplete="new-password" id="password"
              />
              <Label className={"font-bold"} htmlFor={"oldPassword"}>
                oldPassword
              </Label>
              <Input
                placeholder={'Введите старый пароль'}
                {...register("oldpassword")}
                type="password" autoComplete="current-password" id="oldPassword"
              />
              <Label className={"font-bold"} htmlFor={"'phone'"}>
                phone
              </Label>

              <Input
                placeholder={data.phone}
                {...register("phone")}
                id={"phone"}
              />
              <Button className={"mx-auto"} type={"submit"}>
                Изменить{" "}
              </Button>
            </form>
          </div>
        </div>
      )}
      {
        state.error &&
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Ошибка Редактирования
          </AlertDescription>
        </Alert>
      }
      {
        state.success &&
          <Alert>
            <AlertTitle>Успешно</AlertTitle>
            <AlertDescription>
              Вы изменили профиль
            </AlertDescription>
          </Alert>


      }
    </div>
  )
}
