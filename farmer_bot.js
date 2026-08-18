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
let stuckTicks = 0;

bot.on('login', () => console.log('✅ Manus_Farmer (Version Pro) connecté !'));

bot.on('spawn', async () => {
    mcData = mcDataLoader(bot.version);
    const movements = new Movements(bot, mcData);
    
    // Configuration mouvement avancée (Style Mindcraft)
    movements.allowSprinting = true;
    movements.allowParkour = true;
    movements.canDig = true;
    movements.liquidCost = 3;
    movements.climbCost = 3;
    bot.pathfinder.setMovements(movements);

    bot.chat("Système de navigation Pro activé. Je ne resterai plus bloqué !");
    mainLoop();
});

// DÉTECTION DE BLOCAGE PAR VITESSE (ULTRA ROBUSTE)
bot.on('physicTick', () => {
    if (!bot.entity || !bot.entity.onGround) return;

    // Si le bot a un objectif de mouvement mais ne bouge pas
    if (bot.pathfinder.isMoving()) {
        if (lastPos && bot.entity.position.distanceTo(lastPos) < 0.02) {
            stuckTicks++;
        } else {
            stuckTicks = 0;
        }

        // Si bloqué pendant plus de 10 ticks (0.5s)
        if (stuckTicks > 10) {
            // Action de dégagement immédiate
            bot.setControlState('jump', true);
            bot.setControlState('forward', true);
            
            // Strafe aléatoire pour contourner
            const dir = Math.random() > 0.5 ? 'left' : 'right';
            bot.setControlState(dir, true);
            
            setTimeout(() => {
                bot.setControlState('jump', false);
                bot.setControlState(dir, false);
            }, 400);
            
            stuckTicks = 0;
        }
    }
    lastPos = bot.entity.position.clone();
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;
    if (message.toLowerCase() === 'donne') {
        isBusy = true;
        bot.chat(`J'arrive ${username} !`);
        const player = bot.players[username];
        if (player && player.entity) {
            try {
                await bot.pathfinder.goto(new goals.GoalFollow(player.entity, 2));
                for (const item of bot.inventory.items()) await bot.tossStack(item);
                bot.chat("Mission accomplie !");
            } catch (err) {}
        }
        isBusy = false;
        mainLoop();
    }
});

async function mainLoop() {
    if (isBusy) return;
    try {
        const logBlockIds = mcData.blocksArray.filter(b => b.name.includes('_log')).map(b => b.id);
        const tree = bot.findBlock({ matching: logBlockIds, maxDistance: 48 });

        if (tree) {
            console.log(`Cible : ${tree.name} en ${tree.position}`);
            // GoalGetToBlock est plus robuste que GoalBlock
            await bot.pathfinder.goto(new goals.GoalGetToBlock(tree.position.x, tree.position.y, tree.position.z));
            
            // Équiper hache
            const axe = bot.inventory.items().find(i => i.name.includes('_axe'));
            if (axe) await bot.equip(axe, 'hand');

            await bot.collectBlock.collect(tree);
        } else {
            // Exploration
            const rx = bot.entity.position.x + (Math.random() * 60 - 30);
            const rz = bot.entity.position.z + (Math.random() * 60 - 30);
            await bot.pathfinder.goto(new goals.GoalXZ(rx, rz));
        }
        setTimeout(mainLoop, 400);
    } catch (e) {
        setTimeout(mainLoop, 1500);
    }
}

bot.on('error', (err) => console.log('❌ Erreur:', err));
bot.on('kicked', (reason) => console.log('❌ Kické:', reason));
