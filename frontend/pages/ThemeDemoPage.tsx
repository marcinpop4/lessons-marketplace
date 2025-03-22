import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ThemedCard from '../components/ThemedCard';
import ThemeSwitcher from '../components/ThemeSwitcher';
import ColorSwatch from '../components/ColorSwatch';

const ThemeDemoPage: React.FC = () => {
  const { theme, themeName } = useTheme();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Theme Demonstration</h1>
        <p>
          Current theme: <span className="font-medium">{themeName.charAt(0).toUpperCase() + themeName.slice(1)}</span>
        </p>
        <div className="mt-4 flex justify-center">
          <ThemeSwitcher className="inline-flex items-center" />
        </div>
      </div>

      {/* Headers Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Typography Headers</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ThemedCard title="Header Elements in Card" variant="primary">
            <div className="space-y-4">
              <div>
                <h1 className="mb-2">H1: Main Page Title</h1>
                <div className="text-xs mb-4">
                  <code className="bg-secondary-100 px-1 py-0.5 rounded">text-3xl font-bold</code>
                </div>
                
                <h2 className="mb-2">H2: Section Heading</h2>
                <div className="text-xs mb-4">
                  <code className="bg-secondary-100 px-1 py-0.5 rounded">text-2xl font-bold</code>
                </div>
                
                <h3 className="mb-2">H3: Subsection Heading</h3>
                <div className="text-xs mb-4">
                  <code className="bg-secondary-100 px-1 py-0.5 rounded">text-xl font-semibold</code>
                </div>
                
                <h4 className="mb-2">H4: Group Heading</h4>
                <div className="text-xs mb-4">
                  <code className="bg-secondary-100 px-1 py-0.5 rounded">text-lg font-medium</code>
                </div>
                
                <h5 className="mb-2">H5: Minor Heading</h5>
                <div className="text-xs mb-4">
                  <code className="bg-secondary-100 px-1 py-0.5 rounded">text-base font-medium</code>
                </div>
                
                <h6 className="mb-2">H6: Detail Heading</h6>
                <div className="text-xs mb-4">
                  <code className="bg-secondary-100 px-1 py-0.5 rounded">text-sm font-medium</code>
                </div>
              </div>
              
              <div className="border-t border-secondary-200 pt-4">
                <h4 className="text-sm font-medium mb-2">Theme-specific Variations</h4>
                <div className="space-y-2">
                  <p className="text-primary">Primary text variation</p>
                  <p className="text-secondary">Secondary text variation</p>
                  <p className="text-accent">Accent text variation</p>
                </div>
              </div>
            </div>
          </ThemedCard>
          
          <div className="p-6 border border-gray-200 border-dashed rounded-lg">
            <div className="mb-2 text-sm text-gray-500">Headers against main content background:</div>
            <div className="space-y-4">
              <h1>H1: Main Page Title</h1>
              <h2>H2: Section Heading</h2>
              <h3>H3: Subsection Heading</h3>
              <h4>H4: Group Heading</h4>
              <h5>H5: Minor Heading</h5>
              <h6>H6: Detail Heading</h6>
              
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <p className="text-primary">Primary text variation</p>
                <p className="text-secondary">Secondary text variation</p>
                <p className="text-accent">Accent text variation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Color Palette Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Color Palette</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Colors */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-primary">Primary Colors</h3>
            <div className="space-y-1">
              {Object.entries(theme.colors.primary).map(([shade, color]) => (
                <ColorSwatch 
                  key={`primary-${shade}`}
                  color={color}
                  shade={shade}
                  variant="primary"
                />
              ))}
            </div>
          </div>

          {/* Secondary Colors */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-secondary">Secondary Colors</h3>
            <div className="space-y-1">
              {Object.entries(theme.colors.secondary).map(([shade, color]) => (
                <ColorSwatch 
                  key={`secondary-${shade}`}
                  color={color}
                  shade={shade}
                  variant="secondary"
                />
              ))}
            </div>
          </div>

          {/* Accent Colors */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-accent">Accent Colors</h3>
            <div className="space-y-1">
              {Object.entries(theme.colors.accent).map(([shade, color]) => (
                <ColorSwatch 
                  key={`accent-${shade}`}
                  color={color}
                  shade={shade}
                  variant="accent"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* UI Components Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">UI Components</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buttons */}
          <div className="card card-primary">
            <div className="card-header">
              <h3 className="text-xl font-semibold">Buttons</h3>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium mb-3">Primary Buttons</h4>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary">Primary</button>
                  <button className="btn btn-primary btn-sm">Small</button>
                  <button className="btn btn-primary btn-lg">Large</button>
                  <button className="btn btn-primary" disabled>Disabled</button>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium mb-3">Secondary Buttons</h4>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-secondary">Secondary</button>
                  <button className="btn btn-secondary btn-sm">Small</button>
                  <button className="btn btn-secondary btn-lg">Large</button>
                  <button className="btn btn-secondary" disabled>Disabled</button>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium mb-3">Accent Buttons</h4>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-accent">Accent</button>
                  <button className="btn btn-accent btn-sm">Small</button>
                  <button className="btn btn-accent btn-lg">Large</button>
                  <button className="btn btn-accent" disabled>Disabled</button>
                </div>
              </div>
            </div>
          </div>

          {/* Form Elements */}
          <div className="card card-secondary">
            <div className="card-header">
              <h3 className="text-xl font-semibold">Form Elements</h3>
            </div>
            <div className="space-y-4">
              <div className="form-group">
                <label htmlFor="demo-input">Text Input</label>
                <input 
                  id="demo-input" 
                  type="text" 
                  placeholder="Enter text" 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="demo-select">Select</label>
                <select id="demo-select">
                  <option value="">Select an option</option>
                  <option value="1">Option 1</option>
                  <option value="2">Option 2</option>
                  <option value="3">Option 3</option>
                </select>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="demo-date">Date</label>
                  <input 
                    id="demo-date" 
                    type="date"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="demo-number">Number</label>
                  <input 
                    id="demo-number" 
                    type="number" 
                    placeholder="0" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alert Cards Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Cards & Alerts</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card card-primary">
            <div className="card-header">
              <h3 className="text-xl font-semibold">Primary Card</h3>
            </div>
            <p>
              This is a primary-themed card with customizable content.
            </p>
          </div>
          
          <div className="card card-secondary">
            <div className="card-header">
              <h3 className="text-xl font-semibold">Secondary Card</h3>
            </div>
            <p>
              This is a secondary-themed card with customizable content.
            </p>
          </div>
          
          <div className="card card-accent">
            <div className="card-header">
              <h3 className="text-xl font-semibold">Accent Card</h3>
            </div>
            <p>
              This is an accent-themed card with customizable content.
            </p>
          </div>

          <div className="md:col-span-3 space-y-3">
            <div className="alert alert-success">
              <div className="alert-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              This is a success alert message.
            </div>
            
            <div className="alert alert-error">
              <div className="alert-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              This is an error alert message.
            </div>
          </div>
        </div>
      </section>

      {/* Badges Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Badges</h2>
        
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