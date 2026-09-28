import type { ChatMessage } from '@/types'

export const suggestedQuestions: string[] = [
  'Explain my latest lab report',
  'What do my recent vital trends indicate?',
  'How can I improve my diet based on my plan?',
  'What foods are rich in dietary fiber and low in sodium?',
  'What questions should I prepare for my next doctor visit?',
]

export function createWelcomeMessage(userName?: string): ChatMessage {
  const nameStr = userName ? ` ${userName}` : ''
  return {
    id: 'welcome',
    role: 'assistant',
    content: `Hello${nameStr}! I'm your MediAssist AI Health Assistant, running locally. I can help explain your lab reports, analyze your vital trends, and discuss healthy nutrition. How can I assist you today?`,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  }
}

