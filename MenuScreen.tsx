import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, useWindowDimensions, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from './App';
import { useSelectedItems } from './SelectedItemsContext';
import ngrok from './api/ngrok';
import { useUser } from './UserContext';


type MenuItem = {
  name: string;
  price: number;
  id: number;
};

type MenuScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Menu'>;
type MenuScreenRouteProp = RouteProp<RootStackParamList, 'Menu'>;

const MenuScreen = () => {
  const navigation = useNavigation<MenuScreenNavigationProp>();
  const route = useRoute<MenuScreenRouteProp>();
  const { selectedItem, selectedRadio, selectedRoom } = route.params;

  const { selectedItems, setSelectedItems, clearSelectedItems } = useSelectedItems();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const { userId } = useUser(); // ✅ Use inside component

  const { width } = useWindowDimensions();

   // ✅ ADD THIS LINE TO DEBUG userId
  console.log('👤 userId in MenuScreen:', userId);

  useEffect(() => {
    fetch(`${ngrok.BASE_URL}/api/menu_items/${encodeURIComponent(selectedItem)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const items: MenuItem[] = data.data.map((item: any) => ({
            name: item.Menu_Name,
            price: item.Menu_price,
            id: item.Menu_ID,
          }));
          setMenuItems(items);
        }
      })
      .catch(err => console.error('Error fetching menu items:', err));
  }, [selectedItem]);

  const updateField = (index: number, key: keyof typeof selectedItems[0], value: string) => {
    setSelectedItems(prev => {
      const newData = [...prev];
      if (!newData[index]) return prev;
      if (key === 'qty' || key === 'price') {
        (newData[index] as any)[key] = parseFloat(value) || 0;
      } else {
        (newData[index] as any)[key] = value;
      }
      newData[index].total = (newData[index].qty ?? 0) * (newData[index].price ?? 0);
      return newData;
    });
  };

  const deleteRow = (index: number) => {
    const row = selectedItems[index];
    if (row?.id != null) {
      Alert.alert('Cancel Record', 'Do you want to cancel this item?', [
        { text: 'No' },
        {
          text: 'Yes', onPress: () => {
            fetch(`${ngrok.BASE_URL}/api/cancel-kot`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: row.id }),
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  setSelectedItems(prev => {
                    const updated = [...prev];
                    updated[index].Cancel_Status = 'no';
                    return updated;
                  });
                  Alert.alert('Record cancelled');
                } else {
                  Alert.alert('Cancel failed');
                }
              });
          },
        },
      ]);
    } else {
      setSelectedItems(prev => prev.filter((_, i) => i !== index));
    }
  };

   const saveData = () => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in. Please login again.');
      return;
    }

    const payload = {
      menuSection: selectedItem,
      radioOption: selectedRadio,
      selectedRoom,
      userId, // ✅ Passed correctly
      items: selectedItems.map(({ sno, ...rest }) => rest),
    };

    console.log('📦 Save Payload:', payload);

    fetch(`${ngrok.BASE_URL}/api/save_menu_items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => res.json())
      .then(response => {
        console.log('✅ Server response:', response);
        if (response.success) {
          Alert.alert('Saved successfully!');
          clearSelectedItems();
        } else {
          Alert.alert('Failed to save', response.message || '');
        }
      })
      .catch(err => {
        console.error('Error saving data:', err);
        Alert.alert('Error saving data');
      });
  };
  const printData = () => {
  if (!userId) {
    Alert.alert('Error', 'User not logged in. Please login again.');
    return;
  }

  console.log('🧾 Sending print request with userId:', userId);

  fetch(`${ngrok.BASE_URL}/api/print_kot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId, // ✅ Send userId
    }),
  })
    .then(async (res) => {
      const data = await res.json();
      console.log('📥 Print KOT Response:', data);

      if (res.ok && data.success) {
        navigation.navigate('KOTPrintScreen', {
          kotNo: data.kotNo,
          items: data.items,
        });
      } else {
        Alert.alert('Print failed', data.message || 'No KOT found for this user.');
      }
    })
    .catch(err => {
      console.error('❌ Print error:', err);
      Alert.alert('Print Error', err.message || 'Something went wrong');
    });
};


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu: {selectedItem}</Text>

      <View style={styles.splitContainer}>
        <ScrollView style={styles.leftColumn}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                const newRow = {
                  sno: selectedItems.length + 1,
                  code: item.id.toString(),
                  desc: item.name,
                  qty: 1,
                  price: item.price,
                  total: item.price,
                  remarks: '',
                  section: selectedItem,
                };
                setSelectedItems([...selectedItems, newRow]);
              }}
            >
              <Text style={styles.menuItemText}>{item.name} - ₹{item.price}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal style={styles.rightColumn}>
          <View>
            <View style={styles.headerRow}>
              {['S.No', 'Code', 'Description', 'Qty', 'Price', 'Total', 'Remarks', 'Delete'].map((col, i) => (
                <Text key={i} style={styles.headerCell}>{col}</Text>
              ))}
            </View>

            {selectedItems.map((item, index) => (
              <View style={styles.dataRow} key={index}>
                {(['sno', 'code', 'desc', 'qty', 'price'] as const).map((key, i) => (
                  <TextInput
                    key={i}
                    style={styles.input}
                    value={item[key]?.toString() ?? ''}
                    keyboardType={['qty', 'price', 'sno'].includes(key) ? 'numeric' : 'default'}
                    onChangeText={(text) => updateField(index, key, text)}
                  />
                ))}
                <Text style={styles.cell}>{item.total}</Text>
                <TextInput
                  style={styles.input}
                  value={item.remarks}
                  onChangeText={(text) => updateField(index, 'remarks', text)}
                />
                <TouchableOpacity onPress={() => deleteRow(index)}>
                  <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.saveButton} onPress={saveData}>
          <Text style={styles.bottomButtonText}>📀 Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.printButton} onPress={printData}>
          <Text style={styles.bottomButtonText}>🖨️ Print</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#ffb665',},
  title: { fontSize: 20, fontWeight: 'bold', color: '#840214', marginBottom: 10 },
  splitContainer: { flexDirection: 'row', flex: 1 },
  leftColumn: { width: '45%', borderRightWidth: 1, borderColor: '#ccc', paddingRight: 5 },
  rightColumn: { width: '55%', paddingLeft: 5 },
  menuItem: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#ccc' },
  menuItemText: { fontSize: 16, color: '#840214' },
  headerRow: { flexDirection: 'row', backgroundColor: '#ddd' },
  headerCell: { width: 70, minWidth: 70, padding: 5, fontWeight: 'bold', textAlign: 'center' },
  dataRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#ccc' },
  input: { width: 70, minWidth: 70, padding: 5, borderWidth: 1, borderColor: '#ccc', textAlign: 'center' },
  cell: { width: 70, minWidth: 70, padding: 5, textAlign: 'center' },
  deleteText: { fontSize: 18, color: '#c00', paddingHorizontal: 10 },
  bottomButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  saveButton: { backgroundColor: '#840214', padding: 10, borderRadius: 5 },
  printButton: { backgroundColor: '#840214', padding: 10, borderRadius: 5 },
  bottomButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default MenuScreen;
