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
    mcData = mcDataLoader(bot.version);
    const movements = new Movements(bot, mcData);
    movements.allowSprinting = true;
    movements.allowParkour = true;
    bot.pathfinder.setMovements(movements);

    bot.chat("🛡️ Manus_Guardian activé. Portée de protection : 32 blocs.");
    protectLoop();
});

async function protectLoop() {
    try {
        const farmer = bot.players[farmerName]?.entity;
        
        // 1. Chercher des menaces hostiles (Zombies, Creepers, Squelettes, etc.)
        const threat = bot.nearestEntity(entity => {
            const isHostile = entity.type === 'mob' && 
                             ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'slime'].includes(entity.mobType?.toLowerCase());
            
            const distToFarmer = farmer ? entity.position.distanceTo(farmer.position) : 999;
            const distToMe = bot.entity.position.distanceTo(entity.position);
            
            return isHostile && (distToFarmer < 15 || distToMe < 10);
        });

        if (threat) {
            bot.chat(`⚠️ Alerte ! Je neutralise un ${threat.mobType} !`);
            bot.pvp.attack(threat);
        } else if (farmer) {
            // Suivre le fermier s'il n'y a pas de danger
            const distance = bot.entity.position.distanceTo(farmer.position);
            if (distance > 5) {
                await bot.pathfinder.goto(new goals.GoalFollow(farmer, 3));
            }
        }

        setTimeout(protectLoop, 1000);
    } catch (e) {
        setTimeout(protectLoop, 2000);
    }
}

bot.on('error', (err) => console.log('❌ Erreur Guardian:', err));
bot.on('kicked', (reason) => console.log('❌ Kické Guardian:', reason));
