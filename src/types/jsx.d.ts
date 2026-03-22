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
    }
  }
}

export {};
