# node-red-contrib-sparql

A [Node-RED](https://nodered.org/) node for executing SPARQL queries against SPARQL endpoints, implementing the [W3C SPARQL 1.1 Protocol](https://www.w3.org/TR/sparql11-protocol/). Based on [sparql-http-client](https://github.com/rdf-ext/sparql-http-client).

## Features

- Execute **SELECT**, **CONSTRUCT**, **DESCRIBE**, **ASK**, and **UPDATE** SPARQL queries
- Supports all three W3C SPARQL Protocol HTTP methods: POST (direct), POST (form-encoded), and GET
- HTTP Basic Authentication support
- Configurable query timeout
- Multiple output formats: simplified bindings, flat values, or full SPARQL JSON response
- Dynamic query and endpoint injection via incoming messages

## Installation

### From npm

```bash
cd ~/.node-red
npm install node-red-contrib-sparql
```

### Local development

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-sparql
```

## Nodes

### sparql-query

Executes a SPARQL query against a configured endpoint.

**Inputs:**

| Property | Type | Description |
|----------|------|-------------|
| `msg.query` | string | SPARQL query (highest priority, overrides node config) |
| `msg.payload` | string | Used as query if `msg.query` is not set |
| `msg.endpoint` | string | Endpoint URL (overrides configured endpoint) |

**Outputs:**

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | array/boolean/string/object | Query results |
| `msg.queryType` | string | Detected query type (SELECT, CONSTRUCT, DESCRIBE, ASK, UPDATE) |
| `msg.sparqlQuery` | string | The executed query |

**Output formats (configurable):**

| Format | SELECT result | ASK result |
|--------|--------------|------------|
| JSON (simplified) | `results.bindings` array with type metadata | `boolean` |
| JSON (flat values) | Array of `{ var: "value" }` objects (no type info) | `boolean` |
| JSON (full response) | Complete SPARQL JSON Results object | Complete response |

CONSTRUCT/DESCRIBE always return RDF text. UPDATE always returns `{ success: true }`.

### sparql-endpoint (config node)

Configures a reusable SPARQL endpoint connection.

| Property | Description |
|----------|-------------|
| Endpoint | SPARQL endpoint URL |
| HTTP Method | POST (direct), POST (form-encoded), or GET |
| Username / Password | Optional HTTP Basic Authentication credentials |

## Example

Import the example flow from `examples/basic-select.json` via the Node-RED import menu.

## Requirements

- Node.js >= 18.0.0
- Node-RED >= 2.0.0

## License

MIT
