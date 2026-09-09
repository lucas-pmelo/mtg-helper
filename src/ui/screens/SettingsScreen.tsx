import { useRef, useState } from 'react';
import { BACKUP_VERSION, parseBackup, serializeBackup, type Backup } from '../../data/storage';
import { useHistoryStore } from '../../stores/historyStore';
import { usePeopleStore } from '../../stores/peopleStore';
import { useStickerStore } from '../../stores/stickerStore';
import { today } from '../../domain/history/today';

export function SettingsScreen() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function exportBackup() {
    const backup: Backup = {
      version: BACKUP_VERSION,
      people: usePeopleStore.getState().people,
      decks: usePeopleStore.getState().decks,
      stickerDeck: { sheetIds: useStickerStore.getState().sheetIds },
      lastDraw: useStickerStore.getState().lastDraw,
      matches: useHistoryStore.getState().matches,
    };

    const url = URL.createObjectURL(
      new Blob([serializeBackup(backup)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `mtg-helper-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setError(null);
    setMessage('Backup exportado.');
  }

  async function importBackup(file: File) {
    setMessage(null);

    try {
      const backup = parseBackup(await file.text());

      if (!confirm('Isto substitui todos os dados atuais. Continuar?')) return;

      usePeopleStore.getState().replaceAll(backup.people, backup.decks);
      useStickerStore.getState().replaceAll(backup.stickerDeck.sheetIds, backup.lastDraw);
      useHistoryStore.getState().replaceAll(backup.matches);

      setError(null);
      setMessage('Backup importado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível importar o arquivo');
    }
  }

  return (
    <div className="screen">
      <h1>Configurações</h1>

      <div className="stack">
        <button className="btn" type="button" onClick={exportBackup}>
          Exportar backup
        </button>

        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => fileInput.current?.click()}
        >
          Importar backup
        </button>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) importBackup(file);
            event.target.value = '';
          }}
        />
      </div>

      {message && <p className="muted" style={{ marginTop: 12 }}>{message}</p>}
      {error && <p className="error">{error}</p>}

      <p className="muted" style={{ marginTop: 24 }}>
        Os dados ficam só neste aparelho. O Safari pode limpar o storage de sites sem aviso —
        exporte o backup de vez em quando.
      </p>
    </div>
  );
}
