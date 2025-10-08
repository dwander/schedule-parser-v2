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
import { Palette, Type, Calendar, Link, Unlink } from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { startNaverCalendarLink } from '@/features/calendar/utils/naverCalendarAuth'
import { toast } from 'sonner'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
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

  return (
    <ContentModal
      open={open}
      onOpenChange={onOpenChange}
      size="fullscreen-mobile"
      className="sm:max-w-[500px]"
      title="설정"
      subtitle="앱 설정을 관리합니다"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* 외관 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Palette className="h-4 w-4" />
            외관
          </h3>

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
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Type className="h-4 w-4" />
                글꼴 크기
              </label>
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

        <div className="border-t" />

        {/* 캘린더 연동 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            캘린더 연동
          </h3>

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

        {/* 앱 정보 */}
        <div className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-semibold text-foreground">앱 정보</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>버전 v{appVersion}</p>
            <p>© 2025 Bonsik Snaper, dqstyle@gmail.com</p>
          </div>
        </div>
      </div>
    </ContentModal>
  )
}
