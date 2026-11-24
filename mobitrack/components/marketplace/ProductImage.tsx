import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { imageUri } from '@/src/api/marketplace/marketplaceService';

/**
 * Product photo with a placeholder. Medicines don't have photos yet; once one is
 * uploaded the API returns its image_url and this shows it automatically.
 */
export default function ProductImage({
  path,
  style,
  iconSize = 40,
}: {
  path?: string | null;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}) {
  const [failed, setFailed] = useState(false);
  const uri = imageUri(path);

  return (
    <View style={[styles.box, style]}>
      {uri && !failed ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} />
      ) : (
        <MaterialCommunityIcons name="pill" size={iconSize} color="#7FBFA9" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#e6f4ef',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
