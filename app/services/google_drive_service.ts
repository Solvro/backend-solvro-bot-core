import { google } from 'googleapis'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { Readable } from 'stream'
import Meeting from '#models/meetings'
import { client } from '#app/discord/index'
import { DateTime } from 'luxon'

export class GoogleDriveService {
    private drive
    private auth

    constructor() {
        this.auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'],
            keyFile: env.get('GOOGLE_CREDENTIALS_PATH'),
        })

        this.drive = google.drive({ version: 'v3', auth: this.auth })
    }

    /**
     * Upload a single file to Google Drive
     */
    private async uploadFile(name: string, content: string, mimeType: string, folderId: string): Promise<string> {
        try {
            const fileMetadata = {
                name,
                parents: [folderId],
            }

            const media = {
                mimeType,
                body: Readable.from([content]),
            }

            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id',
                supportsAllDrives: true,
            })

            const fileId = response.data.id
            if (!fileId) {
                throw new Error('Failed to get file ID from response')
            }

            logger.info(`Uploaded file to Google Drive: ${name} (ID: ${fileId})`)
            return fileId
        } catch (error) {
            logger.error(`Failed to upload file to Google Drive: ${name}`, error)
            throw error
        }
    }

    private getFolderNameForMeeting(meetingName: string, meetingId: number): string {
        const sanitizedMeetingName = meetingName.replace(/[<>:"/\\|?*]/g, '_')
        return `${sanitizedMeetingName}_${meetingId}`
    }

    /**
     * Get or create meeting folder
     */
    private async getOrCreateMeetingFolder(meetingName: string, meetingId: number): Promise<string> {
        const mainFolderId = env.get('GOOGLE_DRIVE_FOLDER_ID')
        if (!mainFolderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is required')
        }

        // Create unique folder name
        const folderName = this.getFolderNameForMeeting(meetingName, meetingId)

        // Check if folder already exists
        const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${mainFolderId}' in parents and trashed=false`

        const response = await this.drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: 'allDrives',
        })

        if (response.data.files && response.data.files.length > 0) {
            const folderId = response.data.files[0].id!
            logger.info(`Using existing Google Drive folder: ${folderName} (ID: ${folderId})`)
            return folderId
        }

        // Create new folder
        logger.info(`No existing folder found, creating new folder: ${folderName}`)
        const folderResponse = await this.drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [mainFolderId],
            },
            fields: 'id',
            supportsAllDrives: true,
        })

        const folderId = folderResponse.data.id!
        logger.info(`Created Google Drive folder: ${folderName} (ID: ${folderId})`)
        return folderId
    }

    /**
     * Generate transcription file content
     */
    private async generateTranscriptionFile(meeting: Meeting): Promise<string | null> {
        const chunks = await meeting.related('chunks').query().orderBy('startTime')

        if (chunks.length === 0) {
            return null
        }

        const guild = await client.guilds.fetch(env.get('DISCORD_GUILD_ID'))
        await guild.members.fetch()

        const userNames: Record<string, string> = {}
        for (const chunk of chunks) {
            if (!userNames[chunk.discordUserId]) {
                const member = guild.members.cache.get(chunk.discordUserId)
                userNames[chunk.discordUserId] = member ? member.displayName : `User#${chunk.discordUserId}`
            }
        }

        const formattedText = chunks
            .map((chunk) => {
                const minutes = Math.floor(chunk.startTime / 60)
                const seconds = Math.floor(chunk.startTime % 60)
                const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                const userName = userNames[chunk.discordUserId]
                return `[${timestamp}] ${userName}: ${chunk.text}`
            })
            .join('\n')

        return formattedText
    }

    /**
     * Generate attendance file content
     */
    private async generateAttendanceFile(meeting: Meeting): Promise<string | null> {
        await meeting.load('members')
        const uniqueDiscordIds = [...new Set(meeting.members.map((m) => m.discordId))]

        if (uniqueDiscordIds.length === 0) {
            return null
        }

        const guild = await client.guilds.fetch(env.get('DISCORD_GUILD_ID'))
        await guild.members.fetch()

        const userInfo = uniqueDiscordIds.map(id => {
            const member = guild.members.cache.get(id)
            const user = member?.user
            return {
                discordId: id,
                globalName: user?.globalName ?? '',
                nickname: member?.displayName ?? '',
            }
        })

        const header = 'discordId,globalName,serverNickname'
        const rows = userInfo.map(row =>
            [row.discordId, row.globalName, row.nickname].map(v => `"${v}"`).join(',')
        )
        return [header, ...rows].join('\n')
    }

    /**
     * Upload all meeting files to Google Drive
     */
    async uploadAllMeetingFiles(meeting: Meeting, summary: string): Promise<void> {
        try {
            const folderId = await this.getOrCreateMeetingFolder(
                meeting.name || `Meeting ${meeting.id}`,
                meeting.id
            )

            // Upload transcription
            const transcriptionContent = await this.generateTranscriptionFile(meeting)
            if (transcriptionContent) {
                await this.uploadFile(
                    `transcription_meeting_${meeting.id}.txt`,
                    transcriptionContent,
                    'text/plain',
                    folderId
                )
            }

            // Upload summary
            await this.uploadFile(
                `summary_meeting_${meeting.id}.md`,
                summary,
                'text/markdown',
                folderId
            )

            // Upload attendance
            const attendanceContent = await this.generateAttendanceFile(meeting)
            if (attendanceContent) {
                await this.uploadFile(
                    `attendance_meeting_${meeting.id}.csv`,
                    attendanceContent,
                    'text/csv',
                    folderId
                )
            }

            // Update meeting record
            meeting.googleDriveFolderId = folderId
            meeting.filesUploadedToDrive = true
            meeting.driveUploadCompletedAt = DateTime.now()
            await meeting.save()

            logger.info(`Successfully uploaded all files for meeting ${meeting.id}`)
        } catch (error) {
            logger.error(`Failed to upload files for meeting ${meeting.id}:`, error)
            throw error
        }
    }

    /**
     * Check what files exist in a meeting folder
     */
    async getUploadedFiles(meeting: Meeting): Promise<string[]> {
        if (!meeting.googleDriveFolderId) {
            return []
        }

        try {
            const response = await this.drive.files.list({
                q: `'${meeting.googleDriveFolderId}' in parents and trashed=false`,
                fields: 'files(name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                corpora: 'allDrives',
            })

            return response.data.files?.map(file => file.name || '') || []
        } catch (error) {
            logger.error(`Failed to get uploaded files for meeting ${meeting.id}:`, error)
            return []
        }
    }

    /**
     * Check if the service is properly configured
     */
    async isConfigured(): Promise<boolean> {
        try {
            const credentialsPath = env.get('GOOGLE_CREDENTIALS_PATH')
            const folderId = env.get('GOOGLE_DRIVE_FOLDER_ID')

            if (!credentialsPath || !folderId) {
                logger.warn('Google Drive service is not fully configured')
                return false
            }

            // Test authentication by making a simple API call
            await this.drive.files.list({ 
                pageSize: 1,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
                corpora: 'allDrives'
            })
            return true
        } catch (error) {
            logger.error('Google Drive service authentication failed', error)
            return false
        }
    }
}

export default GoogleDriveService