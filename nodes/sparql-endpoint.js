module.exports = function (RED) {
    function SparqlEndpointNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.endpoint = config.endpoint || "";
        this.httpMethod = config.httpMethod || "POST-direct";
        this.credentials = this.credentials || {};
    }

    RED.nodes.registerType("sparql-endpoint", SparqlEndpointNode, {
        credentials: {
            username: { type: "text" },
            password: { type: "password" }
        }
    });
};
