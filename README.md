# Dyno View

A desktop application built with Electron, TypeScript, and React for viewing DynamoDB data.

## Prerequisites

- Node.js (latest LTS version recommended)
- npm or yarn

## Setup

1. Clone the repository
```bash
git clone <repository-url>
cd dyno-view
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Add the following environment variables to your shell configuration (e.g., `.bashrc`, `.zshrc`):

```bash
export DDBV_KEY_ID=<your-aws-key-id>
export DDBV_ACC_KEY=<your-aws-access-key>
export DDBV_STACK=<any initial table filtering> eg a cdk stack name
```


## Development

To start the development server:

```bash
npm run dev
```

## Building

To build the application:

```bash
npm run build
```

## Project Structure

- `src/main` - Electron main process code
- `src/renderer` - React application code
  - `components/` - React components
  - `services/` - Business logic and services
  - `styles/` - CSS and styling files
  - `types/` - TypeScript type definitions

## Security Note

⚠️ Always keep your AWS credentials secure and never share them publicly. The environment variables shown in this README are for demonstration purposes only and should be replaced with your own secure credentials.

