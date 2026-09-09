import { useState } from 'react';
import { Icon, type IconName } from './components/Icon';
import { CardScreen } from './screens/CardScreen';
import { CommandersScreen } from './screens/CommandersScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { PeopleScreen } from './screens/PeopleScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StickersScreen } from './screens/StickersScreen';

type Tab = {
  id: string;
  label: string;
  icon: IconName;
  Screen: () => React.JSX.Element;
};

const TABS = [
  { id: 'commanders', label: 'Sortear', icon: 'dice', Screen: CommandersScreen },
  { id: 'stickers', label: 'Stickers', icon: 'sticker', Screen: StickersScreen },
  { id: 'history', label: 'Histórico', icon: 'history', Screen: HistoryScreen },
  { id: 'people', label: 'Pessoas', icon: 'users', Screen: PeopleScreen },
  { id: 'cards', label: 'Carta', icon: 'card', Screen: CardScreen },
  { id: 'settings', label: 'Ajustes', icon: 'sliders', Screen: SettingsScreen },
] as const satisfies readonly Tab[];

type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [active, setActive] = useState<TabId>('commanders');
  const { Screen } = TABS.find((tab) => tab.id === active)!;

  return (
    <div className="app">
      <main className="app-main">
        <Screen />
      </main>

      <nav className="tabs" aria-label="Seções do app">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={tab.id === active}
            onClick={() => setActive(tab.id)}
          >
            <span className="glyph">
              <Icon name={tab.icon} size={21} />
            </span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
