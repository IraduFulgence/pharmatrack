import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, Platform, ScrollView, Image, Modal, FlatList
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

// mock data
const CATEGORIES = [
  { id: '1', name: 'All', icon: 'apps' },
  { id: '2', name: 'Cosmetics', icon: 'color-palette' },
  { id: '3', name: 'Baby Care', icon: 'happy' },
  { id: '4', name: 'First Aid', icon: 'medkit' },
  { id: '5', name: 'Vitamins', icon: 'nutrition' },
];

const PRODUCTS = [
  {
    id: 'p1',
    name: 'Nivea Body Lotion',
    category: 'Cosmetics',
    price: 4500,
    pharmacy: 'Divine Pharmacy',
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p2',
    name: 'Pampers Baby Dry',
    category: 'Baby Care',
    price: 12000,
    pharmacy: 'Ineza Pharmacy',
    distance: '2.5 km',
    image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p3',
    name: 'Vitamin C 1000mg',
    category: 'Vitamins',
    price: 3500,
    pharmacy: 'WellCare Pharmacy',
    distance: '0.8 km',
    image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p4',
    name: 'First Aid Kit',
    category: 'First Aid',
    price: 15000,
    pharmacy: 'Divine Pharmacy',
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p5',
    name: 'Hand Sanitizer 500ml',
    category: 'First Aid',
    price: 2000,
    pharmacy: 'Alpha Pharmacy',
    distance: '3.0 km',
    image: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'p6',
    name: 'Baby Powder',
    category: 'Baby Care',
    price: 3000,
    pharmacy: 'Ineza Pharmacy',
    distance: '2.5 km',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=400&auto=format&fit=crop',
  },
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart State
  const [cart, setCart] = useState<{ [key: string]: { product: any; quantity: number } }>({});
  const [isCartVisible, setIsCartVisible] = useState(false);

  // Filter products
  const filteredProducts = PRODUCTS.filter(product => {
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Cart Logic
  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: existing ? existing.quantity + 1 : 1
        }
      };
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev[productId];
      if (!existing) return prev;
      
      if (existing.quantity === 1) {
        const newCart = { ...prev };
        delete newCart[productId];
        return newCart;
      }
      
      return {
        ...prev,
        [productId]: { ...existing, quantity: existing.quantity - 1 }
      };
    });
  };

  // Cart Calculations
  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const renderProduct = ({ item }: { item: typeof PRODUCTS[0] }) => {
    const quantityInCart = cart[item.id]?.quantity || 0;

    return (
      <View style={styles.productCard}>
        <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productPharmacy} numberOfLines={1}>
            {item.pharmacy} • {item.distance}
          </Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>{item.price.toLocaleString()} RWF</Text>
            
            {/* Add / Quantity Controls */}
            {quantityInCart === 0 ? (
              <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
                <Ionicons name="add" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <View style={styles.quantityControls}>
                <TouchableOpacity style={styles.qtyButton} onPress={() => removeFromCart(item.id)}>
                  <Ionicons name="remove" size={16} color="#007a55" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantityInCart}</Text>
                <TouchableOpacity style={styles.qtyButton} onPress={() => addToCart(item)}>
                  <Ionicons name="add" size={16} color="#007a55" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0F2926" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('marketplace.title', 'Marketplace')}</Text>
        </View>
        
        {/* Cart Button */}
        <TouchableOpacity style={styles.cartButton} onPress={() => setIsCartVisible(true)}>
          <Feather name="shopping-cart" size={22} color="#0F2926" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#98A2B3" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search cosmetics, baby care..."
            placeholderTextColor="#98A2B3"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map(category => {
            const isActive = activeCategory === category.name;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                onPress={() => setActiveCategory(category.name)}
              >
                <Ionicons 
                  name={category.icon as any} 
                  size={16} 
                  color={isActive ? 'white' : '#667085'} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        

        {/* Products Header */}
        <View style={styles.productsHeader}>
          <Text style={styles.sectionTitle}>{activeCategory} Products</Text>
          <Text style={styles.productCount}>{filteredProducts.length} items</Text>
        </View>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#D0D5DD" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {filteredProducts.map((product) => (
              <View key={product.id} style={styles.gridItemWrapper}>
                {renderProduct({ item: product })}
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* --- CART MODAL --- */}
      <Modal
        visible={isCartVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCartVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cartModalContainer}>
            
            <View style={styles.modalIndicator} />

            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Your Cart</Text>
              <TouchableOpacity onPress={() => setIsCartVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#667085" />
              </TouchableOpacity>
            </View>

            {cartItems.length === 0 ? (
              <View style={styles.emptyCart}>
                <Feather name="shopping-cart" size={48} color="#D0D5DD" />
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
                <Text style={styles.emptyCartSub}>Add items from the marketplace.</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={cartItems}
                  keyExtractor={(item) => item.product.id}
                  style={styles.cartList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.cartItemRow}>
                      <Image source={{ uri: item.product.image }} style={styles.cartItemImage} />
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                        <Text style={styles.cartItemPrice}>{item.product.price.toLocaleString()} RWF</Text>
                      </View>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity style={styles.qtyButton} onPress={() => removeFromCart(item.product.id)}>
                          <Ionicons name="remove" size={16} color="#007a55" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity style={styles.qtyButton} onPress={() => addToCart(item.product)}>
                          <Ionicons name="add" size={16} color="#007a55" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />

                <View style={styles.cartFooter}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>{cartTotal.toLocaleString()} RWF</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.checkoutButton}
                    onPress={() => alert("Checkout flow coming soon!")}
                  >
                    <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9F9' },
  
  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF0',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F2926' },
  cartButton: {
    padding: 10,
    backgroundColor: '#F2F4F7',
    borderRadius: 12,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#007a55',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  cartBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },

  scrollContent: { paddingBottom: 40 },

  /* Search */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    marginHorizontal: 20,
    marginTop: 16,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#101828' },

  /* Categories */
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAECF0',
  },
  categoryPillActive: {
    backgroundColor: '#007a55',
    borderColor: '#007a55',
  },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#667085' },
  categoryTextActive: { color: 'white' },

  /* Promo */
  promoBanner: {
    marginHorizontal: 20,
    backgroundColor: '#007a55',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24,
  },
  promoTextContainer: { flex: 1, zIndex: 1 },
  promoTitle: { fontSize: 20, fontWeight: '800', color: 'white', marginBottom: 4 },
  promoSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  promoButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  promoButtonText: { color: '#007a55', fontSize: 12, fontWeight: '700' },
  promoIcon: { position: 'absolute', right: -10, bottom: -10 },

  /* Products */
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F2926' },
  productCount: { fontSize: 13, color: '#667085', fontWeight: '500' },

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  gridItemWrapper: {
    width: '48%', 
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAECF0',
    marginBottom: 4,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F2F4F7',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2926',
    marginBottom: 4,
  },
  productPharmacy: {
    fontSize: 11,
    color: '#667085',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#007a55',
  },
  addButton: {
    backgroundColor: '#007a55',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  /* Quantity Controls */
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4ef',
    borderRadius: 16,
    padding: 2,
  },
  qtyButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007a55',
    marginHorizontal: 10,
  },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#0F2926', marginTop: 16 },

  /* Cart Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  cartModalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 12,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    maxHeight: '80%',
  },
  modalIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cartTitle: { fontSize: 22, fontWeight: '800', color: '#0F2926' },
  closeBtn: {
    padding: 8,
    backgroundColor: '#F8F9F9',
    borderRadius: 20,
  },

  emptyCart: { alignItems: 'center', paddingVertical: 40 },
  emptyCartText: { fontSize: 18, fontWeight: '700', color: '#0F2926', marginTop: 16 },
  emptyCartSub: { fontSize: 14, color: '#667085', marginTop: 4 },

  cartList: { flexGrow: 0 },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F7',
  },
  cartItemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F2F4F7',
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 15, fontWeight: '600', color: '#0F2926', marginBottom: 4 },
  cartItemPrice: { fontSize: 14, fontWeight: '700', color: '#007a55' },

  cartFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#667085' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#0F2926' },
  checkoutButton: {
    backgroundColor: '#007a55',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#007a55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  checkoutButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
});