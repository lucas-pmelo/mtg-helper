import { useState } from 'react';
import { CommandersScreen } from './screens/CommandersScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { PeopleScreen } from './screens/PeopleScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StickersScreen } from './screens/StickersScreen';

const TABS = [
  { id: 'commanders', label: 'Sortear', glyph: '🎲', Screen: CommandersScreen },
  { id: 'stickers', label: 'Stickers', glyph: '🏷️', Screen: StickersScreen },
  { id: 'history', label: 'Histórico', glyph: '📜', Screen: HistoryScreen },
  { id: 'people', label: 'Pessoas', glyph: '👤', Screen: PeopleScreen },
  { id: 'settings', label: 'Ajustes', glyph: '⚙️', Screen: SettingsScreen },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [active, setActive] = useState<TabId>('commanders');
  const { Screen } = TABS.find((tab) => tab.id === active)!;

  return (
    <div className="app">
      <Screen />

      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={tab.id === active}
            onClick={() => setActive(tab.id)}
          >
            <span className="glyph">{tab.glyph}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
