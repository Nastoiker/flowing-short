
import { cn } from "@/lib/utils"
import "/styles/admin.css"
import Link from "next/link"

interface UserLayoutProps {
  children: React.ReactNode
}
export default function UserLayout({ children }: UserLayoutProps) {
  return (
    <div
      className={cn(
        "  min-h-screen w-full font-sans text-slate-900 antialiased "
      )}
    >
      <a href={"/"}>На главную</a>
      {children}
    </div>
  )
}
