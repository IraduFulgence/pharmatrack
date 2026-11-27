import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import type { BottomTabHeaderProps } from '@react-navigation/bottom-tabs';
import { marketplaceService } from '@/src/api/marketplace/marketplaceService';
import { actingSession } from '@/src/api/family/familyService';

const logo = require('../../assets/images/Green-logo.png');

/** The screen that has no back button (the app's starting point). */
const HOME_ROUTE = 'home';

const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

/**
 * Header shown on every screen once a patient is logged in:
 * back button (everywhere but home), the screen title, the cart and the account menu.
 */
export default function AppHeader({ navigation, route, options }: BottomTabHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [actingFor, setActingFor] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = route.name === HOME_ROUTE;
  const title = typeof options.title === 'string' ? options.title : route.name;

  // Refresh who is signed in and the cart badge whenever the screen changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync('user');
        const user = raw ? JSON.parse(raw) : null;
        const acting = await actingSession.current();
        if (!cancelled) {
          setFullName(user?.fullName || '');
          setActingFor(acting?.fullName || null);
        }
      } catch {
        // Keep whatever was shown before.
      }
      try {
        const res = await marketplaceService.getCart();
        if (!cancelled) setCartCount(Number(res.data?.item_count || 0));
      } catch {
        if (!cancelled) setCartCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, [route.key]);

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace('/home');
  };

  const go = (path: string) => {
    setMenuOpen(false);
    router.push(path as any);
  };

  const signOut = async () => {
    setMenuOpen(false);
    await actingSession.clear();
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    router.replace('/auth/login');
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {!isHome && (
            <TouchableOpacity
              onPress={goBack}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={t('header.back', 'Go back')}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={24} color="#0F2926" />
            </TouchableOpacity>
          )}
          {isHome ? (
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          ) : (
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
          )}
        </View>

        <View style={styles.right}>
          <TouchableOpacity
            onPress={() => router.push('/cart')}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={t('header.cart', 'Cart')}
            hitSlop={8}
          >
            <Ionicons name="cart-outline" size={24} color="#0F2926" />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            style={styles.avatar}
            accessibilityRole="button"
            accessibilityLabel={t('header.account', 'Account menu')}
          >
            <Text style={styles.avatarText}>{initialsOf(fullName)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {actingFor && (
        <View style={styles.actingBanner}>
          <Ionicons name="people" size={14} color="#175CD3" />
          <Text style={styles.actingText} numberOfLines={1}>
            {t('header.actingFor', { defaultValue: 'Acting for {{name}}', name: actingFor })}
          </Text>
        </View>
      )}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity
          style={[styles.overlay, { paddingTop: insets.top + 56 }]}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menu}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Text style={styles.avatarText}>{initialsOf(fullName)}</Text>
              </View>
              <Text style={styles.menuName} numberOfLines={1}>{fullName || t('header.you', 'You')}</Text>
            </View>
            <View style={styles.divider} />
            <MenuItem icon="person-outline" label={t('dropdown.Myprofile', 'My profile')} onPress={() => go('/profile')} />
            <MenuItem icon="receipt-outline" label={t('dropdown.MyOrders', 'My orders')} onPress={() => go('/orders')} />
            <MenuItem icon="people-outline" label={t('dropdown.MyFamily', 'My family')} onPress={() => go('/family')} />
            <View style={styles.divider} />
            <MenuItem icon="log-out-outline" label={t('dropdown.Signout', 'Sign out')} onPress={signOut} danger />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function MenuItem({ icon, label, onPress, danger }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} accessibilityRole="menuitem">
      <Ionicons name={icon} size={20} color={danger ? '#EF4444' : '#344054'} />
      <Text style={[styles.menuItemText, danger && { color: '#EF4444' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8, marginRight: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { height: 30, width: 140 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0F2926' },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#007a55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f4ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#007a55', fontWeight: '700', fontSize: 14 },
  actingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF8FF',
  },
  actingText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#175CD3' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', paddingRight: 16, alignItems: 'flex-end' },
  menu: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: 230,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  menuHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12 },
  menuAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e6f4ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0F2926' },
  divider: { height: 1, backgroundColor: '#EAECF0', marginVertical: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, gap: 10 },
  menuItemText: { fontSize: 14, fontWeight: '500', color: '#344054' },
});
