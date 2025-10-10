import { useState, useMemo, useCallback } from 'react'
import { LogIn, Settings, FolderSync, Database, Code, Users, TestTube2, LogOut, Check, Calculator, ChartBar, ChevronRight, ChevronDown, ArrowLeft, LucideIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuthStore } from '@/stores/useAuthStore'
import { LoginDialog } from '@/features/auth/components/LoginDialog'
import { APP_STORAGE_KEYS } from '@/lib/constants/storage'
import { SettingsDialog } from '@/features/settings/components/SettingsDialog'
import { UserManagementDialog } from '@/features/auth/components/UserManagementDialog'
import { PricingRuleDialog } from '@/features/pricing/components/PricingRuleDialog'
import { TrashDialog } from '@/features/schedule/components/TrashDialog'
import { AlertDialog } from '@/components/common/AlertDialog'
import { useSettingsStore } from '@/stores/useSettingsStore'

interface UserMenuProps {
  onFolderSyncClick?: () => void
  onBackupRestoreClick?: () => void
}

// 메뉴 항목 타입 정의
interface MenuItem {
  id: string
  label: string
  icon: LucideIcon
  action: () => void
  badge?: React.ReactNode
}

interface MenuSection {
  id: string
  label: string
  icon: LucideIcon
  items: MenuItem[]
  adminOnly?: boolean
}

