import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/shared/Sidebar'
import { Topbar } from '@/components/shared/Topbar'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-mist-50">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
            <div className="relative h-full w-64 animate-in slide-in-from-left duration-200">
              <Sidebar onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
        <FloatingActionButton />
      </div>
    </TooltipProvider>
  )
}

