import mineflayer from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
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

let mcData;
let isGiving = false;

bot.on('login', () => console.log('✅ Manus_Farmer connecté !'));

bot.on('spawn', async () => {
    console.log('🚀 Manus_Farmer est dans le monde.');
    mcData = mcDataLoader(bot.version);
    
    const movements = new Movements(bot, mcData);
    movements.allowSprinting = true;
    movements.allowParkour = true;
    movements.canDig = true; // Permet de casser des blocs pour avancer si besoin
    bot.pathfinder.setMovements(movements);

    bot.chat("Bonjour ! Je suis Manus_Farmer. Je commence la récolte de bois forcée.");
    farmLoop();
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;
    if (message.toLowerCase() === 'donne') {
        isGiving = true;
        bot.chat(`J'arrive ${username} !`);
        const player = bot.players[username];
        if (player && player.entity) {
            try {
                await bot.pathfinder.goto(new goals.GoalFollow(player.entity, 2));
                const logs = bot.inventory.items().filter(item => item.name.includes('log'));
                for (const item of logs) await bot.tossStack(item);
                bot.chat("Voilà ton bois !");
            } catch (err) {}
        }
        isGiving = false;
        farmLoop();
    }
});

async function farmLoop() {
    if (isGiving) return;

    try {
        // Trouver l'arbre le plus proche
        const logBlockIds = mcData.blocksArray.filter(b => b.name.includes('_log')).map(b => b.id);
        const tree = bot.findBlock({
            matching: logBlockIds,
            maxDistance: 64
        });

        if (tree) {
            console.log(`Cible trouvée : ${tree.name} en ${tree.position}`);
            
            // S'approcher du bloc
            await bot.pathfinder.goto(new goals.GoalBlock(tree.position.x, tree.position.y, tree.position.z));
            
            // Casser le bloc
            if (bot.canDig(tree)) {
                bot.chat(`Je coupe : ${tree.name}`);
                await bot.dig(tree);
            }
        } else {
            // Se déplacer pour chercher ailleurs
            bot.chat("Je cherche des arbres plus loin...");
            const rx = bot.entity.position.x + (Math.random() * 60 - 30);
            const rz = bot.entity.position.z + (Math.random() * 60 - 30);
            await bot.pathfinder.goto(new goals.GoalXZ(rx, rz));
        }
        
        setTimeout(farmLoop, 500);
    } catch (e) {
        console.log('Erreur dans farmLoop, relance...');
        setTimeout(farmLoop, 2000);
    }
}

// Auto-jump si bloqué
bot.on('move', () => {
    const block = bot.blockAt(bot.entity.position.offset(bot.entity.velocity.x > 0 ? 1 : -1, 0, bot.entity.velocity.z > 0 ? 1 : -1));
    if (block && block.name !== 'air' && bot.entity.onGround) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 100);
    }
});

bot.on('error', (err) => console.log('❌ Erreur Farmer:', err));
bot.on('kicked', (reason) => console.log('❌ Kické Farmer:', reason));
