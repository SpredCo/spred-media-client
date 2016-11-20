const SpredClient = require('./models/spred-client');

// window.Charpy = {
// 	User: User
// }
const token = "pKbJtjKBDqnC3HBT1sYxw0vcI0pEG6MllnOMLHsRtCfWofkxaXQpEZoMcMtourrUKMCRo5YSOf7GbhAgwvVNCz8VhpYUMRDkjJJGNpvxu62xM67gIuJKye43WuQ1uQ3A24qWwsecPkKnuAuIB8lJZ9LmYJr0w1OGIAogDOMLJAiH4wQdrFn3dezwDCcpAsYBXEVnGkLBlkJRrxqfqXwCb7bkbnJ9FtKFkbKAqHOJjIDOAVjrV95bnCNOM69a1cTx"
const client = new SpredClient(token);

client.connect();
