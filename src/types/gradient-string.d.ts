declare module 'gradient-string' {
  interface Gradient {
    (text: string): string;
    multiline: (text: string) => string;
  }

  function gradient(colors: string[]): Gradient;
  function gradient(color1: string, color2: string): Gradient;

  export = gradient;
}