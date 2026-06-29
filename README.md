# node-red-contrib-comunica-sparql

A [Node-RED](https://nodered.org/) node for executing SPARQL queries using the [Comunica](https://comunica.dev/) query engine.

## Features

- Execute **SELECT**, **CONSTRUCT**, **DESCRIBE**, **ASK**, and **UPDATE** SPARQL queries
- Federated querying over multiple heterogeneous data sources
- Supports SPARQL endpoints, RDF files, Triple Pattern Fragments (TPF), and more
- Auto-detects source types or allows explicit configuration
- Configurable query timeout
- Dynamic query and source injection via incoming messages

## Installation

### From npm (after publishing)

```bash
cd ~/.node-red
npm install node-red-contrib-comunica-sparql
```

### Local development

```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-comunica-sparql
```

## Nodes

### sparql-query

Executes a SPARQL query against configured data sources.

**Inputs:**

| Property | Type | Description |
|----------|------|-------------|
| `msg.query` | string | SPARQL query (overrides node config) |
| `msg.payload` | string | Used as query if `msg.query` is not set |
| `msg.sources` | array/string | Data sources (overrides endpoint config) |

**Outputs:**

| Property | Type | Description |
|----------|------|-------------|
| `msg.payload` | array/boolean/object | Query results |
| `msg.queryType` | string | Detected query type |
| `msg.sparqlQuery` | string | The executed query |

**Result formats by query type:**

- **SELECT**: Array of objects with variable bindings (`{ varName: { value, type, datatype, language } }`)
- **CONSTRUCT/DESCRIBE**: Array of quad objects (`{ subject, predicate, object, graph }`)
- **ASK**: Boolean
- **UPDATE**: `{ success: true }`

### sparql-endpoint (config node)

Configures reusable data source connection details.

| Property | Description |
|----------|-------------|
| Sources | Comma-separated list of source URLs |
| Source Type | auto-detect, SPARQL endpoint, RDF file, or Hypermedia (TPF) |

## Example Usage

### Basic SELECT query

```json
[
    {
        "id": "inject1",
        "type": "inject",
        "payload": "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10",
        "wires": [["sparql1"]]
    },
    {
        "id": "sparql1",
        "type": "sparql-query",
        "name": "DBpedia Query",
        "wires": [["debug1"]]
    }
]
```

### Dynamic sources via msg

Inject a message with:
```json
{
    "query": "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 5",
    "sources": ["https://dbpedia.org/sparql"]
}
```

## Requirements

- Node.js >= 18.0.0
- Node-RED >= 2.0.0

## License

MIT
