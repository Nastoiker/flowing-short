
import { cn } from "@/lib/utils"
import { SiteHeader } from "@/components/site-header"
import { LeftSite } from "@/layout-component/sidebar"
import Providers from "@/provider/providerRedux"
import UserIcon from "@/public/User.svg"
import { useAppDispatch, useAppSelector } from "@/stores"
import { getFirstCategory } from "@/stores/slices/category.slice"

import { IUser } from "@/types/User.interface"
import { IVideo } from "@/types/Video.interface"
import { Categories } from "@/components/Categoryes/Categories"
import { Header } from "@/components/Header/Header"
import { PopularTags } from "@/components/Header/PopularTags"
import { Search } from "@/components/search/search"
import {ThemeProvider} from "@/components/ThemeProvider";
import "@/styles/globals.css"
import {Up} from "@/components/Up/Up";


interface RootLayoutProps {
  children: React.ReactNode
}

const TagsObject = [
  { name: "js", alias: "js" },
  { name: "js", alias: "js" },
]
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head />
      <body>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div
          className={cn(
            "max-w-screen-2xl  bg-background mx-auto AutoMargin min-h-screen  font-sans  box-border antialiased "
          )}
        >
          <Providers>
            <div className={"flex  flex-col"}>
              <header className={"w-full z-40  fixed top-0"}>
                <Header />
              </header>
              {/*<header className={"z-40 right-44 fixed left-44"}>*/}
              {/*  <Header scrolled={scrolled} setIsLogin={() => {} } setIsLogout={() => {}} />*/}
              {/*</header>*/}

              <div className={""}>
                <LeftSite className={'MainLayout'} />
              </div>
              <div
                className={"md:pl-64 xl:max-w-screen-2xl  pt-20  MainMargin"}
              >
                {children}
              </div>
              <Up />

            </div>
          </Providers>
        </div>
      </ThemeProvider>

      </body>
    </html>
  )
}
