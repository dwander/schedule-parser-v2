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
import { Slider } from '@/components/ui/slider'
import { Settings, Palette, Type, LayoutGrid } from 'lucide-react'
import { useSettingsStore } from '@/stores/useSettingsStore'

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
    viewMode,
    setViewMode,
  } = useSettingsStore()

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

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'list':
        return '테이블 뷰'
      case 'card':
        return '카드 뷰'
      default:
        return '테이블 뷰'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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

          {/* 뷰 설정 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              뷰 설정
            </h3>

            {/* 뷰 모드 */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">뷰 모드</label>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-full focus:ring-1 focus:ring-ring/30 focus:outline-none">
                  <SelectValue>{getViewModeLabel()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">테이블 뷰</SelectItem>
                  <SelectItem value="card">카드 뷰</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 앱 정보 */}
          <div className="space-y-3 pt-4 border-t">
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
