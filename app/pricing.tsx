import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { ChevronLeft, Check, X, Info } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CustomAlert } from '../src/components/ui/CustomAlert';
import { API_BASE_URL } from '../src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

let Purchases: any = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (e) {
  Purchases = null;
}

export default function PricingScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'plus' | 'plus+'>('plus');
  const [selectedPlan, setSelectedPlan] = useState<'7days' | '30days'>('7days');
  const [alertState, setAlertState] = useState({ visible: false, title: '', message: '' });

  const closeAlert = () => setAlertState(prev => ({ ...prev, visible: false }));

  const handlePurchase = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      setAlertState({ visible: true, title: 'Purchasing...', message: 'Please wait' });
      
      if (Purchases) {
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
          const vipPackage = offerings.current.availablePackages[0];
          await Purchases.purchasePackage(vipPackage);
          
          await fetch(`${API_BASE_URL}/api/payments/verify-revenuecat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user._id,
              diamondsToAdd: 500,
              isVip: true,
              rcAppUserId: await Purchases.getAppUserID()
            })
          });
        }
      } else {
        // Mock success if RevenueCat is missing (e.g. Expo Go)
        await new Promise(res => setTimeout(res, 1500));
      }

      setAlertState({ visible: true, title: 'Welcome to VIP!', message: 'You are now a VYBE VIP.' });
    } catch (err: any) {
      if (!err.userCancelled) {
        setAlertState({ visible: true, title: 'Error', message: err.message || 'Could not upgrade.' });
      } else {
        closeAlert();
      }
    }
  };

  const isPlus = activeTab === 'plus';
  const themeColor = isPlus ? '#0084FF' : '#FF1493';
  
  const features = [
    { name: 'Filter-Both', plus: 'Unlimited', plusPlus: 'Unlimited' },
    { name: 'Filter-Gender', plus: '150', plusPlus: 'Unlimited' },
    { name: 'Match Preference', plus: 'x', plusPlus: 'v' },
    { name: 'No Ads', plus: 'v', plusPlus: 'v' },
    { name: 'Beauty Filter', plus: 'v', plusPlus: 'v' },
    { name: 'Rear Camera', plus: 'v', plusPlus: 'v' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VYBE VIP</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, isPlus && { backgroundColor: themeColor, borderColor: themeColor }]} 
            onPress={() => setActiveTab('plus')}
          >
            <Text style={[styles.tabText, isPlus && { color: '#fff' }]}>VYBE VIP</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, !isPlus && { backgroundColor: themeColor, borderColor: themeColor }]} 
            onPress={() => setActiveTab('plus+')}
          >
            <Text style={[styles.tabText, !isPlus && { color: '#fff' }]}>VYBE VIP+</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeaderRow}>
            <View style={styles.col1} />
            <View style={[styles.col2, isPlus && { backgroundColor: themeColor, borderTopLeftRadius: 16, borderTopRightRadius: 16 }]}>
              <Text style={[styles.tableHeaderText, isPlus && { color: '#fff' }]}>VIP</Text>
            </View>
            <View style={[styles.col3, !isPlus && { backgroundColor: themeColor, borderTopLeftRadius: 16, borderTopRightRadius: 16 }]}>
              <Text style={[styles.tableHeaderText, !isPlus && { color: '#fff' }]}>VIP+</Text>
            </View>
          </View>

          {features.map((item, index) => {
            const renderCell = (val: string, isActiveCol: boolean) => {
              if (val === 'v') return <Check size={20} color={isActiveCol ? '#fff' : '#fff'} />;
              if (val === 'x') return <X size={20} color={isActiveCol ? '#fff' : themeColor} />;
              return <Text style={[styles.cellText, isActiveCol ? { color: '#fff', fontWeight: 'bold' } : { color: '#fff' }]}>{val}</Text>;
            };

            const isLast = index === features.length - 1;

            return (
              <View key={index} style={styles.tableRow}>
                <View style={styles.col1}>
                  <Text style={styles.featureName}>{item.name}</Text>
                  <Info size={14} color="#666" style={{ marginLeft: 6 }} />
                </View>
                <View style={[styles.col2, isPlus && { backgroundColor: themeColor }, isPlus && isLast && { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }]}>
                  {renderCell(item.plus, isPlus)}
                </View>
                <View style={[styles.col3, !isPlus && { backgroundColor: themeColor }, !isPlus && isLast && { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }]}>
                  {renderCell(item.plusPlus, !isPlus)}
                </View>
              </View>
            );
          })}
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          <TouchableOpacity 
            style={[styles.planCard, selectedPlan === '7days' && { borderColor: themeColor, backgroundColor: '#222' }]}
            onPress={() => setSelectedPlan('7days')}
          >
            {isPlus && selectedPlan === '7days' && (
              <View style={[styles.discountBadge, { backgroundColor: themeColor }]}>
                <Text style={styles.discountText}>30% off</Text>
              </View>
            )}
            <Text style={styles.planDays}>7</Text>
            <Text style={styles.planSub}>days</Text>
            <Text style={styles.planPrice}>₹{isPlus ? '490.00' : '1,400.00'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.planCard, selectedPlan === '30days' && { borderColor: themeColor, backgroundColor: '#222' }]}
            onPress={() => setSelectedPlan('30days')}
          >
            <Text style={styles.planDays}>30</Text>
            <Text style={styles.planSub}>days</Text>
            <Text style={styles.planPrice}>₹{isPlus ? '1,400.00' : '2,800.00'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.billingText}>
          ₹{isPlus && selectedPlan === '7days' ? '700.00' : (isPlus ? '1,400.00' : '2,800.00')} will be charged every {selectedPlan === '7days' ? '7' : '30'} days until canceled
        </Text>

      </ScrollView>

      {/* Sticky Bottom Button */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.continueBtn, { backgroundColor: themeColor }]} onPress={handlePurchase}>
          {isPlus && selectedPlan === '7days' ? (
            <>
              <Text style={styles.continueBtnTitle}>Discount on your first subscription</Text>
              <Text style={styles.continueBtnSub}>(₹700.00 {'>'} ₹490.00/7days)</Text>
            </>
          ) : (
            <Text style={styles.continueBtnTitle}>CONTINUE</Text>
          )}
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        primaryButtonText="OK"
        onPrimaryPress={alertState.onPrimaryPress || closeAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 16,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  tableContainer: {
    marginTop: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    height: 50,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 56,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  col1: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  featureName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  col2: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  col3: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHeaderText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '700',
  },
  cellText: {
    fontSize: 13,
    fontWeight: '600',
  },
  plansContainer: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 16,
  },
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: -12,
    left: -2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  discountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  planDays: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  planSub: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  billingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  bottomNav: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#0a0a0a',
  },
  continueBtn: {
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  continueBtnSub: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
  },
});
