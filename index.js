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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;

let filaAtual = [];
let limiteFila = 0;
let contadorSalas = 1;
let criadorFila = null;
let modoAtual = "";
let valorAtual = "";

client.once("ready", async () => {
  console.log(`Bot online como ${client.user.tag}`);

  // Registrar comandos automaticamente
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
      .toJSON(),

    new SlashCommandBuilder()
      .setName("stop_sala")
      .setDescription("Deletar sala atual")
      .toJSON()
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Comandos registrados.");
});

client.on("interactionCreate", async (interaction) => {

  if (interaction.isChatInputCommand()) {

    // 🔹 Criar fila
    if (interaction.commandName === "criarfila") {

      if (!interaction.member.roles.cache.some(r => r.name === "ADM")) {
        return interaction.reply({ content: "❌ Apenas ADM pode usar.", ephemeral: true });
      }

      const tipo = interaction.options.getString("tipo");
      modoAtual = interaction.options.getString("modo");
      valorAtual = interaction.options.getString("valor");

      criadorFila = interaction.user.id;

      if (tipo === "1v1") limiteFila = 2;
      if (tipo === "2v2") limiteFila = 4;
      if (tipo === "3v3") limiteFila = 6;
      if (tipo === "4v4") limiteFila = 8;

      filaAtual = [];

      const embed = new EmbedBuilder()
        .setTitle("🎮 Nova Fila")
        .addFields(
          { name: "Modo", value: modoAtual, inline: true },
          { name: "Valor", value: valorAtual, inline: true },
          { name: "Vagas", value: `0/${limiteFila}` }
        )
        .setColor("Blue");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("entrar")
          .setLabel("Entrar na Fila")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("sair")
          .setLabel("Sair")
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // 🔹 Stop sala
    if (interaction.commandName === "stop_sala") {

      if (!interaction.member.roles.cache.some(r => r.name === "ADM")) {
        return interaction.reply({ content: "❌ Apenas ADM pode usar.", ephemeral: true });
      }

      await interaction.channel.delete();
    }
  }

  if (interaction.isButton()) {

    if (interaction.customId === "entrar") {
      if (!filaAtual.includes(interaction.user.id)) {
        filaAtual.push(interaction.user.id);
      }
    }

    if (interaction.customId === "sair") {
      filaAtual = filaAtual.filter(id => id !== interaction.user.id);
    }

    const jogadores = filaAtual.map(id => `<@${id}>`).join("\n") || "Ninguém";

    const embed = new EmbedBuilder()
      .setTitle("🎮 Fila Ativa")
      .addFields(
        { name: "Modo", value: modoAtual, inline: true },
        { name: "Valor", value: valorAtual, inline: true },
        { name: "Jogadores", value: jogadores },
        { name: "Vagas", value: `${filaAtual.length}/${limiteFila}` }
      )
      .setColor("Green");

    await interaction.update({ embeds: [embed] });

    // 🔥 Quando encher
    if (filaAtual.length === limiteFila) {

      const guild = interaction.guild;

      const canal = await guild.channels.create({
        name: `fila-${contadorSalas}`,
        type: 0,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          ...filaAtual.map(id => ({
            id: id,
            allow: [PermissionFlagsBits.ViewChannel]
          })),
          {
            id: guild.roles.cache.find(r => r.name === "ADM").id,
            allow: [PermissionFlagsBits.ViewChannel]
          }
        ]
      });

      canal.send("🔥 Sala criada! Boa partida!");

      if (!filaAtual.includes(criadorFila)) {
        canal.send(`<@${criadorFila}> ⚠️ Você criou a fila e não entrou!`);
      }

      filaAtual = [];
      contadorSalas++;
    }
  }
});

client.login(TOKEN);
