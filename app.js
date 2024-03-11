const { RestClientV5 } = require('bybit-api');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const TELEGRAM_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID; // Dodaj swój identyfikator czatu

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const client = new RestClientV5({
    testnet: true,
//    testnet: false,
    key: process.env.TKEY,
    secret: process.env.TSECRET,
});

async function main() {
    try {
        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;

            if (chatId.toString() === CHAT_ID) {
                const keyboard = [
                    [{ text: 'Buy BTC 🟩 ' }, { text: 'Sell BTC 🟥 ' }],
                    // Add other buttons as needed
                     [{ text: '/start' }, { text: '/help' }],
                ];

                const options = {
                    reply_markup: JSON.stringify({
                        keyboard: keyboard,
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    }),
                };

                bot.sendMessage(chatId, 'Witaj! Wybierz opcję poniżej z menu:', options);
            } else {
                bot.sendMessage(chatId, 'Przepraszam, ale nie masz uprawnień do korzystania z tego bota.');
            }
        });


        bot.onText(/help/, (msg) => {
            const helpMessage = 'Bot pozwala na wchodzenie na pozycję w parze BTCUSDT z ustawionym TakeProfit okolo 4% ' +
                                'Aby rozpocząć, wybierz odpowiednią opcję z menu głównego (Buy BTC lub Sell BTC). ';
            bot.sendMessage(msg.chat.id, helpMessage);
        });


        bot.onText(/Buy BTC/, async (msg) => {
            const chatId = msg.chat.id;
            if (chatId.toString() === CHAT_ID) {
                await handleTrade(msg, 'Buy');
            } else {
                bot.sendMessage(chatId, 'Przepraszam, nie masz uprawnień do korzystania z tej funkcji.');
            }
        });

        bot.onText(/Sell BTC/, async (msg) => {
            const chatId = msg.chat.id;
            if (chatId.toString() === CHAT_ID) {
                await handleTrade(msg, 'Sell');
            } else {
                bot.sendMessage(chatId, 'Przepraszam, nie masz uprawnień do korzystania z tej funkcji.');
            }
        });

    } catch (error) {
        console.error(error);
    }
}

async function handleTrade(msg, side) {
    try {
        const response = await client.getOrderbook({
            category: 'linear',
            symbol: 'BTCUSDT',
        });

        const cenaPoczatkowa = response.result.a[0][0];
        let cenaP = Number(cenaPoczatkowa);
        cenaP.toFixed(2);

        let wzrostProcentowy = 0.6;
		
		let idx=1;
		let side2 ='';

        let cenaPoZ;
        if (side === 'Buy') {
            cenaPoZ = zwiekszCeneOWzrost(cenaP, wzrostProcentowy);
			side2='⬆ 🟩 '+ side;
        } else if (side === 'Sell') {
            cenaPoZ = zwiekszCeneOSpad(cenaP, wzrostProcentowy);
			idx=2;
		   side2='⬇🟥 '+ side;
        }

        console.log('P: ' + cenaP);
        console.log('T: ' + cenaPoZ);

        const orderResponse = await client.submitOrder({
            category: 'linear',
            symbol: 'BTCUSDT',
            side: side,
            positionIdx:  `${idx}`,
            orderType: 'Limit',
            qty: '0.003',
            price: `${cenaP}`,
            timeInForce: 'GTC',
            takeProfit: `${cenaPoZ}`,
            isLeverage: '0'
        });

        console.log(orderResponse);
        bot.sendMessage(msg.chat.id, `${side2} BTC\nStart: ${cenaP}\nTP: ${cenaPoZ}`);

    } catch (error) {
        console.error(error);
        bot.sendMessage(msg.chat.id, `Wystąpił błąd podczas składania zlecenia: ${error.message}`);
    }
}

bot.on('polling_error', (error) => {
    console.log(`Polling error: ${error}`);
});


function zwiekszCeneOWzrost(cenaP, wzrostP) {
    let wzrost = cenaP * (wzrostP / 100 * wzrostP);
    wzrost = wzrost.toFixed(2);
    const cenaPoZ = cenaP + (wzrost * 2);
    return cenaPoZ.toFixed(2);
}

function zwiekszCeneOSpad(cenaP, wzrostP) {
    let wzrost = cenaP * (wzrostP / 100 * wzrostP);
    wzrost = wzrost.toFixed(2);
    const cenaPoZ = cenaP - (wzrost * 2);
    return cenaPoZ.toFixed(2);
}

main();
