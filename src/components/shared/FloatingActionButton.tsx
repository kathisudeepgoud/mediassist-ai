import { MessageCircleHeart } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function FloatingActionButton() {
  const navigate = useNavigate()
  const location = useLocation()

  if (location.pathname.startsWith('/assistant')) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate('/assistant')}
          aria-label="Ask Health Assistant"
          className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 animate-pulse-ring"
        >
          <MessageCircleHeart className="h-6 w-6" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">Ask Health Assistant</TooltipContent>
    </Tooltip>
  )
}
