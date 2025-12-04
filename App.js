// CRITICAL: Import polyfills FIRST before any React Native code
import './polyfills';

import React, { useState, useEffect, useRef } from "react";
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  FlatList, 
  Animated,
  Dimensions,
  Easing,
  Platform,
  ScrollView
} from "react-native";
import { StatusBar } from "expo-status-bar";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LEVELS = [
  { id: 1, rows: 5, cols: 4, initialFilledRows: 2, maxExtraRows: 2, timeLimit: 120, name: "Easy" },
  { id: 2, rows: 7, cols: 6, initialFilledRows: 3, maxExtraRows: 3, timeLimit: 120, name: "Medium" },
  { id: 3, rows: 8, cols: 6, initialFilledRows: 4, maxExtraRows: 3, timeLimit: 120, name: "Hard" },
];

function createValues(count) {
  const values = [];
  while (values.length < count) {
    const remaining = count - values.length;
    const pairSize = remaining >= 2 ? 2 : 1;
    const useSum10 = Math.random() < 0.5;
    
    if (useSum10) {
      const a = Math.floor(Math.random() * 9) + 1; // 1..9
      const b = 10 - a;
      if (b >= 1 && b <= 9) {
        values.push(a);
        if (pairSize === 2) values.push(b);
      } else {
        const v = Math.floor(Math.random() * 9) + 1;
        values.push(v);
        if (pairSize === 2) values.push(v);
      }
    } else {
      const v = Math.floor(Math.random() * 9) + 1;
      values.push(v);
      if (pairSize === 2) values.push(v);
    }
  }
  
  // Shuffle
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function createBoard(level) {
  const { rows, cols, initialFilledRows } = level;
  const totalCells = rows * cols;
  const filledCells = Math.min(initialFilledRows * cols, totalCells);
  const values = createValues(filledCells);

  const board = [];
  let valueIndex = 0;
  let idCounter = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shouldFill = r < initialFilledRows && valueIndex < values.length;
      board.push({
        id: idCounter.toString(),
        row: r,
        col: c,
        value: shouldFill ? values[valueIndex++] : null,
        matched: false,
      });
      idCounter++;
    }
  }
  return board;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Function to find a valid matching pair
function findMatchingPair(board) {
  const availableCells = board.filter(c => c.value !== null && !c.matched);
  
  for (let i = 0; i < availableCells.length; i++) {
    for (let j = i + 1; j < availableCells.length; j++) {
      const cell1 = availableCells[i];
      const cell2 = availableCells[j];
      
      // Check if they match (equal or sum to 10)
      if (cell1.value === cell2.value || 
          (cell1.value + cell2.value === 10)) {
        return [cell1.id, cell2.id];
      }
    }
  }
  return null;
}

