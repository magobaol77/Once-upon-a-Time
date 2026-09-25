const DATA = window.GAME_DATA;

const ICONS = ["Charm", "Strength", "Dexterity", "Intelligence"];
const ICON_FILES = {
  Charm: "assets/icons/Tag - Charm.png",
  Strength: "assets/icons/Tag - Strength.png",
  Dexterity: "assets/icons/Tag - Ruse.png",
  Intelligence: "assets/icons/Tag - Intelligence.png",
  coins: "assets/icons/Coin.png",
  xp: "assets/icons/XP.png",
  vp: "assets/icons/VP.png",
  Good: "assets/icons/Good.png",
  Bad: "assets/icons/evil.png",
  ongoing: "assets/icons/Effect type - Ongoing.png",
  instant: "assets/icons/Effect type - Instant.png",
  activation: "assets/icons/Effect type - Activation.png",
  endgame: "assets/icons/Effect type - Endgame.png",
};
const ICON_LABELS = { Charm: "Charm", Strength: "Strength", Dexterity: "Dexterity", Intelligence: "Intelligence" };

const state = {
  round: 0,
  phase: "setup",
  coins: 0,
  xp: 0,
  vp: 0,
  tagTokens: 0,
  freeUpgrades: 0,
  decks: {},
  hand: [],
  actionDiscard: [],
  groups: [],
  itemDisplay: [],
  questDisplay: [],
  tableau: [],
  items: [],
  quests: [],
  questChoices: 0,
  writer: null,
  writerLevel: 1,
  writerItemDiscount: 0,
  writerDraftChoices: [],
  writerDiscardRemaining: 0,
  iconTokens: { Charm: 0, Strength: 0, Dexterity: 0, Intelligence: 0 },
  writerRound: {},
  rewardedIconSets: 0,
  currentAction: null,
  botNumber: null,
  playerFirst: false,
  gameOver: false,
  log: [],
};

