import handleMeetingSummary from "./meeting_summary.js"

const selectMenuHandlers: Record<string, (interaction: any) => Promise<void>> = {
    "select_meeting_summary": handleMeetingSummary,
}

export default selectMenuHandlers
