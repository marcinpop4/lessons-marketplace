// Theme interface definition
export interface Theme {
  name: string;
  colors: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    accent: Record<string, string>;
    red: Record<string, string>;
    green: Record<string, string>;
    purple: Record<string, string>;
    amber: Record<string, string>;
  };
  shadows: {
    card: string;
    soft: string;
    button: string;
    hover: string;
  };
  fonts: {
    body: string;
    heading: string;
  };
  borderRadius: Record<string, string>;
} 