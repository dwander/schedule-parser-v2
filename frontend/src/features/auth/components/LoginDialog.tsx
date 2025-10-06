import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useGoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'
import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'
import { useState } from 'react'
import { getAnonymousUserId, clearAnonymousData } from '@/lib/utils/userUtils'
import { migrateSchedules } from '@/features/schedule/api/scheduleApi'
import { fetchSchedules } from '@/features/schedule/api/scheduleApi'
import { MigrateDataDialog } from './MigrateDataDialog'
import { useQueryClient } from '@tanstack/react-query'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const redirectUri = 'http://localhost:5173'
  const { login } = useAuthStore()
  const queryClient = useQueryClient()
  const [migrateDialogOpen, setMigrateDialogOpen] = useState(false)
  const [anonymousScheduleCount, setAnonymousScheduleCount] = useState(0)
  const [pendingUser, setPendingUser] = useState<{
    id: string
    email: string
    name: string
    picture?: string
  } | null>(null)

  const checkAnonymousData = async (newUserId: string) => {
    const anonymousId = getAnonymousUserId()
    if (!anonymousId) {
      // 익명 데이터 없음 - 바로 로그인 완료
      return false
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
      // 페이지 새로고침하여 마이그레이션된 데이터 표시
      setTimeout(() => {
        window.location.reload()
      }, 500)
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
    // 페이지 새로고침하여 로그인 계정 데이터 표시
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        // 백엔드로 authorization code 전송
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await axios.post(`${apiUrl}/auth/google`, {
          code: codeResponse.code,
          redirect_uri: redirectUri
        })

        const user = {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name,
          picture: response.data.picture,
          isAdmin: response.data.is_admin || false
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
          toast.success(`환영합니다, ${user.name}님!`)
          onOpenChange(false)
          // 페이지 새로고침하여 스케줄 데이터 업데이트
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }
      } catch (error) {
        console.error('백엔드 인증 실패:', error)
        toast.error('로그인 처리 중 오류가 발생했습니다')
      }
    },
    onError: (error) => {
      console.error('구글 로그인 실패:', error)
      toast.error('구글 로그인에 실패했습니다')
    },
    flow: 'auth-code',
    redirect_uri: redirectUri
  })

  const handleNaverLogin = () => {
    const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID
    const REDIRECT_URI = encodeURIComponent('http://localhost:5173/auth/naver/callback')
    const STATE = Math.random().toString(36).substring(2, 15) // Random state

    if (!NAVER_CLIENT_ID) {
      toast.error('네이버 클라이언트 ID가 설정되지 않았습니다')
      return
    }

    // Store state in sessionStorage for verification
    sessionStorage.setItem('naver_state', STATE)

    // Redirect to Naver login (with calendar scope)
    const naverLoginUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${STATE}&scope=calendar`
    window.location.href = naverLoginUrl
  }

  const handleKakaoLogin = () => {
    const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY
    const REDIRECT_URI = encodeURIComponent('http://localhost:5173/auth/kakao/callback')

    if (!KAKAO_REST_API_KEY) {
      toast.error('카카오 REST API 키가 설정되지 않았습니다')
      return
    }

    // Redirect to Kakao login
    const kakaoLoginUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`
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
            {/* 구글 로그인 */}
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => handleGoogleLogin()}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 로그인
            </Button>

            {/* 네이버 로그인 */}
            <Button
              variant="outline"
              className="w-full h-12 text-base bg-[#03C75A] hover:bg-[#02B350] text-white border-[#03C75A] hover:border-[#02B350]"
              onClick={handleNaverLogin}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
              </svg>
              네이버로 로그인
            </Button>

            {/* 카카오 로그인 */}
            <Button
              variant="outline"
              className="w-full h-12 text-base bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] border-[#FEE500] hover:border-[#FDD835]"
              onClick={handleKakaoLogin}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.568 1.547 4.844 3.926 6.238-.136.49-.889 3.14-.914 3.286-.036.212.079.21.166.153.064-.042 2.619-1.738 3.036-2.021 4.061.548 8.786-1.099 8.786-7.656C22 6.477 17.523 3 12 3z" />
              </svg>
              카카오로 로그인
            </Button>
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
