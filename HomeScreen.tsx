import React, { useLayoutEffect, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import { RadioButton } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import ngrok from './api/ngrok';

type Props = {
  navigation: any;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [radioOptions, setRadioOptions] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const isDesktop = Platform.OS === 'windows' || width >= 1024;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    fetch(`${ngrok.BASE_URL}/api/menu_items`)
      .then(res => res.json())
      .then(data => {
        const names = data.map((item: { Menu_section: string }) => item.Menu_section);
        setItems(names);
      })
      .catch(err => console.error('Error fetching menu categories:', err));
  }, []);

  useEffect(() => {
    fetch(`${ngrok.BASE_URL}/api/radio-options`)
      .then(res => res.json())
      .then(data => {
        const types = data.map((item: { TYPE: string }) => item.TYPE);
        setRadioOptions(types);
      })
      .catch(err => console.error('Error fetching radio options:', err));
  }, []);

  useEffect(() => {
    fetch(`${ngrok.BASE_URL}/api/table-names`)
      .then(res => res.json())
      .then(data => {
        const names = data.map((item: { Table_Name: string }) => item.Table_Name);
        setTableNames(names);
      })
      .catch(err => console.error('Error fetching table names:', err));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString());
      setCurrentTime(now.toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const groupedItems: string[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    groupedItems.push(items.slice(i, i + 2));
  }

  // Group radio options into 2 per row
  const groupedRadioOptions: string[][] = [];
  for (let i = 0; i < radioOptions.length; i += 2) {
    groupedRadioOptions.push(radioOptions.slice(i, i + 2));
  }

  const selectItem = (index: number) => {
    setSelectedItem(index);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF2C2' }}>
      <View style={[styles.container, { padding: isDesktop ? 40 : isTablet ? 30 : 20 }]}>
        <View style={styles.header}>
          <View style={styles.titleBox}>
            <Text style={[styles.headerTitle, { fontSize: isDesktop ? 24 : isTablet ? 20 : 18 }]}>
              THE KODAI HEAVEN
            </Text>
          </View>

          {/* Two-row radio buttons */}
          <View style={styles.radioGroupContainer}>
            {groupedRadioOptions.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.radioRow}>
                {row.map((item, index) => {
                  const realIndex = rowIndex * 2 + index;
                  return (
                    <View key={realIndex} style={styles.radioItem}>
                      <RadioButton
                        value={realIndex.toString()}
                        status={selectedItem === realIndex ? 'checked' : 'unchecked'}
                        onPress={() => selectItem(realIndex)}
                        color={getColor(realIndex)}
                      />
                      <Text style={styles.radioText}>{item}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.roomPickerSection}>
            <Text style={styles.roomLabel}>Room No:</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={selectedRoom}
                onValueChange={(value) => setSelectedRoom(value)}
                style={styles.picker}
                dropdownIconColor="#840214"
              >
                <Picker.Item label="Select Table" value="" />
                {tableNames.map((name, idx) => (
                  <Picker.Item key={idx} label={name} value={name} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.kotRow}>
            <TouchableOpacity
              style={styles.kotButton}
              onPress={() => navigation.navigate('KOTList')}
            >
              <Text style={styles.kotButtonText}>KOT List</Text>
            </TouchableOpacity>

            <View style={styles.dateTimeBox}>
              <Text style={styles.dateTimeText}>{currentDate}</Text>
              <Text style={[styles.dateTimeText, { marginTop: 2 }]}>{currentTime}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {groupedItems.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[
                styles.row,
                rowIndex === 0 && { marginTop: 20 },
              ]}
            >
              {row.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.boxButton, { paddingVertical: isDesktop ? 30 : 20 }]}
                  onPress={() => {
                    if (selectedItem !== null && selectedRoom !== '') {
                      navigation.navigate('Menu', {
                        selectedItem: item,
                        selectedRadio: radioOptions[selectedItem],
                        selectedRoom: selectedRoom,
                      });
                    } else {
                      Alert.alert('Please select both a radio option and room number.');
                    }
                  }}
                >
                  <Text style={[styles.boxButtonText, { fontSize: isTablet ? 18 : 16 }]}>{item}</Text>
                </TouchableOpacity>
              ))}
              {row.length === 1 && <View style={[styles.boxButton, { backgroundColor: 'transparent' }]} />}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const getColor = (index: number) => '#840214';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffb665',
  },
  header: {
    backgroundColor: '#ffb665',
    borderBottomWidth: 2,
    borderColor: 'black',
    paddingBottom: 20,
  },
  titleBox: {
    position: 'absolute',
    borderWidth: 2,
    top: 5,
    right: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFF8E1',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#840214',
  },
  radioGroupContainer: {
    marginTop: 80,
    paddingHorizontal: 10,
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    flexWrap: 'wrap',
  },
  radioText: {
    flexShrink: 1,
    fontSize: 16,
    color: '#840214',
  },
  roomPickerSection: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  roomLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: '#840214',
    borderRadius: 10,
    backgroundColor: '#FFF',
    height: 60,
    justifyContent: 'center',
  },
  picker: {
    flex: 1,
    fontSize: 15,
  },
  kotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  kotButton: {
    backgroundColor: '#840214',
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    height: 60,
    width: '45%',
  },
  kotButtonText: {
    color: '#FFF8E1',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateTimeBox: {
    alignItems: 'flex-end',
    height: 60,
    justifyContent: 'center',
    width: '50%',
  },
  dateTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#840214',
  },
  body: {
    paddingHorizontal: 10,
    paddingBottom: 30,
    marginTop: 30,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  boxButton: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#840214',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  boxButtonText: {
    color: '#FFF8E1',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  backButton: {
    marginLeft: 10,
    color: '#840214',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
