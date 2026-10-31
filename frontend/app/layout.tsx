import { LeftSite } from '@/layout-component/sidebar'
import Providers from '@/provider/providerRedux'
import { Header } from '@/components/Header/Header'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Up } from '@/components/Up/Up'
import '@/styles/globals.css'

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="ru" suppressHydrationWarning><body>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Providers>
        <div className="min-h-screen bg-background font-sans antialiased">
          <header className="fixed inset-x-0 top-0 z-50"><Header/></header>
          <LeftSite className="MainLayout"/>
          <div className="mx-auto max-w-screen-2xl px-3 pb-12 pt-32 md:pl-56 md:pr-8 md:pt-24">{children}</div>
          <Up/>
        </div>
      </Providers>
    </ThemeProvider>
  </body></html>
}
