# PWA (Progressive Web App) 가이드

## 📱 개요

웹앱을 PWA로 변환하여 iOS/Android 모두에서 설치 가능한 앱처럼 사용할 수 있습니다.

## ✅ 설치 완료된 항목

- ✅ vite-plugin-pwa 설정
- ✅ Service Worker 자동 생성
- ✅ Web App Manifest 설정
- ✅ 오프라인 지원 (캐싱)
- ✅ 자동 업데이트

## 🎨 아이콘 자동 생성 ✅

아이콘은 `public/logo.png`에서 자동으로 생성됩니다!

### 자동 생성되는 아이콘
빌드 시 자동으로 생성:
- `pwa-192x192.png` (Android)
- `pwa-512x512.png` (Android)
- `apple-touch-icon.png` (iOS, 180x180)
- `favicon.ico` (브라우저 탭)

### 로고 변경하려면?
`public/logo.png` 파일을 원하는 이미지로 교체하세요.
- **권장 크기**: 512x512px 이상
- **투명 배경** 권장
- **PNG 포맷**

변경 후 빌드하면 자동으로 모든 아이콘이 재생성됩니다:
```bash
npm run build
```

수동으로 아이콘만 재생성하려면:
```bash
npm run generate:icons
```

## 📱 설치 방법

### iOS (Safari)
1. Safari에서 웹사이트 접속
2. 하단 **공유** 버튼 탭
3. **홈 화면에 추가** 선택
4. 앱 이름 확인 후 **추가**

### Android (Chrome)
1. Chrome에서 웹사이트 접속
2. 상단에 **설치** 배너 표시됨 (자동)
3. 또는 메뉴(⋮) → **홈 화면에 추가**
4. **설치** 탭

### Desktop (Chrome/Edge)
1. 주소창 오른쪽의 **설치** 아이콘 클릭
2. 또는 메뉴(⋮) → **앱 설치**

## 🚀 배포

PWA는 HTTPS가 필수입니다 (localhost 제외).

### Railway 배포 (현재 설정)
```bash
cd ~/projects/schedule-parser-v2
./deploy.sh
```

Railway는 자동으로 HTTPS를 제공하므로 별도 설정 불필요!

### PWA 작동 확인

1. **Chrome DevTools**:
   - F12 → Application 탭
   - Manifest: 앱 정보 확인
   - Service Workers: 등록 확인

2. **Lighthouse**:
   - F12 → Lighthouse 탭
   - Progressive Web App 카테고리 체크
   - Generate report

## ✨ PWA 기능

### 현재 활성화된 기능

- ✅ **홈 화면 설치**: 앱처럼 설치 가능
- ✅ **오프라인 지원**: 네트워크 없이도 기본 기능 동작
- ✅ **자동 업데이트**: 새 버전 자동 감지 및 업데이트
- ✅ **캐싱**: 폰트, CSS, JS 자동 캐싱 (속도 향상)
- ✅ **풀스크린 모드**: 브라우저 UI 없이 앱처럼 실행
- ✅ **세로 모드 고정**: 모바일에서 세로 화면 유지

### 추가 가능한 기능 (선택)

- 📱 **푸시 알림**: 사용자에게 알림 전송
- 📥 **백그라운드 동기화**: 오프라인 작업 자동 동기화
- 📍 **위치 정보**: GPS 활용
- 📷 **카메라 접근**: 사진 촬영
- 🔔 **배지 API**: 앱 아이콘에 숫자 표시

## 🔧 테마 색상 변경

`vite.config.ts`에서 수정:
```typescript
manifest: {
  theme_color: '#ffffff',  // 상단바 색상
  background_color: '#ffffff'  // 스플래시 스크린 배경
}
```

다크 테마용:
```typescript
theme_color: '#1a1a1a',
background_color: '#1a1a1a'
```

## 📊 PWA vs 네이티브 앱

### PWA 장점
- ✅ iOS/Android 동시 지원
- ✅ 앱스토어 심사 불필요
- ✅ 즉시 업데이트 (심사 대기 없음)
- ✅ 개발 비용 낮음
- ✅ URL 공유 가능

### PWA 제약사항
- ❌ 앱스토어 검색 노출 안 됨
- ❌ 일부 네이티브 기능 제한 (iOS 특히)
- ❌ 푸시 알림 (iOS는 2023년부터 지원)

## 🔍 트러블슈팅

### "홈 화면에 추가" 버튼이 안 보여요
- HTTPS 확인 (http:// 아닌 https://)
- 아이콘 파일 확인 (public/ 폴더)
- manifest.json 생성 확인 (빌드 후 dist/manifest.webmanifest)

### Service Worker 등록 안 됨
- HTTPS 필수 (localhost 제외)
- 브라우저 캐시 삭제 후 재시도
- DevTools → Application → Service Workers → Unregister

### iOS에서 설치 안 됨
- Safari만 지원 (Chrome 앱 X)
- manifest의 display: 'standalone' 확인
- 아이콘 크기 확인 (최소 192x192)

## 📚 참고 자료

- [PWA 체크리스트](https://web.dev/pwa-checklist/)
- [vite-plugin-pwa 문서](https://vite-pwa-org.netlify.app/)
- [PWA Builder](https://www.pwabuilder.com/)

## 🎯 다음 단계

1. ✅ PWA 설정 완료
2. ⏳ **아이콘 생성 및 추가** (필수)
3. ⏳ 빌드 및 배포
4. ⏳ 모바일에서 설치 테스트
5. ⏳ Lighthouse 점수 확인
