
import { activityReportButtonHandlers } from './activity_report.js'

export const buttonHandlers: Record<string, (interaction: any) => Promise<void>> = {
    // Example: member_discord_stats_${id}
    // "member_discord_stats_": handleMemberDiscordStats,
    ...activityReportButtonHandlers,
}
