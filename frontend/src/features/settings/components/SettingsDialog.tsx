import { useState } from 'react'
import { ContentModal } from '@/components/common/ContentModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Palette, Type, Calendar, Link, Unlink, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { startNaverCalendarLink } from '@/features/calendar/utils/naverCalendarAuth'
import { toast } from 'sonner'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingSection = 'appearance' | 'integration' | 'others'

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeSection, setActiveSection] = useState<SettingSection>('appearance')

  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    weekStartsOn,
    setWeekStartsOn,
    enabledCalendars,
    setEnabledCalendars,
  } = useSettingsStore()
  const { user, removeNaverToken } = useAuthStore()
  const appVersion = import.meta.env.VITE_APP_VERSION || 'dev'

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return '라이트 모드'
      case 'dark':
        return '다크 모드'
      case 'system':
        return '시스템 설정'
      default:
        return '시스템 설정'
    }
  }

  const handleNaverCalendarLink = () => {
    startNaverCalendarLink()
  }

  const handleNaverCalendarUnlink = () => {
    removeNaverToken()
    toast.success('네이버 캘린더 연동이 해제되었습니다')
  }

  const isNaverCalendarLinked = !!user?.naverAccessToken

  const sections = [
    { id: 'appearance' as SettingSection, label: '외관', icon: Palette },
    { id: 'integration' as SettingSection, label: '외부연동', icon: Calendar },
    { id: 'others' as SettingSection, label: '기타', icon: Settings },
  ]

  return (
    <ContentModal
      open={open}
      onOpenChange={onOpenChange}
      size="fullscreen-mobile"
      className="sm:max-w-[900px]"
      title="설정"
      showFooter={false}
    >
      <div className="flex h-[500px]">
        {/* Sidebar */}
        <div className={`border-r border-border flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-48'}`}>
          {/* Toggle Button */}
          <div className="flex items-center justify-end p-2 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Section List */}
          <div className="flex-1 py-2">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors ${
                    isActive ? 'bg-accent' : ''
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {!sidebarCollapsed && (
                    <span className={`text-sm ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {section.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 외관 Section */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">외관</h2>

              {/* 테마 */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">테마</label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-full focus:ring-1 focus:ring-ring/30 focus:outline-none">
                    <SelectValue>{getThemeLabel()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">라이트 모드</SelectItem>
                    <SelectItem value="dark">다크 모드</SelectItem>
                    <SelectItem value="system">시스템 설정</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 글꼴 크기 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">글꼴 크기</label>
                  <span className="text-sm font-medium">{fontSize}px</span>
                </div>
                <Slider
                  value={[fontSize]}
                  onValueChange={(value) => setFontSize(value[0])}
                  min={12}
                  max={24}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>작게 (12px)</span>
                  <span>크게 (24px)</span>
                </div>
              </div>
            </div>
          )}

          {/* 외부연동 Section */}
          {activeSection === 'integration' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">외부연동</h2>

              {/* 캘린더 선택 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="google-calendar"
                    checked={enabledCalendars.google}
                    onCheckedChange={(checked) =>
                      setEnabledCalendars({ ...enabledCalendars, google: checked === true })
                    }
                  />
                  <label
                    htmlFor="google-calendar"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    구글 캘린더
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="naver-calendar"
                      checked={enabledCalendars.naver}
                      onCheckedChange={(checked) =>
                        setEnabledCalendars({ ...enabledCalendars, naver: checked === true })
                      }
                    />
                    <label
                      htmlFor="naver-calendar"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      네이버 캘린더
                    </label>
                  </div>
                  {isNaverCalendarLinked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleNaverCalendarUnlink}
                    >
                      <Unlink className="mr-2 h-4 w-4" />
                      네이버 캘린더 연동 해제
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleNaverCalendarLink}
                    >
                      <Link className="mr-2 h-4 w-4" />
                      네이버 캘린더 연동
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 기타 Section */}
          {activeSection === 'others' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">기타</h2>

              {/* 주 시작 요일 */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">주 시작 요일</label>
                <Select value={weekStartsOn.toString()} onValueChange={(value) => setWeekStartsOn(Number(value) as 0 | 1)}>
                  <SelectTrigger className="w-full focus:ring-1 focus:ring-ring/30 focus:outline-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">월요일</SelectItem>
                    <SelectItem value="0">일요일</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 앱 정보 */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-semibold text-foreground">앱 정보</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>버전 v{appVersion}</p>
                  <p>© 2025 Bonsik Snaper, dqstyle@gmail.com</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ContentModal>
  )
}
