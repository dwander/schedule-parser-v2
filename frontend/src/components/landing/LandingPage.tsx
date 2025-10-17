import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { useConfigStore } from '@/stores/useConfigStore'

interface LandingPageProps {
  onContinueAnonymous: () => void
}

export function LandingPage({ onContinueAnonymous }: LandingPageProps) {
  const { config } = useConfigStore()

  const features = [
    '카카오톡 메시지 붙여넣기로 빠른 스케줄 등록',
    'Chat GPT API로 다양한 유형의 카카오톡 메세지 인식',
    '촬영노트 - 촬영 상세상담 내용 작성',
    '폴더 동기화 - jpg/raw 불일치 탐지, 촬영컷수 자동 업데이트',
    '원판순서 체크리스트 - 음성인식 자동화',
    '구글/네이버 캘린더 연동',
  ]

  const handleGoogleLogin = () => {
    if (!config?.google_client_id) {
      toast.error('구글 클라이언트 ID가 설정되지 않았습니다')
      return
    }

    const REDIRECT_URI = encodeURIComponent(`${window.location.origin}/auth/google/callback`)

    // OAuth 2.0 Authorization Code Flow
    // scope에 email, profile, openid 포함 (기본 로그인용)
    const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.google_client_id}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`
    window.location.href = googleLoginUrl
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
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              본식스냅러
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              본식스냅 촬영 스케줄 관리
            </p>
          </div>
        </div>

        {/* 기능 목록 */}
        <div className="grid gap-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <Check className="h-3.5 w-3.5 text-primary/60 flex-shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>

        {/* 로그인 버튼 */}
        <div className="w-full max-w-md space-y-3">
          {/* 구글 로그인 - OAuth 방식 */}
          <div className="w-full flex justify-center">
            <Button
              variant="outline"
              className="w-[21.75rem] h-[2.4375rem] text-sm bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
              onClick={handleGoogleLogin}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 로그인
            </Button>
          </div>

          {/* 네이버 로그인 */}
          <div className="w-full flex justify-center">
            <Button
              variant="outline"
              className="w-[21.75rem] h-[2.4375rem] text-sm bg-naver hover:brightness-90 text-white border-naver"
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
              className="w-[21.75rem] h-[2.4375rem] text-sm bg-kakao hover:brightness-95 text-kakao-foreground border-kakao"
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
              className="w-[21.75rem] h-10 text-sm"
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
