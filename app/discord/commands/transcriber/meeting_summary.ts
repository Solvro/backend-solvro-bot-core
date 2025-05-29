import { SlashCommandBuilder, CommandInteraction, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } from 'discord.js'
import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import Meeting, { RecordingStatus } from '#models/meetings'

const command: SlashCommand = new StaticCommand(
    new SlashCommandBuilder()
        .setName('meeting_summary')
        .setDescription('Get AI summary from a completed meeting'),

    async (interaction: CommandInteraction) => {
        const completedMeetings = await Meeting.query().where('recordingStatus', RecordingStatus.COMPLETED)

        if (completedMeetings.length === 0) {
            interaction.reply({
                content: 'No completed meetings found.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_meeting_summary')
            .setPlaceholder('Select a completed meeting')
            .addOptions(
                completedMeetings.map((meeting) => ({
                    label: meeting.name ?? `#${meeting.id}`,
                    value: meeting.id.toString(),
                }))
            );


        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

        await interaction.reply({
            content: 'Please select a completed meeting to view its AI-generated summary:',
            components: [row],
            flags: MessageFlags.Ephemeral,
        })
    }
)

export default command
