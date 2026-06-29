var helper = require("node-red-node-test-helper");
var sparqlQueryNode = require("../sparql/sparql-query.js");
var sparqlEndpointNode = require("../sparql/sparql-endpoint.js");

helper.init(require.resolve("node-red"));

describe("sparql-query Node", function () {
    afterEach(function () {
        helper.unload();
    });

    it("should be loaded", function (done) {
        var flow = [{ id: "n1", type: "sparql-query", name: "test sparql" }];
        helper.load([sparqlQueryNode, sparqlEndpointNode], flow, function () {
            var n1 = helper.getNode("n1");
            n1.should.have.property("name", "test sparql");
            done();
        });
    });

    it("should report error when no query is provided", function (done) {
        var flow = [
            { id: "n1", type: "sparql-query", name: "test sparql", endpoint: "e1", wires: [["n2"]] },
            { id: "e1", type: "sparql-endpoint", sources: "https://dbpedia.org/sparql", sourceType: "sparql" },
            { id: "n2", type: "helper" },
        ];
        helper.load([sparqlQueryNode, sparqlEndpointNode], flow, function () {
            var n1 = helper.getNode("n1");
            n1.receive({ payload: "" });
            // Should produce an error, not crash
            setTimeout(done, 500);
        });
    });

    it("should execute a SELECT query against a SPARQL endpoint", function (done) {
        this.timeout(30000);
        var flow = [
            { id: "n1", type: "sparql-query", name: "dbpedia", endpoint: "e1", wires: [["n2"]] },
            { id: "e1", type: "sparql-endpoint", sources: "https://dbpedia.org/sparql", sourceType: "sparql" },
            { id: "n2", type: "helper" },
        ];
        helper.load([sparqlQueryNode, sparqlEndpointNode], flow, function () {
            var n2 = helper.getNode("n2");
            var n1 = helper.getNode("n1");
            n2.on("input", function (msg) {
                msg.should.have.property("payload");
                msg.payload.should.be.an.Array();
                msg.should.have.property("queryType", "SELECT");
                done();
            });
            n1.receive({ query: "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 1" });
        });
    });
});
