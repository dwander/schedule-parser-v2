import { useState } from 'react'
import { ContentModal } from '@/components/common/ContentModal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useUsers, useDeleteUser } from '../hooks/useUsers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/useAuthStore'
import { parseISO, format, addHours, isValid } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { UserDetail } from '../api/userApi'

interface UserManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserManagementDialog({ open, onOpenChange }: UserManagementDialogProps) {
  const { user } = useAuthStore()
  const [userToDelete, setUserToDelete] = useState<UserDetail | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  // 권한 확인: 개발 환경 또는 관리자만 접근 가능
  const hasAccess = import.meta.env.DEV || user?.isAdmin

  // 권한이 있을 때만 데이터 조회
  const { data: users = [], isLoading, error } = useUsers({
    enabled: hasAccess
  })

  // 사용자 삭제 mutation
  const deleteMutation = useDeleteUser()

  // 날짜 포맷 함수 (한국 시간대 GMT+9)
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'

    try {
      // parseISO는 ISO 8601 형식을 로컬 타임존으로 파싱
      // 백엔드에서 UTC 시간을 보내므로 'Z'를 추가해서 UTC임을 명시
      const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z'
      const utcDate = parseISO(utcString)

      if (!isValid(utcDate)) {
        return '-'
      }

      // 9시간 추가 (UTC → KST)
      const kstDate = addHours(utcDate, 9)

      // YYYY-MM-DD HH:mm 형식으로 포맷
      return format(kstDate, 'yyyy-MM-dd HH:mm')
    } catch (error) {
      return '-'
    }
  }

  // 삭제 버튼 클릭 핸들러
  const handleDeleteClick = (userToDelete: UserDetail) => {
    setUserToDelete(userToDelete)
    setConfirmDialogOpen(true)
  }

  // 삭제 확인 핸들러
  const handleConfirmDelete = async () => {
    if (!userToDelete || !user) return

    try {
      const result = await deleteMutation.mutateAsync({
        userId: userToDelete.id,
        requesterUserId: user.id
      })

      toast.success(result.message, {
        description: `스케줄 ${result.deleted_data.schedules}개, 태그 ${result.deleted_data.tags}개, 가격 규칙 ${result.deleted_data.pricing_rules}개, 휴지통 ${result.deleted_data.trash}개가 삭제되었습니다.`
      })

      setConfirmDialogOpen(false)
      setUserToDelete(null)
    } catch (error) {
      toast.error('사용자 삭제에 실패했습니다', {
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      })
    }
  }

  return (
    <ContentModal
      open={open}
      onOpenChange={onOpenChange}
      size="fullscreen-mobile"
      className="sm:max-w-6xl"
      title="사용자 관리"
      subtitle="등록된 사용자 목록을 확인할 수 있습니다."
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
              사용자 목록을 불러오는데 실패했습니다.
            </div>
          )}

          {hasAccess && !isLoading && !error && users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              등록된 사용자가 없습니다.
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
                    <th className="text-center py-3 px-4 font-medium text-foreground whitespace-nowrap">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr
                      key={userItem.id}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-foreground whitespace-nowrap">{userItem.name || '-'}</td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{userItem.email || '-'}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {userItem.auth_provider || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {userItem.is_admin ? (
                          <Badge variant="default" className="text-xs">
                            관리자
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">일반</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground whitespace-nowrap">
                        {userItem.schedule_count?.toLocaleString() || 0}개
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(userItem.created_at)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(userItem.last_login)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(userItem)}
                          disabled={user?.id === userItem.id}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                          title={user?.id === userItem.id ? "자신의 계정은 삭제할 수 없습니다" : "사용자 삭제"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 text-sm text-muted-foreground">
                총 {users.length}명의 사용자
              </div>
            </div>
          )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title="사용자 삭제"
        description={
          userToDelete
            ? `정말로 ${userToDelete.name || userToDelete.email || '이 사용자'}를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 사용자의 모든 데이터(스케줄 ${userToDelete.schedule_count || 0}개 포함)가 영구적으로 삭제됩니다.`
            : ''
        }
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleConfirmDelete}
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </ContentModal>
  )
}
