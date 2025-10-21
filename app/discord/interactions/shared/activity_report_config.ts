// Shared configuration store for activity reports
// This is imported by buttons, selectMenus, and modals to share state

export interface ReportConfig {
    startDate?: string
    endDate?: string
    stats: string[]
    fileType?: string
    messageId?: string // Store the original message ID
}

export const reportConfigs = new Map<string, ReportConfig>()

export function getConfigKey(userId: string, messageId: string): string {
    return `${userId}_${messageId}`
}

export function getConfig(userId: string, messageId: string): ReportConfig {
    const key = getConfigKey(userId, messageId)
    if (!reportConfigs.has(key)) {
        reportConfigs.set(key, { stats: [], messageId })
    }
    return reportConfigs.get(key)!
}

export function deleteConfig(userId: string, messageId: string): void {
    const key = getConfigKey(userId, messageId)
    reportConfigs.delete(key)
}
