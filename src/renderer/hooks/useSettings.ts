import { useState, useEffect } from 'react';
import { DynamoDBSettings } from '../components/Settings';

export const useSettings = () => {
  const [settings, setSettings] = useState<DynamoDBSettings>({
    keyId: '',
    accessKey: '',
    stack: ''
  });
  const [hasSettings, setHasSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Load settings from localStorage on mount
    const storedKeyId = localStorage.getItem('DDBV_KEY_ID');
    const storedAccessKey = localStorage.getItem('DDBV_ACC_KEY');
    const storedStack = localStorage.getItem('DDBV_STACK');
    
    // Convert result to boolean explicitly - only keyId and accessKey are required
    const hasStoredSettings: boolean = Boolean(
      storedKeyId && storedKeyId.trim() !== '' && 
      storedAccessKey && storedAccessKey.trim() !== ''
      // Stack is optional now, so we don't check for it here
    );
    
    setHasSettings(hasStoredSettings);
    
    // If no settings are found, show settings dialog on first load
    if (!hasStoredSettings) {
      setShowSettings(true);
    } else {
      setSettings({
        keyId: storedKeyId ?? '',
        accessKey: storedAccessKey ?? '',
        stack: storedStack ?? ''
      });
    }
  }, []);

  const saveSettings = (newSettings: DynamoDBSettings) => {
    setSettings(newSettings);
    setHasSettings(true);
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  return {
    settings,
    hasSettings,
    showSettings,
    saveSettings,
    openSettings,
    closeSettings
  };
};