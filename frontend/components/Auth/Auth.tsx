"use client"
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
export const AuthComponent = () => <Link className={buttonVariants({variant:'outline'})} href="/authorization">Войти</Link>
