import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'
import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { useQueryClient } from '@tanstack/react-query'
import type { GoogleCredentialResponse } from '@/features/parser/types/parser'
import { getApiUrl } from '@/lib/constants/api'

interface LandingPageProps {
  onContinueAnonymous: () => void
}

export function LandingPage({ onContinueAnonymous }: LandingPageProps) {
  const { login } = useAuthStore()
  const { config } = useConfigStore()
  const queryClient = useQueryClient()

  const features = [
    '카카오톡 메시지 붙여넣기로 빠른 스케줄 등록',
    'Chat GPT API로 다양한 유형의 카카오톡 메세지 인식',
    '촬영노트 - 촬영 상세상담 내용 작성',
    '폴더 동기화 - jpg/raw 불일치 탐지, 촬영컷수 자동 업데이트',
    '원판순서 체크리스트 - 음성인식 자동화',
    '구글/네이버 캘린더 연동',
  ]

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

      login(user)
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success(`환영합니다, ${user.name}님!`)
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
    const STATE = Math.random().toString(36).substring(2, 15)

    sessionStorage.setItem('naver_state', STATE)
    const naverLoginUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${config.naver_client_id}&redirect_uri=${REDIRECT_URI}&state=${STATE}&scope=calendar`
    window.location.href = naverLoginUrl
  }

  const handleKakaoLogin = () => {
    if (!config?.kakao_rest_api_key) {
      toast.error('카카오 REST API 키가 설정되지 않았습니다')
      return
    }

    const REDIRECT_URI = encodeURIComponent(`${window.location.origin}/auth/kakao/callback`)

    const kakaoLoginUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${config.kakao_rest_api_key}&redirect_uri=${REDIRECT_URI}&response_type=code`
    window.location.href = kakaoLoginUrl
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full space-y-12 flex flex-col items-center">
        {/* 로고 및 타이틀 */}
        <div className="text-center space-y-6">
          <img
            src="/logo.png"
            alt="본식스냅러 로고"
            className="h-32 w-32 mx-auto object-contain"
          />
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
            본식스냅러
          </h1>
        </div>

        {/* 기능 목록 */}
        <div className="grid gap-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>

        {/* 로그인 버튼 */}
        <div className="w-full max-w-md space-y-3">
          {/* 구글 로그인 - FedCM 방식 */}
          <div className="w-full flex justify-center">
            <div className="py-0.5">
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
                useOneTap={false}
                use_fedcm_for_prompt={true}
                text="signin_with"
                size="large"
                width="348"
                logo_alignment="left"
              />
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

          {/* 로그인 없이 이용 */}
          <div className="w-full flex justify-center">
            <Button
              onClick={onContinueAnonymous}
              variant="ghost"
              className="w-[348px] h-10 text-sm"
            >
              로그인 없이 이용
            </Button>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2025 본식스냅러. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
