# 🛡️ AdGuard Home MCP

A [Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) server implementation for [AdGuard Home](https://adguard.com/en/adguard-home/overview.html). Easily query and manage DNS records, filtering rules, and more via AI agents.

[![npm version](https://badge.fury.io/js/@fcannizzaro%2Fmcp-adguard-home.svg)](https://www.npmjs.com/package/@fcannizzaro/mcp-adguard-home)
[![CI: Publish Package](https://github.com/fcannizzaro/mcp-adguard-home/actions/workflows/publish-package.yaml/badge.svg)](https://github.com/fcannizzaro/mcp-adguard-home/actions/workflows/publish-package.yaml)

## 📦 Installation

```bash
npm i -g @fcannizzaro/mcp-adguard-home
```

## ⚙️ Configuration

Set the following environment variables:

```dotenv
ADGUARD_USERNAME=
ADGUARD_PASSWORD=
ADGUARD_URL=
```

## 🚀 Usage

Configure your MCP client to use `mcp-adguard-home` (it's a stdio server).

![AdGuard Home](/.media/adguard-home.gif)

## 🧰 Rewrite DNS Tools

- 📋 **List records** (`list_rewrite_dns_records`)
- ➕ **Add record** (`add_rewrite_dns_record`)
- ❌ **Delete record** (`remove_rewrite_dns_record`)

## 🔧 DNS Filtering Tools

- 📝 **List rules** (`list_dns_filtering_rules`)
- 🔧 **Add/Update rules** (`manage_dns_filtering_rules`)
- ❌ **Delete rules** (`remove_dns_filtering_rules`)

## 📄 License

Licensed under the [MIT License](LICENSE).
