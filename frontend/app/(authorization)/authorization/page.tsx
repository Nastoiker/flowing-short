"use client"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{email: string; password: string}>()
  const [error, setError] = useState("")
  const submit = handleSubmit(async values => {
    setError("")
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(values), signal: AbortSignal.timeout(10000) })
      if (!response.ok) { setError(response.status === 401 ? 'Неверный email или пароль' : 'Сервис временно недоступен. Попробуйте ещё раз.'); return }
      const result = await response.json()
      if (!result.accesToken) throw new Error('Missing token')
      localStorage.setItem('token', result.accesToken)
      window.location.assign('/')
    } catch { setError('Сервис временно недоступен. Попробуйте ещё раз.') }
  })
  return <main className="mx-auto max-w-md p-5">
    <h1 className="text-2xl">Вход</h1>
    <form noValidate onSubmit={submit} className="space-y-4 my-5">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" autoComplete="email" error={errors.email} {...register('email', { required: 'Введите email', pattern: {value: /^\S+@\S+\.\S+$/, message: 'Введите корректный email'} })}/>
      <Label htmlFor="password">Пароль</Label>
      <Input id="password" type="password" autoComplete="current-password" error={errors.password} {...register('password', {required:'Введите пароль'})}/>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Входим…' : 'Войти'}</Button>
    </form>
    <Link href="/registration">Создать аккаунт</Link>
  </main>
}