export function UserMenu({ onFolderSyncClick, onBackupRestoreClick }: UserMenuProps) {
  const { user, logout } = useAuthStore()
  const { testPanelVisible, setTestPanelVisible } = useSettingsStore()
  const [loginOpen, setLoginOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)
  const [userManagementOpen, setUserManagementOpen] = useState(false)
  const [pricingRuleOpen, setPricingRuleOpen] = useState(false)
  const [trashDialogOpen, setTrashDialogOpen] = useState(false)
  const [statsAlertOpen, setStatsAlertOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false)

  // 모바일 서브메뉴 펼침 상태
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // 호버 핸들러 - 프로필 사진에 마우스 올리면 메뉴 열기
  const handleProfileMouseEnter = useCallback(() => {
    setDesktopMenuOpen(true)
  }, [])

  // 메뉴 영역을 벗어나면 닫기
  const handleMenuMouseLeave = useCallback(() => {
    setDesktopMenuOpen(false)
  }, [])

  const handleLogout = async () => {
    await logout()
    localStorage.removeItem(APP_STORAGE_KEYS.SKIP_LANDING)
    window.location.reload()
  }

  const handleUsersManagement = () => {
    setUserManagementOpen(true)
    setMobileMenuOpen(false)
  }

  const handleUITestPanel = () => {
    setTestPanelVisible(!testPanelVisible)
  }

  const handleMenuItemClick = (action: () => void) => {
    action()
    setMobileMenuOpen(false)
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // 메뉴 데이터 정의
  const menuSections: MenuSection[] = useMemo(() => [
    {
      id: 'settings',
      label: '설정',
      icon: Settings,
      items: [
        {
          id: 'app-settings',
          label: '앱 설정',
          icon: Settings,
          action: () => setAppSettingsOpen(true)
        },
        {
          id: 'theme-settings',
          label: '테마 설정',
          icon: Settings,
          action: () => setSettingsOpen(true)
        }
      ]
    },
    {
      id: 'data',
      label: '데이터 관리',
      icon: Database,
      items: [
        {
          id: 'folder-sync',
          label: '폴더 동기화',
          icon: FolderSync,
          action: () => onFolderSyncClick?.()
        },
        {
          id: 'backup-restore',
          label: '데이터 백업 및 복원',
          icon: Database,
          action: () => onBackupRestoreClick?.()
        },
        {
          id: 'pricing-calc',
          label: '촬영비 계산',
          icon: Calculator,
          action: () => setPricingRuleOpen(true)
        },
        {
          id: 'pricing-stats',
          label: '촬영 통계',
          icon: ChartBar,
          action: () => setStatsAlertOpen(true)
        }
      ]
    },
    {
      id: 'dev',
      label: '개발자 도구',
      icon: Code,
      adminOnly: true,
      items: [
        {
          id: 'user-management',
          label: '회원 관리',
          icon: Users,
          action: handleUsersManagement
        },
        {
          id: 'ui-test',
          label: 'UI 테스트 패널',
          icon: TestTube2,
          action: handleUITestPanel,
          badge: testPanelVisible ? <Check className="ml-auto h-4 w-4" /> : undefined
        }
      ]
    }
  ], [onFolderSyncClick, onBackupRestoreClick, testPanelVisible])

  // 관리자 전용 섹션 필터링
  const visibleSections = useMemo(() =>
    menuSections.filter(section => !section.adminOnly || user?.isAdmin),
    [menuSections, user?.isAdmin]
  )

  // 데스크탑 드롭다운 메뉴
  const renderDesktopMenuContent = () => (
    <>
      {visibleSections.map(section => (
        <DropdownMenuSub key={section.id}>
          <DropdownMenuSubTrigger>
            <section.icon className="mr-2 h-4 w-4" />
            <span>{section.label}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {section.items.map(item => (
              <DropdownMenuItem key={item.id} onClick={item.action}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
                {item.badge}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ))}

      {user && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTrashDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            <span>휴지통</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>로그아웃</span>
          </DropdownMenuItem>
        </>
      )}
    </>
  )

  // 모바일 Sheet 메뉴
  const renderMobileMenuContent = () => (
    <div className="space-y-2 py-4">
      {visibleSections.map(section => (
        <div key={section.id}>
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent rounded-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <section.icon className="h-5 w-5" />
              <span className="font-medium">{section.label}</span>
            </div>
            {expandedSections[section.id] ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
          {expandedSections[section.id] && (
            <div className="pl-12 pr-4 py-2 space-y-1">
              {section.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item.action)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.badge}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {user && (
        <>
          <div className="border-t my-2" />
          <button
            onClick={() => handleMenuItemClick(() => setTrashDialogOpen(true))}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent rounded-md transition-colors"
          >
            <Trash2 className="h-5 w-5" />
            <span className="font-medium">휴지통</span>
          </button>
          <button
            onClick={() => handleMenuItemClick(handleLogout)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent rounded-md transition-colors text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">로그아웃</span>
          </button>
        </>
      )}
    </div>
  )

  // 로그인하지 않은 경우
  if (!user) {
    return (
      <>
        <div className="flex items-center gap-2">
          {/* 데스크탑 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex h-9 w-9"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {renderDesktopMenuContent()}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 모바일 Sheet */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:hidden"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-screen pt-[env(safe-area-inset-top)] p-0"
              hideClose
            >
              {/* 커스텀 헤더 */}
              <div className="flex items-center h-14 px-4 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-9 w-9"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>
              <div className="overflow-y-auto h-[calc(100%-3.5rem)]">
                {renderMobileMenuContent()}
              </div>
            </SheetContent>
          </Sheet>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLoginOpen(true)}
            className="group transition-all hover:bg-accent"
          >
            <LogIn className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span className="ml-0 max-w-0 overflow-hidden opacity-0 group-hover:ml-2 group-hover:max-w-[5rem] group-hover:opacity-100 transition-all duration-300">
              로그인
            </span>
          </Button>
        </div>

        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <SettingsDialog open={appSettingsOpen} onOpenChange={setAppSettingsOpen} />
        <UserManagementDialog open={userManagementOpen} onOpenChange={setUserManagementOpen} />
        <PricingRuleDialog open={pricingRuleOpen} onOpenChange={setPricingRuleOpen} />
        <TrashDialog open={trashDialogOpen} onOpenChange={setTrashDialogOpen} />
        <AlertDialog
          open={statsAlertOpen}
          onOpenChange={setStatsAlertOpen}
          title="준비중인 기능입니다"
          description="촬영비 통계 기능은 현재 개발 중입니다."
          confirmText="확인"
          onConfirm={() => setStatsAlertOpen(false)}
        />
      </>
    )
  }

  // 로그인한 경우
  return (
    <>
      {/* 데스크탑 드롭다운 */}
      <DropdownMenu open={desktopMenuOpen} onOpenChange={setDesktopMenuOpen}>
        <DropdownMenuTrigger asChild>
          <div
            className="hidden md:block cursor-pointer"
            onMouseEnter={handleProfileMouseEnter}
          >
            <div className="h-9 w-9 flex items-center justify-center">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 ml-1"
          onMouseLeave={handleMenuMouseLeave}
        >
          {renderDesktopMenuContent()}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 모바일 Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <div className="h-9 w-9 flex items-center justify-center cursor-pointer md:hidden">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="h-screen pt-[env(safe-area-inset-top)] p-0"
          hideClose
        >
          {/* 커스텀 헤더 */}
          <div className="flex items-center h-14 px-4 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-3.5rem)]">
            {renderMobileMenuContent()}
          </div>
        </SheetContent>
      </Sheet>

      {/* 설정 다이얼로그 */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <SettingsDialog open={appSettingsOpen} onOpenChange={setAppSettingsOpen} />
      <UserManagementDialog open={userManagementOpen} onOpenChange={setUserManagementOpen} />
      <PricingRuleDialog open={pricingRuleOpen} onOpenChange={setPricingRuleOpen} />
      <TrashDialog open={trashDialogOpen} onOpenChange={setTrashDialogOpen} />
      <AlertDialog
        open={statsAlertOpen}
        onOpenChange={setStatsAlertOpen}
        title="준비중인 기능입니다"
        description="촬영 통계 기능은 현재 개발 중입니다."
        confirmText="확인"
        onConfirm={() => setStatsAlertOpen(false)}
      />
    </>
  )
}
