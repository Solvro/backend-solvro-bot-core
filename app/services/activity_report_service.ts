import Member, { MemberStatus } from '#models/member'
import DiscordActivity from '#models/discord_activity'
import GithubActivity from '#models/github_activity'
import TranscriptionPart from '#models/transcription_parts'
import Meeting, { AttendanceStatus } from '#models/meetings'
import { AttachmentBuilder } from 'discord.js'
import logger from '@adonisjs/core/services/logger'

interface ReportConfig {
  fileType: 'csv' | 'excel'
  startDate?: string
  endDate?: string
  stats: string[] // ['discord', 'github', 'attendance', 'words']
}

interface MemberStats {
  // Basic info
  firstName: string
  lastName: string
  indexNumber: string
  section: string
  project: string
  status: string

  // Stats (optional based on selection)
  discordMessages?: number
  githubCommits?: number
  githubPRs?: number
  githubIssues?: number
  githubReviews?: number
  githubTotal?: number
  attendanceCount?: number
  attendancePercentage?: number
  wordCount?: number
}

export class ActivityReportService {
  /**
   * Generate activity report for all active/new members
   */
  async generateReport(config: ReportConfig): Promise<AttachmentBuilder> {
    logger.info('Starting activity report generation', { config })

    // Parse dates
    const startDate = config.startDate ? new Date(config.startDate) : null
    const endDate = config.endDate ? new Date(config.endDate) : new Date()

    if (startDate) {
      startDate.setHours(0, 0, 0, 0)
    }
    if (endDate) {
      endDate.setHours(23, 59, 59, 999)
    }

    // Fetch all active/new members
    const members = await Member.query()
      .whereIn('status', [MemberStatus.ACTIVE, MemberStatus.NEW])
      .orderBy('lastName', 'asc')
      .orderBy('firstName', 'asc')

    logger.info(`Found ${members.length} active/new members`)

    // Collect stats for each member
    const memberStats: MemberStats[] = []

    for (const member of members) {
      const stats: MemberStats = {
        firstName: member.firstName || 'N/A',
        lastName: member.lastName || 'N/A',
        indexNumber: member.indexNumber || 'N/A',
        section: member.currentSection || 'N/A',
        project: member.currentProjects || 'N/A',
        status: member.status,
      }

      // Fetch Discord stats if requested
      if (config.stats.includes('discord')) {
        stats.discordMessages = await this.getDiscordMessageCount(
          member.discordId,
          startDate,
          endDate
        )
      }

      // Fetch GitHub stats if requested
      if (config.stats.includes('github')) {
        const githubStats = await this.getGithubStats(member.githubId, startDate, endDate)
        stats.githubCommits = githubStats.commits
        stats.githubPRs = githubStats.prs
        stats.githubIssues = githubStats.issues
        stats.githubReviews = githubStats.reviews
        stats.githubTotal = githubStats.total
      }

      // Fetch Attendance stats if requested
      if (config.stats.includes('attendance')) {
        const attendanceStats = await this.getAttendanceStats(member.id, startDate, endDate)
        stats.attendanceCount = attendanceStats.attended
        stats.attendancePercentage = attendanceStats.percentage
      }

      // Fetch Word count stats if requested
      if (config.stats.includes('words')) {
        stats.wordCount = await this.getWordCount(member.discordId, startDate, endDate)
      }

      memberStats.push(stats)
    }

    // Generate file based on type
    if (config.fileType === 'csv') {
      return this.generateCSV(memberStats, config)
    } else {
      return this.generateExcel(memberStats, config)
    }
  }

