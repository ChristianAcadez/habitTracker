import { StyleSheet, Text, View } from 'react-native';

export default function HabitsScreen() {
  return (
    <View style={styles.container}>
      <Text>Habitos (próximamente)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});