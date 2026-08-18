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

bot.on('login', () => console.log('✅ Manus_Farmer prêt !'));

bot.on('spawn', async () => {
    mcData = mcDataLoader(bot.version);
    const movements = new Movements(bot, mcData);
    
    // Configuration mouvement
    movements.allowSprinting = true;
    movements.allowParkour = true;
    movements.canDig = true;
    bot.pathfinder.setMovements(movements);

    bot.chat("Système d'auto-saut activé. Je ne resterai plus jamais bloqué !");
    mainLoop();
});

// AUTO-SAUT RÉFLEXE (Vérifié à chaque tick physique)
bot.on('physicTick', () => {
    if (!bot.entity.onGround) return;

    // Calculer la direction du regard pour voir ce qu'il y a devant
    const yaw = bot.entity.yaw;
    const dx = -Math.sin(yaw);
    const dz = -Math.cos(yaw);
    
    // Vérifier le bloc juste devant les pieds
    const blockInFront = bot.blockAt(bot.entity.position.offset(dx * 0.6, 0, dz * 0.6));
    const blockHeadLevel = bot.blockAt(bot.entity.position.offset(dx * 0.6, 1, dz * 0.6));

    if (blockInFront && blockInFront.name !== 'air' && blockInFront.name !== 'water') {
        // Si un bloc est devant et qu'il y a de l'air au dessus (ou un bloc cassable)
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 100);
        
        // Si c'est un mur de 2 blocs de haut, on essaie de casser le bloc du haut
        if (blockHeadLevel && blockHeadLevel.name !== 'air') {
            const axe = bot.inventory.items().find(i => i.name.includes('_axe'));
            if (axe) bot.equip(axe, 'hand');
            bot.dig(blockHeadLevel).catch(() => {});
        }
    }
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
                bot.chat("C'est fait !");
            } catch (err) {}
        }
        isBusy = false;
    }
});

async function mainLoop() {
    if (isBusy) return;
    try {
        const logBlockIds = mcData.blocksArray.filter(b => b.name.includes('_log')).map(b => b.id);
        const tree = bot.findBlock({ matching: logBlockIds, maxDistance: 48 });

        if (tree) {
            console.log(`Cible : ${tree.name}`);
            await bot.pathfinder.goto(new goals.GoalGetToBlock(tree.position.x, tree.position.y, tree.position.z));
            const axe = bot.inventory.items().find(i => i.name.includes('_axe'));
            if (axe) await bot.equip(axe, 'hand');
            await bot.collectBlock.collect(tree);
        } else {
            const rx = bot.entity.position.x + (Math.random() * 80 - 40);
            const rz = bot.entity.position.z + (Math.random() * 80 - 40);
            await bot.pathfinder.goto(new goals.GoalXZ(rx, rz));
        }
        setTimeout(mainLoop, 500);
    } catch (e) {
        setTimeout(mainLoop, 2000);
    }
}

bot.on('error', (err) => console.log('❌ Erreur:', err));
bot.on('kicked', (reason) => console.log('❌ Kické:', reason));
