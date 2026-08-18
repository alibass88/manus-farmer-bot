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

bot.on('spawn', async () => {
    mcData = mcDataLoader(bot.version);
    const movements = new Movements(bot, mcData);
    movements.allowSprinting = true;
    movements.allowParkour = true;
    bot.pathfinder.setMovements(movements);
    protectLoop();
});

// AUTO-SAUT RÉFLEXE POUR LE GARDIEN
bot.on('physicTick', () => {
    if (!bot.entity.onGround) return;
    const yaw = bot.entity.yaw;
    const dx = -Math.sin(yaw);
    const dz = -Math.cos(yaw);
    const blockInFront = bot.blockAt(bot.entity.position.offset(dx * 0.6, 0, dz * 0.6));
    if (blockInFront && blockInFront.name !== 'air' && blockInFront.name !== 'water') {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 100);
    }
});

async function protectLoop() {
    try {
        const farmer = bot.players[farmerName]?.entity;
        const threat = bot.nearestEntity(entity => {
            const isHostile = entity.type === 'mob' && 
                             ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'slime'].includes(entity.mobType?.toLowerCase());
            const distToFarmer = farmer ? entity.position.distanceTo(farmer.position) : 999;
            return isHostile && (distToFarmer < 15 || bot.entity.position.distanceTo(entity.position) < 10);
        });

        if (threat) {
            bot.pvp.attack(threat);
        } else if (farmer) {
            if (bot.entity.position.distanceTo(farmer.position) > 5) {
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
