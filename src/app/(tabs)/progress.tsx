import { StyleSheet, Text, View } from 'react-native';

export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text>Progreso (próximamente)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});