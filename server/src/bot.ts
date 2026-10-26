
import 'dotenv/config'
import { pool } from './db.js'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js'

const token = process.env.DISCORD_BOT_TOKEN
const guildId = process.env.DISCORD_GUILD_ID
const applicationsChannelId = process.env.DISCORD_APPLICATIONS_CHANNEL_ID
const hangaroundRoleId = process.env.DISCORD_ROLE_HANGAROUND_ID
const visitorRoleId = process.env.DISCORD_ROLE_VISITOR_ID

const officerRoleId = process.env.DISCORD_ROLE_OFFICER_ID
const vicePresidentRoleId = process.env.DISCORD_ROLE_VICE_PRESIDENT_ID
const presidentRoleId = process.env.DISCORD_ROLE_PRESIDENT_ID

if (!token) throw new Error('DISCORD_BOT_TOKEN saknas i server/.env')
if (!guildId) throw new Error('DISCORD_GUILD_ID saknas i server/.env')
if (!applicationsChannelId) {
  throw new Error('DISCORD_APPLICATIONS_CHANNEL_ID saknas i server/.env')
}
if (!hangaroundRoleId) {
  throw new Error('DISCORD_ROLE_HANGAROUND_ID saknas i server/.env')
}

const approverRoleIds = [
  officerRoleId,
  vicePresidentRoleId,
  presidentRoleId,
].filter((id): id is string => Boolean(id))

if (approverRoleIds.length === 0) {
  throw new Error('Ange minst en behörig ledningsroll i server/.env')
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
})

const commands = [
  new SlashCommandBuilder()
    .setName('ansokan-skapa')
    .setDescription('Skapa ett ansökningsärende för en Discord-medlem')
    .addUserOption(option =>
      option
        .setName('person')
        .setDescription('Personen som har ansökt')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('namn')
        .setDescription('Den sökandes namn eller karaktärsnamn')
        .setRequired(true)
        .setMaxLength(100),
    )
    .addStringOption(option =>
      option
        .setName('svar')
        .setDescription('Sammanfattning av ansökan')
        .setRequired(true)
        .setMaxLength(1500),
    ),
].map(command => command.toJSON())

type ApplicationStatus = 'pending' | 'approved' | 'rejected'

async function getStatus(applicationId: string): Promise<ApplicationStatus | null> {
  const [rows] = await pool.execute<any[]>(`SELECT status FROM applications WHERE id = ? LIMIT 1`, [applicationId])
  const status = rows[0]?.status
  return status === 'pending' || status === 'approved' || status === 'rejected' ? status : null
}

async function ensureManualApplication(applicationId: string, applicantId: string, applicantName: string, answers: string) {
  await pool.execute(
    `INSERT IGNORE INTO applications (id, applicant_discord_id, applicant_username, applicant_name, application_type, answers, status) VALUES (?, ?, ?, ?, 'hangaround', ?, 'pending')`,
    [applicationId, applicantId, applicantName, applicantName, JSON.stringify({ summary: answers, source: 'discord-command' })],
  )
}

async function setDecision(applicationId: string, status: 'approved' | 'rejected', actorId: string, actorUsername: string) {
  const [result] = await pool.execute<any>(
    `UPDATE applications SET status = ?, decided_at = CURRENT_TIMESTAMP(3), decided_by_discord_id = ?, decided_by_username = ? WHERE id = ? AND status = 'pending'`,
    [status, actorId, actorUsername, applicationId],
  )
  if (result.affectedRows !== 1) return false
  await pool.execute(
    `INSERT INTO application_logs (application_id, event_type, actor_discord_id, actor_username) VALUES (?, ?, ?, ?)`,
    [applicationId, status, actorId, actorUsername],
  )
  return true
}

function canReview(interaction: ChatInputCommandInteraction | any): boolean {
  if (!interaction.inGuild() || !interaction.member) return false

  const memberRoles = interaction.member.roles

  // Discord.js kan ge ett objekt för cachelagda guildmedlemmar.
  const roleIds: string[] = Array.isArray(memberRoles)
    ? memberRoles
    : memberRoles?.cache
      ? [...memberRoles.cache.keys()]
      : []

  return approverRoleIds.some(roleId => roleIds.includes(roleId))
}

function applicationEmbed(
  applicantId: string,
  applicantName: string,
  answers: string,
  status: string,
) {
  const colors: Record<string, number> = {
    Väntar: 0x5865f2,
    Godkänd: 0x2ecc71,
    Nekad: 0xe74c3c,
  }

  return new EmbedBuilder()
    .setColor(colors[status] ?? 0x5865f2)
    .setTitle('Devils Mercy | Hangaround-ansökan')
    .setDescription(
      `**Sökande:** <@${applicantId}>\n` +
      `**Namn:** ${applicantName}\n` +
      `**Status:** ${status}`,
    )
    .addFields({
      name: 'Ansökan',
      value: answers.slice(0, 4000),
    })
    .setFooter({ text: 'Devils Mercy • Ansökningssystem' })
    .setTimestamp()
}

