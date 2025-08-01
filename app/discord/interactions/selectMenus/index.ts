import handleMeetingAttendance from "./meeting_attendance.js"
import handleMeetingSummary from "./meeting_summary.js"
import handleMeetingTranscription from "./meeting_transcription.js"

const selectMenuHandlers: Record<string, (interaction: any) => Promise<void>> = {
    "select_meeting_summary": handleMeetingSummary,
    "select_meeting_attendance": handleMeetingAttendance,
    "select_meeting_transcription": handleMeetingTranscription,
}

export default selectMenuHandlers
