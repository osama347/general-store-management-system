'use client'

import { useParams, useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'

const languages = [
  { name: 'English', code: 'en', flag: '🇬🇧' },
  { name: 'پښتو', code: 'ps', flag: '🇦🇫' },
  { name: 'دری', code: 'fa', flag: '🇦🇫' }
]

export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const currentLocale = params.locale as string

  const handleLanguageChange = (locale: string) => {
    // Replace the current locale in the pathname with the new one
    const newPathname = pathname.replace(`/${currentLocale}`, `/${locale}`)
    router.push(newPathname)
  }

  const currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-9 px-3 gap-2 hover:bg-teal-50 hover:text-teal-900 transition-colors border-2 border-transparent hover:border-teal-200"
        >
          <Globe className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-medium hidden sm:inline-block">{currentLanguage.name}</span>
          <span className="text-lg hidden sm:inline-block">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 border-2 border-teal-100 shadow-lg"
      >
        <div className="px-2 py-1.5 text-xs font-semibold text-teal-700 uppercase tracking-wide bg-gradient-to-br from-teal-50/50 via-emerald-50/30 to-green-50/30">
          Select Language
        </div>
        {languages.map((lang) => {
          const isActive = lang.code === currentLocale
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`cursor-pointer gap-3 py-2 ${
                isActive 
                  ? 'bg-teal-50 text-teal-900 font-semibold' 
                  : 'hover:bg-teal-50 hover:text-teal-900'
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"></div>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}