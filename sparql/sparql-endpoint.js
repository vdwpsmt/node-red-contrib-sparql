module.exports = function (RED) {
    function SparqlEndpointNode(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name;
        this.sources = config.sources || "";
        this.sourceType = config.sourceType || "auto";
    }

    RED.nodes.registerType("sparql-endpoint", SparqlEndpointNode);
};
