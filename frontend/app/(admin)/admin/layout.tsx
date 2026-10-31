import { ThemeProvider } from "next-themes"
import '/styles/admin.css';
import { cn } from "@/lib/utils"

import {ReactNode} from "react";

interface AdminLayoutProps {
  children: ReactNode
}
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (

    <div
      className={cn(
        " mx-auto MainMargin  min-h-screen   font-sans  antialiased "
      )}
    >
      {children}
    </div>

  )
}
