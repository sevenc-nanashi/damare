const bunyan = require('bunyan');
const { exec } = require('child_process');
const Encoding = require('encoding-japanese');
const packageJson = require('./package.json');
const fs = require('fs');
const { exit } = require('process');
const Discord = require('discord.js');
const chokidar = require('chokidar');
const yaml = require("js-yaml");

const log = bunyan.createLogger({name: 'damare', level: 'debug'});

log.info("Damare reading bot v" + packageJson.version);

log.info('Checking softalk...');

if (fs.existsSync('./softalk/SofTalk.exe')) {
    log.info('Softalk found.');
} else {
    log.error('Softalk not found. Can\'t Start damare. Please put softalk to current dir. If you want more info, visit https://github.com/Chipsnet/damare.');
    exit()
}

try {
    config = yaml.load(
        fs.readFileSync("./config.yml", "utf-8")
    );
} catch (error) {
    log.fatal('Config file not found. Please make config file. More information: https://github.com/Chipsnet/warbot-js.')
    log.error(error);
    process.exit(0)
}

const toString = (bytes) => {
    return Encoding.convert(bytes, {
      from: 'SJIS',
      to: 'UNICODE',
      type: 'string',
    });
};

const client = new Discord.Client();
const broadcast = client.voice.createBroadcast();
let connection = null;
let readMessages = [];
let canReadMessage = true;
let readChannel = null;
let prefix = config.prefix;

client.on('ready', () => {
    log.info('Discord login success! Logged in as : ' + client.user.tag);
});

client.on('message', async message => {
    if (!message.guild) return;

    if (message.guild.id != config.useguild) return;

    if (message.content === `${prefix}talk`) {
        if (message.member.voice.channel) {
            readChannel = message.channel.id
            connection = await message.member.voice.channel.join();
            connection.play(broadcast, {volume: 0.3});
            message.reply('✨ VCに接続しました！');
        }
    }

    if (message.content === `${prefix}stop`) {
        if (connection === null) {
            message.reply('⚠ ボイスチャンネルに接続されていないので、切断ができませんでした。');
        } else {
            connection.disconnect();
            message.reply('👍 無事切断できました')
            connection = null;
            readChannel = null;
        }
    }

    if (message.content === `${prefix}reset`) {
        readMessages = [];
        canReadMessage = true;
        message.reply('💥 読み上げ状態をリセットしました');
    }

    if (message.content === `${prefix}help`) {
        message.reply('```\n'+
            'Damare 読み上げBot コマンドリスト\n' +
            'Author:巳波みなと Version:v' + packageJson.version + '\n' +
            'https://github.com/Chipsnet/damare\n\n' +
            `${prefix}talk : 現在のテキストチャンネルを現在入っているVCで読み上げます。\n` +
            `${prefix}stop : 再生を停止してVCから切断します。\n` +
            `${prefix}reset : 読み上げ状態や内部のキューをリセットします。問題が発生した場合にのみ使用してください。\n` +
            `${prefix}help : ヘルプを表示します。\n` +
            '```'
        );
    }

    if (message.channel.id === readChannel && message.content != ']talk' && message.author.bot == false && message.content.startsWith(prefix) == false) {
        if (message.content.startsWith('http')) {
            message.content = "ユーアールエル"
        } 

        if (canReadMessage) {
            log.debug(`Message recived. canReadMessage: ${canReadMessage}`)
            readMessages.push(message.content);
            softalk();
        } else {
            log.debug(`Message recived. canReadMessage: ${canReadMessage}`)
            readMessages.push(message.content);
        }
    }
});

async function softalk() {
    canReadMessage = false;
    let mes = readMessages.shift();

    mes = mes.split('|').join('')
    mes = mes.split(';').join('')
    mes = mes.split('&').join('')
    mes = mes.split('-').join('')
    mes = mes.split('\\').join('')
    mes = mes.split('/').join('')
    mes = mes.split(':').join('')
    mes = mes.split('<').join('')
    mes = mes.split('>').join('')
    mes = mes.split('$').join('')
    mes = mes.split('*').join('')
    mes = mes.split('?').join('')
    mes = mes.split('{').join('')
    mes = mes.split('}').join('')
    mes = mes.split('[').join('')
    mes = mes.split(']').join('')
    mes = mes.split('!').join('')
    mes = mes.split('`').join('')


    log.debug('softalk talk message: ' + mes);
    log.debug('in queue' + readMessages);

    exec('"./softalk/SofTalk.exe" /NM:女性01 /R:' + __dirname + '\\voice.wav /T:0 /X:1 /V:100 /W:' + mes, { encoding: 'Shift_JIS' }, (error, stdout, stderr) => {
        if (error) {
            log.error(toString(stderr));
            if (readMessages.length === 0) {
                canReadMessage = true;
            } else {
                softalk();
            }
            return;
        }
    })
}

chokidar.watch("./voice.wav").on('change', () => {
    let dispatcher = broadcast.play('./voice.wav');

    dispatcher.on('finish', () => {
        if (readMessages.length === 0) {
            canReadMessage = true;
        } else {
            softalk();
        }
    })
})


client.login(config.token);
log.info('Trying Login to discord...');