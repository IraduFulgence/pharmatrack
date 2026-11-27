import { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Props {
  value: number;
  /** Called with the new quantity once it is committed (button tap, or typing finished). */
  onChange: (next: number) => void;
  min?: number;
  /** Highest allowed quantity (stock or prescription). No limit when omitted. */
  max?: number;
  /** Called instead of going above `max`, so the screen can explain why. */
  onExceed?: (max: number) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * Quantity picker: − and + buttons around a box the patient can type a number into.
 * Typed values are applied when the keyboard closes and kept between min and max.
 */
export default function QuantityInput({
  value, onChange, min = 1, max, onExceed, disabled, accessibilityLabel,
}: Props) {
  const { t } = useTranslation();
  const label = accessibilityLabel || t('quantity.label', 'Quantity');
  const [text, setText] = useState(String(value));

  // Follow changes made elsewhere (e.g. the cart reloading from the server).
  useEffect(() => { setText(String(value)); }, [value]);

  const commit = (next: number) => {
    let clamped = Math.max(min, Math.floor(next));
    if (max !== undefined && clamped > max) {
      clamped = Math.max(min, max);
      onExceed?.(max);
    }
    setText(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  const commitText = () => {
    const parsed = parseInt(text, 10);
    if (!Number.isFinite(parsed) || parsed < min) {
      // Empty or nonsense: go back to the last good value.
      setText(String(value));
      return;
    }
    commit(parsed);
  };

  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <View style={[styles.stepper, disabled && { opacity: 0.5 }]}>
      <TouchableOpacity
        onPress={() => commit(value - 1)}
        style={styles.button}
        disabled={disabled || atMin}
        accessibilityRole="button"
        accessibilityLabel={t('quantity.decrease', { defaultValue: 'Decrease: {{label}}', label })}
        hitSlop={6}
      >
        <Ionicons name="remove" size={16} color={atMin ? '#98A2B3' : '#0F2926'} />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(v) => setText(v.replace(/[^0-9]/g, '').slice(0, 4))}
        onEndEditing={commitText}
        onSubmitEditing={commitText}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        editable={!disabled}
        maxLength={4}
        accessibilityLabel={label}
      />
      <TouchableOpacity
        onPress={() => (atMax ? onExceed?.(max as number) : commit(value + 1))}
        style={styles.button}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t('quantity.increase', { defaultValue: 'Increase: {{label}}', label })}
        hitSlop={6}
      >
        <Ionicons name="add" size={16} color={atMax ? '#98A2B3' : '#0F2926'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F4F7', borderRadius: 10 },
  button: { paddingHorizontal: 10, paddingVertical: 8 },
  input: {
    minWidth: 40,
    paddingVertical: 4,
    paddingHorizontal: 4,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
    color: '#0F2926',
    backgroundColor: 'white',
    borderRadius: 6,
  },
});
