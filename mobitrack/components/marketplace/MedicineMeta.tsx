import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type Ages = { min_age_years?: number | null; max_age_years?: number | null };

/** Short age label: "Ages 2–12", "Ages 12+", "Up to age 65" or "All ages". */
export const ageLabel = (t: TFunction, m: Ages) => {
  const min = m.min_age_years ?? null;
  const max = m.max_age_years ?? null;
  if (min !== null && max !== null) return t('medicine.agesRange', { defaultValue: 'Ages {{min}}–{{max}}', min, max });
  if (min !== null) return t('medicine.agesMin', { defaultValue: 'Ages {{min}}+', min });
  if (max !== null) return t('medicine.agesMax', { defaultValue: 'Up to age {{max}}', max });
  return t('medicine.allAges', 'All ages');
};

interface Props extends Ages {
  category_name?: string | null;
  indications?: string[] | null;
  /** How many tags to show before "+N". 0 hides tags. */
  maxTags?: number;
}

/** Category, tags and who may take a medicine, in one compact row for lists. */
export default function MedicineMeta({ category_name, indications, min_age_years, max_age_years, maxTags = 2 }: Props) {
  const { t } = useTranslation();
  const tags = indications || [];
  const limited = min_age_years != null || max_age_years != null;
  return (
    <View style={styles.row}>
      {category_name ? (
        <View style={[styles.chip, styles.category]}>
          <Ionicons name="pricetag-outline" size={10} color="#175CD3" />
          <Text style={[styles.chipText, { color: '#175CD3' }]} numberOfLines={1}>{category_name}</Text>
        </View>
      ) : null}
      {tags.slice(0, maxTags).map((tag) => (
        <View key={tag} style={styles.chip}><Text style={styles.chipText} numberOfLines={1}>{tag}</Text></View>
      ))}
      {maxTags > 0 && tags.length > maxTags ? <Text style={styles.more}>+{tags.length - maxTags}</Text> : null}
      <View style={[styles.chip, limited ? styles.ageLimited : styles.ageAll]}>
        <Ionicons name="people-outline" size={10} color={limited ? '#B54708' : '#667085'} />
        <Text style={[styles.chipText, { color: limited ? '#B54708' : '#667085' }]}>
          {ageLabel(t, { min_age_years, max_age_years })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, backgroundColor: '#e6f4ef', maxWidth: 140,
  },
  category: { backgroundColor: '#EFF8FF' },
  ageLimited: { backgroundColor: '#FFFAEB' },
  ageAll: { backgroundColor: '#F2F4F7' },
  chipText: { fontSize: 10, fontWeight: '700', color: '#007a55' },
  more: { fontSize: 10, color: '#667085', fontWeight: '600' },
});