export default function App() {
  const [screen, setScreen] = useState("menu"); // "menu" | "game" | "howToPlay"
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [board, setBoard] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);
  const [status, setStatus] = useState("playing");
  const [extraRowsAdded, setExtraRowsAdded] = useState(0);
  const [hintPair, setHintPair] = useState(null); // [id1, id2] for hint highlighting
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(1)).current;
  const hintTimeoutRef = useRef(null);

  const currentLevel = LEVELS[currentLevelIndex];

  const startLevel = (index) => {
    const levelIndex = typeof index === "number" ? index : currentLevelIndex;
    const lvl = LEVELS[levelIndex];
    const newBoard = createBoard(lvl);
    
    // Reset all state
    setCurrentLevelIndex(levelIndex);
    setBoard(newBoard);
    setSelectedId(null);
    setTimeLeft(lvl.timeLimit);
    setStatus("playing");
    setExtraRowsAdded(0);
    setHintPair(null);
    setLastInteractionTime(Date.now());
    
    // Reset animations
    shakeAnim.setValue(0);
    flashAnim.setValue(1);
    successAnim.setValue(0);
    overlayAnim.setValue(0);
    
    // Clear any existing hint timeout
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
    
    setScreen("game");
  };

  const goToMenu = () => {
    setScreen("menu");
    setStatus("idle");
    setHintPair(null);
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
  };

  const showHowToPlay = () => {
    setScreen("howToPlay");
  };

  useEffect(() => {
    if (screen === "menu") {
      menuAnim.setValue(0);
      Animated.spring(menuAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [screen]);

  useEffect(() => {
    let timer = null;
    if (status === "playing" && screen === "game") {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setStatus("lost");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, screen, currentLevelIndex]);

  // Auto-hint system - show hint after 5 seconds of no interaction
  useEffect(() => {
    if (status === "playing" && screen === "game" && !hintPair) {
      const timeSinceInteraction = Date.now() - lastInteractionTime;
      const hintDelay = 5000; // 5 seconds
      
      if (timeSinceInteraction >= hintDelay) {
        const pair = findMatchingPair(board);
        if (pair) {
          setHintPair(pair);
          // Auto-hide hint after 3 seconds
          hintTimeoutRef.current = setTimeout(() => {
            setHintPair(null);
            setLastInteractionTime(Date.now()); // Reset timer
          }, 3000);
        }
      } else {
        const remainingTime = hintDelay - timeSinceInteraction;
        hintTimeoutRef.current = setTimeout(() => {
          const pair = findMatchingPair(board);
          if (pair) {
            setHintPair(pair);
            // Auto-hide hint after 3 seconds
            setTimeout(() => {
              setHintPair(null);
              setLastInteractionTime(Date.now());
            }, 3000);
          }
        }, remainingTime);
      }
    }
    
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
    };
  }, [status, screen, board, lastInteractionTime, hintPair]);

  useEffect(() => {
    if (status === "won" || status === "lost") {
      overlayAnim.setValue(0);
      Animated.spring(overlayAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
      // Clear hints when game ends
      setHintPair(null);
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
    } else {
      overlayAnim.setValue(0);
    }
  }, [status]);

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { 
        toValue: 10, 
        duration: 50, 
        easing: Easing.linear,
        useNativeDriver: true 
      }),
      Animated.timing(shakeAnim, { 
        toValue: -10, 
        duration: 50, 
        easing: Easing.linear,
        useNativeDriver: true 
      }),
      Animated.timing(shakeAnim, { 
        toValue: 10, 
        duration: 50, 
        easing: Easing.linear,
        useNativeDriver: true 
      }),
      Animated.timing(shakeAnim, { 
        toValue: 0, 
        duration: 50, 
        easing: Easing.out(Easing.quad),
        useNativeDriver: true 
      }),
    ]).start();
  };

  const triggerFlash = () => {
    flashAnim.setValue(1);
    Animated.sequence([
      Animated.timing(flashAnim, { 
        toValue: 0.3, 
        duration: 100, 
        easing: Easing.out(Easing.quad),
        useNativeDriver: true 
      }),
      Animated.timing(flashAnim, { 
        toValue: 1, 
        duration: 150, 
        easing: Easing.in(Easing.quad),
        useNativeDriver: true 
      }),
    ]).start();
  };

  const triggerSuccess = () => {
    // Stop any ongoing animation first
    successAnim.stopAnimation();
    successAnim.setValue(0);
    
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.delay(1000), // Stay for 1 second
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCellPress = (cell) => {
    if (status !== "playing") return;
    if (cell.value === null || cell.matched) return;

    // Update interaction time
    setLastInteractionTime(Date.now());
    // Clear hint when user interacts
    if (hintPair) {
      setHintPair(null);
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
    }

    if (!selectedId) {
      setSelectedId(cell.id);
      return;
    }

    if (selectedId === cell.id) {
      setSelectedId(null);
      return;
    }

    const firstCell = board.find((c) => c.id === selectedId);
    if (!firstCell || firstCell.matched || firstCell.value === null) {
      setSelectedId(cell.id);
      return;
    }

    // Robust matching logic
    const firstValue = firstCell.value;
    const secondValue = cell.value;
    const isValidMatch = 
      firstValue === secondValue || 
      (firstValue + secondValue === 10);

    if (isValidMatch) {
      // Trigger success animation
      triggerSuccess();

      // Immediately mark as matched to prevent double-tapping
      const newBoard = board.map((c) => {
        if (c.id === firstCell.id || c.id === cell.id) {
          return { ...c, matched: true };
        }
        return c;
      });
      setBoard(newBoard);
      setSelectedId(null);

      // Check if all cells are matched
      const allMatched = newBoard.every(
        (c) => c.value === null || c.matched
      );
      if (allMatched) {
        setTimeout(() => setStatus("won"), 500);
      }
    } else {
      // Invalid match
      triggerShake();
      triggerFlash();
      setSelectedId(null);
    }
  };

  const handleAddRow = () => {
    if (status !== "playing") return;
    const lvl = currentLevel;
    if (extraRowsAdded >= lvl.maxExtraRows) return;

    const { rows, cols, initialFilledRows } = lvl;
    const nextRowIndex = initialFilledRows + extraRowsAdded;
    if (nextRowIndex >= rows) return;

    const startIndex = nextRowIndex * cols;
    const endIndex = startIndex + cols;
    const values = createValues(cols);

    const newBoard = board.map((cell, index) => {
      if (index >= startIndex && index < endIndex) {
        const localIndex = index - startIndex;
        return {
          ...cell,
          value: values[localIndex],
          matched: false,
        };
      }
      return cell;
    });

    setBoard(newBoard);
    setExtraRowsAdded((prev) => prev + 1);
    setLastInteractionTime(Date.now()); // Update interaction time
  };

  const resetLevel = () => {
    startLevel(currentLevelIndex);
  };

  const goToNextLevel = () => {
    if (currentLevelIndex < LEVELS.length - 1) {
      // Properly reset everything before starting next level
      const nextIndex = currentLevelIndex + 1;
      startLevel(nextIndex);
    } else {
      goToMenu();
    }
  };

  const CellComponent = React.memo(({ item, isSelected, isDisabled, cellSize, onPress, isHint }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(item.matched ? 0.4 : 1)).current;
    const hintPulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (item.matched) {
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }
    }, [item.matched]);

    useEffect(() => {
      if (isHint) {
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(hintPulseAnim, {
              toValue: 1.1,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(hintPulseAnim, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        pulse.start();
        return () => pulse.stop();
      } else {
        hintPulseAnim.setValue(1);
      }
    }, [isHint]);

    const handlePress = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
      onPress();
    };

    return (
      <Animated.View
        style={[
          styles.cell,
          {
            width: cellSize,
            height: cellSize,
            transform: [{ scale: Animated.multiply(scaleAnim, hintPulseAnim) }],
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          disabled={isDisabled}
          style={styles.cellTouchable}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <View style={[
            styles.cellInner,
            isSelected && styles.cellInnerSelected,
            item.matched && styles.cellInnerMatched,
            isHint && styles.cellInnerHint,
          ]}>
            <Text style={[
              styles.cellText, 
              (item.matched || isDisabled) && styles.cellTextFaded,
              isSelected && styles.cellTextSelected,
              isHint && styles.cellTextHint,
            ]}>
              {item.value !== null ? item.value : ""}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  const renderCell = ({ item }) => {
    const isSelected = selectedId === item.id;
    const isDisabled = item.value === null;
    const isHint = hintPair && (hintPair[0] === item.id || hintPair[1] === item.id);
    const cellSize = (SCREEN_WIDTH - 64 - (currentLevel.cols * 12)) / currentLevel.cols;

    return (
      <CellComponent
        key={item.id}
        item={item}
        isSelected={isSelected}
        isDisabled={isDisabled}
        cellSize={cellSize}
        isHint={isHint}
        onPress={() => handleCellPress(item)}
      />
    );
  };

  const gameShakeStyle = {
    transform: [
      {
        translateX: shakeAnim.interpolate({
          inputRange: [-10, 10],
          outputRange: [-10, 10],
        }),
      },
    ],
  };

  const flashStyle = {
    opacity: flashAnim,
  };

  const successScale = successAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 1.15, 1],
  });

  const successOpacity = successAnim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  // Menu Screen
  if (screen === "menu") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Animated.View 
          style={[
            styles.menuContainer,
            {
              opacity: menuAnim,
              transform: [{ scale: menuAnim }],
            }
          ]}
        >
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Number Match</Text>
            <Text style={styles.menuSubtitle}>Match numbers or pairs that sum to 10</Text>
          </View>

          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={showHowToPlay}
              activeOpacity={0.8}
            >
              <Text style={styles.menuButtonIcon}>📖</Text>
              <Text style={styles.menuButtonText}>How to Play</Text>
            </TouchableOpacity>

            <View style={styles.levelsContainer}>
              <Text style={styles.levelsTitle}>Choose Level</Text>
              {LEVELS.map((level, index) => (
                <TouchableOpacity
                  key={level.id}
                  style={styles.levelCard}
                  onPress={() => startLevel(index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.levelCardHeader}>
                    <Text style={styles.levelCardNumber}>Level {level.id}</Text>
                    <Text style={styles.levelCardName}>{level.name}</Text>
                  </View>
                  <Text style={styles.levelCardInfo}>
                    Grid: {level.rows}×{level.cols} • Time: {Math.floor(level.timeLimit / 60)} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // How to Play Screen
  if (screen === "howToPlay") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ScrollView style={styles.howToPlayContainer} contentContainerStyle={styles.howToPlayContent}>
          <View style={styles.howToPlayHeader}>
            <Text style={styles.howToPlayTitle}>How to Play</Text>
            <TouchableOpacity onPress={goToMenu} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.instructionsContainer}>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>
                Tap two numbers that are <Text style={styles.instructionHighlight}>equal</Text> or <Text style={styles.instructionHighlight}>sum to 10</Text>
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>
                Matched numbers will become <Text style={styles.instructionHighlight}>faded</Text> but remain visible
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>
                Use the <Text style={styles.instructionHighlight}>Add Row</Text> button to add more numbers when needed
              </Text>
            </View>

            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>4</Text>
              <Text style={styles.instructionText}>
                Clear all numbers before time runs out to win!
              </Text>
            </View>

            <View style={styles.examplesContainer}>
              <Text style={styles.examplesTitle}>Examples:</Text>
              <View style={styles.exampleRow}>
                <View style={[styles.exampleCell, styles.exampleCellActive]}>
                  <Text style={styles.exampleCellText}>5</Text>
                </View>
                <Text style={styles.examplePlus}>+</Text>
                <View style={[styles.exampleCell, styles.exampleCellActive]}>
                  <Text style={styles.exampleCellText}>5</Text>
                </View>
                <Text style={styles.exampleEquals}>= Match!</Text>
              </View>
              <View style={styles.exampleRow}>
                <View style={[styles.exampleCell, styles.exampleCellActive]}>
                  <Text style={styles.exampleCellText}>3</Text>
                </View>
                <Text style={styles.examplePlus}>+</Text>
                <View style={[styles.exampleCell, styles.exampleCellActive]}>
                  <Text style={styles.exampleCellText}>7</Text>
                </View>
                <Text style={styles.exampleEquals}>= Match!</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={goToMenu}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>Got it!</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Game Screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToMenu} style={styles.menuButtonSmall}>
          <Text style={styles.menuButtonSmallText}>☰ Menu</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.levelText}>Level {currentLevel.id}</Text>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      {/* Success Animation Overlay */}
      <Animated.View 
        style={[
          styles.successOverlay,
          {
            opacity: successOpacity,
            transform: [{ scale: successScale }],
          }
        ]}
        pointerEvents="none"
      >
        <Text style={styles.successText}>Match!</Text>
      </Animated.View>

      {/* Game Grid - Centered */}
      <Animated.View style={[styles.gridContainer, gameShakeStyle, flashStyle]}>
        <FlatList
          key={`level-${currentLevelIndex}-cols-${currentLevel.cols}`}
          data={board}
          keyExtractor={(item) => item.id}
          numColumns={currentLevel.cols}
          scrollEnabled={false}
          contentContainerStyle={styles.grid}
          renderItem={renderCell}
          removeClippedSubviews={false}
        />
      </Animated.View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.addRowButton,
            (extraRowsAdded >= currentLevel.maxExtraRows || status !== "playing") && styles.buttonDisabled,
          ]}
          onPress={handleAddRow}
          disabled={extraRowsAdded >= currentLevel.maxExtraRows || status !== "playing"}
          activeOpacity={0.8}
        >
          <Text style={styles.addRowButtonText}>
            + Add Row ({currentLevel.maxExtraRows - extraRowsAdded} left)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Game Over Overlay */}
      {(status === "won" || status === "lost") && (
        <View style={styles.overlay}>
          <Animated.View 
            style={[
              styles.overlayCard,
              {
                opacity: overlayAnim,
                transform: [{ 
                  scale: overlayAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  })
                }],
              }
            ]}
          >
            <Text style={styles.overlayTitle}>
              {status === "won" ? "🎉 Level Complete!" : "⏰ Time's Up"}
            </Text>
            <Text style={styles.overlaySubtitle}>
              {status === "won"
                ? `Great job! You've matched all numbers.`
                : "You ran out of time. Try again!"}
            </Text>

            <View style={styles.overlayButtons}>
              <TouchableOpacity 
                style={styles.overlayButton} 
                onPress={resetLevel}
                activeOpacity={0.8}
              >
                <Text style={styles.overlayButtonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.overlayButton} 
                onPress={goToMenu}
                activeOpacity={0.8}
              >
                <Text style={styles.overlayButtonText}>Menu</Text>
              </TouchableOpacity>
              {status === "won" && (
                <TouchableOpacity 
                  style={[styles.overlayButton, styles.overlayButtonPrimary]} 
                  onPress={goToNextLevel}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.overlayButtonText, styles.overlayButtonTextPrimary]}>
                    Next Level
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050816",
  },
  // Menu Styles
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  menuHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  menuTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: 1,
  },
  menuSubtitle: {
    fontSize: 16,
    color: "#A0AEC0",
    textAlign: "center",
  },
  menuContent: {
    flex: 1,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  menuButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  levelsContainer: {
    marginTop: 8,
  },
  levelsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  levelCard: {
    backgroundColor: "#111827",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  levelCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelCardNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  levelCardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4FC3F7",
  },
  levelCardInfo: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  // How to Play Styles
  howToPlayContainer: {
    flex: 1,
  },
  howToPlayContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  howToPlayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  howToPlayTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#4FC3F7",
    fontWeight: "600",
  },
  instructionsContainer: {
    marginBottom: 30,
  },
  instructionItem: {
    flexDirection: "row",
    marginBottom: 24,
    alignItems: "flex-start",
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1F2937",
    color: "#4FC3F7",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 32,
    marginRight: 16,
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: "#E5E7EB",
    lineHeight: 24,
  },
  instructionHighlight: {
    color: "#4FC3F7",
    fontWeight: "700",
  },
  examplesContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#111827",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  examplesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  exampleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  exampleCell: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#374151",
  },
  exampleCellActive: {
    backgroundColor: "#374151",
    borderColor: "#4FC3F7",
  },
  exampleCellText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  examplePlus: {
    fontSize: 20,
    color: "#9CA3AF",
    marginHorizontal: 12,
  },
  exampleEquals: {
    fontSize: 16,
    color: "#4FC3F7",
    fontWeight: "600",
    marginLeft: 12,
  },
  startButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  // Game Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  menuButtonSmall: {
    padding: 8,
  },
  menuButtonSmallText: {
    fontSize: 16,
    color: "#4FC3F7",
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  levelText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  timerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4FC3F7",
  },
  successOverlay: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
  },
  successText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#4FC3F7",
    textShadowColor: "rgba(79, 195, 247, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: "center",
  },
  grid: {
    alignItems: "center",
    justifyContent: "center",
  },
  cell: {
    margin: 6,
    borderRadius: 12,
  },
  cellTouchable: {
    flex: 1,
    borderRadius: 12,
  },
  cellInner: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#374151",
  },
  cellInnerSelected: {
    backgroundColor: "#374151",
    borderColor: "#FBBF24",
    borderWidth: 3,
  },
  cellInnerMatched: {
    backgroundColor: "#111827",
    borderColor: "#1F2937",
    opacity: 0.4,
  },
  cellInnerHint: {
    backgroundColor: "#2A4A6A",
    borderColor: "#4FC3F7",
    borderWidth: 3,
  },
  cellText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cellTextFaded: {
    color: "#6B7280",
  },
  cellTextSelected: {
    color: "#FBBF24",
  },
  cellTextHint: {
    color: "#4FC3F7",
  },
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  addRowButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  addRowButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#1F2937",
    opacity: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 8, 22, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayCard: {
    backgroundColor: "#111827",
    padding: 28,
    borderRadius: 20,
    width: "85%",
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
  },
  overlayTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
  },
  overlaySubtitle: {
    fontSize: 16,
    color: "#D1D5DB",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  overlayButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  overlayButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#1F2937",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  overlayButtonPrimary: {
    backgroundColor: "#2563EB",
    borderColor: "#3B82F6",
  },
  overlayButtonText: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
  },
  overlayButtonTextPrimary: {
    color: "#FFFFFF",
  },
});
