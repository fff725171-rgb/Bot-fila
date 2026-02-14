import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  PermissionFlagsBits,
  REST,
  Routes
} from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;

let filas = {};
let jogadoresEmFila = new Set();
let contador = 1;

/* =========================
   BOT ONLINE
========================= */

client.once("ready", async () => {
  console.log(`Bot online como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("criarfila")
      .setDescription("Criar nova fila")
      .addStringOption(option =>
        option.setName("tipo")
          .setDescription("Tipo da partida")
          .setRequired(true)
          .addChoices(
            { name: "1v1", value: "1v1" },
            { name: "2v2", value: "2v2" },
            { name: "3v3", value: "3v3" },
            { name: "4v4", value: "4v4" }
          ))
      .addStringOption(option =>
        option.setName("modo")
          .setDescription("Modo da partida")
          .setRequired(true))
      .addStringOption(option =>
        option.setName("valor")
          .setDescription("Valor da aposta")
          .setRequired(true))
      .toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log("Comandos registrados.");
});

/* =========================
   INTERAÇÕES
========================= */

client.on("interactionCreate", async (interaction) => {
  try {

    /* =========================
       CRIAR FILA
    ========================= */

    if (interaction.isChatInputCommand()) {

      if (!interaction.member.roles.cache.some(r => r.name === "ADM")) {
        return interaction.reply({ content: "❌ Apenas ADM pode usar.", ephemeral: true });
      }

      const tipo = interaction.options.getString("tipo");
      const modo = interaction.options.getString("modo");
      const valor = interaction.options.getString("valor");

      let limite = { "1v1": 2, "2v2": 4, "3v3": 6, "4v4": 8 }[tipo];

      const idFila = `fila_${contador}`;

      filas[idFila] = {
        jogadores: [],
        limite,
        modo,
        valor,
        numero: contador
      };

      const embed = new EmbedBuilder()
        .setTitle(`🎮 Fila ${contador}`)
        .addFields(
          { name: "Modo", value: modo, inline: true },
          { name: "Valor", value: valor, inline: true },
          { name: "Vagas", value: `0/${limite}` }
        )
        .setColor("Blue");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`entrar_${idFila}`)
          .setLabel("Entrar")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`sair_${idFila}`)
          .setLabel("Sair")
          .setStyle(ButtonStyle.Danger)
      );

      contador++;

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    /* =========================
       ENTRAR / SAIR FILA
    ========================= */

    if (
      interaction.isButton() &&
      (interaction.customId.startsWith("entrar_") ||
       interaction.customId.startsWith("sair_"))
    ) {

      await interaction.deferUpdate();

      const partes = interaction.customId.split("_");
      const acao = partes[0];
      const idFila = partes[1] + "_" + partes[2];

      if (!filas[idFila]) return;

      let fila = filas[idFila];
      const userId = interaction.user.id;

      if (acao === "entrar") {
        if (jogadoresEmFila.has(userId)) return;

        fila.jogadores.push(userId);
        jogadoresEmFila.add(userId);
      }

      if (acao === "sair") {
        fila.jogadores = fila.jogadores.filter(id => id !== userId);
        jogadoresEmFila.delete(userId);
      }

      const jogadoresTexto =
        fila.jogadores.map(id => `<@${id}>`).join("\n") || "Ninguém";

      const embed = new EmbedBuilder()
        .setTitle(`🎮 Fila ${fila.numero}`)
        .addFields(
          { name: "Modo", value: fila.modo, inline: true },
          { name: "Valor", value: fila.valor, inline: true },
          { name: "Jogadores", value: jogadoresTexto },
          { name: "Vagas", value: `${fila.jogadores.length}/${fila.limite}` }
        )
        .setColor("Green");

      await interaction.editReply({ embeds: [embed] });

      /* =========================
         SE FILA ENCHEU
      ========================= */

      if (fila.jogadores.length === fila.limite) {

        const guild = interaction.guild;

        const canal = await guild.channels.create({
          name: `fila-${fila.numero}`,
          type: 0,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            ...fila.jogadores.map(id => ({
              id,
              allow: [PermissionFlagsBits.ViewChannel]
            }))
          ]
        });

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirmar_${fila.numero}`)
            .setLabel("Confirmar Presença")
            .setStyle(ButtonStyle.Success)
        );

        await canal.send({
          content: "🔥 Sala criada! Boa partida!",
          components: [confirmRow]
        });

        fila.jogadores.forEach(id => jogadoresEmFila.delete(id));
      }
    }

    /* =========================
       BOTÃO CONFIRMAR PRESENÇA
    ========================= */

    if (interaction.isButton() && interaction.customId.startsWith("confirmar_")) {

      await interaction.reply({
        content:
`🔥 BR PRA PARTIDA GALERA 🔥

💰 PIX:
05b2ad86-2956-4b32-822b-9624cd731c33

📩 Mande o comprovante aqui e espere o ADM ver.`,
        ephemeral: false
      });

    }

  } catch (err) {
    console.error("Erro:", err);
  }
});

client.login(TOKEN);
