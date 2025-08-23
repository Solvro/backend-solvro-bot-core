import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import OfficeStatusMessage from '#models/office_status_message'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('office_widget')
    .setDescription('Send office camera updates to this channel'),
  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const { default: officeCameraService } = await import('#services/office_camera_service');

    const existingWidget = await OfficeStatusMessage.query().where('channelId', interaction.channelId).first();

    if (existingWidget) {
      await interaction.editReply({ content: "❌ This channel already as a camera widget" });
      return;
    }

    await officeCameraService.addChannelToUpdateList(interaction.channelId);

    await interaction.editReply({ content: "✅ Channel successfully added as widget" });
  }
)

export default command
