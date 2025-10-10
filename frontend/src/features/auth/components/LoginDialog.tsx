import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { GoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'
import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { useState } from 'react'
import { getAnonymousUserId, clearAnonymousData } from '@/lib/utils/userUtils'
import { migrateSchedules } from '@/features/schedule/api/scheduleApi'
import { MigrateDataDialog } from './MigrateDataDialog'
import { useQueryClient } from '@tanstack/react-query'
import type { GoogleCredentialResponse } from '@/features/parser/types/parser'
import { getApiUrl } from '@/lib/constants/api'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { login } = useAuthStore()
  const { config } = useConfigStore()
  const queryClient = useQueryClient()
  const [migrateDialogOpen, setMigrateDialogOpen] = useState(false)
  const [anonymousScheduleCount, setAnonymousScheduleCount] = useState(0)
  const [pendingUser, setPendingUser] = useState<{
    id: string
    email: string
    name: string
    picture?: string
    isAdmin?: boolean
    hasSeenSampleData?: boolean
  } | null>(null)

  const checkAnonymousData = async (newUserId: string) => {
    const anonymousId = getAnonymousUserId()
    if (!anonymousId) {
      // 익명 데이터 없음 - 바로 로그인 완료
      return false
    }

    try {
      const apiUrl = getApiUrl()

      // 로그인 계정의 기존 스케줄 확인
      const existingResponse = await axios.get(`${apiUrl}/api/schedules`, {
        params: { user_id: newUserId }
      })
      const existingSchedules = existingResponse.data || []

      // 로그인 계정에 이미 데이터가 있으면 마이그레이션 제안하지 않음
      if (existingSchedules.length > 0) {
        console.log(`로그인 계정에 이미 ${existingSchedules.length}개의 스케줄이 있어 마이그레이션을 건너뜁니다.`)
        return false
      }

      // 익명 스케줄 데이터 확인
      const anonymousResponse = await axios.get(`${apiUrl}/api/schedules`, {
        params: { user_id: anonymousId }
      })

      const anonymousSchedules = anonymousResponse.data || []
      if (anonymousSchedules.length > 0) {
        setAnonymousScheduleCount(anonymousSchedules.length)
        return true
      }

      return false
    } catch (error) {
      console.error('익명 데이터 확인 실패:', error)
      return false
    }
  }

  const handleMigrate = async () => {
    if (!pendingUser) return

    const anonymousId = getAnonymousUserId()
    if (!anonymousId) return

    // 백엔드에서 이미 prefix가 붙어서 옴 (google_xxx, naver_xxx, kakao_xxx)
    const newUserId = pendingUser.id

    try {
      await migrateSchedules(anonymousId, newUserId)
      clearAnonymousData()

      // 로그인 완료
      login(pendingUser)

      // 스케줄 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })

      toast.success(`환영합니다, ${pendingUser.name}님! 기존 데이터가 이동되었습니다.`)
      setMigrateDialogOpen(false)
      setPendingUser(null)
      onOpenChange(false)
    } catch (error) {
      console.error('마이그레이션 실패:', error)
      toast.error('데이터 이동 중 오류가 발생했습니다')
    }
  }

  const handleSkipMigration = () => {
    if (!pendingUser) return

    clearAnonymousData()

    // 로그인 완료
    login(pendingUser)

    // 스케줄 데이터 새로고침 (빈 데이터로 시작)
    queryClient.invalidateQueries({ queryKey: ['schedules'] })
    queryClient.invalidateQueries({ queryKey: ['tags'] })

    toast.success(`환영합니다, ${pendingUser.name}님!`)
    setMigrateDialogOpen(false)
    setPendingUser(null)
    onOpenChange(false)
  }

  const handleGoogleLoginSuccess = async (credentialResponse: GoogleCredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received')
      }

      // 백엔드로 ID Token 전송
      const apiUrl = getApiUrl()
      const response = await axios.post(`${apiUrl}/auth/google/token`, {
        credential: credentialResponse.credential
      })

      const user = {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture,
        isAdmin: response.data.is_admin || false,
        hasSeenSampleData: response.data.has_seen_sample_data || false
      }

      // 익명 데이터 확인 (백엔드에서 이미 prefix가 붙어서 옴)
      const hasAnonymousData = await checkAnonymousData(user.id)

      if (hasAnonymousData) {
        // 마이그레이션 다이얼로그 표시
        setPendingUser(user)
        setMigrateDialogOpen(true)
        onOpenChange(false) // 로그인 다이얼로그 닫기
      } else {
        // 익명 데이터 없음 - 바로 로그인
        login(user)
        queryClient.invalidateQueries({ queryKey: ['schedules'] })
        queryClient.invalidateQueries({ queryKey: ['tags'] })
        toast.success(`환영합니다, ${user.name}님!`)
        onOpenChange(false)
      }
    } catch (error) {
      console.error('백엔드 인증 실패:', error)
      toast.error('로그인 처리 중 오류가 발생했습니다')
    }
  }

  const handleGoogleLoginError = () => {
    console.error('구글 로그인 실패')
    toast.error('구글 로그인에 실패했습니다')
  }

  const handleNaverLogin = () => {
    if (!config?.naver_client_id) {
      toast.error('네이버 클라이언트 ID가 설정되지 않았습니다')
      return
    }

    const REDIRECT_URI = encodeURIComponent(`${window.location.origin}/auth/naver/callback`)
    const STATE = Math.random().toString(36).substring(2, 15) // Random state

    // Store state in sessionStorage for verification
    sessionStorage.setItem('naver_state', STATE)

    // Redirect to Naver login (with calendar scope)
    const naverLoginUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${config.naver_client_id}&redirect_uri=${REDIRECT_URI}&state=${STATE}&scope=calendar`
    window.location.href = naverLoginUrl
  }

  const handleKakaoLogin = () => {
    if (!config?.kakao_rest_api_key) {
      toast.error('카카오 REST API 키가 설정되지 않았습니다')
      return
    }

    const REDIRECT_URI = encodeURIComponent(`${window.location.origin}/auth/kakao/callback`)

    // Redirect to Kakao login
    const kakaoLoginUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${config.kakao_rest_api_key}&redirect_uri=${REDIRECT_URI}&response_type=code`
    window.location.href = kakaoLoginUrl
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>로그인</DialogTitle>
            <DialogDescription>
              SNS 계정으로 간편하게 로그인하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-4">
            {/* 구글 로그인 - FedCM 방식 */}
            <div className="w-full flex justify-center">
              <div className="py-0.5" style={{ width: '348px', maxWidth: '348px' }}>
                <div style={{ width: '348px', maxWidth: '348px', overflow: 'hidden' }}>
                  <GoogleLogin
                    onSuccess={handleGoogleLoginSuccess}
                    onError={handleGoogleLoginError}
                    useOneTap={false}
                    use_fedcm_for_prompt={true}
                    itp_support={true}
                    auto_select={true}
                    text="signin_with"
                    size="large"
                    width="348"
                    logo_alignment="left"
                  />
                </div>
              </div>
            </div>

            {/* 네이버 로그인 */}
            <div className="w-full flex justify-center">
              <Button
                variant="outline"
                className="w-[348px] h-11 text-sm bg-[#03C75A] hover:bg-[#02B350] text-white border-[#03C75A] hover:border-[#02B350]"
                onClick={handleNaverLogin}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
                </svg>
                네이버로 로그인
              </Button>
            </div>

            {/* 카카오 로그인 */}
            <div className="w-full flex justify-center">
              <Button
                variant="outline"
                className="w-[348px] h-11 text-sm bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] border-[#FEE500] hover:border-[#FDD835]"
                onClick={handleKakaoLogin}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.568 1.547 4.844 3.926 6.238-.136.49-.889 3.14-.914 3.286-.036.212.079.21.166.153.064-.042 2.619-1.738 3.036-2.021 4.061.548 8.786-1.099 8.786-7.656C22 6.477 17.523 3 12 3z" />
                </svg>
                카카오로 로그인
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Migration Dialog */}
      <MigrateDataDialog
        open={migrateDialogOpen}
        scheduleCount={anonymousScheduleCount}
        onConfirm={handleMigrate}
        onCancel={handleSkipMigration}
      />
    </>
  )
}
