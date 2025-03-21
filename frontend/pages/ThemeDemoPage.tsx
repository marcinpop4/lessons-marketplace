import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ThemedCard from '../components/ThemedCard';
import ThemeSwitcher from '../components/ThemeSwitcher';

const ThemeDemoPage: React.FC = () => {
  const { theme, themeName } = useTheme();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-primary-700">Theme Demonstration</h1>
        <p className="text-secondary-600">
          Current theme: <span className="font-medium">{themeName.charAt(0).toUpperCase() + themeName.slice(1)}</span>
        </p>
        <div className="mt-4 flex justify-center">
          <ThemeSwitcher className="inline-flex items-center" />
        </div>
      </div>

      {/* Color Palette Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-secondary-800">Color Palette</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Colors */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-primary-700">Primary Colors</h3>
            <div className="space-y-1">
              {Object.entries(theme.colors.primary).map(([shade, color]) => (
                <div 
                  key={`primary-${shade}`} 
                  className="flex items-center h-10"
                >
                  <div 
                    className="w-10 h-10 rounded-md mr-3" 
                    style={{ backgroundColor: color }} 
                  />
                  <span className="text-sm text-secondary-700">
                    {shade}: {color}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Colors */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-secondary-700">Secondary Colors</h3>
            <div className="space-y-1">
              {Object.entries(theme.colors.secondary).map(([shade, color]) => (
                <div 
                  key={`secondary-${shade}`} 
                  className="flex items-center h-10"
                >
                  <div 
                    className="w-10 h-10 rounded-md mr-3" 
                    style={{ backgroundColor: color }} 
                  />
                  <span className="text-sm text-secondary-700">
                    {shade}: {color}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Accent Colors */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-accent-700">Accent Colors</h3>
            <div className="space-y-1">
              {Object.entries(theme.colors.accent).map(([shade, color]) => (
                <div 
                  key={`accent-${shade}`} 
                  className="flex items-center h-10"
                >
                  <div 
                    className="w-10 h-10 rounded-md mr-3" 
                    style={{ backgroundColor: color }} 
                  />
                  <span className="text-sm text-secondary-700">
                    {shade}: {color}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* UI Components Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-secondary-800">UI Components</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buttons */}
          <ThemedCard title="Buttons" variant="primary">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-secondary-700 mb-2">Primary Buttons</h4>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary">Primary</button>
                  <button className="btn btn-primary btn-sm">Small</button>
                  <button className="btn btn-primary btn-lg">Large</button>
                  <button className="btn btn-primary" disabled>Disabled</button>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-secondary-700 mb-2">Secondary Buttons</h4>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-secondary">Secondary</button>
                  <button className="btn btn-secondary btn-sm">Small</button>
                  <button className="btn btn-secondary btn-lg">Large</button>
                  <button className="btn btn-secondary" disabled>Disabled</button>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-secondary-700 mb-2">Accent Buttons</h4>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-accent">Accent</button>
                  <button className="btn btn-accent btn-sm">Small</button>
                  <button className="btn btn-accent btn-lg">Large</button>
                  <button className="btn btn-accent" disabled>Disabled</button>
                </div>
              </div>
            </div>
          </ThemedCard>

          {/* Form Elements */}
          <ThemedCard title="Form Elements" variant="secondary">
            <div className="space-y-4">
              <div className="form-group">
                <label htmlFor="demo-input" className="label">Text Input</label>
                <input 
                  id="demo-input" 
                  type="text" 
                  className="input" 
                  placeholder="Enter text" 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="demo-select" className="label">Select</label>
                <select id="demo-select" className="select">
                  <option value="">Select an option</option>
                  <option value="1">Option 1</option>
                  <option value="2">Option 2</option>
                  <option value="3">Option 3</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label htmlFor="demo-date" className="label">Date</label>
                  <input 
                    id="demo-date" 
                    type="date" 
                    className="input" 
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="demo-number" className="label">Number</label>
                  <input 
                    id="demo-number" 
                    type="number" 
                    className="input" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>
          </ThemedCard>
        </div>
      </section>

      {/* Alert Cards Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-secondary-800">Cards & Alerts</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ThemedCard title="Primary Card" variant="primary">
            <p className="text-secondary-700">
              This is a primary-themed card with customizable content.
            </p>
          </ThemedCard>
          
          <ThemedCard title="Secondary Card" variant="secondary">
            <p className="text-secondary-700">
              This is a secondary-themed card with customizable content.
            </p>
          </ThemedCard>
          
          <ThemedCard title="Accent Card" variant="accent">
            <p className="text-secondary-700">
              This is an accent-themed card with customizable content.
            </p>
          </ThemedCard>

          <div className="md:col-span-3 space-y-3">
            <div className="alert alert-success" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              This is a success alert message.
            </div>
            
            <div className="alert alert-error" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              This is an error alert message.
            </div>
          </div>
        </div>
      </section>

      {/* Badges Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-secondary-800">Badges</h2>
        
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-primary">Primary</span>
          <span className="badge badge-success">Success</span>
          <span className="badge badge-warning">Warning</span>
          <span className="badge badge-accent">Accent</span>
          <span className="badge badge-purple">Purple</span>
        </div>
      </section>
    </div>
  );
};

export default ThemeDemoPage; 