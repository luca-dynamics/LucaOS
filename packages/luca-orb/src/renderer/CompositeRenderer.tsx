import React from "react";
import { OrbRenderer, OrbRendererProps } from "./OrbRenderer";

export interface CompositeRendererProps extends OrbRendererProps {}

export const CompositeRenderer: React.FC<CompositeRendererProps> = (props) => {
  return <OrbRenderer {...props} />;
};