function applicationButtons(applicationId: string, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`dm_application_approve:${applicationId}`)
      .setLabel('Godkänn')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`dm_application_reject:${applicationId}`)
      .setLabel('Neka')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  )
}

client.once('clientReady', async readyClient => {
  console.log(`Discord-boten är online som ${readyClient.user.tag}`)

  try {
    const rest = new REST({ version: '10' }).setToken(token!)

    await rest.put(
      Routes.applicationGuildCommands(readyClient.user.id, guildId!),
      { body: commands },
    )

    console.log('Discord-kommandot /ansokan-skapa har registrerats.')
  } catch (error) {
    console.error('Kunde inte registrera Discord-kommandon:', error)
  }
})

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== 'ansokan-skapa') return

      if (!canReview(interaction)) {
        await interaction.reply({
          content: 'Du saknar behörighet att skapa ansökningsärenden.',
          ephemeral: true,
        })
        return
      }

      const applicant = interaction.options.getUser('person', true)
      const applicantName = interaction.options.getString('namn', true)
      const answers = interaction.options.getString('svar', true)

      const channel = await client.channels.fetch(applicationsChannelId!)

      if (!channel?.isTextBased() || !('send' in channel)) {
        await interaction.reply({
          content: 'Ansökningskanalen kunde inte hittas eller är inte en textkanal.',
          ephemeral: true,
        })
        return
      }

      const applicationId = `${Date.now()}-${applicant.id}`
      await ensureManualApplication(applicationId, applicant.id, applicant.username, answers)

      const message = await channel.send({
        embeds: [
          applicationEmbed(
            applicant.id,
            applicantName,
            answers,
            'Väntar',
          ),
        ],
        components: [applicationButtons(applicationId)],
      })

      // Lägg till referensen i embedens footer så att ärendet kan identifieras.
      const updatedEmbed = EmbedBuilder.from(message.embeds[0])
        .setFooter({ text: `Devils Mercy • Ansöknings-ID: ${applicationId}` })

      await message.edit({ embeds: [updatedEmbed] })

      await interaction.reply({
        content: `Ansökan har publicerats i <#${applicationsChannelId}>.`,
        ephemeral: true,
      })

      return
    }

    if (!interaction.isButton()) return

    const approvePrefix = 'dm_application_approve:'
    const rejectPrefix = 'dm_application_reject:'

    const isApprove = interaction.customId.startsWith(approvePrefix)
    const isReject = interaction.customId.startsWith(rejectPrefix)

    if (!isApprove && !isReject) return

    if (!canReview(interaction)) {
      await interaction.reply({
        content: 'Du saknar behörighet att hantera ansökningar.',
        ephemeral: true,
      })
      return
    }

    const applicationId = interaction.customId.slice(
      isApprove ? approvePrefix.length : rejectPrefix.length,
    )

    const status = await getStatus(applicationId)

    if (status !== 'pending') {
      await interaction.reply({
        content: 'Det här ärendet är redan behandlat eller statusen saknas.',
        ephemeral: true,
      })
      return
    }

    const originalEmbed = interaction.message.embeds[0]

    if (!originalEmbed) {
      await interaction.reply({
        content: 'Ansökningsmeddelandet saknar information.',
        ephemeral: true,
      })
      return
    }

    const description = originalEmbed.description ?? ''
    const applicantMatch = description.match(/(?:Sökande|Applicant):\*\* <@(\d+)>/)
    const nameMatch = description.match(/Namn:\*\* (.+)/)
    const applicantId = applicantMatch?.[1]
    const applicantName = nameMatch?.[1] ?? 'Hangaround'

    if (!applicantId) {
      await interaction.reply({
        content: 'Kunde inte hitta den sökandes Discord-ID i ärendet.',
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const guild = interaction.guild

    if (!guild) {
      await interaction.editReply('Servern kunde inte hittas.')
      return
    }

    const applicantMember = await guild.members.fetch(applicantId).catch(() => null)

    if (isApprove) {
      if (!applicantMember) {
        await interaction.editReply(
          'Personen finns inte längre på servern. Ingen roll har tilldelats.',
        )
        return
      }

      const role = await guild.roles.fetch(hangaroundRoleId!)

      if (!role) {
        await interaction.editReply('Hangaround-rollen kunde inte hittas.')
        return
      }

      if (
        guild.members.me &&
        role.position >= guild.members.me.roles.highest.position
      ) {
        await interaction.editReply(
          'Boten kan inte tilldela rollen. Flytta botens högsta roll ovanför Hangaround-rollen.',
        )
        return
      }

// Kontrollera status igen direkt mot databasen.
const latestStatus = await getStatus(applicationId)

if (latestStatus !== 'pending') {
  await interaction.editReply('Ärendet har redan behandlats.')
  return
}

      // Lägg till Hangaround och ta bort Visitor om rollen är konfigurerad.
      await applicantMember.roles.add(role, 'Godkänd Hangaround-ansökan')

      if (visitorRoleId && applicantMember.roles.cache.has(visitorRoleId)) {
        const visitorRole = await guild.roles.fetch(visitorRoleId)

        if (visitorRole) {
          if (guild.members.me && visitorRole.position >= guild.members.me.roles.highest.position) {
            // Rulla tillbaka Hangaround om boten inte kan ta bort Visitor.
            await applicantMember.roles.remove(role, 'Återställning: boten saknar behörighet att ta bort Visitor')
            await interaction.editReply(
              'Hangaround-rollen kunde tilldelas, men Visitor-rollen ligger över eller på samma nivå som botens högsta roll. Flytta botens roll högre och försök igen.',
            )
            return
          }

          await applicantMember.roles.remove(visitorRole, 'Godkänd Hangaround-ansökan – Visitor-rollen tas bort')
        }
      }

      const committed = await setDecision(applicationId, 'approved', interaction.user.id, interaction.user.tag)
      if (!committed) {
        await interaction.editReply('Ärendet har redan behandlats av någon annan. Uppdatera meddelandet.')
        return
      }

      try {
        await applicantMember.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x2ecc71)
              .setTitle('Välkommen till Devils Mercy!')
              .setDescription(
                `Hej **${applicantName}**!\n\n` +
                'Din Hangaround-ansökan har blivit godkänd. ' +
                'Du har nu fått din Hangaround-roll och Visitor-rollen har tagits bort (om den var tilldelad).\n\n' +
                `**Godkänd av:** ${interaction.user.tag}\n\n` +
                'Välkommen till Devils Mercy. Vi ser fram emot att lära känna dig!',
              )
              .setFooter({ text: 'Devils Mercy • Ansökningsbesked' })
              .setTimestamp(),
          ],
        })
      } catch {
        // DM kan vara avstängt. Godkännandet gäller ändå.
      }

      const approvedEmbed = EmbedBuilder.from(originalEmbed)
        .setColor(0x2ecc71)
        .setDescription(
          `${description.replace(/\n\*\*Status:\*\* .*/, '')}\n` +
          '**Status:** Godkänd\n' +
          `**Behandlad av:** ${interaction.user}`,
        )
        .setFooter({ text: `Devils Mercy • Ansöknings-ID: ${applicationId}` })

      await interaction.message.edit({
        embeds: [approvedEmbed],
        components: [applicationButtons(applicationId, true)],
      })

      await interaction.editReply(
        'Ansökan godkänd. Hangaround-rollen har tilldelats och ett DM har skickats, om personen tillåter privata meddelanden.',
      )
      return
    }

    const committed = await setDecision(applicationId, 'rejected', interaction.user.id, interaction.user.tag)
    if (!committed) {
      await interaction.editReply('Ärendet har redan behandlats av någon annan. Uppdatera meddelandet.')
      return
    }

    if (applicantMember) {
      try {
        await applicantMember.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xe74c3c)
              .setTitle('Besked om din Devils Mercy-ansökan')
              .setDescription(
                `Hej **${applicantName}**.\n\n` +
                'Din ansökan har tyvärr inte blivit godkänd den här gången.\n\n' +
                'Tack för att du tog dig tid att ansöka.',
              )
              .setFooter({ text: 'Devils Mercy • Ansökningsbesked' })
              .setTimestamp(),
          ],
        })
      } catch {
        // DM kan vara avstängt.
      }
    }

    const rejectedEmbed = EmbedBuilder.from(originalEmbed)
      .setColor(0xe74c3c)
      .setDescription(
        `${description.replace(/\n\*\*Status:\*\* .*/, '')}\n` +
        '**Status:** Nekad\n' +
        `**Behandlad av:** ${interaction.user}`,
      )
      .setFooter({ text: `Devils Mercy • Ansöknings-ID: ${applicationId}` })

    await interaction.message.edit({
      embeds: [rejectedEmbed],
      components: [applicationButtons(applicationId, true)],
    })

    await interaction.editReply(
      'Ansökan nekad. Ett DM har skickats om personen tillåter privata meddelanden.',
    )
  } catch (error) {
    console.error('Fel vid hantering av ansökan:', error)

    if (interaction.isRepliable()) {
      const message = 'Ett fel uppstod när ansökan skulle hanteras.'

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true }).catch(() => {})
      } else {
        await interaction.reply({ content: message, ephemeral: true }).catch(() => {})
      }
    }
  }
})

client.on('error', error => {
  console.error('Discord botfel:', error)
})

client.login(token).catch(error => {
  console.error('Kunde inte ansluta Discord-boten:', error)
  process.exitCode = 1
})
