import handleMeetingAttendance from "./meeting_attendance.js"
import handleMeetingSummary from "./meeting_summary.js"

const selectMenuHandlers: Record<string, (interaction: any) => Promise<void>> = {
    "select_meeting_summary": handleMeetingSummary,
    "select_meeting_attendance": handleMeetingAttendance,
}

export default selectMenuHandlers
