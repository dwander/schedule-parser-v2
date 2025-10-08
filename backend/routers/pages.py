from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from constants import SERVICE_NAME

router = APIRouter()


# --- API Endpoints ---

@router.get("/")
def read_root():
    return {"message": "Hello from the Schedule Parser backend!"}


@router.get("/privacy-policy", response_class=HTMLResponse)
def privacy_policy():
    """개인정보처리방침 페이지"""
    return f"""
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>개인정보처리방침 - {SERVICE_NAME}</title>
        <style>
            body {{ font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.6; margin: 0; padding: 2rem; background: #f8f9fa; }}
            .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            h1 {{ color: #0d6efd; border-bottom: 2px solid #0d6efd; padding-bottom: 0.5rem; }}
            h2 {{ color: #495057; margin-top: 2rem; }}
            .date {{ color: #6c757d; margin-bottom: 2rem; }}
            ul {{ padding-left: 1.5rem; }}
            li {{ margin-bottom: 0.5rem; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>개인정보처리방침</h1>
            <p class="date">최종 수정일: 2024년 9월 23일</p>

            <h2>1. 개인정보 수집 및 이용 목적</h2>
            <p>{SERVICE_NAME}(이하 "서비스")는 다음의 목적을 위해 개인정보를 수집 및 이용합니다:</p>
            <ul>
                <li>스케줄 관리 서비스 제공</li>
                <li>사용자 인증 및 계정 관리</li>
                <li>데이터 동기화 및 백업</li>
                <li>서비스 개선 및 사용자 지원</li>
            </ul>

            <h2>2. 수집하는 개인정보 항목</h2>
            <p>서비스는 다음의 개인정보를 수집합니다:</p>
            <ul>
                <li><strong>Google 계정 정보:</strong> 이름, 이메일 주소, 프로필 사진</li>
                <li><strong>서비스 이용 기록:</strong> 스케줄 데이터, 설정 정보</li>
                <li><strong>기술적 정보:</strong> IP 주소, 브라우저 정보, 접속 로그</li>
            </ul>

            <h2>3. 개인정보 보유 및 이용 기간</h2>
            <p>수집된 개인정보는 다음 기간 동안 보유됩니다:</p>
            <ul>
                <li>회원 탈퇴 시까지 (서비스 이용 기간)</li>
                <li>관련 법령에 따른 보존 의무 기간</li>
                <li>사용자가 직접 삭제 요청 시 즉시 삭제</li>
            </ul>

            <h2>4. 개인정보 제3자 제공</h2>
            <p>서비스는 사용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다:</p>
            <ul>
                <li>사용자가 사전에 동의한 경우</li>
                <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>

            <h2>5. 개인정보 처리 위탁</h2>
            <p>서비스는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>
            <ul>
                <li><strong>Google LLC:</strong> 사용자 인증 및 클라우드 저장</li>
                <li><strong>Railway:</strong> 서버 호스팅 및 데이터 저장</li>
            </ul>

            <h2>6. 사용자의 권리</h2>
            <p>사용자는 다음과 같은 권리를 가집니다:</p>
            <ul>
                <li>개인정보 처리 현황에 대한 열람 요구</li>
                <li>개인정보 수정·삭제 요구</li>
                <li>개인정보 처리 정지 요구</li>
                <li>손해 발생 시 손해배상 요구</li>
            </ul>

            <h2>7. 개인정보 보호책임자</h2>
            <p>개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 개인정보 보호책임자를 지정하고 있습니다.</p>

            <h2>8. 개인정보처리방침 변경</h2>
            <p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>
        </div>
    </body>
    </html>
    """


