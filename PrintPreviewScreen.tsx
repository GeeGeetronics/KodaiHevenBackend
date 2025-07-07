import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Button,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import axios from 'axios';
import ngrok from './api/ngrok';
import {
  BluetoothManager,
  BluetoothEscposPrinter,
} from 'react-native-bluetooth-escpos-printer';
import { useUser } from './UserContext'; // 👈 get userId from context

type KOTItem = {
  ID: number;
  KOT_No: number;
  CreatedAt: string;
  Menu_Section: string;
  Radio_Option: string;
  Room_No: string;
  ItemCode: string;
  Description: string;
  Qty: number;
  Price: number;
  Total: number;
  Remarks: string;
  Cancel_Status: string;
};

const PrintPreviewScreen = () => {
  const [kotItems, setKOTItems] = useState<KOTItem[]>([]);
  const [kotNo, setKOTNo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [hasPrintedBefore, setHasPrintedBefore] = useState(false); // 👈 for copy/duplicate
  const { userId } = useUser();

  useEffect(() => {
    fetchPrintData();
    requestBluetoothPermissions();
  }, []);

  const fetchPrintData = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not logged in.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${ngrok.BASE_URL}/api/print_kot`, {
        userId: userId,
      });

      if (response.data.success) {
        setKOTItems(response.data.items);
        setKOTNo(response.data.kotNo);
      } else {
        Alert.alert('Error', response.data.message || 'No KOT found');
      }
    } catch (error: any) {
      Alert.alert('Connection Error', error.message || 'Unable to connect');
    } finally {
      setLoading(false);
    }
  };

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
      } catch (error) {
        Alert.alert('Permission Error', 'Bluetooth permission not granted.');
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
      Alert.alert('Not Connected', 'Please connect to a printer first');
      return;
    }

    const itemsToPrint = kotItems.filter(item => item.Cancel_Status !== 'Yes');

    if (itemsToPrint.length === 0) {
      Alert.alert('No Data', 'Nothing to print');
      return;
    }

    const radioOption = itemsToPrint[0]?.Radio_Option?.toUpperCase() || 'UNKNOWN';
    const label = hasPrintedBefore
      ? `KOT (DUPLICATE) - ${radioOption}`
      : `KOT - ${radioOption}`;

    try {
      await BluetoothEscposPrinter.printText("      THE KODAI HEAVEN\n", {
        encoding: 'GBK',
        codepage: 0,
        widthtimes: 1,
        heigthtimes: 1,
        align: BluetoothEscposPrinter.ALIGN.CENTER,
      });

      await BluetoothEscposPrinter.printText("--------------------------------------------\n", {});
      await BluetoothEscposPrinter.printText(`${label}\n`, {
        align: BluetoothEscposPrinter.ALIGN.CENTER,
      });
      await BluetoothEscposPrinter.printText("--------------------------------------------\n", {});
      await BluetoothEscposPrinter.printText(
        `Room NO : ${itemsToPrint[0]?.Room_No || '-'}     DATE : ${new Date().toLocaleDateString()}\n`, {}
      );
      await BluetoothEscposPrinter.printText(
        `TIME :  ${new Date().toLocaleTimeString()}\n`, {}
      );
      await BluetoothEscposPrinter.printText("--------------------------------------------\n", {});
      await BluetoothEscposPrinter.printText("S.NO ITEM                 QTY  PRICE\n", {});
      await BluetoothEscposPrinter.printText("--------------------------------------------\n", {});

      let totalQty = 0;
      let grandTotal = 0;

      for (let i = 0; i < itemsToPrint.length; i++) {
        const item = itemsToPrint[i];
        const sno = (i + 1).toString().padEnd(4);
        const desc =
          item.Description.length > 18
            ? item.Description.slice(0, 18).padEnd(20)
            : item.Description.padEnd(20);
        const qty = item.Qty.toString().padEnd(5);
        const price = `Rs.${item.Price}`.padEnd(6);

        await BluetoothEscposPrinter.printText(`${sno}${desc}${qty}${price}\n`, {});
        if (item.Remarks) {
          await BluetoothEscposPrinter.printText(`     (${item.Remarks})\n`, {});
        }

        totalQty += item.Qty;
        grandTotal += item.Total;
      }

      await BluetoothEscposPrinter.printText("--------------------------------------------\n", {});
      await BluetoothEscposPrinter.printText(
        `NO.OF.ITEM : ${itemsToPrint.length}         TOT.QTY : ${totalQty}\n`, {}
      );
      await BluetoothEscposPrinter.printText(`TOTAL AMOUNT : Rs.${grandTotal}\n`, {});
      await BluetoothEscposPrinter.printText("--------------------------------------------\n\n\n", {});

      setHasPrintedBefore(true);
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Failed to print');
    }
  };

  const renderItem = ({ item }: { item: KOTItem }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemText}>{item.Description}</Text>
      <Text style={styles.itemText}>Qty: {item.Qty}</Text>
      <Text style={styles.itemText}>Price: Rs.{item.Price}</Text>
      <Text style={styles.itemText}>Total: Rs.{item.Total}</Text>
      <Text style={styles.itemText}>Remarks: {item.Remarks || 'N/A'}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading KOT preview...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>KOT Print Preview</Text>

      {kotItems.length > 0 ? (
        <>
          <FlatList
            data={kotItems}
            keyExtractor={(item) => item.ID.toString()}
            renderItem={renderItem}
          />
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Connect Printer:</Text>

            <Button
              title="Connect BP03R (Printer 1)"
              onPress={() => connectPrinter('DC:0D:30:CD:D4:10')}
            />
            <View style={{ height: 10 }} />

            <Button
              title="Connect BP03R-2 (Printer 2)"
              onPress={() => connectPrinter('DC:0D:30:CD:D4:11')}
            />
            <View style={{ height: 10 }} />

            <Button
              title="Connect BP03R-3 (Printer 3)"
              onPress={() => connectPrinter('DC:0D:30:CD:D4:12')}
            />
            <View style={{ height: 20 }} />

            <Button
              title="🖨️ Print"
              onPress={handlePrint}
              disabled={!printerConnected}
            />
          </View>
        </>
      ) : (
        <Text>No KOT items found</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#ffb665' },
  heading: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  itemContainer: {
    backgroundColor: '#f1f1f1',
    marginVertical: 5,
    padding: 10,
    borderRadius: 6,
  },
  itemText: { fontSize: 14 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PrintPreviewScreen;
