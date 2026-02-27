import { ThemeProvider } from "@/components/theme-provider"
import { ComponentExample } from "@/components/component-example";
import { ModeToggle } from "./components/mode-toggle";

export function App() {
return (
  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <ComponentExample />
    <ModeToggle></ModeToggle>
  </ThemeProvider>
);
}

export default App;