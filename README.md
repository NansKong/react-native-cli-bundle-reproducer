# CLI bug reproductions

This project uses the official [React Native reproducer template](https://github.com/react-native-community/reproducer-react-native), with React Native 0.88.1. The native Android/iOS projects and the application entry point are preserved. These two failures happen during bundling, so neither an emulator nor a native SDK is needed to reproduce them.

## Setup

Use Node 22.13 or newer supported by React Native 0.88.1:

```sh
cd ReproducerApp
npm install
```

## Missing asset catalog: react/react-native#59871

```sh
node reproduce-cli.cjs catalog
```

Expected: a bundle command targeting a missing `RNAssets.xcassets` rejects with a nonzero exit status.

Actual: the ordinary bundle control copies its GIF. The command with `--asset-catalog-dest` logs the missing-catalog error, exits 0, and copies no GIF.

## Ignored output options: react/react-native#59873

```sh
node reproduce-cli.cjs options
```

Expected: `--bundle-encoding utf16le` produces UTF-16LE bytes and `--sourcemap-sources-root` makes source paths relative to the supplied root.

Actual: the requested UTF-16LE bundle is byte-identical to the default UTF-8 bundle, and the map still names the absolute entry path.

## How the checks work

Both checks invoke the public `react-native bundle` CLI through `react-native/cli.js`, use the template's real Metro configuration and installed React Native dependencies, and build actual bundles. No internal CLI helpers or mocks are used. Each run generates its own entry and one-pixel GIF inside a fresh `ReproducerApp/build/repro-*` directory, which is already ignored by the template. Existing application files are not modified.

Each script exits 0 only after verifying the current bug and its control; a CLI failure before that point or behavior different from the reported bug makes it exit nonzero. These are reproduction checks, so 0 means “the bug was reproduced,” not “the product is fixed.” Read the `REPRODUCED` line and the inner CLI output.

Only the bundling steps are tested. No native-device behavior is claimed.

## Verified results

Tested on Windows 11, Node v22.22.0, npm 11.18.0, React Native 0.88.1, community CLI 20.2.0, and Metro 0.87.2:

```text
REPRODUCED #59871: control copied the GIF; missing catalog logged an error but CLI exited 0 and copied no GIF.
REPRODUCED #59873: default and requested UTF-16LE bundles are byte-identical UTF-8; source-map entry is still absolute.
```

The template's Android/iOS builds were not run; the CLI reproductions do not require them.
