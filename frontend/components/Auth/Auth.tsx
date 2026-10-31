"use client"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
export const AuthComponent = () => <Button variant="outline" asChild><Link href="/authorization">Войти</Link></Button>
