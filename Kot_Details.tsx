import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import ngrok from './api/ngrok';
import { RootStackParamList } from './App';  // centralized type import
import { KOTItem } from './types/KOTItem';             // centralized KOTItem import

// No local RootStackParamList or KOTItem definitions

type KOTDetailsRouteProp = RouteProp<RootStackParamList, 'KOTDetails'>;
type KOTDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'KOTDetails'>;

type PrintPreviewNavigationProp = StackNavigationProp<RootStackParamList, 'PrintKOTPreview'>;

const Kot_Details = () => {
  const route = useRoute<KOTDetailsRouteProp>();
  const navigationDetail = useNavigation<KOTDetailsNavigationProp>();
  const navigationPrint = useNavigation<PrintPreviewNavigationProp>();
  const { kotData } = route.params;

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<KOTItem[]>([]);
  const [isCancelling, setIsCancelling] = useState<number | null>(null);

  useEffect(() => {
    fetchKOTDetails();
  }, []);

  const fetchKOTDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ngrok.BASE_URL}/api/kot-list-details/${kotData.kotNumber}`);
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        const mappedItems: KOTItem[] = json.data.map((item: any) => ({
          id: item.id,
          kotNumber: item.KOT_No,
          date: item.CreatedAt,
          roomNo: item.Room_No,
          description: item.Description,
          qty: item.Qty,
          price: item.Price,
          total: item.Total,
          remarks: item.Remarks,
          cancelStatus: item.Cancel_Status,
        }));
        setDetails(mappedItems);
      } else {
        Alert.alert('No KOT details found');
        setDetails([]);
      }
    } catch (e) {
      Alert.alert('Network error while loading details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (isCancelling !== null) return;
    setIsCancelling(id);
    try {
      const response = await fetch(`${ngrok.BASE_URL}/api/cancel-kot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Item cancelled successfully');
        fetchKOTDetails(); // refresh list
      } else {
        Alert.alert('Error', result.message || 'Cancel failed');
      }
    } catch (e) {
      Alert.alert('Network error or server unavailable');
    } finally {
      setIsCancelling(null);
    }
  };

  const handlePrintKOT = async () => {
    try {
      const res = await axios.post(`${ngrok.BASE_URL}/api/print_kot_cancel`, {
        kotNo: kotData.kotNumber,
      });

      console.log('Print KOT response', res.data);
      if (res.data.success) {
        navigationPrint.navigate('PrintKOTPreview', {
          kotNo: res.data.kotNo,
          items: res.data.items,
        });
      } else {
        Alert.alert('Print Error', res.data.message);
      }
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Failed to print KOT');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#840214" />
      </View>
    );
  }

  if (details.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No details found for this KOT.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>KOT Details (#{kotData.kotNumber})</Text>

      <Button title="🖨️ Print This KOT" onPress={handlePrintKOT} color="#4CAF50" />
      <View style={{ height: 20}} />

      <FlatList
        data={details}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <Text style={styles.label}>Description: {item.description}</Text>
            <Text style={styles.label}>Qty: {item.qty}</Text>
            <Text style={styles.label}>Price: ₹{item.price}</Text>
            <Text style={styles.label}>Total: ₹{item.total}</Text>
            <Text style={styles.label}>Room No: {item.roomNo}</Text>
            <Text style={styles.label}>Remarks: {item.remarks || 'None'}</Text>
            <Text style={styles.label}>Cancel Status: {item.cancelStatus}</Text>
            <Button
              title={isCancelling === item.id ? 'Cancelling...' : 'Cancel Item'}
              onPress={() => handleCancel(item.id)}
              disabled={isCancelling !== null || item.cancelStatus === 'Yes'}
              color="#D32F2F"
            />
          </View>
        )}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffb665', padding: 20 },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#840214',
    marginBottom: 20,
    textAlign: 'center',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  gridItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { fontSize: 14, color: '#333', marginBottom: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default Kot_Details;
