import React from 'react';
import {
  HeaderElementsCard,
  HeaderElementsBackground,
  ColorPalettes,
  ButtonsShowcase,
  FormElements,
  CardsShowcase,
  AlertsShowcase,
  BadgesShowcase
} from '../../components/theme-demo';

const ThemeDemoPage: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Theme Demonstration</h1>
        <p>This page demonstrates the components and styling available in the application theme.</p>
      </div>
      
      {/* Headers */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Typography Headers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <HeaderElementsCard />
          <HeaderElementsBackground />
        </div>
      </section>

      {/* Color Palette */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Color Palette</h2>
        <ColorPalettes />
      </section>

      {/* UI Components */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">UI Components</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Buttons</h3>
            <ButtonsShowcase />
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Form Elements</h3>
            <FormElements />
          </div>
        </div>
      </section>

      {/* Cards & Alerts */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Cards & Alerts</h2>
        <div className="space-y-6">
          <CardsShowcase />
          <AlertsShowcase />
        </div>
      </section>

      {/* Badges */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Badges</h2>
        <BadgesShowcase />
      </section>
    </div>
  );
};

export default ThemeDemoPage; 