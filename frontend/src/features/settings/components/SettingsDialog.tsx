import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings, Palette } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            설정
          </DialogTitle>
          <DialogDescription>
            앱 설정을 관리합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 테마 설정 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Palette className="h-4 w-4" />
              테마
            </h3>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-full">
                <SelectValue>{getThemeLabel()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">라이트 모드</SelectItem>
                <SelectItem value="dark">다크 모드</SelectItem>
                <SelectItem value="system">시스템 설정</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 데이터 관리 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">데이터 관리</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                데이터 백업
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
                데이터 복원
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                데이터 초기화
              </button>
            </div>
          </div>

          {/* 앱 정보 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">앱 정보</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>버전 v2.0.0</p>
              <p>© 2025 Schedule Parser</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
