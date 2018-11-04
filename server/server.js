const yargs = require('yargs')
    , args = yargs
        .option('dir', {
            alias: [
                'd', 
                'widgetPath'
            ],
            default: './widgets',
            describe: 'path to widgets'
        })
        .option('port', {
            alias: [
                'p'
            ],
            default: 41416,
            type: 'number',
            describe: 'port to run on'
        })
        .option('settings', {
            alias: [
                's',
                'settingsPath'
            ],
            default: './settings'
        })
        .option('loginShell', {
            alias: 'login-shell'
        })
        .help()
        .argv
;

const UebersichtServer = require('./src/app')
    , cors = require('cors-anywhere')
;

const handleError = (err) => {
  console.log(err.message || err);
  throw err;
}

const run = (args) => {
    const { widgetPath, port, settingsPath, loginShell } = args;
    const options = {
        loginShell
    };

    const onListening = () => {
        console.log(`Server started on port ${port}.`);
    }

    server = UebersichtServer(port, widgetPath, settingsPath, options, onListening);

    server.on('close', handleError);
    server.on('error', handleError);

    const corsHost = '127.0.0.1'
        , corsPort = port + 1
    ;

    const corsServer = cors.createServer({
        originWhiteList: [
            `http://${corsHost}:${corsPort}`
        ],
        requireHeader: [
            'origin'
        ],
        removeHeaders: [
            'cookie'
        ]
    });

    const onCorsServerListening = () => {
        console.log(`CORS Anywhere server listening on port ${corsPort}.`);
    };
        
    corsServer.listen(corsPort, corsHost, onCorsServerListening);
}

try {
    run(args);
} catch (err) {
    handleError(err);
}