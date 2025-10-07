import { apiClient } from '@/lib/api/client'
import type { PricingRule } from '../components/PricingRuleDialog'

export interface PricingRuleResponse extends PricingRule {
  start_date?: string  // 백엔드 응답 필드 (snake_case)
  end_date?: string    // 백엔드 응답 필드 (snake_case)
  created_at?: string
  updated_at?: string
  priority: number
}

// 단가 규칙 목록 조회
export async function fetchPricingRules(userId: string): Promise<PricingRuleResponse[]> {
  const response = await apiClient.get(`/api/pricing/rules`, {
    params: { user_id: userId }
  })
  return response.data
}

// 단가 규칙 생성
export async function createPricingRule(
  userId: string,
  rule: Omit<PricingRule, 'id'>
): Promise<PricingRuleResponse> {
  const response = await apiClient.post(`/api/pricing/rules`, {
    ...rule,
    start_date: rule.startDate ? formatDate(rule.startDate) : undefined,
    end_date: rule.endDate ? formatDate(rule.endDate) : undefined,
    is_active: true
  }, {
    params: { user_id: userId }
  })
  return response.data
}

// 단가 규칙 수정
export async function updatePricingRule(
  userId: string,
  ruleId: number,
  rule: Partial<PricingRule>
): Promise<PricingRuleResponse> {
  const response = await apiClient.put(`/api/pricing/rules/${ruleId}`, {
    ...rule,
    start_date: rule.startDate ? formatDate(rule.startDate) : null,
    end_date: rule.endDate ? formatDate(rule.endDate) : null,
  }, {
    params: { user_id: userId }
  })
  return response.data
}

// 단가 규칙 삭제
export async function deletePricingRule(
  userId: string,
  ruleId: number
): Promise<void> {
  await apiClient.delete(`/api/pricing/rules/${ruleId}`, {
    params: { user_id: userId }
  })
}

// 스케줄에 단가 규칙 적용
export async function applyPricingRules(
  userId: string,
  ruleIds?: number[],
  scheduleIds?: number[]
): Promise<{ message: string; updated_count: number }> {
  const response = await apiClient.post(`/api/pricing/apply`, {
    rule_ids: ruleIds,
    schedule_ids: scheduleIds
  }, {
    params: { user_id: userId }
  })
  return response.data
}

// 날짜 포맷 변환 (Date → YYYY.MM.DD)
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

// 날짜 파싱 (YYYY.MM.DD → Date)
export function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined
  const parts = dateStr.split('.')
  if (parts.length !== 3) return undefined
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
}