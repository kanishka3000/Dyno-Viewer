import React, { useState, useEffect } from 'react';

export interface DynamoDBSettings {
  keyId: string;
  accessKey: string;
  stack: string;
}

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: DynamoDBSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState<DynamoDBSettings>({
    keyId: '',
    accessKey: '',
    stack: ''
  });
  const [showRelaunchNotice, setShowRelaunchNotice] = useState(false);

  useEffect(() => {
    // Load stored settings when the component opens
    if (isOpen) {
      const storedKeyId = localStorage.getItem('DDBV_KEY_ID') || '';
      const storedAccessKey = localStorage.getItem('DDBV_ACC_KEY') || '';
      const storedStack = localStorage.getItem('DDBV_STACK') || '';
      
      setSettings({
        keyId: storedKeyId,
        accessKey: storedAccessKey,
        stack: storedStack
      });
      // Reset notice state when opening settings
      setShowRelaunchNotice(false);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('DDBV_KEY_ID', settings.keyId);
    localStorage.setItem('DDBV_ACC_KEY', settings.accessKey);
    localStorage.setItem('DDBV_STACK', settings.stack);
    
    onSave(settings);
    // Show relaunch notice instead of closing immediately
    setShowRelaunchNotice(true);
  };

  const handleFinish = () => {
    setShowRelaunchNotice(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal">
      <div className="settings-content">
        <h2>DynamoDB Settings</h2>
        
        {showRelaunchNotice ? (
          <>
            <div className="notice-box">
              <p><strong>Settings saved!</strong></p>
              <p>You need to relaunch the application for the new settings to take effect.</p>
            </div>
            <div className="settings-actions">
              <button onClick={handleFinish} className="button primary">Close</button>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="keyId">AWS Access Key ID:</label>
              <input
                type="text"
                id="keyId"
                name="keyId"
                value={settings.keyId}
                onChange={handleChange}
                placeholder="Enter your AWS Access Key ID"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="accessKey">AWS Secret Access Key:</label>
              <input
                type="password"
                id="accessKey"
                name="accessKey"
                value={settings.accessKey}
                onChange={handleChange}
                placeholder="Enter your AWS Secret Access Key"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="stack">Stack Prefix:</label>
              <input
                type="text"
                id="stack"
                name="stack"
                value={settings.stack}
                onChange={handleChange}
                placeholder="Enter your stack prefix"
              />
            </div>
            
            <div className="settings-actions">
              <button onClick={onClose} className="button secondary">Cancel</button>
              <button onClick={handleSave} className="button primary">Save Settings</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};