  /**
   * Get Discord message count for a member
   */
  private async getDiscordMessageCount(
    discordId: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<number> {
    let query = DiscordActivity.query().where('discordId', discordId)

    if (startDate) {
      query = query.where('date', '>=', startDate)
    }
    if (endDate) {
      query = query.where('date', '<=', endDate)
    }

    const result = await query.sum('message_count as total')
    return Number(result[0].$extras.total) || 0
  }

  /**
   * Get GitHub activity stats for a member
   */
  private async getGithubStats(
    githubId: string | null,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<{ commits: number; prs: number; issues: number; reviews: number; total: number }> {
    if (!githubId) {
      return { commits: 0, prs: 0, issues: 0, reviews: 0, total: 0 }
    }

    let query = GithubActivity.query().where('authorGithubId', githubId).select('type')

    if (startDate) {
      query = query.where('date', '>=', startDate)
    }
    if (endDate) {
      query = query.where('date', '<=', endDate)
    }

    const results = await query.groupBy('type').count('* as count')

    const stats = {
      commits: 0,
      prs: 0,
      issues: 0,
      reviews: 0,
      total: 0,
    }

    for (const result of results) {
      const count = Number(result.$extras.count)
      stats.total += count

      switch (result.type) {
        case 'commit':
          stats.commits = count
          break
        case 'pr':
          stats.prs = count
          break
        case 'issue':
          stats.issues = count
          break
        case 'review':
          stats.reviews = count
          break
      }
    }

    return stats
  }

  /**
   * Get attendance stats for a member
   */
  private async getAttendanceStats(
    memberId: number,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<{ attended: number; total: number; percentage: number }> {
    // Get all meetings in the date range
    let meetingsQuery = Meeting.query().where('attendanceStatus', AttendanceStatus.FINISHED_MONITORING)

    if (startDate) {
      meetingsQuery = meetingsQuery.where('finishedAt', '>=', startDate)
    }
    if (endDate) {
      meetingsQuery = meetingsQuery.where('finishedAt', '<=', endDate)
    }

    const totalMeetings = await meetingsQuery.count('* as total')
    const total = Number(totalMeetings[0].$extras.total)

    console.log('Total meetings in range:', total)

    if (total === 0) {
      return { attended: 0, total: 0, percentage: 100 }
    }

    // Get meetings this member attended
    const member = await Member.find(memberId)
    if (!member) {
      return { attended: 0, total: 0, percentage: 0 }
    }

    const attendedQuery = member.related('meetings').query().where('attendanceStatus', AttendanceStatus.FINISHED_MONITORING);

    if (startDate) {
      attendedQuery.where('meetings.finished_at', '>=', startDate)
    }
    if (endDate) {
      attendedQuery.where('meetings.finished_at', '<=', endDate)
    }

    const attended = (await attendedQuery.distinct('meetings.id')).length;

    console.log('Total meetings attended by member:', attended);

    const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;

    return { attended, total, percentage }
  }

  /**
   * Get word count from transcriptions for a member
   */
  private async getWordCount(
    discordId: string,
    startDate: Date | null,
    endDate: Date | null
  ): Promise<number> {
    let query = TranscriptionPart.query().where('discordUserId', discordId)

    if (startDate || endDate) {
      // Join with meetings to filter by date
      query = query.join('meetings', 'transcription_parts.meeting_id', 'meetings.id')

      if (startDate) {
        query = query.where('meetings.finished_at', '>=', startDate)
      }
      if (endDate) {
        query = query.where('meetings.finished_at', '<=', endDate)
      }
    }

    const parts = await query.select('text')

    let totalWords = 0
    for (const part of parts) {
      if (part.text) {
        totalWords += part.text.split(/\s+/).filter((word) => word.length > 0).length
      }
    }

    return totalWords
  }

  /**
   * Generate CSV file
   */
  private generateCSV(memberStats: MemberStats[], config: ReportConfig): AttachmentBuilder {
    const lines: string[] = []

    // Build header
    const headers = ['First Name', 'Last Name', 'Index Number', 'Section', 'Project', 'Status']

    if (config.stats.includes('discord')) {
      headers.push('Discord Messages')
    }
    if (config.stats.includes('github')) {
      headers.push(
        'GitHub Commits',
        'GitHub PRs',
        'GitHub Issues',
        'GitHub Reviews',
        'GitHub Total'
      )
    }
    if (config.stats.includes('attendance')) {
      headers.push('Meetings Attended', 'Attendance %')
    }
    if (config.stats.includes('words')) {
      headers.push('Weekly Word Count')
    }

    lines.push(headers.join(','))

    // Add data rows
    for (const stats of memberStats) {
      const row: string[] = [
        this.escapeCsvValue(stats.firstName),
        this.escapeCsvValue(stats.lastName),
        this.escapeCsvValue(stats.indexNumber),
        this.escapeCsvValue(stats.section),
        this.escapeCsvValue(stats.project),
        this.escapeCsvValue(stats.status),
      ]

      if (config.stats.includes('discord')) {
        row.push(String(stats.discordMessages || 0))
      }
      if (config.stats.includes('github')) {
        row.push(
          String(stats.githubCommits || 0),
          String(stats.githubPRs || 0),
          String(stats.githubIssues || 0),
          String(stats.githubReviews || 0),
          String(stats.githubTotal || 0)
        )
      }
      if (config.stats.includes('attendance')) {
        row.push(String(stats.attendanceCount || 0), String(stats.attendancePercentage || 0))
      }
      if (config.stats.includes('words')) {
        row.push(String(stats.wordCount || 0))
      }

      lines.push(row.join(','))
    }

    const csvContent = lines.join('\n')
    const buffer = Buffer.from(csvContent, 'utf-8')

    const dateRange =
      config.startDate && config.endDate
        ? `_${config.startDate}_to_${config.endDate}`
        : config.startDate
          ? `_from_${config.startDate}`
          : config.endDate
            ? `_to_${config.endDate}`
            : '_all_time'

    const filename = `activity_report${dateRange}.csv`

    logger.info(`Generated CSV report with ${memberStats.length} members`)

    return new AttachmentBuilder(buffer, { name: filename })
  }

  /**
   * Generate Excel file (placeholder - requires xlsx library)
   */
  private generateExcel(memberStats: MemberStats[], config: ReportConfig): AttachmentBuilder {
    logger.warn('Excel format requested but not fully implemented, generating CSV instead')

    const csvAttachment = this.generateCSV(memberStats, config)

    const filename = csvAttachment.name?.replace('.csv', '.xlsx') || 'activity_report.xlsx'

    return new AttachmentBuilder(csvAttachment.attachment as Buffer, {
      name: filename,
      description:
        'Activity report (CSV format with .xlsx extension - install xlsx library for true Excel format)',
    })
  }

  /**
   * Escape CSV values to handle commas, quotes, and newlines
   */
  private escapeCsvValue(value: string): string {
    if (!value) return '""'

    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }

    return value
  }
}

export default new ActivityReportService()
