"use client"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
type Registration = { email: string; login: string; hashpassword: string; confirm: string }
export default function RegistrationPage() {
  const { register, watch, handleSubmit, formState: { errors, isSubmitting } } = useForm<Registration>()
  const [error, setError] = useState('')
  const submit = handleSubmit(async ({confirm, ...values}) => {
    setError('')
    try {
      const response = await fetch('/api/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(values), signal:AbortSignal.timeout(10000)})
      if (!response.ok) { setError(response.status === 409 ? 'Этот email уже зарегистрирован' : 'Не удалось создать аккаунт. Попробуйте ещё раз.'); return }
      window.location.assign('/authorization')
    } catch { setError('Не удалось создать аккаунт. Попробуйте ещё раз.') }
  })
  return <main className="mx-auto max-w-md p-5">
    <h1 className="text-2xl">Регистрация</h1>
    <form noValidate onSubmit={submit} className="space-y-4 my-5">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" autoComplete="email" error={errors.email} {...register('email',{required:'Введите email',pattern:{value:/^\S+@\S+\.\S+$/,message:'Введите корректный email'}})}/>
      <Label htmlFor="login">Имя</Label>
      <Input id="login" autoComplete="nickname" error={errors.login} {...register('login',{required:'Введите имя',minLength:{value:2,message:'Минимум 2 символа'},maxLength:50})}/>
      <Label htmlFor="password">Пароль</Label>
      <Input id="password" type="password" autoComplete="new-password" error={errors.hashpassword} {...register('hashpassword',{required:'Введите пароль',minLength:{value:8,message:'Минимум 8 символов'},maxLength:{value:72,message:'Максимум 72 символа'}})}/>
      <Label htmlFor="confirm">Повторите пароль</Label>
      <Input id="confirm" type="password" autoComplete="new-password" error={errors.confirm} {...register('confirm',{required:'Повторите пароль',validate:value=>value===watch('hashpassword') || 'Пароли должны совпадать'})}/>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Создаём…' : 'Создать аккаунт'}</Button>
    </form>
    <Link href="/authorization">Войти</Link>
  </main>
}
