import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface WheelOfFortuneProps {
  handNumber: number;
  effect: string;
}

export default function WheelOfFortune({ handNumber, effect }: WheelOfFortuneProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    rotation.setValue(0);
    const animation = Animated.timing(rotation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [handNumber, rotation]);

  return (
    <View style={styles.container} accessibilityLabel={`Wheel of Fortune: ${effect}`}>
      <Animated.Text
        style={[
          styles.wheel,
          {
            transform: [
              {
                rotate: rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '1080deg'],
                }),
              },
            ],
          },
        ]}
      >
        🎡
      </Animated.Text>
      <Text style={styles.text}>Wheel of Fortune: {effect}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8 },
  wheel: { fontSize: 24, marginRight: 8 },
  text: { color: '#FFD700', flexShrink: 1, fontWeight: '700' },
});
