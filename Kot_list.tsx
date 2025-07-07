import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ngrok from './api/ngrok';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

type KOTNumber = {
  kotNumber: number;
};

const KOTList = () => {
  const navigation = useNavigation<any>();
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState<'from' | 'to' | null>(null);
  const [kotList, setKotList] = useState<KOTNumber[]>([]);
  const [loading, setLoading] = useState(false);

  const formatDateForAPI = (d: Date) => d.toISOString().slice(0, 10);

  const fetchKOTs = async (from: Date, to: Date) => {
    setLoading(true);
    const fromFormatted = formatDateForAPI(from);
    const toFormatted = formatDateForAPI(to);

    try {
      const response = await fetch(
        `${ngrok.BASE_URL}/api/kot-list?fromDate=${fromFormatted}&toDate=${toFormatted}`
      );
      const json = await response.json();

      if (json.success && Array.isArray(json.data)) {
        const uniqueKotNumbers: KOTNumber[] = Array.from(
          new Set<number>(json.data.map((item: any) => Number(item.kotNumber)))
        ).map((kotNumber: number) => ({ kotNumber }));

        setKotList(uniqueKotNumbers);
      } else {
        Alert.alert('Error', 'No KOT data found.');
        setKotList([]);
      }
    } catch (err) {
      console.error('Error fetching KOT list:', err);
      Alert.alert('Error', 'Failed to fetch KOT list.');
      setKotList([]);
    } finally {
      setLoading(false);
    }
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (!selectedDate) {
      setShowPicker(null);
      return;
    }
    if (showPicker === 'from') setFromDate(selectedDate);
    if (showPicker === 'to') setToDate(selectedDate);
    setShowPicker(null);
  };

  const onApply = () => {
    if (!fromDate || !toDate) {
      Alert.alert('Validation', 'Please select both From and To dates.');
      return;
    }
    if (toDate < fromDate) {
      Alert.alert('Validation', 'To Date cannot be earlier than From Date.');
      return;
    }
    fetchKOTs(fromDate, toDate);
  };

  const displayDate = (date: Date | null) =>
    date ? date.toDateString() : 'Select date';

  const renderItem = ({ item }: { item: KOTNumber }) => (
    <TouchableOpacity
      style={styles.tableRow}
      onPress={() =>
        navigation.navigate('KOTDetails', { kotData: { kotNumber: item.kotNumber } })
      }
    >
      <Text style={styles.tableCell}>{item.kotNumber}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Date Filters */}
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <Text style={styles.label}>From Date</Text>
          <TouchableOpacity onPress={() => setShowPicker('from')}>
            <TextInput
              style={styles.input}
              value={displayDate(fromDate)}
              editable={false}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>To Date</Text>
          <TouchableOpacity onPress={() => setShowPicker('to')}>
            <TextInput
              style={styles.input}
              value={displayDate(toDate)}
              editable={false}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.applyButton,
            (!fromDate || !toDate || toDate < fromDate) && { backgroundColor: '#999' },
          ]}
          disabled={!fromDate || !toDate || toDate < fromDate}
          onPress={onApply}
        >
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={showPicker === 'from' ? fromDate || new Date() : toDate || new Date()}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>KOT No</Text>
      </View>

      {/* Table Data */}
      {loading ? (
        <ActivityIndicator size="large" color="#840214" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={kotList}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.tableBody}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No KOTs found for this date range.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffb665',
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputWrapper: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    height: 45,
    borderColor: '#840214',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFF8E1',
    textAlign: 'center',
    fontSize: 14,
  },
  applyButton: {
    height: 45,
    backgroundColor: '#840214',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  applyText: {
    color: '#FFF8E1',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  tableHeader: {
    width: '50%',
    flexDirection: 'row',
    backgroundColor: '#840214',
    paddingVertical: 10,
    marginTop: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignSelf: 'center',
  },
  tableHeaderCell: {
    width: '50%',
    flex: 1,
    textAlign: 'center',
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tableBody: {
    paddingBottom: 20,
  },
  tableRow: {
    width: '50%',
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    alignSelf: 'center',
  },
  tableCell: {
    width: 50,
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
    fontSize: 16,
  },
});

export default KOTList;
