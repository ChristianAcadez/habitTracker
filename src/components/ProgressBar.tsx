import { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export default function ProgressBar({ progress }: { progress: number }) {
    const animated = useRef(new Animated.Value(progress)).current;

    useEffect(() => {
        Animated.timing(animated, {
            toValue: progress,
            duration: 250,
            useNativeDriver: false, // el ancho no se puede animar con el driver nativo
        }).start();
    }, [progress, animated]);

    const width = animated.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    return (
        <View style={styles.track}>
            <Animated.View style={[styles.fill, { width }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    track: {
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.statusEmpty,
        overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
});