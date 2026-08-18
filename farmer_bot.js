import mineflayer from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
import { plugin as collectBlock } from 'mineflayer-collectblock';
import mcDataLoader from 'minecraft-data';

const { pathfinder, Movements, goals } = pathfinderPkg;

const host = 'mebot279.mcsh.io';
const port = 25565;
const username = 'Manus_Farmer';

const bot = mineflayer.createBot({
    host: host,
    port: port,
    username: username,
    version: '1.21.1',
    auth: 'offline'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(collectBlock);

let mcData;
let isBusy = false;
let lastPos = null;
let stuckCount = 0;

bot.on('login', () => console.log('✅ Manus_Farmer Intelligence activée !'));

bot.on('spawn', async () => {
    mcData = mcDataLoader(bot.version);
    const movements = new Movements(bot, mcData);
    
    // Intelligence de mouvement
    movements.allowSprinting = true;
    movements.allowParkour = true;
    movements.canDig = true; 
    movements.scafoldingBlocks = [mcData.blocksByName.dirt.id, mcData.blocksByName.cobblestone.id];
    bot.pathfinder.setMovements(movements);

    bot.chat("Intelligence de survie initialisée. Je commence l'optimisation des ressources.");
    mainLoop();
});

// Gestion de la commande 'donne'
bot.on('chat', async (username, message) => {
    if (username === bot.username) return;
    if (message.toLowerCase() === 'donne') {
        isBusy = true;
        bot.chat(`J'arrive ${username} ! Je vide mon inventaire.`);
        const player = bot.players[username];
        if (player && player.entity) {
            try {
                await bot.pathfinder.goto(new goals.GoalFollow(player.entity, 2));
                for (const item of bot.inventory.items()) {
                    await bot.tossStack(item);
                }
                bot.chat("Voilà ! Je repars travailler.");
            } catch (err) {}
        }
        isBusy = false;
    }
});

async function mainLoop() {
    if (isBusy) return;

    try {
        // 1. Auto-soin / Faim
        await handleSurvival();

        // 2. Vérification des outils (Hache)
        await checkTools();

        // 3. Récolte de bois intelligente
        await harvestWood();

        // Vérification anti-blocage
        checkStuck();

        setTimeout(mainLoop, 1000);
    } catch (e) {
        console.log('Erreur boucle principale, relance...');
        setTimeout(mainLoop, 3000);
    }
}

async function handleSurvival() {
    // Manger si besoin
    if (bot.food < 16) {
        const food = bot.inventory.items().find(item => mcData.foodsArray.map(f => f.name).includes(item.name));
        if (food) {
            await bot.equip(food, 'hand');
            await bot.consume();
        }
    }
}

async function checkTools() {
    const hasAxe = bot.inventory.items().some(item => item.name.includes('_axe'));
    if (!hasAxe && getLogCount() >= 3) {
        bot.chat("Fabrication d'une hache pour travailler plus vite...");
        // Logique simplifiée de craft (nécessite normalement une table de craft)
        // Pour ce bot, on se concentre sur la récolte brute
    }
}

async function harvestWood() {
    const logBlockIds = mcData.blocksArray.filter(b => b.name.includes('_log')).map(b => b.id);
    const tree = bot.findBlock({
        matching: logBlockIds,
        maxDistance: 64
    });

    if (tree) {
        try {
            // S'approcher intelligemment
            await bot.pathfinder.goto(new goals.GoalGetToBlock(tree.position.x, tree.position.y, tree.position.z));
            
            // Équiper la meilleure hache
            const axe = bot.inventory.items().find(item => item.name.includes('_axe'));
            if (axe) await bot.equip(axe, 'hand');

            // Couper
            bot.chat(`Récolte : ${tree.name}`);
            await bot.collectBlock.collect(tree);
        } catch (err) {
            console.log('Obstacle détecté ou cible inaccessible, je change de cible.');
        }
    } else {
        // Exploration pour trouver de nouveaux arbres
        const rx = bot.entity.position.x + (Math.random() * 100 - 50);
        const rz = bot.entity.position.z + (Math.random() * 100 - 50);
        await bot.pathfinder.goto(new goals.GoalXZ(rx, rz));
    }
}

function getLogCount() {
    return bot.inventory.items().filter(i => i.name.includes('_log')).reduce((s, i) => s + i.count, 0);
}

function checkStuck() {
    if (lastPos && bot.entity.position.distanceTo(lastPos) < 0.5) {
        stuckCount++;
        if (stuckCount > 5) {
            console.log('Bot bloqué ! Tentative de dégagement...');
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 500);
            stuckCount = 0;
        }
    } else {
        stuckCount = 0;
    }
    lastPos = bot.entity.position.clone();
}

bot.on('error', (err) => console.log('❌ Erreur Farmer:', err));
bot.on('kicked', (reason) => console.log('❌ Kické Farmer:', reason));
