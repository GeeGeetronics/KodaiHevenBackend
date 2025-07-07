import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Button,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import {
  BluetoothEscposPrinter,
  BluetoothManager,
} from 'react-native-bluetooth-escpos-printer';

type RootStackParamList = {
  PrintKOTPreview: {
    kotNo: number;
    items: any[];
  };
};

const PrintKOTPreview = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'PrintKOTPreview'>>();
  const { kotNo, items } = route.params;

  const [printerConnected, setPrinterConnected] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [printedOnce, setPrintedOnce] = useState(false);

  useEffect(() => {
    requestBluetoothPermissions();
  }, []);

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
      } catch (err) {
        Alert.alert('Permission Error', 'Bluetooth permission not granted');
      }
    }
  };

  const connectPrinter = async (mac: string) => {
    try {
      await BluetoothManager.connect(mac);
      setPrinterConnected(true);
      setSelectedPrinter(mac);
      Alert.alert('✅ Connected', `Connected to printer at ${mac}`);
    } catch (err: any) {
      Alert.alert('❌ Connection Failed', err.message || 'Could not connect to printer');
    }
  };

  const handlePrint = async () => {
    if (!printerConnected) {
      Alert.alert('Please connect the printer first.');
      return;
    }

    const validItems = items.filter(item => item.Cancel_Status !== 'Yes');
    if (validItems.length === 0) {
      Alert.alert('No items to print.');
      return;
    }

    const mode = validItems[0]?.Radio_Option?.toUpperCase() || 'UNKNOWN';
    const baseTitle = printedOnce ? `KOT (DUPLICATE) - ${mode}` : `KOT - ${mode}`;
    const updateText = "UPDATE";
    const alignedTitle = baseTitle.padEnd(42 - updateText.length, ' ') + updateText;

    try {
      await BluetoothEscposPrinter.printText("      THE KODAI HEAVEN\n", {
        encoding: 'GBK',
        codepage: 0,
        widthtimes: 1,
        heigthtimes: 1,
        align: BluetoothEscposPrinter.ALIGN.CENTER,
      });

      await BluetoothEscposPrinter.printText(alignedTitle + '\n', {
        encoding: 'GBK',
        codepage: 0,
      });

      await BluetoothEscposPrinter.printText('--------------------------------------------\n', {});
      await BluetoothEscposPrinter.printText(`KOT NO: ${kotNo}\n`, {});
      await BluetoothEscposPrinter.printText(`DATE: ${new Date().toLocaleDateString()}\n`, {});
      await BluetoothEscposPrinter.printText(`TIME: ${new Date().toLocaleTimeString()}\n`, {});
      await BluetoothEscposPrinter.printText(`ROOM NO: ${validItems[0]?.Room_No || '-'}\n`, {});
      await BluetoothEscposPrinter.printText('--------------------------------------------\n', {});
      await BluetoothEscposPrinter.printText('SNO ITEM           QTY  PRICE\n', {});
      await BluetoothEscposPrinter.printText('--------------------------------------------\n', {});

      let totalQty = 0;
      let totalAmt = 0;

      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const sno = `${i + 1}`.padEnd(4);
        const desc = item.Description.length > 14
          ? item.Description.slice(0, 14)
          : item.Description.padEnd(14);
        const qty = `${item.Qty}`.padEnd(5);
        const price = `Rs.${item.Price}`.padEnd(6);

        await BluetoothEscposPrinter.printText(`${sno}${desc}${qty}${price}\n`, {});
        if (item.Remarks) {
          await BluetoothEscposPrinter.printText(`   (${item.Remarks})\n`, {});
        }

        totalQty += item.Qty;
        totalAmt += item.Total;
      }

      await BluetoothEscposPrinter.printText('--------------------------------------------\n', {});
      await BluetoothEscposPrinter.printText(`TOTAL QTY : ${totalQty}\n`, {});
      await BluetoothEscposPrinter.printText(`TOTAL AMT : Rs.${totalAmt}\n`, {});
      await BluetoothEscposPrinter.printText('--------------------------------------------\n\n\n', {});

      setPrintedOnce(true);
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Something went wrong');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Print KOT Preview</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.ID?.toString() || item.id?.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <Text style={styles.itemText}>{item.Description} (x{item.Qty}) - ₹{item.Total}</Text>
            {item.Remarks && <Text style={styles.itemText}>Remarks: {item.Remarks}</Text>}
            <Text style={styles.itemText}>Cancelled: {item.Cancel_Status}</Text>
          </View>
        )}
      />

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Connect Printer:</Text>
        <Button title="Connect BP03R (Printer 1)" onPress={() => connectPrinter('DC:0D:30:CD:D4:10')} />
        <View style={{ height: 10 }} />
        <Button title="Connect BP03R-2 (Printer 2)" onPress={() => connectPrinter('DC:0D:30:CD:D4:11')} />
        <View style={{ height: 10 }} />
        <Button title="Connect BP03R-3 (Printer 3)" onPress={() => connectPrinter('DC:0D:30:CD:D4:12')} />
        <View style={{ height: 20 }} />
        <Button title="🖨️ Print This KOT" onPress={handlePrint} disabled={!printerConnected} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#ffb665' },
  heading: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  itemContainer: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#ccc' },
  itemText: { fontSize: 14 },
});

export default PrintKOTPreview;
