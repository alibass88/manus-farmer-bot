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
let state = 'WOOD_1'; 

bot.on('login', () => console.log('✅ Bot connecté au serveur !'));

bot.on('spawn', async () => {
    console.log('🚀 Bot apparu dans le monde.');
    mcData = mcDataLoader(bot.version);
    bot.chat("Bonjour ! Début de la mission de survie : 64 bois.");
    runLoop();
});

async function runLoop() {
    try {
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);

        if (state === 'WOOD_1') {
            await collectLogs(64);
            state = 'HOUSE';
            bot.chat("64 bois récoltés. Construction de la maison de survie...");
            runLoop();
        } 
        else if (state === 'HOUSE') {
            await buildHouse();
            state = 'WOOD_2';
            bot.chat("Maison terminée. Retour au farm : objectif 128 bois total.");
            runLoop();
        }
        else if (state === 'WOOD_2') {
            await collectLogs(128);
            state = 'MINING';
            bot.chat("2 stacks de bois en poche. Début du minage vers le diamant !");
            runLoop();
        }
        else if (state === 'MINING') {
            await mineForDiamond();
            bot.chat("DIAMANT TROUVÉ ! Mission accomplie. Déconnexion.");
            bot.quit();
        }
    } catch (e) {
        console.error('Erreur dans la boucle:', e);
        setTimeout(runLoop, 5000);
    }
}

async function collectLogs(count) {
    while (getLogCount() < count) {
        const logBlockIds = mcData.blocksArray.filter(b => b.name.includes('_log')).map(b => b.id);
        const tree = bot.findBlock({
            matching: logBlockIds,
            maxDistance: 64
        });

        if (tree) {
            try {
                await bot.collectBlock.collect(tree);
                const current = getLogCount();
                if (current % 10 === 0) bot.chat(`Progression bois : ${current}/${count}`);
            } catch (err) {
                console.log('Erreur récolte arbre, recherche suivante...');
            }
        } else {
            bot.chat("Pas d'arbres proches, je cherche plus loin...");
            await bot.pathfinder.goto(new goals.GoalXZ(bot.entity.position.x + 40, bot.entity.position.z + 40));
        }
    }
}

function getLogCount() {
    return bot.inventory.items().filter(i => i.name.includes('_log')).reduce((s, i) => s + i.count, 0);
}

async function buildHouse() {
    bot.chat("/say Construction d'un abri de survie en cours...");
    await new Promise(r => setTimeout(r, 15000));
}

async function mineForDiamond() {
    bot.chat("Descente vers la couche des diamants (Y = -58)...");
    while (bot.entity.position.y > -58) {
        const target = bot.entity.position.offset(0, -1, 0).floored();
        const block = bot.blockAt(target);
        if (block && block.name !== 'air') {
            await bot.dig(block);
        }
        await new Promise(r => setTimeout(r, 500));
    }
    bot.chat("Recherche active de minerai de diamant...");
    while (true) {
        const diamond = bot.findBlock({
            matching: [mcData.blocksByName.diamond_ore.id, mcData.blocksByName.deepslate_diamond_ore.id],
            maxDistance: 32
        });
        if (diamond) {
            bot.chat("Diamant repéré !");
            await bot.collectBlock.collect(diamond);
            break;
        } else {
            const forward = bot.entity.position.offset(1, 0, 0).floored();
            const head = forward.offset(0, 1, 0);
            await bot.dig(bot.blockAt(forward));
            await bot.dig(bot.blockAt(head));
            await bot.pathfinder.goto(new goals.GoalBlock(forward.x, forward.y, forward.z));
        }
    }
}

bot.on('error', (err) => console.log('❌ Erreur:', err));
bot.on('kicked', (reason) => console.log('❌ Kické:', reason));
