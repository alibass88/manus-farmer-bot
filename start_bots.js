import { spawn } from 'child_process';

function startBot(filename) {
    const bot = spawn('node', [filename], { stdio: 'inherit' });
    bot.on('close', (code) => {
        console.log(`Le bot ${filename} s'est arrêté (code ${code}). Relance...`);
        setTimeout(() => startBot(filename), 5000);
    });
}

console.log("🚀 Démarrage de l'équipe de bots Manus...");
startBot('farmer_bot.js');
startBot('guardian_bot.js');
