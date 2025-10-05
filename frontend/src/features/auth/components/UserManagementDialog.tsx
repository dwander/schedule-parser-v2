import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUsers } from '../hooks/useUsers'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/useAuthStore'

interface UserManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserManagementDialog({ open, onOpenChange }: UserManagementDialogProps) {
  const { user } = useAuthStore()

  // 권한 확인: 개발 환경 또는 관리자만 접근 가능
  const hasAccess = import.meta.env.DEV || user?.isAdmin

  // 권한이 있을 때만 데이터 조회
  const { data: users = [], isLoading, error } = useUsers({
    enabled: hasAccess
  })

  // 날짜 포맷 함수 (한국 시간대 GMT+9)
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'

    // UTC 시간임을 명시하기 위해 'Z' 추가 (없는 경우)
    const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z'
    const date = new Date(utcString)

    // 9시간 추가 (UTC → KST)
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))

    // YYYY-MM-DD HH:mm 형식으로 포맷
    const year = kstDate.getUTCFullYear()
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(kstDate.getUTCDate()).padStart(2, '0')
    const hours = String(kstDate.getUTCHours()).padStart(2, '0')
    const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>회원 관리</DialogTitle>
          <DialogDescription>
            등록된 회원 목록을 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* 권한 없음 */}
          {!hasAccess && (
            <div className="text-center py-8 text-destructive">
              접근 권한이 없습니다. 관리자만 이용할 수 있습니다.
            </div>
          )}

          {/* 권한 있음: 데이터 표시 */}
          {hasAccess && isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              불러오는 중...
            </div>
          )}

          {hasAccess && error && (
            <div className="text-center py-8 text-destructive">
              회원 목록을 불러오는데 실패했습니다.
            </div>
          )}

          {hasAccess && !isLoading && !error && users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              등록된 회원이 없습니다.
            </div>
          )}

          {hasAccess && !isLoading && !error && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground">이름</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">이메일</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">SNS</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">관리자</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">가입일</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">마지막 로그인</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-foreground">{user.name || '-'}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.email || '-'}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {user.auth_provider || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {user.is_admin ? (
                          <Badge variant="default" className="text-xs">
                            관리자
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">일반</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {formatDate(user.last_login)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 text-sm text-muted-foreground">
                총 {users.length}명의 회원
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
