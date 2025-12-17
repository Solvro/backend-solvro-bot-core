import Meeting, { RecordingStatus } from '#models/meetings'
import env from '#start/env'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class ProcessUnfinishedRecordings extends BaseCommand {
    static commandName = 'process:unfinished'
    static description = ''

    static options: CommandOptions = {
        startApp: true,
    }

    async run() {
        const unfinishedRecordings = await Meeting.query()
            .where('recording_status', RecordingStatus.STOPPING)
            .andWhere('updated_at', '<', new Date(Date.now() - 60 * 60 * 1000)) // 60 minutes ago

        this.logger.info(`Found ${unfinishedRecordings.length} unfinished recordings to process.`)

        for (const recording of unfinishedRecordings) {
            this.logger.info(`Processing unfinished recording ID: ${recording.id}`)

            try {
                const response = await fetch(`${env.get('TRANSCRIBER_URL')}/process-recordings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ meetingId: recording.id.toString() }),
                })

                if (response.ok) {
                    this.logger.info(`Successfully triggered processing for recording ID: ${recording.id}`)
                } else {
                    this.logger.error(`Failed to trigger processing for recording ID: ${recording.id}. Status: ${response.status}`)
                }
            } catch (error) {
                this.logger.error(`Error processing recording ID: ${recording.id}. Error: ${error.message}`)
            }
        }

        this.logger.info('Request to process unfinished recordings completed.')
    }
}