@router.get("/terms-of-service", response_class=HTMLResponse)
def terms_of_service():
    """서비스 이용약관 페이지"""
    return f"""
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>서비스 이용약관 - {SERVICE_NAME}</title>
        <style>
            body {{ font-family: 'Segoe UI', system-ui, sans-serif; line-height: 1.6; margin: 0; padding: 2rem; background: #f8f9fa; }}
            .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            h1 {{ color: #0d6efd; border-bottom: 2px solid #0d6efd; padding-bottom: 0.5rem; }}
            h2 {{ color: #495057; margin-top: 2rem; }}
            .date {{ color: #6c757d; margin-bottom: 2rem; }}
            ul, ol {{ padding-left: 1.5rem; }}
            li {{ margin-bottom: 0.5rem; }}
            ol > li > ul {{ margin-top: 0.5rem; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>서비스 이용약관</h1>
            <p class="date">최종 수정일: 2024년 9월 23일</p>

            <h2>제1조 (목적)</h2>
            <p>이 약관은 {SERVICE_NAME}(이하 "서비스")의 이용조건 및 절차, 서비스와 회원의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

            <h2>제2조 (정의)</h2>
            <ul>
                <li><strong>"서비스"</strong>라 함은 {SERVICE_NAME}가 제공하는 웨딩 스케줄 관리 서비스를 의미합니다.</li>
                <li><strong>"회원"</strong>이라 함은 서비스에 접속하여 이 약관에 따라 서비스를 받는 고객을 말합니다.</li>
                <li><strong>"계정"</strong>이라 함은 회원의 식별과 서비스 이용을 위하여 회원이 선정한 구글 계정을 의미합니다.</li>
            </ul>

            <h2>제3조 (약관의 효력 및 변경)</h2>
            <ol>
                <li>이 약관은 서비스를 이용하는 모든 회원에게 그 효력이 발생합니다.</li>
                <li>서비스는 필요한 경우 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지됩니다.</li>
                <li>변경된 약관에 동의하지 않는 경우, 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ol>

            <h2>제4조 (서비스의 제공 및 변경)</h2>
            <ol>
                <li>서비스는 다음과 같은 업무를 제공합니다:
                    <ul>
                        <li>웨딩 스케줄 생성, 수정, 삭제, 조회</li>
                        <li>스케줄 데이터 클라우드 동기화</li>
                        <li>스케줄 통계 및 분석</li>
                        <li>기타 서비스가 정하는 업무</li>
                    </ul>
                </li>
                <li>서비스는 운영상, 기술상의 필요에 따라 제공하고 있는 서비스를 변경할 수 있습니다.</li>
            </ol>

            <h2>제5조 (서비스 이용)</h2>
            <ol>
                <li>서비스 이용은 연중무휴, 1일 24시간을 원칙으로 합니다.</li>
                <li>서비스는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
                <li>무료 서비스는 서비스의 정책에 따라 제한될 수 있습니다.</li>
            </ol>

            <h2>제6조 (회원의 의무)</h2>
            <ol>
                <li>회원은 다음 행위를 하여서는 안 됩니다:
                    <ul>
                        <li>신청 또는 변경 시 허위내용의 등록</li>
                        <li>타인의 정보 도용</li>
                        <li>서비스에 게시된 정보의 변경</li>
                        <li>서비스가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                        <li>서비스 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                        <li>서비스 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                        <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
                    </ul>
                </li>
            </ol>

            <h2>제7조 (개인정보보호)</h2>
            <p>서비스는 관련법령이 정하는 바에 따라 회원의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 사용에 대해서는 관련법령 및 서비스의 개인정보처리방침이 적용됩니다.</p>

            <h2>제8조 (면책조항)</h2>
            <ol>
                <li>서비스는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                <li>서비스는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
                <li>서비스는 회원이 서비스에 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.</li>
            </ol>

            <h2>제9조 (준거법 및 관할법원)</h2>
            <p>이 약관에 명시되지 않은 사항은 대한민국의 관련 법령에 의합니다. 서비스 이용으로 발생한 분쟁에 대해 소송이 제기되는 경우 관련 법령에 따른 법원을 관할 법원으로 합니다.</p>

            <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #dee2e6; text-align: center; color: #6c757d; font-size: 0.875rem;">
                부칙: 이 약관은 2024년 9월 23일부터 적용됩니다.
            </div>
        </div>
    </body>
    </html>
    """
