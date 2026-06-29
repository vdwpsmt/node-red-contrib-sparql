let SparqlClient;

module.exports = function (RED) {
    function detectQueryType(query) {
        // Strip comment lines before detection
        const q = query.replace(/^\s*#[^\n]*\n?/gm, "");
        if (/^\s*(PREFIX\s+[^\n]*\n\s*)*SELECT\b/i.test(q)) return "SELECT";
        if (/^\s*(PREFIX\s+[^\n]*\n\s*)*CONSTRUCT\b/i.test(q)) return "CONSTRUCT";
        if (/^\s*(PREFIX\s+[^\n]*\n\s*)*DESCRIBE\b/i.test(q)) return "DESCRIBE";
        if (/^\s*(PREFIX\s+[^\n]*\n\s*)*ASK\b/i.test(q)) return "ASK";
        if (/^\s*(PREFIX\s+[^\n]*\n\s*)*(INSERT|DELETE|LOAD|CLEAR|DROP|CREATE|COPY|MOVE|ADD)\b/i.test(q)) return "UPDATE";
        return "UNKNOWN";
    }

    function mapOperation(httpMethod) {
        switch (httpMethod) {
            case "POST-direct": return "postDirect";
            case "POST-form": return "postUrlencoded";
            case "GET": return "get";
            default: return "postDirect";
        }
    }

    function SparqlQueryNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.query = config.query || "";
        this.endpoint = RED.nodes.getNode(config.endpoint);
        this.timeout = parseInt(config.timeout, 10) || 60;
        this.outputFormat = config.outputFormat || "json";

        node.on("input", async function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments); };
            done = done || function (err) { if (err) { node.error(err, msg); } };

            const query = msg.query || msg.payload || node.query;

            if (!query || typeof query !== "string" || query.trim().length === 0) {
                done(new Error("No SPARQL query provided. Set msg.query, msg.payload, or configure in the node."));
                return;
            }

            // Determine endpoint URL
            let endpointUrl;
            if (msg.endpoint) {
                endpointUrl = String(msg.endpoint);
            } else if (node.endpoint) {
                endpointUrl = node.endpoint.endpoint;
            } else {
                done(new Error("No SPARQL endpoint configured. Set msg.endpoint or configure an endpoint."));
                return;
            }

            if (!endpointUrl) {
                done(new Error("No valid endpoint URL provided."));
                return;
            }

            node.status({ fill: "blue", shape: "dot", text: "querying..." });

            try {
                // Lazy-load ESM module
                if (!SparqlClient) {
                    SparqlClient = (await import("sparql-http-client/SimpleClient.js")).default;
                }

                const creds = node.endpoint ? node.endpoint.credentials : {};
                const httpMethod = node.endpoint ? node.endpoint.httpMethod : "POST-direct";
                const operation = mapOperation(httpMethod);

                const clientOpts = { endpointUrl };
                if (creds && creds.username && creds.password) {
                    clientOpts.user = creds.username;
                    clientOpts.password = creds.password;
                }

                const timeoutMs = node.timeout * 1000;
                const fetchOpts = { signal: AbortSignal.timeout(timeoutMs) };

                const client = new SparqlClient(clientOpts);
                const queryType = detectQueryType(query);

                let result;

                const outputFormat = node.outputFormat;

                switch (queryType) {
                    case "SELECT": {
                        const response = await client.query.select(query, { operation, ...fetchOpts });
                        if (!response.ok) {
                            throw new Error(`SPARQL endpoint returned HTTP ${response.status}: ${await response.text()}`);
                        }
                        const json = await response.json();
                        if (outputFormat === "full") {
                            result = json;
                        } else if (outputFormat === "flat") {
                            result = json.results.bindings.map(row => {
                                const obj = {};
                                for (const key of Object.keys(row)) {
                                    obj[key] = row[key].value;
                                }
                                return obj;
                            });
                        } else {
                            result = json.results.bindings;
                        }
                        break;
                    }

                    case "ASK": {
                        const response = await client.query.ask(query, { operation, ...fetchOpts });
                        if (!response.ok) {
                            throw new Error(`SPARQL endpoint returned HTTP ${response.status}: ${await response.text()}`);
                        }
                        const json = await response.json();
                        if (outputFormat === "full") {
                            result = json;
                        } else {
                            result = json.boolean;
                        }
                        break;
                    }

                    case "CONSTRUCT":
                    case "DESCRIBE": {
                        const response = await client.query.construct(query, { operation, ...fetchOpts });
                        if (!response.ok) {
                            throw new Error(`SPARQL endpoint returned HTTP ${response.status}: ${await response.text()}`);
                        }
                        result = await response.text();
                        break;
                    }

                    case "UPDATE": {
                        const response = await client.query.update(query, { operation, ...fetchOpts });
                        if (!response.ok) {
                            throw new Error(`SPARQL endpoint returned HTTP ${response.status}: ${await response.text()}`);
                        }
                        result = { success: true };
                        break;
                    }

                    default: {
                        // Fallback: send as SELECT
                        const response = await client.query.select(query, { operation, ...fetchOpts });
                        if (!response.ok) {
                            throw new Error(`SPARQL endpoint returned HTTP ${response.status}: ${await response.text()}`);
                        }
                        const json = await response.json();
                        if (outputFormat === "full") {
                            result = json;
                        } else if (outputFormat === "flat") {
                            result = json.results.bindings.map(row => {
                                const obj = {};
                                for (const key of Object.keys(row)) {
                                    obj[key] = row[key].value;
                                }
                                return obj;
                            });
                        } else {
                            result = json.results.bindings;
                        }
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

    RED.nodes.registerType("sparql-query", SparqlQueryNode);
};
