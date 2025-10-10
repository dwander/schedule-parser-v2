import { ContentModal } from '@/components/common/ContentModal'
import { useUsers } from '../hooks/useUsers'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/useAuthStore'
import { DATETIME } from '@/lib/constants/datetime'
import { parseISO, format, addHours, isValid } from 'date-fns'

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
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'

    try {
      // parseISO는 ISO 8601 형식을 안전하게 파싱 (Z 없어도 UTC로 가정)
      const utcDate = parseISO(dateString)

      if (!isValid(utcDate)) {
        console.error('Invalid date:', dateString)
        return '-'
      }

      // 9시간 추가 (UTC → KST)
      const kstDate = addHours(utcDate, 9)

      // YYYY-MM-DD HH:mm 형식으로 포맷
      return format(kstDate, 'yyyy-MM-dd HH:mm')
    } catch (error) {
      console.error('Date parsing error:', error, dateString)
      return '-'
    }
  }

  return (
    <ContentModal
      open={open}
      onOpenChange={onOpenChange}
      size="fullscreen-mobile"
      className="sm:max-w-6xl"
      title="회원 관리"
      subtitle="등록된 회원 목록을 확인할 수 있습니다."
      showFooter={false}
    >
      <div>
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
                    <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">이름</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">이메일</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">SNS</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">관리자</th>
                    <th className="text-right py-3 px-4 font-medium text-foreground whitespace-nowrap">스케줄</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">가입일</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">마지막 로그인</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-foreground whitespace-nowrap">{user.name || '-'}</td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{user.email || '-'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {user.auth_provider || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {user.is_admin ? (
                          <Badge variant="default" className="text-xs">
                            관리자
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">일반</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground whitespace-nowrap">
                        {user.schedule_count?.toLocaleString() || 0}개
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
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
    </ContentModal>
  )
}
