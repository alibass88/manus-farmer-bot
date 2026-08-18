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

bot.on('login', () => console.log('✅ Manus_Farmer connecté !'));

bot.on('spawn', async () => {
    console.log('🚀 Manus_Farmer est dans le monde.');
    mcData = mcDataLoader(bot.version);
    
    // Configuration des mouvements pour sauter et franchir les obstacles
    const movements = new Movements(bot, mcData);
    movements.allowSprinting = true;
    movements.allowParkour = true;
    movements.canDig = false; // Ne casse pas le sol pour avancer, contourne ou saute
    bot.pathfinder.setMovements(movements);

    bot.chat("Bonjour ! Je suis Manus_Farmer. Je farme du bois. Dites 'donne' pour récupérer ma récolte.");
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
                await bot.pathfinder.goto(new goals.GoalFollow(player.entity, 2));
                const logs = bot.inventory.items().filter(item => item.name.includes('log'));
                for (const item of logs) {
                    await bot.tossStack(item);
                }
                bot.chat("Voilà ton bois ! Je retourne au travail.");
            } catch (err) {
                bot.chat("Oups, je n'ai pas pu t'atteindre.");
            }
        }
        isGiving = false;
        farmLoop();
    }
});

async function farmLoop() {
    if (isGiving) return;

    try {
        const logBlockIds = mcData.blocksArray.filter(b => b.name.includes('_log')).map(b => b.id);
        const tree = bot.findBlock({
            matching: logBlockIds,
            maxDistance: 64
        });

        if (tree) {
            try {
                await bot.collectBlock.collect(tree);
            } catch (err) {
                console.log('Erreur de récolte, tentative suivante...');
            }
        } else {
            // Se déplacer intelligemment en évitant les obstacles
            const randomX = bot.entity.position.x + Math.floor(Math.random() * 50 - 25);
            const randomZ = bot.entity.position.z + Math.floor(Math.random() * 50 - 25);
            await bot.pathfinder.goto(new goals.GoalXZ(randomX, randomZ));
        }
        
        setTimeout(farmLoop, 1500);
    } catch (e) {
        console.error('Erreur farmLoop:', e);
        setTimeout(farmLoop, 5000);
    }
}

bot.on('error', (err) => console.log('❌ Erreur:', err));
bot.on('kicked', (reason) => console.log('❌ Kické:', reason));