const el = {
  stats: document.querySelector("#stats"),
  phaseText: document.querySelector("#phaseText"),
  actionHand: document.querySelector("#actionHand"),
  questDisplay: document.querySelector("#questDisplay"),
  itemDisplay: document.querySelector("#itemDisplay"),
  groups: document.querySelector("#groups"),
  tableau: document.querySelector("#tableau"),
  tableauSummary: document.querySelector("#tableauSummary"),
  playerAction: document.querySelector("#playerAction"),
  botAction: document.querySelector("#botAction"),
  roundState: document.querySelector("#roundState"),
  log: document.querySelector("#log"),
  scorePanel: document.querySelector("#scorePanel"),
  writerPanel: document.querySelector("#writerPanel"),
  writerSetup: document.querySelector("#writerSetup"),
  writerSetupTitle: document.querySelector("#writerSetupTitle"),
  writerChoices: document.querySelector("#writerChoices"),
  deckCatalog: document.querySelector("#deckCatalog"),
  deckCatalogTitle: document.querySelector("#deckCatalogTitle"),
  deckCatalogTabs: document.querySelector("#deckCatalogTabs"),
  deckCatalogCards: document.querySelector("#deckCatalogCards"),
  closeCatalogBtn: document.querySelector("#closeCatalogBtn"),
  newGameBtn: document.querySelector("#newGameBtn"),
  resolveActionBtn: document.querySelector("#resolveActionBtn"),
  endRoundBtn: document.querySelector("#endRoundBtn"),
  scoreBtn: document.querySelector("#scoreBtn"),
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function shuffle(cards) {
  const deck = clone(cards);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function draw(deckName, count) {
  const cards = [];
  for (let i = 0; i < count; i += 1) {
    const card = state.decks[deckName].shift();
    if (card) cards.push(card);
  }
  return cards;
}

function refillActionHand() {
  while (state.hand.length < 4 && state.decks.actions.length) {
    state.hand.push(state.decks.actions.shift());
  }
}

function log(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 40);
}

function newGame() {
  state.round = 0;
  state.phase = "chooseAction";
  state.coins = 2;
  state.xp = 0;
  state.vp = 0;
  state.tagTokens = 0;
  state.freeUpgrades = 0;
  state.decks = {
    common: shuffle(DATA.common),
    legendary: shuffle(DATA.legendary),
    items: shuffle(DATA.items),
    quests: shuffle(DATA.quests),
    actions: shuffle(DATA.actions),
  };
  state.hand = [];
  state.actionDiscard = [];
  state.groups = [];
  state.itemDisplay = draw("items", 3);
  state.questDisplay = draw("quests", 4);
  state.tableau = [];
  state.items = [];
  state.quests = [];
  state.questChoices = 0;
  state.writer = null;
  state.writerLevel = 1;
  state.writerItemDiscount = 0;
  state.writerDraftChoices = [];
  state.writerDiscardRemaining = 0;
  state.iconTokens = { Charm: 0, Strength: 0, Dexterity: 0, Intelligence: 0 };
  state.writerRound = {};
  state.rewardedIconSets = 0;
  state.currentAction = null;
  state.botNumber = null;
  state.playerFirst = false;
  state.gameOver = false;
  state.log = [];
  refillActionHand();
  startRound();
  state.phase = "writerMode";
  log("Choose how to assign your Writer.");
  render();
}

function startRound() {
  if (!state.hand.length) {
    state.gameOver = true;
    state.phase = "gameOver";
    log("Non hai piu Carte Azione disponibili. Calcola il punteggio finale.");
    return;
  }
  state.round += 1;
  state.currentAction = null;
  state.botNumber = null;
  state.playerFirst = false;
  state.writerRound = { alignmentRewarded: false, activationRewarded: false };
  state.groups = DATA.board2p.map((slot, index) => ({
    id: `G${index + 1}`,
    taken: false,
    removedByBot: false,
    cards: [
      ...draw("common", slot.basic).map((card) => ({ ...card, source: "Normal" })),
      ...draw("legendary", slot.advanced).map((card) => ({ ...card, source: "Legendary" })),
    ],
  }));
  state.phase = "chooseAction";
}

function playAction(action) {
  if (state.phase !== "chooseAction") return;
  state.currentAction = action;
  state.hand = state.hand.filter((card) => card.number !== action.number);
  state.actionDiscard.push(action);
  state.botNumber = 1 + Math.floor(Math.random() * 15);
  const writerBonus = state.writer?.name === "Carlo Collodi" && action.number <= 5 ? 1 : 0;
  const actionValue = action.number + writerBonus;
  state.playerFirst = actionValue >= state.botNumber;
  if (!state.playerFirst) {
    botTakeBestGroup();
    log(`The opponent played ${state.botNumber}, acts first, and takes the best group.`);
  } else {
    log(`The opponent played ${state.botNumber}. You choose first.`);
  }
  state.phase = "chooseGroup";
  log(`You play ${action.number}${writerBonus ? " (+1 Collodi)" : ""}. Now choose and take a group.`);
  render();
}

function activateActionStep() {
  if (state.phase !== "buyItem" || !state.currentAction) return;
  resolveAction(state.currentAction.effect);
  if (state.writer?.name === "J. M. Barrie" && state.currentAction.number <= 7 && state.playerFirst) gain("xp", 1);
  state.phase = "roundDone";
  log("Action card effect resolved.");
  render();
}

function groupValue(group) {
  return group.cards.reduce((sum, card) => {
    let value = card.deck === "legendary" ? 7 : 3;
    value += totalIcons(card) * 0.8;
    if (/Quest|Game End|Activation|Ongoing/i.test(card.effect || card.base || "")) value += 1.2;
    if (/Legendary/i.test(card.rank || "")) value += 1;
    return sum + value;
  }, 0);
}

function botTakeBestGroup() {
  const available = state.groups.filter((group) => !group.taken && !group.removedByBot);
  if (!available.length) return;
  available.sort((a, b) => groupValue(b) - groupValue(a));
  available[0].removedByBot = true;
}

function takeGroup(groupId) {
  if (state.phase !== "chooseGroup") return;
  const group = state.groups.find((entry) => entry.id === groupId);
  if (!group || group.taken || group.removedByBot) return;
  group.taken = true;
  for (const card of group.cards) {
    state.tableau.push(card);
    applyInstant(card);
  }
  applyWriterAfterGroup(group.cards);
  checkBaumSets();
  log(`You take ${group.cards.map((card) => card.name).join(", ")}.`);
  if (state.playerFirst) botTakeBestGroup();
  state.phase = "buyItem";
  log("You may now buy up to 1 Item, then resolve the Action card effect.");
  render();
}

function endRound() {
  if (state.phase !== "roundDone" || state.questChoices > 0) return;
  refillActionHand();
  while (state.itemDisplay.length < 3 && state.decks.items.length) {
    state.itemDisplay.push(...draw("items", 1));
  }
  while (state.questDisplay.length < 4 && state.decks.quests.length) {
    state.questDisplay.push(...draw("quests", 1));
  }
  el.endRoundBtn.disabled = true;
  startRound();
  render();
}

function buyItem(itemId) {
  const perraultPurchase = state.writer?.name === "Charles Perrault" && state.writerItemDiscount > 0;
  if (!perraultPurchase && (state.phase !== "buyItem" || state.writerRound.itemBought)) return;
  const item = state.itemDisplay.find((entry) => entry.id === itemId);
  const baseDiscount = state.writer?.name === "Charles Perrault" && !state.writerRound.itemBought ? 1 : 0;
  const discount = Math.max(baseDiscount, state.writerItemDiscount);
  const price = Math.max(0, item?.cost - discount);
  if (!item || state.coins < price) return;
  state.coins -= price;
  state.writerItemDiscount = 0;
  state.writerRound.itemBought = true;
  state.items.push(item);
  state.itemDisplay = state.itemDisplay.filter((entry) => entry.id !== itemId);
  applyInstant(item);
  triggerOnTakeItem();
  checkBaumSets();
  log(`You buy ${item.name} for ${price} coin${price === 1 ? "" : "s"}${discount ? ` (${discount} discount)` : ""}.`);
  render();
}

function takeQuest(questId) {
  if (state.questChoices <= 0) return;
  const quest = state.questDisplay.find((entry) => entry.id === questId);
  if (!quest) return;
  state.quests.push(quest);
  state.questDisplay = state.questDisplay.filter((entry) => entry.id !== questId);
  state.questChoices -= 1;
  const questRewardCards = state.tableau.filter((card) => /whenever you take a Quest, gain 1 XP/i.test(`${card.base || ""} ${card.upgrade || ""}`));
  if (questRewardCards.length) gain("xp", questRewardCards.length);
  log(`You take the Quest ${quest.name}.`);
  render();
}

function grantQuestChoice(source) {
  if (!state.questDisplay.length) {
    log(`${source} grants a Quest, but the display is empty.`);
    return;
  }
  state.questChoices += 1;
  log(`${source}: choose 1 Quest from the display.`);
}

function upgradeLegendary(cardId) {
  const card = state.tableau.find((entry) => entry.id === cardId && entry.deck === "legendary");
  if (!card || card.upgraded) return;
  const cost = upgradeCost(card);
  if (state.freeUpgrades > 0) {
    state.freeUpgrades -= 1;
  } else if (state.xp >= cost) {
    state.xp -= cost;
  } else {
    return;
  }
  card.upgraded = true;
  applyUpgradeGain(card);
  if (/take 1 Quest/i.test(card.upgrade || "")) grantQuestChoice(card.name);
  log(`${card.name} is upgraded.`);
  render();
}

function chooseWriter(writerId) {
  const writer = DATA.writers.find((entry) => entry.id === writerId);
  if (!writer || state.writer) return;
  state.writer = clone(writer);
  state.phase = "chooseAction";
  log(`You chose ${writer.name}.`);
  render();
}

function chooseWriterMode(mode) {
  if (state.phase !== "writerMode") return;
  if (mode === "random") {
    const writers = DATA.writers || [];
    state.writer = writers.length ? clone(writers[Math.floor(Math.random() * writers.length)]) : null;
    state.phase = "chooseAction";
    log(state.writer ? `${state.writer.name} was randomly assigned to you.` : "No Writer available.");
    log("Choose an Action card from your hand.");
  } else {
    state.phase = "chooseWriter";
  }
  render();
}

function upgradeWriter() {
  if (!state.writer || state.writerLevel >= 3) return;
  const nextLevel = state.writerLevel + 1;
  const cost = nextLevel === 2 ? state.writer.cost2 : state.writer.cost3;
  if (state.xp < cost) return;
  state.xp -= cost;
  state.writerLevel = nextLevel;
  log(`${state.writer.name} reaches level ${nextLevel}.`);
  if (nextLevel === 2) resolveWriterInstant();
  render();
}

function resolveWriterInstant() {
  const name = state.writer.name;
  if (name === "Charles Perrault") {
    state.writerItemDiscount = 2;
    log("Perrault: your next Item costs 2 fewer coins.");
  } else if (name === "Brothers Grimm") {
    gain("xp", Math.min(5, Math.min(countAlignment("Good"), countAlignment("Bad"))));
  } else if (name === "Hans Christian Andersen") {
    state.writerDiscardRemaining = 2;
    log("Andersen: you may discard up to two cards from your tableau.");
  } else if (name === "Carlo Collodi") {
    const recovered = state.actionDiscard.pop();
    if (recovered) {
      state.hand.push(recovered);
      const discard = state.hand.filter((card) => card !== recovered).sort((a, b) => a.number - b.number)[0];
      if (discard) {
        state.hand = state.hand.filter((card) => card !== discard);
        state.actionDiscard.push(discard);
      }
    }
  } else if (name === "Lewis Carroll") {
    const cards = [...state.tableau, ...state.items].filter((card) => /Activation/i.test(`${card.effect || ""} ${card.base || ""}`)).slice(0, 2);
    cards.forEach(activateCard);
    log(`Carroll activates ${cards.length} card${cards.length === 1 ? "" : "s"}.`);
  } else if (name === "J. M. Barrie") {
    state.writerDraftChoices = draw("common", 3);
  } else if (name === "L. Frank Baum") {
    state.writerDraftChoices = ICONS.map((icon) => ({ id: icon, name: ICON_LABELS[icon], iconChoice: icon }));
  } else if (name === "Leprince de Beaumont") {
    state.freeUpgrades += 1;
  }
}

function resolveWriterDraft(choiceId) {
  const choice = state.writerDraftChoices.find((entry) => entry.id === choiceId);
  if (!choice) return;
  if (choice.iconChoice) {
    state.iconTokens[choice.iconChoice] += 2;
    checkBaumSets();
  } else {
    state.tableau.push({ ...choice, source: "Normal" });
    applyInstant(choice);
    checkBaumSets();
  }
  state.writerDraftChoices = [];
  render();
}

function discardForWriter(cardId) {
  if (state.writerDiscardRemaining <= 0) return;
  const zones = [state.tableau, state.items];
  for (const zone of zones) {
    const index = zone.findIndex((card) => card.id === cardId);
    if (index >= 0) {
      const [card] = zone.splice(index, 1);
      state.writerDiscardRemaining -= 1;
      gain("coins", 2);
      gain("xp", 2);
      log(`Scarti ${card.name} con Andersen.`);
      break;
    }
  }
  render();
}

function finishWriterDiscard() {
  state.writerDiscardRemaining = 0;
  render();
}

function applyWriterAfterGroup(cards) {
  if (state.writer?.name !== "Brothers Grimm" || state.writerRound.alignmentRewarded) return;
  if (cards.some((card) => card.alignment === "Good" || card.alignment === "Bad")) {
    gain("coins", 1);
    state.writerRound.alignmentRewarded = true;
  }
}

function checkBaumSets() {
  if (state.writer?.name !== "L. Frank Baum") return;
  const sets = Math.min(...ICONS.map((icon) => iconCounts()[icon]));
  if (sets > state.rewardedIconSets) {
    gain("coins", sets - state.rewardedIconSets);
    state.rewardedIconSets = sets;
  }
}

function resolveAction(effect) {
  const text = effect || "";
  if (/3 Coins/i.test(text)) gain("coins", 3);
  if (/4 Coins/i.test(text)) gain("coins", 4);
  if (/2 coins/i.test(text)) gain("coins", 2);
  if (/1 Coin/i.test(text)) gain("coins", 1);
  if (/3 XP/i.test(text)) gain("xp", 3);
  else if (/1 XP/i.test(text)) gain("xp", 1);
  if (/Quest/i.test(text)) grantQuestChoice("Action card");
  if (/Activate all/i.test(text)) activateAll();
  if (/Activate a single/i.test(text)) activateOne();
  if (/Free level up 2/i.test(text)) state.freeUpgrades += 2;
  else if (/free level up/i.test(text)) state.freeUpgrades += 1;
}

function applyInstant(card) {
  const text = `${card.effect || ""} ${card.base || ""}`;
  if (!/Instant/i.test(text)) return;
  if (/gain 5 XP/i.test(text)) gain("xp", 5);
  else if (/gain 4 XP/i.test(text)) gain("xp", 4);
  else if (/gain 3 XP/i.test(text)) gain("xp", 3);
  else if (/gain 2 XP/i.test(text)) gain("xp", 2);
  else if (/gain 1 XP/i.test(text)) gain("xp", 1);
  if (/gain 5 coins/i.test(text)) gain("coins", 5);
  else if (/gain 4 coins/i.test(text)) gain("coins", 4);
  else if (/gain 3 coins/i.test(text)) gain("coins", 3);
  else if (/gain 2 coins/i.test(text)) gain("coins", 2);
  else if (/gain 1 coin/i.test(text)) gain("coins", 1);
  if (/gain 3 VP/i.test(text)) gain("vp", 3);
  else if (/gain 2 VP/i.test(text)) gain("vp", 2);
  if (/Tag token/i.test(text)) state.tagTokens += 1;
  if (/take 1 Quest|Take 1 Quest/i.test(text)) {
    grantQuestChoice(card.name);
  }
  if (/level up .*free/i.test(text)) state.freeUpgrades += 1;
  if (/draw and discard 1 Action/i.test(text)) {
    const drawn = state.decks.actions.shift();
    if (drawn) state.hand.push(drawn);
  }
}

function applyUpgradeGain(card) {
  const text = card.upgrade || "";
  const vp = text.match(/Gain (\d+) VP/i);
  if (vp) gain("vp", Number(vp[1]));
}

function triggerOnTakeItem() {
  const munchkins = state.tableau.filter((card) => /The Munchkins/i.test(card.name)).length;
  if (munchkins) gain("xp", munchkins);
}

function activateAll() {
  const cards = [...state.tableau, ...state.items].filter((card) =>
    /Activation/i.test(`${card.effect || ""} ${card.base || ""} ${card.upgraded ? card.upgrade || "" : ""}`),
  );
  for (const card of cards) activateCard(card);
  log(`You activate ${cards.length} card${cards.length === 1 ? "" : "s"}.`);
}

function activateOne() {
  const card = [...state.tableau, ...state.items].find((entry) =>
    /Activation/i.test(`${entry.effect || ""} ${entry.base || ""}`),
  );
  if (card) {
    activateCard(card);
    log(`You activate ${card.name}.`);
  }
}

function activateCard(card) {
  const text = `${card.effect || ""} ${card.base || ""} ${card.upgraded ? card.upgrade || "" : ""}`;
  const hasActivationCost = /Activation:[\s\S]*?\b(?:spend|discard|tuck)\b/i.test(text);
  if (/spend 1 coin to gain 1 XP/i.test(text) && state.coins < 1) {
    log(`${card.name}: you do not have enough coins to use the optional effect.`);
    return;
  }
  if (/spend 1 XP to gain 3 coins/i.test(text) && state.xp < 1) {
    log(`${card.name}: you do not have enough XP to use the optional effect.`);
    return;
  }
  if (/spend 3 coins to level up/i.test(text) && state.coins < 3) {
    log(`${card.name}: you do not have enough coins to use the optional effect.`);
    return;
  }
  if (hasActivationCost && !window.confirm(`${card.name}: this Activation has a cost. Do you want to use it?`)) {
    log(`You chose not to use ${card.name}'s effect.`);
    return;
  }
  if (card.name === "The Merry Men" && /spend 1 coin to gain 1 XP/i.test(text)) {
    state.coins -= 1;
    gain("xp", 1);
    if (state.writer?.name === "Lewis Carroll" && !state.writerRound.activationRewarded) {
      gain("coins", 1);
      state.writerRound.activationRewarded = true;
    }
    log("The Merry Men: spend 1 coin and gain 1 XP.");
    return;
  }
  if (/spend 1 XP to gain 3 coins/i.test(text)) {
    state.xp -= 1;
    gain("coins", 3);
  }
  if (/spend 3 coins to level up/i.test(text)) {
    state.coins -= 3;
    state.freeUpgrades += 1;
    log(`${card.name}: spend 3 coins and gain one free upgrade.`);
    return;
  }
  if (/gain 2 XP/i.test(text)) gain("xp", 2);
  else if (/gain 1 XP/i.test(text)) gain("xp", 1);
  if (/gain 1 coin for each Dexterity/i.test(text)) gain("coins", countIcon("Dexterity"));
  if (/gain 1 coin for each Pirate/i.test(text)) gain("coins", countByName("Pirate"));
  if (/gain 1 XP for each Charm/i.test(text)) gain("xp", Math.min(5, countIcon("Charm")));
  if (/gain 2 VP/i.test(text)) gain("vp", 2);
  else if (/gain 1 VP/i.test(text)) gain("vp", 1);
  if (/Tag token/i.test(text)) state.tagTokens += 1;
  if (state.writer?.name === "Lewis Carroll" && !state.writerRound.activationRewarded) {
    gain("coins", 1);
    state.writerRound.activationRewarded = true;
  }
}

function gain(kind, amount) {
  if (!amount) return;
  if (kind === "coins") state.coins += amount;
  if (kind === "xp") state.xp += amount;
  if (kind === "vp") state.vp += amount;
}

function upgradeCost(card) {
  const match = (card.upgrade || "").match(/Cost (\d+) XP/i);
  const base = match ? Number(match[1]) : 4;
  return Math.max(0, base - (state.writer?.name === "Leprince de Beaumont" ? 1 : 0));
}

function iconCounts() {
  const counts = Object.fromEntries(ICONS.map((icon) => [icon, state.iconTokens[icon] || 0]));
  for (const card of [...state.tableau, ...state.items]) {
    for (const icon of ICONS) {
      counts[icon] += iconAmount(card, icon);
    }
    if (card.deck === "legendary" && card.upgraded) {
      for (const icon of ICONS) {
        counts[icon] += textIconAmount(card.upgrade || "", icon);
      }
    }
  }
  return counts;
}

function iconAmount(card, icon) {
  return textIconAmount(`${card.icons || ""} ${card.base || ""}`, icon);
}

function totalIcons(card) {
  return ICONS.reduce((sum, icon) => sum + iconAmount(card, icon), 0);
}

function textIconAmount(text, icon) {
  const regex = new RegExp(`${icon}\\s*(\\d+)?`, "gi");
  let total = 0;
  let match;
  while ((match = regex.exec(text || ""))) {
    total += Number(match[1] || 1);
  }
  return total;
}

function countIcon(icon) {
  return iconCounts()[icon] || 0;
}

function countAlignment(alignment) {
  return state.tableau.filter((card) => card.alignment === alignment).length;
}

function countByName(name) {
  return state.tableau.filter((card) => card.name.includes(name)).length;
}

function countCardsWith(pattern) {
  const regex = new RegExp(pattern, "i");
  return [...state.tableau, ...state.items].filter((card) =>
    regex.test(`${card.effect || ""} ${card.base || ""} ${card.upgrade || ""}`),
  ).length;
}

function scoreQuest(quest) {
  const icons = iconCounts();
  const completeSets = Math.min(...ICONS.map((icon) => icons[icon]));
  const upgraded = state.tableau.filter((card) => card.deck === "legendary" && card.upgraded).length;
  const name = quest.name;
  if (/Midnight Ball/.test(name)) return Math.min(14, icons.Charm * 2);
  if (/Hook/.test(name)) return Math.min(14, icons.Strength * 2);
  if (/Rabbit Hole/.test(name)) return Math.min(14, icons.Dexterity * 2);
  if (/Lost Voice/.test(name)) return Math.min(14, icons.Intelligence * 2);
  if (/Glass Slipper/.test(name)) return Math.min(15, completeSets * 5);
  if (/Neverland/.test(name)) return completeSets >= 3 ? 12 : completeSets >= 2 ? 8 : 0;
  if (/Apple's Bite/.test(name)) return Math.min(14, countAlignment("Bad") * 2);
  if (/Forest Awakening/.test(name)) return Math.min(12, countAlignment("Good"));
  if (/Queen's Command/.test(name)) return Math.min(15, countAlignment("Neutral") * 3);
  if (/House of Seven/.test(name)) return Math.min(12, state.tableau.length);
  if (/King's Trident/.test(name)) return Math.min(14, state.items.length * 2);
  if (/Hatter's Tea Party/.test(name)) return Math.min(15, countCardsWith("Ongoing") * 3);
  if (/Second Star/.test(name)) return Math.min(14, countCardsWith("Activation") * 2);
  if (/Pact with the Beast/.test(name)) return Math.min(15, upgraded * 5);
  if (/Enchanted Rose/.test(name)) return Math.min(15, countCardsWith("less XP|free") * 3);
  if (/Rob the Rich/.test(name)) return Math.min(12, Math.floor(state.coins / 2));
  if (/Rubbed Lamp/.test(name)) return Math.min(12, Math.floor(state.xp / 2));
  if (/Arrow on Target/.test(name)) return Math.min(15, countCardsWith("VP|Game End") * 3);
  if (/Final Wish/.test(name)) return Math.min(15, Math.max(0, state.quests.length - 1) * 5);
  if (/Once Upon a Time/.test(name)) {
    const categories = [
      countAlignment("Good"),
      countAlignment("Bad"),
      state.tableau.length,
      state.items.length,
      countCardsWith("Activation"),
    ].filter((value) => value >= 3).length;
    return Math.min(15, categories * 3);
  }
  return 0;
}

function finalScore() {
  const questScores = state.quests.map((quest) => ({ quest, points: scoreQuest(quest) }));
  const questTotal = questScores.reduce((sum, entry) => sum + entry.points, 0);
  const writerTotal = scoreWriter();
  return { base: state.vp, questScores, questTotal, writerTotal, total: state.vp + questTotal + writerTotal };
}

function scoreWriter() {
  if (!state.writer || state.writerLevel < 3) return 0;
  const name = state.writer.name;
  if (name === "Charles Perrault") return Math.min(14, state.items.length * 2);
  if (name === "Brothers Grimm") return Math.min(15, Math.min(countAlignment("Good"), countAlignment("Bad")) * 3);
  if (name === "Hans Christian Andersen") return Math.min(14, countCardsWith("Game End") * 2);
  if (name === "Carlo Collodi") return Math.min(14, Math.floor(state.coins / 2) + Math.floor(state.xp / 2));
  if (name === "Lewis Carroll") return Math.min(14, countCardsWith("Activation") * 2);
  if (name === "J. M. Barrie") return Math.min(14, countIcon("Dexterity") * 2);
  if (name === "L. Frank Baum") return Math.min(15, Math.min(...ICONS.map(countIcon)) * 5);
  if (name === "Leprince de Beaumont") {
    return Math.min(16, state.tableau.filter((card) => card.deck === "legendary" && card.upgraded).length * 4);
  }
  return 0;
}

function render() {
  renderStats();
  renderActions();
  renderWriter();
  renderDisplays();
  renderGroups();
  renderTableau();
  renderRound();
  renderLog();
}

function renderStats() {
  const icons = iconCounts();
  el.stats.innerHTML = [
    ["Round", state.round],
    [resourceIcon("coins", "Coins"), state.coins],
    [resourceIcon("xp", "XP"), state.xp],
    [resourceIcon("vp", "VP"), state.vp],
    ["Quest", state.quests.length],
    ["Free up", state.freeUpgrades],
  ]
    .map(([label, value]) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
  el.phaseText.textContent = state.writer?.name === "Charles Perrault" && state.writerItemDiscount > 0
    ? "Perrault: immediately buy an Item for 2 fewer coins."
    : state.gameOver
    ? "Game over. Calculate the final score."
    : state.phase === "writerMode"
      ? "Choose whether to draw or select your Writer."
      : state.phase === "chooseWriter"
      ? "Choose a Writer to start the game."
      : state.phase === "chooseAction"
      ? "Choose an Action card. The opponent will roll a number from 1 to 15."
      : state.phase === "buyItem"
        ? "You may buy up to 1 Item, then resolve the Action card effect."
      : state.phase === "chooseGroup"
        ? "Choose and take an available group."
        : state.questChoices > 0
          ? `Choose ${state.questChoices} Quest from the display to resolve the effect.`
          : "Round complete. You may upgrade Legendary cards or end the round.";
  el.tableauSummary.innerHTML = [
    ...ICONS.map((icon) => [resourceIcon(icon, ICON_LABELS[icon]), icons[icon]]),
    [resourceIcon("Good", "Good"), countAlignment("Good")],
    [resourceIcon("Bad", "Bad"), countAlignment("Bad")],
    ["Items", state.items.length],
    ["Upgrade", state.tableau.filter((card) => card.upgraded).length],
  ]
    .map(([label, value]) => `<div class="summary-cell"><span class="label">${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderActions() {
  el.actionHand.innerHTML = state.hand
    .sort((a, b) => a.number - b.number)
    .map(
      (action) => `
        <button class="action-card" type="button" ${state.phase !== "chooseAction" ? "disabled" : ""} data-action="${action.number}">
          <span class="action-number">${action.number}</span>
          <span>${formatGameText(action.effect)}</span>
        </button>
      `,
    )
    .join("");
  for (const button of el.actionHand.querySelectorAll("[data-action]")) {
    button.addEventListener("click", () => {
      const action = state.hand.find((entry) => entry.number === Number(button.dataset.action));
      playAction(action);
    });
  }
}

function renderDisplays() {
  el.questDisplay.innerHTML = state.questDisplay.map(renderQuest).join("");
  for (const button of el.questDisplay.querySelectorAll("[data-quest]")) {
    button.addEventListener("click", () => takeQuest(button.dataset.quest));
  }
  el.itemDisplay.innerHTML = state.itemDisplay.map(renderItem).join("");
  for (const button of el.itemDisplay.querySelectorAll("[data-item]")) {
    button.addEventListener("click", () => buyItem(button.dataset.item));
  }
}

function renderQuest(quest) {
  return `
    <div class="card">
      <div class="card-title">${quest.name}</div>
      <div class="meta">${quest.theme}</div>
      <div class="effect">${formatGameText(quest.scoring)}</div>
      <button type="button" ${state.questChoices <= 0 ? "disabled" : ""} data-quest="${quest.id}">${state.questChoices > 0 ? "Choose Quest" : "Requires a Quest effect"}</button>
    </div>
  `;
}

function renderItem(item) {
  const baseDiscount = state.writer?.name === "Charles Perrault" && !state.writerRound.itemBought ? 1 : 0;
  const discount = Math.max(baseDiscount, state.writerItemDiscount);
  const price = Math.max(0, item.cost - discount);
  const perraultPurchase = state.writer?.name === "Charles Perrault" && state.writerItemDiscount > 0;
  const canBuy = perraultPurchase || (state.phase === "buyItem" && !state.writerRound.itemBought);
  return `
    <div class="card">
      <div class="item-heading"><span class="item-cost">${price} ${resourceIcon("coins", "coins")}</span><div class="card-title">${item.name}</div></div>
      ${renderTags(item)}
      ${discount ? `<div class="meta item-original-cost"><s>${item.cost}</s> coins</div>` : ""}
      <div class="effect">${formatGameText(item.effect)}</div>
      <button type="button" ${!canBuy || state.coins < price ? "disabled" : ""} data-item="${item.id}">Buy</button>
    </div>
  `;
}

function renderGroups() {
  el.groups.innerHTML = state.groups
    .map(
      (group) => `
        <div class="group ${group.removedByBot ? "removed" : ""}" style="--group-width: ${group.cards.length === 1 ? 179 : group.cards.length === 2 ? 260 : 550}px">
          <h3>${group.id}${group.removedByBot ? " - taken by opponent" : group.taken ? " - taken" : ""}</h3>
          <div class="group-cards">${group.cards.map(renderCard).join("")}</div>
          <button type="button" ${state.phase !== "chooseGroup" || group.taken || group.removedByBot ? "disabled" : ""} data-group="${group.id}">Take group</button>
        </div>
      `,
    )
    .join("");
  for (const button of el.groups.querySelectorAll("[data-group]")) {
    button.addEventListener("click", () => takeGroup(button.dataset.group));
  }
}

function renderTableau() {
  const cards = [
    ...state.tableau.map((card) => ({ ...card, zone: "Tableau" })),
    ...state.items.map((card) => ({ ...card, zone: "Item" })),
    ...state.quests.map((card) => ({ ...card, zone: "Quest" })),
  ];
  const sections = [
    { title: "Activations", test: (card) => /Activation:/i.test(activeCardText(card)) },
    { title: "Ongoing Effects", test: (card) => /Ongoing:/i.test(activeCardText(card)) },
    { title: "Instant Effects", test: (card) => /Instant:/i.test(activeCardText(card)) && !/Game End:/i.test(activeCardText(card)) },
    { title: "Other Cards", test: () => true },
  ];
  const remaining = [...cards];
  el.tableau.innerHTML = sections.map((section) => {
    const selected = remaining.filter(section.test);
    for (const card of selected) remaining.splice(remaining.indexOf(card), 1);
    if (!selected.length) return "";
    return `<section class="tableau-section"><h3>${section.title} <span>${selected.length}</span></h3><div class="tableau-section-cards">${selected.map((card) => section.title === "Instant Effects" ? renderCompactOwnedCard(card) : renderOwnedCard(card)).join("")}</div></section>`;
  }).join("");
}

function activeCardText(card) {
  return `${card.effect || ""} ${card.base || ""} ${card.upgraded ? card.upgrade || "" : ""}`;
}

function renderCompactOwnedCard(card) {
  const canUpgrade = card.deck === "legendary" && !card.upgraded && (state.xp >= upgradeCost(card) || state.freeUpgrades > 0);
  return `<div class="compact-owned ${card.deck === "legendary" ? "legendary-card" : card.deck === "common" ? "common-card" : ""}">
    <strong>${card.name}${card.upgraded ? " +" : ""}</strong>${renderTags(card)}
    ${card.deck === "legendary" ? `<details><summary>Effects and upgrade</summary>${renderLegendaryEffects(card)}</details><button type="button" ${!canUpgrade ? "disabled" : ""} data-upgrade="${card.id}">Upgrade (${upgradeCost(card)} ${resourceIcon("xp", "XP")})</button>` : ""}
    ${state.writerDiscardRemaining > 0 && (card.zone === "Tableau" || card.zone === "Item") ? `<button type="button" data-writer-discard="${card.id}">Discard: +2 ${resourceIcon("coins", "coins")} +2 ${resourceIcon("xp", "XP")}</button>` : ""}
  </div>`;
}

function renderOwnedCard(card) {
  if (card.zone === "Quest") {
    return `<div class="card"><div class="card-title">${card.name}</div><div class="effect">${formatGameText(card.scoring)}</div></div>`;
  }
  const canUpgrade = card.deck === "legendary" && !card.upgraded && (state.xp >= upgradeCost(card) || state.freeUpgrades > 0);
  return `
    <div class="card ${card.deck === "legendary" ? "legendary-card" : card.deck === "common" ? "common-card" : ""}">
      <div class="card-title">${card.name}${card.upgraded ? " + " : ""}</div>
      ${renderTags(card)}
      <div class="meta">${card.alignment || card.rank || card.zone}</div>
      ${card.deck === "legendary" ? renderLegendaryEffects(card) : `<div class="effect">${formatGameText(card.effect)}</div>`}
      ${card.deck === "legendary" ? `<button type="button" ${!canUpgrade ? "disabled" : ""} data-upgrade="${card.id}">Upgrade (${upgradeCost(card)} ${resourceIcon("xp", "XP")})</button>` : ""}
      ${state.writerDiscardRemaining > 0 && (card.zone === "Tableau" || card.zone === "Item") ? `<button type="button" data-writer-discard="${card.id}">Discard: +2 ${resourceIcon("coins", "coins")} +2 ${resourceIcon("xp", "XP")}</button>` : ""}
    </div>
  `;
}

function renderCard(card) {
  return `
    <div class="card ${card.deck === "legendary" ? "legendary-card" : "common-card"}">
      <div class="card-title">${card.name}</div>
      ${renderTags(card)}
      ${card.deck === "legendary" ? renderLegendaryEffects(card) : `<div class="effect">${formatGameText(card.effect)}</div>`}
    </div>
  `;
}

function renderLegendaryEffects(card) {
  const upgradeText = String(card.upgrade || "").replace(/^Cost\s+\d+\s+XP\.\s*/i, "");
  return `
    <div class="legendary-effects">
      <div class="legendary-effect-block">
        <strong>Base</strong>
        <div class="effect">${formatGameText(card.base)}</div>
      </div>
      <div class="legendary-effect-block upgrade-effect ${card.upgraded ? "unlocked" : ""}">
        <div class="legendary-upgrade-heading"><span>${upgradeCost(card)} ${resourceIcon("xp", "XP")}</span><strong>Upgrade</strong></div>
        <div class="legendary-upgrade-ability ${card.upgraded ? "" : "locked"}"><div class="effect">${formatGameText(upgradeText)}</div></div>
      </div>
    </div>
  `;
}

function renderTags(card) {
  const tags = [];
  for (const icon of ICONS) {
    const count = iconAmount(card, icon);
    for (let i = 0; i < count; i += 1) tags.push(`<span class="tag icon-tag">${resourceIcon(icon, ICON_LABELS[icon])}</span>`);
  }
  if (card.alignment === "Good" || card.alignment === "Bad") {
    tags.push(`<span class="tag icon-tag alignment-icon">${resourceIcon(card.alignment, card.alignment)}</span>`);
  } else if (card.alignment) {
    tags.push(`<span class="tag ${card.alignment.toLowerCase()}">${card.alignment}</span>`);
  }
  return `<div class="tag-row">${tags.join("")}</div>`;
}

function renderRound() {
  el.playerAction.textContent = state.currentAction ? state.currentAction.number : "-";
  el.botAction.textContent = state.botNumber || "-";
  el.roundState.textContent =
    state.phase === "writerMode"
      ? "Start game"
      : state.phase === "chooseWriter"
      ? "Choose Writer"
      : state.phase === "chooseAction"
      ? "Choose Action"
      : state.phase === "buyItem"
        ? "Buy or resolve effect"
      : state.phase === "chooseGroup"
        ? "Take group"
        : state.phase === "gameOver"
          ? "Game over"
          : "Round resolved";
  el.endRoundBtn.disabled = state.phase !== "roundDone" || state.questChoices > 0;
  el.resolveActionBtn.disabled = state.phase !== "buyItem";
  el.resolveActionBtn.classList.toggle("hidden", state.phase !== "buyItem");
  for (const button of el.tableau.querySelectorAll("[data-upgrade]")) {
    button.addEventListener("click", () => upgradeLegendary(button.dataset.upgrade));
  }
  for (const button of el.tableau.querySelectorAll("[data-writer-discard]")) {
    button.addEventListener("click", () => discardForWriter(button.dataset.writerDiscard));
  }
}

function renderLog() {
  el.log.innerHTML = state.log.map((entry) => `<p>${entry}</p>`).join("");
}

function showScore() {
  const score = finalScore();
  el.scorePanel.classList.remove("hidden");
  el.scorePanel.innerHTML = `
    <h2>Final Score</h2>
    <p>Total: <strong>${score.total} ${resourceIcon("vp", "VP")}</strong> (${score.base} VP during the game + ${score.questTotal} VP from Quests + ${score.writerTotal} VP from the Writer)</p>
    <table class="score-table">
      <thead><tr><th>Quest</th><th>Scoring</th><th>VP</th></tr></thead>
      <tbody>
        ${score.questScores
          .map((entry) => `<tr><td>${entry.quest.name}</td><td>${entry.quest.scoring}</td><td>${entry.points}</td></tr>`)
          .join("")}
      </tbody>
    </table>
  `;
}

function renderWriter() {
  const writers = DATA.writers || [];
  const setupOpen = state.phase === "writerMode" || state.phase === "chooseWriter";
  el.writerSetup.classList.toggle("hidden", !setupOpen);
  el.writerSetupTitle.textContent = state.phase === "writerMode" ? "Once Upon a Time" : "Choose your Writer";
  el.writerChoices.className = state.phase === "writerMode" ? "main-menu" : "writer-choice-grid";
  el.writerChoices.innerHTML = state.phase === "writerMode"
    ? `<div class="main-menu-modes">
        <section class="menu-mode">
          <h3>Solo game</h3>
          <div class="menu-mode-actions">
            <button type="button" data-writer-mode="random">Start with a random Writer</button>
            <button type="button" data-writer-mode="choose">Choose your Writer</button>
          </div>
        </section>
        <section class="menu-mode menu-mode-future">
          <h3>Multiplayer game</h3>
          <button type="button" disabled title="Mode in development">Start multiplayer game</button>
          <div class="multiplayer-preview"><span>2–5 players</span><span>Player / Bot</span></div>
        </section>
      </div>
      <section class="menu-decks">
        <h3>Complete decks</h3>
        <div class="menu-deck-buttons">
          ${DECK_CATALOG.map((deck) => `<button type="button" data-catalog="${deck.key}">${deck.label}<span>${DATA[deck.key].length}</span></button>`).join("")}
        </div>
      </section>`
    : state.phase === "chooseWriter"
      ? writers.map((writer) => renderWriterCard(writer, 1, true)).join("")
      : "";
  for (const button of el.writerChoices.querySelectorAll("[data-writer-mode]")) {
    button.addEventListener("click", () => chooseWriterMode(button.dataset.writerMode));
  }
  for (const button of el.writerChoices.querySelectorAll("[data-writer]")) {
    button.addEventListener("click", () => chooseWriter(button.dataset.writer));
  }
  for (const button of el.writerChoices.querySelectorAll("[data-catalog]")) {
    button.addEventListener("click", () => openCatalog(button.dataset.catalog));
  }

  el.writerPanel.innerHTML = state.writer ? renderWriterCard(state.writer, state.writerLevel, false) : "";
  const upgrade = el.writerPanel.querySelector("[data-writer-upgrade]");
  if (upgrade) upgrade.addEventListener("click", upgradeWriter);
  const finishDiscard = el.writerPanel.querySelector("[data-finish-writer-discard]");
  if (finishDiscard) finishDiscard.addEventListener("click", finishWriterDiscard);
  for (const button of el.writerPanel.querySelectorAll("[data-writer-choice]")) {
    button.addEventListener("click", () => resolveWriterDraft(button.dataset.writerChoice));
  }
}

const DECK_CATALOG = [
  { key: "common", label: "Common" },
  { key: "legendary", label: "Legendary" },
  { key: "quests", label: "Quest" },
  { key: "items", label: "Items" },
  { key: "writers", label: "Writers" },
];

function openCatalog(key) {
  const deck = DECK_CATALOG.find((entry) => entry.key === key);
  if (!deck) return;
  el.deckCatalogTitle.textContent = `${deck.label} (${DATA[key].length})`;
  el.deckCatalogTabs.innerHTML = DECK_CATALOG.map((entry) =>
    `<button type="button" class="${entry.key === key ? "selected" : ""}" data-catalog-tab="${entry.key}" aria-current="${entry.key === key ? "true" : "false"}">${entry.label}</button>`,
  ).join("");
  el.deckCatalogCards.innerHTML = DATA[key].map((card) => {
    if (key === "writers") return renderWriterCard(card, 1, false, true);
    if (key === "quests") return `<article class="card"><div class="card-title">${card.name}</div><div class="meta">${card.theme}</div><div class="effect">${formatGameText(card.scoring)}</div></article>`;
    if (key === "items") return `<article class="card"><div class="item-heading"><span class="item-cost">${card.cost} ${resourceIcon("coins", "coins")}</span><div class="card-title">${card.name}</div></div>${renderTags(card)}<div class="effect">${formatGameText(card.effect)}</div></article>`;
    return renderCard(card);
  }).join("");
  el.deckCatalog.classList.remove("hidden");
  for (const button of el.deckCatalogTabs.querySelectorAll("[data-catalog-tab]")) {
    button.addEventListener("click", () => openCatalog(button.dataset.catalogTab));
  }
  el.closeCatalogBtn.focus();
}

function closeCatalog() {
  el.deckCatalog.classList.add("hidden");
}

function renderWriterCard(writer, level, selectable, preview = false) {
  const nextLevel = level + 1;
  const nextCost = nextLevel === 2 ? writer.cost2 : writer.cost3;
  const canUpgrade = !selectable && !preview && level < 3 && state.xp >= nextCost;
  const levels = [
    { number: 1, type: "ongoing", text: writer.level1 },
    { number: 2, type: "instant", text: writer.level2, cost: writer.cost2 },
    { number: 3, type: "endgame", text: writer.level3, cost: writer.cost3 },
  ];
  return `
    <article class="writer-card">
      <div class="writer-card-header">
        <div class="writer-name">${writer.name}</div>
        <div class="writer-level">${selectable || preview ? "Writer" : `Level ${level}`}</div>
      </div>
      <div class="writer-effect-icons">
        ${levels.map((entry) => `<div class="writer-effect-icon">${resourceIcon(entry.type, effectLabel(entry.type))}<span>Lv ${entry.number}</span></div>`).join("")}
      </div>
      <div class="writer-levels">
        ${levels.map((entry) => `<div class="writer-level-box ${!selectable && !preview && entry.number > level ? "locked" : ""}"><strong>Level ${entry.number}${entry.cost ? ` · ${entry.cost} ${resourceIcon("xp", "XP")}` : ""}</strong>${formatGameText(entry.text)}</div>`).join("")}
      </div>
      ${state.writerDraftChoices.length && !selectable ? `<div class="writer-draft">${state.writerDraftChoices.map((choice) => `<button type="button" data-writer-choice="${choice.id}">${choice.iconChoice ? resourceIcon(choice.iconChoice, choice.name) : choice.name}</button>`).join("")}</div>` : ""}
      ${preview ? "" : `<div class="writer-card-actions">
        ${selectable ? `<button type="button" data-writer="${writer.id}">Choose</button>` : level < 3 ? `<button type="button" ${!canUpgrade ? "disabled" : ""} data-writer-upgrade>Level ${nextLevel} (${nextCost} ${resourceIcon("xp", "XP")})</button>` : ""}
        ${state.writerDiscardRemaining > 0 && !selectable ? `<button type="button" data-finish-writer-discard>Finish discarding</button>` : ""}
      </div>`}
    </article>
  `;
}

function effectLabel(type) {
  return { ongoing: "Ongoing", instant: "Instant", activation: "Activation", endgame: "Game End" }[type] || type;
}

function resourceIcon(kind, label) {
  return `<img class="game-icon" src="${ICON_FILES[kind]}" alt="${label}" title="${label}">`;
}

function formatGameText(text) {
  return String(text || "")
    .replace(/\bGame End\b/gi, resourceIcon("endgame", "Game End"))
    .replace(/\bOngoing\b/gi, resourceIcon("ongoing", "Ongoing"))
    .replace(/\bInstant\b/gi, resourceIcon("instant", "Instant"))
    .replace(/\bActivation\b/gi, resourceIcon("activation", "Activation"))
    .replace(/\bStrength\b/gi, resourceIcon("Strength", "Strength"))
    .replace(/\b(?:Dexterity|Ruse)\b/gi, resourceIcon("Dexterity", "Dexterity"))
    .replace(/\bIntelligence\b/gi, resourceIcon("Intelligence", "Intelligence"))
    .replace(/\bCharm\b/gi, resourceIcon("Charm", "Charm"))
    .replace(/\bVP\b/g, resourceIcon("vp", "VP"))
    .replace(/\bXP\b/g, resourceIcon("xp", "XP"))
    .replace(/\b(?:Coins?|coins?)\b/g, resourceIcon("coins", "Coins"))
    .replace(/\bGoals?\b/gi, "Quest");
}

el.newGameBtn.addEventListener("click", newGame);
el.resolveActionBtn.addEventListener("click", activateActionStep);
el.endRoundBtn.addEventListener("click", endRound);
el.scoreBtn.addEventListener("click", showScore);
el.closeCatalogBtn.addEventListener("click", closeCatalog);

newGame();
