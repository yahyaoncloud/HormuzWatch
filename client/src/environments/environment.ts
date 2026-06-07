export const environment = (env: 'dev' | 'prod') => {
    if (env === 'dev') {
        return {
            production: false,
            wss_url: 'ws://localhost:8080',
            api_url: 'http://localhost:8080',
        };
    }
    return {
        production: true,
        wss_url: 'wss://ws.hormuzwatch.aburcloud.com',
        api_url: 'https://hormuzwatch.aburcloud.com',
    };
}

