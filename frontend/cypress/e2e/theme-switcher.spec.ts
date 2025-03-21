/// <reference types="cypress" />

describe('Theme Switcher', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
    // Visit the theme demo page
    cy.visit('/theme-demo');
  });

  it('should display default theme initially', () => {
    // Verify the default theme is loaded
    cy.contains('Current theme: Default').should('be.visible');
    
    // Check for default theme colors
    cy.get('select').should('exist');
  });

  it('should switch themes when selecting from dropdown', () => {
    // Current theme should be default
    cy.contains('Current theme: Default').should('be.visible');
    
    // Change to dark theme
    cy.get('select').select('dark');
    
    // Verify the theme was changed
    cy.contains('Current theme: Dark').should('be.visible');
    
    // Change to warm theme
    cy.get('select').select('warm');
    
    // Verify the theme was changed
    cy.contains('Current theme: Warm').should('be.visible');
  });

  it('should persist theme selection after page reload', () => {
    // Change to dark theme
    cy.get('select').select('dark');
    
    // Verify the theme was changed
    cy.contains('Current theme: Dark').should('be.visible');
    
    // Reload the page
    cy.reload();
    
    // Verify the theme is still dark after reload
    cy.contains('Current theme: Dark').should('be.visible');
  });

  it('should apply CSS variables based on selected theme', () => {
    // Get the default primary-500 color
    cy.document().then((doc) => {
      const defaultPrimaryColor = getComputedStyle(doc.documentElement)
        .getPropertyValue('--color-primary-500').trim();
      
      // Switch to dark theme
      cy.get('select').select('dark');
      
      // Get the dark primary-500 color
      const darkPrimaryColor = getComputedStyle(doc.documentElement)
        .getPropertyValue('--color-primary-500').trim();
      
      // Colors should be different
      expect(defaultPrimaryColor).not.to.equal(darkPrimaryColor);
    });
  });
}); 