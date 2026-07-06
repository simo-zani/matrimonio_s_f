import type { ReactNode } from "react";
import "./Cartoncino.css";

export function Cartoncino({ children }: { children: ReactNode }) {
  return <div className="cartoncino">{children}</div>;
}

