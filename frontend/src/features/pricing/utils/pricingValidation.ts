import type { PricingRule } from '../components/PricingRuleDialog'
import type { PricingRuleResponse } from '../api/pricingApi'

/**
 * 값 정규화 함수 (undefined와 빈 문자열을 동일하게 취급)
 */
function normalize(val: string | undefined): string | undefined {
  return val || undefined
}

/**
 * 중복 단가 규칙 검사
 * @param rule - 검사할 규칙
 * @param existingRules - 기존 규칙 목록
 * @param excludeId - 제외할 규칙 ID (수정 시 자기 자신 제외)
 * @returns 중복 여부
 */
export function isDuplicatePricingRule(
  rule: PricingRule,
  existingRules: PricingRuleResponse[],
  excludeId?: number
): boolean {
  return existingRules.some(existingRule => {
    // 수정 중인 항목은 제외
    if (existingRule.id === excludeId) return false

    const locationMatch = normalize(existingRule.location) === normalize(rule.location)
    const venueMatch = normalize(existingRule.venue) === normalize(rule.venue)
    const hallMatch = normalize(existingRule.hall) === normalize(rule.hall)
    const brandMatch = normalize(existingRule.brand) === normalize(rule.brand)
    const albumMatch = normalize(existingRule.album) === normalize(rule.album)

    // 날짜 비교: 둘 다 없거나, 둘 다 있고 같거나 (한쪽만 있으면 다름)
    const startDateMatch = (!existingRule.startDate && !rule.startDate) ||
                           (existingRule.startDate && rule.startDate &&
                            existingRule.startDate.getTime() === rule.startDate.getTime())
    const endDateMatch = (!existingRule.endDate && !rule.endDate) ||
                         (existingRule.endDate && rule.endDate &&
                          existingRule.endDate.getTime() === rule.endDate.getTime())

    return locationMatch && venueMatch && hallMatch && brandMatch && albumMatch &&
           startDateMatch && endDateMatch
  })
}
