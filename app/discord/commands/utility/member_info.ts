import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import Member from '#models/member';

const command: SlashCommand = new StaticCommand(
    new SlashCommandBuilder()
        .setName('member_info')
        .setDescription('Show information about a specific member')
        .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true)),
    async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply({ ephemeral: true })

        const user = interaction.options.getUser('user', true)

        const member = await Member.query()
            .where('discord_id', user.id)
            .first()

        if (!member) {
            await interaction.editReply({
                content: `❌ No member data found for ${user.tag}`,
            })
            return
        }

        // Status emoji mapping
        const statusEmoji: Record<string, string> = {
            new: '🆕',
            active: '✅',
            inactive: '⚪',
        }

        const embed = new EmbedBuilder()
            .setColor('#2f3136')
            .setAuthor({
                name: `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() ||
                    user.tag,
                iconURL: user.displayAvatarURL(),
            })
            .setDescription(
                `${statusEmoji[member.status]} **Status:** ${member.status.toUpperCase()}` +
                `\n📂 **Section:** ${member.currentSection ?? 'N/A'}`
            )
            .addFields(
                ...(member.indexNumber
                    ? [{ name: '🎓 Index', value: member.indexNumber, inline: true }]
                    : []),
                ...(member.faculty
                    ? [{ name: '🏫 Faculty', value: member.faculty, inline: true }]
                    : []),
                ...(member.fieldOfStudy
                    ? [{ name: '📘 Field', value: member.fieldOfStudy, inline: true }]
                    : []),
                ...(member.studyYear
                    ? [{ name: '📅 Year', value: member.studyYear, inline: true }]
                    : []),
                ...(member.joinDate
                    ? [
                        {
                            name: '📆 Joined',
                            value: member.joinDate.toDateString(),
                            inline: true,
                        },
                    ]
                    : []),
                ...(member.email
                    ? [{ name: '📧 Email', value: member.email, inline: true }]
                    : []),
                ...(member.phone
                    ? [{ name: '📞 Phone', value: member.phone, inline: true }]
                    : []),
                ...(member.messengerUrl
                    ? [
                        {
                            name: '💬 Messenger',
                            value: `[Profile](${member.messengerUrl})`,
                            inline: true,
                        },
                    ]
                    : []),
                ...(member.githubUrl
                    ? [
                        {
                            name: '💻 GitHub',
                            value: `[${member.githubUsername ?? 'profile'}](${member.githubUrl})`,
                            inline: true,
                        },
                    ]
                    : [])
            )
            .setFooter({
                text: `Discord ID: ${member.discordId}`,
            })
            .setTimestamp(member.updatedAt.toJSDate())

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`member_stats_${member.id}`)
                .setLabel('📊 Show Discord Stats')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`member_projects_${member.id}`)
                .setLabel('📂 Show Github Stats')
                .setStyle(ButtonStyle.Primary)
        )

        await interaction.editReply({
            embeds: [embed],
            components: [row],
        })
    }
);

export default command
