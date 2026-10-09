import { NavigationContainer } from '@react-navigation/native';

import { AppRoutes } from './src/routes/AppRoutes';

export default function App() {
  return (
    <NavigationContainer>
      <AppRoutes />
    </NavigationContainer>
  );
}