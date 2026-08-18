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
let isGiving = false;

bot.on('login', () => console.log('✅ Bot connecté au serveur !'));

bot.on('spawn', async () => {
    console.log('🚀 Bot apparu dans le monde.');
    mcData = mcDataLoader(bot.version);
    bot.chat("Bonjour ! Je commence à farmer du bois. Dites 'donne' pour que je vous apporte ma récolte.");
    farmLoop();
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    if (message.toLowerCase() === 'donne') {
        isGiving = true;
        bot.chat(`J'arrive ${username}, je t'apporte le bois !`);
        
        const player = bot.players[username];
        if (player && player.entity) {
            try {
                const movements = new Movements(bot, mcData);
                bot.pathfinder.setMovements(movements);
                await bot.pathfinder.goto(new goals.GoalFollow(player.entity, 2));
                
                // Jeter tout le bois
                const logs = bot.inventory.items().filter(item => item.name.includes('log'));
                for (const item of logs) {
                    await bot.tossStack(item);
                }
                bot.chat("Voilà ton bois ! Je retourne au travail.");
            } catch (err) {
                bot.chat("Désolé, je n'arrive pas à t'atteindre.");
            }
        } else {
            bot.chat("Je ne vous vois pas ! Approchez-vous.");
        }
        isGiving = false;
        farmLoop();
    }
});

async function farmLoop() {
    if (isGiving) return;

    try {
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);

        const logBlockIds = mcData.blocksArray.filter(b => b.name.includes('_log')).map(b => b.id);
        const tree = bot.findBlock({
            matching: logBlockIds,
            maxDistance: 64
        });

        if (tree) {
            try {
                await bot.collectBlock.collect(tree);
            } catch (err) {
                console.log('Erreur récolte arbre, recherche suivante...');
            }
        } else {
            // Se déplacer pour trouver de nouveaux arbres
            await bot.pathfinder.goto(new goals.GoalXZ(bot.entity.position.x + Math.random() * 40 - 20, bot.entity.position.z + Math.random() * 40 - 20));
        }
        
        // Continuer le farm
        setTimeout(farmLoop, 1000);
    } catch (e) {
        console.error('Erreur dans la boucle de farm:', e);
        setTimeout(farmLoop, 5000);
    }
}

bot.on('error', (err) => console.log('❌ Erreur:', err));
bot.on('kicked', (reason) => console.log('❌ Kické:', reason));
