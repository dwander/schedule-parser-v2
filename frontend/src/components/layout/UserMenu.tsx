import { useState } from 'react'
import { LogIn, Settings, FolderSync, Database, Code, Users, TestTube2, LogOut, Check, Calculator, ChartBar } from 'lucide-react'
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
import { useAuthStore } from '@/stores/useAuthStore'
import { LoginDialog } from '@/features/auth/components/LoginDialog'
import { SettingsDialog } from '@/features/settings/components/SettingsDialog'
import { UserManagementDialog } from '@/features/auth/components/UserManagementDialog'
import { PricingRuleDialog } from '@/features/pricing/components/PricingRuleDialog'
import { useSettingsStore } from '@/stores/useSettingsStore'

interface UserMenuProps {
  onFolderSyncClick?: () => void
  onBackupRestoreClick?: () => void
}

export function UserMenu({ onFolderSyncClick, onBackupRestoreClick }: UserMenuProps) {
  const { user, logout } = useAuthStore()
  const { testPanelVisible, setTestPanelVisible } = useSettingsStore()
  const [loginOpen, setLoginOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)
  const [userManagementOpen, setUserManagementOpen] = useState(false)
  const [pricingRuleOpen, setPricingRuleOpen] = useState(false)

  const handleLogout = () => {
    logout()
    // 랜딩 페이지로 돌아가기 위해 skipLanding 플래그 제거
    localStorage.removeItem('skipLanding')
    window.location.reload()
  }

  const handleUsersManagement = () => {
    setUserManagementOpen(true)
  }

  const handleUITestPanel = () => {
    setTestPanelVisible(!testPanelVisible)
  }

  // 드롭다운 메뉴 내용 (재사용)
  const renderMenuContent = () => (
    <>
      {/* 설정 서브메뉴 */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Settings className="mr-2 h-4 w-4" />
          <span>설정</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => setAppSettingsOpen(true)}>
            앱 설정
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            테마 설정
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      {/* 데이터 관리 서브메뉴 */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Database className="mr-2 h-4 w-4" />
          <span>데이터 관리</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={onFolderSyncClick}>
            <FolderSync className="mr-2 h-4 w-4" />
            폴더 동기화
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onBackupRestoreClick}>
            <Database className="mr-2 h-4 w-4" />
            데이터 백업 및 복원
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPricingRuleOpen(true)}>
            <Calculator className="mr-2 h-4 w-4" />
            촬영비 계산
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => console.log('촬영비 통계 클릭')}>
            <ChartBar className="mr-2 h-4 w-4" />
            촬영비 통계
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      {/* 개발자 도구 서브메뉴 (관리자만) */}
      {user?.isAdmin && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Code className="mr-2 h-4 w-4" />
            <span>개발자 도구</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={handleUsersManagement}>
              <Users className="mr-2 h-4 w-4" />
              회원 관리
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleUITestPanel}>
              <TestTube2 className="mr-2 h-4 w-4" />
              UI 테스트 패널
              {testPanelVisible && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}

      {/* 로그아웃 (로그인한 사용자만) */}
      {user && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>로그아웃</span>
          </DropdownMenuItem>
        </>
      )}
    </>
  )

  // 로그인하지 않은 경우 - 설정 버튼 + 로그인 버튼
  if (!user) {
    return (
      <>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {renderMenuContent()}
            </DropdownMenuContent>
          </DropdownMenu>

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
      </>
    )
  }

  // 로그인한 경우 - 프로필 드롭다운
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2"
          >
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
            <span className="text-sm font-medium">{user.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {renderMenuContent()}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 설정 다이얼로그 */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <SettingsDialog open={appSettingsOpen} onOpenChange={setAppSettingsOpen} />
      <UserManagementDialog open={userManagementOpen} onOpenChange={setUserManagementOpen} />
      <PricingRuleDialog open={pricingRuleOpen} onOpenChange={setPricingRuleOpen} />
    </>
  )
}
