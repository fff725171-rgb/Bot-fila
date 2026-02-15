const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let filas = {};
let jogadoresEmFila = new Set();
let contadorFila = 1;

client.once("ready", () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId } = interaction;

  // =========================
  // CRIAR FILA
  // =========================
  if (customId === "criar_fila") {

    const numeroFila = contadorFila++;
    const idFila = `fila_${numeroFila}`;

    filas[idFila] = {
      numero: numeroFila,
      jogadores: [],
      limite: 2
    };

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Fila ${numeroFila}`)
      .setDescription("Jogadores: (0/2)")
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

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }

  // =========================
  // ENTRAR
  // =========================
  if (customId.startsWith("entrar_")) {

    const idFila = customId.replace("entrar_", "");
    const fila = filas[idFila];

    if (!fila)
      return interaction.reply({ content: "Fila não encontrada.", ephemeral: true });

    if (jogadoresEmFila.has(interaction.user.id))
      return interaction.reply({ content: "Você já está em uma fila.", ephemeral: true });

    if (fila.jogadores.length >= fila.limite)
      return interaction.reply({ content: "Fila cheia.", ephemeral: true });

    fila.jogadores.push(interaction.user.id);
    jogadoresEmFila.add(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Fila ${fila.numero}`)
      .setDescription(
        `Jogadores (${fila.jogadores.length}/2):\n` +
        fila.jogadores.map(id => `<@${id}>`).join("\n")
      )
      .setColor("Blue");

    await interaction.update({ embeds: [embed] });

    // 🔥 SE COMPLETAR
    if (fila.jogadores.length === fila.limite) {

      const guild = interaction.guild;

      const canal = await guild.channels.create({
        name: `x1-${fila.numero}`,
        type: 0,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          ...fila.jogadores.map(id => ({
            id,
            allow: [PermissionFlagsBits.ViewChannel]
          }))
        ]
      });

      await canal.send("🔥 Sala criada para o X1!");

      // limpar sistema
      fila.jogadores.forEach(id => jogadoresEmFila.delete(id));

      const embedFinal = new EmbedBuilder()
        .setTitle(`🎮 Fila ${fila.numero}`)
        .setDescription("✅ Partida iniciada!\nCanal criado automaticamente.")
        .setColor("Red");

      await interaction.editReply({
        embeds: [embedFinal],
        components: []
      });

      delete filas[idFila];
    }
  }

  // =========================
  // SAIR
  // =========================
  if (customId.startsWith("sair_")) {

    const idFila = customId.replace("sair_", "");
    const fila = filas[idFila];

    if (!fila)
      return interaction.reply({ content: "Fila não encontrada.", ephemeral: true });

    if (!fila.jogadores.includes(interaction.user.id))
      return interaction.reply({ content: "Você não está na fila.", ephemeral: true });

    fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);
    jogadoresEmFila.delete(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Fila ${fila.numero}`)
      .setDescription(
        `Jogadores (${fila.jogadores.length}/2):\n` +
        (fila.jogadores.length > 0
          ? fila.jogadores.map(id => `<@${id}>`).join("\n")
          : "Ninguém na fila")
      )
      .setColor("Blue");

    await interaction.update({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
