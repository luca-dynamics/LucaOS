/// <reference types="react" />
/// <reference types="three" />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.WebViewHTMLAttributes<HTMLWebViewElement>,
        HTMLWebViewElement
      >;
      holographicMaterial: any;
      ambientLight: any;
      pointLight: any;
      primitive: any;
      group: any;
      mesh: any;
      line: any;
      sphereGeometry: any;
      boxGeometry: any;
      bufferGeometry: any;
      lineBasicMaterial: any;
      meshBasicMaterial: any;
      meshStandardMaterial: any;
      meshPhysicalMaterial: any;
      shaderMaterial: any;
      [elemName: string]: any;
    }
  }
}

export {};
