import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginPage from './LoginPage';
import HomeScreen from './HomeScreen';
import MenuScreen from './MenuScreen';
import KOTListScreen from './Kot_list'; // ✅ Add back
import KOTDetailsScreen from './Kot_Details'; // ✅ Add back
import KOTPrintScreen from './PrintPreviewScreen';
import  PrintKOTPreview  from './PrintKOTPreview';
import { UserProvider } from './UserContext';
import { SelectedItemsProvider } from './SelectedItemsContext';
import { KOTItem } from './types/KOTItem';


export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Menu: {
    selectedItem: string;
    selectedRadio: string;
    selectedRoom: string;
  };
  KOTList: undefined;
  KOTDetails: { kotData: any };
  KOTPrintScreen: {
    kotNo: number;
    items: KOTItem[];
  };
  PrintKOTPreview: {
    kotNo: number;
    items: KOTItem[];
  };};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <UserProvider>
      <SelectedItemsProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login">
            <Stack.Screen name="Login" component={LoginPage} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="KOTList" component={KOTListScreen} />
            <Stack.Screen name="KOTDetails" component={KOTDetailsScreen} />
            <Stack.Screen name="KOTPrintScreen" component={KOTPrintScreen} />
            <Stack.Screen name="PrintKOTPreview" component={PrintKOTPreview} />
          </Stack.Navigator>
        </NavigationContainer>
      </SelectedItemsProvider>
    </UserProvider>
  );
}
