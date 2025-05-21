import { CommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import OfficeCameraStatus from '#models/office_camera_status'
import { existsSync } from 'fs'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('office_status')
    .setDescription('Get number of people in office'),
  async (interaction: CommandInteraction) => {
    const cameraStatus = await OfficeCameraStatus.query().orderBy('created_at', 'desc').first()

    if (!cameraStatus) {
      interaction.reply({
        content: 'No office status found, try again later',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    const count = cameraStatus.count
    const unix = Math.floor(new Date(cameraStatus.timestamp.toString()).getTime() / 1000)

    const isOccupied = count > 0
    const embedColor = isOccupied ? 0x57f287 : 0x2f3136

    if (cameraStatus.imagePath == null || !existsSync(cameraStatus.imagePath)) {
      const embed = new EmbedBuilder()
        .setTitle('🏢 Office Presence Update')
        .addFields(
          { name: 'People in Office', value: `**${cameraStatus.count}**`, inline: true },
          { name: 'Last Update', value: `<t:${unix}:R>`, inline: true }
        )
        .setColor(embedColor)

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      })

      return
    }

    const embed = new EmbedBuilder()
      .setTitle('📷 New Camera Image')
      .setDescription(`Taken: <t:${unix}:R>`)
      .addFields({ name: 'People in Office', value: `**${cameraStatus.count}**`, inline: true })
      .setImage('attachment://camera.jpg')
      .setColor(0x57f287)

    await interaction.reply({
      embeds: [embed],
      files: [{ attachment: cameraStatus.imagePath, name: 'camera.jpg' }],
      flags: MessageFlags.Ephemeral,
    })
  }
)

export default command
