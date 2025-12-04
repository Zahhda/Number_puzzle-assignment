# Number Match Puzzle Game

A React Native number matching puzzle game built with Expo. Match identical numbers or pairs that sum to 10 to clear the board before time runs out.

## Overview

Number Match Puzzle is a brain-training game that challenges players to find matching number pairs on a grid. The game features multiple difficulty levels, smooth animations, and an intuitive user interface.

## Features

- Three difficulty levels with increasing complexity
- Match identical numbers or pairs that sum to 10
- Time-based gameplay with 2-minute timer per level
- Add Row feature to introduce more numbers when needed
- Smooth animations and visual feedback
- Main menu with level selection
- How to Play instructions screen
- Clean and modern UI design

## Gameplay

The objective is to clear all numbers from the grid by matching them in pairs. You can match:
- Two identical numbers (e.g., 5 and 5)
- Two numbers that sum to 10 (e.g., 3 and 7, 4 and 6)

When you match a pair, the numbers become faded but remain visible on the board. You must clear all numbers before the timer runs out to complete the level.

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)

### Setup

1. Clone the repository or extract the project files

2. Install dependencies:
```bash
npm install
```

3. Start the Expo development server:
```bash
npm start
```

4. Run on your preferred platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your physical device

## Project Structure

```
number-puzzle-expo/
├── App.js                 # Main application component
├── index.js              # Entry point with polyfills
├── polyfills.js          # setImmediate polyfill for SDK 52
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── assets/               # Images and icons
│   ├── icon.png
│   ├── splash.png
│   ├── adaptive-icon.png
│   └── favicon.png
└── README.md            # This file
```

## Configuration

The game levels are configured in the `LEVELS` constant in `App.js`:

- Level 1 (Easy): 5x4 grid, 3 initial rows, 2 extra rows
- Level 2 (Medium): 7x6 grid, 3 initial rows, 3 extra rows
- Level 3 (Hard): 8x6 grid, 4 initial rows, 3 extra rows

Each level has a 2-minute time limit.

## Technical Details

### Technologies Used

- React Native
- Expo SDK 52
- React Hooks (useState, useEffect, useRef)
- Animated API for smooth animations
- React Native Components (View, Text, TouchableOpacity, FlatList)

### Key Components

- **App Component**: Main game logic and state management
- **CellComponent**: Individual number cell with animations
- **Menu Screen**: Level selection and navigation
- **How to Play Screen**: Game instructions
- **Game Screen**: Main gameplay interface

### Animation Features

- Cell press animations with bounce effect
- Success feedback on valid matches
- Shake animation for invalid matches
- Smooth fade transitions for matched cells
- Menu and overlay entrance animations

## Building for Production

### Android

```bash
expo build:android
```

### iOS

```bash
expo build:ios
```

## Troubleshooting

### setImmediate Error

If you encounter a "Property 'setImmediate' doesn't exist" error, ensure that:
1. The `polyfills.js` file is imported at the top of `index.js`
2. The `setimmediate` package is installed: `npm install setimmediate`
3. Clear the cache and restart: `npx expo start --clear`

### Performance Issues

- Ensure you're using the latest version of Expo
- Clear the Metro bundler cache: `npx expo start --clear`
- Restart the development server

## Development Notes

- The game uses React.memo for CellComponent to optimize rendering
- All animations use the native driver for better performance
- The board state is managed with React hooks
- Number generation ensures valid matches are always possible

## License

This project is provided as-is for Assignment*.
