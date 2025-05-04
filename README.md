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

## Building Binaries

### Building for macOS

To build a macOS binary (.dmg and .zip):

```bash
npm run dist:mac
```

This will create:
- A `.dmg` installer file in the `release` directory
- A `.zip` archive in the `release` directory

### Building for Windows

To build Windows binaries:

```bash
npm run dist:win
```

This will create:
- A portable `.exe` file in the `release` directory
- An installable setup `.exe` file in the `release` directory

### Building for All Platforms

To build for all configured platforms:

```bash
npm run dist
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

