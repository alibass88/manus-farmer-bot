import mineflayer from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
import pvpPlugin from 'mineflayer-pvp';
import mcDataLoader from 'minecraft-data';

const { pathfinder, Movements, goals } = pathfinderPkg;

const host = 'mebot279.mcsh.io';
const port = 25565;
const username = 'Manus_Guardian';

const bot = mineflayer.createBot({
    host: host,
    port: port,
    username: username,
    version: '1.21.1',
    auth: 'offline'
});

bot.loadPlugin(pathfinder);
bot.loadPlugin(pvpPlugin.plugin);

let mcData;
let farmerName = 'Manus_Farmer';

bot.on('login', () => console.log('🛡️ Manus_Guardian connecté !'));

bot.on('spawn', async () => {
    console.log('🚀 Manus_Guardian est dans le monde.');
    mcData = mcDataLoader(bot.version);
    
    const movements = new Movements(bot, mcData);
    movements.allowSprinting = true;
    movements.allowParkour = true;
    bot.pathfinder.setMovements(movements);

    bot.chat("🛡️ Je suis Manus_Guardian. Ma mission est de protéger Manus_Farmer des monstres !");
    protectLoop();
});

async function protectLoop() {
    try {
        // 1. Chercher le fermier pour le suivre de près
        const farmer = bot.players[farmerName]?.entity;
        
        if (farmer) {
            // 2. Chercher un monstre hostile proche
            const mob = bot.nearestEntity(entity => {
                return entity.type === 'mob' && 
                       entity.mobType !== 'ArmorStand' && 
                       bot.entity.position.distanceTo(entity.position) < 16;
            });

            if (mob) {
                bot.chat("⚠️ Monstre détecté près du fermier ! Attaque en cours !");
                bot.pvp.attack(mob);
            } else {
                // Suivre le fermier à 3 blocs de distance
                const distance = bot.entity.position.distanceTo(farmer.position);
                if (distance > 4) {
                    await bot.pathfinder.goto(new goals.GoalFollow(farmer, 3));
                }
            }
        } else {
            // Si le fermier n'est pas visible, chercher un joueur ou attendre
            // console.log("Fermier non trouvé, attente...");
        }

        setTimeout(protectLoop, 1000);
    } catch (e) {
        console.error('Erreur protectLoop:', e);
        setTimeout(protectLoop, 3000);
    }
}

bot.on('error', (err) => console.log('❌ Erreur Guardian:', err));
bot.on('kicked', (reason) => console.log('❌ Kické Guardian:', reason));
