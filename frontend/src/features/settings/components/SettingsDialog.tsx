import { useState } from 'react'
import { ContentModal } from '@/components/common/ContentModal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
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
import { Input } from '@/components/ui/input'
import { Palette, CalendarCheck, FolderCheck, Link, Unlink, Settings, PanelLeftOpen, PanelLeftClose, Plus, X } from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { startNaverCalendarLink } from '@/features/calendar/utils/naverCalendarAuth'
import { startGoogleCalendarLink } from '@/features/calendar/utils/googleCalendarAuth'
import { useUpdateUserSettings } from '@/features/settings/hooks/useUserSettings'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingSection = 'appearance' | 'calendar-sync' | 'folder-sync' | 'others'

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingSection>('appearance')
  const [naverLinkConfirmOpen, setNaverLinkConfirmOpen] = useState(false)

  // 브랜드 단축어 입력 상태
  const [newBrandOriginal, setNewBrandOriginal] = useState('')
  const [newBrandShortcut, setNewBrandShortcut] = useState('')

  // 장소 단축어 입력 상태
  const [newLocationOriginal, setNewLocationOriginal] = useState('')
  const [newLocationShortcut, setNewLocationShortcut] = useState('')

  const {
    fontSize,
    setFontSize,
    weekStartsOn,
    setWeekStartsOn,
    enabledCalendars,
    setEnabledCalendars,
    appleCredentials,
    setAppleCredentials,
    settingsSidebarCollapsed,
    setSettingsSidebarCollapsed,
    folderNameFormat,
    setFolderNameFormat,
    calendarEventDuration,
    setCalendarEventDuration,
    brandShortcuts,
    setBrandShortcuts,
    locationShortcuts,
    setLocationShortcuts,
  } = useSettingsStore()
  const { theme, setTheme } = useTheme()
  const { user, removeNaverToken, removeGoogleToken } = useAuthStore()
  const updateSettingsMutation = useUpdateUserSettings()
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
    setNaverLinkConfirmOpen(true)
  }

  const handleConfirmNaverLink = async () => {
    setNaverLinkConfirmOpen(false)
    await startNaverCalendarLink()
  }

  const handleNaverCalendarUnlink = () => {
    removeNaverToken()
    toast.success('네이버 캘린더 연동이 해제되었습니다')
  }

  const handleGoogleCalendarLink = async () => {
    await startGoogleCalendarLink()
  }

  const handleGoogleCalendarUnlink = () => {
    removeGoogleToken()
    toast.success('구글 캘린더 연동이 해제되었습니다')
  }

  const handleAddBrandShortcut = () => {
    if (!newBrandOriginal.trim()) {
      toast.error('원본 브랜드명을 입력해주세요')
      return
    }

    const original = newBrandOriginal.trim()
    const shortcut = newBrandShortcut.trim()

    // 새로운 단축어 객체 생성
    const updatedShortcuts = { ...brandShortcuts, [original]: shortcut }

    // DB에 즉시 저장
    updateSettingsMutation.mutate(
      { brandShortcuts: updatedShortcuts },
      {
        onSuccess: () => {
          // 성공 시 Zustand store 업데이트
          setBrandShortcuts(updatedShortcuts)
          setNewBrandOriginal('')
          setNewBrandShortcut('')

          if (shortcut === '') {
            toast.success('브랜드가 폴더명에서 제외되도록 설정되었습니다')
          } else {
            toast.success('브랜드 단축어가 추가되었습니다')
          }
        },
        onError: () => {
          toast.error('설정 저장에 실패했습니다')
        }
      }
    )
  }

  const handleAddLocationShortcut = () => {
    if (!newLocationOriginal.trim()) {
      toast.error('원본 장소명을 입력해주세요')
      return
    }

    const original = newLocationOriginal.trim()
    const shortcut = newLocationShortcut.trim()

    // 새로운 단축어 객체 생성
    const updatedShortcuts = { ...locationShortcuts, [original]: shortcut }

    // DB에 즉시 저장
    updateSettingsMutation.mutate(
      { locationShortcuts: updatedShortcuts },
      {
        onSuccess: () => {
          // 성공 시 Zustand store 업데이트
          setLocationShortcuts(updatedShortcuts)
          setNewLocationOriginal('')
          setNewLocationShortcut('')

          if (shortcut === '') {
            toast.success('장소가 폴더명에서 제외되도록 설정되었습니다')
          } else {
            toast.success('장소 단축어가 추가되었습니다')
          }
        },
        onError: () => {
          toast.error('설정 저장에 실패했습니다')
        }
      }
    )
  }

  const handleRemoveBrandShortcut = (original: string) => {
    // 단축어 삭제
    const { [original]: _, ...updatedShortcuts } = brandShortcuts

    // DB에 즉시 저장
    updateSettingsMutation.mutate(
      { brandShortcuts: updatedShortcuts },
      {
        onSuccess: () => {
          // 성공 시 Zustand store 업데이트
          setBrandShortcuts(updatedShortcuts)
          toast.success('브랜드 단축어가 삭제되었습니다')
        },
        onError: () => {
          toast.error('설정 저장에 실패했습니다')
        }
      }
    )
  }

  const handleRemoveLocationShortcut = (original: string) => {
    // 단축어 삭제
    const { [original]: _, ...updatedShortcuts } = locationShortcuts

    // DB에 즉시 저장
    updateSettingsMutation.mutate(
      { locationShortcuts: updatedShortcuts },
      {
        onSuccess: () => {
          // 성공 시 Zustand store 업데이트
          setLocationShortcuts(updatedShortcuts)
          toast.success('장소 단축어가 삭제되었습니다')
        },
        onError: () => {
          toast.error('설정 저장에 실패했습니다')
        }
      }
    )
  }

  const isNaverCalendarLinked = !!user?.naverAccessToken
  const isGoogleCalendarLinked = !!user?.googleAccessToken

  const sections = [
    { id: 'appearance' as SettingSection, label: '외관', icon: Palette },
    { id: 'calendar-sync' as SettingSection, label: '캘린더 연동', icon: CalendarCheck },
    { id: 'folder-sync' as SettingSection, label: '폴더명 복사', icon: FolderCheck },
    { id: 'others' as SettingSection, label: '기타', icon: Settings },
  ]

  return (
    <>
      <ContentModal
        open={open}
        onOpenChange={onOpenChange}
        size="fullscreen-mobile"
        title="설정"
        showFooter={false}
        contentClassName="p-0 pb-0"
      >
      <div className="flex h-full sm:min-h-[500px]">
        {/* Sidebar */}
        <div className={`border-r border-border flex flex-col transition-all duration-300 ${settingsSidebarCollapsed ? 'w-16' : 'w-48'}`}>
          {/* Toggle Button */}
          <div className="flex items-center justify-start border-b border-border">
            <button
              className="h-10 w-10 flex items-center justify-center"
              onClick={() => setSettingsSidebarCollapsed(!settingsSidebarCollapsed)}
            >
              {settingsSidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              ) : (
                <PanelLeftClose className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              )}
            </button>
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
                  className="w-full flex items-center gap-3 px-4 py-3"
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {!settingsSidebarCollapsed && (
                    <span className={`text-sm whitespace-nowrap transition-colors ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
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

          {/* 캘린더 연동 Section */}
          {activeSection === 'calendar-sync' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">캘린더 연동</h2>

              {/* 캘린더 연동 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">캘린더 연동</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
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
                    {isGoogleCalendarLinked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGoogleCalendarUnlink}
                      >
                        <Unlink className="mr-2 h-4 w-4" />
                        연동 해제
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGoogleCalendarLink}
                      >
                        <Link className="mr-2 h-4 w-4" />
                        연동
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
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
                    {isNaverCalendarLinked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNaverCalendarUnlink}
                      >
                        <Unlink className="mr-2 h-4 w-4" />
                        연동 해제
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNaverCalendarLink}
                      >
                        <Link className="mr-2 h-4 w-4" />
                        연동
                      </Button>
                    )}
                  </div>

                  {/* Apple Calendar */}
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="apple-calendar"
                        checked={enabledCalendars.apple}
                        onCheckedChange={(checked) =>
                          setEnabledCalendars({ ...enabledCalendars, apple: checked === true })
                        }
                      />
                      <label
                        htmlFor="apple-calendar"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        애플 캘린더
                      </label>
                    </div>

                    {enabledCalendars.apple && (
                      <div className="pl-6 space-y-3 pt-2">
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Apple ID (iCloud 이메일)</label>
                          <Input
                            type="email"
                            placeholder="example@icloud.com"
                            value={appleCredentials.appleId}
                            onChange={(e) =>
                              setAppleCredentials({ ...appleCredentials, appleId: e.target.value })
                            }
                            className="text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground">앱 전용 비밀번호</label>
                            <a
                              href="https://support.apple.com/ko-kr/102654"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              생성 방법 →
                            </a>
                          </div>
                          <Input
                            type="password"
                            placeholder="xxxx-xxxx-xxxx-xxxx"
                            value={appleCredentials.appPassword}
                            onChange={(e) =>
                              setAppleCredentials({ ...appleCredentials, appPassword: e.target.value })
                            }
                            className="text-sm font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            iCloud 계정 설정에서 생성한 앱 전용 비밀번호를 입력하세요
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 캘린더 일정 시간 설정 */}
              <div className="space-y-4 pt-6 border-t">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">캘린더 일정 시간 설정</h3>
                  <p className="text-xs text-muted-foreground">
                    캘린더에 일정을 추가할 때 적용되는 시간 범위입니다.
                  </p>
                </div>

                {/* 시작 시간 오프셋 */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">시작 시간</label>
                  <Select
                    value={calendarEventDuration.startOffset.toString()}
                    onValueChange={(value) => setCalendarEventDuration({ ...calendarEventDuration, startOffset: Number(value) })}
                  >
                    <SelectTrigger className="w-full focus:ring-1 focus:ring-ring/30 focus:outline-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-120">-2시간</SelectItem>
                      <SelectItem value="-90">-1시간 30분</SelectItem>
                      <SelectItem value="-60">-1시간</SelectItem>
                      <SelectItem value="-30">-30분</SelectItem>
                      <SelectItem value="0">정시</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 종료 시간 오프셋 */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">종료 시간</label>
                  <Select
                    value={calendarEventDuration.endOffset.toString()}
                    onValueChange={(value) => setCalendarEventDuration({ ...calendarEventDuration, endOffset: Number(value) })}
                  >
                    <SelectTrigger className="w-full focus:ring-1 focus:ring-ring/30 focus:outline-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">정시</SelectItem>
                      <SelectItem value="30">+30분</SelectItem>
                      <SelectItem value="60">+1시간</SelectItem>
                      <SelectItem value="90">+1시간 30분</SelectItem>
                      <SelectItem value="120">+2시간</SelectItem>
                      <SelectItem value="150">+2시간 30분</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* 폴더명 복사 Section */}
          {activeSection === 'folder-sync' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">폴더명 복사</h2>

              {/* 폴더명 포맷 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">폴더명 포맷</h3>
                  <p className="text-xs text-muted-foreground">
                    스케줄의 폴더명 복사 버튼을 눌렀을때 적용되는 규칙입니다.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">사용 가능한 키워드:</span> [BRAND] [DATE] [TIME] [LOCATION] [COUPLE] [PHOTOGRAPHER] [CUTS]
                  </p>
                </div>

                {/* 일반 포맷 (컷수 있을 때) */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">일반 포맷 (컷수 있을 때)</label>
                  <Input
                    value={folderNameFormat.normal}
                    onChange={(e) =>
                      setFolderNameFormat({
                        ...folderNameFormat,
                        normal: e.target.value,
                      })
                    }
                    placeholder="[BRAND] [DATE] [TIME] [LOCATION]([COUPLE]) - [PHOTOGRAPHER]([CUTS])"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">예시:</span> 브랜드A 2025.10.11 14시 예식장명(신랑 신부) - 작가명(480)
                  </p>
                </div>

                {/* 컷수 없을 때 포맷 */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">컷수 없을 때 포맷</label>
                  <Input
                    value={folderNameFormat.noCuts}
                    onChange={(e) =>
                      setFolderNameFormat({
                        ...folderNameFormat,
                        noCuts: e.target.value,
                      })
                    }
                    placeholder="[BRAND] [DATE] [TIME] [LOCATION]([COUPLE])"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">예시:</span> 브랜드A 2025.10.11 14시 예식장명(신랑 신부)
                  </p>
                </div>
              </div>

              {/* 브랜드 단축어 */}
              <div className="space-y-4 pt-6 border-t">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">브랜드 단축어</h3>
                  <p className="text-xs text-muted-foreground">
                    브랜드명을 짧은 단어로 변환합니다. [BRAND] 키워드에 적용됩니다.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">팁:</span> 단축어를 입력하지 않으면 폴더명에서 해당 브랜드를 제외합니다.
                  </p>
                </div>

                {/* 기존 단축어 목록 */}
                {Object.keys(brandShortcuts).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(brandShortcuts).map(([original, shortcut]) => (
                      <div key={original} className="flex items-center gap-2 p-2 rounded border border-border/50 bg-muted/30">
                        <span className="text-sm flex-1">{original}</span>
                        <span className="text-sm text-muted-foreground">→</span>
                        <span className="text-sm font-medium">{shortcut || '(제외)'}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => handleRemoveBrandShortcut(original)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 새 단축어 추가 */}
                <div className="flex gap-2">
                  <Input
                    placeholder="원본 브랜드명 (예: 로맨틱스튜디오)"
                    value={newBrandOriginal}
                    onChange={(e) => setNewBrandOriginal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBrandShortcut()}
                    className="text-sm"
                  />
                  <Input
                    placeholder="단축어 (선택사항, 예: 로맨)"
                    value={newBrandShortcut}
                    onChange={(e) => setNewBrandShortcut(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBrandShortcut()}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddBrandShortcut}
                    className="flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* 장소 단축어 */}
              <div className="space-y-4 pt-6 border-t">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">장소 단축어</h3>
                  <p className="text-xs text-muted-foreground">
                    장소명을 짧은 단어로 변환합니다. [LOCATION] 키워드에 적용됩니다.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">팁:</span> 단축어를 입력하지 않으면 폴더명에서 해당 장소를 제외합니다.
                  </p>
                </div>

                {/* 기존 단축어 목록 */}
                {Object.keys(locationShortcuts).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(locationShortcuts).map(([original, shortcut]) => (
                      <div key={original} className="flex items-center gap-2 p-2 rounded border border-border/50 bg-muted/30">
                        <span className="text-sm flex-1">{original}</span>
                        <span className="text-sm text-muted-foreground">→</span>
                        <span className="text-sm font-medium">{shortcut || '(제외)'}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => handleRemoveLocationShortcut(original)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 새 단축어 추가 */}
                <div className="flex gap-2">
                  <Input
                    placeholder="원본 장소명 (예: 대명아트홀웨딩컨벤션)"
                    value={newLocationOriginal}
                    onChange={(e) => setNewLocationOriginal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLocationShortcut()}
                    className="text-sm"
                  />
                  <Input
                    placeholder="단축어 (선택사항, 예: 대명)"
                    value={newLocationShortcut}
                    onChange={(e) => setNewLocationShortcut(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLocationShortcut()}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddLocationShortcut}
                    className="flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
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
                  <p>© 2025 Bonsik Snaper, <a href="mailto:4to.app@gmail.com" className="text-primary hover:underline">4to.app@gmail.com</a></p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </ContentModal>

      {/* 네이버 캘린더 연동 확인 다이얼로그 */}
      <ConfirmDialog
        open={naverLinkConfirmOpen}
        onOpenChange={setNaverLinkConfirmOpen}
        title="네이버 캘린더 연동"
        description="네이버 로그인 페이지로 이동합니다. 연동 완료 후 페이지가 새로고침됩니다. 계속하시겠습니까?"
        confirmText="계속"
        cancelText="취소"
        onConfirm={handleConfirmNaverLink}
      />
    </>
  )
}
