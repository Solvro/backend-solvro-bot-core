import { StringSelectMenuInteraction, Guild, AttachmentBuilder } from 'discord.js'
import Meeting, { AttendanceStatus } from '#models/meetings';
import { client } from '#app/discord/index';
import env from '#start/env';

type UserInfo = {
    discordId: string;
    globalName: string;
    nickname: string
}

function getUserNicknamesFromIds(ids: string[], guild: Guild): UserInfo[] {
    return ids.map(id => {
        const member = guild.members.cache.get(id);
        const user = member?.user;
        return {
            discordId: id,
            globalName: user?.globalName ?? '',
            nickname: member?.displayName ?? '',
        };
    });
}

function createCsv(data: UserInfo[]): string {
    const header = 'discordId,globalName,serverNickname';
    const rows = data.map(row =>
        [row.discordId, row.globalName, row.nickname].map(v => `"${v}"`).join(',')
    );
    return [header, ...rows].join('\n');
}

export default async function handleMeetingAttendance(interaction: StringSelectMenuInteraction) {
    const meetingId = interaction.values[0]

    const meeting = await Meeting.query()
        .where('id', meetingId)
        .where('attendance_status', AttendanceStatus.FINISHED_MONITORING)
        .preload('members')
        .first()

    if (!meeting) {
        await interaction.update({
            content: 'There is no meeting with given ID and a completed attendance list',
            components: []
        })
        return
    }

    const uniqueDiscordIds = [...new Set(meeting.members.map((m) => m.discordId))]

    if (uniqueDiscordIds.length === 0) {
        await interaction.update({
            content: 'No members attended the meeting.',
            components: []
        })
        return
    }

    const guild = interaction.guild ?? await client.guilds.fetch(env.get('DISCORD_GUILD_ID'))
    // Cache all users
    await guild.members.fetch();

    const userInfo = await getUserNicknamesFromIds(uniqueDiscordIds, guild);
    let memberList = userInfo.slice(0, 11).map((i) => {
        return `• <@${i.discordId}> ` + (i.nickname ?? "");
    }).join('\n');

    if (userInfo.length > 10) memberList += `\n and **${userInfo.length - 10} more`;

    const csvContent = createCsv(userInfo);
    const buffer = Buffer.from(csvContent, 'utf-8');

    const attachment = new AttachmentBuilder(buffer, {
        name: `attendance-${meeting.id}.csv`,
        description: `Attendance list for meeting "${meeting.name}"`,
    });

    // Update the interaction with message + CSV file
    await interaction.update({
        content: `**Attending Members for meeting "${meeting.name ?? 'Unnamed Meeting'}" (${uniqueDiscordIds.length}):**\n${memberList}`,
        components: [],
        files: [attachment]
    });
}