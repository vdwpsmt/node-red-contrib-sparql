const { QueryEngine } = require("@comunica/query-sparql");

module.exports = function (RED) {
    let engine = null;

    function getEngine() {
        if (!engine) {
            engine = new QueryEngine();
        }
        return engine;
    }

    function parseSources(sourcesStr, sourceType) {
        const urls = sourcesStr
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        if (sourceType === "auto") {
            return urls;
        }

        return urls.map((url) => ({ type: sourceType, value: url }));
    }

    function SparqlQueryNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.query = config.query || "";
        this.endpoint = RED.nodes.getNode(config.endpoint);
        this.outputFormat = config.outputFormat || "json";
        this.timeout = parseInt(config.timeout, 10) || 60;

        node.on("input", async function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments); };
            done = done || function (err) { if (err) { node.error(err, msg); } };

            const query = msg.query || msg.payload || node.query;

            if (!query || typeof query !== "string" || query.trim().length === 0) {
                done(new Error("No SPARQL query provided. Set msg.query, msg.payload, or configure in the node."));
                return;
            }

            // Determine sources
            let sources;
            if (msg.sources) {
                sources = Array.isArray(msg.sources) ? msg.sources : parseSources(String(msg.sources), "auto");
            } else if (node.endpoint) {
                sources = parseSources(node.endpoint.sources, node.endpoint.sourceType);
            } else {
                done(new Error("No SPARQL sources configured. Set msg.sources or configure an endpoint."));
                return;
            }

            if (sources.length === 0) {
                done(new Error("No valid sources provided."));
                return;
            }

            node.status({ fill: "blue", shape: "dot", text: "querying..." });

            try {
                const queryEngine = getEngine();
                const context = {
                    sources: sources,
                    queryTimeout: node.timeout * 1000,
                };

                // Detect query type from the query string
                const queryType = detectQueryType(query);

                let result;

                switch (queryType) {
                    case "SELECT": {
                        const bindingsStream = await queryEngine.queryBindings(query, context);
                        const bindings = await bindingsStream.toArray();
                        result = bindings.map((binding) => {
                            const obj = {};
                            for (const [key, value] of binding) {
                                obj[key.value] = {
                                    value: value.value,
                                    type: value.termType,
                                    datatype: value.datatype ? value.datatype.value : undefined,
                                    language: value.language || undefined,
                                };
                            }
                            return obj;
                        });
                        break;
                    }

                    case "CONSTRUCT":
                    case "DESCRIBE": {
                        const quadStream = await queryEngine.queryQuads(query, context);
                        const quads = await quadStream.toArray();
                        result = quads.map((quad) => ({
                            subject: { value: quad.subject.value, type: quad.subject.termType },
                            predicate: { value: quad.predicate.value, type: quad.predicate.termType },
                            object: { value: quad.object.value, type: quad.object.termType },
                            graph: { value: quad.graph.value, type: quad.graph.termType },
                        }));
                        break;
                    }

                    case "ASK": {
                        result = await queryEngine.queryAsk(query, context);
                        break;
                    }

                    case "UPDATE": {
                        await queryEngine.queryVoid(query, context);
                        result = { success: true };
                        break;
                    }

                    default: {
                        // Fallback: try as SELECT
                        const bindingsStream = await queryEngine.queryBindings(query, context);
                        const bindings = await bindingsStream.toArray();
                        result = bindings.map((binding) => {
                            const obj = {};
                            for (const [key, value] of binding) {
                                obj[key.value] = {
                                    value: value.value,
                                    type: value.termType,
                                };
                            }
                            return obj;
                        });
                    }
                }

                msg.payload = result;
                msg.queryType = queryType;
                msg.sparqlQuery = query;

                node.status({ fill: "green", shape: "dot", text: `${queryType} - ${Array.isArray(result) ? result.length + " results" : "done"}` });
                send(msg);
                done();
            } catch (err) {
                node.status({ fill: "red", shape: "ring", text: "error" });
                done(err);
            }
        });

        node.on("close", function (done) {
            node.status({});
            done();
        });
    }

    function detectQueryType(query) {
        const normalized = query.replace(/\#[^\n]*/g, "").trim().toUpperCase();

        if (/^\s*(PREFIX\s+[^\n]*\n\s*)*SELECT\b/i.test(query)) return "SELECT";
        if (/^\s*(PREFIX\s+[^\n]*\n\s*)*CONSTRUCT\b/i.test(query)) return "CONSTRUCT";
        if (/^\s*(PREFIX\s+[^\n]*\n\s*)*DESCRIBE\b/i.test(query)) return "DESCRIBE";
        if (/^\s*(PREFIX\s+[^\n]*\n\s*)*ASK\b/i.test(query)) return "ASK";
        if (/^\s*(PREFIX\s+[^\n]*\n\s*)*(INSERT|DELETE|LOAD|CLEAR|DROP|CREATE|COPY|MOVE|ADD)\b/i.test(query)) return "UPDATE";

        return "UNKNOWN";
    }

    RED.nodes.registerType("sparql-query", SparqlQueryNode);
};
