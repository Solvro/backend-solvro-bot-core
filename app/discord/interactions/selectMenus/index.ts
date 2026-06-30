import type { StringSelectMenuInteraction } from "discord.js";

import { activityReportSelectMenuHandlers } from "./activity_report.js";
import handleMeetingAttendance from "./meeting_attendance.js";
import handleMeetingSummary from "./meeting_summary.js";
import handleMeetingTranscription from "./meeting_transcription.js";

const selectMenuHandlers: Record<
  string,
  (interaction: StringSelectMenuInteraction) => Promise<void>
> = {
  select_meeting_summary: handleMeetingSummary,
  select_meeting_attendance: handleMeetingAttendance,
  select_meeting_transcription: handleMeetingTranscription,
  ...activityReportSelectMenuHandlers,
};

export default selectMenuHandlers;
