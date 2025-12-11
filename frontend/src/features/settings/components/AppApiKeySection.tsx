/**
 * 앱 API 키 관리 섹션
 *
 * 데스크탑 앱 연동을 위한 API 키 생성/관리 UI
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { AlertDialog } from '@/components/common/AlertDialog'
import { Plus, Trash2, RefreshCw, Copy, Check, Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAppApiKeys,
  useCreateAppApiKey,
  useDeleteAppApiKey,
  useDeactivateAppApiKey,
  useActivateAppApiKey,
  useRegenerateAppApiKey,
} from '../hooks/useAppApiKeys'
import type { AppApiKey } from '../api/appKeysApi'

export function AppApiKeySection() {
  // 새 키 생성 상태
  const [newKeyName, setNewKeyName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // 생성된 키 표시 (1회만)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<AppApiKey | null>(null)

  // 재생성 확인 다이얼로그
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false)
  const [keyToRegenerate, setKeyToRegenerate] = useState<AppApiKey | null>(null)

  // API 훅
  const { data, isLoading } = useAppApiKeys()
  const createMutation = useCreateAppApiKey()
  const deleteMutation = useDeleteAppApiKey()
  const deactivateMutation = useDeactivateAppApiKey()
  const activateMutation = useActivateAppApiKey()
  const regenerateMutation = useRegenerateAppApiKey()

  const apiKeys = data?.api_keys || []

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('키 이름을 입력해주세요')
      return
    }

    try {
      const result = await createMutation.mutateAsync(newKeyName.trim())
      setNewlyCreatedKey(result.key)
      setNewKeyName('')
      setIsCreating(false)
      toast.success('API 키가 생성되었습니다')
    } catch {
      toast.error('API 키 생성에 실패했습니다')
    }
  }

  const handleCopyKey = async () => {
    if (!newlyCreatedKey) return

    try {
      await navigator.clipboard.writeText(newlyCreatedKey)
      setCopiedKey(true)
      toast.success('API 키가 클립보드에 복사되었습니다')
      setTimeout(() => setCopiedKey(false), 2000)
    } catch {
      toast.error('복사에 실패했습니다')
    }
  }

  const handleDeleteKey = async () => {
    if (!keyToDelete) return

    try {
      await deleteMutation.mutateAsync(keyToDelete.id)
      toast.success('API 키가 삭제되었습니다')
    } catch {
      toast.error('삭제에 실패했습니다')
    } finally {
      setDeleteConfirmOpen(false)
      setKeyToDelete(null)
    }
  }

  const handleToggleActive = async (key: AppApiKey) => {
    try {
      if (key.is_active) {
        await deactivateMutation.mutateAsync(key.id)
        toast.success('API 키가 비활성화되었습니다')
      } else {
        await activateMutation.mutateAsync(key.id)
        toast.success('API 키가 활성화되었습니다')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '상태 변경에 실패했습니다'
      toast.error(message)
    }
  }

  const handleRegenerateKey = async () => {
    if (!keyToRegenerate) return

    try {
      const result = await regenerateMutation.mutateAsync(keyToRegenerate.id)
      setNewlyCreatedKey(result.key)
      toast.success('API 키가 재생성되었습니다')
    } catch {
      toast.error('재생성에 실패했습니다')
    } finally {
      setRegenerateConfirmOpen(false)
      setKeyToRegenerate(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
    return formatDate(dateStr)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">앱 API 키</h2>

      {/* 설명 */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>데스크탑 앱에서 스케줄 정보를 조회하려면 API 키가 필요합니다.</p>
        <p className="text-xs">⚠️ API 키는 생성 시 한 번만 표시됩니다. 안전한 곳에 저장해주세요.</p>
      </div>

      {/* 새로 생성된 키 표시 */}
      {newlyCreatedKey && (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">🔑 새 API 키</span>
            <span className="text-xs text-muted-foreground">(이 키는 다시 표시되지 않습니다)</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 rounded bg-muted text-sm font-mono break-all select-all">
              {newlyCreatedKey}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyKey}
              className="flex-shrink-0"
            >
              {copiedKey ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNewlyCreatedKey(null)}
            className="text-xs"
          >
            확인했습니다
          </Button>
        </div>
      )}

      {/* 키 생성 폼 */}
      {isCreating ? (
        <div className="flex items-center gap-2">
          <Input
            placeholder="키 이름 (예: 내 맥북, 작업용 PC)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateKey()
              if (e.key === 'Escape') {
                setIsCreating(false)
                setNewKeyName('')
              }
            }}
            className="flex-1"
            autoFocus
          />
          <Button onClick={handleCreateKey} disabled={createMutation.isPending}>
            생성
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setIsCreating(false)
              setNewKeyName('')
            }}
          >
            취소
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsCreating(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          새 API 키 생성
        </Button>
      )}

      {/* 키 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">로딩 중...</div>
        ) : apiKeys.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            생성된 API 키가 없습니다
          </div>
        ) : (
          apiKeys.map((key) => (
            <div
              key={key.id}
              className={`p-4 rounded-lg border ${
                key.is_active
                  ? 'border-border bg-card'
                  : 'border-border/50 bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{key.name}</span>
                    {!key.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        비활성
                      </span>
                    )}
                    {key.expires_at && new Date(key.expires_at) <= new Date() && (
                      <span className="text-xs px-2 py-0.5 rounded bg-destructive/10 text-destructive">
                        만료됨
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>키: <code className="bg-muted px-1 rounded">{key.key_prefix}...</code></div>
                    <div>생성: {formatDate(key.created_at)}</div>
                    {key.last_used_at && (
                      <div>마지막 사용: {getRelativeTime(key.last_used_at)}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(key)}
                    disabled={
                      deactivateMutation.isPending ||
                      activateMutation.isPending ||
                      !!(key.expires_at && new Date(key.expires_at) <= new Date())
                    }
                    title={key.is_active ? '비활성화' : '활성화'}
                  >
                    {key.is_active ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setKeyToRegenerate(key)
                      setRegenerateConfirmOpen(true)
                    }}
                    disabled={regenerateMutation.isPending}
                    title="키 재생성"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setKeyToDelete(key)
                      setDeleteConfirmOpen(true)
                    }}
                    disabled={deleteMutation.isPending}
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 사용 안내 */}
      <div className="text-xs text-muted-foreground space-y-2 pt-4 border-t">
        <p className="font-medium">사용 방법</p>
        <p>데스크탑 앱에서 다음과 같이 API를 호출합니다:</p>
        <code className="block p-2 rounded bg-muted text-xs break-all">
          GET /api/desktop/folder-name?datetime=2025.12.15 14:00
          <br />
          Headers: X-API-Key: dk_xxxxx...
        </code>
        <p className="text-destructive/80">
          ⚠️ 분당 20회 요청 제한이 있습니다. 초과 시 키가 자동 만료됩니다.
        </p>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="API 키 삭제"
        description={`"${keyToDelete?.name}" 키를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.`}
        confirmText="삭제"
        variant="destructive"
        onConfirm={handleDeleteKey}
      />

      {/* 재생성 확인 다이얼로그 */}
      <ConfirmDialog
        open={regenerateConfirmOpen}
        onOpenChange={setRegenerateConfirmOpen}
        title="API 키 재생성"
        description={`"${keyToRegenerate?.name}" 키를 재생성하시겠습니까? 기존 키는 즉시 무효화됩니다.`}
        confirmText="재생성"
        onConfirm={handleRegenerateKey}
      />

      {/* 만료된 키 안내 알림 */}
      <AlertDialog
        open={false}
        onOpenChange={() => {}}
        title="키 만료됨"
        description="이 키는 요청 제한 초과로 만료되었습니다. 새 키를 생성하거나 키를 재생성해주세요."
      />
    </div>
  )
}
