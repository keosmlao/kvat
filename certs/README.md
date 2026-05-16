# eTax Gateway CA bundle

`etax-ca.pem` contains the GlobalSign certificate chain required to verify
the TLS certificate of `etax-gw.mof.gov.la:8443`. Node.js bundles its own
CA store and doesn't include macOS keychain CAs by default; the server only
sends the leaf certificate without the intermediate, so we pin the chain
ourselves.

Loaded via `NODE_EXTRA_CA_CERTS=./certs/etax-ca.pem` in package.json scripts.

Contents (in order):
1. GlobalSign RSA OV SSL CA 2018 — intermediate
2. GlobalSign Root R3 — root

Both are public certs (sourced from secure.globalsign.com) — safe to commit.
